import { DECK_OPTIONS, DEFAULT_RULES, isDoubleOn, MAX_HANDS_OPTIONS, type Rules } from '../engine/rules';

/** The rules that are on/off switches. */
type BoolRule = { [K in keyof Rules]: Rules[K] extends boolean ? K : never }[keyof Rules];

interface Props {
  rules: Rules;
  disabled: boolean;
  onChange: (rules: Rules) => void;
}

export function RulesPanel({ rules, disabled, onChange }: Props) {
  const set = <K extends keyof Rules>(key: K, value: Rules[K]) => onChange({ ...rules, [key]: value });
  const check = (key: BoolRule, label: string) => (
    <label className="check">
      <input type="checkbox" checked={rules[key]} disabled={disabled} onChange={(e) => set(key, e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div className="rules">
      <p className="muted">
        Match these to the rules card at your table. Changing a rule starts a fresh shoe.
        {disabled && ' Finish the current hand to change rules.'}
      </p>
      <div className="rules-grid">
        <label>
          Decks
          <select value={rules.decks} disabled={disabled} onChange={(e) => set('decks', Number(e.target.value))}>
            {DECK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dealer on soft 17
          <select
            value={rules.dealerHitsSoft17 ? 'hit' : 'stand'}
            disabled={disabled}
            onChange={(e) => set('dealerHitsSoft17', e.target.value === 'hit')}
          >
            <option value="hit">Hits (H17)</option>
            <option value="stand">Stands (S17)</option>
          </select>
        </label>
        <label>
          Blackjack pays
          <select
            value={rules.blackjackPayout}
            disabled={disabled}
            onChange={(e) => set('blackjackPayout', Number(e.target.value))}
          >
            <option value={1.5}>3:2</option>
            <option value={1.2}>6:5</option>
          </select>
        </label>
        <label>
          Double on
          <select
            value={rules.doubleOn}
            disabled={disabled}
            onChange={(e) => isDoubleOn(e.target.value) && set('doubleOn', e.target.value)}
          >
            <option value="any">Any two cards</option>
            <option value="9-11">9, 10, 11 only</option>
            <option value="10-11">10, 11 only</option>
          </select>
        </label>
        <label>
          Split up to
          <select value={rules.maxHands} disabled={disabled} onChange={(e) => set('maxHands', Number(e.target.value))}>
            {MAX_HANDS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} hands
              </option>
            ))}
          </select>
        </label>
        <label>
          Cut card at
          <select
            value={rules.penetration}
            disabled={disabled}
            onChange={(e) => set('penetration', Number(e.target.value))}
          >
            {[0.6, 0.67, 0.75, 0.8, 0.85].map((p) => (
              <option key={p} value={p}>
                {Math.round(p * 100)}% of the shoe
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rules-checks">
        {check('doubleAfterSplit', 'Double after split')}
        {check('resplitAces', 'Resplit aces')}
        {check('hitSplitAces', 'Hit split aces')}
        {check('lateSurrender', 'Late surrender')}
        {check('insurance', 'Insurance offered')}
      </div>
      <button type="button" className="secondary" disabled={disabled} onClick={() => onChange(DEFAULT_RULES)}>
        Restore defaults
      </button>
    </div>
  );
}
