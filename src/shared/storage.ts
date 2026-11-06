/**
 * Reads a saved value and checks it with `parse`. Saved data can be missing,
 * corrupt or from an older version of the app, so `parse` gets `unknown` and
 * returns `undefined` for anything it can't use, which gives back `fallback`.
 */
export function load<T>(key: string, parse: (value: unknown) => T | undefined, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return parse(JSON.parse(raw)) ?? fallback;
  } catch {
    // localStorage can be unavailable (private windows, blocked storage), and JSON can be corrupt.
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const PRIMITIVES = new Set(['string', 'number', 'boolean']);

/**
 * Builds a value from `defaults`, taking each string, number or boolean field
 * from `saved` only when it has the same type as the default. Unknown and
 * mistyped fields are dropped. Nested objects and arrays always keep their
 * defaults, so check those separately.
 */
export function mergeDefaults<T extends object>(defaults: T, saved: unknown): T {
  if (!isRecord(saved)) return { ...defaults };
  const out: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [k, def] of Object.entries(defaults)) {
    const v = saved[k];
    if (!PRIMITIVES.has(typeof def) || typeof v !== typeof def) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    out[k] = v;
  }
  return out as T;
}
