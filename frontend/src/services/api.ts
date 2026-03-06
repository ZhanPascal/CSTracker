import type {
  MessageResponse,
  LolProfile,
  ChampionLeaderboardEntry,
  EsportLeagueConfig,
  EsportTournament,
  EsportTournamentDetail,
  EsportPlayer,
  EsportPlayerDetail,
  EsportTeamDetail,
} from '../types';

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

// ─── Esport API ───────────────────────────────────────────────────────────────

export const syncEsportData = async (league: string, season: string): Promise<{ message: string }> => {
  const response = await fetch(`${BASE_URL}/esport/sync?league=${encodeURIComponent(league)}&season=${encodeURIComponent(season)}`, {
    method: 'POST',
  });
  const data = await response.json() as { message?: string; error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data as { message: string };
};

export const getEsportLeagueConfig = async (): Promise<EsportLeagueConfig> => {
  const response = await fetch(`${BASE_URL}/esport/league-config`);
  const data = await response.json() as EsportLeagueConfig & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data;
};

export const getEsportTournaments = async (league?: string, year?: string): Promise<EsportTournament[]> => {
  const params = new URLSearchParams();
  if (league) params.set('league', league);
  if (year) params.set('year', year);
  const qs = params.toString();
  const response = await fetch(`${BASE_URL}/esport/tournaments${qs ? `?${qs}` : ''}`);
  const data = await response.json() as EsportTournament[] | { error?: string };
  if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Erreur inconnue');
  return data as EsportTournament[];
};

export const getEsportTournament = async (id: string): Promise<EsportTournamentDetail> => {
  const response = await fetch(`${BASE_URL}/esport/tournaments/${encodeURIComponent(id)}`);
  const data = await response.json() as EsportTournamentDetail & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data;
};

export const searchEsportPlayers = async (query: string): Promise<EsportPlayer[]> => {
  const response = await fetch(`${BASE_URL}/esport/players?q=${encodeURIComponent(query)}`);
  const data = await response.json() as EsportPlayer[] | { error?: string };
  if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Erreur inconnue');
  return data as EsportPlayer[];
};

export const getEsportPlayer = async (id: string): Promise<EsportPlayerDetail> => {
  const response = await fetch(`${BASE_URL}/esport/players/${encodeURIComponent(id)}`);
  const data = await response.json() as EsportPlayerDetail & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data;
};

export const getEsportTeam = async (id: string): Promise<EsportTeamDetail> => {
  const response = await fetch(`${BASE_URL}/esport/teams/${encodeURIComponent(id)}`);
  const data = await response.json() as EsportTeamDetail & { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Erreur inconnue');
  return data;
};
