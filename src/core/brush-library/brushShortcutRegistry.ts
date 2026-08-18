let shortcuts: Readonly<Record<string, string>> = {};

export function setBrushShortcuts(value: Readonly<Record<string, string>>): void {
  shortcuts = { ...value };
}

export function brushIdForShortcut(combo: string): string | null {
  for (const [brushId, assigned] of Object.entries(shortcuts)) {
    if (assigned === combo) return brushId;
  }
  return null;
}
