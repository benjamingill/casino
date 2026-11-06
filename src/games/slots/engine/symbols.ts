/** Symbols that pay on a payline, best first. */
export const PAYING = ['ribs', 'burger', 'hotdog', 'chicken', 'coffee', 'A', 'K', 'Q', 'J'] as const;
export type PayingSymbol = (typeof PAYING)[number];

/**
 * Every base-game symbol. `wild` stands in for paying symbols only. `scatter`
 * starts Free Games. `greg` (reel 1 only) and `gem` (reels 2–5) start the Greg Bonus.
 */
export type Sym = PayingSymbol | 'wild' | 'scatter' | 'greg' | 'gem';

/** Pays for 3, 4 and 5 in a row, as multiples of the total bet. */
export const PAYTABLE: Record<PayingSymbol, readonly [number, number, number]> = {
  ribs: [2.5, 10, 25],
  burger: [2, 6, 15],
  hotdog: [1.5, 5, 12],
  chicken: [1.2, 4, 10],
  coffee: [1, 3, 8],
  A: [0.5, 1.5, 4],
  K: [0.5, 1.5, 4],
  Q: [0.3, 1, 2.5],
  J: [0.3, 1, 2.5],
};

export const isPaying = (s: Sym): s is PayingSymbol => s in PAYTABLE;

/** Each gem colour turns on one Greg Bonus extra. */
export type GemColor = 'green' | 'red' | 'blue';
export const GEM_COLORS: readonly GemColor[] = ['green', 'red', 'blue'];

export interface Extras {
  /** Green: some coins and diamonds carry "+1 Spin". */
  moScott: boolean;
  /** Red: an 8×5 board, and Greg can grow to fill it. Adds bonus prizes inside Greg. */
  goGreg: boolean;
  /** Blue: two coins or two diamonds can land in one square. */
  moMike: boolean;
}

export const EXTRA_FOR: Record<GemColor, keyof Extras> = { green: 'moScott', red: 'goGreg', blue: 'moMike' };
