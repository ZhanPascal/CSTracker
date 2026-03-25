import type { Request, Response } from 'express';
import {
  REGIONS,
  REGION_SUBDIVISIONS,
  INTERNATIONAL_EVENTS,
  getTournaments,
  getTournamentDetail,
  searchPlayers,
  getPlayerDetail,
  getTeamDetail,
  syncTournament,
} from '../services/esport.service.js';
import {
  fetchLSLeagues,
  fetchLSSchedule,
  fetchLSTournaments,
  fetchLSStandings,
} from '../services/lolesports.service.js';

export const syncHandler = async (req: Request, res: Response): Promise<void> => {
  const league = (req.query.league as string) ?? '';
  const season = (req.query.season as string) ?? '';

  if (!league || !season) {
    res.status(400).json({ error: 'Paramètres league et season requis (ex: ?league=LEC&season=2025)' });
    return;
  }

  try {
    const result = await syncTournament(league, season);
    res.json({ message: `Sync terminée — ${result.synced} tournoi(s) synchronisé(s)` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getLeagueConfigHandler = (_req: Request, res: Response): void => {
  res.json({
    regions: REGIONS,
    subdivisions: REGION_SUBDIVISIONS,
    international: INTERNATIONAL_EVENTS,
  });
};

export const getTournamentsHandler = async (req: Request, res: Response): Promise<void> => {
  const league = req.query.league as string | undefined;
  const year = req.query.year as string | undefined;
  try {
    const data = await getTournaments(league, year);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getTournamentHandler = async (req: Request, res: Response): Promise<void> => {
  const id = decodeURIComponent(req.params.id as string);
  try {
    const data = await getTournamentDetail(id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(404).json({ error: message });
  }
};

export const searchPlayersHandler = async (req: Request, res: Response): Promise<void> => {
  const query = (req.query.q as string) ?? '';
  if (!query || query.trim().length < 2) {
    res.status(400).json({ error: 'Requête de recherche trop courte (minimum 2 caractères)' });
    return;
  }
  try {
    const data = await searchPlayers(query.trim());
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getPlayerHandler = async (req: Request, res: Response): Promise<void> => {
  const id = decodeURIComponent(req.params.id as string);
  try {
    const data = await getPlayerDetail(id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(404).json({ error: message });
  }
};

export const getTeamHandler = async (req: Request, res: Response): Promise<void> => {
  const id = decodeURIComponent(req.params.id as string);
  try {
    const data = await getTeamDetail(id);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(404).json({ error: message });
  }
};

// ─── LoL Esports API (live / récent) ─────────────────────────────────────────

export const getLSLeaguesHandler = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await fetchLSLeagues();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getLSScheduleHandler = async (req: Request, res: Response): Promise<void> => {
  const league = req.query.league as string | undefined;
  if (!league) {
    res.status(400).json({ error: 'Paramètre league requis (ex: ?league=lck)' });
    return;
  }
  try {
    const data = await fetchLSSchedule(league);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getLSTournamentsHandler = async (req: Request, res: Response): Promise<void> => {
  const league = req.query.league as string | undefined;
  if (!league) {
    res.status(400).json({ error: 'Paramètre league requis (ex: ?league=lck)' });
    return;
  }
  try {
    const data = await fetchLSTournaments(league);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getLSStandingsHandler = async (req: Request, res: Response): Promise<void> => {
  const tournamentId = req.query.tournamentId as string | undefined;
  if (!tournamentId) {
    res.status(400).json({ error: 'Paramètre tournamentId requis' });
    return;
  }
  try {
    const data = await fetchLSStandings(tournamentId);
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};
