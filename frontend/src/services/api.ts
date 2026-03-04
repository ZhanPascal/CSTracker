import type { MessageResponse, LolProfile, ChampionLeaderboardEntry } from '../types';

const BASE_URL = '/api';

export const fetchMessage = async (): Promise<MessageResponse> => {
  const response = await fetch(`${BASE_URL}/message`);
  if (!response.ok) throw new Error('Erreur : impossible de joindre le backend');
  return response.json() as Promise<MessageResponse>;
};

export const getLolProfile = async (
  gameName: string,
  tagLine: string,
  platform: string = 'euw1',
): Promise<LolProfile> => {
  const response = await fetch(
    `${BASE_URL}/lol/profile/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?platform=${platform}`,
  );
  const data = await response.json() as LolProfile & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data;
};

export const getChampionLeaderboard = async (
  championId: number,
  platform: string = 'euw1',
): Promise<ChampionLeaderboardEntry[]> => {
  const response = await fetch(
    `${BASE_URL}/lol/champion-leaderboard/${championId}?platform=${platform}`,
  );
  const data = await response.json() as ChampionLeaderboardEntry[] | { error?: string };
  if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Erreur inconnue');
  return data as ChampionLeaderboardEntry[];
};
