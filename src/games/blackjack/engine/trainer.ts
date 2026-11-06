/** Grades the player's decisions against basic strategy. */

import { at } from '../../../shared';
import { type Card, pointValue, type Rank } from './cards';
import { availableActions, currentHand, type GameState, upcard } from './game';
import { handValue, isBlackjack, isPair } from './hand';
import { type Action, recommend } from './strategy';

export type Category = 'hard' | 'soft' | 'pair' | 'insurance';

export interface Decision {
  correct: boolean;
  category: Category;
  /** e.g. "Hard 16 vs dealer 10" */
  situation: string;
  chosen: string;
  recommended: string;
}

export const ACTION_LABELS: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
};

const upLabel = (rank: Rank) => (rank === 'A' ? 'A' : String(pointValue(rank)));

function describeHand(cards: Card[], asPair: boolean): string {
  if (asPair) {
    const v = pointValue(at(cards, 0).rank);
    return `Pair of ${v === 11 ? 'Aces' : `${v}s`}`;
  }
  const { total, soft } = handValue(cards);
  return `${soft ? 'Soft' : 'Hard'} ${total}`;
}

/** What basic strategy says to do with the current hand. */
export function bestAction(s: GameState): Action {
  return recommend(currentHand(s).cards, upcard(s).rank, s.rules, availableActions(s));
}

export function evaluateMove(s: GameState, action: Action): Decision {
  const h = currentHand(s);
  const asPair = availableActions(s).canSplit && isPair(h.cards);
  const best = bestAction(s);
  return {
    correct: action === best,
    category: asPair ? 'pair' : handValue(h.cards).soft ? 'soft' : 'hard',
    situation: `${describeHand(h.cards, asPair)} vs dealer ${upLabel(upcard(s).rank)}`,
    chosen: ACTION_LABELS[action],
    recommended: ACTION_LABELS[best],
  };
}

/** Basic strategy never takes insurance, including even money. */
export function evaluateInsurance(s: GameState, take: boolean): Decision {
  const evenMoney = isBlackjack(at(s.hands, 0).cards);
  return {
    correct: !take,
    category: 'insurance',
    situation: evenMoney ? 'Even money on blackjack vs dealer A' : 'Insurance vs dealer A',
    chosen: take ? 'Take' : 'Decline',
    recommended: 'Decline',
  };
}
