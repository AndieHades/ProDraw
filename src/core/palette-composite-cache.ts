interface CacheLayer {
  readonly visible?: boolean; readonly opacity?: number;
  readonly fid?: unknown; readonly clip?: unknown;
  readonly kind?: unknown; readonly effects?: unknown;
}
interface CacheFolder {
  readonly id?: unknown; readonly parent?: unknown;
  readonly visible?: boolean; readonly opacity?: number; readonly effects?: unknown;
}
interface CacheState {
  readonly W: number; readonly H: number; readonly bg?: unknown;
  readonly layers: readonly CacheLayer[];
  readonly folders: readonly CacheFolder[];
  readonly cropMode?: unknown; readonly rotMode?: unknown;
  readonly rotPrev?: unknown; readonly moveDrag?: unknown;
  readonly selFloat?: unknown; readonly fxDraft?: unknown;
}
export interface PaletteCompositeSource {
  readonly width: number;
  readonly height: number;
}
type CachedSource<Source> = Source & { revision: number; visual: string };

function visualSignature(state: CacheState): string {
  const layers = state.layers.map((layer) => [layer.visible !== false, layer.opacity,
    layer.fid, !!layer.clip, layer.kind, layer.effects]);
  const folders = state.folders.map((folder) => [folder.id, folder.parent,
    folder.visible !== false, folder.opacity, folder.effects]);
  return JSON.stringify([state.W, state.H, state.bg, layers, folders]);
}

function hasLivePreview(state: CacheState): boolean {
  return Boolean(state.cropMode || state.rotMode || state.rotPrev ||
    state.moveDrag || state.selFloat || state.fxDraft);
}

export class PaletteCompositeCache<Source extends PaletteCompositeSource
  = PaletteCompositeSource> {
  #source: CachedSource<Source> | null = null;

  accept(source: Source | null | undefined, state: CacheState, revision: number): void {
    if (!source || hasLivePreview(state)) { this.#source = null; return; }
    this.#source = { ...source, revision, visual: visualSignature(state) };
  }

  current(state: CacheState, revision: number): CachedSource<Source> | null {
    const source = this.#source;
    return source && source.width === state.W && source.height === state.H &&
      source.revision === revision && source.visual === visualSignature(state)
      ? source : null;
  }
}
