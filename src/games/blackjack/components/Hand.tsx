import { formatMoney, formatSigned } from '../../../shared';
import { type Card, isRed } from '../engine/cards';
import type { Outcome } from '../engine/game';

export function CardView({ card, hidden = false }: { card: Card; hidden?: boolean }) {
  if (hidden) return <div className="card back" role="img" aria-label="Face-down card" />;
  return (
    <div className={`card${isRed(card.suit) ? ' red' : ''}`} role="img" aria-label={`${card.rank}${card.suit}`}>
      <span className="corner">
        {card.rank}
        <br />
        {card.suit}
      </span>
      <span className="pip">{card.suit}</span>
    </div>
  );
}

const OUTCOME_LABELS: Record<Outcome, string> = {
  blackjack: 'Blackjack!',
  win: 'Win',
  lose: 'Lose',
  push: 'Push',
  bust: 'Bust',
  surrender: 'Surrendered',
};

interface HandProps {
  cards: Card[];
  label: string;
  total: string;
  hideSecond?: boolean;
  active?: boolean;
  bet?: number;
  outcome?: Outcome | undefined;
  net?: number | undefined;
}

export function HandView({ cards, label, total, hideSecond, active, bet, outcome, net }: HandProps) {
  return (
    <div className={`hand${active ? ' active' : ''}`}>
      <div className="hand-label">
        {label} <span className="total">{total}</span>
      </div>
      <div className="cards">
        {cards.map((card, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: cards are only added at the end, and a shoe can hold duplicates.
          <CardView key={i} card={card} hidden={hideSecond === true && i === 1} />
        ))}
      </div>
      {bet !== undefined && (
        <div className="hand-footer">
          <span>Bet {formatMoney(bet)}</span>
          {outcome && net !== undefined && (
            <span className={`outcome ${net > 0 ? 'good' : net < 0 ? 'bad' : ''}`}>
              {OUTCOME_LABELS[outcome]} {formatSigned(net)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
