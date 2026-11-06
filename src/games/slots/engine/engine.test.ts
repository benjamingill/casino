import { describe, expect, it } from 'vitest';
import { growthSteps, playBonus } from './bonus';
import { createMachine, setCredits, setDenom, spin } from './machine';
import { emptyPicks, PICK_COINS, pickCoin, pickDone, startPick } from './pick';
import { cash, jackpot, TIERS } from './prizes';
import { seeded } from './rng';
import { type Cell, evaluate, type Gem, type Grid, lineWins } from './spin';
import type { Sym } from './symbols';

/** Never passes a random-chance check. */
const never = () => 0.999;

/** Builds a grid from three rows of five symbols, top row first. */
const grid = (...rows: Sym[][]): Grid =>
  Array.from({ length: 5 }, (_, reel) => rows.map((r): Cell => ({ sym: r[reel] as Sym })));

const filler: Sym[] = ['J', 'Q', 'K', 'A', 'coffee'];

describe('line wins', () => {
  it('pays matching symbols left to right', () => {
    const wins = lineWins(grid(filler, ['ribs', 'ribs', 'ribs', 'ribs', 'ribs'], filler));
    expect(wins).toContainEqual({ line: 0, sym: 'ribs', count: 5, pay: 25 });
  });

  it('lets wilds stand in, but not start a line', () => {
    const wins = lineWins(grid(filler, ['hotdog', 'wild', 'hotdog', 'wild', 'J'], filler));
    expect(wins).toContainEqual({ line: 0, sym: 'hotdog', count: 4, pay: 5 });
  });

  it('needs 3 in a row from reel 1', () => {
    expect(lineWins(grid(filler, ['K', 'K', 'Q', 'K', 'K'], filler)).find((w) => w.line === 0)).toBeUndefined();
    expect(lineWins(grid(filler, ['greg', 'K', 'K', 'K', 'K'], filler)).find((w) => w.line === 0)).toBeUndefined();
  });
});

describe('features', () => {
  it('awards Free Games and an instant prize for scatters', () => {
    const three = evaluate(grid(['scatter', 'J', 'scatter', 'Q', 'scatter'], filler, filler), never);
    expect(three).toMatchObject({ scatters: 3, freeGames: 6, scatterPay: 2 });
    const five = evaluate(grid(['scatter', 'scatter', 'scatter', 'scatter', 'scatter'], filler, filler), never);
    expect(five).toMatchObject({ freeGames: 6, scatterPay: 50 });
    expect(evaluate(grid(['scatter', 'J', 'scatter', 'Q', 'K'], filler, filler), never).freeGames).toBe(0);
  });

  it('starts the Greg Bonus when Greg lands with a gem', () => {
    const g = grid(['greg', 'gem', 'J', 'Q', 'K'], filler, filler) as Cell[][];
    (g[1] as Cell[])[0] = { sym: 'gem', gem: { color: 'red', prize: cash(5) } };
    expect(evaluate(g, never).bonus).toEqual({ gems: [{ color: 'red', prize: cash(5) }], random: false });

    (g[0] as Cell[])[0] = { sym: 'J' };
    expect(evaluate(g, never).bonus).toBeNull();
  });
});

describe('Greg Bonus', () => {
  const gems = (n: number, color: Gem['color'] = 'green'): Gem[] =>
    Array.from({ length: n }, () => ({ color, prize: cash(1) }));

  it('plays until the spins run out and adds up every spin', () => {
    const run = playBonus({ gems: gems(1), random: false }, seeded(1));
    const last = run.frames[run.frames.length - 1];
    expect(last?.spinsLeft).toBe(0);
    expect(run.total).toBeCloseTo(run.frames.reduce((s, f) => s + f.win, 0));
    expect(run.frames[0]?.size).toEqual({ w: 2, h: 2 });
  });

  it('turns on the extras for each gem colour', () => {
    const run = playBonus({ gems: [...gems(1, 'red'), ...gems(1, 'blue')], random: false }, seeded(2));
    expect(run.extras).toEqual({ moScott: false, goGreg: true, moMike: true });
    expect(run.cols).toBe(8);
    expect(playBonus({ gems: gems(1), random: false }, seeded(2)).cols).toBe(5);
  });

  it('grows Greg as diamonds are collected', () => {
    const run = playBonus({ gems: gems(5), random: false }, seeded(3));
    expect(run.frames[0]).toMatchObject({ size: { w: 3, h: 3 }, spinsLeft: 8, grew: true, total: 5 });
    for (const f of run.frames) {
      const reached = growthSteps(run.cols).filter((g) => f.diamonds >= g.at);
      expect(f.size).toEqual(reached[reached.length - 1]?.size ?? { w: 2, h: 2 });
    }
  });

  it('collects coins only inside Greg, and diamonds anywhere', () => {
    const run = playBonus({ gems: gems(1), random: false }, seeded(4));
    for (const f of run.frames.slice(1)) {
      f.board.forEach((c, i) => {
        if (!c) return;
        const x = i % run.cols;
        const y = Math.floor(i / run.cols);
        const inside = x >= f.greg.x && x < f.greg.x + f.size.w && y >= f.greg.y && y < f.greg.y + f.size.h;
        expect(c.collected).toBe(c.kind === 'diamond' || inside);
      });
    }
  });

  it('records jackpots won', () => {
    const run = playBonus({ gems: [{ color: 'green', prize: jackpot('grand') }], random: false }, seeded(5));
    expect(run.jackpots).toContain('grand');
    expect(run.total).toBeGreaterThanOrEqual(2000);
  });
});

describe('jackpot pick game', () => {
  it('ends on the third match of the winner, with no other jackpot shown 3 times', () => {
    for (let seed = 0; seed < 200; seed++) {
      const game = startPick(seeded(seed));
      expect(game.sequence.length).toBeLessThanOrEqual(PICK_COINS);
      expect(game.sequence[game.sequence.length - 1]).toBe(game.winner);
      for (const t of TIERS) {
        const n = game.sequence.filter((s) => s === t).length;
        expect(n).toBe(t === game.winner ? 3 : Math.min(n, 2));
      }
    }
  });

  it('reveals coins in order until the winner matches 3 times', () => {
    const game = startPick(seeded(7));
    let revealed = emptyPicks();
    for (let i = 0; i < PICK_COINS && !pickDone(game, revealed); i++) revealed = pickCoin(game, revealed, i);
    expect(pickDone(game, revealed)).toBe(true);
    expect(revealed.filter((t) => t !== null)).toEqual(game.sequence);
    expect(pickCoin(game, revealed, PICK_COINS - 1)).toBe(revealed);
  });
});

describe('machine', () => {
  it('charges the bet and pays wins', () => {
    const out = spin(createMachine(100, 0.02, 100), seeded(8));
    expect(out?.machine.bankroll).toBeCloseTo(100 - 2 + (out?.result.total ?? 0));
  });

  it("won't spin without enough money", () => {
    expect(spin(createMachine(1, 0.02, 100), seeded(9))).toBeNull();
  });

  it('plays Free Games without charging, at the bet that started them', () => {
    const m = { ...createMachine(100, 0.02, 100), freeGames: { left: 2, played: 4, won: 10 } };
    expect(setCredits(m, 250)).toBe(m);
    expect(setDenom(m, 1)).toBe(m);
    const out = spin(m, seeded(10));
    expect(out?.result.paid).toBe(false);
    expect(out?.machine.bankroll).toBeCloseTo(100 + (out?.result.total ?? 0));
    expect(out?.machine.freeGames?.played).toBe(5);
  });
});
