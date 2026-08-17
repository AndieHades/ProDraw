export function createCompoundEntry(entries) {
  const filtered = (entries || []).filter(Boolean);
  return filtered.length ? { kind: 'compound-patch', entries: filtered } : null;
}

export const isCompoundEntry = (entry) => entry?.kind === 'compound-patch' &&
  Array.isArray(entry.entries);

export function swapCompoundEntry(entry, swap) {
  if (!isCompoundEntry(entry)) return null;
  const inverses = [];
  for (const child of entry.entries) {
    const inverse = swap(child);
    if (!inverse) {
      for (let index = inverses.length - 1; index >= 0; index--) swap(inverses[index]);
      return null;
    }
    inverses.push(inverse);
  }
  return createCompoundEntry(inverses.reverse());
}
