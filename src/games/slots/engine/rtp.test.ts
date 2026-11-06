import { expect, it } from 'vitest';
import { seeded } from './rng';
import { simulate } from './simulate';

/**
 * Tuned to about 94% over 12 million spins, with the Greg Bonus about 1 in 120. One million spins still swing by
 * a point or two (big bonuses and jackpots are rare), so the range is wide.
 * The seed is fixed, so this only fails when the payout numbers change.
 */
it('returns about 94% of what is bet', () => {
  const r = simulate(1_000_000, seeded(42));
  expect(r.rtp.total).toBeGreaterThan(0.91);
  expect(r.rtp.total).toBeLessThan(0.98);
  expect(r.rtp.lines).toBeGreaterThan(0.56);
  expect(r.rtp.lines).toBeLessThan(0.6);
  expect(r.every.bonus).toBeGreaterThan(100);
  expect(r.every.bonus).toBeLessThan(145);
}, 60_000);
