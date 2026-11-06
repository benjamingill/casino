import { type ReactNode, useState } from 'react';
import { BONUS_START_SPINS, FREE_GAMES, SCATTER_PAYS } from '../engine/config';
import { PAYLINES } from '../engine/paylines';
import { JACKPOT_MULT, TIERS } from '../engine/prizes';
import { PAYING, PAYTABLE } from '../engine/symbols';
import { SYMBOL_ART, SYMBOL_NAMES, SymbolIcon, TIER_NAMES } from './art';
import { Greg } from './Greg';

/** "25×", "0.5×", "2,000×". */
const times = (mult: number) => `${mult.toLocaleString('en-US')}×`;

function PaytablePage() {
  return (
    <>
      <table className="pay-table">
        <thead>
          <tr>
            <th aria-label="Symbol" />
            <th>5</th>
            <th>4</th>
            <th>3</th>
          </tr>
        </thead>
        <tbody>
          {PAYING.map((s) => (
            <tr key={s}>
              <th scope="row">
                <span className="pay-sym">{SYMBOL_ART[s]}</span>
                {s.length > 1 && <span className="pay-name">{SYMBOL_NAMES[s]}</span>}
              </th>
              {[...PAYTABLE[s]].reverse().map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns are 5, 4 and 3 of a kind.
                <td key={i}>{times(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="help-row">
        <span className="pay-sym">
          <SymbolIcon sym="wild" />
        </span>{' '}
        Wild appears on reels 2, 3, 4 and 5 and substitutes for all symbols except <Greg size="1.2em" />, gems and{' '}
        <SymbolIcon sym="scatter" />.
      </p>
      <p className="help-note">All pays are multiples of the total bet.</p>
    </>
  );
}

function BonusPage() {
  return (
    <>
      <p className="help-row">
        <span className="inline-greg">
          <Greg size="1.6em" />
        </span>
        Greg appears on reel 1 only. Greg with any gem triggers the Greg Bonus. Gems can also trigger it at random.
      </p>
      <ul className="help-gems">
        <li>
          <span className="gem gem-green mini-gem" /> <strong>Mo' Scotts</strong>: coins and diamonds may award +1 spin.
        </li>
        <li>
          <span className="gem gem-red mini-gem" /> <strong>Go Greg</strong>: the bonus plays on an 8×5 board, and bonus
          prizes may be added inside Greg.
        </li>
        <li>
          <span className="gem gem-blue mini-gem" /> <strong>Mo' Mikes</strong>: coins and diamonds may land doubled.
        </li>
      </ul>
      <p className="help-row">
        The bonus starts with {BONUS_START_SPINS} spins. Greg collects coins landing inside him and diamonds anywhere.
      </p>
      <table className="pay-table grow-table">
        <thead>
          <tr>
            <th>💎 collected</th>
            <th>Greg</th>
            <th>Spins</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>5</td>
            <td>3×3</td>
            <td>+3</td>
          </tr>
          <tr>
            <td>9</td>
            <td>4×4</td>
            <td>+2</td>
          </tr>
          <tr>
            <td>12</td>
            <td>5×5</td>
            <td>+1</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function FeaturesPage() {
  return (
    <>
      <p className="help-row">
        <span className="pay-sym">
          <SymbolIcon sym="scatter" />
        </span>{' '}
        3, 4 or 5 anywhere award {FREE_GAMES} Free Games plus {SCATTER_PAYS.map(times).join(', ')} the total bet. Free
        Games can retrigger and play at the triggering bet.
      </p>
      <p className="help-row">Any Wild may trigger the jackpot feature. Three matching jackpots award that jackpot.</p>
      <div className="help-jackpots">
        {[...TIERS].reverse().map((t) => (
          <div key={t} className={`plaque plaque-small tier-${t}`}>
            <span className="plaque-name">{TIER_NAMES[t].toUpperCase()}</span>
            <span className="plaque-amount">{times(JACKPOT_MULT[t])}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function GameRulesPage() {
  return (
    <ul className="help-rules">
      <li>{PAYLINES.length} lines.</li>
      <li>All wins pay left to right on adjacent reels, starting from the leftmost reel.</li>
      <li>Only the highest win is paid on each line. Wins on different lines are added.</li>
      <li>Scatter, bonus and jackpot wins are added to line wins.</li>
      <li>Malfunction voids all pays and plays.</li>
    </ul>
  );
}

const PAGES: readonly { title: string; body: () => ReactNode }[] = [
  { title: 'Paytable', body: PaytablePage },
  { title: 'Greg Bonus', body: BonusPage },
  { title: 'Free Games & Jackpots', body: FeaturesPage },
  { title: 'Game Rules', body: GameRulesPage },
];

/** The machine's help screen: pages flipped with ◀ ▶, then Return to the game. */
export function HelpScreen({ footer, onReturn }: { footer?: ReactNode; onReturn: () => void }) {
  const [page, setPage] = useState(0);
  const current = PAGES[page] ?? PAGES[0];
  if (!current) return null;
  const Body = current.body;

  return (
    <div className="help-screen">
      <h2 className="help-title">{current.title}</h2>
      <div className="help-body">
        <Body />
      </div>
      <div className="help-nav">
        <button
          type="button"
          className="yellow-btn help-arrow"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          ◀
        </button>
        <span className="help-dots" role="img" aria-label={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((p, i) => (
            <span key={p.title} className={i === page ? 'on' : ''} />
          ))}
        </span>
        <button
          type="button"
          className="yellow-btn help-arrow"
          aria-label="Next page"
          disabled={page === PAGES.length - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          ▶
        </button>
      </div>
      <div className="help-actions">
        {footer}
        <button type="button" className="yellow-btn help-return" onClick={onReturn}>
          Return
        </button>
      </div>
    </div>
  );
}
