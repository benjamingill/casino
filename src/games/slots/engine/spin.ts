import {
  FREE_GAMES,
  GEM_PRIZES,
  JACKPOT_CHANCE,
  RANDOM_BONUS_CHANCE,
  RANDOM_FREE_GAMES_CHANCE,
  REEL_WEIGHTS,
  SCATTER_PAYS,
} from './config';
import { PAYLINES, REELS, ROWS } from './paylines';
import type { Prize } from './prizes';
import { draw, type Rng, randomInt } from './rng';
import { GEM_COLORS, type GemColor, isPaying, PAYTABLE, type PayingSymbol, type Sym } from './symbols';

export interface Gem {
  color: GemColor;
  prize: Prize;
}

export interface Cell {
  sym: Sym;
  /** Only on gem cells. */
  gem?: Gem;
}

/** `grid[reel][row]`, row 0 at the top. */
export type Grid = readonly (readonly Cell[])[];

export interface LineWin {
  /** Index into PAYLINES. */
  line: number;
  sym: PayingSymbol;
  count: number;
  /** Multiple of the total bet. */
  pay: number;
}

export interface BonusTrigger {
  gems: Gem[];
  /** True when gems started it without Greg. */
  random: boolean;
}

export interface ReelResult {
  grid: Grid;
  lineWins: LineWin[];
  scatters: number;
  /** Instant scatter prize, as a multiple of the total bet. */
  scatterPay: number;
  /** Free Games awarded (0 if none). */
  freeGames: number;
  bonus: BonusTrigger | null;
  jackpot: boolean;
}

/** Symbols that appear at most once per reel. */
const ONCE_PER_REEL: ReadonlySet<Sym> = new Set(['scatter', 'greg']);

function drawReel(rng: Rng, reel: number): Cell[] {
  const weights = REEL_WEIGHTS[reel];
  if (!weights) throw new RangeError(`No reel ${reel}`);
  const cells: Cell[] = [];
  while (cells.length < ROWS) {
    const sym = draw(rng, weights);
    if (ONCE_PER_REEL.has(sym) && cells.some((c) => c.sym === sym)) continue;
    cells.push(
      sym === 'gem'
        ? {
            sym,
            gem: { color: GEM_COLORS[randomInt(rng, GEM_COLORS.length)] as GemColor, prize: draw(rng, GEM_PRIZES) },
          }
        : { sym },
    );
  }
  return cells;
}

export function drawGrid(rng: Rng): Grid {
  return Array.from({ length: REELS }, (_, reel) => drawReel(rng, reel));
}

const cellAt = (grid: Grid, reel: number, row: number) => grid[reel]?.[row]?.sym;

/** Line wins pay left to right from reel 1. Wilds never land on reel 1, so it sets the symbol. */
export function lineWins(grid: Grid): LineWin[] {
  const wins: LineWin[] = [];
  PAYLINES.forEach((rows, line) => {
    const first = cellAt(grid, 0, rows[0] as number);
    if (first === undefined || !isPaying(first)) return;
    let count = 1;
    while (count < REELS) {
      const s = cellAt(grid, count, rows[count] as number);
      if (s !== first && s !== 'wild') break;
      count++;
    }
    if (count >= 3) wins.push({ line, sym: first, count, pay: PAYTABLE[first][count - 3] as number });
  });
  return wins;
}

const allCells = (grid: Grid) => grid.flat();

/** Works out everything a base-game grid awards. */
export function evaluate(grid: Grid, rng: Rng): ReelResult {
  const cells = allCells(grid);
  const scatters = cells.filter((c) => c.sym === 'scatter').length;
  let freeGames = 0;
  let scatterPay = 0;
  if (scatters >= 3) {
    freeGames = FREE_GAMES;
    scatterPay = SCATTER_PAYS[Math.min(scatters, 5) - 3] as number;
  } else if (scatters > 0 && rng() < RANDOM_FREE_GAMES_CHANCE) {
    freeGames = FREE_GAMES;
    scatterPay = SCATTER_PAYS[0];
  }

  const gems = cells.flatMap((c) => (c.gem ? [c.gem] : []));
  const greg = grid[0]?.some((c) => c.sym === 'greg') ?? false;
  let bonus: BonusTrigger | null = null;
  if (gems.length > 0 && greg) bonus = { gems, random: false };
  else if (gems.length > 0 && rng() < RANDOM_BONUS_CHANCE) bonus = { gems, random: true };

  const jackpot = cells.some((c) => c.sym === 'wild') && rng() < JACKPOT_CHANCE;

  return { grid, lineWins: lineWins(grid), scatters, scatterPay, freeGames, bonus, jackpot };
}

export const spinReels = (rng: Rng): ReelResult => evaluate(drawGrid(rng), rng);
