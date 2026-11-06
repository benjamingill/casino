import { formatSigned } from '../../../shared';
import type { Category } from '../engine/trainer';
import type { Stats } from '../stats';

const pct = (correct: number, total: number) => (total ? `${Math.round((correct / total) * 100)}%` : '—');

const CATEGORY_LABELS: Record<Category, string> = {
  hard: 'Hard totals',
  soft: 'Soft totals',
  pair: 'Pairs',
  insurance: 'Insurance',
};

export function StatsPanel({ stats, onReset }: { stats: Stats; onReset: () => void }) {
  const money = formatSigned(stats.net, '$0');
  return (
    <div className="stats">
      <div className="stat-tiles">
        <div className="tile">
          <div className="tile-value">{pct(stats.correct, stats.decisions)}</div>
          <div className="tile-label">
            Accuracy ({stats.correct}/{stats.decisions})
          </div>
        </div>
        <div className="tile">
          <div className="tile-value">{stats.rounds}</div>
          <div className="tile-label">Rounds played</div>
        </div>
        <div className="tile">
          <div className="tile-value">
            {stats.wins}–{stats.losses}–{stats.pushes}
          </div>
          <div className="tile-label">Hands won–lost–pushed</div>
        </div>
        <div className="tile">
          <div className="tile-value">{money}</div>
          <div className="tile-label">Net winnings</div>
        </div>
      </div>

      <table className="category-table">
        <thead>
          <tr>
            <th>Hand type</th>
            <th>Decisions</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <tr key={c}>
              <td>{CATEGORY_LABELS[c]}</td>
              <td>{stats.byCategory[c].decisions}</td>
              <td>{pct(stats.byCategory[c].correct, stats.byCategory[c].decisions)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Recent mistakes</h3>
      {stats.mistakes.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <ul className="mistakes">
          {stats.mistakes.slice(0, 10).map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: plain text rows with no state, and repeated mistakes have identical text.
            <li key={i}>
              <strong>{m.situation}</strong>: you chose {m.chosen}, basic strategy says {m.recommended}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="secondary" onClick={onReset}>
        Reset stats
      </button>
    </div>
  );
}
