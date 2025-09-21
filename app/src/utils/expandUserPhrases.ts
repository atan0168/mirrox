// app/src/utils/expandUserPhrases.ts
const API_BASE = process.env.EXPO_PUBLIC_API_BASE!;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function expandUserPhrases(rawText: string, userId: string) {
  try {
    const r = await fetch(`${API_BASE}/personalization/user-dict?user_id=${encodeURIComponent(userId)}`);
    const j = await r.json();

    if (!j || !j.data) return rawText;

    const entries: Array<{ phrase: string; canonical_food_id?: string | null; canonical_food_name?: string | null }> =
      j.data || [];

    let text = rawText;
    for (const e of entries) {
      const to = e.canonical_food_name || e.canonical_food_id;
      if (!to) continue;
      const re = new RegExp(`\\b${escapeRegExp(e.phrase)}\\b`, 'ig');
      text = text.replace(re, to);
    }
    return text;
  } catch {
    return rawText;
  }
}
