import { Router } from 'express';
import {
  syncHandler,
  getLeagueConfigHandler,
  getTournamentsHandler,
  getTournamentHandler,
  searchPlayersHandler,
  getPlayerHandler,
  getTeamHandler,
  getLSLeaguesHandler,
  getLSScheduleHandler,
  getLSTournamentsHandler,
  getLSStandingsHandler,
} from '../controllers/esport.controller.js';

const router = Router();

// Leaguepedia (historique, sync DB)
router.post('/sync', syncHandler);
router.get('/league-config', getLeagueConfigHandler);
router.get('/tournaments', getTournamentsHandler);
router.get('/tournaments/:id', getTournamentHandler);
router.get('/players', searchPlayersHandler);
router.get('/players/:id', getPlayerHandler);
router.get('/teams/:id', getTeamHandler);

// LoL Esports API (live / récent)
router.get('/live/leagues', getLSLeaguesHandler);
router.get('/live/schedule', getLSScheduleHandler);           // ?league=lck
router.get('/live/tournaments', getLSTournamentsHandler);     // ?league=lck
router.get('/live/standings', getLSStandingsHandler);         // ?tournamentId=...

export default router;
