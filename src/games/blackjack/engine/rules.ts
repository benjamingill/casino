import { mergeDefaults } from '../../../shared';

export const DOUBLE_ON = ['any', '9-11', '10-11'] as const;
export type DoubleOn = (typeof DOUBLE_ON)[number];
export const isDoubleOn = (v: unknown): v is DoubleOn => DOUBLE_ON.some((d) => d === v);

/** Values the rules panel offers. */
export const DECK_OPTIONS = [1, 2, 4, 6, 8] as const;
export const PAYOUT_OPTIONS = [1.5, 1.2] as const;
export const MAX_HANDS_OPTIONS = [2, 3, 4] as const;

export interface Rules {
  decks: number;
  dealerHitsSoft17: boolean;
  /** 1.5 for 3:2, 1.2 for 6:5. */
  blackjackPayout: number;
  doubleOn: DoubleOn;
  doubleAfterSplit: boolean;
  /** Most hands you can have after splitting (4 = resplit up to 4 hands). */
  maxHands: number;
  resplitAces: boolean;
  hitSplitAces: boolean;
  lateSurrender: boolean;
  insurance: boolean;
  /** Fraction of the shoe dealt before the cut card. */
  penetration: number;
}

/** Typical shoe game at a Northeast US casino. */
export const DEFAULT_RULES: Rules = {
  decks: 6,
  dealerHitsSoft17: true,
  blackjackPayout: 1.5,
  doubleOn: 'any',
  doubleAfterSplit: true,
  maxHands: 4,
  resplitAces: false,
  hitSplitAces: false,
  lateSurrender: true,
  insurance: true,
  penetration: 0.75,
};

const oneOf = (options: readonly number[], v: number, fallback: number) => (options.includes(v) ? v : fallback);

/** Rules from saved data. Anything missing, mistyped or out of range uses the default. */
export function parseRules(saved: unknown): Rules {
  const r = mergeDefaults(DEFAULT_RULES, saved);
  const d = DEFAULT_RULES;
  return {
    ...r,
    decks: oneOf(DECK_OPTIONS, r.decks, d.decks),
    blackjackPayout: oneOf(PAYOUT_OPTIONS, r.blackjackPayout, d.blackjackPayout),
    maxHands: oneOf(MAX_HANDS_OPTIONS, r.maxHands, d.maxHands),
    doubleOn: isDoubleOn(r.doubleOn) ? r.doubleOn : d.doubleOn,
    penetration: r.penetration > 0 && r.penetration <= 1 ? r.penetration : d.penetration,
  };
}

/** Whether the rules allow doubling on this total (ignores other conditions like card count). */
export function doubleAllowed(total: number, soft: boolean, rules: Rules): boolean {
  if (rules.doubleOn === 'any') return true;
  if (soft) return false;
  const low = rules.doubleOn === '9-11' ? 9 : 10;
  return total >= low && total <= 11;
}
