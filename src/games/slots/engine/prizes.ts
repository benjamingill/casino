export type Tier = 'mini' | 'minor' | 'maxi' | 'major' | 'grand';
export const TIERS: readonly Tier[] = ['mini', 'minor', 'maxi', 'major', 'grand'];

/** Fixed jackpots, as multiples of the total bet. */
export const JACKPOT_MULT: Record<Tier, number> = { mini: 10, minor: 25, maxi: 100, major: 500, grand: 2000 };

/** What a gem, coin or diamond pays: cash (a multiple of the bet) or a jackpot. */
export type Prize = { kind: 'cash'; mult: number } | { kind: 'jackpot'; tier: Tier };

export const prizeMult = (p: Prize) => (p.kind === 'cash' ? p.mult : JACKPOT_MULT[p.tier]);

export const cash = (mult: number): Prize => ({ kind: 'cash', mult });
export const jackpot = (tier: Tier): Prize => ({ kind: 'jackpot', tier });
