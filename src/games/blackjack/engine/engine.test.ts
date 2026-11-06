import { describe, expect, it } from 'vitest';
import { type Card, type Rank, stackedShoe } from './cards';
import { act, availableActions, createGame, dealerShouldHit, resolveInsurance, startRound } from './game';
import { handValue, isBlackjack } from './hand';
import { DEFAULT_RULES, type Rules } from './rules';
import { recommend } from './strategy';
import { evaluateInsurance, evaluateMove } from './trainer';

const c = (rank: Rank): Card => ({ rank, suit: '♠' });
const cards = (...ranks: Rank[]) => ranks.map(c);
const S17: Rules = { ...DEFAULT_RULES, dealerHitsSoft17: false };
const ALL = { canDouble: true, canSplit: true, canSurrender: true };

/** Shoe deals: player, dealer up, player, dealer hole, then the rest in order. */
const game = (ranks: Rank[], rules = DEFAULT_RULES) => createGame(rules, 1000, stackedShoe(cards(...ranks)));

describe('hand values', () => {
  it('counts aces as 11 when that does not bust', () => {
    expect(handValue(cards('A', '6'))).toEqual({ total: 17, soft: true });
    expect(handValue(cards('A', '6', '10'))).toEqual({ total: 17, soft: false });
    expect(handValue(cards('A', 'A', '9'))).toEqual({ total: 21, soft: true });
  });
  it('detects blackjack', () => {
    expect(isBlackjack(cards('A', 'K'))).toBe(true);
    expect(isBlackjack(cards('7', '7', '7'))).toBe(false);
  });
});

describe('basic strategy', () => {
  const play = (hand: Rank[], up: Rank, rules = DEFAULT_RULES, opts = ALL) =>
    recommend(cards(...hand), up, rules, opts);

  it('handles hard totals', () => {
    expect(play(['10', '2'], '3')).toBe('hit');
    expect(play(['10', '2'], '4')).toBe('stand');
    expect(play(['10', '6'], '6')).toBe('stand');
    expect(play(['9', '2'], 'A')).toBe('double'); // H17
    expect(play(['9', '2'], 'A', S17)).toBe('hit');
    expect(play(['5', '4'], '2')).toBe('hit');
  });
  it('handles surrender, with fallbacks', () => {
    expect(play(['10', '6'], '10')).toBe('surrender');
    expect(play(['10', '6'], '10', DEFAULT_RULES, { ...ALL, canSurrender: false })).toBe('hit');
    expect(play(['10', '7'], 'A')).toBe('surrender'); // H17 only
    expect(play(['10', '7'], 'A', S17)).toBe('stand');
    expect(play(['8', '8'], '10')).toBe('split');
    expect(play(['8', '8'], 'A')).toBe('surrender');
  });
  it('handles soft totals', () => {
    expect(play(['A', '7'], '2')).toBe('double'); // H17
    expect(play(['A', '7'], '2', S17)).toBe('stand');
    expect(play(['A', '7'], '9')).toBe('hit');
    expect(play(['A', '8'], '6')).toBe('double');
    expect(play(['A', '7'], '4', DEFAULT_RULES, { ...ALL, canDouble: false })).toBe('stand');
  });
  it('handles pairs', () => {
    expect(play(['9', '9'], '7')).toBe('stand');
    expect(play(['9', '9'], '8')).toBe('split');
    expect(play(['4', '4'], '5')).toBe('split');
    expect(play(['4', '4'], '5', { ...DEFAULT_RULES, doubleAfterSplit: false })).toBe('hit');
    expect(play(['K', 'Q'], '6')).toBe('stand');
    expect(play(['5', '5'], '9')).toBe('double');
  });
});

describe('dealer', () => {
  it('hits soft 17 only under H17', () => {
    expect(dealerShouldHit(cards('A', '6'), DEFAULT_RULES)).toBe(true);
    expect(dealerShouldHit(cards('A', '6'), S17)).toBe(false);
    expect(dealerShouldHit(cards('10', '7'), DEFAULT_RULES)).toBe(false);
  });
});

describe('rounds', () => {
  it('pays 3:2 on blackjack', () => {
    const s = startRound(game(['A', '9', 'K', '8']), 10);
    expect(s.phase).toBe('roundOver');
    expect(s.bankroll).toBe(1015);
  });

  it('offers insurance on an ace and pays it 2:1 against dealer blackjack', () => {
    let s = startRound(game(['10', 'A', '9', 'K']), 10);
    expect(s.phase).toBe('insurance');
    expect(evaluateInsurance(s, true).correct).toBe(false);
    s = resolveInsurance(s, true);
    expect(s.phase).toBe('roundOver');
    expect(s.bankroll).toBe(1000); // lose 10 on the hand, win 10 on insurance
  });

  it('surrender returns half the bet', () => {
    let s = startRound(game(['10', '10', '6', '5']), 10);
    expect(evaluateMove(s, 'surrender').correct).toBe(true);
    s = act(s, 'surrender');
    expect(s.bankroll).toBe(995);
  });

  it('splits and doubles after splitting', () => {
    // Player 8,8 vs dealer 10 (hole 7). Split hands get 3 and 2, then double cards 10 and 9.
    let s = startRound(game(['8', '10', '8', '7', '3', '2', '10', '9']), 10);
    s = act(s, 'split');
    expect(s.hands.map((h) => handValue(h.cards).total)).toEqual([11, 10]);
    expect(availableActions(s).canSurrender).toBe(false);
    s = act(s, 'double');
    s = act(s, 'double');
    expect(s.hands.map((h) => h.outcome)).toEqual(['win', 'win']);
    expect(s.bankroll).toBe(1040);
  });

  it('gives split aces one card each, and 21 on split aces pays 1:1', () => {
    let s = startRound(game(['A', '9', 'A', '7', 'K', '5', '10']), 10);
    s = act(s, 'split');
    expect(s.phase).toBe('roundOver'); // no decisions left on split aces
    expect(s.dealer.length).toBe(3); // dealer 16 hits and busts
    expect(s.bankroll).toBe(1020);
  });

  it('flags a mistake', () => {
    const s = startRound(game(['10', '10', '6', '7']), 10);
    const d = evaluateMove(s, 'stand');
    expect(d).toMatchObject({ correct: false, recommended: 'Surrender', situation: 'Hard 16 vs dealer 10' });
  });
});

describe('stress', () => {
  it('plays thousands of rounds by basic strategy without getting stuck', async () => {
    const { randomScenario } = await import('./drill');
    const { bestAction } = await import('./trainer');
    const rules = { ...DEFAULT_RULES, resplitAces: true, decks: 2 };
    // Enough money that 20,000 rounds can't run out, now that bets must be affordable.
    let s = createGame(rules, 1_000_000);
    let wagered = 0;
    const start = s.bankroll;
    for (let i = 0; i < 20000; i++) {
      s = startRound(s, 10, i % 2 ? randomScenario() : undefined);
      if (s.phase === 'insurance') s = resolveInsurance(s, false);
      while (s.phase === 'playerTurn') s = act(s, bestAction(s));
      expect(s.phase).toBe('roundOver');
      wagered += s.hands.reduce((sum, h) => sum + h.bet, 0);
      expect(s.hands.length).toBeLessThanOrEqual(rules.maxHands);
    }
    // Sanity check only: results should be within a plausible band, not a precise house edge.
    expect(Math.abs(s.bankroll - start) / wagered).toBeLessThan(0.1);
  });
});
