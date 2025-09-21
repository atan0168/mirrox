// backend/src/routes/ai.ts
import { Router } from 'express';
import { extractWithDeepSeek } from '../services/deepseek';

const router = Router();

/**
 * POST /api/ai/extract
 * Body: { text?, imageBase64?, imageUrl?, user_id? }
 */
router.post('/extract', async (req, res) => {
  try {
    const { text, imageBase64, imageUrl, user_id } = req.body || {};
    const result = await extractWithDeepSeek({ text, imageBase64, imageUrl, user_id });
    res.json({ ok: true, data: result });
  } catch (err: any) {
    console.error('[AI/extract] error:', err?.message || err);
    res.status(500).json({ ok: false, error: 'AI extract failed' });
  }
});

export default router;
