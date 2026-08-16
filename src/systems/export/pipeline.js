// Единый пайплайн экспорта: Scope → ExportDocument → Mode → Format → Save.
// Никаких отдельных веток «экспорт слоя/папки/проекта» — режим и формат
// комбинируются над одним и тем же документом.
import { S } from '../../core/state.js';
import { saveFile } from '../../core/io.js';
import { toast, t } from '../../core/dom.js';
import { buildExportDoc, docName } from './tree.js';
import { flattenNodes } from './render.js';
import { applyBounds, visibleBounds, unionBounds, cropTo } from './bounds.js';
import { FORMATS } from './formats.js';

// уникализировать имена файлов (Слой, Слой_2, …)
function uniqueNames(items) { const seen = new Map();
  return items.map((it) => { const b = it.name || 'layer'; const n = (seen.get(b) || 0) + 1; seen.set(b, n); return { ...it, name: n > 1 ? b + '_' + n : b }; }); }

// разбить дерево на отдельные файлы по выбранному режиму
function separateItems(root, mode) {
  if (mode === 'leaf') { const out = []; const walk = (ns) => ns.forEach((n) => n.kind === 'layer' ? out.push({ name: n.name, nodes: [n] }) : walk(n.children)); walk(root); return out; }
  if (mode === 'folders') { const out = []; const folders = (ns) => ns.forEach((n) => { if (n.kind === 'folder') { out.push({ name: n.name, nodes: [n] }); folders(n.children); } });
    folders(root); root.forEach((n) => { if (n.kind === 'layer') out.push({ name: n.name, nodes: [n] }); }); return out; }
  return root.map((n) => ({ name: n.name, nodes: [n] })); // top-level items only
}

function separateCanvases(root, opts) {
  const items = uniqueNames(separateItems(root, opts.separateMode));
  const rendered = items.map((it) => ({ name: it.name, canvas: flattenNodes(it.nodes, opts.includeHidden) }));
  if (opts.boundsMode === 'same' && opts.canvasBounds === 'trim') {
    const b = unionBounds(rendered.map((r) => visibleBounds(r.canvas)));
    return rendered.map((r) => ({ name: r.name, canvas: cropTo(r.canvas, b) }));
  }
  return rendered.map((r) => ({ name: r.name, canvas: applyBounds(r.canvas, opts.canvasBounds) }));
}

async function saveOne(o) { await saveFile(o.blob, o.name, o.mime, o.desc); }

export async function runExport(opts) {
  const doc = buildExportDoc(opts.scope, opts.includeHidden);
  if (!doc.root.length) { toast(t('toast.exportEmpty')); return; }
  const fmt = FORMATS[opts.format], base = docName();
  let outputs = [];
  if (opts.mode === 'layered' && fmt.encodeLayered) {
    outputs = [await fmt.encodeLayered(doc, base)];
  } else if (opts.mode === 'separate' && fmt.supportsSeparateFiles) {
    const list = separateCanvases(doc.root, { ...opts, includeHidden: doc.includeHidden });
    for (const c of list) outputs.push(await fmt.encode(c.canvas, c.name));
  } else {
    const canvas = applyBounds(flattenNodes(doc.root, doc.includeHidden, true), opts.canvasBounds);
    outputs = [await fmt.encode(canvas, base)];
  }
  for (const o of outputs) await saveOne(o);
  toast(t('toast.exported', { n: outputs.length }));
  return outputs;
}

// Совместимость: быстрый экспорт одного слоя в PNG (меню слоя «весь холст / по контуру»).
export async function exportSingleLayer(L, tight) {
  const i = S.layers.indexOf(L); if (i < 0) return;
  const node = { kind: 'layer', name: L.name || 'layer', idx: i, visible: true, opacity: L.opacity, effects: L.effects || [] };
  const canvas = applyBounds(flattenNodes([node], true), tight ? 'trim' : 'current');
  await saveOne(await FORMATS.png.encode(canvas, L.name || 'layer'));
}
