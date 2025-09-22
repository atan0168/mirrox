// backend/src/routes/food.ts
import { Router } from 'express';
import { z } from 'zod';
import { extractWithDeepSeek } from '../services/deepseek';

import { analyzeMeal, tagsToTips } from '../services/nutrition';

import { searchFoods, getFoodById } from './foods_db';
import { prettyName } from '../services/display_name';

const router = Router();

// UI label map (keep tag keys in English for stability)
const TAG_I18N: Record<string, Record<'en' | 'zh' | 'ms', string>> = {
  high_sugar:  { en: 'High Sugar',  zh: '高糖',     ms: 'Gula Tinggi' },
  low_fiber:   { en: 'Low Fiber',   zh: '低纤维',   ms: 'Serat Rendah' },
  high_fat:    { en: 'High Fat',    zh: '高脂',     ms: 'Lemak Tinggi' },
  high_sodium: { en: 'High Sodium', zh: '高钠',     ms: 'Natrium Tinggi' },
  unbalanced:  { en: 'Unbalanced',  zh: '营养不均', ms: 'Tidak Seimbang' },
};

// Accept text, imageBase64 (with/without dataURL header), or imageUrl (http/https)
// Require at least one field to be present
const BodySchema = z
  .object({
    text: z.string().optional(),
    imageBase64: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine(
    (d) => d.text || d.imageBase64 || d.imageUrl,
    { message: 'Provide at least one of: text, imageUrl, imageBase64' }
  );

// Optional: quick connectivity check
router.get('/ping', (_req, res) => res.json({ ok: true, ping: 'pong' }));

router.post('/extract', async (req, res) => {
  try {
    const body = BodySchema.parse(req.body);
    const result = await extractWithDeepSeek(body);
    res.json({ ok: true, data: result });
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('[extract] upstream status=', status, 'data=', data || err?.message);
    res.json({ ok: false, error: status ? `Upstream error ${status}` : (err?.message || 'Request failed') });
  }
});

/** Analyze: nutrition totals + tags + avatar_effects + tips */
router.post('/analyze', async (req, res) => {
  try {
    // UI language for labels/tips (default: English)
    const uiLang = (req.query.ui_lang as 'en' | 'zh' | 'ms') || 'en';

    // Validate request body
    const body = BodySchema.parse(req.body);

    // Analyze (DeepSeek extraction happens inside analyzeMeal via callback)
    const data = await analyzeMeal(
      { text: body.text, imageBase64: body.imageBase64 },
      async (p) => {
        const r = await extractWithDeepSeek({ ...p, imageUrl: body.imageUrl });
        return { FOOD_ITEM: r.FOOD_ITEM || [], DRINK_ITEM: r.DRINK_ITEM || [] };
      }
    );

    // Localized tag display strings
    const tags_display = (data.tags || []).map(t => TAG_I18N[t]?.[uiLang] || t);

    // Tips language (ms falls back to English)
    const tipLang: 'en' | 'zh' = uiLang === 'zh' ? 'zh' : 'en';
    
    const tips = tagsToTips(data.tags, 'en');




    const per_item = (data.nutrients?.per_item || []).map((it: any) => ({
      ...it,
      display_name: prettyName(it.name || it.id, 'en'), 
    }));
    const canonical = (data.canonical || []).map((c: any) => ({
      ...c,
      display_name: prettyName(c.name || c.id, 'en'),  
    }));







    // Respond with canonical (for nice item names), nutrients, tags, effects, tips
    res.json({
      ok: true,
      data: {
        canonical,
        nutrients: { ...(data.nutrients || {}), per_item },
        
        tags: data.tags,                      // stable English keys
        tags_display,                         // localized labels for UI
        avatar_effects: data.avatar_effects,  // drives avatar meters/animations
        tips                                   // short, localized suggestions
      }
    });
  } catch (err: any) {
    console.error('[analyze] error:', err?.response?.data || err?.message);
    res.status(400).json({ ok: false, error: err?.message || 'Bad Request' });
  }
});

// Search foods (adds display_name for prettier UI)
router.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ success: false, error: 'Missing q' });

  try {
    const rows = searchFoods(q, 20); // uses foods_fts internally (falls back to LIKE inside helper)
    const withPretty = rows.map(r => ({
      ...r,
      display_name: prettyName(r.name, 'en'),
    }));
    res.json({ success: true, data: withPretty });
  } catch (e: any) {
    console.error('[food/search] error:', e?.message || e);
    res.status(500).json({ success: false, error: 'DB query failed' });
  }
});

router.get('/:id', (req, res) => {
  const id = req.params.id;
  try {
    const food = getFoodById(id);
    if (!food) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: food });
  } catch (e: any) {
    console.error('[food/:id] error:', e?.message || e);
    res.status(500).json({ success: false, error: 'DB query failed' });
  }
});

export default router;
