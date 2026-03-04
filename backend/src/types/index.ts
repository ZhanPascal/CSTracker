// Types globaux du backend CSTracker

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
}

export interface MessageResponse {
  message: string;
}

// ─── Riot API Types ───────────────────────────────────────────────────────────

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

export interface ChampionMastery {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  chestGranted: boolean;
  tokensEarned: number;
}

export interface ChampionMasteryEnriched extends ChampionMastery {
  championName: string;
  championImageId: string;
}

export interface LolProfile {
  account: RiotAccount;
  summoner: Summoner;
  rankedInfo: LeagueEntry[];
  topChampions: ChampionMasteryEnriched[];
  ddVersion: string;
}

export interface DDragonChampion {
  key: string;
  name: string;
  id: string;
}

export interface ChampionLeaderboardEntry {
  rank: number;
  gameName: string;
  tagLine: string;
  puuid: string;
  championPoints: number;
  championLevel: number;
}
