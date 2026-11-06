import { formatMoney } from '../../../shared';
import { type BonusRun, growthSteps, nextGrowth } from '../engine/bonus';
import { creditLabel, prizeLabel } from './art';
import { Greg } from './Greg';

const EXTRA_LABELS = { moScott: 'Mo Scott', goGreg: 'Go Greg', moMike: 'Mo Mike' } as const;

/**
 * The Greg Bonus board, showing frame `frame` of `run`. Coin and diamond
 * prizes show in credits (at `credits` bet); totals show in dollars.
 */
export function BonusBoard({
  run,
  frame,
  bet,
  credits,
}: {
  run: BonusRun;
  frame: number;
  bet: number;
  credits: number;
}) {
  const f = run.frames[frame];
  if (!f) return null;
  const next = nextGrowth(run, f);
  const lastFrame = frame === run.frames.length - 1;
  // The meter fills from the last size reached to the next one.
  const meterStart =
    growthSteps(run.cols)
      .filter((g) => g.at <= f.diamonds)
      .at(-1)?.at ?? 0;

  return (
    <div className="bonus">
      <div className="bonus-header">
        <div className="bonus-extras">
          {(Object.keys(EXTRA_LABELS) as (keyof typeof EXTRA_LABELS)[]).map((k) => (
            <span key={k} className={`extra extra-${k}${run.extras[k] ? ' on' : ''}`}>
              {EXTRA_LABELS[k]}
            </span>
          ))}
        </div>
        <div className="bonus-stats">
          <span>
            Spins left <strong>{f.spinsLeft}</strong>
          </span>
          <span>
            Won <strong>{formatMoney(bet * f.total)}</strong>
          </span>
        </div>
      </div>

      <div
        className="bonus-board"
        style={{ gridTemplateColumns: `repeat(${run.cols}, 1fr)`, '--cols': run.cols } as React.CSSProperties}
      >
        {f.board.map((c, i) => {
          const x = i % run.cols;
          const y = Math.floor(i / run.cols);
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: squares are fixed positions.
              key={`${frame}-${i}`}
              className={`bonus-cell${c ? ` ${c.kind}${c.collected ? ' collected' : ' missed'}` : ''}`}
              style={{ gridColumn: x + 1, gridRow: y + 1 }}
            >
              {c && (
                <>
                  <span className="bonus-icon">{c.kind === 'diamond' ? '💎' : '🪙'}</span>
                  <span className="bonus-prize">{c.prizes.map((p) => prizeLabel(p, credits)).join(' + ')}</span>
                  {c.spinTag && <span className="bonus-tag">+1 spin</span>}
                  {c.boost > 0 && <span className="bonus-tag boost">+{creditLabel(c.boost, credits)}</span>}
                </>
              )}
            </div>
          );
        })}
        <div
          className={`greg-area${f.grew ? ' grew' : ''}`}
          style={{
            gridColumn: `${f.greg.x + 1} / span ${f.size.w}`,
            gridRow: `${f.greg.y + 1} / span ${f.size.h}`,
          }}
        >
          <span className="greg-face">
            <Greg />
          </span>
        </div>
      </div>

      <div className="bonus-footer" aria-live="polite">
        {next ? (
          <div className="meter">
            <span>
              💎 {f.diamonds} / {next.at}
            </span>
            <span className="meter-bar">
              <span
                style={{ width: `${Math.min(100, ((f.diamonds - meterStart) / (next.at - meterStart)) * 100)}%` }}
              />
            </span>
          </div>
        ) : (
          <div className="meter">💎 {f.diamonds}</div>
        )}
        {f.grew && frame > 0 && <div className="banner info">Greg grew!</div>}
        {frame > 0 && f.win > 0 && !lastFrame && <div>+{formatMoney(bet * f.win)} this spin</div>}
        {lastFrame && (
          <div className="bonus-total">
            Greg Bonus total: <strong>{formatMoney(bet * run.total)}</strong>
            {run.jackpots.length > 0 && ` (includes ${run.jackpots.length === 1 ? 'a jackpot' : 'jackpots'})`}
          </div>
        )}
      </div>
    </div>
  );
}
