export interface LegacyPixelBounds {
  readonly minx: number;
  readonly miny: number;
  readonly maxx: number;
  readonly maxy: number;
}

export type LegacyCompositeDamage = Readonly<{
  kind: "full";
}> | Readonly<{
  kind: "region";
  bounds: LegacyPixelBounds;
  layerIndexes: readonly number[];
}>;

interface PixelLayerState {
  readonly kind?: string;
  readonly fid?: number | null;
  readonly clip?: boolean;
  readonly effects?: readonly unknown[];
  readonly ext?: ReadonlyMap<unknown, unknown>;
}

interface CompositeState {
  readonly layers: readonly PixelLayerState[];
  readonly folders: readonly unknown[];
  readonly cropMode?: unknown;
  readonly rotMode?: unknown;
  readonly rotPrev?: unknown;
  readonly moveDrag?: unknown;
  readonly selFloat?: unknown;
  readonly fxDraft?: unknown;
}

const merge = (left: LegacyPixelBounds | null, right: LegacyPixelBounds) =>
  left ? { minx: Math.min(left.minx, right.minx),
    miny: Math.min(left.miny, right.miny),
    maxx: Math.max(left.maxx, right.maxx),
    maxy: Math.max(left.maxy, right.maxy) } : { ...right };

export class LegacyCompositeDamageTracker {
  #full = true;
  #bounds: LegacyPixelBounds | null = null;
  readonly #layers = new Set<number>();

  noteLayer(layerIndex: number, bounds?: LegacyPixelBounds | null): void {
    if (!bounds) { this.invalidate(); return; }
    if (this.#full) return;
    this.#bounds = merge(this.#bounds, bounds);
    this.#layers.add(layerIndex);
  }

  invalidate(): void {
    this.#full = true;
    this.#bounds = null;
    this.#layers.clear();
  }

  take(width: number, height: number): LegacyCompositeDamage | null {
    if (this.#full) { this.reset(); return { kind: "full" }; }
    const bounds = this.#bounds;
    if (!bounds) return null;
    const clipped = { minx: Math.max(0, bounds.minx), miny: Math.max(0, bounds.miny),
      maxx: Math.min(width - 1, bounds.maxx), maxy: Math.min(height - 1, bounds.maxy) };
    const layerIndexes = [...this.#layers]; this.reset();
    return clipped.maxx < clipped.minx || clipped.maxy < clipped.miny ? null :
      { kind: "region", bounds: clipped, layerIndexes };
  }

  private reset(): void {
    this.#full = false;
    this.#bounds = null;
    this.#layers.clear();
  }
}

export function isIncrementalCompositeSafe(state: CompositeState,
  damage: LegacyCompositeDamage | null): boolean {
  if (damage?.kind !== "region" || state.folders.length) return false;
  if (state.cropMode || state.rotMode || state.rotPrev || state.moveDrag ||
    state.selFloat || state.fxDraft) return false;
  if (state.layers.some((layer) => (layer.kind && layer.kind !== "pixel") ||
    layer.fid != null || layer.clip || layer.effects?.length || layer.ext?.size)) return false;
  return damage.layerIndexes.every((index) => state.layers[index] != null);
}
