import { Router } from 'express';
import { foodController } from '../controllers/FoodController';

const router = Router();

/**
 * @route POST /api/food/analyze
 * @desc Analyze meal text or image and return nutrition insights
 */
router.post('/analyze', foodController.analyze.bind(foodController));

/**
 * @route GET /api/food/search
 * @desc Search foods catalogue (FTS primary, LIKE fallback)
 */
router.get('/search', foodController.search.bind(foodController));

/**
 * @route GET /api/food/:id
 * @desc Fetch detailed food information by id
 */
router.get('/:id', foodController.getById.bind(foodController));

export default router;
