import { PrismaClient } from '@prisma/client';
import type {
  EsportTournament,
  EsportTeam,
  EsportPlayer,
  EsportMatch,
  EsportStanding,
  EsportRoster,
  EsportPlayerStat,
} from '../types/index.js';
import {
  fetchTournaments,
  fetchRosters,
  fetchTeams,
  fetchTeamRenames,
  fetchPlayers,
  fetchPlayerImages,
  fetchMatches,
  fetchPlayerStats,
  fetchTournamentResults,
} from './leaguepedia.service.js';

const prisma = new PrismaClient();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Strip "(Real Name)" disambiguation from raw roster IDs to get the Leaguepedia Players.ID
const stripPlayerName = (raw: string) => raw.replace(/\s*\(.*\)$/, '').trim();

export const REGIONS = ['LEC', 'LCS', 'LCK', 'LPL'] as const;

export const REGION_SUBDIVISIONS: Record<string, string> = {
  LEC: 'EMEA Masters',
  LCS: 'LCS Challengers',
  LCK: 'LCK Challengers',
  LPL: 'LDL',
};

export const INTERNATIONAL_EVENTS = ['MSI', 'Worlds', 'First Stand'] as const;

export const LEAGUE_START_YEARS: Record<string, number> = {
  LEC: 2013,
  LCS: 2013,
  LCK: 2012,
  LPL: 2013,
  'EMEA Masters': 2016,
  'LCS Challengers': 2013,
  'LCK Challengers': 2013,
  LDL: 2013,
  MSI: 2015,
  Worlds: 2011,
  'First Stand': 2025,
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

export async function syncTournament(league: string, season: string): Promise<{ synced: number }> {
  const rawTournaments = await fetchTournaments(league, season);
  if (rawTournaments.length === 0) return { synced: 0 };

  for (const t of rawTournaments) {
    // Upsert tournament — on stocke le nom d'affichage (ex: "LEC") pas le nom Leaguepedia
    await prisma.esportTournament.upsert({
      where: { id: t.OverviewPage },
      update: { name: t.Name, league: league, region: t.Region || null, startDate: t.DateStart || null, endDate: t.Date || null, prizepool: t.Prizepool || null, syncedAt: new Date() },
      create: { id: t.OverviewPage, name: t.Name, league: league, region: t.Region || null, startDate: t.DateStart || null, endDate: t.Date || null, prizepool: t.Prizepool || null },
    });

    await sleep(300);

    // Fetch & upsert rosters
    const rosters = await fetchRosters(t.OverviewPage);
    const teamNames = [...new Set(rosters.map((r) => r.Team).filter(Boolean))];
    const playerIds = [...new Set(rosters.map((r) => r.Player).filter(Boolean))];

    // Fetch teams (avec fallback Teamnames pour les noms qui ne matchent pas directement)
    if (teamNames.length > 0) {
      const rawTeams = await fetchTeams(teamNames);
      const toImageUrl = (img: string) => `https://lol.fandom.com/wiki/Special:FilePath/${img.replace(/ /g, '_')}`;
      for (const team of rawTeams) {
        await prisma.esportTeam.upsert({
          where: { id: team.Name },
          update: { short: team.Short || null, image: team.Image ? toImageUrl(team.Image) : null, region: team.Region || null, location: team.Location || null, syncedAt: new Date() },
          create: { id: team.Name, short: team.Short || null, image: team.Image ? toImageUrl(team.Image) : null, region: team.Region || null, location: team.Location || null },
        });
      }
      // Create any teams not returned by the API (use name only)
      for (const name of teamNames) {
        await prisma.esportTeam.upsert({
          where: { id: name },
          update: {},
          create: { id: name },
        });
      }
      // Fallback renames via TeamRenames : suit la chaîne complète
      // ex: "BRION" → "OKSavingsBank BRION" → "HANJIN BRION"
      const foundNames = new Set(rawTeams.filter((t) => t.Image).map((t) => t.Name));
      const teamsWithoutLogo = teamNames.filter((n) => !foundNames.has(n));
      if (teamsWithoutLogo.length > 0) {
        // currentMap : originalName → nom courant (avance à chaque étape)
        const currentMap = new Map<string, string>(teamsWithoutLogo.map((n) => [n, n]));
        const MAX_DEPTH = 6;
        for (let depth = 0; depth < MAX_DEPTH; depth++) {
          const latestNames = [...new Set(currentMap.values())];
          const renames = await fetchTeamRenames(latestNames);
          if (renames.length === 0) break;
          // Date ASC → last entry per OriginalName est le plus récent
          const step = new Map(renames.filter((r) => r.OriginalName && r.NewName).map((r) => [r.OriginalName, r.NewName]));
          let changed = false;
          for (const [orig, latest] of currentMap) {
            const next = step.get(latest);
            if (next && next !== latest) { currentMap.set(orig, next); changed = true; }
          }
          if (!changed) break;
        }
        // Fetch logos pour les noms finaux résolus
        const resolved = [...currentMap.entries()].filter(([orig, final]) => orig !== final);
        if (resolved.length > 0) {
          const finalNames = [...new Set(resolved.map(([, final]) => final))];
          const renamedTeams = await fetchTeams(finalNames);
          for (const team of renamedTeams) {
            if (!team.Image) continue;
            for (const [orig, final] of resolved) {
              if (final === team.Name) {
                await prisma.esportTeam.update({
                  where: { id: orig },
                  data: { image: toImageUrl(team.Image), short: team.Short || null, region: team.Region || null, location: team.Location || null },
                });
              }
            }
          }
        }
      }
    }

    await sleep(300);

    // Fetch players
    // Maps built during player sync, used for roster & stats insertion
    const rosterKeyToLpId = new Map<string, string>(); // "team:rawRosterEntry" → lpId
    const statKeyToLpId = new Map<string, string>();   // "strippedName:team" → lpId
    if (playerIds.length > 0) {
      // Build a map: stripped LP name → list of full raw roster ids
      const strippedToFull = new Map<string, string[]>();
      for (const id of playerIds) {
        const stripped = stripPlayerName(id);
        (strippedToFull.get(stripped) ?? strippedToFull.set(stripped, []).get(stripped)!).push(id);
      }
      const lpIds = [...strippedToFull.keys()];

      const rawPlayers = await fetchPlayers(lpIds);

      // Detect collisions: multiple LP players sharing the same ingame name
      const lpByIngameName = new Map<string, typeof rawPlayers>();
      for (const p of rawPlayers) {
        (lpByIngameName.get(p.ID) ?? lpByIngameName.set(p.ID, []).get(p.ID)!).push(p);
      }

      for (const p of rawPlayers) {
        // Collision → use _pageName (unique wiki identifier); otherwise use raw roster string
        const lpId = p.LPPageId || strippedToFull.get(p.ID)?.[0] || p.ID;
        const teamId = p.Team && p.Team.trim() ? p.Team.trim() : null;
        if (teamId) {
          await prisma.esportTeam.upsert({ where: { id: teamId }, update: {}, create: { id: teamId } });
        }
        await prisma.esportPlayer.upsert({
          where: { lpId },
          update: { name: p.Name, nativeName: p.NativeName || null, country: p.Country || null, birthdate: p.Birthdate || null, role: p.Role || null, residency: p.Residency || null, isRetired: p.IsRetired === '1', teamId, syncedAt: new Date() },
          create: { lpId, name: p.Name, nativeName: p.NativeName || null, country: p.Country || null, birthdate: p.Birthdate || null, role: p.Role || null, residency: p.Residency || null, isRetired: p.IsRetired === '1', teamId },
        });

        const collision = (lpByIngameName.get(p.ID)?.length ?? 0) > 1;
        if (collision) {
          // Match by team to assign the correct lpId to each roster entry
          for (const r of rosters) {
            if (stripPlayerName(r.Player) === p.ID && r.Team === p.Team) {
              rosterKeyToLpId.set(`${r.Team}:${r.Player}`, lpId);
            }
          }
        } else {
          for (const fullId of strippedToFull.get(p.ID) ?? []) {
            for (const r of rosters) {
              if (r.Player === fullId) rosterKeyToLpId.set(`${r.Team}:${r.Player}`, lpId);
            }
          }
        }
      }

      // Stubs for players not found in LP
      for (const id of playerIds) {
        await prisma.esportPlayer.upsert({ where: { lpId: id }, update: {}, create: { lpId: id, name: stripPlayerName(id) } });
        for (const r of rosters) {
          if (r.Player === id && !rosterKeyToLpId.has(`${r.Team}:${r.Player}`)) {
            rosterKeyToLpId.set(`${r.Team}:${r.Player}`, id);
          }
        }
      }

      // Fetch player images — PlayerImages.Link = _pageName = lpId (ex: "Doran (Choi Hyeon-joon)")
      // Multiple photos per player: results appear in chronological order, last one is most recent
      const uniqueLpIds = [...new Set(rosterKeyToLpId.values())];
      const rawImages = await fetchPlayerImages(uniqueLpIds);
      for (const img of rawImages) {
        if (!img.Link || !img.FileName) continue;
        const imageUrl = `https://lol.fandom.com/wiki/Special:FilePath/${img.FileName.replace(/ /g, '_')}`;
        await prisma.esportPlayer.updateMany({ where: { lpId: { equals: img.Link, mode: 'insensitive' } }, data: { image: imageUrl } });
      }

      // Build statKeyToLpId: "strippedName:team" → lpId
      for (const [key, lpId] of rosterKeyToLpId) {
        const i = key.indexOf(':');
        statKeyToLpId.set(`${stripPlayerName(key.slice(i + 1))}:${key.slice(0, i)}`, lpId);
      }
    }

    // Delete old rosters for this tournament and re-insert
    await prisma.esportRoster.deleteMany({ where: { tournamentId: t.OverviewPage } });
    for (const r of rosters) {
      if (!r.Team || !r.Player) continue;
      const playerId = rosterKeyToLpId.get(`${r.Team}:${r.Player}`) ?? r.Player;
      await prisma.esportRoster.create({
        data: {
          tournamentId: t.OverviewPage,
          teamId: r.Team,
          playerId,
          role: r.RosterRole || null,
          isStarter: true,
        },
      });
    }

    await sleep(300);

    // Fetch & upsert matches
    const rawMatches = await fetchMatches(t.OverviewPage);
    const winCounts: Record<string, { wins: number; losses: number }> = {};

    for (const m of rawMatches) {
      // Build a stable ID from OverviewPage + teams + dateTime
      const matchId = `${t.OverviewPage}__${m.Team1}__${m.Team2}__${m.DateTime_UTC}`;
      await prisma.esportMatch.upsert({
        where: { id: matchId },
        update: { team1: m.Team1 || null, team2: m.Team2 || null, team1Score: m.Team1Score ? parseInt(m.Team1Score) : null, team2Score: m.Team2Score ? parseInt(m.Team2Score) : null, winner: m.Winner || null, dateTime: m.DateTime_UTC || null, round: m.Round || null, syncedAt: new Date() },
        create: { id: matchId, tournamentId: t.OverviewPage, team1: m.Team1 || null, team2: m.Team2 || null, team1Score: m.Team1Score ? parseInt(m.Team1Score) : null, team2Score: m.Team2Score ? parseInt(m.Team2Score) : null, winner: m.Winner || null, dateTime: m.DateTime_UTC || null, round: m.Round || null },
      });

      // Accumulate W/L for standings
      // MatchSchedule.Winner is "1" or "2" (team slot), not the team name
      if (m.Team1) winCounts[m.Team1] ??= { wins: 0, losses: 0 };
      if (m.Team2) winCounts[m.Team2] ??= { wins: 0, losses: 0 };
      if (m.Winner === '1' && m.Team1) {
        winCounts[m.Team1].wins++;
        if (m.Team2) winCounts[m.Team2].losses++;
      } else if (m.Winner === '2' && m.Team2) {
        winCounts[m.Team2].wins++;
        if (m.Team1) winCounts[m.Team1].losses++;
      }
    }

    // Rebuild standings — official placements first, W/L fallback
    await prisma.esportStanding.deleteMany({ where: { tournamentId: t.OverviewPage } });
    let officialResults: { Team: string; Place_Number: string; TotalPrize: string; PrizeUnit: string }[] = [];
    try { officialResults = await fetchTournamentResults(t.OverviewPage); } catch { /* table absente */ }

    if (officialResults.length > 0) {
      // Mettre à jour le prizepool depuis TournamentResults si disponible
      const firstWithPrize = officialResults.find((r) => r.TotalPrize);
      if (firstWithPrize?.TotalPrize) {
        const prizepool = firstWithPrize.PrizeUnit
          ? `${parseInt(firstWithPrize.TotalPrize).toLocaleString('en-US')} ${firstWithPrize.PrizeUnit}`
          : parseInt(firstWithPrize.TotalPrize).toLocaleString('en-US');
        await prisma.esportTournament.update({
          where: { id: t.OverviewPage },
          data: { prizepool },
        });
      }
      for (const r of officialResults) {
        if (!r.Team) continue;
        const rank = parseInt(r.Place_Number) || 999;
        const record = winCounts[r.Team] ?? { wins: 0, losses: 0 };
        await prisma.esportStanding.create({
          data: { tournamentId: t.OverviewPage, teamName: r.Team, wins: record.wins, losses: record.losses, rank },
        });
      }
    } else {
      const sorted = Object.entries(winCounts).sort((a, b) => b[1].wins - a[1].wins || a[1].losses - b[1].losses);
      for (let i = 0; i < sorted.length; i++) {
        const [teamName, record] = sorted[i];
        await prisma.esportStanding.create({
          data: { tournamentId: t.OverviewPage, teamName, wins: record.wins, losses: record.losses, rank: i + 1 },
        });
      }
    }

    await sleep(300);

    // Fetch player stats per game
    const rawStats = await fetchPlayerStats(t.OverviewPage);
    await prisma.esportPlayerStat.deleteMany({
      where: { match: { tournamentId: t.OverviewPage } },
    });
    for (const s of rawStats) {
      if (!s.GameId || !s.Link) continue;
      // Ensure match exists (ScoreboardPlayers uses a different GameId format)
      const matchId = `${t.OverviewPage}__${s.GameId}`;
      await prisma.esportMatch.upsert({
        where: { id: matchId },
        update: {},
        create: { id: matchId, tournamentId: t.OverviewPage },
      });
      const statPlayerId = statKeyToLpId.get(`${s.Link}:${s.Team}`) ?? s.Link;
      await prisma.esportPlayer.upsert({ where: { lpId: statPlayerId }, update: {}, create: { lpId: statPlayerId, name: s.Link } });

      await prisma.esportPlayerStat.create({
        data: {
          matchId,
          playerId: statPlayerId,
          champion: s.Champion || null,
          kills: s.Kills ? parseInt(s.Kills) : null,
          deaths: s.Deaths ? parseInt(s.Deaths) : null,
          assists: s.Assists ? parseInt(s.Assists) : null,
          gold: s.Gold ? parseInt(s.Gold) : null,
          cs: s.CS ? parseInt(s.CS) : null,
          damageToChampions: s.DamageToChampions ? parseInt(s.DamageToChampions) : null,
          visionScore: s.VisionScore ? parseInt(s.VisionScore) : null,
          team: s.Team || null,
          win: s.PlayerWin === 'Yes' ? true : s.PlayerWin === 'No' ? false : null,
          role: s.PlayerRole || null,
        },
      });
    }
  }

  return { synced: rawTournaments.length };
}

// ─── Sync automatique des tournois en cours ───────────────────────────────────

export async function syncActiveTournaments(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const active = await prisma.esportTournament.findMany({
    where: {
      startDate: { lte: today },
      OR: [
        { endDate: { gte: today } },
        { endDate: null },
      ],
    },
    select: { league: true, startDate: true },
  });

  if (active.length === 0) {
    console.log('[Esport] Aucun tournoi actif à synchroniser');
    return;
  }

  // Dédoublonner par league + année
  const pairs = [...new Map(
    active
      .filter((t) => t.startDate)
      .map((t) => {
        const year = t.startDate!.slice(0, 4);
        return [`${t.league}:${year}`, { league: t.league, year }];
      })
  ).values()];

  console.log(`[Esport] Sync automatique — ${pairs.length} league(s) active(s)`);
  for (const { league, year } of pairs) {
    console.log(`[Esport] Sync ${league} ${year}...`);
    await syncTournament(league, year).catch((err) =>
      console.error(`[Esport] Erreur sync ${league} ${year}:`, err)
    );
  }
}

// ─── DB reads ─────────────────────────────────────────────────────────────────

export async function getTournaments(league?: string, year?: string): Promise<EsportTournament[]> {
  return prisma.esportTournament.findMany({
    where: {
      ...(league ? { league } : {}),
      ...(year ? { startDate: { startsWith: year } } : {}),
    },
    orderBy: [{ startDate: 'desc' }],
  }) as Promise<EsportTournament[]>;
}

export async function getTournamentDetail(id: string) {
  return prisma.esportTournament.findUniqueOrThrow({
    where: { id },
    include: {
      matches: { where: { team1: { not: null }, team2: { not: null } }, orderBy: { dateTime: 'desc' } },
      standings: { orderBy: { rank: 'asc' } },
      rosters: {
        include: { player: true, team: true },
        orderBy: { teamId: 'asc' },
      },
    },
  });
}

export async function searchPlayers(query: string): Promise<EsportPlayer[]> {
  return prisma.esportPlayer.findMany({
    where: {
      OR: [
        { lpId: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { lpId: 'asc' },
  }) as Promise<EsportPlayer[]>;
}

export async function getPlayerDetail(id: string) {
  return prisma.esportPlayer.findUniqueOrThrow({
    where: { lpId: id },
    include: {
      team: true,
      rosters: {
        include: { tournament: true, team: true },
        orderBy: { id: 'desc' },
        take: 20,
      },
      stats: {
        include: { match: true },
        orderBy: { id: 'desc' },
        take: 50,
      },
    },
  });
}

export async function getTeamDetail(id: string) {
  return prisma.esportTeam.findUniqueOrThrow({
    where: { id },
    include: {
      players: { orderBy: { role: 'asc' } },
      rosters: {
        include: { tournament: true, player: true },
        orderBy: { id: 'desc' },
      },
    },
  });
}
