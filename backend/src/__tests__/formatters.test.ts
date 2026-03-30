import { describe, it, expect } from 'vitest';
import { formatPoints, formatDuration, getQueueLabel, computeKda, winRate } from '../utils/formatters';

describe('formatPoints', () => {
  it('retourne le nombre brut en dessous de 1000', () => {
    expect(formatPoints(500)).toBe('500');
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(999)).toBe('999');
  });

  it('formate 1500 en 1.5k', () => {
    expect(formatPoints(1500)).toBe('1.5k');
  });

  it('formate exactement 1000 en 1.0k', () => {
    expect(formatPoints(1000)).toBe('1.0k');
  });

  it('formate les grandes valeurs correctement', () => {
    expect(formatPoints(250000)).toBe('250.0k');
  });
});

describe('formatDuration', () => {
  it('formate 125 secondes en 2m05s', () => {
    expect(formatDuration(125)).toBe('2m05s');
  });

  it('ajoute un zéro devant les secondes < 10', () => {
    expect(formatDuration(65)).toBe('1m05s');
  });

  it('gère les minutes exactes', () => {
    expect(formatDuration(120)).toBe('2m00s');
  });

  it('gère 0 seconde', () => {
    expect(formatDuration(0)).toBe('0m00s');
  });

  it('formate une partie de 30 minutes', () => {
    expect(formatDuration(1800)).toBe('30m00s');
  });
});

describe('getQueueLabel', () => {
  it('retourne le label pour le Classé Solo (420)', () => {
    expect(getQueueLabel(420)).toBe('Classé Solo');
  });

  it('retourne le label pour le Classé Flex (440)', () => {
    expect(getQueueLabel(440)).toBe('Classé Flex');
  });

  it('retourne le label pour ARAM (450)', () => {
    expect(getQueueLabel(450)).toBe('ARAM');
  });

  it('retourne "Partie" pour une queue inconnue', () => {
    expect(getQueueLabel(9999)).toBe('Partie');
  });
});

describe('computeKda', () => {
  it('calcule correctement le KDA', () => {
    expect(computeKda(5, 2, 8)).toBe('6.50');
  });

  it('retourne "Perfect" si 0 mort', () => {
    expect(computeKda(10, 0, 5)).toBe('Perfect');
  });

  it('gère 0 kills et 0 assists', () => {
    expect(computeKda(0, 3, 0)).toBe('0.00');
  });
});

describe('winRate', () => {
  it('calcule le taux de victoire correctement', () => {
    expect(winRate(7, 3)).toBe(70);
  });

  it('retourne 0 si aucune partie jouée', () => {
    expect(winRate(0, 0)).toBe(0);
  });

  it('retourne 100 si toutes les parties sont gagnées', () => {
    expect(winRate(10, 0)).toBe(100);
  });

  it('arrondit au pourcentage entier', () => {
    expect(winRate(1, 3)).toBe(25);
  });
});
