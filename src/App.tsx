import { type ComponentType, lazy, Suspense, useEffect, useState } from 'react';
import { SlotsGame } from './games/slots/SlotsGame';
import { load, save } from './shared';

/** Casino games. `active` is false while another game is showing. */
const GAMES: readonly { id: string; label: string; title: string; Game: ComponentType<{ active: boolean }> }[] = [
  { id: 'slots', label: 'Slots', title: 'Slot Machine', Game: SlotsGame },
];

/**
 * The blackjack trainer isn't part of the casino. It's only reachable at this
 * unlinked URL, and its code is only downloaded when someone opens it. The
 * code is still public, so this keeps it out of sight, not secret.
 */
const TRAINER_HASH = '#trainer';
const BlackjackTrainer = lazy(() =>
  import('./games/blackjack/BlackjackGame').then((m) => ({ default: m.BlackjackGame })),
);

const LAST_GAME_KEY = 'casino:last-game';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function App() {
  return useHash() === TRAINER_HASH ? <Trainer /> : <Casino />;
}

function Trainer() {
  useEffect(() => {
    document.title = 'Blackjack Trainer';
  }, []);
  return (
    <Suspense fallback={null}>
      <BlackjackTrainer active />
    </Suspense>
  );
}

/**
 * Switches between the casino games. Each game is independent (its own
 * bankroll, stats and saved data). All games stay mounted and hidden ones keep
 * their state, so switching away mid-round and back picks up where you left off.
 */
function Casino() {
  const [current, setCurrent] = useState(() =>
    load(LAST_GAME_KEY, (v) => (GAMES.some((g) => g.id === v) ? (v as string) : undefined), GAMES[0]?.id ?? ''),
  );

  useEffect(() => {
    save(LAST_GAME_KEY, current);
    document.title = GAMES.find((g) => g.id === current)?.title ?? 'Casino';
  }, [current]);

  return (
    <>
      {GAMES.length > 1 && (
        <nav className="game-switcher" aria-label="Games">
          {GAMES.map((g) => (
            <button
              type="button"
              key={g.id}
              className={g.id === current ? 'selected' : ''}
              aria-pressed={g.id === current}
              onClick={() => setCurrent(g.id)}
            >
              {g.label}
            </button>
          ))}
        </nav>
      )}
      {GAMES.map(({ id, Game }) => (
        <div key={id} hidden={id !== current}>
          <Game active={id === current} />
        </div>
      ))}
    </>
  );
}
