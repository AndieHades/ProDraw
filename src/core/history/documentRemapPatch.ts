interface StoredField {
  readonly present: boolean;
  readonly value: unknown;
}

interface RemapLayer {
  grid?: unknown;
  ext?: unknown;
  text?: unknown;
}

interface RemapAnimator { frames: unknown }
interface DocumentRemapState {
  W: number;
  H: number;
  readonly layers: RemapLayer[];
  cur: number;
  readonly animator?: RemapAnimator | null;
}

interface StoredLayer {
  readonly index: number;
  readonly ref: RemapLayer;
  readonly grid: StoredField;
  readonly ext: StoredField;
  readonly text: StoredField;
}

export interface DocumentRemapEntry {
  readonly kind: "document-remap-patch";
  readonly width: number;
  readonly height: number;
  readonly layers: readonly StoredLayer[];
  readonly cur: number;
  readonly frames: StoredField;
}

const record = (target: object): Record<PropertyKey, unknown> =>
  target as Record<PropertyKey, unknown>;
const field = (target: object, property: PropertyKey): StoredField => ({
  present: Object.prototype.hasOwnProperty.call(target, property),
  value: record(target)[property]
});
function restoreField(target: object, property: PropertyKey, stored: StoredField): void {
  if (stored.present) record(target)[property] = stored.value;
  else delete record(target)[property];
}
const captureFrames = (state: DocumentRemapState): StoredField => state.animator
  ? { present: true, value: state.animator.frames }
  : { present: false, value: null };
const captureLayer = (layer: RemapLayer, index: number): StoredLayer => ({
  index, ref: layer, grid: field(layer, "grid"), ext: field(layer, "ext"),
  text: field(layer, "text")
});

export function createDocumentRemapEntry(state: DocumentRemapState | null | undefined):
DocumentRemapEntry | null {
  if (!state || !Number.isInteger(state.W) || !Number.isInteger(state.H) ||
    !Array.isArray(state.layers)) return null;
  return { kind: "document-remap-patch", width: state.W, height: state.H,
    layers: state.layers.map(captureLayer), cur: state.cur, frames: captureFrames(state) };
}

export function isDocumentRemapEntry(entry: unknown): entry is DocumentRemapEntry {
  return !!entry && typeof entry === "object" &&
    (entry as Partial<DocumentRemapEntry>).kind === "document-remap-patch" &&
    Array.isArray((entry as Partial<DocumentRemapEntry>).layers);
}

export function swapDocumentRemapEntry(entry: unknown, state: DocumentRemapState,
  onDirty?: () => void): DocumentRemapEntry | null {
  if (!isDocumentRemapEntry(entry) || (entry.frames.present && !state.animator))
    return null;
  const layers = entry.layers.map((stored) => state.layers[stored.index]);
  if (layers.some((layer, index) => layer !== entry.layers[index]?.ref)) return null;
  const inverse = createDocumentRemapEntry(state); if (!inverse) return null;
  state.W = entry.width; state.H = entry.height;
  entry.layers.forEach((stored, index) => {
    const layer = layers[index]; if (!layer) return;
    restoreField(layer, "grid", stored.grid); restoreField(layer, "ext", stored.ext);
    restoreField(layer, "text", stored.text);
  });
  state.cur = Math.min(entry.cur, Math.max(0, state.layers.length - 1));
  if (state.animator) state.animator.frames = entry.frames.present
    ? entry.frames.value : {};
  onDirty?.(); return inverse;
}
