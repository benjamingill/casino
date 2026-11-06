import { formatMoney } from '../../../shared';
import { type PickGame as Game, PICK_COINS, pickDone, type Revealed } from '../engine/pick';
import { JACKPOT_MULT, TIERS } from '../engine/prizes';
import { TIER_NAMES } from './art';

/** The jackpot pick game: turn over coins until three jackpots match. */
export function PickGame({
  game,
  revealed,
  bet,
  onPick,
}: {
  game: Game;
  revealed: Revealed;
  bet: number;
  onPick: (index: number) => void;
}) {
  const done = pickDone(game, revealed);
  return (
    <div className="pick">
      {done && <p className="pick-title">Jackpot!</p>}
      <div className="pick-tiers">
        {[...TIERS].reverse().map((t) => (
          <span key={t} className={`tier tier-${t}${done && t === game.winner ? ' won' : ''}`}>
            {TIER_NAMES[t]} {formatMoney(bet * JACKPOT_MULT[t])}
            <span className="tier-count">{'●'.repeat(revealed.filter((r) => r === t).length)}</span>
          </span>
        ))}
      </div>
      <div className="pick-coins">
        {Array.from({ length: PICK_COINS }, (_, i) => {
          const t = revealed[i] ?? null;
          return (
            <button
              type="button"
              // biome-ignore lint/suspicious/noArrayIndexKey: coins are fixed positions.
              key={i}
              className={`pick-coin${t ? ` tier-${t} revealed` : ''}${done && t === game.winner ? ' won' : ''}`}
              disabled={done || t !== null}
              onClick={() => onPick(i)}
              aria-label={t ? TIER_NAMES[t] : `Coin ${i + 1}`}
            >
              {t ? TIER_NAMES[t] : '🪙'}
            </button>
          );
        })}
      </div>
      {done && (
        <p className="bonus-total">
          {TIER_NAMES[game.winner]} jackpot: <strong>{formatMoney(bet * JACKPOT_MULT[game.winner])}</strong>
        </p>
      )}
    </div>
  );
}
