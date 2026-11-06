import { isRecord, mergeDefaults, roundCents } from '../../shared';
import { type GameState, roundNet } from './engine/game';
import type { Category, Decision } from './engine/trainer';

export interface Tally {
  decisions: number;
  correct: number;
}

export interface Stats {
  decisions: number;
  correct: number;
  byCategory: Record<Category, Tally>;
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  net: number;
  /** Most recent first. */
  mistakes: Omit<Decision, 'correct' | 'category'>[];
}

const MAX_MISTAKES = 25;

export function emptyStats(): Stats {
  const t = (): Tally => ({ decisions: 0, correct: 0 });
  return {
    decisions: 0,
    correct: 0,
    byCategory: { hard: t(), soft: t(), pair: t(), insurance: t() },
    rounds: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    net: 0,
    mistakes: [],
  };
}

export function recordDecision(stats: Stats, d: Decision): Stats {
  const cat = stats.byCategory[d.category];
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.correct ? 1 : 0),
    byCategory: {
      ...stats.byCategory,
      [d.category]: { decisions: cat.decisions + 1, correct: cat.correct + (d.correct ? 1 : 0) },
    },
    mistakes: d.correct
      ? stats.mistakes
      : [{ situation: d.situation, chosen: d.chosen, recommended: d.recommended }, ...stats.mistakes].slice(
          0,
          MAX_MISTAKES,
        ),
  };
}

export function recordRound(stats: Stats, s: GameState): Stats {
  const count = (...outcomes: string[]) => s.hands.filter((h) => outcomes.includes(h.outcome ?? '')).length;
  return {
    ...stats,
    rounds: stats.rounds + 1,
    wins: stats.wins + count('win', 'blackjack'),
    losses: stats.losses + count('lose', 'bust', 'surrender'),
    pushes: stats.pushes + count('push'),
    net: roundCents(stats.net + roundNet(s)),
  };
}

type Mistake = Stats['mistakes'][number];
const isMistake = (v: unknown): v is Mistake =>
  isRecord(v) && typeof v.situation === 'string' && typeof v.chosen === 'string' && typeof v.recommended === 'string';

/**
 * Stats from saved data. Fills in anything missing, so data saved before a new
 * field or hand category was added still loads.
 */
export function parseStats(saved: unknown): Stats {
  const base = emptyStats();
  if (!isRecord(saved)) return base;
  const savedCats = isRecord(saved.byCategory) ? saved.byCategory : {};
  const byCategory = { ...base.byCategory };
  for (const cat of Object.keys(byCategory) as Category[]) {
    byCategory[cat] = mergeDefaults(base.byCategory[cat], savedCats[cat]);
  }
  return {
    ...mergeDefaults(base, saved),
    byCategory,
    mistakes: Array.isArray(saved.mistakes) ? saved.mistakes.filter(isMistake).slice(0, MAX_MISTAKES) : [],
  };
}
