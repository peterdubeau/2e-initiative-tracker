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

/**
 * Resolve the player-facing "current" index.
 * If the active index is hidden, stick to the most recent visible index so
 * hidden turns advance silently without revealing where they are.
 */
export function getPlayerVisibleTurnIndex<T extends WithIdAndHidden>(
  entries: T[],
  currentIndex: number
): number {
  if (entries.length === 0) return -1;
  if (currentIndex < 0 || currentIndex >= entries.length) return -1;
  if (!entries[currentIndex].hidden) return currentIndex;

  for (let i = 1; i <= entries.length; i++) {
    const candidate = (currentIndex - i + entries.length) % entries.length;
    if (!entries[candidate].hidden) {
      return candidate;
    }
  }

  return -1;
}

/** Visible-only rotation for player view, anchored to player-visible turn index. */
export function rotateVisibleEntriesToCurrent<T extends WithIdAndHidden>(
  entries: T[],
  currentIndex: number
): T[] {
  const visible = entries.filter((e) => !e.hidden);
  const visibleTurnIndex = getPlayerVisibleTurnIndex(entries, currentIndex);
  const currentId = entries[visibleTurnIndex]?.id;
  const i = visible.findIndex((e) => e.id === currentId);
  if (i < 0) return visible;
  return [...visible.slice(i), ...visible.slice(0, i)];
}
