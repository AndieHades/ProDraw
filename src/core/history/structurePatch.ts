import type { StoredField, StructureEntry, StructureFolder, StructureLayer,
  StructureState } from "./structurePatchTypes.ts";

const STRUCTURE_ID = Symbol("prodraw.structure-history-id");
type Identified = object & { [STRUCTURE_ID]?: number };
let identitySequence = 0;

function defineIdentity(target: object, value: number): number {
  Object.defineProperty(target, STRUCTURE_ID, {
    configurable: false, enumerable: false, writable: false, value
  });
  identitySequence = Math.max(identitySequence, value); return value;
}

function identityOf(target: object): number {
  const identity = (target as Identified)[STRUCTURE_ID];
  return identity ?? defineIdentity(target, ++identitySequence);
}

export function inheritStructureIdentity<T extends object>(source: object | null | undefined,
  clone: T): T {
  const identity = source ? (source as Identified)[STRUCTURE_ID] : undefined;
  if (identity !== undefined && (clone as Identified)[STRUCTURE_ID] === undefined)
    defineIdentity(clone, identity);
  return clone;
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

const selectedEffects = (state: StructureState): Set<unknown> => new Set([
  ...state.layers.flatMap((layer) => layer.effects ?? []),
  ...state.folders.flatMap((folder) => folder.effects ?? [])
]);

export function createStructureEntry(state: StructureState): StructureEntry {
  return { kind: "structure-patch",
    layers: state.layers.map((ref) => ({ identity: identityOf(ref), ref,
      fid: field(ref, "fid") })),
    folders: state.folders.map((ref) => ({ identity: identityOf(ref), ref,
      parent: field(ref, "parent"), emptyPos: field(ref, "emptyPos") })),
    selection: { cur: state.cur, bgSel: state.bgSel, selFolder: state.selFolder,
      marked: [...state.marked], markedFolders: [...state.markedFolders],
      fxSel: [...state.fxSel], fxCur: state.fxCur },
    layerSeq: state.layerSeq, folderSeq: state.folderSeq };
}

export function isStructureEntry(entry: unknown): entry is StructureEntry {
  if (!entry || typeof entry !== "object") return false;
  const candidate = entry as Partial<StructureEntry>;
  return candidate.kind === "structure-patch" && Array.isArray(candidate.layers) &&
    Array.isArray(candidate.folders);
}

function resolve<T extends object>(stored: readonly { readonly identity: number;
  readonly ref: T }[], current: readonly T[]): T[] {
  const currentByIdentity = new Map(current.map((ref) => [identityOf(ref), ref]));
  return stored.map((item) => currentByIdentity.get(item.identity) ?? item.ref);
}

export function swapStructureEntry(entry: unknown,
  state: StructureState): StructureEntry | null {
  if (!isStructureEntry(entry)) return null;
  const inverse = createStructureEntry(state);
  const layers = resolve<StructureLayer>(entry.layers, state.layers);
  const folders = resolve<StructureFolder>(entry.folders, state.folders);
  entry.layers.forEach((stored, index) => {
    const target = layers[index]; if (target) restoreField(target, "fid", stored.fid);
  });
  entry.folders.forEach((stored, index) => {
    const target = folders[index]; if (!target) return;
    restoreField(target, "parent", stored.parent);
    restoreField(target, "emptyPos", stored.emptyPos);
  });
  state.layers = layers; state.folders = folders;
  state.layerSeq = entry.layerSeq; state.folderSeq = entry.folderSeq;
  state.cur = entry.selection.cur; state.bgSel = entry.selection.bgSel;
  state.selFolder = entry.selection.selFolder;
  state.marked = new Set(entry.selection.marked);
  state.markedFolders = new Set(entry.selection.markedFolders);
  const effects = selectedEffects(state);
  state.fxSel = new Set(entry.selection.fxSel.filter((effect) => effects.has(effect)));
  state.fxCur = effects.has(entry.selection.fxCur) ? entry.selection.fxCur : null;
  state.fxDraft = null; return inverse;
}
