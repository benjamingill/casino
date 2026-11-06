import { type ReactNode, useEffect, useRef, useState } from 'react';
import { formatMoney } from '../../../shared';
import { BASE_BET, BET_MULTS, betFor, DENOMS } from '../engine/machine';

export interface SpinAction {
  label: string;
  /** Small text under the label. */
  sub?: string;
  onClick: () => void;
  disabled?: boolean;
}

/** "1¢", "25¢", "$1". */
export const denomLabel = (d: number) => (d < 1 ? `${Math.round(d * 100)}¢` : formatMoney(d));

/** "$2.50", always with cents, like a machine's meters. */
const meterMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The Spin button. */
export function SpinButton({ action }: { action: SpinAction }) {
  return (
    <button
      type="button"
      className="spin-big"
      disabled={action.disabled}
      onContextMenu={(e) => e.preventDefault()}
      onClick={action.onClick}
    >
      <span className="spin-label">{action.label}</span>
      {action.sub && <span className="spin-sub">{action.sub}</span>}
    </button>
  );
}

/**
 * The bottom of the machine: the meter bar (Menu, Credit, Win with a status
 * line above it, Bet, and the denomination button). Below it, the bet buttons
 * with the Spin button on the right.
 */
export function ControlPanel({
  spin,
  status,
  balance,
  win,
  bigWin,
  denom,
  credits,
  canChangeBet,
  onCredits,
  onDenom,
  onMenu,
}: {
  spin: ReactNode;
  status: ReactNode;
  balance: number;
  /** Blank when null. */
  win: number | null;
  bigWin: boolean;
  denom: number;
  credits: number;
  canChangeBet: boolean;
  onCredits: (credits: number) => void;
  onDenom: (denom: number) => void;
  onMenu: () => void;
}) {
  const [choosingDenom, setChoosingDenom] = useState(false);

  useEffect(() => {
    if (!canChangeBet) setChoosingDenom(false);
  }, [canChangeBet]);

  return (
    <div className="control-panel">
      <div className="panel-bar">
        <button type="button" className="yellow-btn menu-btn" onClick={onMenu}>
          Menu
        </button>
        <div className="meter-box">
          <span className="meter-label">Credit</span>
          <div className="meter-display">
            <strong className="meter-value">{meterMoney(balance)}</strong>
          </div>
        </div>
        <div className={`meter-box meter-win${bigWin ? ' big' : ''}`}>
          <span className="meter-status" aria-live="polite">
            {status}
          </span>
          <span className="meter-label">Win</span>
          <div className="meter-display">
            <strong className="meter-value">{win !== null && win > 0 ? meterMoney(win) : ''}</strong>
          </div>
        </div>
        <div className="meter-box">
          <span className="meter-label">Bet</span>
          <div className="meter-display">
            <strong className="meter-value">{meterMoney(betFor(denom, credits))}</strong>
          </div>
        </div>
        <button
          type="button"
          className="yellow-btn denom-btn"
          disabled={!canChangeBet}
          onClick={() => setChoosingDenom(true)}
          aria-label={`Denomination ${denomLabel(denom)}. Change denomination`}
        >
          <span className="denom-value">{denomLabel(denom)}</span>
        </button>
      </div>

      <div className="button-deck">
        {BET_MULTS.map((x) => (
          <BetButton
            key={x}
            mult={x}
            credits={x * BASE_BET}
            on={x * BASE_BET === credits}
            disabled={!canChangeBet}
            onPick={onCredits}
          />
        ))}
        {spin}
      </div>

      {choosingDenom && (
        <DenomPicker
          denom={denom}
          onPick={(d) => {
            onDenom(d);
            setChoosingDenom(false);
          }}
        />
      )}
    </div>
  );
}

/** A button that sets the bet to a multiple of the base bet. The current bet's button is lit. */
function BetButton({
  mult,
  credits,
  on,
  disabled,
  onPick,
}: {
  mult: number;
  credits: number;
  on: boolean;
  disabled: boolean;
  onPick: (credits: number) => void;
}) {
  return (
    <button
      type="button"
      className={`yellow-btn bet-btn${on ? ' selected' : ''}`}
      disabled={disabled}
      aria-pressed={on}
      onClick={() => onPick(credits)}
    >
      <span className="bet-btn-label">Bet × {mult}</span>
      <span className="bet-btn-credits">{credits}</span>
      <span className="bet-btn-label">Credits</span>
    </button>
  );
}

/** A pop-up for choosing the denomination. It only closes by picking one (the current one is fine). */
function DenomPicker({ denom, onPick }: { denom: number; onPick: (denom: number) => void }) {
  const current = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    current.current?.focus();
  }, []);

  return (
    <>
      <div className="modal-backdrop" />
      <div className="denom-modal" role="dialog" aria-modal="true" aria-label="Denomination">
        <div className="denom-grid">
          {DENOMS.map((d) => (
            <button
              type="button"
              key={d}
              ref={d === denom ? current : undefined}
              className={`yellow-btn denom-choice${d === denom ? ' selected' : ''}`}
              onClick={() => onPick(d)}
            >
              <span className="denom-value">{denomLabel(d)}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
