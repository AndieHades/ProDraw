import type { LoadedBrush } from "../../contracts/brush.ts";
import { LIVE_BRUSH_STORE } from "../../config/liveBrushControls.ts";
import { BP_SMAX } from "../../config/limits.ts";
import { applyLiveBrushValues, validatedBrushValues,
  type BrushValues } from "../../logic/brush/liveBrushValues.ts";

interface Entry { readonly values: BrushValues; readonly size?: number; readonly opacity?: number }
interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
const bounded = (value: unknown, low: number, high: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(low, Math.min(high, value)) : undefined;

export class LiveBrushPreferences {
  readonly #storage: () => StoragePort;
  #entries: Map<string, Entry> | null = null;
  readonly #resolved = new Map<string, { source: LoadedBrush; brush: LoadedBrush }>();
  constructor(storage: () => StoragePort = () => localStorage) { this.#storage = storage; }

  get(shape: string): Entry | undefined { return this.entries().get(shape); }

  brush(shape: string, source: LoadedBrush): LoadedBrush {
    const entry = this.get(shape); if (!entry) return source;
    const cached = this.#resolved.get(shape); if (cached?.source === source) return cached.brush;
    const brush = applyLiveBrushValues(source, entry.values);
    this.#resolved.set(shape, { source, brush }); return brush;
  }

  update(shape: string, changes: { values?: BrushValues; size?: number; opacity?: number }): void {
    const previous = this.get(shape);
    const size = bounded(changes.size ?? previous?.size, 1, BP_SMAX);
    const opacity = bounded(changes.opacity ?? previous?.opacity, 0, 1);
    const values = validatedBrushValues({ ...previous?.values, ...changes.values });
    this.entries().set(shape, { values, ...(size === undefined ? {} : { size }),
      ...(opacity === undefined ? {} : { opacity }) });
    this.#resolved.delete(shape); this.save();
  }

  reset(shape: string): void { this.entries().delete(shape); this.#resolved.delete(shape); this.save(); }
  copy(source: string, target: string): void {
    const entry = this.get(source); if (entry) this.entries().set(target, structuredClone(entry));
    this.#resolved.delete(target); this.save();
  }

  private entries(): Map<string, Entry> {
    if (this.#entries) return this.#entries;
    this.#entries = new Map();
    try {
      const data = JSON.parse(this.#storage().getItem(LIVE_BRUSH_STORE) ?? "null");
      if (data?.version !== 1 || !data.entries || typeof data.entries !== "object") return this.#entries;
      for (const [shape, value] of Object.entries(data.entries)) {
        if (!value || typeof value !== "object") continue;
        const raw = value as Record<string, unknown>;
        const size = bounded(raw["size"], 1, BP_SMAX), opacity = bounded(raw["opacity"], 0, 1);
        this.#entries.set(shape, { values: validatedBrushValues(raw["values"]),
          ...(size === undefined ? {} : { size }), ...(opacity === undefined ? {} : { opacity }) });
      }
    } catch { /* A corrupt optional brush record does not block the editor. */ }
    return this.#entries;
  }

  private save(): void {
    try { this.#storage().setItem(LIVE_BRUSH_STORE,
      JSON.stringify({ version: 1, entries: Object.fromEntries(this.entries()) })); }
    catch { /* In-memory editing remains available without storage. */ }
  }
}

export const liveBrushPreferences = new LiveBrushPreferences();
