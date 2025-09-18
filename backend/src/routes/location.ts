import { Router } from 'express';
import { locationController } from '../controllers/LocationController';

const router = Router();

router.get('/autocomplete', (req, res) =>
  locationController.autocomplete(req, res)
);

export default router;
