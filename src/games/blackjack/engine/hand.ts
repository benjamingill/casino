import { at } from '../../../shared';
import { type Card, pointValue } from './cards';

export interface HandValue {
  total: number;
  /** True when an ace is being counted as 11. */
  soft: boolean;
}

export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === 'A') {
      aces++;
      total += 1;
    } else {
      total += pointValue(c.rank);
    }
  }
  if (aces > 0 && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;

/** Two cards of equal value. Any two ten-value cards count (e.g. K + Q). */
export const isPair = (cards: Card[]) =>
  cards.length === 2 && pointValue(at(cards, 0).rank) === pointValue(at(cards, 1).rank);

/** `fromSplit`: a two-card 21 after a split is just 21, not a blackjack. */
export function formatTotal(cards: Card[], fromSplit = false): string {
  const { total, soft } = handValue(cards);
  if (total > 21) return `Bust (${total})`;
  if (!fromSplit && isBlackjack(cards)) return 'Blackjack';
  return soft && total < 21 ? `Soft ${total}` : String(total);
}
