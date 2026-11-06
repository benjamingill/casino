/**
 * Round flow for one player against the dealer. Every function returns a new
 * state and leaves the old one untouched, so React can use it directly.
 */
import { at, roundCents } from '../../../shared';
import { type Card, draw, drawMatching, needsShuffle, newShoe, type Shoe } from './cards';
import { handValue, isBlackjack, isPair } from './hand';
import { doubleAllowed, type Rules } from './rules';
import type { Action, Options } from './strategy';

export type Phase = 'betting' | 'insurance' | 'playerTurn' | 'roundOver';
export type Outcome = 'blackjack' | 'win' | 'lose' | 'push' | 'bust' | 'surrender';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  outcome?: Outcome;
  /** Money won (+) or lost (−) on this hand. */
  net?: number;
}

export interface GameState {
  rules: Rules;
  shoe: Shoe;
  phase: Phase;
  /**
   * Money not on the table. Bets come out of it when they are placed (deal,
   * double, split, insurance) and stakes plus winnings go back in when the round ends.
   */
  bankroll: number;
  baseBet: number;
  dealer: Card[];
  holeRevealed: boolean;
  hands: PlayerHand[];
  active: number;
  insuranceBet: number;
  insuranceNet: number;
  /** True if the shoe was reshuffled at the start of this round. */
  reshuffled: boolean;
}

/** Cards to deal, as point values (ace = 11). Used by drill mode. */
export interface Scenario {
  player: [number, number];
  up: number;
}

export function createGame(rules: Rules, bankroll = 1000, shoe?: Shoe): GameState {
  return {
    rules,
    shoe: shoe ?? newShoe(rules.decks, rules.penetration),
    phase: 'betting',
    bankroll,
    baseBet: 0,
    dealer: [],
    holeRevealed: false,
    hands: [],
    active: 0,
    insuranceBet: 0,
    insuranceNet: 0,
    reshuffled: false,
  };
}

/** New rules mean a new shoe. Only allowed between rounds. */
export function changeRules(prev: GameState, rules: Rules): GameState {
  return createGame(rules, prev.bankroll);
}

/** The hand the player is deciding on. Only call during the player's turn. */
export const currentHand = (s: GameState) => at(s.hands, s.active);

/** The dealer's face-up card. Only call after cards are dealt. */
export const upcard = (s: GameState) => at(s.dealer, 0);

export const canStartRound = (s: GameState) => s.phase === 'betting' || s.phase === 'roundOver';

/** Whether the player has this much money left to put on the table. */
export const canAfford = (s: GameState, amount: number) => amount <= s.bankroll;

/** Takes a bet out of the bankroll. */
function stake(s: GameState, amount: number) {
  s.bankroll = roundCents(s.bankroll - amount);
}

/** Total money on the table this round. */
export const staked = (s: GameState) => s.insuranceBet + s.hands.reduce((sum, h) => sum + h.bet, 0);

function newHand(cards: Card[], bet: number, fromSplit = false, splitAces = false): PlayerHand {
  return { cards, bet, doubled: false, surrendered: false, fromSplit, splitAces, done: false };
}

export function startRound(prev: GameState, bet: number, scenario?: Scenario): GameState {
  if (!canStartRound(prev)) throw new Error('A round is already in progress');
  if (bet <= 0 || !canAfford(prev, bet)) throw new Error(`Can't bet $${bet} with $${prev.bankroll} left`);
  const s = structuredClone(prev);
  stake(s, bet);
  s.reshuffled = false;
  if (needsShuffle(s.shoe)) {
    s.shoe = newShoe(s.rules.decks, s.rules.penetration);
    s.reshuffled = true;
  }
  const take = (value?: number) => (value === undefined ? draw(s.shoe) : drawMatching(s.shoe, value));
  // Casino order: player, dealer upcard, player, dealer hole card.
  const p1 = take(scenario?.player[0]);
  const up = take(scenario?.up);
  const p2 = take(scenario?.player[1]);
  const hole = take();

  s.hands = [newHand([p1, p2], bet)];
  s.dealer = [up, hole];
  s.baseBet = bet;
  s.active = 0;
  s.holeRevealed = false;
  s.insuranceBet = 0;
  s.insuranceNet = 0;

  if (s.rules.insurance && up.rank === 'A') {
    s.phase = 'insurance';
    return s;
  }
  return checkBlackjacks(s);
}

export const insuranceCost = (s: GameState) => roundCents(s.baseBet / 2);

/** Insurance (or even money with a blackjack) costs half the bet and pays 2:1. */
export function resolveInsurance(prev: GameState, take: boolean): GameState {
  if (prev.phase !== 'insurance') throw new Error('Insurance is not being offered');
  if (take && !canAfford(prev, insuranceCost(prev))) throw new Error("Can't afford insurance");
  const s = structuredClone(prev);
  s.insuranceBet = take ? insuranceCost(s) : 0;
  stake(s, s.insuranceBet);
  return checkBlackjacks(s);
}

/** The dealer peeks under an ace or ten, so a dealer blackjack ends the round at once. */
function checkBlackjacks(s: GameState): GameState {
  const hand = at(s.hands, 0);
  if (isBlackjack(s.dealer)) {
    s.insuranceNet = s.insuranceBet * 2;
    hand.done = true;
    settle(hand, isBlackjack(hand.cards) ? 'push' : 'lose', s.rules);
    return endRound(s);
  }
  s.insuranceNet = -s.insuranceBet;
  if (isBlackjack(hand.cards)) {
    hand.done = true;
    settle(hand, 'blackjack', s.rules);
    return endRound(s);
  }
  s.phase = 'playerTurn';
  return s;
}

function canSplitHand(s: GameState, h: PlayerHand): boolean {
  return isPair(h.cards) && s.hands.length < s.rules.maxHands && (!h.splitAces || s.rules.resplitAces);
}

export interface AvailableActions extends Options {
  canHit: boolean;
}

export function availableActions(s: GameState): AvailableActions {
  const h = s.hands[s.active];
  if (s.phase !== 'playerTurn' || !h) {
    return { canHit: false, canDouble: false, canSplit: false, canSurrender: false };
  }
  const r = s.rules;
  const twoCards = h.cards.length === 2;
  const { total, soft } = handValue(h.cards);
  // Doubling and splitting both put another bet the size of this hand's bet on the table.
  const affordable = canAfford(s, h.bet);
  return {
    canHit: !h.splitAces || r.hitSplitAces,
    canDouble:
      affordable && twoCards && !h.splitAces && (!h.fromSplit || r.doubleAfterSplit) && doubleAllowed(total, soft, r),
    canSplit: affordable && canSplitHand(s, h),
    canSurrender: r.lateSurrender && twoCards && s.hands.length === 1,
  };
}

export function isAllowed(s: GameState, action: Action): boolean {
  const o = availableActions(s);
  if (s.phase !== 'playerTurn') return false;
  return {
    hit: o.canHit,
    stand: true,
    double: o.canDouble,
    split: o.canSplit,
    surrender: o.canSurrender,
  }[action];
}

export function act(prev: GameState, action: Action): GameState {
  if (!isAllowed(prev, action)) throw new Error(`Can't ${action} right now`);
  const s = structuredClone(prev);
  const h = currentHand(s);
  switch (action) {
    case 'hit':
      h.cards.push(draw(s.shoe));
      break;
    case 'stand':
      h.done = true;
      break;
    case 'double':
      stake(s, h.bet);
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(draw(s.shoe));
      h.done = true;
      break;
    case 'surrender':
      h.surrendered = true;
      h.done = true;
      break;
    case 'split': {
      stake(s, h.bet);
      const [a, b] = [at(h.cards, 0), at(h.cards, 1)];
      const aces = a.rank === 'A';
      const first = newHand([a, draw(s.shoe)], h.bet, true, aces);
      const second = newHand([b, draw(s.shoe)], h.bet, true, aces);
      s.hands.splice(s.active, 1, first, second);
      break;
    }
  }
  return advance(s);
}

/** Moves to the next hand that still needs a decision, or plays the dealer if none do. */
function advance(s: GameState): GameState {
  while (s.active < s.hands.length) {
    const h = currentHand(s);
    if (!h.done) {
      if (handValue(h.cards).total >= 21) h.done = true;
      // Split aces get one card each, unless another ace can be resplit.
      else if (h.splitAces && !s.rules.hitSplitAces && !canSplitHand(s, h)) h.done = true;
    }
    if (!h.done) return s;
    s.active++;
  }
  return playDealer(s);
}

export function dealerShouldHit(cards: Card[], rules: Rules): boolean {
  const { total, soft } = handValue(cards);
  return total < 17 || (total === 17 && soft && rules.dealerHitsSoft17);
}

function playDealer(s: GameState): GameState {
  const anyLive = s.hands.some((h) => !h.surrendered && handValue(h.cards).total <= 21);
  if (anyLive) while (dealerShouldHit(s.dealer, s.rules)) s.dealer.push(draw(s.shoe));

  const dealerTotal = handValue(s.dealer).total;
  for (const h of s.hands) {
    const total = handValue(h.cards).total;
    let outcome: Outcome;
    if (h.surrendered) outcome = 'surrender';
    else if (total > 21) outcome = 'bust';
    else if (dealerTotal > 21 || total > dealerTotal) outcome = 'win';
    else if (total === dealerTotal) outcome = 'push';
    else outcome = 'lose';
    settle(h, outcome, s.rules);
  }
  return endRound(s);
}

function settle(h: PlayerHand, outcome: Outcome, rules: Rules) {
  h.outcome = outcome;
  h.net = {
    // 6:5 on an odd bet isn't a whole number (e.g. $3 pays $3.60), so round to cents.
    blackjack: roundCents(h.bet * rules.blackjackPayout),
    win: h.bet,
    push: 0,
    lose: -h.bet,
    bust: -h.bet,
    surrender: -h.bet / 2,
  }[outcome];
}

function endRound(s: GameState): GameState {
  s.holeRevealed = true;
  s.phase = 'roundOver';
  // Every stake comes back, plus winnings or minus losses.
  s.bankroll = roundCents(s.bankroll + staked(s) + roundNet(s));
  return s;
}

export function roundNet(s: GameState): number {
  return roundCents(s.insuranceNet + s.hands.reduce((sum, h) => sum + (h.net ?? 0), 0));
}
