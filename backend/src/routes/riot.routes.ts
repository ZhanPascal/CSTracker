import { Router } from 'express';
import { getLolProfileHandler, getChampionLeaderboardHandler } from '../controllers/riot.controller';

const router = Router();

// GET /api/lol/profile/:gameName/:tagLine?platform=euw1
router.get('/profile/:gameName/:tagLine', getLolProfileHandler);

// GET /api/lol/champion-leaderboard/:championId?platform=euw1
router.get('/champion-leaderboard/:championId', getChampionLeaderboardHandler);

export default router;
