import { Request, Response } from 'express';
import { getLolProfile, refreshLolProfile, getRecentMatches, getChampionLeaderboard } from '../services/riot.service';

export const getLolProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const { gameName, tagLine } = req.params as { gameName: string; tagLine: string };
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const profile = await getLolProfile(gameName, tagLine, platform);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const refreshLolProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const { gameName, tagLine } = req.params as { gameName: string; tagLine: string };
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const profile = await refreshLolProfile(gameName, tagLine, platform);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getRecentMatchesHandler = async (req: Request, res: Response): Promise<void> => {
  const { puuid } = req.params as { puuid: string };
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const matches = await getRecentMatches(puuid, platform);
    res.json(matches);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getChampionLeaderboardHandler = async (req: Request, res: Response): Promise<void> => {
  const championId = parseInt(req.params.championId as string, 10);
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const leaderboard = await getChampionLeaderboard(championId, platform);
    res.json(leaderboard);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};
