import { useMemo } from 'react';
import type { Grid } from '../engine/spin';
import { SYMBOL_ART, SymbolView } from './art';

const BLUR = Object.values(SYMBOL_ART);

/**
 * The 5×3 reels. Reels at index `stopped` and above are still spinning.
 * `highlight` holds "reel-row" keys for squares in a winning line.
 */
export function Reels({
  grid,
  credits,
  stopped,
  highlight,
}: {
  grid: Grid;
  /** Credits bet, for showing gem prizes in credits. */
  credits: number;
  stopped: number;
  highlight: ReadonlySet<string>;
}) {
  // A fixed shuffle of symbols for each spinning reel, so the blur doesn't change every render.
  const strips = useMemo(
    () => grid.map((_, r) => Array.from({ length: 10 }, (_, i) => BLUR[(i * 7 + r * 3) % BLUR.length])),
    [grid],
  );
  return (
    <div className="reels">
      {grid.map((cells, reel) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: reels are fixed positions.
        <div className="reel" key={reel}>
          {reel >= stopped ? (
            <div className="reel-strip" aria-hidden="true">
              {[...(strips[reel] ?? []), ...(strips[reel] ?? [])].map((s, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: decorative, never reordered.
                <span key={i}>{s}</span>
              ))}
            </div>
          ) : (
            cells.map((cell, row) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are fixed positions.
                key={row}
                className={`reel-cell landed${highlight.has(`${reel}-${row}`) ? ' win' : ''}`}
              >
                <SymbolView cell={cell} credits={credits} />
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
