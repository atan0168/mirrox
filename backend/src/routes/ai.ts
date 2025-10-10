import { Router } from 'express';
import { extractWithDeepSeek } from '../services/DeepseekService';

const router = Router();

/**
 * POST /api/ai/extract
 * Body: { text?, imageBase64?, imageUrl?, user_id? }
 */
router.post('/extract', async (req, res) => {
  try {
    const { text, imageBase64, imageUrl } = req.body || {};
    const result = await extractWithDeepSeek({
      text,
      imageBase64,
      imageUrl,
    });
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error('[AI/extract] error:', err);
    res.status(500).json({ ok: false, error: 'AI extract failed' });
  }
});

export default router;
