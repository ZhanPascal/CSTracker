import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../services/riot.service', () => ({
  getLolProfile: vi.fn(),
  getRecentMatches: vi.fn(),
  getChampionLeaderboard: vi.fn(),
}));

import riotRoutes from '../routes/riot.routes';
import { getLolProfile, getRecentMatches, getChampionLeaderboard } from '../services/riot.service';

const app = express();
app.use(express.json());
app.use('/api/lol', riotRoutes);

const mockProfile = {
  account: { puuid: 'abc123', gameName: 'Faker', tagLine: 'KR1' },
  summoner: { id: 'x', accountId: 'y', puuid: 'abc123', profileIconId: 1, revisionDate: 0, summonerLevel: 300 },
  rankedInfo: [
    { queueType: 'RANKED_SOLO_5x5', tier: 'CHALLENGER', rank: 'I', leaguePoints: 1500, wins: 200, losses: 50, hotStreak: true, veteran: true, freshBlood: false, inactive: false, leagueId: 'l1', summonerId: 's1' },
  ],
  topChampions: [
    { championId: 103, championName: 'Ahri', championImageId: 'Ahri', championLevel: 10, championPoints: 500000, lastPlayTime: 0, chestGranted: false, tokensEarned: 0, puuid: 'abc123' },
  ],
  ddVersion: '15.1.1',
};

const mockMatches = [
  { matchId: 'KR_1', queueId: 420, win: true, championName: 'Ahri', kills: 10, deaths: 1, assists: 5, cs: 200, gameDuration: 1800, gameStartTimestamp: Date.now() - 3600000, goldEarned: 15000, visionScore: 40, items: [3157, 3165, 3135, 3089, 3040, 3102, 3364] },
  { matchId: 'KR_2', queueId: 420, win: false, championName: 'Zoe', kills: 3, deaths: 5, assists: 2, cs: 150, gameDuration: 2100, gameStartTimestamp: Date.now() - 7200000, goldEarned: 10000, visionScore: 25, items: [0, 0, 0, 0, 0, 0, 0] },
];

describe('GET /api/lol/profile/:gameName/:tagLine', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne 200 avec le profil du joueur', async () => {
    (getLolProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);

    const res = await request(app).get('/api/lol/profile/Faker/KR1?platform=kr');

    expect(res.status).toBe(200);
    expect(res.body.account.gameName).toBe('Faker');
    expect(res.body.summoner.summonerLevel).toBe(300);
    expect(res.body.rankedInfo).toHaveLength(1);
  });

  it('appelle le service avec les bons paramètres', async () => {
    (getLolProfile as ReturnType<typeof vi.fn>).mockResolvedValue(mockProfile);

    await request(app).get('/api/lol/profile/Caps/EUW?platform=euw1');

    expect(getLolProfile).toHaveBeenCalledWith('Caps', 'EUW', 'euw1');
  });

  it('retourne 500 si le compte est introuvable', async () => {
    (getLolProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Compte introuvable'));

    const res = await request(app).get('/api/lol/profile/Inconnu/TAG');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Compte introuvable');
  });

  it('retourne 500 si la clé API est invalide', async () => {
    (getLolProfile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Clé API Riot invalide ou expirée'));

    const res = await request(app).get('/api/lol/profile/Test/EUW');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Clé API');
  });
});

describe('GET /api/lol/matches/:puuid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne 200 avec un tableau de parties', async () => {
    (getRecentMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatches);

    const res = await request(app).get('/api/lol/matches/abc123?platform=kr');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('retourne les bonnes données de la première partie', async () => {
    (getRecentMatches as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatches);

    const res = await request(app).get('/api/lol/matches/abc123');

    expect(res.body[0].championName).toBe('Ahri');
    expect(res.body[0].win).toBe(true);
    expect(res.body[0].kills).toBe(10);
    expect(res.body[0].items).toHaveLength(7);
  });

  it('retourne 500 si la limite de requêtes est atteinte', async () => {
    (getRecentMatches as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Limite de requêtes Riot atteinte, réessaie dans quelques secondes'));

    const res = await request(app).get('/api/lol/matches/badpuuid');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Limite de requêtes');
  });
});

describe('GET /api/lol/champion-leaderboard/:championId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retourne 200 avec le leaderboard', async () => {
    const mockLeaderboard = [
      { rank: 1, gameName: 'Player1', tagLine: 'EUW', puuid: 'p1', championPoints: 2000000, championLevel: 10 },
      { rank: 2, gameName: 'Player2', tagLine: 'EUW', puuid: 'p2', championPoints: 1800000, championLevel: 10 },
    ];
    (getChampionLeaderboard as ReturnType<typeof vi.fn>).mockResolvedValue(mockLeaderboard);

    const res = await request(app).get('/api/lol/champion-leaderboard/103?platform=euw1');

    expect(res.status).toBe(200);
    expect(res.body[0].rank).toBe(1);
    expect(res.body[0].gameName).toBe('Player1');
  });

  it('retourne 500 en cas d\'erreur', async () => {
    (getChampionLeaderboard as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Erreur Riot API (500)'));

    const res = await request(app).get('/api/lol/champion-leaderboard/103');

    expect(res.status).toBe(500);
  });
});
