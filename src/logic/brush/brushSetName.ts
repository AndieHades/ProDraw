export function uniqueBrushSetName(name: string, existing: readonly string[]): string {
  const trimmed = name.trim();
  if (!trimmed || existing.some((candidate) => candidate.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Brush set name must be unique");
  }
  return trimmed;
}
