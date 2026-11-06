import {
  BOARD_PRIZES,
  BONUS_START_SPINS,
  BOOST_CHANCE,
  BOOST_PRIZES,
  COIN_CHANCE,
  DIAMOND_CHANCE,
  DOUBLE_CHANCE,
  SPIN_TAG_CHANCE,
} from './config';
import { type Prize, prizeMult, type Tier } from './prizes';
import { draw, type Rng, randomInt, shuffle } from './rng';
import type { BonusTrigger } from './spin';
import { EXTRA_FOR, type Extras } from './symbols';

export interface Size {
  w: number;
  h: number;
}

interface Growth {
  /** Total diamonds collected to reach this size. */
  at: number;
  size: Size;
  spins: number;
}

const GROWTH: readonly Growth[] = [
  { at: 5, size: { w: 3, h: 3 }, spins: 3 },
  { at: 9, size: { w: 4, h: 4 }, spins: 2 },
  { at: 12, size: { w: 5, h: 5 }, spins: 1 },
  // Go Greg only: the board is 8 wide.
  { at: 15, size: { w: 6, h: 5 }, spins: 1 },
  { at: 18, size: { w: 7, h: 5 }, spins: 1 },
  { at: 21, size: { w: 8, h: 5 }, spins: 1 },
];

export interface BoardCell {
  kind: 'coin' | 'diamond';
  /** Two with Mo Mike's doubles. */
  prizes: Prize[];
  /** Mo Scott: "+1 Spin" when collected. */
  spinTag: boolean;
  /** Greg took it. Diamonds are always collected; coins only inside Greg. */
  collected: boolean;
  /** Go Greg bonus prize added to this cell. */
  boost: number;
}

/** The board after one spin of the Greg Bonus (or at the start, showing the triggering gems). */
export interface BonusFrame {
  /** Index `y * cols + x`. */
  board: (BoardCell | null)[];
  /** Greg's top-left square. */
  greg: { x: number; y: number };
  size: Size;
  /** He grew on this spin. */
  grew: boolean;
  diamonds: number;
  spinsLeft: number;
  /** Collected on this spin, as a multiple of the bet. */
  win: number;
  /** Collected so far. */
  total: number;
}

export interface BonusRun {
  cols: number;
  rows: number;
  extras: Extras;
  /** Frame 0 is the start; each later frame is one spin. */
  frames: BonusFrame[];
  /** The whole bonus, as a multiple of the bet. */
  total: number;
  jackpots: Tier[];
}

export const growthSteps = (cols: number) => GROWTH.filter((g) => g.size.w <= cols);

/** The next size Greg is working towards, if any. */
export function nextGrowth(run: BonusRun, frame: BonusFrame): Growth | undefined {
  return growthSteps(run.cols).find((g) => g.at > frame.diamonds);
}

const cellValue = (c: BoardCell) => c.prizes.reduce((sum, p) => sum + prizeMult(p), 0) + c.boost;

/** Plays the whole Greg Bonus. */
export function playBonus(trigger: BonusTrigger, rng: Rng): BonusRun {
  const extras: Extras = { moScott: false, goGreg: false, moMike: false };
  for (const g of trigger.gems) extras[EXTRA_FOR[g.color]] = true;
  const cols = extras.goGreg ? 8 : 5;
  const rows = 5;
  const steps = growthSteps(cols);
  const jackpots: Tier[] = [];
  const noteJackpots = (c: BoardCell) => {
    for (const p of c.prizes) if (p.kind === 'jackpot') jackpots.push(p.tier);
  };

  let size: Size = { w: 2, h: 2 };
  let diamonds = 0;
  let spinsLeft = BONUS_START_SPINS;
  let total = 0;

  /** Grows Greg for any thresholds reached. Returns true if he grew. */
  const grow = () => {
    let grew = false;
    for (const g of steps) {
      if (diamonds >= g.at && g.size.w * g.size.h > size.w * size.h) {
        size = g.size;
        spinsLeft += g.spins;
        grew = true;
      }
    }
    return grew;
  };
  const place = () => ({ x: randomInt(rng, cols - size.w + 1), y: randomInt(rng, rows - size.h + 1) });

  // The triggering gems become diamonds, already collected. Twelve gems at most, so they always fit.
  const start: (BoardCell | null)[] = Array(cols * rows).fill(null);
  const spots = shuffle(
    rng,
    start.map((_, i) => i),
  );
  trigger.gems.forEach((g, i) => {
    const cell: BoardCell = { kind: 'diamond', prizes: [g.prize], spinTag: false, collected: true, boost: 0 };
    start[spots[i] as number] = cell;
    total += cellValue(cell);
    noteJackpots(cell);
  });
  diamonds = trigger.gems.length;
  const grewAtStart = grow();
  let greg = place();
  const frames: BonusFrame[] = [
    { board: start, greg, size, grew: grewAtStart, diamonds, spinsLeft, win: total, total },
  ];

  while (spinsLeft > 0) {
    spinsLeft--;
    greg = place();
    const full = size.w === cols && size.h === rows;
    const board: (BoardCell | null)[] = [];
    const inside: BoardCell[] = [];
    let win = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const r = rng();
        const kind = !full && r < DIAMOND_CHANCE ? 'diamond' : r < DIAMOND_CHANCE + COIN_CHANCE ? 'coin' : null;
        if (!kind) {
          board.push(null);
          continue;
        }
        const prizes = [draw(rng, BOARD_PRIZES)];
        if (extras.moMike && rng() < DOUBLE_CHANCE) prizes.push(draw(rng, BOARD_PRIZES));
        const isInside = x >= greg.x && x < greg.x + size.w && y >= greg.y && y < greg.y + size.h;
        const cell: BoardCell = {
          kind,
          prizes,
          spinTag: extras.moScott && rng() < SPIN_TAG_CHANCE,
          collected: kind === 'diamond' || isInside,
          boost: 0,
        };
        board.push(cell);
        if (isInside) inside.push(cell);
      }
    }
    if (extras.goGreg && inside.length > 0 && rng() < BOOST_CHANCE) {
      (inside[randomInt(rng, inside.length)] as BoardCell).boost = draw(rng, BOOST_PRIZES);
    }
    for (const cell of board) {
      if (!cell?.collected) continue;
      win += cellValue(cell);
      noteJackpots(cell);
      if (cell.spinTag) spinsLeft++;
      if (cell.kind === 'diamond') diamonds++;
    }
    total += win;
    const grew = grow();
    frames.push({ board, greg, size, grew, diamonds, spinsLeft, win, total });
  }

  return { cols, rows, extras, frames, total, jackpots };
}
