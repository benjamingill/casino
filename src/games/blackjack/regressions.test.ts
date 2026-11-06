import { describe, expect, it } from 'vitest';
import { at, formatSigned } from '../../shared';
import { type Card, type Rank, stackedShoe } from './engine/cards';
import { act, availableActions, createGame, resolveInsurance, startRound } from './engine/game';
import { formatTotal } from './engine/hand';
import { DEFAULT_RULES, parseRules } from './engine/rules';
import { chartKey, recommend, strategyChart } from './engine/strategy';
import { emptyStats, parseStats } from './stats';

const cards = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }));

describe('6:5 payouts', () => {
  it('pays whole cents on an odd bet', () => {
    const rules = { ...DEFAULT_RULES, blackjackPayout: 1.2 };
    // Player A + K (blackjack), dealer 9 up with 7 in the hole.
    const s = startRound(createGame(rules, 1000, stackedShoe(cards('A', '9', 'K', '7'))), 3);
    expect(s.hands[0]?.net).toBe(3.6);
    expect(s.bankroll).toBe(1003.6);
    expect(formatSigned(3.6)).toBe('+$3.60');
  });
});

describe('split hands', () => {
  it('labels a two-card 21 after a split as 21, not Blackjack', () => {
    expect(formatTotal(cards('A', 'K'))).toBe('Blackjack');
    expect(formatTotal(cards('A', 'K'), true)).toBe('21');
  });
});

describe('soft 12 (A,A that cannot be split)', () => {
  it('highlights a chart cell that matches the hint', () => {
    const aa = cards('A', 'A');
    const key = chartKey(aa, false);
    expect(key).toBe('soft-12');
    const row = strategyChart(DEFAULT_RULES)
      .flatMap((t) => t.rows)
      .find((r) => r.key === key);
    // Dealer 5 is the 4th upcard column (2, 3, 4, 5, ...).
    expect(row?.cells[3]).toBe('H');
    expect(recommend(aa, '5', DEFAULT_RULES, { canDouble: false, canSplit: false, canSurrender: false })).toBe('hit');
  });
});

describe('bankroll', () => {
  // Player 10 + 6 vs dealer 10 up, 7 in the hole; next cards 5 and 9.
  const shoe = () => stackedShoe(cards('10', '10', '6', '7', '5', '9', '8'));

  it('takes the bet out when the cards are dealt', () => {
    const s = startRound(createGame(DEFAULT_RULES, 100, shoe()), 25);
    expect(s.phase).toBe('playerTurn');
    expect(s.bankroll).toBe(75);
  });

  it("won't take a bet bigger than the bankroll", () => {
    expect(() => startRound(createGame(DEFAULT_RULES, 20, shoe()), 25)).toThrow();
  });

  it("won't double or split without the money for it", () => {
    // Player 5 + 5 vs dealer 6. $15 bankroll: $10 bet leaves $5, not enough to double or split.
    const s = startRound(createGame(DEFAULT_RULES, 15, stackedShoe(cards('5', '6', '5', '10', '9'))), 10);
    expect(availableActions(s)).toMatchObject({ canDouble: false, canSplit: false });
    expect(() => act(s, 'double')).toThrow();
    expect(recommend(at(s.hands, 0).cards, '6', DEFAULT_RULES, availableActions(s))).toBe('hit');
  });

  it("won't take insurance without the money for it", () => {
    // Dealer ace up. $10 bankroll, $10 bet: nothing left for $5 insurance.
    const s = startRound(createGame(DEFAULT_RULES, 10, stackedShoe(cards('10', 'A', '9', '7', '5'))), 10);
    expect(s.phase).toBe('insurance');
    expect(() => resolveInsurance(s, true)).toThrow();
    expect(resolveInsurance(s, false).phase).toBe('playerTurn');
  });

  it('pays back the stakes plus winnings at the end of the round', () => {
    // Player 10 + 6 hits a 5 for 21; dealer 17 stands.
    const s = act(startRound(createGame(DEFAULT_RULES, 100, shoe()), 25), 'hit');
    expect(s.hands[0]?.outcome).toBe('win');
    expect(s.bankroll).toBe(125);
  });
});

describe('saved data', () => {
  it('falls back to defaults for missing or corrupt values', () => {
    for (const bad of [null, 42, 'x', [], { byCategory: null, mistakes: 'nope' }]) {
      expect(parseStats(bad)).toEqual(emptyStats());
      expect(parseRules(bad)).toEqual(DEFAULT_RULES);
    }
  });

  it('fills in categories missing from older saved stats', () => {
    const stats = parseStats({ decisions: 5, correct: 4, byCategory: { hard: { decisions: 5, correct: 4 } } });
    expect(stats.decisions).toBe(5);
    expect(stats.byCategory.hard).toEqual({ decisions: 5, correct: 4 });
    expect(stats.byCategory.insurance).toEqual({ decisions: 0, correct: 0 });
  });

  it('drops out-of-range and mistyped rules but keeps valid ones', () => {
    const rules = parseRules({ decks: 0, doubleOn: 'never', maxHands: 'four', blackjackPayout: 1.2, insurance: false });
    expect(rules).toEqual({ ...DEFAULT_RULES, blackjackPayout: 1.2, insurance: false });
  });

  it('keeps only well-formed mistakes', () => {
    const good = { situation: 'Hard 16 vs dealer 10', chosen: 'Stand', recommended: 'Surrender' };
    expect(parseStats({ mistakes: [good, { situation: 1 }, null] }).mistakes).toEqual([good]);
  });
});
