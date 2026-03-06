import type {
  LPTournamentRaw,
  LPPlayerRaw,
  LPTeamRaw,
  LPRosterRaw,
  LPMatchRaw,
  LPPlayerStatRaw,
} from '../types/index.js';

const BASE_URL = 'https://lol.fandom.com/api.php';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Authentication ────────────────────────────────────────────────────────────

let sessionCookie: string | null = null;

function extractCookies(headers: Headers): string {
  const raw: string[] =
    typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [headers.get('set-cookie') ?? ''].filter(Boolean);
  return raw.map((h) => h.split(';')[0]).join('; ');
}

async function login(): Promise<void> {
  const username = process.env.LEAGUEPEDIA_USERNAME;
  const password = process.env.LEAGUEPEDIA_PASSWORD;

  if (!username || !password) {
    console.warn('[Leaguepedia] Aucune credential configurée — requêtes anonymes (rate limits élevés)');
    sessionCookie = ''; // marque comme "tenté" pour ne pas boucler
    return;
  }

  console.log(`[Leaguepedia] Login en cours avec le compte "${username}"...`);

  // Étape 1 — récupérer le login token
  const tokenRes = await fetch(`${BASE_URL}?action=query&meta=tokens&type=login&format=json`);
  const tokenCookies = extractCookies(tokenRes.headers);
  const tokenData = (await tokenRes.json()) as {
    query: { tokens: { logintoken: string } };
  };
  const loginToken = tokenData?.query?.tokens?.logintoken;

  if (!loginToken) {
    throw new Error('[Leaguepedia] Impossible de récupérer le login token');
  }

  // Étape 2 — s'authentifier avec le bot password
  const body = new URLSearchParams({
    action: 'login',
    format: 'json',
    lgname: username,
    lgpassword: password,
    lgtoken: loginToken,
  });

  const loginRes = await fetch(BASE_URL, {
    method: 'POST',
    headers: { Cookie: tokenCookies },
    body,
  });

  const loginCookies = extractCookies(loginRes.headers);
  const loginData = (await loginRes.json()) as { login: { result: string; reason?: string } };

  if (loginData.login.result !== 'Success') {
    throw new Error(
      `[Leaguepedia] Login échoué: ${loginData.login.result}${loginData.login.reason ? ` — ${loginData.login.reason}` : ''}`
    );
  }

  sessionCookie = [tokenCookies, loginCookies].filter(Boolean).join('; ');
  console.log('[Leaguepedia] Authentifié avec succès');
}

let _loginPromise: Promise<void> | null = null;

async function ensureLoggedIn(): Promise<void> {
  if (sessionCookie !== null) return;
  if (!_loginPromise) _loginPromise = login().finally(() => { _loginPromise = null; });
  await _loginPromise;
}

// ─── Cargo query ───────────────────────────────────────────────────────────────

interface CargoQueryParams {
  tables: string;
  fields: string;
  where?: string;
  orderBy?: string;
  joinOn?: string;
  limit?: number;
}

async function cargoQuery<T>(params: CargoQueryParams): Promise<T[]> {
  await ensureLoggedIn();

  const searchParams = new URLSearchParams({
    action: 'cargoquery',
    format: 'json',
    tables: params.tables,
    fields: params.fields,
    limit: String(params.limit ?? 500),
  });

  if (params.where) searchParams.set('where', params.where);
  if (params.orderBy) searchParams.set('order_by', params.orderBy);
  if (params.joinOn) searchParams.set('join_on', params.joinOn);

  const headers: Record<string, string> = {};
  if (sessionCookie) headers['Cookie'] = sessionCookie;

  const response = await fetch(`${BASE_URL}?${searchParams.toString()}`, { headers });

  if (!response.ok) {
    throw new Error(`Leaguepedia API HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as {
    error?: { info: string };
    cargoquery: { title: T }[];
  };

  if (data.error) {
    throw new Error(`Leaguepedia API error: ${data.error.info}`);
  }

  return data.cargoquery.map((item) => item.title);
}

export async function fetchTournaments(league: string, season: string): Promise<LPTournamentRaw[]> {
  await sleep(300);
  const results = await cargoQuery<LPTournamentRaw>({
    tables: 'Tournaments',
    fields: 'Name,OverviewPage,DateStart,Date,League,Region,Prizepool',
    where: `League="${league}" AND DateStart LIKE "${season}%"`,
    orderBy: 'DateStart DESC',
  });
  console.log(`[Leaguepedia] fetchTournaments(${league}, ${season}) → ${results.length} résultats`);
  return results;
}

export async function fetchLeagueNames(season: string): Promise<string[]> {
  await sleep(300);
  const results = await cargoQuery<{ League: string }>({
    tables: 'Tournaments',
    fields: 'League',
    where: `DateStart LIKE "${season}%" AND League IS NOT NULL`,
    orderBy: 'League ASC',
    limit: 500,
  });
  const unique = [...new Set(results.map((r) => r.League).filter(Boolean))];
  console.log(`[Leaguepedia] Ligues disponibles pour ${season}:`, unique.slice(0, 20));
  return unique;
}

export async function fetchRosters(overviewPage: string): Promise<LPRosterRaw[]> {
  await sleep(300);
  return cargoQuery<LPRosterRaw>({
    tables: 'TournamentRosters',
    fields: 'Team,OverviewPage,Player,Role,IsStarter,IsSubstitute',
    where: `OverviewPage="${overviewPage}"`,
  });
}

export async function fetchTeams(teamNames: string[]): Promise<LPTeamRaw[]> {
  if (teamNames.length === 0) return [];
  await sleep(300);
  const inClause = teamNames.map((n) => `"${n}"`).join(',');
  return cargoQuery<LPTeamRaw>({
    tables: 'Teams',
    fields: 'Name,Short,Image,Region,IsDisbanded,Location',
    where: `Name IN (${inClause})`,
  });
}

export async function fetchPlayers(playerIds: string[]): Promise<LPPlayerRaw[]> {
  if (playerIds.length === 0) return [];
  await sleep(300);
  const inClause = playerIds.map((id) => `"${id}"`).join(',');
  // PlayerRedirects est requis pour gérer les renames de joueurs
  return cargoQuery<LPPlayerRaw>({
    tables: 'PlayerRedirects=PR,Players=P',
    fields: 'P.ID,P.Name,P.NativeName,P.Country,P.Birthdate,P.Role,P.Team,P.IsRetired,P.Residency',
    joinOn: 'PR.OverviewPage=P.OverviewPage',
    where: `PR.AllName IN (${inClause})`,
  });
}

export async function fetchMatches(overviewPage: string): Promise<LPMatchRaw[]> {
  await sleep(300);
  return cargoQuery<LPMatchRaw>({
    tables: 'MatchSchedule',
    fields: 'Team1,Team2,DateTime_UTC,ShownName,Round,OverviewPage,Winner',
    where: `OverviewPage="${overviewPage}"`,
    orderBy: 'DateTime_UTC ASC',
  });
}

export async function fetchPlayerStats(overviewPage: string): Promise<LPPlayerStatRaw[]> {
  await sleep(300);
  return cargoQuery<LPPlayerStatRaw>({
    tables: 'ScoreboardPlayers=SP,MatchSchedule=MS',
    fields: 'SP.GameId,SP.Link,SP.Champion,SP.Kills,SP.Deaths,SP.Assists,SP.Gold,SP.CS,SP.DamageToChampions,SP.VisionScore,SP.Team,SP.PlayerWin,SP.Role',
    joinOn: 'SP.GameId=MS.GameId',
    where: `MS.OverviewPage="${overviewPage}"`,
    limit: 500,
  });
}
