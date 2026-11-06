import { useCallback, useEffect, useMemo, useState } from 'react';
import './slots.css';
import { formatMoney, isFiniteNumber, isRecord, load, roundCents, save } from '../../shared';
import { SYMBOL_ART, SYMBOL_NAMES, SymbolIcon } from './components/art';
import { BonusBoard } from './components/BonusBoard';
import { CabinetTop } from './components/CabinetTop';
import { ControlPanel, type SpinAction, SpinButton } from './components/ControlPanel';
import { HelpScreen } from './components/InfoPanels';
import { PickGame } from './components/PickGame';
import { Reels } from './components/Reels';
import {
  BET_CREDITS,
  betOf,
  canSpin,
  createMachine,
  DENOMS,
  type FreeGames,
  inFreeGames,
  type Machine,
  type SpinResult,
  START_BANKROLL,
  setCredits,
  setDenom,
  spin,
} from './engine/machine';
import { PAYLINES, REELS } from './engine/paylines';
import { emptyPicks, pickCoin, pickDone, type Revealed } from './engine/pick';
import { drawGrid, type LineWin } from './engine/spin';
import type { Extras } from './engine/symbols';

const MACHINE_KEY = 'slots:machine-v1';

const rng = Math.random;

/** How long the reels spin before the first one stops, and the gap between stops (ms). */
const SPIN_MS = 450;
const STOP_GAP_MS = 450;
const FEATURE_INTRO_MS = 1400;
const BONUS_STEP_MS = 950;
const LINE_CYCLE_MS = 1200;
/** A win this many times the bet lights up the WIN meter. */
const BIG_WIN = 20;

function parseFreeGames(v: unknown): FreeGames | null {
  if (!isRecord(v)) return null;
  const { left, played, won } = v;
  if (![left, played, won].every(isFiniteNumber)) return null;
  return { left: Math.max(0, Math.floor(left as number)), played: played as number, won: won as number };
}

function parseMachine(v: unknown): Machine | undefined {
  if (!isRecord(v) || !isFiniteNumber(v.bankroll)) return undefined;
  const defaults = createMachine();
  const denom = DENOMS.find((d) => d === v.denom) ?? defaults.denom;
  const credits = BET_CREDITS.find((c) => c === v.credits) ?? defaults.credits;
  return { bankroll: v.bankroll, denom, credits, freeGames: parseFreeGames(v.freeGames) };
}

/**
 * What the screen is showing for the last spin. The engine settles a spin in
 * full straight away (features included), and the screen then plays it out:
 * reels spin, a feature intro, the Greg Bonus spins, the jackpot pick game.
 */
type Stage = 'spinning' | 'intro' | 'bonus' | 'pick' | 'done';
interface Show {
  result: SpinResult;
  stage: Stage;
  /** Reels that have stopped. */
  stopped: number;
  frame: number;
  picks: Revealed;
}

/** Winnings the screen hasn't revealed yet, so the balance doesn't jump ahead of the show. */
function unrevealed(show: Show | null): number {
  if (!show) return 0;
  const r = show.result;
  switch (show.stage) {
    case 'spinning':
      return r.total;
    case 'intro':
    case 'bonus':
      return r.bonusWin + r.jackpotWin;
    case 'pick':
      return r.jackpotWin;
    case 'done':
      return 0;
  }
}

const extrasLabel = (e: Extras) =>
  [e.moScott && 'Mo Scott', e.goGreg && 'Go Greg', e.moMike && 'Mo Mike'].filter(Boolean).join(' + ');

const afterBonus = (r: SpinResult): Stage => (r.pick ? 'pick' : 'done');

/** `active`: false while another game is showing, so keyboard shortcuts don't reach this one. */
export function SlotsGame({ active }: { active: boolean }) {
  const [machine, setMachine] = useState(() => load(MACHINE_KEY, parseMachine, createMachine()));
  const [show, setShow] = useState<Show | null>(null);
  const [idleGrid] = useState(() => drawGrid(rng));
  const [lineIndex, setLineIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => save(MACHINE_KEY, machine), [machine]);

  const busy = show !== null && show.stage !== 'done';
  const free = inFreeGames(machine);
  const result = show?.result ?? null;
  const bet = result?.bet ?? betOf(machine);

  const doSpin = useCallback(() => {
    if (busy) return;
    const out = spin(machine, rng);
    if (!out) return;
    setMachine(out.machine);
    setShow({ result: out.result, stage: 'spinning', stopped: 0, frame: 0, picks: emptyPicks() });
    setLineIndex(0);
  }, [busy, machine]);

  /** Skips ahead: stops the reels, or jumps to the end of the Greg Bonus. */
  const skip = useCallback(() => {
    setShow((s) => {
      if (!s) return s;
      if (s.stage === 'spinning') return { ...s, stopped: REELS };
      if (s.stage === 'bonus' && s.result.bonus) return { ...s, frame: s.result.bonus.frames.length - 1 };
      return s;
    });
  }, []);

  const collectBonus = () => setShow((s) => (s ? { ...s, stage: afterBonus(s.result) } : s));
  const collectPick = () => setShow((s) => (s ? { ...s, stage: 'done' } : s));
  const pick = (i: number) =>
    setShow((s) => (s?.result.pick ? { ...s, picks: pickCoin(s.result.pick, s.picks, i) } : s));

  // Stop the reels one by one, then move on to any features.
  useEffect(() => {
    if (show?.stage !== 'spinning') return;
    if (show.stopped >= REELS) {
      const r = show.result;
      setShow({ ...show, stage: r.bonus || r.pick ? 'intro' : 'done' });
      return;
    }
    const t = setTimeout(
      () => setShow((s) => (s ? { ...s, stopped: s.stopped + 1 } : s)),
      show.stopped === 0 ? SPIN_MS : STOP_GAP_MS,
    );
    return () => clearTimeout(t);
  }, [show]);

  // Feature intro banner, then the feature.
  useEffect(() => {
    if (show?.stage !== 'intro') return;
    const t = setTimeout(
      () => setShow((s) => (s ? { ...s, stage: s.result.bonus ? 'bonus' : 'pick' } : s)),
      FEATURE_INTRO_MS,
    );
    return () => clearTimeout(t);
  }, [show?.stage]);

  // Play the Greg Bonus a spin at a time.
  const bonusFrames = result?.bonus?.frames.length ?? 0;
  useEffect(() => {
    if (show?.stage !== 'bonus' || show.frame >= bonusFrames - 1) return;
    const t = setTimeout(() => setShow((s) => (s ? { ...s, frame: s.frame + 1 } : s)), BONUS_STEP_MS);
    return () => clearTimeout(t);
  }, [show?.stage, show?.frame, bonusFrames]);

  // Cycle through winning lines.
  const wins = show?.stage === 'spinning' ? [] : (result?.reels.lineWins ?? []);
  useEffect(() => {
    if (wins.length < 2) return;
    const t = setInterval(() => setLineIndex((i) => i + 1), LINE_CYCLE_MS);
    return () => clearInterval(t);
  }, [wins.length]);
  const shownWin = wins.length > 0 ? wins[lineIndex % wins.length] : undefined;
  const highlight = useMemo(() => {
    const set = new Set<string>();
    if (shownWin) {
      const rows = PAYLINES[shownWin.line] ?? [];
      for (let reel = 0; reel < shownWin.count; reel++) set.add(`${reel}-${rows[reel]}`);
    }
    return set;
  }, [shownWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active || menuOpen) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || e.metaKey || e.ctrlKey) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (!busy) doSpin();
      else if (show?.stage === 'bonus' && show.frame >= bonusFrames - 1) collectBonus();
      else if (show?.stage === 'pick' && result?.pick && pickDone(result.pick, show.picks)) collectPick();
      else skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const balance = machine.bankroll - unrevealed(show);
  const canChangeBet = !busy && !free;
  const fg = machine.freeGames;

  const bonusOver = show?.stage === 'bonus' && show.frame >= bonusFrames - 1;
  const pickOver = show?.stage === 'pick' && result?.pick != null && pickDone(result.pick, show.picks);
  const action: SpinAction = bonusOver
    ? { label: 'Collect', onClick: collectBonus }
    : pickOver
      ? { label: 'Collect', onClick: collectPick }
      : show?.stage === 'pick'
        ? { label: 'Spin', onClick: () => {}, disabled: true }
        : busy
          ? // Pressing Spin mid-spin stops the reels (or ends the bonus animation) early.
            { label: 'Spin', onClick: skip, disabled: show?.stage === 'intro' }
          : {
              label: free ? 'Free spin' : 'Spin',
              ...(free ? { sub: `${fg?.left ?? 0} left` } : {}),
              onClick: doSpin,
              disabled: !canSpin(machine),
            };

  return (
    <div className="slots">
      {/* The cabinet logo is the visible title; this heading is for screen readers. */}
      <h1 className="visually-hidden">Go Greg</h1>

      <div className="slots-body">
        <main className="cabinet">
          <CabinetTop
            bet={bet}
            lit={(show?.stage === 'intro' || show?.stage === 'bonus') && result?.bonus ? result.bonus.extras : null}
          />
          <div className="play-row">
            <div className="play-center">
              {show?.stage === 'bonus' && result?.bonus ? (
                <BonusBoard run={result.bonus} frame={show.frame} bet={bet} credits={result.credits} />
              ) : show?.stage === 'pick' && result?.pick ? (
                <PickGame game={result.pick} revealed={show.picks} bet={bet} onPick={pick} />
              ) : (
                <div className="reels-frame">
                  <Reels
                    grid={result?.reels.grid ?? idleGrid}
                    credits={result?.credits ?? machine.credits}
                    stopped={show?.stopped ?? REELS}
                    highlight={highlight}
                  />
                </div>
              )}
            </div>
          </div>

          <ControlPanel
            spin={<SpinButton action={action} />}
            status={<Message show={show} freeGames={fg} line={shownWin} />}
            balance={balance}
            win={winSoFar(show)}
            bigWin={show?.stage === 'done' && result !== null && result.total >= result.bet * BIG_WIN}
            denom={machine.denom}
            credits={machine.credits}
            canChangeBet={canChangeBet}
            onCredits={(c) => setMachine((m) => setCredits(m, c))}
            onDenom={(d) => setMachine((m) => setDenom(m, d))}
            onMenu={() => setMenuOpen(true)}
          />
        </main>
      </div>

      {menuOpen && (
        <>
          <div className="modal-backdrop" />
          <div className="menu-modal" role="dialog" aria-modal="true" aria-label="Help">
            <HelpScreen
              onReturn={() => setMenuOpen(false)}
              footer={
                <button
                  type="button"
                  className="link"
                  disabled={busy || free}
                  onClick={() => setMachine((m) => ({ ...m, bankroll: START_BANKROLL, freeGames: null }))}
                >
                  Reset balance to $1,000
                </button>
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

/** What the WIN meter shows: only what the screen has revealed so far. */
function winSoFar(show: Show | null): number | null {
  if (!show) return null;
  const r = show.result;
  const base = r.lineWin + r.scatterWin;
  switch (show.stage) {
    case 'spinning':
      return null;
    case 'intro':
      return base;
    case 'bonus':
      return roundCents(base + r.bet * (r.bonus?.frames[show.frame]?.total ?? 0));
    case 'pick':
      return base + r.bonusWin;
    case 'done':
      return r.total;
  }
}

/** The status line above the WIN meter. It shows what's happening, never instructions. */
function Message({
  show,
  freeGames,
  line,
}: {
  show: Show | null;
  freeGames: FreeGames | null;
  line: LineWin | undefined;
}) {
  const r = show?.result;
  if (!show || !r) return null;

  switch (show.stage) {
    case 'spinning':
      return null;
    case 'intro':
      return (
        <span className="feature-intro">
          {r.bonus ? `Greg Bonus! ${extrasLabel(r.bonus.extras)}` : 'Jackpot game!'}
        </span>
      );
    case 'bonus': {
      const frames = r.bonus?.frames ?? [];
      return <>Greg Bonus: {frames[show.frame]?.spinsLeft ?? 0} spins left</>;
    }
    case 'pick':
      return r.pick && pickDone(r.pick, show.picks) ? <>Jackpot!</> : null;
    case 'done':
      break;
  }

  if (r.reels.freeGames > 0) {
    return (
      <>
        <SymbolIcon sym="scatter" /> {r.reels.freeGames} Free Games!
        {r.scatterWin > 0 && ` +${formatMoney(r.scatterWin)}`}
      </>
    );
  }
  if (line) {
    return (
      <>
        Line {line.line + 1}: {line.count} × {SYMBOL_ART[line.sym]}
        {line.sym.length > 1 ? ` ${SYMBOL_NAMES[line.sym]}` : ''} pays {formatMoney(r.bet * line.pay)}
      </>
    );
  }
  if (freeGames && freeGames.left === 0 && freeGames.played > 0) {
    return <>Free Games over: you won {formatMoney(freeGames.won)}</>;
  }
  if (freeGames && freeGames.left > 0) {
    return (
      <>
        Free Games: {freeGames.played} of {freeGames.played + freeGames.left} played
      </>
    );
  }
  return null;
}
