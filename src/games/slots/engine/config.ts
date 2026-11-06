/**
 * The numbers that set how often things happen and how much they pay. They
 * were tuned with `simulate` so the machine returns about 94% of what's bet.
 * Change one and rerun the RTP test (engine/rtp.test.ts) to check the total.
 */
import { cash, jackpot, type Prize } from './prizes';
import { table } from './rng';
import type { Sym } from './symbols';

type Weights = readonly (readonly [Sym, number])[];

const LOW: Weights = [
  ['ribs', 4],
  ['burger', 5],
  ['hotdog', 6],
  ['chicken', 7],
  ['coffee', 8],
  ['A', 11],
  ['K', 11],
  ['Q', 13],
  ['J', 13],
];

/** How likely each symbol is in each square, per reel. Greg is only on reel 1, wilds and gems only on 2–5. */
export const REEL_WEIGHTS = [
  table<Sym>([...LOW, ['scatter', 2.2], ['greg', 0.6]]),
  ...Array.from({ length: 4 }, () => table<Sym>([...LOW, ['wild', 4.1], ['scatter', 2.2], ['gem', 2.5]])),
];

/** Chance the Greg Bonus starts anyway when gems land without Greg. */
export const RANDOM_BONUS_CHANCE = 0.005;
/** Chance a spin showing at least one wild starts the jackpot pick game. */
export const JACKPOT_CHANCE = 0.0025;
/** Chance 1 or 2 scatters start Free Games anyway (with the 3-scatter prize). */
export const RANDOM_FREE_GAMES_CHANCE = 0.002;

export const FREE_GAMES = 6;
/** Instant prize for 3, 4 and 5 scatters. */
export const SCATTER_PAYS = [2, 10, 50] as const;

/** What a gem on the base reels shows. */
export const GEM_PRIZES = table<Prize>([
  [cash(0.5), 20],
  [cash(1), 25],
  [cash(2), 20],
  [cash(3), 12],
  [cash(5), 10],
  [cash(10), 6],
  [cash(20), 3],
  [cash(50), 1.2],
  [cash(100), 0.4],
  [jackpot('mini'), 1.5],
  [jackpot('minor'), 0.5],
  [jackpot('maxi'), 0.12],
  [jackpot('major'), 0.03],
  [jackpot('grand'), 0.008],
]);

/** What coins and diamonds show in the Greg Bonus. Only Mini and Minor jackpots land here. */
export const BOARD_PRIZES = table<Prize>([
  [cash(0.5), 24],
  [cash(1), 26],
  [cash(2), 20],
  [cash(3), 12],
  [cash(5), 9],
  [cash(10), 5],
  [cash(20), 2],
  [cash(50), 0.6],
  [cash(100), 0.2],
  [jackpot('mini'), 1],
  [jackpot('minor'), 0.3],
]);

export const BONUS_START_SPINS = 5;
/** Chance per square per spin that a coin lands. */
export const COIN_CHANCE = 0.032;
/** Chance per square per spin that a diamond lands (until Greg fills the board). */
export const DIAMOND_CHANCE = 0.025;
/** Mo Mike: chance a coin or diamond lands doubled. */
export const DOUBLE_CHANCE = 0.3;
/** Mo Scott: chance a coin or diamond carries "+1 Spin". */
export const SPIN_TAG_CHANCE = 0.12;
/** Go Greg: chance per spin of a bonus prize on something Greg collected. */
export const BOOST_CHANCE = 0.3;
export const BOOST_PRIZES = table<number>([
  [1, 30],
  [2, 25],
  [3, 18],
  [5, 14],
  [10, 8],
  [20, 4],
  [50, 1],
]);

/** Jackpot pick game: how likely each jackpot is to be the one that's matched. */
export const PICK_WEIGHTS = table([
  ['mini', 60],
  ['minor', 28],
  ['maxi', 9],
  ['major', 2.5],
  ['grand', 0.5],
] as const);
