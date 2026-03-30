const BASE_URL = 'https://esports-api.lolesports.com/persisted/gw';
const API_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';

const HEADERS = { 'x-api-key': API_KEY };

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface LSLeague {
  id: string;
  slug: string;
  name: string;
  region: string;
  image: string;
  priority: number;
  displayPriority: { position: number; status: string };
}

interface LSTeam {
  id: string;
  slug: string;
  name: string;
  code: string;
  image: string;
  alternativeImage: string;
  backgroundImage: string;
  status: string;
  homeLeague: { name: string; region: string };
  record?: { wins: number; losses: number; ties: number };
}

interface LSMatch {
  id: string;
  startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  type: string;
  blockName: string;
  league: { id: string; slug: string; name: string; image: string };
  teams: { id: string; name: string; code: string; image: string; result: { outcome: 'win' | 'loss' | null; gameWins: number } | null }[];
  games: { id: string; state: string; number: number; teams: { id: string; side: string }[] }[];
  strategy: { type: string; count: number };
}

interface LSScheduleEvent {
  startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  type: string;
  blockName: string;
  league: { id: string; slug: string; name: string; image: string };
  match: {
    id: string;
    flags: string[];
    teams: { id: string; name: string; code: string; image: string; result: { outcome: 'win' | 'loss' | null; gameWins: number } | null }[];
    strategy: { type: string; count: number };
  };
}

interface LSStageSection {
  name: string;
  match_type: string;
  standings: { teams: { id: string; slug: string; name: string; code: string; image: string; record: { wins: number; losses: number; ties: number } }[] }[];
}

interface LSTournament {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
  stages: { name: string; type: string; sections: LSStageSection[] }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set('hl', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { headers: HEADERS });
  if (!res.ok) throw new Error(`LoL Esports API ${endpoint}: HTTP ${res.status}`);

  const json = (await res.json()) as { data: T };
  return json.data;
}

// Cache league slug → id pour éviter de refetch à chaque requête
let _leagueCache: LSLeague[] | null = null;

async function getLeagues(): Promise<LSLeague[]> {
  if (_leagueCache) return _leagueCache;
  const data = await apiFetch<{ leagues: LSLeague[] }>('getLeagues');
  _leagueCache = data.leagues;
  return _leagueCache;
}

async function resolveLeagueId(slugOrName: string): Promise<string | null> {
  const leagues = await getLeagues();
  const lower = slugOrName.toLowerCase();
  const found = leagues.find(
    (l) => l.slug.toLowerCase() === lower || l.name.toLowerCase() === lower
  );
  return found?.id ?? null;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface LSLeaguePublic {
  id: string;
  slug: string;
  name: string;
  region: string;
  image: string;
}

export async function fetchLSLeagues(): Promise<LSLeaguePublic[]> {
  const leagues = await getLeagues();
  return leagues
    .sort((a, b) => a.priority - b.priority)
    .map(({ id, slug, name, region, image }) => ({ id, slug, name, region, image }));
}

export interface LSScheduleMatch {
  matchId: string;
  startTime: string;
  state: 'completed' | 'inProgress' | 'unstarted';
  blockName: string;
  leagueName: string;
  strategy: { type: string; count: number };
  teams: {
    id: string;
    name: string;
    code: string;
    image: string;
    wins: number | null;
    outcome: 'win' | 'loss' | null;
  }[];
}

export async function fetchLSSchedule(leagueSlug: string): Promise<LSScheduleMatch[]> {
  const leagueId = await resolveLeagueId(leagueSlug);
  if (!leagueId) throw new Error(`League inconnue : ${leagueSlug}`);

  const data = await apiFetch<{ schedule: { events: LSScheduleEvent[]; pages: unknown } }>(
    'getSchedule',
    { leagueId }
  );

  return data.schedule.events.map((ev) => ({
    matchId: ev.match.id,
    startTime: ev.startTime,
    state: ev.state,
    blockName: ev.blockName,
    leagueName: ev.league.name,
    strategy: ev.match.strategy,
    teams: ev.match.teams.map((t) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      image: t.image,
      wins: t.result?.gameWins ?? null,
      outcome: t.result?.outcome ?? null,
    })),
  }));
}

export interface LSTournamentPublic {
  id: string;
  slug: string;
  startDate: string;
  endDate: string;
}

export async function fetchLSTournaments(leagueSlug: string): Promise<LSTournamentPublic[]> {
  const leagueId = await resolveLeagueId(leagueSlug);
  if (!leagueId) throw new Error(`League inconnue : ${leagueSlug}`);

  const data = await apiFetch<{ leagues: { tournaments: LSTournament[] }[] }>(
    'getTournamentsForLeague',
    { leagueId }
  );

  const tournaments = data.leagues[0]?.tournaments ?? [];
  return tournaments.map(({ id, slug, startDate, endDate }) => ({ id, slug, startDate, endDate }));
}

export interface LSStandingTeam {
  id: string;
  name: string;
  code: string;
  image: string;
  wins: number;
  losses: number;
  ties: number;
}

export interface LSStandingsSection {
  name: string;
  teams: LSStandingTeam[];
}

export async function fetchLSStandings(tournamentId: string): Promise<LSStandingsSection[]> {
  const data = await apiFetch<{ standings: { stages: { sections: LSStageSection[] }[] }[] }>(
    'getStandings',
    { tournamentId }
  );

  const sections: LSStandingsSection[] = [];
  for (const stage of data.standings[0]?.stages ?? []) {
    for (const section of stage.sections) {
      const teams: LSStandingTeam[] = (section.standings[0]?.teams ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        image: t.image,
        wins: t.record.wins,
        losses: t.record.losses,
        ties: t.record.ties,
      }));
      if (teams.length > 0) sections.push({ name: section.name, teams });
    }
  }
  return sections;
}
