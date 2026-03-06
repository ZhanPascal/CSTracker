import { Router } from 'express';
import {
  syncHandler,
  getLeagueConfigHandler,
  getTournamentsHandler,
  getTournamentHandler,
  searchPlayersHandler,
  getPlayerHandler,
  getTeamHandler,
} from '../controllers/esport.controller.js';

const router = Router();

router.post('/sync', syncHandler);
router.get('/league-config', getLeagueConfigHandler);
router.get('/tournaments', getTournamentsHandler);
router.get('/tournaments/:id', getTournamentHandler);
router.get('/players', searchPlayersHandler);
router.get('/players/:id', getPlayerHandler);
router.get('/teams/:id', getTeamHandler);

export default router;
