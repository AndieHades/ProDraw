type VisualEffect = unknown;

interface LayerVisual {
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly fid?: number | null;
  readonly clip?: boolean;
  readonly kind?: string;
  readonly effects?: readonly VisualEffect[];
}

interface FolderVisual {
  readonly id?: number;
  readonly parent?: number | null;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly effects?: readonly VisualEffect[];
}

export interface LegacyCompositeState {
  readonly W: number;
  readonly H: number;
  readonly bg?: { readonly visible?: boolean;
    readonly color?: readonly number[] | null } | null;
  readonly layers: readonly LayerVisual[];
  readonly folders: readonly FolderVisual[];
  readonly cropMode?: unknown;
  readonly rotMode?: unknown;
  readonly rotPrev?: unknown;
  readonly moveDrag?: unknown;
  readonly selFloat?: unknown;
  readonly fxDraft?: { readonly target?: unknown; readonly eff?: unknown } | null;
}

function hasLiveComposite(state: LegacyCompositeState): boolean {
  return Boolean(state.cropMode || state.rotMode || state.rotPrev ||
    state.moveDrag || state.selFloat);
}

export interface LegacyCompositeCandidate {
  readonly visual: string;
  readonly contentRevision: number;
  readonly contentGeneration: number;
}

function draftSignature(state: LegacyCompositeState): unknown {
  const draft = state.fxDraft;
  if (!draft) return null;
  const layer = state.layers.indexOf(draft.target as LayerVisual);
  const folder = state.folders.indexOf(draft.target as FolderVisual);
  const owner = layer >= 0 ? ["layer", layer] :
    folder >= 0 ? ["folder", state.folders[folder]?.id ?? folder] : ["unknown"];
  return [owner, draft.eff ?? null];
}

function visualSignature(state: LegacyCompositeState): string {
  const background = [state.bg?.visible !== false, state.bg?.color ?? null];
  const layers = state.layers.map((layer) => [layer.visible !== false,
    layer.opacity ?? 1, layer.fid ?? null, Boolean(layer.clip), layer.kind ?? "pixel",
    layer.effects ?? []]);
  const folders = state.folders.map((folder) => [folder.id ?? null,
    folder.parent ?? null, folder.visible !== false, folder.opacity ?? 1,
    folder.effects ?? []]);
  return JSON.stringify([state.W, state.H, background, layers,
    folders, draftSignature(state)]);
}

export class LegacyCompositeCache {
  #committed: LegacyCompositeCandidate | null = null;

  candidate(state: LegacyCompositeState,
    contentRevision: number,
    contentGeneration = 0): LegacyCompositeCandidate | null {
    return hasLiveComposite(state) ? null :
      { visual: visualSignature(state), contentRevision, contentGeneration };
  }

  isHit(candidate: LegacyCompositeCandidate | null): boolean {
    return candidate !== null && candidate.visual === this.#committed?.visual &&
      candidate.contentRevision === this.#committed.contentRevision &&
      candidate.contentGeneration === this.#committed.contentGeneration;
  }

  canPatch(candidate: LegacyCompositeCandidate | null): boolean {
    return candidate !== null && candidate.visual === this.#committed?.visual &&
      candidate.contentRevision !== this.#committed.contentRevision &&
      candidate.contentGeneration === this.#committed.contentGeneration;
  }

  commit(candidate: LegacyCompositeCandidate | null): void {
    this.#committed = candidate;
  }

  invalidate(): void {
    this.#committed = null;
  }
}
