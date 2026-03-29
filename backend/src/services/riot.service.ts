import type {
  RiotAccount,
  Summoner,
  LeagueEntry,
  ChampionMastery,
  ChampionMasteryEnriched,
  LolProfile,
  DDragonChampion,
  ChampionLeaderboardEntry,
  MatchSummary,
} from '../types';

interface RiotMatchParticipant {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  win: boolean;
  item0: number; item1: number; item2: number;
  item3: number; item4: number; item5: number; item6: number;
  visionScore: number;
}

interface RiotMatch {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameDuration: number;
    gameStartTimestamp: number;
    participants: RiotMatchParticipant[];
  };
}

const PLATFORM_TO_REGION: Record<string, string> = {
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  jp1: 'asia',
  kr: 'asia',
  oc1: 'sea',
};

async function riotFetch<T>(url: string): Promise<T> {
  const apiKey = process.env.RIOT_API_KEY ?? '';
  const res = await fetch(url, { headers: { 'X-Riot-Token': apiKey } });

  if (!res.ok) {
    if (res.status === 404) throw new Error('Compte introuvable');
    if (res.status === 403) throw new Error('Clé API Riot invalide ou expirée');
    if (res.status === 429) throw new Error('Limite de requêtes Riot atteinte, réessaie dans quelques secondes');
    throw new Error(`Erreur Riot API (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const getLolProfile = async (
  gameName: string,
  tagLine: string,
  platform: string = 'euw1',
): Promise<LolProfile> => {
  const region = PLATFORM_TO_REGION[platform] ?? 'europe';

  // 1. Compte Riot (PUUID)
  const account = await riotFetch<RiotAccount>(
    `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
  );

  // 2. Invocateur (niveau, icône)
  const summoner = await riotFetch<Summoner>(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
  );

  // 3. Classements (Solo/Duo et Flex)
  const rankedInfo = await riotFetch<LeagueEntry[]>(
    `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`,
  );

  // 4. Top 5 maîtrises de champions
  const topChampions = await riotFetch<ChampionMastery[]>(
    `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/top?count=5`,
  );

  // 5. DDragon : version + noms des champions
  const versions = await fetch(
    'https://ddragon.leagueoflegends.com/api/versions.json',
  ).then((r) => r.json()) as string[];
  const ddVersion = versions[0];

  const championJson = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/fr_FR/champion.json`,
  ).then((r) => r.json()) as { data: Record<string, DDragonChampion> };

  const idToChampion: Record<number, { name: string; id: string }> = {};
  Object.values(championJson.data).forEach((champ) => {
    idToChampion[parseInt(champ.key)] = { name: champ.name, id: champ.id };
  });

  const topChampionsEnriched: ChampionMasteryEnriched[] = topChampions.map((m) => ({
    ...m,
    championName: idToChampion[m.championId]?.name ?? 'Inconnu',
    championImageId: idToChampion[m.championId]?.id ?? '',
  }));

  return { account, summoner, rankedInfo, topChampions: topChampionsEnriched, ddVersion };
};

export const getRecentMatches = async (
  puuid: string,
  platform: string = 'euw1',
  count: number = 5,
): Promise<MatchSummary[]> => {
  const region = PLATFORM_TO_REGION[platform] ?? 'europe';

  const matchIds = await riotFetch<string[]>(
    `https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`,
  );

  const matches = await Promise.all(
    matchIds.map((id) =>
      riotFetch<RiotMatch>(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`),
    ),
  );

  return matches.map((match) => {
    const p = match.info.participants.find((x) => x.puuid === puuid)!;
    return {
      matchId: match.metadata.matchId,
      queueId: match.info.queueId,
      gameDuration: match.info.gameDuration,
      gameStartTimestamp: match.info.gameStartTimestamp,
      win: p.win,
      championName: p.championName,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      goldEarned: p.goldEarned,
      visionScore: p.visionScore,
      items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
    };
  });
};

export const getChampionLeaderboard = async (
  championId: number,
  platform: string = 'euw1',
): Promise<ChampionLeaderboardEntry[]> => {
  const region = PLATFORM_TO_REGION[platform] ?? 'europe';

  const masteries = await riotFetch<ChampionMastery[]>(
    `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-champion/${championId}/top?count=10`,
  );

  const entries = await Promise.all(
    masteries.map(async (m, i) => {
      const account = await riotFetch<RiotAccount>(
        `https://${region}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${m.puuid}`,
      );
      return {
        rank: i + 1,
        gameName: account.gameName,
        tagLine: account.tagLine,
        puuid: m.puuid,
        championPoints: m.championPoints,
        championLevel: m.championLevel,
      };
    }),
  );

  return entries;
};
