import { at } from '../../../shared';

export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Blackjack value of a rank, counting an ace as 11. */
export function pointValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

export const isRed = (suit: Suit) => suit === '♥' || suit === '♦';

export interface Shoe {
  cards: Card[];
  position: number;
  /** When `position` reaches this, the shoe is reshuffled before the next round. */
  cutIndex: number;
  decks: number;
  penetration: number;
}

export function buildDecks(decks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
  }
  return cards;
}

/** Fisher–Yates shuffle, in place. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = at(arr, i);
    arr[i] = at(arr, j);
    arr[j] = tmp;
  }
  return arr;
}

export function newShoe(decks: number, penetration: number, rng: () => number = Math.random): Shoe {
  const cards = shuffle(buildDecks(decks), rng);
  return { cards, position: 0, cutIndex: Math.floor(cards.length * penetration), decks, penetration };
}

/** A shoe that deals the given cards in order. Used by tests. */
export function stackedShoe(cards: Card[]): Shoe {
  return { cards, position: 0, cutIndex: cards.length, decks: 1, penetration: 1 };
}

export function draw(shoe: Shoe): Card {
  if (shoe.position >= shoe.cards.length) {
    // Ran out mid-round (rare with normal penetration): start a fresh shoe.
    Object.assign(shoe, newShoe(shoe.decks, shoe.penetration));
  }
  return at(shoe.cards, shoe.position++);
}

/** Draws the next card with the given point value (ace = 11). Used by drill mode. */
export function drawMatching(shoe: Shoe, value: number): Card {
  const { cards, position } = shoe;
  for (let i = position; i < cards.length; i++) {
    const card = at(cards, i);
    if (pointValue(card.rank) === value) {
      cards[i] = at(cards, position);
      cards[position] = card;
      break;
    }
  }
  return draw(shoe);
}

export const cardsRemaining = (shoe: Shoe) => shoe.cards.length - shoe.position;
export const needsShuffle = (shoe: Shoe) => shoe.position >= shoe.cutIndex;
