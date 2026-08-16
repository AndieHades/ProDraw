// ExportDocument: единое дерево слоёв/папок (порядок, видимость, прозрачность,
// эффекты) — собирается один раз из state и кормит все режимы/форматы экспорта.
// Узел-слой { kind:'layer', name, idx, visible, opacity, effects }.
// Узел-папка { kind:'folder', name, fid, folder, visible, open, effects, children }.
import { S } from '../../core/state.js';
import { folderChain } from '../../core/layers.js';
import { folderStackPos } from '../layers/helpers.js';

const inSub = (L, fid) => folderChain(L.fid).some((f) => f.id === fid); // слой в поддереве папки
const folderPos = (fid) => { const f = S.folders.find((x) => x.id === fid); return f ? folderStackPos(f) : Infinity; };

function layerNode(L, i) { return { kind: 'layer', name: L.name || 'Layer', idx: i, visible: L.visible !== false, opacity: L.opacity, effects: L.effects || [] }; }
function folderNode(f, includeHidden) {
  return { kind: 'folder', name: f.name || 'Group', fid: f.id, folder: f, visible: f.visible !== false, open: f.open !== false, effects: f.effects || [], children: childNodes(f.id, includeHidden) };
}

// прямые дети папки parentFid (null = корень) в порядке стопки (низ→верх)
function childNodes(parentFid, includeHidden) {
  const items = [];
  S.layers.forEach((L, i) => { if ((L.fid ?? null) === (parentFid ?? null)) items.push({ pos: i, node: layerNode(L, i) }); });
  S.folders.forEach((f) => { if ((f.parent ?? null) === (parentFid ?? null)) items.push({ pos: folderPos(f.id), node: folderNode(f, includeHidden) }); });
  items.sort((a, b) => a.pos - b.pos);
  return items.filter((x) => includeHidden || x.node.visible).map((x) => x.node);
}

// набор корневых узлов для области экспорта
function scopeRoots(scope, includeHidden) {
  if (scope === 'project') return childNodes(null, includeHidden);
  if (scope === 'folder') { const fid = S.selFolder ?? (S.layers[S.cur] && S.layers[S.cur].fid);
    const f = S.folders.find((x) => x.id === fid); return f ? [folderNode(f, includeHidden)] : childNodes(null, includeHidden); }
  // selected: отмеченные папки целиком + отмеченные/текущий слои (вне выбранных папок)
  const fids = new Set(S.markedFolders); if (S.selFolder != null) fids.add(S.selFolder);
  const idx = new Set(S.marked); if (!fids.size || S.marked.size) idx.add(S.cur);
  const items = [];
  for (const fid of fids) { const f = S.folders.find((x) => x.id === fid); if (f) items.push({ pos: folderPos(f.id), node: folderNode(f, includeHidden) }); }
  for (const i of idx) { const L = S.layers[i]; if (!L) continue;
    if ([...fids].some((fid) => inSub(L, fid))) continue; // уже внутри выбранной папки
    items.push({ pos: i, node: layerNode(L, i) }); }
  items.sort((a, b) => a.pos - b.pos);
  return items.filter((x) => includeHidden || x.node.visible).map((x) => x.node);
}

export function buildExportDoc(scope, includeHidden) {
  return { W: S.W, H: S.H, includeHidden: !!includeHidden, root: scopeRoots(scope, includeHidden) };
}

// все индексы слоёв в поддереве узлов
export function collectIdx(nodes, set = new Set()) {
  for (const n of nodes) { if (n.kind === 'layer') set.add(n.idx); else collectIdx(n.children, set); }
  return set;
}
export const docName = () => (S.docName || 'pixel');
