/** A random number source: returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

/** A repeatable random source (mulberry32), for tests and simulations. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 0 to n − 1. */
export const randomInt = (rng: Rng, n: number) => Math.floor(rng() * n);

/** A list of choices with relative weights, ready for `draw`. */
export interface Table<T> {
  readonly items: readonly T[];
  readonly weights: readonly number[];
  readonly total: number;
}

export function table<T>(entries: readonly (readonly [T, number])[]): Table<T> {
  const items = entries.map(([item]) => item);
  const weights = entries.map(([, w]) => w);
  return { items, weights, total: weights.reduce((a, b) => a + b, 0) };
}

/** Picks one item from `t`, in proportion to its weight. */
export function draw<T>(rng: Rng, t: Table<T>): T {
  let r = rng() * t.total;
  for (let i = 0; i < t.items.length; i++) {
    r -= t.weights[i] as number;
    if (r < 0) return t.items[i] as T;
  }
  return t.items[t.items.length - 1] as T;
}

/** A shuffled copy. */
export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
