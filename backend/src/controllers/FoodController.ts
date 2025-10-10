import { Request, Response } from 'express';
import { z } from 'zod';
import { extractWithDeepSeek } from '../services/DeepseekService';
import { getFoodById, searchFoods } from '../services/FoodService';
import type { AnalyzeInput } from '../services/NutritionService';
import { analyzeMeal, tagsToTips } from '../services/NutritionService';
import { prettyName } from '../utils/displayName';
import { isError } from '../utils/error';

type UiLang = 'en' | 'zh' | 'ms';

const BodySchema = z
  .object({
    text: z.string().optional(),
    imageBase64: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine(
    payload => payload.text || payload.imageBase64 || payload.imageUrl,
    'Provide at least one of: text, imageUrl, imageBase64'
  );

const TAG_I18N: Record<string, Record<UiLang, string>> = {
  high_sugar: { en: 'High Sugar', zh: '高糖', ms: 'Gula Tinggi' },
  low_fiber: { en: 'Low Fiber', zh: '低纤维', ms: 'Serat Rendah' },
  high_fat: { en: 'High Fat', zh: '高脂', ms: 'Lemak Tinggi' },
  high_sodium: { en: 'High Sodium', zh: '高钠', ms: 'Natrium Tinggi' },
  unbalanced: { en: 'Unbalanced', zh: '营养不均', ms: 'Tidak Seimbang' },
};

class FoodController {
  private readonly bodySchema = BodySchema;

  async analyze(req: Request, res: Response) {
    try {
      const uiLang = (req.query.uiLang || 'en') as UiLang;
      const parsed = this.bodySchema.safeParse(req.body);

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        res.status(400).json({
          ok: false,
          error: firstIssue?.message ?? 'Invalid request body',
        });
        return;
      }

      const body = parsed.data;

      const analyzePayload: AnalyzeInput = {};
      if (body.text) {
        analyzePayload.text = body.text;
      }
      if (body.imageBase64) {
        analyzePayload.imageBase64 = body.imageBase64;
      }

      const data = await analyzeMeal(analyzePayload, async payload => {
        const extractInput = {
          ...payload,
          ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
        };
        const result = await extractWithDeepSeek(extractInput);

        return {
          FOOD_ITEM: result.FOOD_ITEM || [],
          DRINK_ITEM: result.DRINK_ITEM || [],
        };
      });

      const tags = data.tags || [];
      const tagsDisplay = tags.map(tag => TAG_I18N[tag]?.[uiLang] || tag);
      const tipLang: 'en' | 'zh' = uiLang === 'zh' ? 'zh' : 'en';
      const tips = tagsToTips(tags, tipLang);
      const perItem = (data.nutrients?.per_item || []).map(item => ({
        ...item,
        display_name: prettyName(item.name || item.id),
      }));
      const canonical = (data.canonical || []).map(item => ({
        ...item,
        display_name: prettyName(item.name || item.id),
      }));

      res.json({
        ok: true,
        data: {
          canonical,
          nutrients: { ...(data.nutrients || {}), per_item: perItem },
          tags,
          tags_display: tagsDisplay,
          avatar_effects: data.avatar_effects,
          tips,
        },
      });
    } catch (error) {
      console.error(
        '[FoodController.analyze] error:',
        isError(error) ? error.message : error
      );
      res.status(400).json({
        ok: false,
        error: isError(error) ? error.message : error || 'Bad Request',
      });
    }
  }

  search(req: Request, res: Response): void {
    const q = String(req.query.q ?? '').trim();

    if (!q) {
      res.status(400).json({ success: false, error: 'Missing q' });
      return;
    }

    try {
      const rows = searchFoods(q, 20);
      const withPretty = rows.map(row => ({
        ...row,
        display_name: prettyName(row.name),
      }));

      res.json({ success: true, data: withPretty });
    } catch (error) {
      console.error(
        '[FoodController.search] error:',
        isError(error) ? error : error
      );
      res.status(500).json({ success: false, error: 'DB query failed' });
    }
  }

  getById(req: Request, res: Response): void {
    try {
      const id = req.params?.id;
      if (!id) {
        res.status(400).json({ success: false, error: 'Missing id' });
        return;
      }

      const food = getFoodById(id);

      if (!food) {
        res.status(404).json({ success: false, error: 'Not found' });
        return;
      }

      res.json({ success: true, data: food });
    } catch (error) {
      console.error(
        '[FoodController.getById] error:',
        isError(error) ? error : error
      );
      res.status(500).json({ success: false, error: 'DB query failed' });
    }
  }
}

export const foodController = new FoodController();
