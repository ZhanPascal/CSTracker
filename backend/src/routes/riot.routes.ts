import { Router } from 'express';
import { getLolProfileHandler } from '../controllers/riot.controller';

const router = Router();

// GET /api/lol/profile/:gameName/:tagLine?platform=euw1
router.get('/profile/:gameName/:tagLine', getLolProfileHandler);

export default router;
