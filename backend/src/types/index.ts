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

// ─── Leaguepedia Raw API Types (used only during sync) ────────────────────────

export interface LPTournamentRaw {
  Name: string;
  OverviewPage: string;
  DateStart: string;
  Date: string;
  League: string;
  Region: string;
  Prizepool: string;
}

export interface LPPlayerRaw {
  LPPageId: string; // alias de _pageName — identifiant wiki unique par joueur
  ID: string;
  Name: string;
  NativeName: string;
  Country: string;
  Birthdate: string;
  Role: string;
  Team: string;
  IsRetired: string; // "1" or ""
  Residency: string;
}

export interface LPTeamRaw {
  Name: string;
  Short: string;
  Image: string;
  Region: string;
  IsDisbanded: string;
  Location: string;
}

export interface LPRosterRaw {
  Team: string;
  OverviewPage: string;
  Player: string;
  RosterRole: string | null;
  Flag: string | null;
}

export interface LPMatchRaw {
  Team1: string;
  Team2: string;
  Team1Score: string;
  Team2Score: string;
  DateTime_UTC: string;
  Round: string;
  Tab: string;
  OverviewPage: string;
  Winner: string;
}

export interface LPPlayerImageRaw {
  Link: string;       // ingame name du joueur
  FileName: string;   // nom du fichier image
}

export interface LPTournamentGroupRaw {
  Team: string;
  OverviewPage: string;
  GroupName: string;
  GroupDisplay: string;
  GroupN: number;
}

export interface LPPlayerStatRaw {
  GameId: string;
  Link: string; // player ingame name
  Champion: string;
  Kills: string;
  Deaths: string;
  Assists: string;
  Gold: string;
  CS: string;
  DamageToChampions: string;
  VisionScore: string;
  Team: string;
  PlayerWin: string; // "Yes" or "No"
  PlayerRole: string;
}

// ─── DB-backed Esport Types (returned by our API) ─────────────────────────────

export interface EsportTournament {
  id: string;
  name: string;
  league: string;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  prizepool: string | null;
  syncedAt: Date;
}

export interface EsportTeam {
  id: string;
  short: string | null;
  image: string | null;
  region: string | null;
  location: string | null;
  syncedAt: Date;
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
  syncedAt: Date;
}

export interface EsportRoster {
  id: number;
  tournamentId: string;
  teamId: string;
  playerId: string;
  role: string | null;
  isStarter: boolean;
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
  syncedAt: Date;
}

export interface EsportStanding {
  id: number;
  tournamentId: string;
  teamName: string;
  teamShort: string | null;
  wins: number;
  losses: number;
  rank: number;
  groupName: string | null;
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
}
