export function formatPoints(pts: number): string {
  return pts >= 1000 ? `${(pts / 1000).toFixed(1)}k` : pts.toString();
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

export function getQueueLabel(queueId: number): string {
  const labels: Record<number, string> = {
    420: 'Classé Solo',
    440: 'Classé Flex',
    400: 'Normal Draft',
    450: 'ARAM',
    700: 'Clash',
    490: 'Normale',
    900: 'URF',
  };
  return labels[queueId] ?? 'Partie';
}

export function computeKda(kills: number, deaths: number, assists: number): string {
  if (deaths === 0) return 'Perfect';
  return ((kills + assists) / deaths).toFixed(2);
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses;
  return total > 0 ? Math.round((wins / total) * 100) : 0;
}
