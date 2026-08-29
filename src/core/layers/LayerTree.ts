export interface LayerTreeFolder {
  readonly id: number;
  parent?: number | null;
  emptyPos?: number;
}

export interface LayerTreeLayer {
  fid?: number | null;
}

export interface LayerTreeState<L extends LayerTreeLayer = LayerTreeLayer,
  F extends LayerTreeFolder = LayerTreeFolder> {
  layers: L[];
  folders: F[];
}

export function findFolder<F extends LayerTreeFolder>(folders: readonly F[],
  id: number | null | undefined): F | null {
  return id == null ? null : folders.find((folder) => folder.id === id) ?? null;
}

export function folderChain<F extends LayerTreeFolder>(folders: readonly F[],
  id: number | null | undefined): F[] {
  const chain: F[] = [], visited = new Set<number>();
  let current = id;
  while (current != null && !visited.has(current)) {
    visited.add(current);
    const folder = findFolder(folders, current); if (!folder) break;
    chain.push(folder); current = folder.parent;
  }
  return chain;
}

export function layerInFolder(layer: LayerTreeLayer,
  folders: readonly LayerTreeFolder[], folderId: number): boolean {
  return folderChain(folders, layer.fid).some((folder) => folder.id === folderId);
}

export function layersInFolder<L extends LayerTreeLayer>(state: LayerTreeState<L>,
  folderId: number): L[] {
  return state.layers.filter((layer) => layerInFolder(layer, state.folders, folderId));
}

export function layerIndicesInFolder(state: LayerTreeState,
  folderId: number): number[] {
  const indices: number[] = [];
  state.layers.forEach((layer, index) => {
    if (layerInFolder(layer, state.folders, folderId)) indices.push(index);
  });
  return indices;
}

export function topOfFolder(state: LayerTreeState, folderId: number): number {
  return layerIndicesInFolder(state, folderId).at(-1) ?? -1;
}

const boundedPosition = (value: number, length: number): number =>
  Math.max(0, Math.min(length, value));

export function folderStackPosition(state: LayerTreeState,
  folder: LayerTreeFolder): number {
  const indices = layerIndicesInFolder(state, folder.id);
  if (indices.length) return indices[0] ?? -1;
  return Number.isFinite(folder.emptyPos)
    ? boundedPosition(folder.emptyPos ?? 0, state.layers.length) : -1;
}

export function folderInsertionIndex(state: LayerTreeState,
  folderId: number): number {
  const top = topOfFolder(state, folderId); if (top >= 0) return top + 1;
  const folder = findFolder(state.folders, folderId);
  return folder && Number.isFinite(folder.emptyPos)
    ? boundedPosition(folder.emptyPos ?? 0, state.layers.length) : 0;
}

export function clearEmptyFolderPositions(state: LayerTreeState,
  folderId: number | null | undefined): void {
  for (const folder of folderChain(state.folders, folderId)) delete folder.emptyPos;
}

export function captureEmptyFolderPositions(state: LayerTreeState,
  removedIndices: readonly number[], skippedFolderIds: ReadonlySet<number> = new Set()):
Map<number, number> {
  const removed = new Set(removedIndices), anchors = new Map<number, number>();
  for (const folder of state.folders) {
    if (folderChain(state.folders, folder.id).some(
      (ancestor) => skippedFolderIds.has(ancestor.id))) continue;
    const indices = layerIndicesInFolder(state, folder.id);
    const first = indices[0];
    if (first !== undefined && indices.every((index) => removed.has(index)))
      anchors.set(folder.id, first);
  }
  return anchors;
}

export function restoreEmptyFolderPositions(state: LayerTreeState,
  anchors: ReadonlyMap<number, number>): void {
  for (const [id, position] of anchors) {
    const folder = findFolder(state.folders, id);
    if (folder && !layerIndicesInFolder(state, id).length)
      folder.emptyPos = boundedPosition(position, state.layers.length);
  }
}

export function commonLayerParent(layers: readonly LayerTreeLayer[]): number | null {
  const parent = layers[0]?.fid ?? null;
  return layers.every((layer) => (layer.fid ?? null) === parent) ? parent : null;
}
