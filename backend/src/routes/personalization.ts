// backend/src/routes/personalization.ts
import { Router } from 'express';
import db from '../models/db';

const router = Router();

/** Helper: convert hour into a coarse time slot */
function hourToSlot(h: number) {
  if (h >= 5 && h < 8) return 0;
  if (h >= 8 && h < 11) return 1;
  if (h >= 11 && h < 14) return 2;
  if (h >= 14 && h < 17) return 3;
  if (h >= 17 && h < 20) return 4;
  return 5;
}

/** Helper: check if two hours belong to the same slot */
function inSameSlot(hour: number, anchorHour: number) {
  return hourToSlot(hour) === hourToSlot(anchorHour);
}

/** 2.1 Save or update user dictionary mapping */
router.post('/user-dict', (req, res) => {
  const { user_id, phrase, canonical_food_id, canonical_food_name } =
    req.body || {};
  if (!user_id || !phrase)
    return res
      .status(400)
      .json({ ok: false, error: 'user_id & phrase required' });
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO user_dict (user_id, phrase, canonical_food_id, canonical_food_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, phrase) DO UPDATE SET
      canonical_food_id=excluded.canonical_food_id,
      canonical_food_name=excluded.canonical_food_name,
      updated_at=excluded.updated_at
  `
  ).run(
    user_id,
    String(phrase).trim().toLowerCase(),
    canonical_food_id ?? null,
    canonical_food_name ?? null,
    now,
    now
  );
  res.json({ ok: true });
});

/** 2.2 Query user dictionary */
router.get('/user-dict', (req, res) => {
  const user_id = String(req.query.user_id || '');
  if (!user_id)
    return res.status(400).json({ ok: false, error: 'user_id required' });
  const rows = db
    .prepare(`SELECT * FROM user_dict WHERE user_id=? ORDER BY updated_at DESC`)
    .all(user_id);
  res.json({ ok: true, data: rows });
});

/** 2.3 Insert meal event (for habit learning) */
router.post('/meal-event', (req, res) => {
  const { user_id, ts, food_id, food_name, portion_json, source } =
    req.body || {};
  if (!user_id || !food_name)
    return res
      .status(400)
      .json({ ok: false, error: 'user_id & food_name required' });
  const t = ts ? Number(ts) : Date.now();
  const local = new Date(t);
  const dow = local.getDay();
  const local_hour = local.getHours();
  db.prepare(
    `
    INSERT INTO meal_events (user_id, ts, local_hour, dow, food_id, food_name, portion_json, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(
    user_id,
    t,
    local_hour,
    dow,
    food_id ?? null,
    String(food_name),
    portion_json ? JSON.stringify(portion_json) : null,
    source ?? 'manual',
    Date.now()
  );
  // Mirror into meal_log (non-fatal if table does not exist)
  try {
    db.prepare(
      `INSERT INTO meal_log (user_id, food_id, ts_ms, source) VALUES (?, ?, ?, ?)`
    ).run(user_id, food_id ?? null, t, source ?? 'manual');
  } catch {
    // swallow if meal_log table is not present; prediction tests can create it.
  }

  res.json({ ok: true });
});

/** 2.4 Prediction: suggest if user likely expects a certain food at current time */
router.get('/predict', (req, res) => {
  const user_id = String(req.query.user_id || '');
  const now = req.query.now ? Number(req.query.now) : Date.now();
  if (!user_id)
    return res.status(400).json({ ok: false, error: 'user_id required' });

  const d = new Date(now);
  const dow = d.getDay();
  const hr = d.getHours();
  const slot = hourToSlot(hr);

  const lookbackMs = 1000 * 60 * 60 * 24 * 7 * 8; // 8 weeks
  const since = now - lookbackMs;

  // Fetch meal events in the last 8 weeks on the same weekday
  const rows = db
    .prepare(
      `
    SELECT food_id, food_name, ts, local_hour
    FROM meal_events
    WHERE user_id=? AND ts>=? AND dow=?
    ORDER BY ts DESC
  `
    )
    .all(user_id, since, dow);

  // Filter by same time slot
  const sameSlot = rows.filter(r => inSameSlot(r.local_hour, hr));

  // Scoring: frequency + time decay
  const byFood = new Map<
    string,
    { name: string; score: number; lastTs: number; count: number }
  >();
  for (const r of sameSlot) {
    const key = r.food_id ?? r.food_name;
    const prev = byFood.get(key) ?? {
      name: r.food_name,
      score: 0,
      lastTs: 0,
      count: 0,
    };
    const ageDays = Math.max(1, (now - r.ts) / (1000 * 60 * 60 * 24));
    const decay = 1 / Math.sqrt(ageDays);
    prev.score += decay;
    prev.lastTs = Math.max(prev.lastTs, r.ts);
    prev.count += 1;
    byFood.set(key, prev);
  }
  const arr = [...byFood.entries()]
    .map(([k, v]) => ({
      key: k,
      name: v.name,
      score: v.score,
      lastTs: v.lastTs,
      count: v.count,
    }))
    .sort((a, b) => b.score - a.score);

  const max = arr[0]?.score ?? 0;
  const normalized = arr.map(x => ({ ...x, p: max ? x.score / max : 0 }));
  const top = normalized[0];

  // Trigger condition: p >= 0.6 AND at least one of the last two records in this slot
  let ask = false;
  if (top && top.p >= 0.6) {
    const recentTwo = sameSlot
      .filter(r => (r.food_id ?? r.food_name) === top.key)
      .slice(0, 2);
    ask = recentTwo.length >= 1;
  }

  res.json({
    ok: true,
    now,
    dow,
    hour: hr,
    slot,
    candidates: normalized.slice(0, 3),
    ask,
    suggestion: ask ? top : null,
  });
});
/**
 * 2.5 [NEW] Predictive candidate for tests (reads meal_log)
 * Simple frequency-based heuristic on the same time slot within a recent window.
 * Returns suggest:true if a food appears >= 3 times in the current slot.
 *
 * This endpoint is designed to validate Step 8 quickly with synthetic history.
 * You can call it like:
 *   GET /api/personalization/predictive-candidate?user_id=local-user-001&hour=7&days=35
 */
router.get('/predictive-candidate', (req, res) => {
  // [NEW] Begin
  const user_id = String(req.query.user_id || '');
  if (!user_id)
    return res.status(400).json({ ok: false, error: 'user_id required' });

  // Allow overriding hour/days for deterministic tests
  const hourParam =
    req.query.hour !== undefined ? Number(req.query.hour) : null;
  const hour =
    hourParam != null && !Number.isNaN(hourParam)
      ? hourParam
      : new Date().getHours();
  const days = req.query.days
    ? Math.max(1, Math.min(90, Number(req.query.days)))
    : 28;
  const since = Date.now() - days * 24 * 3600 * 1000;

  // Read synthetic/real history from meal_log (the table we populated in tests)
  const rows = db
    .prepare(
      `SELECT food_id, ts_ms
         FROM meal_log
        WHERE user_id=? AND ts_ms>=?
        ORDER BY ts_ms DESC`
    )
    .all(user_id, since) as Array<{ food_id: string | null; ts_ms: number }>;

  const slotNow = hourToSlot(hour);

  // Count frequencies only within the same slot
  const counts = new Map<string, number>();
  for (const r of rows) {
    const h = new Date(r.ts_ms).getHours();
    if (hourToSlot(h) === slotNow) {
      const key = (r.food_id ?? '').toString();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  // Threshold: show suggestion when a food appears >= 3 times
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .find(([, cnt]) => cnt >= 3);

  if (!top) return res.json({ ok: true, suggest: false, slot: slotNow });

  const [food_id, times] = top;
  const food = db.prepare(`SELECT name FROM foods WHERE id=?`).get(food_id) as
    | { name?: string }
    | undefined;
  const name = food?.name || food_id;

  return res.json({
    ok: true,
    suggest: true,
    food_id,
    name,
    reason: `same-slot frequency ${times} in last ${days} days`,
    slot: slotNow,
  });
  //
});

export default router;
