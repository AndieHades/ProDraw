import { findFolder, folderChain, folderStackPosition,
  layerInFolder } from "../layers/LayerTree.ts";

export interface ExportLayer {
  readonly name?: string;
  readonly fid?: number | null;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly effects?: readonly unknown[];
}

export interface ExportFolder {
  readonly id: number;
  readonly name?: string;
  readonly parent?: number | null;
  readonly emptyPos?: number;
  readonly visible?: boolean;
  readonly open?: boolean;
  readonly effects?: readonly unknown[];
}

export interface ExportTreeState {
  readonly W: number; readonly H: number; readonly docName?: string;
  readonly layers: ExportLayer[]; readonly folders: ExportFolder[];
  readonly cur: number; readonly selFolder: number | null;
  readonly marked: ReadonlySet<number>;
  readonly markedFolders: ReadonlySet<number>;
}

export interface ExportLayerNode {
  readonly kind: "layer"; readonly name: string; readonly idx: number;
  readonly visible: boolean; readonly opacity: number | undefined;
  readonly effects: readonly unknown[];
}

export interface ExportFolderNode {
  readonly kind: "folder"; readonly name: string; readonly fid: number;
  readonly folder: ExportFolder; readonly visible: boolean; readonly open: boolean;
  readonly effects: readonly unknown[]; readonly children: readonly ExportNode[];
}

export type ExportNode = ExportLayerNode | ExportFolderNode;
export type ExportScope = "project" | "folder" | "selected";

const layerNode = (layer: ExportLayer, index: number): ExportLayerNode => ({
  kind: "layer", name: layer.name || "Layer", idx: index,
  visible: layer.visible !== false, opacity: layer.opacity, effects: layer.effects ?? []
});
const folderPosition = (state: ExportTreeState, id: number): number => {
  const folder = findFolder(state.folders, id);
  return folder ? folderStackPosition(state, folder) : Number.POSITIVE_INFINITY;
};

function folderNode(state: ExportTreeState, folder: ExportFolder,
  includeHidden: boolean, ancestors: ReadonlySet<number>): ExportFolderNode {
  const next = new Set(ancestors); next.add(folder.id);
  return { kind: "folder", name: folder.name || "Group", fid: folder.id, folder,
    visible: folder.visible !== false, open: folder.open !== false,
    effects: folder.effects ?? [],
    children: childNodes(state, folder.id, includeHidden, next) };
}

function childNodes(state: ExportTreeState, parentId: number | null,
  includeHidden: boolean, ancestors: ReadonlySet<number> = new Set()): ExportNode[] {
  const items: { readonly position: number; readonly node: ExportNode }[] = [];
  state.layers.forEach((layer, index) => {
    if ((layer.fid ?? null) === parentId)
      items.push({ position: index, node: layerNode(layer, index) });
  });
  state.folders.forEach((folder) => {
    if ((folder.parent ?? null) !== parentId || ancestors.has(folder.id)) return;
    items.push({ position: folderPosition(state, folder.id),
      node: folderNode(state, folder, includeHidden, ancestors) });
  });
  return items.sort((left, right) => left.position - right.position)
    .map(({ node }) => node).filter((node) => includeHidden || node.visible);
}

export function exportTargetRoot(state: ExportTreeState,
  target: ExportLayer | ExportFolder, includeHidden = false): ExportNode | null {
  const index = state.layers.indexOf(target as ExportLayer);
  if (index >= 0) return includeHidden || target.visible !== false
    ? layerNode(target as ExportLayer, index) : null;
  const requested = target as ExportFolder;
  const folder = state.folders.find((item) => item === target || item.id === requested.id);
  return folder && (includeHidden || folder.visible !== false)
    ? folderNode(state, folder, includeHidden, new Set()) : null;
}

function selectedRoots(state: ExportTreeState, includeHidden: boolean): ExportNode[] {
  const selectedFolders = new Set(state.markedFolders);
  if (state.selFolder != null) selectedFolders.add(state.selFolder);
  const roots = [...selectedFolders].filter((id) => !folderChain(state.folders,
    findFolder(state.folders, id)?.parent).some((parent) => selectedFolders.has(parent.id)));
  const indices = new Set(state.marked);
  if (!roots.length || state.marked.size) indices.add(state.cur);
  const items: { readonly position: number; readonly node: ExportNode }[] = [];
  for (const id of roots) { const folder = findFolder(state.folders, id);
    if (folder) items.push({ position: folderPosition(state, id),
      node: folderNode(state, folder, includeHidden, new Set()) }); }
  for (const index of indices) { const layer = state.layers[index]; if (!layer) continue;
    if (roots.some((id) => layerInFolder(layer, state.folders, id))) continue;
    items.push({ position: index, node: layerNode(layer, index) }); }
  return items.sort((left, right) => left.position - right.position)
    .map(({ node }) => node).filter((node) => includeHidden || node.visible);
}

export function buildExportDocument(state: ExportTreeState, scope: ExportScope,
  includeHidden: boolean): { readonly W: number; readonly H: number;
    readonly includeHidden: boolean; readonly root: readonly ExportNode[] } {
  let root: readonly ExportNode[];
  if (scope === "project") root = childNodes(state, null, includeHidden);
  else if (scope === "folder") {
    const id = state.selFolder ?? state.layers[state.cur]?.fid ?? null;
    const folder = findFolder(state.folders, id);
    root = folder ? [folderNode(state, folder, includeHidden, new Set())]
      : childNodes(state, null, includeHidden);
  } else root = selectedRoots(state, includeHidden);
  return { W: state.W, H: state.H, includeHidden, root };
}

export function collectLayerIndices(nodes: readonly ExportNode[],
  output: Set<number> = new Set()): Set<number> {
  for (const node of nodes) if (node.kind === "layer") output.add(node.idx);
  else collectLayerIndices(node.children, output);
  return output;
}

export const exportDocumentName = (state: ExportTreeState): string =>
  state.docName || "pixel";
