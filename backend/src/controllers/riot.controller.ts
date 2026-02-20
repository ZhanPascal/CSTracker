import { Request, Response } from 'express';
import { getLolProfile } from '../services/riot.service';

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
