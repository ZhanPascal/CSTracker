import { useState } from 'react';
import './ProfileSection.css';
import { getLolProfile, getChampionLeaderboard } from '../../services/api';
import type { LolProfile, LeagueEntry, ChampionLeaderboardEntry } from '../../types';

import ironImg        from '../../assets/iron.png';
import bronzeImg      from '../../assets/bronze.webp';
import silverImg      from '../../assets/silver.png';
import goldImg        from '../../assets/gold.webp';
import platinumImg    from '../../assets/platinum.png';
import emeraldImg     from '../../assets/emerald.png';
import diamondImg     from '../../assets/diamond.png';
import masterImg      from '../../assets/master.png';
import grandmasterImg from '../../assets/grandmaster.png';
import challengerImg  from '../../assets/challenger.png';

const TIER_EMBLEMS: Record<string, string> = {
  IRON: ironImg,
  BRONZE: bronzeImg,
  SILVER: silverImg,
  GOLD: goldImg,
  PLATINUM: platinumImg,
  EMERALD: emeraldImg,
  DIAMOND: diamondImg,
  MASTER: masterImg,
  GRANDMASTER: grandmasterImg,
  CHALLENGER: challengerImg,
};

const PLATFORMS = [
  { value: 'euw1', label: 'EUW' },
  { value: 'eun1', label: 'EUNE' },
  { value: 'na1',  label: 'NA' },
  { value: 'kr',   label: 'KR' },
  { value: 'br1',  label: 'BR' },
  { value: 'tr1',  label: 'TR' },
  { value: 'jp1',  label: 'JP' },
];

const QUEUE_LABELS: Record<string, string> = {
  RANKED_SOLO_5x5: 'Classé Solo / Duo',
  RANKED_FLEX_SR:  'Classé Flex',
};

function formatPoints(pts: number): string {
  return pts >= 1000 ? `${(pts / 1000).toFixed(1)}k` : pts.toString();
}

function tierClass(tier: string): string {
  return `tier-${tier.toLowerCase()}`;
}

function tierEmblemUrl(tier: string): string {
  return TIER_EMBLEMS[tier.toUpperCase()] ?? '';
}

function RankCard({ entry }: { entry: LeagueEntry }) {
  const total = entry.wins + entry.losses;
  const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;

  return (
    <div className="rank-card">
      <span className="rank-queue">{QUEUE_LABELS[entry.queueType] ?? entry.queueType}</span>
      <div className="rank-main">
        <img className="rank-emblem" src={tierEmblemUrl(entry.tier)} alt={entry.tier} />
        <div className="rank-details">
          <div className="rank-tier-row">
            <span className={`rank-tier ${tierClass(entry.tier)}`}>{entry.tier}</span>
            <span className="rank-division">{entry.rank}</span>
            <span className="rank-lp">{entry.leaguePoints} PL</span>
          </div>
          <div className="rank-stats">
            <span>{entry.wins}V / {entry.losses}D</span>
            <span className={`rank-wr ${wr >= 50 ? 'good' : 'bad'}`}>{wr}% WR</span>
          </div>
        </div>
      </div>
      <div className="rank-badges">
        {entry.hotStreak  && <span className="rank-badge hot-streak">🔥 Hot Streak</span>}
        {entry.veteran    && <span className="rank-badge veteran">⚔️ Vétéran</span>}
        {entry.freshBlood && <span className="rank-badge fresh-blood">✨ Nouveau</span>}
        {entry.inactive   && <span className="rank-badge inactive">💤 Inactif</span>}
      </div>
    </div>
  );
}

export default function ProfileSection() {
  const [pseudo, setPseudo]   = useState('');
  const [platform, setPlatform] = useState('euw1');
  const [profile, setProfile] = useState<LolProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [leaderboard, setLeaderboard]         = useState<ChampionLeaderboardEntry[] | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = pseudo.trim();
    if (!trimmed) return;

    const hashIndex = trimmed.indexOf('#');
    if (hashIndex === -1) {
      setError('Format attendu : NomJoueur#TAG  (ex: Faker#KR1)');
      return;
    }

    const gameName = trimmed.slice(0, hashIndex);
    const tagLine  = trimmed.slice(hashIndex + 1);

    setLoading(true);
    setError('');
    setProfile(null);

    try {
      const data = await getLolProfile(gameName, tagLine, platform);
      setProfile(data);

      if (data.topChampions.length > 0) {
        fetchLeaderboard(data.topChampions[0].championId, platform);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (championId: number, plt: string) => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    setLeaderboard(null);
    try {
      const data = await getChampionLeaderboard(championId, plt);
      setLeaderboard(data);
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const soloEntry = profile?.rankedInfo.find((e) => e.queueType === 'RANKED_SOLO_5x5');
  const flexEntry = profile?.rankedInfo.find((e) => e.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="profile-page">
      {/* ── Formulaire de recherche ── */}
      <div className="profile-search">
        <h1>Profil LoL</h1>
        <form className="profile-search-row" onSubmit={handleSubmit}>
          <input
            className="profile-input"
            type="text"
            placeholder="NomJoueur#TAG"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            autoComplete="off"
          />
          <select
            className="profile-select"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button className="profile-submit" type="submit" disabled={loading}>
            {loading ? '...' : 'Chercher'}
          </button>
        </form>
        <p className="profile-hint">Exemple : Faker#KR1 · Caps#EUW</p>
      </div>

      {/* ── Erreur ── */}
      {error && <p className="profile-error">{error}</p>}

      {/* ── Chargement ── */}
      {loading && (
        <div className="profile-loading">
          <div className="profile-spinner" />
          <span>Récupération du profil…</span>
        </div>
      )}

      {/* ── Résultat ── */}
      {profile && (
        <div className="profile-result">

          {/* En-tête */}
          <div className="profile-header">
            <img
              className="profile-avatar"
              src={`https://ddragon.leagueoflegends.com/cdn/${profile.ddVersion}/img/profileicon/${profile.summoner.profileIconId}.png`}
              alt="avatar"
            />
            <div className="profile-identity">
              <span className="profile-name">
                {profile.account.gameName}
                <span className="profile-tag"> #{profile.account.tagLine}</span>
              </span>
              <span className="profile-level">Niveau {profile.summoner.summonerLevel}</span>
            </div>
          </div>

          {/* Classements */}
          <div className="profile-ranked">
            {soloEntry ? (
              <RankCard entry={soloEntry} />
            ) : (
              <div className="rank-card">
                <span className="rank-queue">Classé Solo / Duo</span>
                <span className="rank-unranked">Non classé</span>
              </div>
            )}
            {flexEntry ? (
              <RankCard entry={flexEntry} />
            ) : (
              <div className="rank-card">
                <span className="rank-queue">Classé Flex</span>
                <span className="rank-unranked">Non classé</span>
              </div>
            )}
          </div>

          {/* Top champions */}
          {profile.topChampions.length > 0 && (
            <div className="profile-champions">
              <h2>Top Champions</h2>
              <div className="champions-list">
                {profile.topChampions.map((champ) => (
                  <div className="champion-card" key={champ.championId}>
                    <div className="champion-icon-wrapper">
                      <img
                        className="champion-icon"
                        src={`https://ddragon.leagueoflegends.com/cdn/${profile.ddVersion}/img/champion/${champ.championImageId}.png`}
                        alt={champ.championName}
                      />
                      <span className="champion-mastery-level">{champ.championLevel}</span>
                    </div>
                    <span className="champion-name">{champ.championName}</span>
                    <span className="champion-points">{formatPoints(champ.championPoints)} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard champion favori */}
          {profile.topChampions.length > 0 && (
            <div className="profile-leaderboard">
              <div className="leaderboard-header">
                <h2>Top joueurs — {profile.topChampions[0].championName}</h2>
                <button
                  className="leaderboard-refresh"
                  onClick={() => fetchLeaderboard(profile.topChampions[0].championId, platform)}
                  disabled={leaderboardLoading}
                >
                  {leaderboardLoading ? '…' : '↻'}
                </button>
              </div>

              {leaderboardError && (
                <p className="leaderboard-error">{leaderboardError}</p>
              )}

              {leaderboardLoading && (
                <div className="leaderboard-loading">
                  <div className="profile-spinner" />
                </div>
              )}

              {leaderboard && (
                <ol className="leaderboard-list">
                  {leaderboard.map((entry) => (
                    <li key={entry.puuid} className="leaderboard-entry">
                      <span className="lb-rank">#{entry.rank}</span>
                      <span className="lb-name">
                        {entry.gameName}
                        <span className="lb-tag"> #{entry.tagLine}</span>
                      </span>
                      <span className="lb-level">Maîtrise {entry.championLevel}</span>
                      <span className="lb-pts">{formatPoints(entry.championPoints)} pts</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
