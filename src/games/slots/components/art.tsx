import { type Prize, prizeMult, type Tier } from '../engine/prizes';
import type { Cell } from '../engine/spin';
import type { Sym } from '../engine/symbols';
import { Greg } from './Greg';

/** Emoji for the symbols that use one. Greg and gems are drawn; Wild and Free Games are just words. */
export const SYMBOL_ART: Record<Exclude<Sym, 'greg' | 'gem' | 'scatter' | 'wild'>, string> = {
  ribs: '🍖',
  burger: '🍔',
  hotdog: '🌭',
  chicken: '🍗',
  coffee: '☕',
  A: 'A',
  K: 'K',
  Q: 'Q',
  J: 'J',
};

/** Symbols shown as words, one line each. */
const WORDS: Record<'wild' | 'scatter', readonly string[]> = {
  wild: ['WILD'],
  scatter: ['FREE', 'GAMES'],
};

export const SYMBOL_NAMES: Record<Sym, string> = {
  ribs: 'Ribs',
  burger: 'Burger',
  hotdog: 'Hot dog',
  chicken: 'Drumstick',
  coffee: 'Coffee',
  A: 'A',
  K: 'K',
  Q: 'Q',
  J: 'J',
  wild: 'Wild',
  scatter: 'Free Games',
  greg: 'Greg',
  gem: 'Gem',
};

export const TIER_NAMES: Record<Tier, string> = {
  mini: 'Mini',
  minor: 'Minor',
  maxi: 'Maxi',
  major: 'Major',
  grand: 'Grand',
};

/** A prize multiple as credits at a bet of `credits`: "50", "1,200", "12.5". */
export const creditLabel = (mult: number, credits: number) =>
  Number((mult * credits).toFixed(2)).toLocaleString('en-US');

/** Credits for cash ("200"), the name for a jackpot ("MINOR"). */
export const prizeLabel = (p: Prize, credits: number) =>
  p.kind === 'jackpot' ? TIER_NAMES[p.tier].toUpperCase() : creditLabel(prizeMult(p), credits);

/** Wild or Free Games, shown as its words. `inline` is the small version used in text. */
function WordSymbol({ sym, inline = false }: { sym: 'wild' | 'scatter'; inline?: boolean }) {
  return (
    <span className={`word-symbol${inline ? ' inline' : ''}`} role="img" aria-label={SYMBOL_NAMES[sym]}>
      {WORDS[sym].map((w) => (
        <span key={w}>{w}</span>
      ))}
    </span>
  );
}

/** A symbol on its own (paytable, messages): its emoji, or its words. */
export function SymbolIcon({ sym }: { sym: Exclude<Sym, 'greg' | 'gem'> }) {
  if (sym === 'scatter' || sym === 'wild') return <WordSymbol sym={sym} inline />;
  return <>{SYMBOL_ART[sym]}</>;
}

/** One square on the base-game reels. Gem prizes show in credits. */
export function SymbolView({ cell, credits }: { cell: Cell; credits: number }) {
  if (cell.sym === 'greg') return <Greg />;
  if (cell.sym === 'scatter' || cell.sym === 'wild') return <WordSymbol sym={cell.sym} />;
  if (cell.gem) {
    return (
      <span className={`gem gem-${cell.gem.color}`} title={`${cell.gem.color} gem`}>
        <span className="gem-prize">{prizeLabel(cell.gem.prize, credits)}</span>
      </span>
    );
  }
  const sym = cell.sym as keyof typeof SYMBOL_ART;
  const isLetter = sym.length === 1;
  return (
    <span className={isLetter ? `letter letter-${sym}` : `emoji sym-${sym}`} title={SYMBOL_NAMES[sym]}>
      {SYMBOL_ART[sym]}
    </span>
  );
}
