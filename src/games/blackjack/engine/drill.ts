/** Drill mode: deals only the hands people most often get wrong. */
import type { Scenario } from './game';

const rand = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

/** Two different non-ace cards adding up to a total in [lo, hi]. */
function twoCardTotal(lo: number, hi: number): [number, number] {
  for (;;) {
    const a = rand(2, 10);
    const b = rand(2, 10);
    if (a !== b && a + b >= lo && a + b <= hi) return [a, b];
  }
}

export function randomScenario(): Scenario {
  const up = rand(2, 11);
  switch (rand(0, 3)) {
    case 0: // soft hands
      return { player: [11, rand(2, 9)], up };
    case 1: {
      // pairs
      const v = rand(2, 11);
      return { player: [v, v], up };
    }
    case 2: // stiff hands: hard 12–16
      return { player: twoCardTotal(12, 16), up };
    default: // doubling hands: hard 9–11
      return { player: twoCardTotal(9, 11), up };
  }
}
