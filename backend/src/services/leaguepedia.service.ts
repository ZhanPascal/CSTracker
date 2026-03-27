import type {
  LPTournamentRaw,
  LPPlayerRaw,
  LPTeamRaw,
  LPPlayerImageRaw,
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
    throw new Error(`Leaguepedia API error (tables=${params.tables} fields=${params.fields}): ${data.error.info}`);
  }

  // Cargo returns field names with spaces when the internal definition uses spaces
  // (e.g. "DateTime UTC" instead of "DateTime_UTC", "Is Starter" instead of "IsStarter").
  // Normalize by adding both underscore and no-space variants for any key that has spaces.
  return data.cargoquery.map((item) => {
    const raw = item.title as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      normalized[key] = val;
      if (key.includes(' ')) {
        normalized[key.replace(/ /g, '_')] = val;  // "DateTime UTC" → "DateTime_UTC"
        normalized[key.replace(/ /g, '')] = val;    // "Is Starter"  → "IsStarter"
      }
    }
    return normalized as T;
  });
}

// Certaines ligues stockent dans Tournaments.League un nom différent de leur League_Short.
// Ex: "Worlds" → T.League = "World Championship"
// Ex: "First Stand" → pas d'entrée dans Leagues → JOIN échoue, on cherche T.League directement
const LEAGUE_FULL_NAME_MAP: Record<string, string> = {
  'Worlds': 'World Championship',
};

export async function fetchTournaments(leagueShort: string, season: string): Promise<LPTournamentRaw[]> {
  const dateFilter = `T.DateStart >= "${season}-01-01" AND T.DateStart <= "${season}-12-31"`;
  const fields = 'T.Name=Name,T.OverviewPage=OverviewPage,T.DateStart=DateStart,T.Date=Date,T.League=League,T.Region=Region,T.Prizepool=Prizepool';

  await sleep(300);
  // Approche 1 : JOIN Leagues pour les ligues régionales (LCK, LPL, LEC, LCS…)
  const joinResults = await cargoQuery<LPTournamentRaw>({
    tables: 'Tournaments=T,Leagues=L',
    fields,
    joinOn: 'T.League=L.League',
    where: `L.League_Short="${leagueShort}" AND ${dateFilter}`,
    orderBy: 'T.DateStart DESC',
  });

  if (joinResults.length > 0) {
    console.log(`[Leaguepedia] fetchTournaments(${leagueShort}, ${season}) → ${joinResults.length} résultats (JOIN)`);
    return joinResults;
  }

  // Approche 2 : fallback direct T.League (ligues sans entrée Leagues ou League_Short différent)
  await sleep(300);
  const directName = LEAGUE_FULL_NAME_MAP[leagueShort] ?? leagueShort;
  const directResults = await cargoQuery<LPTournamentRaw>({
    tables: 'Tournaments=T',
    fields,
    where: `T.League="${directName}" AND ${dateFilter}`,
    orderBy: 'T.DateStart DESC',
  });

  console.log(`[Leaguepedia] fetchTournaments(${leagueShort}, ${season}) → ${directResults.length} résultats (fallback T.League="${directName}")`);
  return directResults;
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

// TournamentRosters stores one row per team.
// RosterLinks / Roles / Flags are \n-separated lists of per-player values.
interface LPRosterTableRow {
  Team: string;
  OverviewPage: string;
  RosterLinks: string;
  Roles: string;
  Flags: string;
}

export async function fetchRosters(overviewPage: string): Promise<LPRosterRaw[]> {
  await sleep(300);
  const rows = await cargoQuery<LPRosterTableRow>({
    tables: 'TournamentRosters',
    fields: 'Team,OverviewPage,RosterLinks,Roles,Flags',
    where: `OverviewPage="${overviewPage}"`,
  });

  const result: LPRosterRaw[] = [];
  for (const row of rows) {
    const players = splitRosterField(row.RosterLinks);
    const roles   = splitRosterField(row.Roles);
    const flags   = splitRosterField(row.Flags);

    for (let i = 0; i < players.length; i++) {
      const raw = players[i];
      if (!raw) continue;
      // Format: "IngameName (Real Name)" or just "IngameName"
      // Keep the full raw value as the player ID to disambiguate players with the same ingame name
      // (e.g. "Doran (Choi Hyeon-joon)" vs "Doran (Brazilian Name)").
      // The parenthetical is stripped only for display in the frontend.
      const ingameName = raw.replace(/\s*\(.*\)$/, '').trim();
      if (!ingameName) continue;
      result.push({
        Team: row.Team,
        OverviewPage: row.OverviewPage,
        Player: raw,  // full raw value used as DB id
        RosterRole: roles[i] ?? null,
        Flag: flags[i] ?? null,
      });
    }
  }
  return result;
}

function splitRosterField(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(';;').map((s) => s.trim()).filter(Boolean);
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

// Fallback renames : "OKSavingsBank BRION" → "HANJIN BRION", "DN Freecs" → "DN SOOPers"
// Utilise la table TeamRenames de Leaguepedia (OriginalName → NewName)
export async function fetchTeamRenames(originalNames: string[]): Promise<{ OriginalName: string; NewName: string }[]> {
  if (originalNames.length === 0) return [];
  await sleep(300);
  const inClause = originalNames.map((n) => `"${n}"`).join(',');
  return cargoQuery<{ OriginalName: string; NewName: string }>({
    tables: 'TeamRenames',
    fields: 'OriginalName,NewName',
    where: `OriginalName IN (${inClause})`,
    orderBy: 'Date ASC',
  });
}

export async function fetchPlayerImages(playerIds: string[]): Promise<LPPlayerImageRaw[]> {
  if (playerIds.length === 0) return [];
  // Batch to avoid hitting the 500-result limit (e.g. 60 players × ~10 images = 600 > 500)
  const BATCH_SIZE = 10;
  const results: LPPlayerImageRaw[] = [];
  for (let i = 0; i < playerIds.length; i += BATCH_SIZE) {
    const batch = playerIds.slice(i, i + BATCH_SIZE);
    await sleep(300);
    const inClause = batch.map((id) => `"${id}"`).join(',');
    const batchResults = await cargoQuery<LPPlayerImageRaw>({
      tables: 'PlayerImages',
      fields: 'Link,FileName',
      where: `Link IN (${inClause})`,
    });
    results.push(...batchResults);
  }
  return results;
}

export async function fetchPlayers(playerIds: string[]): Promise<LPPlayerRaw[]> {
  if (playerIds.length === 0) return [];
  await sleep(300);
  const inClause = playerIds.map((id) => `"${id}"`).join(',');
  return cargoQuery<LPPlayerRaw>({
    tables: 'Players',
    fields: '_pageName=LPPageId,ID,Name,NativeName,Country,Birthdate,Role,Team,IsRetired,Residency',
    where: `ID IN (${inClause})`,
  });
}

export async function fetchMatches(overviewPage: string): Promise<LPMatchRaw[]> {
  await sleep(300);
  return cargoQuery<LPMatchRaw>({
    tables: 'MatchSchedule',
    fields: 'Team1,Team2,Team1Score,Team2Score,DateTime_UTC,Round,OverviewPage,Winner',
    where: `OverviewPage="${overviewPage}"`,
    orderBy: 'DateTime_UTC ASC',
  });
}

export async function fetchTournamentResults(overviewPage: string): Promise<{ Team: string; Place_Number: string; TotalPrize: string; PrizeUnit: string }[]> {
  await sleep(300);
  return cargoQuery<{ Team: string; Place_Number: string; TotalPrize: string; PrizeUnit: string }>({
    tables: 'TournamentResults',
    fields: 'Team,Place_Number,TotalPrize,PrizeUnit',
    where: `OverviewPage="${overviewPage}"`,
    orderBy: 'Place_Number ASC',
  });
}

export async function fetchPlayerStats(overviewPage: string): Promise<LPPlayerStatRaw[]> {
  await sleep(300);
  return cargoQuery<LPPlayerStatRaw>({
    tables: 'ScoreboardPlayers=SP,ScoreboardGames=SG',
    fields: 'SP.GameId,SP.Link,SP.Champion,SP.Kills,SP.Deaths,SP.Assists,SP.Gold,SP.CS,SP.DamageToChampions,SP.VisionScore,SP.Team,SP.PlayerWin,SP.Role=PlayerRole',
    joinOn: 'SP.GameId=SG.GameId',
    where: `SG.OverviewPage="${overviewPage}"`,
    limit: 500,
  });
}
