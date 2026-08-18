export const ACTIVE_COLOR_STORE = "prodraw.active-color";

interface ColorStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const safeStorage = (): ColorStorage | null => {
  try { return typeof localStorage === "undefined" ? null : localStorage; }
  catch { return null; }
};

const valid = (value: unknown): value is number[] => Array.isArray(value) &&
  value.length === 3 && value.every((channel) => Number.isInteger(channel) &&
    channel >= 0 && channel <= 255);

export function loadActiveColor(fallback: readonly number[],
  storage: ColorStorage | null = safeStorage()): number[] {
  try {
    const value: unknown = JSON.parse(storage?.getItem(ACTIVE_COLOR_STORE) ?? "null");
    return valid(value) ? value.slice() : fallback.slice();
  } catch { return fallback.slice(); }
}

export function saveActiveColor(color: readonly number[],
  storage: ColorStorage | null = safeStorage()): void {
  if (!valid(color.slice(0, 3))) return;
  try { storage?.setItem(ACTIVE_COLOR_STORE, JSON.stringify(color.slice(0, 3))); }
  catch { /* optional preference */ }
}
