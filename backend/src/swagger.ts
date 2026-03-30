import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'CSTracker API',
    version: '1.0.0',
    description:
      'API du projet CSTracker — suivi esport League of Legends : profils joueurs (Riot API) + tournois officiels (Leaguepedia).',
  },
  servers: [{ url: '/api', description: 'Serveur principal' }],

  tags: [
    { name: 'Esport', description: 'Données historiques Leaguepedia (sync → DB)' },
    { name: 'Live', description: 'Données live / récentes via LoL Esports API (pas de DB)' },
    { name: 'Riot', description: 'Profils joueurs via Riot API (avec cache)' },
  ],

  components: {
    schemas: {
      EsportTournament: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'LCK/2025 Season/Cup' },
          name: { type: 'string', example: '2025 LCK Cup' },
          league: { type: 'string', example: 'LCK' },
          region: { type: 'string', nullable: true },
          startDate: { type: 'string', nullable: true, example: '2025-01-15' },
          endDate: { type: 'string', nullable: true, example: '2025-02-02' },
          prizepool: { type: 'string', nullable: true, example: '200,000' },
          syncedAt: { type: 'string', format: 'date-time' },
        },
      },
      EsportMatch: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tournamentId: { type: 'string', nullable: true },
          team1: { type: 'string', nullable: true, example: 'T1' },
          team2: { type: 'string', nullable: true, example: 'Gen.G' },
          team1Score: { type: 'integer', nullable: true, example: 3 },
          team2Score: { type: 'integer', nullable: true, example: 1 },
          winner: { type: 'string', nullable: true, example: 'T1' },
          dateTime: { type: 'string', nullable: true },
          round: { type: 'string', nullable: true, example: 'Finals' },
          nMatchInTab: { type: 'integer', nullable: true },
        },
      },
      EsportStanding: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          tournamentId: { type: 'string' },
          teamName: { type: 'string', example: 'T1' },
          teamShort: { type: 'string', nullable: true, example: 'T1' },
          wins: { type: 'integer', example: 8 },
          losses: { type: 'integer', example: 1 },
          rank: { type: 'integer', example: 1 },
          groupName: { type: 'string', nullable: true, example: 'Group A' },
        },
      },
      EsportTeam: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'T1' },
          short: { type: 'string', nullable: true, example: 'T1' },
          image: { type: 'string', nullable: true, description: 'URL du logo' },
          region: { type: 'string', nullable: true, example: 'Korea' },
          location: { type: 'string', nullable: true, example: 'Seoul' },
        },
      },
      EsportPlayer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          lpId: { type: 'string', example: 'Faker (Lee Sang-hyeok)', description: 'Leaguepedia _pageName — identifiant unique' },
          name: { type: 'string', example: 'Faker' },
          nativeName: { type: 'string', nullable: true, example: '이상혁' },
          country: { type: 'string', nullable: true, example: 'South Korea' },
          birthdate: { type: 'string', nullable: true, example: '1996-05-07' },
          role: { type: 'string', nullable: true, example: 'Mid' },
          residency: { type: 'string', nullable: true },
          isRetired: { type: 'boolean' },
          image: { type: 'string', nullable: true, description: 'URL de la photo' },
          teamId: { type: 'string', nullable: true, example: 'T1' },
        },
      },
      EsportRoster: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          tournamentId: { type: 'string' },
          teamId: { type: 'string' },
          playerId: { type: 'string', description: 'Référence EsportPlayer.lpId' },
          role: { type: 'string', nullable: true },
          isStarter: { type: 'boolean' },
        },
      },
      EsportTournamentDetail: {
        allOf: [
          { $ref: '#/components/schemas/EsportTournament' },
          {
            type: 'object',
            properties: {
              matches: { type: 'array', items: { $ref: '#/components/schemas/EsportMatch' } },
              standings: { type: 'array', items: { $ref: '#/components/schemas/EsportStanding' } },
              rosters: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: '#/components/schemas/EsportRoster' },
                    {
                      type: 'object',
                      properties: {
                        player: { $ref: '#/components/schemas/EsportPlayer' },
                        team: { $ref: '#/components/schemas/EsportTeam' },
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      },
      EsportPlayerDetail: {
        allOf: [
          { $ref: '#/components/schemas/EsportPlayer' },
          {
            type: 'object',
            properties: {
              team: { $ref: '#/components/schemas/EsportTeam' },
              rosters: { type: 'array', items: { $ref: '#/components/schemas/EsportRoster' } },
              stats: {
                type: 'array',
                items: { $ref: '#/components/schemas/EsportPlayerStat' },
              },
            },
          },
        ],
      },
      EsportTeamDetail: {
        allOf: [
          { $ref: '#/components/schemas/EsportTeam' },
          {
            type: 'object',
            properties: {
              players: { type: 'array', items: { $ref: '#/components/schemas/EsportPlayer' } },
              rosters: { type: 'array', items: { $ref: '#/components/schemas/EsportRoster' } },
            },
          },
        ],
      },
      EsportPlayerStat: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          matchId: { type: 'string' },
          playerId: { type: 'string' },
          champion: { type: 'string', nullable: true, example: 'Azir' },
          kills: { type: 'integer', nullable: true },
          deaths: { type: 'integer', nullable: true },
          assists: { type: 'integer', nullable: true },
          gold: { type: 'integer', nullable: true },
          cs: { type: 'integer', nullable: true },
          damageToChampions: { type: 'integer', nullable: true },
          visionScore: { type: 'integer', nullable: true },
          team: { type: 'string', nullable: true },
          win: { type: 'boolean', nullable: true },
          role: { type: 'string', nullable: true },
        },
      },
      LolProfile: {
        type: 'object',
        properties: {
          account: {
            type: 'object',
            properties: {
              puuid: { type: 'string' },
              gameName: { type: 'string', example: 'Faker' },
              tagLine: { type: 'string', example: 'KR1' },
            },
          },
          summoner: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              accountId: { type: 'string' },
              puuid: { type: 'string' },
              profileIconId: { type: 'integer' },
              revisionDate: { type: 'integer' },
              summonerLevel: { type: 'integer' },
            },
          },
          rankedInfo: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                queueType: { type: 'string', example: 'RANKED_SOLO_5x5' },
                tier: { type: 'string', example: 'CHALLENGER' },
                rank: { type: 'string', example: 'I' },
                leaguePoints: { type: 'integer' },
                wins: { type: 'integer' },
                losses: { type: 'integer' },
                hotStreak: { type: 'boolean' },
              },
            },
          },
          topChampions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                championId: { type: 'integer' },
                championName: { type: 'string', example: 'Zed' },
                championImageId: { type: 'string' },
                championLevel: { type: 'integer' },
                championPoints: { type: 'integer' },
              },
            },
          },
          ddVersion: { type: 'string', example: '15.1.1' },
          cachedAt: { type: 'string', format: 'date-time' },
        },
      },
      MatchSummary: {
        type: 'object',
        properties: {
          matchId: { type: 'string' },
          queueId: { type: 'integer', example: 420 },
          gameDuration: { type: 'integer', description: 'Durée en secondes' },
          gameStartTimestamp: { type: 'integer' },
          win: { type: 'boolean' },
          championName: { type: 'string', example: 'Zed' },
          kills: { type: 'integer' },
          deaths: { type: 'integer' },
          assists: { type: 'integer' },
          cs: { type: 'integer' },
          goldEarned: { type: 'integer' },
          visionScore: { type: 'integer' },
          items: { type: 'array', items: { type: 'integer' } },
        },
      },
      ChampionLeaderboardEntry: {
        type: 'object',
        properties: {
          rank: { type: 'integer' },
          gameName: { type: 'string' },
          tagLine: { type: 'string' },
          puuid: { type: 'string' },
          championPoints: { type: 'integer' },
          championLevel: { type: 'integer' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },

  paths: {
    // ─── Esport — Sync & Config ───────────────────────────────────────────────
    '/esport/sync': {
      post: {
        tags: ['Esport'],
        summary: 'Synchroniser les données d\'un tournoi',
        description:
          'Fetche les données Leaguepedia (tournois, équipes, joueurs, matchs, stats) et les persiste en base.',
        parameters: [
          {
            name: 'league',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'LCK' },
            description: 'Identifiant de la ligue (ex: LCK, LEC, LCS, LPL, Worlds, MSI)',
          },
          {
            name: 'season',
            in: 'query',
            required: true,
            schema: { type: 'string', example: '2025' },
            description: 'Année de la saison',
          },
        ],
        responses: {
          200: {
            description: 'Sync réussie',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { synced: { type: 'integer', example: 3 } },
                },
              },
            },
          },
          400: { description: 'Paramètres manquants', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          500: { description: 'Erreur serveur', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/esport/league-config': {
      get: {
        tags: ['Esport'],
        summary: 'Configuration des ligues',
        description: 'Retourne les régions, subdivisions, ligues internationales et années de début disponibles dans le sélecteur frontend.',
        responses: {
          200: {
            description: 'Configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    regions: { type: 'array', items: { type: 'string' }, example: ['LCK', 'LEC', 'LCS', 'LPL'] },
                    subdivisions: { type: 'object' },
                    international: { type: 'array', items: { type: 'string' }, example: ['Worlds', 'MSI', 'First Stand'] },
                    startYears: { type: 'object', example: { LCK: 2012, MSI: 2015, 'First Stand': 2025 } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── Esport — Tournois ────────────────────────────────────────────────────
    '/esport/tournaments': {
      get: {
        tags: ['Esport'],
        summary: 'Lister les tournois',
        parameters: [
          { name: 'league', in: 'query', schema: { type: 'string', example: 'LCK' } },
          { name: 'year', in: 'query', schema: { type: 'string', example: '2025' } },
        ],
        responses: {
          200: {
            description: 'Liste de tournois',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/EsportTournament' } },
              },
            },
          },
        },
      },
    },

    '/esport/tournaments/{id}': {
      get: {
        tags: ['Esport'],
        summary: 'Détail d\'un tournoi',
        description: 'Retourne le tournoi avec ses matchs, standings et rosters (joueurs + équipes).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'LCK/2025 Season/Cup' },
            description: 'OverviewPage Leaguepedia — l\'id doit être URL-encodé',
          },
        ],
        responses: {
          200: {
            description: 'Détail du tournoi',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/EsportTournamentDetail' } },
            },
          },
          404: { description: 'Tournoi introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ─── Esport — Joueurs ─────────────────────────────────────────────────────
    '/esport/players': {
      get: {
        tags: ['Esport'],
        summary: 'Rechercher des joueurs',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', example: 'Faker' },
            description: 'Minimum 2 caractères',
          },
        ],
        responses: {
          200: {
            description: 'Résultats de recherche',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/EsportPlayer' } } },
            },
          },
          400: { description: 'Paramètre q manquant ou trop court', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/esport/players/{id}': {
      get: {
        tags: ['Esport'],
        summary: 'Profil d\'un joueur',
        description: 'Retourne le joueur avec son équipe actuelle, ses rosters (historique tournois) et ses stats (50 dernières).',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'Faker (Lee Sang-hyeok)' },
            description: 'lpId du joueur (Leaguepedia _pageName) — URL-encodé',
          },
        ],
        responses: {
          200: {
            description: 'Détail du joueur',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/EsportPlayerDetail' } },
            },
          },
          404: { description: 'Joueur introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ─── Esport — Équipes ─────────────────────────────────────────────────────
    '/esport/teams/{id}': {
      get: {
        tags: ['Esport'],
        summary: 'Profil d\'une équipe',
        description: 'Retourne l\'équipe avec ses joueurs actuels et l\'historique complet des rosters par tournoi.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'T1' },
            description: 'Nom de l\'équipe (Leaguepedia Teams.Name)',
          },
        ],
        responses: {
          200: {
            description: 'Détail de l\'équipe',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/EsportTeamDetail' } },
            },
          },
          404: { description: 'Équipe introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ─── Live — LoL Esports API ───────────────────────────────────────────────
    '/esport/live/leagues': {
      get: {
        tags: ['Live'],
        summary: 'Lister les ligues (LoL Esports)',
        responses: {
          200: { description: 'Liste des ligues disponibles sur l\'API LoL Esports' },
        },
      },
    },

    '/esport/live/schedule': {
      get: {
        tags: ['Live'],
        summary: 'Calendrier des matchs (LoL Esports)',
        parameters: [
          { name: 'league', in: 'query', required: true, schema: { type: 'string', example: 'lck' } },
        ],
        responses: {
          200: { description: 'Calendrier de la ligue' },
          400: { description: 'Paramètre league manquant', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/esport/live/tournaments': {
      get: {
        tags: ['Live'],
        summary: 'Tournois en cours (LoL Esports)',
        parameters: [
          { name: 'league', in: 'query', required: true, schema: { type: 'string', example: 'lck' } },
        ],
        responses: {
          200: { description: 'Tournois actifs de la ligue' },
          400: { description: 'Paramètre league manquant', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/esport/live/standings': {
      get: {
        tags: ['Live'],
        summary: 'Classements live (LoL Esports)',
        parameters: [
          { name: 'tournamentId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Standings du tournoi' },
          400: { description: 'Paramètre tournamentId manquant', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ─── Riot API ─────────────────────────────────────────────────────────────
    '/lol/profile/{gameName}/{tagLine}': {
      get: {
        tags: ['Riot'],
        summary: 'Profil joueur LoL',
        description: 'Retourne le profil complet (compte, summoner, ranked, top champions). Les données sont mises en cache en DB.',
        parameters: [
          { name: 'gameName', in: 'path', required: true, schema: { type: 'string', example: 'Faker' } },
          { name: 'tagLine', in: 'path', required: true, schema: { type: 'string', example: 'KR1' } },
          {
            name: 'platform',
            in: 'query',
            schema: { type: 'string', example: 'euw1', default: 'euw1' },
            description: 'Plateforme Riot (euw1, kr, na1, eun1…)',
          },
        ],
        responses: {
          200: {
            description: 'Profil du joueur',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LolProfile' } } },
          },
          404: { description: 'Joueur introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/lol/matches/{puuid}': {
      get: {
        tags: ['Riot'],
        summary: 'Historique des matchs',
        parameters: [
          { name: 'puuid', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'platform', in: 'query', schema: { type: 'string', example: 'euw1', default: 'euw1' } },
          { name: 'start', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'count', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Liste des matchs récents',
            content: {
              'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MatchSummary' } } },
            },
          },
        },
      },
    },

    '/lol/champion-leaderboard/{championId}': {
      get: {
        tags: ['Riot'],
        summary: 'Classement des meilleurs joueurs d\'un champion',
        parameters: [
          { name: 'championId', in: 'path', required: true, schema: { type: 'integer', example: 238 }, description: 'ID DDragon du champion' },
          { name: 'platform', in: 'query', schema: { type: 'string', example: 'euw1', default: 'euw1' } },
        ],
        responses: {
          200: {
            description: 'Top joueurs par maîtrise',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/ChampionLeaderboardEntry' } },
              },
            },
          },
        },
      },
    },
  },
};

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
  console.log('[Swagger] Documentation disponible sur http://localhost:5000/api/docs');
}
