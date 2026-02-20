// Types globaux du frontend CSTracker

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface MessageResponse {
  message: string;
}

// ─── Riot / LoL Types ─────────────────────────────────────────────────────────

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntry {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface ChampionMasteryEnriched {
  championId: number;
  championName: string;
  championImageId: string;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  chestGranted: boolean;
  tokensEarned: number;
}

export interface LolProfile {
  account: RiotAccount;
  summoner: Summoner;
  rankedInfo: LeagueEntry[];
  topChampions: ChampionMasteryEnriched[];
  ddVersion: string;
}
