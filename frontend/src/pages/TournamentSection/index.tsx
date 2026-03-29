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
  EsportStanding,
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
  const cssRole = role.toLowerCase().replace(/\s+/g, '-');
  return <span className={`role-badge role-${cssRole}`}>{role}</span>;
}

const ROLE_ORDER_MAP: Record<string, number> = {
  'top': 0, 'jungle': 1, 'mid': 2, 'bot': 3, 'adc': 3, 'support': 4,
  'head coach': 5, 'coach': 6, 'analyst': 7, 'manager': 8,
};

function roleOrder(role: string | null): number {
  if (!role) return 99;
  const lower = role.toLowerCase().trim();
  if (ROLE_ORDER_MAP[lower] !== undefined) return ROLE_ORDER_MAP[lower];
  const m = lower.match(/^(?:sub|substitute)\s+(.+)$/);
  if (m) {
    const base = ROLE_ORDER_MAP[m[1]];
    return base !== undefined ? base + 0.5 : 4.5;
  }
  if (lower === 'sub' || lower === 'substitute') return 4.5;
  return 99;
}

function PlayerChip({
  name,
  role,
  image,
  onClick,
}: {
  name: string;
  role: string | null;
  image?: string | null;
  onClick: () => void;
}) {
  return (
    <div className="player-chip" onClick={onClick}>
      <PlayerAvatar image={image} name={ingameName(name)} size="sm" />
      <span className="pc-name">{name}</span>
      <RoleBadge role={role} />
    </div>
  );
}

const BRACKET_ROUNDS = [
  'final', 'finals', 'semifinal', 'semifinals', 'quarterfinal', 'quarterfinals',
  'round of 16', 'round of 8', 'round of 4',
  'upper bracket', 'lower bracket', 'grand final',
  'losers', 'loser', 'winners',
  'play-in', 'playin', 'playoff',
];

function isBracketRound(round: string): boolean {
  const lower = round.toLowerCase();
  if (BRACKET_ROUNDS.some((kw) => lower.includes(kw))) return true;
  // "Round N" seul = bracket Leaguepedia (≠ "Week N" / "Groups Day N" = group stage)
  if (/^round\s*\d+$/i.test(round)) return true;
  return false;
}


function detectStageType(matches: EsportMatch[], standings: EsportStanding[]): 'bracket' | 'group' | 'mixed' {
  // Données Leaguepedia fiables : si des standings ont un groupName, le type est connu
  const hasGroupData = standings.some((s) => s.groupName);
  if (hasGroupData) {
    const hasBracket = matches.some((m) => m.round && isBracketRound(m.round));
    return hasBracket ? 'mixed' : 'group';
  }

  // Fallback : utiliser les noms de rounds (Tab de Leaguepedia)
  if (matches.length === 0) return 'group';
  const rounds = [...new Set(matches.map((m) => m.round).filter(Boolean))] as string[];
  if (rounds.length === 0) return 'group'; // vieilles données sans Tab → on ne sait pas

  const hasBracketRound = rounds.some(isBracketRound);
  const hasGroupRound = rounds.some((r) => !isBracketRound(r));

  if (hasBracketRound && hasGroupRound) return 'mixed';
  if (hasBracketRound) return 'bracket';
  return 'group';
}

// Strip "(Real Name)" disambiguation from DB player ids to get the display ingame name.
// e.g. "Doran (Choi Hyeon-joon)" → "Doran"
function ingameName(id: string): string {
  return id.replace(/\s*\(.*\)$/, '').trim();
}

function PlayerAvatar({ image, name, size = 'sm' }: { image: string | null | undefined; name: string; size?: 'sm' | 'lg' }) {
  if (image) return <img src={image} alt={name} className={`player-avatar player-avatar-${size}`} />;
  return <span className={`player-avatar player-avatar-${size} player-avatar-placeholder`}>{name[0]?.toUpperCase()}</span>;
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


const BRACKET_MATCH_H = 60;
const BRACKET_SLOT_GAP = 16;

function bracketRoundOrder(r: string): number {
  const numMatch = r.match(/round\s*(\d+)/i);
  if (numMatch) return parseInt(numMatch[1]);
  const l = r.toLowerCase();
  if (l.includes('quarterfinal')) return 100;
  if (l.includes('semifinal')) return 200;
  if (l.includes('grand final')) return 390;
  if (l.includes('final')) return 400;
  return 50;
}

function BracketView({ matches, teamImages, onTeamClick }: { matches: EsportMatch[]; teamImages: Record<string, string | null>; onTeamClick: (id: string) => void }) {
  const roundOrder: string[] = [];
  const byRound: Record<string, EsportMatch[]> = {};
  for (const m of matches) {
    const r = m.round ?? 'Unknown';
    if (!byRound[r]) { byRound[r] = []; roundOrder.push(r); }
    byRound[r].push(m);
  }
  roundOrder.sort((a, b) => bracketRoundOrder(a) - bracketRoundOrder(b));
  const maxMatchCount = Math.max(...roundOrder.map((r) => byRound[r].length));

  return (
    <div className="bracket-wrapper">
      <div className="bracket-track-rounds">
        {roundOrder.map((round, colIdx) => {
          const roundMatches = [...byRound[round]].sort((a, b) => {
            if (a.nMatchInTab != null && b.nMatchInTab != null) return a.nMatchInTab - b.nMatchInTab;
            if (a.nMatchInTab != null) return -1;
            if (b.nMatchInTab != null) return 1;
            if (!a.dateTime) return 1;
            if (!b.dateTime) return -1;
            return a.dateTime.localeCompare(b.dateTime);
          });
          // Slot height proportional to match count ratio (not exponential by position)
          const slotH = (BRACKET_MATCH_H + BRACKET_SLOT_GAP) * (maxMatchCount / roundMatches.length);
          const isLastCol = colIdx === roundOrder.length - 1;
          const nextCount = !isLastCol ? byRound[roundOrder[colIdx + 1]].length : 0;
          const prevCount = colIdx > 0 ? byRound[roundOrder[colIdx - 1]].length : 0;
          // Connectors only when counts halve strictly (clean single-elim pairing)
          const canDrawOut = !isLastCol && nextCount * 2 === roundMatches.length;
          const canDrawIn = colIdx > 0 && prevCount === roundMatches.length * 2;
          return (
            <div key={round} className="bracket-column">
              <div className="bracket-round-label">{round}</div>
              <div className="bracket-col-body">
                {roundMatches.map((m, matchIdx) => {
                  const hasPairBelow = canDrawOut && matchIdx % 2 === 0 && matchIdx + 1 < roundMatches.length;
                  const isPairBottom = canDrawOut && matchIdx % 2 === 1;
                  const isAlone = canDrawOut && matchIdx % 2 === 0 && matchIdx + 1 >= roundMatches.length;
                  return (
                    <div key={m.id} className="bracket-slot" style={{ height: slotH }}>
                      {canDrawIn && <span className="bracket-conn-in" />}
                      <div className="bracket-match">
                        <div className={`bracket-team${m.winner === m.team1 ? ' winner' : m.winner === m.team2 ? ' loser' : ''}`}>
                          <TeamLogo image={m.team1 ? teamImages[m.team1] : null} name={m.team1} />
                          <button className="link-btn" onClick={() => m.team1 && onTeamClick(m.team1)}>{m.team1 ?? '?'}</button>
                          {m.team1Score != null && <span className="bracket-score">{m.team1Score}</span>}
                        </div>
                        <div className={`bracket-team${m.winner === m.team2 ? ' winner' : m.winner === m.team1 ? ' loser' : ''}`}>
                          <TeamLogo image={m.team2 ? teamImages[m.team2] : null} name={m.team2} />
                          <button className="link-btn" onClick={() => m.team2 && onTeamClick(m.team2)}>{m.team2 ?? '?'}</button>
                          {m.team2Score != null && <span className="bracket-score">{m.team2Score}</span>}
                        </div>
                      </div>
                      {hasPairBelow && (
                        <span className="bracket-conn-out-pair" style={{ '--vline': `${slotH}px` } as React.CSSProperties} />
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

function GroupStandingsOverview({
  matches,
  standings,
  teamImages,
  onTeamClick,
}: {
  matches: EsportMatch[];
  standings: EsportStanding[];
  teamImages: Record<string, string | null>;
  onTeamClick: (id: string) => void;
}) {
  const [showMatches, setShowMatches] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const MATCH_PAGE = 10;
  const sorted = [...standings].sort((a, b) => a.rank - b.rank);
  const teams = sorted.map((s) => s.teamName);

  // Game wins/losses per team
  const gameStats = new Map<string, { gw: number; gl: number }>();
  for (const m of matches) {
    if (!m.team1 || !m.team2) continue;
    const t1 = m.team1Score ?? 0, t2 = m.team2Score ?? 0;
    if (!gameStats.has(m.team1)) gameStats.set(m.team1, { gw: 0, gl: 0 });
    if (!gameStats.has(m.team2)) gameStats.set(m.team2, { gw: 0, gl: 0 });
    gameStats.get(m.team1)!.gw += t1; gameStats.get(m.team1)!.gl += t2;
    gameStats.get(m.team2)!.gw += t2; gameStats.get(m.team2)!.gl += t1;
  }

  // Streak: consecutive W or L from most recent matches
  const byDate = [...matches]
    .filter((m) => m.dateTime && m.winner && m.team1 && m.team2)
    .sort((a, b) => ((b.dateTime ?? '') > (a.dateTime ?? '') ? 1 : -1));
  const streaks = new Map<string, string>();
  for (const team of teams) {
    const tm = byDate.filter((m) => m.team1 === team || m.team2 === team);
    if (!tm.length) { streaks.set(team, '–'); continue; }
    const firstWon = (tm[0].team1 === team && tm[0].winner === '1') || (tm[0].team2 === team && tm[0].winner === '2');
    const letter = firstWon ? 'W' : 'L';
    let count = 0;
    for (const m of tm) {
      const won = (m.team1 === team && m.winner === '1') || (m.team2 === team && m.winner === '2');
      if ((letter === 'W') === won) count++; else break;
    }
    streaks.set(team, `${count}${letter}`);
  }

  // Head-to-head: score from teamA's perspective vs teamB
  function getH2H(ta: string, tb: string): { a: number; b: number } | null {
    const m = matches.find((x) =>
      (x.team1 === ta && x.team2 === tb) || (x.team1 === tb && x.team2 === ta)
    );
    if (!m || m.team1Score == null || m.team2Score == null) return null;
    return m.team1 === ta ? { a: m.team1Score, b: m.team2Score } : { a: m.team2Score, b: m.team1Score };
  }

  return (
    <div className="group-overview">
      <div className="go-tables">
        {/* Standings enrichis */}
        <table className="standings-table go-standings">
          <thead>
            <tr>
              <th rowSpan={2}>#</th>
              <th rowSpan={2} className="go-team-col">Équipe</th>
              <th colSpan={3} className="go-group-header">Séries</th>
              <th colSpan={3} className="go-group-header">Games</th>
              <th rowSpan={2}>Str.</th>
            </tr>
            <tr>
              <th>V</th><th>D</th><th>%</th>
              <th>V</th><th>D</th><th>%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const gs = gameStats.get(s.teamName) ?? { gw: 0, gl: 0 };
              const st = s.wins + s.losses;
              const sPct = st > 0 ? Math.round(s.wins / st * 100) : 0;
              const gt = gs.gw + gs.gl;
              const gPct = gt > 0 ? Math.round(gs.gw / gt * 100) : 0;
              const streak = streaks.get(s.teamName) ?? '–';
              return (
                <tr key={s.id}>
                  <td className="go-rank">{s.rank}</td>
                  <td>
                    <button className="link-btn standings-team-btn" onClick={() => onTeamClick(s.teamName)}>
                      <TeamLogo image={teamImages[s.teamName]} name={s.teamName} />
                      {s.teamShort ?? s.teamName}
                    </button>
                  </td>
                  <td className="wins">{s.wins}</td>
                  <td className="losses">{s.losses}</td>
                  <td className={sPct >= 50 ? 'pct-good' : 'pct-bad'}>{sPct}%</td>
                  <td>{gs.gw}</td>
                  <td>{gs.gl}</td>
                  <td className={gPct >= 50 ? 'pct-good' : 'pct-bad'}>{gPct}%</td>
                  <td className={streak.endsWith('W') ? 'streak-w' : streak.endsWith('L') ? 'streak-l' : ''}>{streak}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Matrice H2H */}
        {teams.length > 1 && (
          <div className="go-matrix-wrap">
            <table className="go-matrix-table">
              <thead>
                <tr>
                  <th />
                  {teams.map((t) => <th key={t}><TeamLogo image={teamImages[t]} name={t} /></th>)}
                  <th>Total</th>
                  <th>WR%</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const ta = s.teamName;
                  let tw = 0, tl = 0;
                  teams.forEach((tb) => {
                    if (ta === tb) return;
                    const h = getH2H(ta, tb);
                    if (!h) return;
                    if (h.a > h.b) tw++; else tl++;
                  });
                  const twPct = (tw + tl) > 0 ? Math.round(tw / (tw + tl) * 100) : null;
                  return (
                    <tr key={s.id}>
                      <td className="h2h-logo"><TeamLogo image={teamImages[ta]} name={ta} /></td>
                      {teams.map((tb) => {
                        if (ta === tb) return <td key={tb} className="h2h-self" />;
                        const h = getH2H(ta, tb);
                        if (!h) return <td key={tb} className="h2h-empty">–</td>;
                        return <td key={tb} className={h.a > h.b ? 'h2h-win' : 'h2h-loss'}>{h.a}-{h.b}</td>;
                      })}
                      <td className="h2h-total">{tw} – {tl}</td>
                      <td className={twPct !== null ? (twPct >= 50 ? 'pct-good' : 'pct-bad') : ''}>
                        {twPct !== null ? `${twPct}%` : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button className="go-toggle" onClick={() => { setShowMatches((v) => !v); setShowAllMatches(false); }}>
        {showMatches ? '▲ Masquer les matchs' : '▼ Voir les matchs'}
      </button>
      {showMatches && (
        <div className="match-list go-match-list">
          {(showAllMatches ? matches : matches.slice(0, MATCH_PAGE)).map((m) =>
            <MatchRow key={m.id} m={m} teamImages={teamImages} onTeamClick={onTeamClick} />
          )}
          {!showAllMatches && matches.length > MATCH_PAGE && (
            <button className="go-toggle" onClick={() => setShowAllMatches(true)}>
              Afficher + ({matches.length - MATCH_PAGE} restants)
            </button>
          )}
        </div>
      )}
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
  const [showAllGroupMatches, setShowAllGroupMatches] = useState(false);
  const MATCH_PAGE = 10;

  const stageType = detectStageType(detail.matches, detail.standings);
  const groupMatches = detail.matches.filter((m) => !m.round || !isBracketRound(m.round));
  const bracketMatches = detail.matches.filter((m) => m.round && isBracketRound(m.round));
  const isPlayIn = (r: string) => /play.?in/i.test(r);
  const playInMatches = bracketMatches.filter((m) => m.round && isPlayIn(m.round));
  const playoffMatches = bracketMatches.filter((m) => !m.round || !isPlayIn(m.round));

  // Multi-group support
  const groupedStandings = detail.standings.reduce<Record<string, EsportStanding[]>>((acc, s) => {
    const key = s.groupName ?? '__default__';
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
  const groupKeys = Object.keys(groupedStandings).sort();
  const hasMultipleGroups = groupKeys.length > 1 && !groupKeys.every((k) => k === '__default__');


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
        {/* Phase de groupes — group pur uniquement */}
        {stageType === 'group' && (
          <section className="detail-section detail-full">
            <div className="section-header">
              <h3>Phase de groupes</h3>
            </div>
            {detail.matches.length === 0 && detail.standings.length === 0
              ? <p className="empty-msg">Aucun match disponible</p>
              : groupKeys.map((groupKey) => {
                  const gStandings = groupedStandings[groupKey];
                  return (
                    <div key={groupKey}>
                      {hasMultipleGroups && groupKey !== '__default__' && (
                        <h4 className="group-name-header">{groupKey}</h4>
                      )}
                      <GroupStandingsOverview
                        matches={detail.matches}
                        standings={gStandings}
                        teamImages={teamImages}
                        onTeamClick={onTeamClick}
                      />
                    </div>
                  );
                })
            }
          </section>
        )}

        {/* Mixed : classement */}
        {stageType === 'mixed' && detail.standings.length > 0 && (
          <section className="detail-section">
            <h3>Classement</h3>
            <table className="standings-table">
              <thead>
                <tr><th>#</th><th>Équipe</th><th>V</th><th>D</th><th>%</th></tr>
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

        {/* Mixed : phase de groupes en liste plate */}
        {stageType === 'mixed' && groupMatches.length > 0 && (
          <section className="detail-section detail-full">
            <div className="section-header">
              <h3>Phase de groupes</h3>
            </div>
            <div className="match-list">
              {(showAllGroupMatches ? groupMatches : groupMatches.slice(0, MATCH_PAGE)).map((m) => (
                <MatchRow key={m.id} m={m} teamImages={teamImages} onTeamClick={onTeamClick} />
              ))}
            </div>
            {!showAllGroupMatches && groupMatches.length > MATCH_PAGE && (
              <button className="go-toggle" onClick={() => setShowAllGroupMatches(true)}>
                Afficher + ({groupMatches.length - MATCH_PAGE} restants)
              </button>
            )}
          </section>
        )}

        {/* Mixed : play-in en bracket view (si présent) */}
        {stageType === 'mixed' && playInMatches.length > 0 && (
          <section className="detail-section detail-full">
            <div className="section-header">
              <h3>Phase Play-In</h3>
              <span className="stage-badge">Bracket</span>
            </div>
            <BracketView matches={playInMatches} teamImages={teamImages} onTeamClick={onTeamClick} />
          </section>
        )}

        {/* Mixed : playoffs en bracket view */}
        {stageType === 'mixed' && playoffMatches.length > 0 && (
          <section className="detail-section detail-full">
            <div className="section-header">
              <h3>Phase Playoff</h3>
              <span className="stage-badge">Bracket</span>
            </div>
            <BracketView matches={playoffMatches} teamImages={teamImages} onTeamClick={onTeamClick} />
          </section>
        )}

        {/* Classement — bracket pur (au-dessus du bracket) */}
        {stageType === 'bracket' && detail.standings.length > 0 && (
          <section className="detail-section">
            <h3>Classement</h3>
            <table className="standings-table">
              <thead>
                <tr><th>#</th><th>Équipe</th><th>V</th><th>D</th><th>%</th></tr>
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

        {/* Bracket — liste des matchs */}
        {stageType === 'bracket' && (
          <section className="detail-section detail-full">
            <div className="section-header">
              <h3>Matchs</h3>
              <span className="stage-badge">Bracket</span>
            </div>
            {detail.matches.length === 0
              ? <p className="empty-msg">Aucun match disponible</p>
              : <BracketView matches={detail.matches} teamImages={teamImages} onTeamClick={onTeamClick} />
            }
          </section>
        )}
      </div>

      {/* Rosters */}
      {Object.keys(byTeam).length > 0 && (
        <section className="detail-section">
          <h3>Effectifs</h3>
          <div className="roster-grid">
            {Object.entries(byTeam)
              .sort(([aId], [bId]) => {
                const aRank = detail.standings.find((s) => s.teamName === aId)?.rank ?? 999;
                const bRank = detail.standings.find((s) => s.teamName === bId)?.rank ?? 999;
                return aRank - bRank;
              })
              .map(([teamId, members]) => (
              <div key={teamId} className="roster-team">
                <button className="roster-team-name link-btn" onClick={() => onTeamClick(teamId)}>
                  <TeamLogo image={members[0]?.team?.image} name={teamId} size="sm" />
                  {teamId}
                </button>
                <div className="roster-players">
                  {[...members].sort((a, b) => roleOrder(a.role) - roleOrder(b.role)).map((r) => (
                    <PlayerChip
                      key={r.id}
                      name={ingameName(r.playerId)}
                      role={r.role}
                      image={r.player?.image}
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
        <PlayerAvatar image={detail.image} name={ingameName(detail.lpId)} size="lg" />
        <div>
          <h2 className="pp-name">
            {ingameName(detail.lpId)}
            {detail.name && detail.name !== ingameName(detail.lpId) && (
              <span className="pp-realname"> ({detail.name})</span>
            )}
          </h2>
          {detail.nativeName && <span className="pp-native">{detail.nativeName}</span>}
          {detail.isRetired && <span className="retired-badge">Retraité</span>}
        </div>
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
  const currentPlayerIds = new Set(detail.players.map((p) => p.lpId));

  // Date de premier tournoi par joueur actuel → "Depuis"
  const joinedDates = new Map<string, string | null>();
  for (const r of detail.rosters) {
    if (!currentPlayerIds.has(r.player.lpId)) continue;
    const start = r.tournament?.startDate ?? null;
    const existing = joinedDates.get(r.player.lpId);
    if (start && (!existing || start < existing)) joinedDates.set(r.player.lpId, start);
  }

  // Anciens joueurs : regroupés par joueur avec plage de dates
  const formerMap = new Map<string, {
    player: EsportPlayer;
    minDate: string | null;
    maxDate: string | null;
  }>();
  for (const r of detail.rosters) {
    if (currentPlayerIds.has(r.player.lpId)) continue;
    const start = r.tournament?.startDate ?? null;
    const end = r.tournament?.endDate ?? r.tournament?.startDate ?? null;
    const existing = formerMap.get(r.player.lpId);
    if (!existing) {
      formerMap.set(r.player.lpId, { player: r.player, minDate: start, maxDate: end });
    } else {
      if (start && (!existing.minDate || start < existing.minDate)) existing.minDate = start;
      if (end && (!existing.maxDate || end > existing.maxDate)) existing.maxDate = end;
    }
  }
  const formerPlayers = Array.from(formerMap.values()).sort(
    (a, b) => ((a.maxDate ?? '') > (b.maxDate ?? '') ? -1 : 1)
  );

  const sortedPlayers = [...detail.players].sort(
    (a, b) => roleOrder(a.role) - roleOrder(b.role)
  );

  const fmtDate = (d: string | null) => {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="team-detail">
      <button className="back-btn" onClick={onBack}>← Retour</button>
      <div className="td-header">
        {detail.image && <img src={detail.image} alt={detail.id} className="td-logo" />}
        <div>
          <h2 className="td-name">{detail.id}</h2>
          <div className="td-meta">
            {detail.short && <span className="td-short">{detail.short}</span>}
            {detail.region && <span className="td-region">{detail.region}</span>}
            {detail.location && <span className="td-location">{detail.location}</span>}
          </div>
        </div>
      </div>

      {sortedPlayers.length > 0 && (
        <section className="td-section">
          <h3>Roster actuel</h3>
          <table className="roster-table">
            <thead>
              <tr><th>Joueur</th><th>Rôle</th><th>Pays</th><th>Depuis</th></tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p) => (
                <tr key={p.lpId}>
                  <td>
                    <button className="link-btn" onClick={() => onPlayerClick(p.lpId)}>
                      {ingameName(p.lpId)}{p.name ? ` (${p.name})` : ''}
                    </button>
                  </td>
                  <td><RoleBadge role={p.role} /></td>
                  <td>{p.country ?? '–'}</td>
                  <td className="td-period">{fmtDate(joinedDates.get(p.lpId) ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {formerPlayers.length > 0 && (
        <section className="td-section">
          <h3>Anciens joueurs</h3>
          <table className="roster-table">
            <thead>
              <tr><th>Joueur</th><th>Rôle</th><th>Période</th><th>Équipe actuelle</th></tr>
            </thead>
            <tbody>
              {formerPlayers.map(({ player, minDate, maxDate }) => (
                <tr key={player.lpId}>
                  <td>
                    <button className="link-btn" onClick={() => onPlayerClick(player.lpId)}>
                      {ingameName(player.lpId)}{player.name ? ` (${player.name})` : ''}
                    </button>
                  </td>
                  <td><RoleBadge role={player.role} /></td>
                  <td className="td-period">{fmtDate(minDate)} – {fmtDate(maxDate)}</td>
                  <td className="td-next-team">{player.teamId ?? '–'}</td>
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
              {YEAR_OPTIONS.filter((y) =>
                parseInt(y) >= (leagueConfig?.startYears?.[currentLeague] ?? 2011)
              ).map((y) => (
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
                <div key={p.lpId} className="player-result" onClick={() => handlePlayerClick(p.lpId)}>
                  <span className="pr-name">{ingameName(p.lpId)}</span>
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
