import { PICK_WEIGHTS } from './config';
import { TIERS, type Tier } from './prizes';
import { draw, type Rng, randomInt, shuffle } from './rng';

export const PICK_COINS = 12;

/**
 * The jackpot pick game. The winning jackpot is decided when it starts;
 * picking coins only reveals it. `sequence` is what each pick turns over, in
 * order, ending on the winner's third match. No other jackpot shows 3 times.
 */
export interface PickGame {
  winner: Tier;
  sequence: Tier[];
}

export function startPick(rng: Rng): PickGame {
  const winner = draw(rng, PICK_WEIGHTS);
  const others = TIERS.filter((t) => t !== winner).flatMap((t) => Array<Tier>(randomInt(rng, 3)).fill(t));
  return { winner, sequence: [...shuffle(rng, [...others, winner, winner]), winner] };
}

/** `revealed[i]` is the jackpot under coin i, or null if it hasn't been picked. */
export type Revealed = readonly (Tier | null)[];

export const emptyPicks = (): Revealed => Array(PICK_COINS).fill(null);

/** Turns over coin `index`. */
export function pickCoin(game: PickGame, revealed: Revealed, index: number): Revealed {
  if (pickDone(game, revealed) || revealed[index] !== null || index < 0 || index >= PICK_COINS) return revealed;
  const count = revealed.filter((t) => t !== null).length;
  const next = [...revealed];
  next[index] = game.sequence[count] ?? game.winner;
  return next;
}

export const pickDone = (game: PickGame, revealed: Revealed) => revealed.filter((t) => t === game.winner).length >= 3;
