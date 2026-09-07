export interface CompoundEntry {
  readonly kind: "compound-patch";
  readonly entries: readonly unknown[];
}

export function createCompoundEntry(
  entries: readonly unknown[] | null | undefined
): CompoundEntry | null {
  const filtered = (entries || []).filter(Boolean);
  return filtered.length ? { kind: "compound-patch", entries: filtered } : null;
}

export const isCompoundEntry = (entry: unknown): entry is CompoundEntry =>
  (entry as CompoundEntry | null)?.kind === "compound-patch" &&
  Array.isArray((entry as CompoundEntry).entries);

export function swapCompoundEntry(entry: unknown,
  swap: (child: unknown) => unknown): CompoundEntry | null {
  if (!isCompoundEntry(entry)) return null;
  const inverses: unknown[] = [];
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
