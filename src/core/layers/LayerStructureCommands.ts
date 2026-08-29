import { selectInsertedLayer, type CommandFolder, type CommandLayer,
  type LayerCommandState } from "./LayerCommandState.ts";

const clampIndex = (index: number, length: number): number =>
  Math.max(0, Math.min(Math.trunc(index), length));

export function insertLayer(state: LayerCommandState, layer: CommandLayer,
  index: number): number {
  const at = clampIndex(index, state.layers.length);
  state.layers.splice(at, 0, layer); selectInsertedLayer(state, at); return at;
}

export function moveLayerBlock(state: LayerCommandState,
  block: readonly CommandLayer[], parent: number | null,
  destination: () => number): readonly number[] {
  const moving = block.filter((layer, index) => state.layers.includes(layer) &&
    block.indexOf(layer) === index);
  for (const layer of moving) { const index = state.layers.indexOf(layer);
    if (index >= 0) state.layers.splice(index, 1); }
  for (const layer of moving) layer.fid = parent;
  const at = clampIndex(destination(), state.layers.length);
  state.layers.splice(at, 0, ...moving);
  const indices = moving.map((layer) => state.layers.indexOf(layer));
  state.cur = indices.at(-1) ?? Math.min(state.cur, state.layers.length - 1);
  state.marked = indices.length > 1 ? new Set(indices) : new Set();
  state.markedFolders.clear(); state.selFolder = null; return indices;
}

export function moveFolderBlock(state: LayerCommandState,
  folders: readonly CommandFolder[], includes: (layer: CommandLayer) => boolean,
  newParent: number | null, destination: () => number): readonly CommandLayer[] {
  const folderSet = new Set(folders.filter((folder) => state.folders.includes(folder)));
  const block: CommandLayer[] = [];
  for (let index = state.layers.length - 1; index >= 0; index--) {
    const layer = state.layers[index]; if (!layer || !includes(layer)) continue;
    block.unshift(layer); state.layers.splice(index, 1);
  }
  for (const folder of folderSet) folder.parent = newParent;
  const at = clampIndex(destination(), state.layers.length);
  if (block.length) state.layers.splice(at, 0, ...block);
  state.cur = Math.min(state.cur, state.layers.length - 1);
  state.markedFolders = new Set([...folderSet].map((folder) => folder.id));
  state.selFolder = folders[0]?.id ?? null; state.marked.clear(); return block;
}
