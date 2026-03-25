import { useState, useEffect } from 'react';
import {
  syncEsportData,
  getEsportLeagueConfig,
  getEsportTournaments,
  getEsportTournament,
  searchEsportPlayers,
  getEsportPlayer,
  getEsportTeam,
} from '../../services/api';
import type {
  EsportLeagueConfig,
  EsportTournament,
  EsportTournamentDetail,
  EsportMatch,
  EsportPlayer,
  EsportPlayerDetail,
  EsportTeamDetail,
  EsportRoster,
} from '../../types';
import './TournamentSection.css';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncPanel({
  config,
  defaultLeague,
  defaultYear,
  onSynced,
}: {
  config: EsportLeagueConfig | null;
  defaultLeague: string;
  defaultYear: string;
  onSynced: () => void;
}) {
  const [league, setLeague] = useState(defaultLeague);
  const [season, setSeason] = useState(defaultYear);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sync league/season with parent navigation
  useEffect(() => { setLeague(defaultLeague); }, [defaultLeague]);
  useEffect(() => { setSeason(defaultYear); }, [defaultYear]);

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    setError('');
    try {
      const result = await syncEsportData(league, season);
      setMessage(result.message);
      onSynced();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSyncing(false);
    }
  };

  const allLeagues = config
    ? [
        ...config.regions,
        ...Object.values(config.subdivisions),
        ...config.international,
      ]
    : [defaultLeague];

  return (
    <div className="sync-panel">
      <select
        className="sync-input sync-select"
        value={league}
        onChange={(e) => setLeague(e.target.value)}
      >
        {allLeagues.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <input
        className="sync-input"
        value={season}
        onChange={(e) => setSeason(e.target.value)}
        placeholder="Saison (ex: 2025)"
        style={{ width: 72 }}
      />
      <button className="sync-btn" onClick={handleSync} disabled={syncing}>
        {syncing ? <span className="sync-spinner" /> : 'Sync'}
      </button>
      {message && <span className="sync-message">{message}</span>}
      {error && <span className="sync-error">{error}</span>}
    </div>
  );
}


function TournamentCard({
  tournament,
  onClick,
}: {
  tournament: EsportTournament;
  onClick: () => void;
}) {
  return (
    <div className="tournament-card" onClick={onClick}>
      <div className="tc-league">{tournament.league}</div>
      <div className="tc-name">{tournament.name}</div>
      <div className="tc-dates">
        {tournament.startDate ?? '?'} → {tournament.endDate ?? '?'}
      </div>
      {tournament.region && <div className="tc-region">{tournament.region}</div>}
      {tournament.prizepool && (
        <div className="tc-prize">{tournament.prizepool}</div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  return <span className={`role-badge role-${role.toLowerCase()}`}>{role}</span>;
}

function PlayerChip({
  name,
  role,
  onClick,
}: {
  name: string;
  role: string | null;
  onClick: () => void;
}) {
  return (
    <div className="player-chip" onClick={onClick}>
      <span className="pc-name">{name}</span>
      <RoleBadge role={role} />
    </div>
  );
}

const BRACKET_ROUNDS = ['final', 'finals', 'semifinal', 'semifinals', 'quarterfinal', 'quarterfinals', 'round of 16', 'round of 8', 'round of 4', 'upper bracket', 'lower bracket', 'grand final', 'losers', 'winners'];

function isBracketRound(round: string): boolean {
  const lower = round.toLowerCase();
  return BRACKET_ROUNDS.some((kw) => lower.includes(kw));
}

function detectStageType(matches: EsportMatch[]): 'bracket' | 'group' | 'mixed' {
  if (matches.length === 0) return 'group';
  const rounds = [...new Set(matches.map((m) => m.round).filter(Boolean))] as string[];
  const bracketCount = rounds.filter(isBracketRound).length;
  if (bracketCount === 0) return 'group';
  if (bracketCount === rounds.length) return 'bracket';
  return 'mixed';
}

function TeamLogo({ image, name, size = 'xs' }: { image: string | null | undefined; name: string | null; size?: 'xs' | 'sm' }) {
  if (!image) return null;
  return <img src={image} alt={name ?? ''} className={`team-logo-${size}`} />;
}

function MatchRow({ m, teamImages, onTeamClick }: { m: EsportMatch; teamImages: Record<string, string | null>; onTeamClick: (id: string) => void }) {
  const score =
    m.team1Score != null && m.team2Score != null
      ? `${m.team1Score}-${m.team2Score}`
      : null;

  return (
    <div className={`match-row${m.winner ? ' has-result' : ''}`}>
      <button
        className={`match-team${m.winner === m.team1 ? ' winner' : m.winner === m.team2 ? ' loser' : ''} link-btn`}
        onClick={() => m.team1 && onTeamClick(m.team1)}
      >
        <TeamLogo image={m.team1 ? teamImages[m.team1] : null} name={m.team1} />
        {m.team1 ?? '?'}
      </button>
      <span className="match-score">{score ?? 'vs'}</span>
      <button
        className={`match-team${m.winner === m.team2 ? ' winner' : m.winner === m.team1 ? ' loser' : ''} link-btn`}
        onClick={() => m.team2 && onTeamClick(m.team2)}
      >
        <TeamLogo image={m.team2 ? teamImages[m.team2] : null} name={m.team2} />
        {m.team2 ?? '?'}
      </button>
      {m.round && <span className="match-round">{m.round}</span>}
      {m.dateTime && (
        <span className="match-date">
          {new Date(m.dateTime).toLocaleDateString('fr-FR')}
        </span>
      )}
    </div>
  );
}

const LOWER_KW = ['lower', 'loser', 'seed'];
const FINALS_KW = ['final'];

function isLowerRound(r: string): boolean {
  const l = r.toLowerCase();
  return LOWER_KW.some((kw) => l.includes(kw));
}
function isFinalRound(r: string): boolean {
  const l = r.toLowerCase();
  return FINALS_KW.some((kw) => l.includes(kw)) && !isLowerRound(r);
}

const BRACKET_MATCH_H = 60;
const BRACKET_SLOT_GAP = 16;

function BracketMatch({ m, teamImages, onTeamClick }: { m: EsportMatch; teamImages: Record<string, string | null>; onTeamClick: (id: string) => void }) {
  return (
    <div className="bracket-match">
      <div className={`bracket-team${m.winner === m.team1 ? ' winner' : m.winner === m.team2 ? ' loser' : ''}`}>
        <TeamLogo image={m.team1 ? teamImages[m.team1] : null} name={m.team1} />
        <button className="link-btn" onClick={() => m.team1 && onTeamClick(m.team1)}>
          {m.team1 ?? '?'}
        </button>
        {m.team1Score != null && <span className="bracket-score">{m.team1Score}</span>}
      </div>
      <div className={`bracket-team${m.winner === m.team2 ? ' winner' : m.winner === m.team1 ? ' loser' : ''}`}>
        <TeamLogo image={m.team2 ? teamImages[m.team2] : null} name={m.team2} />
        <button className="link-btn" onClick={() => m.team2 && onTeamClick(m.team2)}>
          {m.team2 ?? '?'}
        </button>
        {m.team2Score != null && <span className="bracket-score">{m.team2Score}</span>}
      </div>
    </div>
  );
}

function BracketView({ matches, teamImages, onTeamClick }: { matches: EsportMatch[]; teamImages: Record<string, string | null>; onTeamClick: (id: string) => void }) {
  const roundOrder: string[] = [];
  const byRound: Record<string, EsportMatch[]> = {};
  for (const m of matches) {
    const r = m.round ?? 'Unknown';
    if (!byRound[r]) { byRound[r] = []; roundOrder.push(r); }
    byRound[r].push(m);
  }

  const upperRounds = roundOrder.filter((r) => !isLowerRound(r) && !isFinalRound(r));
  const lowerRounds = roundOrder.filter((r) => isLowerRound(r));
  const finalRounds = roundOrder.filter((r) => isFinalRound(r));
  const isDoubleElim = lowerRounds.length > 0;

  function renderTrack(trackRounds: string[], label?: string) {
    if (trackRounds.length === 0) return null;
    return (
      <div className="bracket-track">
        {label && <div className="bracket-track-label">{label}</div>}
        <div className="bracket-track-rounds">
          {trackRounds.map((round, colIdx) => {
            const slotH = (BRACKET_MATCH_H + BRACKET_SLOT_GAP) * Math.pow(2, colIdx);
            const isLastCol = colIdx === trackRounds.length - 1;
            const roundMatches = byRound[round];
            return (
              <div key={round} className="bracket-column">
                <div className="bracket-round-label">{round}</div>
                <div className="bracket-col-body">
                  {roundMatches.map((m, matchIdx) => {
                    const hasPairBelow = !isLastCol && matchIdx % 2 === 0 && matchIdx + 1 < roundMatches.length;
                    const isPairBottom = !isLastCol && matchIdx % 2 === 1;
                    const isAlone = !isLastCol && matchIdx % 2 === 0 && matchIdx + 1 >= roundMatches.length;
                    return (
                      <div key={m.id} className="bracket-slot" style={{ height: slotH }}>
                        {colIdx > 0 && <span className="bracket-conn-in" />}
                        <BracketMatch m={m} teamImages={teamImages} onTeamClick={onTeamClick} />
                        {hasPairBelow && (
                          <span
                            className="bracket-conn-out-pair"
                            style={{ '--vline': `${slotH}px` } as React.CSSProperties}
                          />
                        )}
                        {(isPairBottom || isAlone) && <span className="bracket-conn-out" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!isDoubleElim) {
    return (
      <div className="bracket-wrapper">
        {renderTrack([...upperRounds, ...finalRounds])}
      </div>
    );
  }

  return (
    <div className="bracket-wrapper">
      {renderTrack([...upperRounds, ...finalRounds], 'Upper Bracket')}
      {renderTrack(lowerRounds, 'Lower Bracket')}
    </div>
  );
}

function GroupView({ matches, teamImages, onTeamClick }: { matches: EsportMatch[]; teamImages: Record<string, string | null>; onTeamClick: (id: string) => void }) {
  return (
    <div className="match-list">
      {matches.map((m) => (
        <MatchRow key={m.id} m={m} teamImages={teamImages} onTeamClick={onTeamClick} />
      ))}
    </div>
  );
}

function TournamentDetail({
  detail,
  onPlayerClick,
  onTeamClick,
  onBack,
}: {
  detail: EsportTournamentDetail;
  onPlayerClick: (id: string) => void;
  onTeamClick: (id: string) => void;
  onBack: () => void;
}) {
  const [matchTab, setMatchTab] = useState<'group' | 'bracket'>('group');

  const stageType = detectStageType(detail.matches);
  const groupMatches = detail.matches.filter((m) => !m.round || !isBracketRound(m.round));
  const bracketMatches = detail.matches.filter((m) => m.round && isBracketRound(m.round));

  // Group rosters by team
  const byTeam = detail.rosters.reduce<Record<string, EsportRoster[]>>((acc, r) => {
    (acc[r.teamId] ??= []).push(r);
    return acc;
  }, {});

  // Build team image map from rosters
  const teamImages = detail.rosters.reduce<Record<string, string | null>>((acc, r) => {
    if (r.teamId && r.team?.image != null) acc[r.teamId] = r.team.image;
    return acc;
  }, {});

  const teamCount = Object.keys(byTeam).length;

  const activeTab: 'group' | 'bracket' =
    stageType === 'bracket' ? 'bracket' :
    stageType === 'group' ? 'group' :
    matchTab;

  return (
    <div className="tournament-detail">
      <button className="back-btn" onClick={onBack}>← Retour</button>
      <h2 className="detail-title">{detail.name}</h2>

      <div className="detail-overview">
        <div className="overview-badge">{detail.league}</div>
        <div className="overview-stats">
          {detail.startDate && (
            <div className="overview-stat">
              <span className="os-label">Période</span>
              <span className="os-value">{detail.startDate} → {detail.endDate ?? '?'}</span>
            </div>
          )}
          {detail.region && (
            <div className="overview-stat">
              <span className="os-label">Région</span>
              <span className="os-value">{detail.region}</span>
            </div>
          )}
          {detail.prizepool && (
            <div className="overview-stat">
              <span className="os-label">Prize pool</span>
              <span className="os-value os-gold">{detail.prizepool}</span>
            </div>
          )}
          {teamCount > 0 && (
            <div className="overview-stat">
              <span className="os-label">Équipes</span>
              <span className="os-value">{teamCount}</span>
            </div>
          )}
          {detail.matches.length > 0 && (
            <div className="overview-stat">
              <span className="os-label">Matchs</span>
              <span className="os-value">{detail.matches.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Matches */}
        <section className="detail-section">
          <div className="section-header">
            <h3>Matchs</h3>
            {stageType === 'mixed' && (
              <div className="match-tabs">
                <button
                  className={`match-tab${activeTab === 'group' ? ' active' : ''}`}
                  onClick={() => setMatchTab('group')}
                  disabled={groupMatches.length === 0}
                >
                  Phase de groupes
                </button>
                <button
                  className={`match-tab${activeTab === 'bracket' ? ' active' : ''}`}
                  onClick={() => setMatchTab('bracket')}
                  disabled={bracketMatches.length === 0}
                >
                  Bracket
                </button>
              </div>
            )}
            {stageType !== 'mixed' && (
              <span className="stage-badge">{stageType === 'bracket' ? 'Bracket' : 'Phase de groupes'}</span>
            )}
          </div>
          {detail.matches.length === 0 ? (
            <p className="empty-msg">Aucun match disponible</p>
          ) : activeTab === 'bracket' || stageType === 'bracket' ? (
            <BracketView matches={stageType === 'mixed' ? bracketMatches : detail.matches} teamImages={teamImages} onTeamClick={onTeamClick} />
          ) : (
            <GroupView matches={stageType === 'mixed' ? groupMatches : detail.matches} teamImages={teamImages} onTeamClick={onTeamClick} />
          )}
        </section>

        {/* Standings */}
        {detail.standings.length > 0 && (
          <section className="detail-section">
            <h3>Classement</h3>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Équipe</th>
                  <th>V</th>
                  <th>D</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {detail.standings.map((s) => {
                  const total = s.wins + s.losses;
                  const pct = total > 0 ? Math.round((s.wins / total) * 100) : 0;
                  return (
                    <tr key={s.id}>
                      <td>{s.rank}</td>
                      <td>
                        <button className="link-btn standings-team-btn" onClick={() => onTeamClick(s.teamName)}>
                          <TeamLogo image={teamImages[s.teamName]} name={s.teamName} />
                          {s.teamName}
                        </button>
                      </td>
                      <td className="wins">{s.wins}</td>
                      <td className="losses">{s.losses}</td>
                      <td className={pct >= 50 ? 'pct-good' : 'pct-bad'}>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {/* Rosters */}
      {Object.keys(byTeam).length > 0 && (
        <section className="detail-section">
          <h3>Effectifs</h3>
          <div className="roster-grid">
            {Object.entries(byTeam).map(([teamId, members]) => (
              <div key={teamId} className="roster-team">
                <button className="roster-team-name link-btn" onClick={() => onTeamClick(teamId)}>
                  <TeamLogo image={members[0]?.team?.image} name={teamId} size="sm" />
                  {teamId}
                </button>
                <div className="roster-players">
                  {members.map((r) => (
                    <PlayerChip
                      key={r.id}
                      name={r.playerId}
                      role={r.role}
                      onClick={() => onPlayerClick(r.playerId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlayerProfile({
  detail,
  onTeamClick,
  onBack,
}: {
  detail: EsportPlayerDetail;
  onTeamClick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="player-profile">
      <button className="back-btn" onClick={onBack}>← Retour</button>
      <div className="pp-header">
        <h2 className="pp-name">{detail.name}</h2>
        {detail.nativeName && <span className="pp-native">{detail.nativeName}</span>}
        {detail.isRetired && <span className="retired-badge">Retraité</span>}
      </div>
      <div className="pp-meta">
        {detail.country && <span>🌍 {detail.country}</span>}
        {detail.role && <RoleBadge role={detail.role} />}
        {detail.residency && <span>Région: {detail.residency}</span>}
        {detail.birthdate && <span>Né le: {detail.birthdate}</span>}
        {detail.team && (
          <button className="link-btn" onClick={() => onTeamClick(detail.team!.id)}>
            Équipe: {detail.team.id}
          </button>
        )}
      </div>

      {detail.rosters.length > 0 && (
        <section className="pp-section">
          <h3>Carrière</h3>
          <div className="career-list">
            {detail.rosters.map((r) => (
              <div key={r.id} className="career-row">
                <span className="career-tournament">{r.tournament?.name ?? r.tournamentId}</span>
                <span className="career-team">{r.team?.id ?? r.teamId}</span>
                {r.role && <RoleBadge role={r.role} />}
              </div>
            ))}
          </div>
        </section>
      )}

      {detail.stats.length > 0 && (
        <section className="pp-section">
          <h3>Stats récentes</h3>
          <table className="stat-table">
            <thead>
              <tr>
                <th>Champion</th>
                <th>K</th>
                <th>D</th>
                <th>A</th>
                <th>CS</th>
                <th>Or</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {detail.stats.slice(0, 20).map((s) => (
                <tr key={s.id} className={s.win === true ? 'stat-win' : s.win === false ? 'stat-loss' : ''}>
                  <td>{s.champion ?? '?'}</td>
                  <td>{s.kills ?? '-'}</td>
                  <td>{s.deaths ?? '-'}</td>
                  <td>{s.assists ?? '-'}</td>
                  <td>{s.cs ?? '-'}</td>
                  <td>{s.gold != null ? `${Math.round(s.gold / 1000)}k` : '-'}</td>
                  <td>{s.win === true ? '✓ V' : s.win === false ? '✗ D' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function TeamDetail({
  detail,
  onPlayerClick,
  onBack,
}: {
  detail: EsportTeamDetail;
  onPlayerClick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="team-detail">
      <button className="back-btn" onClick={onBack}>← Retour</button>
      <div className="td-header">
        {detail.image && <img src={detail.image} alt={detail.id} className="td-logo" />}
        <div>
          <h2 className="td-name">{detail.id}</h2>
          {detail.short && <span className="td-short">{detail.short}</span>}
          {detail.region && <span className="td-region">{detail.region}</span>}
        </div>
      </div>

      {detail.players.length > 0 && (
        <section className="td-section">
          <h3>Roster actuel</h3>
          <table className="roster-table">
            <thead>
              <tr><th>Joueur</th><th>Rôle</th><th>Pays</th></tr>
            </thead>
            <tbody>
              {detail.players.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button className="link-btn" onClick={() => onPlayerClick(p.id)}>
                      {p.name}
                    </button>
                  </td>
                  <td><RoleBadge role={p.role} /></td>
                  <td>{p.country ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2012 },
  (_, i) => String(CURRENT_YEAR - i)
);

export default function TournamentSection() {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'players'>('tournaments');

  // League config
  const [leagueConfig, setLeagueConfig] = useState<EsportLeagueConfig | null>(null);

  // Tournament navigation
  const [activeSection, setActiveSection] = useState<'region' | 'international'>('region');
  const [selectedRegion, setSelectedRegion] = useState<string>('LEC');
  const [showSubdivision, setShowSubdivision] = useState(false);
  const [selectedInternational, setSelectedInternational] = useState<string>('MSI');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // Tournament data
  const [tournaments, setTournaments] = useState<EsportTournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<EsportTournamentDetail | null>(null);
  const [tLoading, setTLoading] = useState(false);
  const [tError, setTError] = useState('');

  // Player tab state
  const [playerQuery, setPlayerQuery] = useState('');
  const [players, setPlayers] = useState<EsportPlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<EsportPlayerDetail | null>(null);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState('');

  // Team detail state
  const [selectedTeam, setSelectedTeam] = useState<EsportTeamDetail | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  // Load league config on mount
  useEffect(() => {
    getEsportLeagueConfig()
      .then((config) => {
        setLeagueConfig(config);
        if (config.regions[0]) setSelectedRegion(config.regions[0]);
        if (config.international[0]) setSelectedInternational(config.international[0]);
      })
      .catch(() => {});
  }, []);

  // Compute active league key based on navigation
  const currentLeague =
    activeSection === 'international'
      ? selectedInternational
      : showSubdivision && leagueConfig
        ? (leagueConfig.subdivisions[selectedRegion] ?? selectedRegion)
        : selectedRegion;

  // Load tournaments when navigation changes
  useEffect(() => {
    if (activeTab !== 'tournaments') return;
    setSelectedTournament(null);
    setTLoading(true);
    setTError('');
    getEsportTournaments(currentLeague, selectedYear)
      .then(setTournaments)
      .catch((err) => setTError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setTLoading(false));
  }, [currentLeague, selectedYear, activeTab]);

  const handleTournamentClick = async (id: string) => {
    setTLoading(true);
    setTError('');
    try {
      const detail = await getEsportTournament(id);
      setSelectedTournament(detail);
      setSelectedTeam(null);
    } catch (err) {
      setTError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setTLoading(false);
    }
  };

  const handlePlayerSearch = async () => {
    if (playerQuery.trim().length < 2) return;
    setPLoading(true);
    setPError('');
    setSelectedPlayer(null);
    try {
      const results = await searchEsportPlayers(playerQuery.trim());
      setPlayers(results);
    } catch (err) {
      setPError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setPLoading(false);
    }
  };

  const handlePlayerClick = async (id: string) => {
    setActiveTab('players');
    setPLoading(true);
    setPError('');
    setSelectedTeam(null);
    try {
      const detail = await getEsportPlayer(id);
      setSelectedPlayer(detail);
    } catch (err) {
      setPError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setPLoading(false);
    }
  };

  const handleTeamClick = async (id: string) => {
    setTeamLoading(true);
    try {
      const detail = await getEsportTeam(id);
      setSelectedTeam(detail);
    } catch {
      // silently ignore — team may not be in DB yet
    } finally {
      setTeamLoading(false);
    }
  };

  const refreshTournaments = () => {
    getEsportTournaments(currentLeague, selectedYear).then(setTournaments).catch(() => {});
  };

  const handleSectionChange = (section: 'region' | 'international') => {
    setActiveSection(section);
    setShowSubdivision(false);
    setSelectedTournament(null);
  };

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setShowSubdivision(false);
    setSelectedTournament(null);
  };

  return (
    <div className="tournament-page">
      {/* Header */}
      <div className="tournament-header">
        <h1 className="tournament-title">Esport</h1>
        <div className="esport-tabs">
          <button
            className={`esport-tab${activeTab === 'tournaments' ? ' active' : ''}`}
            onClick={() => setActiveTab('tournaments')}
          >
            Tournois
          </button>
          <button
            className={`esport-tab${activeTab === 'players' ? ' active' : ''}`}
            onClick={() => setActiveTab('players')}
          >
            Joueurs
          </button>
        </div>
        <SyncPanel
          config={leagueConfig}
          defaultLeague={currentLeague}
          defaultYear={selectedYear}
          onSynced={refreshTournaments}
        />
      </div>

      {/* Team detail overlay */}
      {selectedTeam && (
        <div className="tab-content">
          <TeamDetail
            detail={selectedTeam}
            onPlayerClick={handlePlayerClick}
            onBack={() => setSelectedTeam(null)}
          />
        </div>
      )}

      {/* Tournament tab */}
      {activeTab === 'tournaments' && !selectedTeam && (
        <div className="tab-content">

          {/* Niveau 1 — Région vs International */}
          <div className="nav-level">
            <div className="section-tabs">
              <button
                className={`section-tab${activeSection === 'region' ? ' active' : ''}`}
                onClick={() => handleSectionChange('region')}
              >
                Régions
              </button>
              <button
                className={`section-tab${activeSection === 'international' ? ' active' : ''}`}
                onClick={() => handleSectionChange('international')}
              >
                International
              </button>
            </div>

            {/* Niveau 2a — Sélection de région */}
            {activeSection === 'region' && (
              <div className="region-tabs">
                {(leagueConfig?.regions ?? ['LEC', 'LCS', 'LCK', 'LPL']).map((r) => (
                  <button
                    key={r}
                    className={`region-tab${selectedRegion === r ? ' active' : ''}`}
                    onClick={() => handleRegionChange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}

            {/* Niveau 2b — Sélection d'événement international */}
            {activeSection === 'international' && (
              <div className="region-tabs">
                {(leagueConfig?.international ?? ['MSI', 'Worlds', 'First Stand']).map((ev) => (
                  <button
                    key={ev}
                    className={`region-tab${selectedInternational === ev ? ' active' : ''}`}
                    onClick={() => { setSelectedInternational(ev); setSelectedTournament(null); }}
                  >
                    {ev}
                  </button>
                ))}
              </div>
            )}

            {/* Niveau 3a — Ligue principale vs sous-division (régions seulement) */}
            {activeSection === 'region' && leagueConfig?.subdivisions[selectedRegion] && (
              <div className="subdivision-tabs">
                <button
                  className={`subdivision-tab${!showSubdivision ? ' active' : ''}`}
                  onClick={() => { setShowSubdivision(false); setSelectedTournament(null); }}
                >
                  {selectedRegion}
                </button>
                <button
                  className={`subdivision-tab${showSubdivision ? ' active' : ''}`}
                  onClick={() => { setShowSubdivision(true); setSelectedTournament(null); }}
                >
                  {leagueConfig.subdivisions[selectedRegion]}
                </button>
              </div>
            )}

            {/* Niveau 4 — Sélection d'année */}
            <div className="year-tabs">
              {YEAR_OPTIONS.map((y) => (
                <button
                  key={y}
                  className={`year-tab${selectedYear === y ? ' active' : ''}`}
                  onClick={() => { setSelectedYear(y); setSelectedTournament(null); }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {tLoading && <div className="esport-spinner" />}
          {tError && <div className="esport-error">{tError}</div>}

          {selectedTournament ? (
            <TournamentDetail
              detail={selectedTournament}
              onPlayerClick={handlePlayerClick}
              onTeamClick={handleTeamClick}
              onBack={() => setSelectedTournament(null)}
            />
          ) : (
            <div className="tournament-grid">
              {tournaments.length === 0 && !tLoading && (
                <p className="empty-msg">
                  Aucun tournoi en base. Utilisez le bouton Sync pour charger les données.
                </p>
              )}
              {tournaments.map((t) => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  onClick={() => handleTournamentClick(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player tab */}
      {activeTab === 'players' && !selectedTeam && (
        <div className="tab-content">
          <div className="player-search">
            <input
              className="player-search-input"
              value={playerQuery}
              onChange={(e) => setPlayerQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePlayerSearch()}
              placeholder="Rechercher un joueur (ex: Faker)"
            />
            <button className="player-search-btn" onClick={handlePlayerSearch} disabled={pLoading}>
              Rechercher
            </button>
          </div>

          {pLoading && <div className="esport-spinner" />}
          {pError && <div className="esport-error">{pError}</div>}

          {selectedPlayer ? (
            <PlayerProfile
              detail={selectedPlayer}
              onTeamClick={handleTeamClick}
              onBack={() => setSelectedPlayer(null)}
            />
          ) : (
            <div className="player-list">
              {players.map((p) => (
                <div key={p.id} className="player-result" onClick={() => handlePlayerClick(p.id)}>
                  <span className="pr-name">{p.name}</span>
                  <RoleBadge role={p.role} />
                  {p.country && <span className="pr-country">{p.country}</span>}
                  {p.teamId && <span className="pr-team">{p.teamId}</span>}
                  {p.isRetired && <span className="retired-badge">Retraité</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {teamLoading && <div className="esport-spinner" />}
    </div>
  );
}
