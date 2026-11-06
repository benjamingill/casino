/**
 * `arr[i]`, but throws instead of returning `undefined` when the index is out
 * of range. Use it where an empty slot would be a bug, not a normal case.
 */
export function at<T>(arr: readonly T[], i: number): T {
  if (i < 0 || i >= arr.length) throw new RangeError(`Index ${i} out of range (length ${arr.length})`);
  return arr[i] as T;
}
