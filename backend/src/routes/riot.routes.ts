import { Router } from 'express';
import {
  getLolProfileHandler,
  refreshLolProfileHandler,
  getRecentMatchesHandler,
  getChampionLeaderboardHandler,
} from '../controllers/riot.controller';

const router = Router();

// GET  /api/lol/profile/:gameName/:tagLine?platform=euw1
router.get('/profile/:gameName/:tagLine', getLolProfileHandler);

// POST /api/lol/profile/:gameName/:tagLine/refresh?platform=euw1
router.post('/profile/:gameName/:tagLine/refresh', refreshLolProfileHandler);

// GET  /api/lol/matches/:puuid?platform=euw1
router.get('/matches/:puuid', getRecentMatchesHandler);

// GET  /api/lol/champion-leaderboard/:championId?platform=euw1
router.get('/champion-leaderboard/:championId', getChampionLeaderboardHandler);

export default router;
