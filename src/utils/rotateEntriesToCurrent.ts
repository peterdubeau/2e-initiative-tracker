/** Rotate full initiative list so entries[currentIndex] is first (wrap). */
export function rotateEntriesToCurrent<T>(
  entries: T[],
  currentIndex: number
): T[] {
  if (entries.length === 0) return entries;
  if (currentIndex < 0 || currentIndex >= entries.length) return entries;
  return [...entries.slice(currentIndex), ...entries.slice(0, currentIndex)];
}

type WithIdAndHidden = { id: string; hidden: boolean };

/** Visible-only rotation for player view; fallback to visible order if current is hidden. */
export function rotateVisibleEntriesToCurrent<T extends WithIdAndHidden>(
  entries: T[],
  currentIndex: number
): T[] {
  const visible = entries.filter((e) => !e.hidden);
  const currentId = entries[currentIndex]?.id;
  const i = visible.findIndex((e) => e.id === currentId);
  if (i < 0) return visible;
  return [...visible.slice(i), ...visible.slice(0, i)];
}
