import { useMemo } from 'react';
import type { Rules } from '../engine/rules';
import { type ChartCell, strategyChart, UPCARDS } from '../engine/strategy';

const CELL_CLASS: Record<ChartCell, string> = {
  H: 'hit',
  S: 'stand',
  D: 'double',
  Ds: 'double',
  P: 'split',
  R: 'surrender',
  Rs: 'surrender',
  Rp: 'surrender',
};

/** Label for each table's rows. */
const ROW_AXIS: Record<string, string> = {
  'Hard totals': 'Your total',
  'Soft totals': 'Your hand',
  Pairs: 'Your pair',
};

interface Props {
  rules: Rules;
  /** Cell to highlight: chart row key and dealer upcard value. */
  highlight?: { key: string; up: number } | undefined;
}

export function StrategyChart({ rules, highlight }: Props) {
  const sections = useMemo(() => strategyChart(rules), [rules]);
  return (
    <div className="chart">
      <p className="legend">
        <span className="cell hit">H</span> Hit <span className="cell stand">S</span> Stand{' '}
        <span className="cell double">D</span> Double, else hit <span className="cell double">Ds</span> Double, else
        stand <span className="cell split">P</span> Split <span className="cell surrender">R</span> Surrender, else hit{' '}
        <span className="cell surrender">Rs</span> / <span className="cell surrender">Rp</span> Surrender, else stand /
        split. Never take insurance.
      </p>
      <div className="chart-tables">
        {sections.map((section) => (
          <table key={section.title}>
            <caption>{section.title}</caption>
            <thead>
              <tr>
                <th />
                <th colSpan={UPCARDS.length} className="axis axis-x">
                  Dealer's face-up card →
                </th>
              </tr>
              <tr>
                <th className="axis axis-y">{ROW_AXIS[section.title]} ↓</th>
                {UPCARDS.map((up) => (
                  <th key={up}>{up === 11 ? 'A' : up}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  {row.cells.map((cell, i) => {
                    const up = UPCARDS[i];
                    const lit = highlight?.key === row.key && highlight.up === up;
                    return (
                      <td key={up} className={`cell ${CELL_CLASS[cell]}${lit ? ' lit' : ''}`}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      {rules.decks < 4 && (
        <p className="note">This chart is for 4–8 decks. Single- and double-deck strategy differs on a few hands.</p>
      )}
    </div>
  );
}
