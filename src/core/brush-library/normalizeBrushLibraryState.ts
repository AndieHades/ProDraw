import type {
  BrushLibraryStoredState, BrushSetModel
} from "../../contracts/brushLibrary";
import type { BrushLibraryStatePort } from "../../contracts/brushStorage";

export interface NormalizedBrushLibraryState {
  readonly currentSetName: string;
  readonly setOrder: string[];
  readonly brushOrder: Record<string, string[]>;
  readonly recent: string[];
  readonly favorites: string[];
  readonly active: string | null;
  readonly shortcuts: Record<string, string>;
}

const uniqueStrings = (value: unknown, allowed?: ReadonlySet<string>): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string =>
    typeof item === "string" && (!allowed || allowed.has(item))))].slice(0, 10_000) : [];

function parseState(json: string | null): Partial<BrushLibraryStoredState> {
  if (!json) return {};
  try {
    const value = JSON.parse(json) as Partial<BrushLibraryStoredState>;
    return value.format === "prodraw-brush-library" &&
      (value.version === 1 || value.version === 2 || value.version === 3) ? value : {};
  } catch { return {}; }
}

export async function normalizeBrushLibraryState(storage: BrushLibraryStatePort | null,
  sets: readonly BrushSetModel[]): Promise<NormalizedBrushLibraryState> {
  const raw = parseState(storage ? await storage.readState() : null);
  const setNames = new Set(sets.map(({ name }) => name));
  const brushIds = new Set(sets.flatMap(({ brushes }) => brushes.map(({ id }) => id)));
  const setOrder = uniqueStrings(raw.setOrder, setNames);
  for (const name of setNames) if (!setOrder.includes(name)) setOrder.push(name);
  const brushOrder: Record<string, string[]> = {};
  for (const set of sets) {
    const ids = new Set(set.brushes.map(({ id }) => id));
    const order = uniqueStrings(raw.brushOrder?.[set.name], ids);
    for (const id of ids) if (!order.includes(id)) order.push(id);
    brushOrder[set.name] = order;
  }
  const preferred = typeof raw.currentSetName === "string" ? raw.currentSetName : "Main";
  const currentSetName = setNames.has(preferred) ? preferred : setOrder[0] ?? "Main";
  const active = "activeBrushId" in raw && typeof raw.activeBrushId === "string" &&
    brushIds.has(raw.activeBrushId) ? raw.activeBrushId :
    brushIds.has("lineart") ? "lineart" : brushIds.values().next().value ?? null;
  const shortcuts: Record<string, string> = {};
  if ("brushShortcuts" in raw && raw.brushShortcuts &&
      typeof raw.brushShortcuts === "object") {
    const used = new Set<string>();
    for (const [id, combo] of Object.entries(raw.brushShortcuts)) {
      if (brushIds.has(id) && typeof combo === "string" && combo.length <= 80 &&
          combo && !used.has(combo)) { shortcuts[id] = combo; used.add(combo); }
    }
  }
  return { currentSetName, setOrder, brushOrder,
    recent: uniqueStrings(raw.recentBrushIds, brushIds),
    favorites: uniqueStrings(raw.favoriteBrushIds, brushIds), active, shortcuts };
}
