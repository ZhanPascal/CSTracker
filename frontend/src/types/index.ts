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

export interface ChampionLeaderboardEntry {
  rank: number;
  gameName: string;
  tagLine: string;
  puuid: string;
  championPoints: number;
  championLevel: number;
}

// ─── Esport Types ─────────────────────────────────────────────────────────────

export interface EsportLeagueConfig {
  regions: string[];
  subdivisions: Record<string, string>;
  international: string[];
  startYears?: Record<string, number>;
}

export interface EsportTournament {
  id: string;
  name: string;
  league: string;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  prizepool: string | null;
  syncedAt: string;
}

export interface EsportTeam {
  id: string;
  short: string | null;
  image: string | null;
  region: string | null;
  location: string | null;
}

export interface EsportPlayer {
  id: number;
  lpId: string;
  name: string;
  nativeName: string | null;
  country: string | null;
  birthdate: string | null;
  role: string | null;
  residency: string | null;
  isRetired: boolean;
  image: string | null;
  teamId: string | null;
  team?: EsportTeam | null;
}

export interface EsportRoster {
  id: number;
  tournamentId: string;
  teamId: string;
  playerId: string;
  role: string | null;
  isStarter: boolean;
  player?: EsportPlayer;
  team?: EsportTeam;
}

export interface EsportMatch {
  id: string;
  tournamentId: string | null;
  team1: string | null;
  team2: string | null;
  team1Score: number | null;
  team2Score: number | null;
  winner: string | null;
  dateTime: string | null;
  round: string | null;
}

export interface EsportStanding {
  id: number;
  tournamentId: string;
  teamName: string;
  teamShort: string | null;
  wins: number;
  losses: number;
  rank: number;
}

export interface EsportPlayerStat {
  id: number;
  matchId: string;
  playerId: string;
  champion: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  gold: number | null;
  cs: number | null;
  damageToChampions: number | null;
  visionScore: number | null;
  team: string | null;
  win: boolean | null;
  role: string | null;
  match?: EsportMatch;
}

export interface EsportTournamentDetail extends EsportTournament {
  matches: EsportMatch[];
  standings: EsportStanding[];
  rosters: EsportRoster[];
}

export interface EsportPlayerDetail extends EsportPlayer {
  rosters: (EsportRoster & { tournament: EsportTournament; team: EsportTeam })[];
  stats: EsportPlayerStat[];
}

export interface EsportTeamDetail extends EsportTeam {
  players: EsportPlayer[];
  rosters: (EsportRoster & { tournament: EsportTournament; player: EsportPlayer })[];
}
