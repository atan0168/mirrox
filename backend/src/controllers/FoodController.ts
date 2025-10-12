import { Request, Response } from 'express';
import { z } from 'zod';
import { extractWithDeepSeek } from '../services/DeepseekService';
import { getFoodById, searchFoods } from '../services/FoodService';
import type { AnalyzeInput } from '../services/NutritionService';
import { analyzeMeal } from '../services/NutritionService';
import { prettyName } from '../utils/displayName';
import { isError } from '../utils/error';

const BodySchema = z
  .object({
    text: z.string().optional(),
    imageBase64: z.string().optional(),
    imageUrl: z.string().optional(),
    selectedFoodId: z.string().min(1).optional(),
    skipExtraction: z.boolean().optional(),
  })
  .refine(
    payload =>
      payload.text ||
      payload.imageBase64 ||
      payload.imageUrl ||
      payload.selectedFoodId,
    'Provide at least one of: text, imageUrl, imageBase64, selectedFoodId'
  );

class FoodController {
  private readonly bodySchema = BodySchema;

  async analyze(req: Request, res: Response) {
    try {
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
      if (body.selectedFoodId) {
        analyzePayload.selectedFoodIds = [body.selectedFoodId];
      }
      if (body.skipExtraction) {
        analyzePayload.skipExtraction = true;
      }

      const data = await analyzeMeal(analyzePayload, async payload => {
        const {
          selectedFoodIds: _selectedFoodIds,
          skipExtraction: _skipExtraction,
          ...rest
        } = payload;
        const extractInput = {
          ...rest,
          ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
        };

        const result = await extractWithDeepSeek(extractInput);

        return {
          FOOD_ITEM: result.FOOD_ITEM || [],
          DRINK_ITEM: result.DRINK_ITEM || [],
        };
      });

      const perItem = (data.nutrients?.per_item || []).map(item => ({
        ...item,
        source: item.source,
        display_name: prettyName(item.name || item.id),
      }));
      const canonical = (data.canonical || []).map(item => ({
        ...item,
        source: item.source,
        display_name: prettyName(item.name || item.id),
      }));

      res.json({
        ok: true,
        data: {
          canonical,
          nutrients: { ...(data.nutrients || {}), per_item: perItem },
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
