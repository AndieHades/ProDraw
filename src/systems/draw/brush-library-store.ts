// Пользовательская часть библиотеки кистей: копии со своим именем, размером и
// непрозрачностью. Встроенные пресеты поставляются с приложением и только
// читаются, поэтому удалить можно лишь собственную копию.
const STORE = "userBrushes";
const PREFIX = "user:";

export interface UserBrush {
  readonly id: string; readonly source: string; readonly name: string;
  readonly size: number; readonly opacity: number;
}

export const userShapeId = (id: string): string => PREFIX + id;
export const userIdOf = (shape: unknown): string | null =>
  typeof shape === "string" && shape.startsWith(PREFIX)
    ? shape.slice(PREFIX.length) : null;

const numeric = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

function parse(value: unknown): UserBrush | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record["id"], source = record["source"], name = record["name"];
  if (typeof id !== "string" || typeof source !== "string" ||
    typeof name !== "string") return null;
  return { id, source, name, size: numeric(record["size"], 12),
    opacity: numeric(record["opacity"], 1) };
}

let cache: UserBrush[] | null = null;

function read(): UserBrush[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORE) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map(parse).filter((item): item is UserBrush => item !== null);
  } catch { return []; }
}

function write(list: readonly UserBrush[]): void {
  cache = [...list];
  try { localStorage.setItem(STORE, JSON.stringify(cache)); } catch { /* хранилище необязательно */ }
}

export const userBrushes = (): readonly UserBrush[] => (cache ??= read());

export const userBrush = (id: string | null): UserBrush | null =>
  id ? userBrushes().find((item) => item.id === id) ?? null : null;

export function addUserBrush(entry: Omit<UserBrush, "id">): UserBrush {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const brush: UserBrush = { ...entry, id };
  write([...userBrushes(), brush]); return brush;
}

export function removeUserBrush(id: string): boolean {
  const list = userBrushes(), next = list.filter((item) => item.id !== id);
  if (next.length === list.length) return false;
  write(next); return true;
}
