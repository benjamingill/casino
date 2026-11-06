/**
 * Basic strategy for 4–8 deck games, adjusted for the dealer soft-17 rule,
 * double after split, and late surrender.
 */
import { at } from '../../../shared';
import { type Card, pointValue, type Rank } from './cards';
import { handValue, isPair } from './hand';
import { doubleAllowed, type Rules } from './rules';

export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';

export interface Options {
  canDouble: boolean;
  canSplit: boolean;
  canSurrender: boolean;
}

/** Dh = double, otherwise hit. Ds = double, otherwise stand. */
type Play = 'H' | 'S' | 'Dh' | 'Ds';

const between = (up: number, lo: number, hi: number) => up >= lo && up <= hi;

/** `up` is the dealer upcard's point value, 2–11 (ace = 11). */
export function hardPlay(total: number, up: number, rules: Rules): Play {
  if (total <= 8) return 'H';
  if (total === 9) return between(up, 3, 6) ? 'Dh' : 'H';
  if (total === 10) return between(up, 2, 9) ? 'Dh' : 'H';
  if (total === 11) return up <= 10 || rules.dealerHitsSoft17 ? 'Dh' : 'H';
  if (total === 12) return between(up, 4, 6) ? 'S' : 'H';
  if (total <= 16) return between(up, 2, 6) ? 'S' : 'H';
  return 'S';
}

export function softPlay(total: number, up: number, rules: Rules): Play {
  switch (total) {
    case 13:
    case 14:
      return between(up, 5, 6) ? 'Dh' : 'H';
    case 15:
    case 16:
      return between(up, 4, 6) ? 'Dh' : 'H';
    case 17:
      return between(up, 3, 6) ? 'Dh' : 'H';
    case 18:
      if (between(up, rules.dealerHitsSoft17 ? 2 : 3, 6)) return 'Ds';
      return up <= 8 ? 'S' : 'H';
    case 19:
      return up === 6 && rules.dealerHitsSoft17 ? 'Ds' : 'S';
    default:
      return total <= 12 ? 'H' : 'S';
  }
}

/** `pairValue` is the point value of each card in the pair (ace = 11). */
export function shouldSplit(pairValue: number, up: number, rules: Rules): boolean {
  const das = rules.doubleAfterSplit;
  switch (pairValue) {
    case 11:
    case 8:
      return true;
    case 10:
    case 5:
      return false;
    case 9:
      return between(up, 2, 6) || up === 8 || up === 9;
    case 7:
      return between(up, 2, 7);
    case 6:
      return between(up, das ? 2 : 3, 6);
    case 4:
      return das && between(up, 5, 6);
    default: // 2s and 3s
      return between(up, das ? 2 : 4, 7);
  }
}

/** Late surrender for hard totals (not pairs). */
export function surrenderHard(total: number, up: number, rules: Rules): boolean {
  const h17 = rules.dealerHitsSoft17;
  if (total === 16) return up >= 9;
  if (total === 15) return up === 10 || (up === 11 && h17);
  if (total === 17) return up === 11 && h17;
  return false;
}

export function shouldSurrender(cards: Card[], up: number, rules: Rules): boolean {
  if (cards.length !== 2) return false;
  if (isPair(cards)) return pointValue(at(cards, 0).rank) === 8 && up === 11 && rules.dealerHitsSoft17;
  const { total, soft } = handValue(cards);
  return !soft && surrenderHard(total, up, rules);
}

/** The basic strategy play for this hand, given which moves are available right now. */
export function recommend(cards: Card[], upcard: Rank, rules: Rules, opts: Options): Action {
  const up = pointValue(upcard);
  if (opts.canSurrender && shouldSurrender(cards, up, rules)) return 'surrender';
  if (opts.canSplit && isPair(cards) && shouldSplit(pointValue(at(cards, 0).rank), up, rules)) return 'split';
  const { total, soft } = handValue(cards);
  const play = soft ? softPlay(total, up, rules) : hardPlay(total, up, rules);
  if (play === 'Dh') return opts.canDouble ? 'double' : 'hit';
  if (play === 'Ds') return opts.canDouble ? 'double' : 'stand';
  return play === 'H' ? 'hit' : 'stand';
}

// ---- Strategy chart (for display) ----

/** D = double else hit, Ds = double else stand, R = surrender else hit, Rs = surrender else stand, Rp = surrender else split. */
export type ChartCell = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'R' | 'Rs' | 'Rp';

export interface ChartRow {
  key: string;
  label: string;
  cells: ChartCell[];
}

export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function playCell(play: Play, total: number, soft: boolean, rules: Rules): ChartCell {
  const canDouble = doubleAllowed(total, soft, rules);
  if (play === 'Dh') return canDouble ? 'D' : 'H';
  if (play === 'Ds') return canDouble ? 'Ds' : 'S';
  return play;
}

function hardCell(total: number, up: number, rules: Rules): ChartCell {
  if (rules.lateSurrender && surrenderHard(total, up, rules)) return total === 17 ? 'Rs' : 'R';
  return playCell(hardPlay(total, up, rules), total, false, rules);
}

export function strategyChart(rules: Rules): { title: string; rows: ChartRow[] }[] {
  const hard: ChartRow[] = [];
  for (let t = 8; t <= 17; t++) {
    hard.push({
      key: `hard-${t}`,
      label: t === 8 ? '8 or less' : t === 17 ? '17+' : String(t),
      cells: UPCARDS.map((up) => hardCell(t, up, rules)),
    });
  }
  const soft: ChartRow[] = [];
  // Soft 12 is A,A when it can't be split (for example, after the most splits allowed).
  for (let t = 12; t <= 20; t++) {
    soft.push({
      key: `soft-${t}`,
      label: t === 12 ? 'A,A' : `A,${t - 11}`,
      cells: UPCARDS.map((up) => playCell(softPlay(t, up, rules), t, true, rules)),
    });
  }
  const pairs: ChartRow[] = [];
  for (let v = 2; v <= 11; v++) {
    pairs.push({
      key: `pair-${v}`,
      label: v === 11 ? 'A,A' : `${v},${v}`,
      cells: UPCARDS.map((up): ChartCell => {
        if (v === 8 && up === 11 && rules.lateSurrender && rules.dealerHitsSoft17) return 'Rp';
        if (shouldSplit(v, up, rules)) return 'P';
        return v === 11 ? 'H' : hardCell(v * 2, up, rules);
      }),
    });
  }
  return [
    { title: 'Hard totals', rows: hard },
    { title: 'Soft totals', rows: soft },
    { title: 'Pairs', rows: pairs },
  ];
}

/** The chart row a hand belongs to, so it can be highlighted. */
export function chartKey(cards: Card[], canSplit: boolean): string {
  if (canSplit && isPair(cards)) return `pair-${pointValue(at(cards, 0).rank)}`;
  const { total, soft } = handValue(cards);
  if (soft && total >= 12 && total <= 20) return `soft-${total}`;
  return `hard-${Math.min(Math.max(total, 8), 17)}`;
}
