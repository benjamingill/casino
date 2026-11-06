import { useEffect, useState } from 'react';
import './blackjack.css';
import { at, formatMoney, formatSigned, isFiniteNumber, isRecord, load, mergeDefaults, save } from '../../shared';
import { HandView } from './components/Hand';
import { RulesPanel } from './components/RulesPanel';
import { StatsPanel } from './components/StatsPanel';
import { StrategyChart } from './components/StrategyChart';
import { cardsRemaining, pointValue } from './engine/cards';
import { randomScenario } from './engine/drill';
import {
  act,
  availableActions,
  canAfford,
  canStartRound,
  changeRules,
  createGame,
  type GameState,
  insuranceCost,
  isAllowed,
  resolveInsurance,
  roundNet,
  staked,
  startRound,
  upcard,
} from './engine/game';
import { formatTotal, isBlackjack } from './engine/hand';
import { parseRules, type Rules } from './engine/rules';
import { type Action, chartKey } from './engine/strategy';
import { ACTION_LABELS, bestAction, type Decision, evaluateInsurance, evaluateMove } from './engine/trainer';
import { emptyStats, parseStats, recordDecision, recordRound, type Stats } from './stats';

interface Settings {
  rules: Rules;
  bet: number;
  drill: boolean;
}

const SETTINGS_KEY = 'bj-trainer-settings-v1';
const STATS_KEY = 'bj-trainer-stats-v1';
const BANKROLL_KEY = 'bj-trainer-bankroll-v1';
const START_BANKROLL = 1000;
const CHIPS = [5, 10, 25, 50, 100];

const KEYS: Record<string, Action> = { h: 'hit', s: 'stand', d: 'double', p: 'split', r: 'surrender' };

/** Bets are whole dollars. */
const toBet = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0);

function parseSettings(saved: unknown): Settings {
  const s = mergeDefaults({ bet: 10, drill: false }, saved);
  return { ...s, bet: toBet(s.bet), rules: parseRules(isRecord(saved) ? saved.rules : undefined) };
}

const parseBankroll = (v: unknown) => (isFiniteNumber(v) ? v : undefined);
const loadSettings = () => load(SETTINGS_KEY, parseSettings, parseSettings(undefined));

type Tab = 'stats' | 'chart' | 'rules';

/** `active`: false while another game is showing, so keyboard shortcuts don't reach this one. */
export function BlackjackGame({ active }: { active: boolean }) {
  const [settings, setSettings] = useState(loadSettings);
  const [game, setGame] = useState<GameState>(() =>
    createGame(settings.rules, load(BANKROLL_KEY, parseBankroll, START_BANKROLL)),
  );
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, parseStats, emptyStats()));
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [tab, setTab] = useState<Tab>('stats');

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => save(STATS_KEY, stats), [stats]);
  useEffect(() => save(BANKROLL_KEY, game.bankroll), [game.bankroll]);

  function commit(next: GameState, decision?: Decision) {
    if (decision) {
      setDecisions((d) => [...d, decision]);
      setStats((st) => recordDecision(st, decision));
    }
    if (next.phase === 'roundOver') setStats((st) => recordRound(st, next));
    setGame(next);
    setShowHint(false);
  }

  const canBet = settings.bet > 0 && canAfford(game, settings.bet);
  const canInsure = game.phase === 'insurance' && canAfford(game, insuranceCost(game));
  const deal = () => {
    if (!canStartRound(game) || !canBet) return;
    setDecisions([]);
    commit(startRound(game, settings.bet, settings.drill ? randomScenario() : undefined));
  };
  const play = (action: Action) => {
    if (isAllowed(game, action)) commit(act(game, action), evaluateMove(game, action));
  };
  const insurance = (take: boolean) => {
    if (game.phase === 'insurance' && (!take || canInsure)) {
      commit(resolveInsurance(game, take), evaluateInsurance(game, take));
    }
  };
  const updateRules = (rules: Rules) => {
    setSettings((s) => ({ ...s, rules }));
    setGame((g) => changeRules(g, rules));
    setDecisions([]);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (!active) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || e.metaKey || e.ctrlKey) return;
      const key = e.key.toLowerCase();
      if (game.phase === 'playerTurn' && KEYS[key]) play(KEYS[key]);
      else if (game.phase === 'playerTurn' && key === '?') setShowHint(true);
      else if (game.phase === 'insurance' && (key === 'y' || key === 'n')) insurance(key === 'y');
      else if (canStartRound(game) && (key === 'enter' || key === ' ')) {
        e.preventDefault();
        deal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const options = availableActions(game);
  const activeHand = game.hands[game.active];
  const hint = game.phase === 'playerTurn' && showHint ? bestAction(game) : null;
  const highlight =
    hint && activeHand
      ? { key: chartKey(activeHand.cards, options.canSplit), up: pointValue(upcard(game).rank) }
      : undefined;
  const lastDecision = decisions[decisions.length - 1];
  const net = game.phase === 'roundOver' ? roundNet(game) : 0;

  const dealerLabel =
    game.dealer.length === 0
      ? ''
      : game.holeRevealed
        ? formatTotal(game.dealer)
        : `Showing ${upcard(game).rank === 'A' ? 'A' : pointValue(upcard(game).rank)}`;

  return (
    <div className="blackjack">
      <header>
        <h1>Blackjack Trainer</h1>
        <div className="header-info">
          <span>
            Bankroll <strong>{formatMoney(game.bankroll)}</strong>
            {!canStartRound(game) && ` (${formatMoney(staked(game))} on the table)`}
          </span>
          <span>
            Shoe: {cardsRemaining(game.shoe)} cards left ({game.rules.decks} decks)
          </span>
          <button
            type="button"
            className="link"
            disabled={!canStartRound(game)}
            onClick={() => setGame((g) => ({ ...g, bankroll: START_BANKROLL }))}
          >
            Reset bankroll
          </button>
        </div>
      </header>

      <main className="table">
        <section className="dealer-area">
          {game.dealer.length > 0 ? (
            <HandView cards={game.dealer} label="Dealer" total={dealerLabel} hideSecond={!game.holeRevealed} />
          ) : (
            <p className="placeholder">Place a bet and deal to start.</p>
          )}
        </section>

        <div className="rules-strip">
          {game.rules.blackjackPayout === 1.5 ? 'Blackjack pays 3:2' : 'Blackjack pays 6:5'} · Dealer{' '}
          {game.rules.dealerHitsSoft17 ? 'hits' : 'stands on'} soft 17
          {game.rules.insurance && ' · Insurance pays 2:1'}
        </div>

        <section className="player-area">
          {game.hands.map((h, i) => (
            <HandView
              // biome-ignore lint/suspicious/noArrayIndexKey: a hand's position is its identity ("Hand 2"), and HandView has no state.
              key={i}
              cards={h.cards}
              label={game.hands.length > 1 ? `Hand ${i + 1}` : 'You'}
              total={formatTotal(h.cards, h.fromSplit)}
              active={game.phase === 'playerTurn' && i === game.active}
              bet={h.bet}
              outcome={h.outcome}
              net={h.net}
            />
          ))}
        </section>

        <section className="feedback" aria-live="polite">
          {game.reshuffled && game.phase !== 'betting' && decisions.length === 0 && (
            <div className="banner info">New shoe shuffled.</div>
          )}
          {lastDecision && (
            <div className={`banner ${lastDecision.correct ? 'good' : 'bad'}`}>
              {lastDecision.correct ? '✓ Correct' : '✗ Mistake'}: {lastDecision.situation}.{' '}
              {lastDecision.correct
                ? `${lastDecision.chosen} is right.`
                : `You chose ${lastDecision.chosen}; basic strategy says ${lastDecision.recommended}.`}
            </div>
          )}
          {hint && (
            <div className="banner info">
              Hint: <strong>{ACTION_LABELS[hint]}</strong>
            </div>
          )}
          {game.phase === 'roundOver' && (
            <div className="round-summary">
              {isBlackjack(game.dealer) && 'Dealer has blackjack. '}
              {game.insuranceBet > 0 &&
                `Insurance ${game.insuranceNet > 0 ? 'won' : 'lost'} ${formatMoney(game.insuranceNet)}. `}
              Round result:{' '}
              <strong className={net > 0 ? 'good' : net < 0 ? 'bad' : ''}>{formatSigned(net, 'even')}</strong>
              {decisions.length > 0 && (
                <>
                  {' '}
                  · Decisions this round: {decisions.filter((d) => d.correct).length}/{decisions.length} correct
                </>
              )}
            </div>
          )}
        </section>

        <section className="controls">
          {canStartRound(game) && (
            <div className="betting">
              <div className="chips">
                {CHIPS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={`chip${settings.bet === c ? ' selected' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, bet: c }))}
                  >
                    ${c}
                  </button>
                ))}
                <label className="bet-input">
                  Bet $
                  <input
                    type="number"
                    min={1}
                    value={settings.bet}
                    onChange={(e) => setSettings((s) => ({ ...s, bet: toBet(Number(e.target.value)) }))}
                  />
                </label>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={settings.drill}
                  onChange={(e) => setSettings((s) => ({ ...s, drill: e.target.checked }))}
                />
                Drill mode (deal only soft hands, pairs, 9–11 and 12–16)
              </label>
              <button type="button" className="primary" onClick={deal} disabled={!canBet}>
                {game.phase === 'roundOver' ? 'Deal again' : 'Deal'} <kbd>Enter</kbd>
              </button>
              {settings.bet > game.bankroll && (
                <span className="muted">
                  Your bet is more than your {formatMoney(game.bankroll)} bankroll. Lower it or reset the bankroll.
                </span>
              )}
            </div>
          )}

          {game.phase === 'insurance' && (
            <div className="actions">
              <span>
                {isBlackjack(at(game.hands, 0).cards)
                  ? 'Take even money?'
                  : `Insurance? (costs ${formatMoney(insuranceCost(game))})`}
                {!canInsure && ' Not enough money left to take it.'}
              </span>
              <button type="button" onClick={() => insurance(true)} disabled={!canInsure}>
                Yes <kbd>Y</kbd>
              </button>
              <button type="button" onClick={() => insurance(false)}>
                No <kbd>N</kbd>
              </button>
            </div>
          )}

          {game.phase === 'playerTurn' && (
            <div className="actions">
              <button type="button" onClick={() => play('hit')} disabled={!options.canHit}>
                Hit <kbd>H</kbd>
              </button>
              <button type="button" onClick={() => play('stand')}>
                Stand <kbd>S</kbd>
              </button>
              <button type="button" onClick={() => play('double')} disabled={!options.canDouble}>
                Double <kbd>D</kbd>
              </button>
              <button type="button" onClick={() => play('split')} disabled={!options.canSplit}>
                Split <kbd>P</kbd>
              </button>
              <button type="button" onClick={() => play('surrender')} disabled={!options.canSurrender}>
                Surrender <kbd>R</kbd>
              </button>
              <button type="button" className="secondary" onClick={() => setShowHint(true)}>
                Hint <kbd>?</kbd>
              </button>
            </div>
          )}
        </section>
      </main>

      <nav className="tabs">
        {(['stats', 'chart', 'rules'] as Tab[]).map((t) => (
          <button type="button" key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
            {{ stats: 'Your stats', chart: 'Strategy chart', rules: 'Table rules' }[t]}
          </button>
        ))}
      </nav>
      <section className="panel">
        {tab === 'stats' && <StatsPanel stats={stats} onReset={() => setStats(emptyStats())} />}
        {tab === 'chart' && <StrategyChart rules={game.rules} highlight={highlight} />}
        {tab === 'rules' && <RulesPanel rules={game.rules} disabled={!canStartRound(game)} onChange={updateRules} />}
      </section>
    </div>
  );
}
