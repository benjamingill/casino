import { useEffect, useState } from 'react';
import { JACKPOT_MULT, type Tier } from '../engine/prizes';
import type { Extras, GemColor } from '../engine/symbols';
import { TIER_NAMES } from './art';
import { Greg } from './Greg';

/** How long the banner shows each gem colour (ms). */
const BANNER_MS = 2500;

const GEM_FILL: Record<GemColor, [string, string]> = {
  green: ['#8ff0b8', '#1f9a58'],
  red: ['#ff9a8f', '#b8281f'],
  blue: ['#9cc3ff', '#2557b8'],
};

/** A pile of cut gems: a few rows of small facets heaped into a mound. */
const PILE: readonly [number, number][] = [
  [22, 40],
  [32, 36],
  [42, 34],
  [52, 34],
  [62, 36],
  [72, 40],
  [27, 31],
  [37, 28],
  [47, 26],
  [57, 27],
  [67, 31],
  [42, 20],
  [52, 19],
  [62, 23],
  [33, 22],
  [48, 13],
];

/** A smoking kettle grill heaped with gems of one colour. */
function GemGrill({ color }: { color: GemColor }) {
  const [light, dark] = GEM_FILL[color];
  return (
    <svg viewBox="0 0 100 100" className="feature-grill" aria-hidden="true">
      {/* Smoke */}
      <circle className="smoke s1" cx="30" cy="12" r="4" fill="#d8d8d8" opacity="0.6" />
      <circle className="smoke s2" cx="68" cy="8" r="3.5" fill="#d8d8d8" opacity="0.6" />
      <circle className="smoke s3" cx="50" cy="4" r="3" fill="#d8d8d8" opacity="0.6" />
      {/* Gems */}
      {PILE.map(([x, y]) => (
        <polygon
          key={`${x}-${y}`}
          points={`${x},${y - 6} ${x + 6},${y - 2} ${x + 4},${y + 5} ${x - 4},${y + 5} ${x - 6},${y - 2}`}
          fill={(x + y) % 3 === 0 ? light : dark}
          stroke={light}
          strokeWidth="0.8"
        />
      ))}
      {/* Grate, kettle bowl and legs */}
      <rect x="8" y="42" width="84" height="6" rx="3" fill="#9aa3ad" />
      <path d="M12 48 Q14 82 50 84 Q86 82 88 48 Z" fill="#2b2b2b" />
      <path d="M20 54 Q24 74 42 78" stroke="#4a4a4a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M32 82 L24 99 M68 82 L76 99" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Coins in the heap, back rows first: [x, y]. */
const COINS: readonly [number, number][] = [
  [30, 22],
  [44, 18],
  [58, 19],
  [70, 23],
  [22, 28],
  [37, 26],
  [51, 25],
  [65, 27],
  [78, 29],
  [14, 33],
  [28, 32],
  [43, 31],
  [57, 31],
  [72, 32],
  [86, 33],
];

/** A little heap of gold coins that sits on top of a banner badge. */
function CoinPile() {
  return (
    <svg viewBox="0 0 100 40" className="coin-pile" aria-hidden="true">
      <ellipse cx="50" cy="34" rx="46" ry="6" fill="#8a5a00" />
      <path d="M8 34 Q50 4 92 34 Z" fill="#c8900e" />
      {COINS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y + 1.5} rx="7" ry="3.2" fill="#9a6a00" />
          <ellipse cx={x} cy={y} rx="7" ry="3.2" fill="#f5c542" stroke="#b07a00" strokeWidth="0.8" />
          <ellipse cx={x - 1.5} cy={y - 0.8} rx="3" ry="1.1" fill="#fff3b0" opacity="0.8" />
        </g>
      ))}
      <circle cx="44" cy="14" r="1.6" fill="#fff" opacity="0.9" />
      <circle cx="72" cy="20" r="1.2" fill="#fff" opacity="0.8" />
    </svg>
  );
}

/** All five jackpots on one line, the Grand in the middle. */
const PLAQUES: readonly { tier: Tier; size: 'big' | 'mid' | 'small' }[] = [
  { tier: 'minor', size: 'small' },
  { tier: 'major', size: 'mid' },
  { tier: 'grand', size: 'big' },
  { tier: 'maxi', size: 'mid' },
  { tier: 'mini', size: 'small' },
];

/** "$2,000" for whole dollars, "$62.50" otherwise. Whole amounts drop the ".00" to save space. */
const dollars = (n: number) => {
  const cents = Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: cents, maximumFractionDigits: cents })}`;
};

function Plaque({ tier, bet, size }: { tier: Tier; bet: number; size: 'big' | 'mid' | 'small' }) {
  return (
    <div className={`plaque plaque-${size} tier-${tier}`}>
      <span className="plaque-name">{TIER_NAMES[tier].toUpperCase()}</span>
      <span className="plaque-amount">{dollars(bet * JACKPOT_MULT[tier])}</span>
    </div>
  );
}

const FEATURES: readonly { color: GemColor; extra: keyof Extras; label: string }[] = [
  { color: 'green', extra: 'moScott', label: "Mo' Scotts" },
  { color: 'red', extra: 'goGreg', label: 'Go Greg' },
  { color: 'blue', extra: 'moMike', label: "Mo' Mikes" },
];

/**
 * The top of the cabinet: a row of jackpot plaques, and a gem-heaped grill for each
 * Greg Bonus extra. `lit` marks the extras in play during a bonus; otherwise all three glow.
 */
export function CabinetTop({ bet, lit }: { bet: number; lit: Extras | null }) {
  // The banner cycles through what each gem colour awards.
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), BANNER_MS);
    return () => clearInterval(t);
  }, []);
  const shown = FEATURES[step % FEATURES.length] ?? FEATURES[0];
  if (!shown) return null;

  return (
    <div className="cabinet-top">
      <div className="plaques">
        {PLAQUES.map((p) => (
          <Plaque key={p.tier} tier={p.tier} bet={bet} size={p.size} />
        ))}
      </div>
      <div className="features">
        {FEATURES.map((f) => {
          const state = lit ? (lit[f.extra] ? ' on' : ' off') : '';
          return (
            <div key={f.extra} className={`feature feature-${f.color}${state}`}>
              <GemGrill color={f.color} />
              <span className="feature-label">{f.label}</span>
            </div>
          );
        })}
      </div>
      <div className="trigger-strip">
        <span className="strip-end">
          <CoinPile />
          Free Games
        </span>
        <span className="strip-middle" key={shown.color}>
          <span className="strip-greg">
            <Greg />
          </span>
          with
          <span className={`gem gem-${shown.color} strip-gem`} role="img" aria-label={`${shown.color} gem`} />
          awards
          <span className={`strip-award feature-${shown.color}`}>{shown.label}</span>
        </span>
        <span className="strip-end">
          <CoinPile />
          Jackpot
        </span>
      </div>
    </div>
  );
}
