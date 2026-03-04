import { Request, Response } from 'express';
import { getLolProfile, getChampionLeaderboard } from '../services/riot.service';

export const getLolProfileHandler = async (req: Request, res: Response): Promise<void> => {
  const { gameName, tagLine } = req.params;
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const profile = await getLolProfile(gameName, tagLine, platform);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};

export const getChampionLeaderboardHandler = async (req: Request, res: Response): Promise<void> => {
  const championId = parseInt(req.params.championId, 10);
  const platform = (req.query.platform as string) ?? 'euw1';

  try {
    const leaderboard = await getChampionLeaderboard(championId, platform);
    res.json(leaderboard);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    res.status(500).json({ error: message });
  }
};
