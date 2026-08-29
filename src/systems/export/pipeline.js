// Единый пайплайн экспорта: Scope → ExportDocument → Mode → Format → Save.
// Никаких отдельных веток «экспорт слоя/папки/проекта» — режим и формат
// комбинируются над одним и тем же документом.
import { S } from '../../core/state.js';
import { saveFile } from '../../core/io.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { buildExportDoc, docName, exportTargetRoot } from './tree.js';
import { flattenNodes, standaloneLayerCanvas } from './render.js';
import { applyBounds, visibleBounds, unionBounds, cropTo } from './bounds.js';
import { FORMATS } from './formats.js';
import { planSelectedPngTree } from '../../logic/export/folderPngPlan.ts';
import { createFileTreeWriter } from '../../platform/fileTreeWriter.ts';
import { writeSelectedPngTree } from './SelectedPngTreeExport.ts';

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

async function saveOne(o) { await saveFile(o.blob, o.name, o.mime, o.desc); }
const resultMeta = ({ name, mime, desc }) => ({ name, mime, desc });

function sharedTrimBounds(items, opts, renderNodes) {
  let bounds = null;
  for (const item of items) {
    const canvas = renderNodes(item.nodes, opts.includeHidden);
    bounds = unionBounds([bounds, visibleBounds(canvas)]);
  }
  return bounds;
}

async function exportSeparate(root, fmt, opts, saveOutput, renderNodes) {
  const items = uniqueNames(separateItems(root, opts.separateMode));
  const sameTrim = opts.boundsMode === 'same' && opts.canvasBounds === 'trim';
  const sharedBounds = sameTrim ? sharedTrimBounds(items, opts, renderNodes) : null;
  const results = [];
  for (const item of items) {
    const rendered = renderNodes(item.nodes, opts.includeHidden);
    const canvas = sameTrim ? cropTo(rendered, sharedBounds)
      : applyBounds(rendered, opts.canvasBounds);
    const output = await fmt.encode(canvas, item.name);
    await saveOutput(output);
    results.push(resultMeta(output));
  }
  return results;
}

export async function runExport(opts, saveOutput = saveOne,
  renderNodes = flattenNodes, formats = FORMATS) {
  const doc = buildExportDoc(opts.scope, opts.includeHidden);
  if (!doc.root.length) { toast(t('toast.exportEmpty')); return; }
  const fmt = formats[opts.format], base = docName();
  let results = [];
  if (opts.mode === 'layered' && fmt.encodeLayered) {
    const output = await fmt.encodeLayered(doc, base);
    await saveOutput(output); results = [resultMeta(output)];
  } else if (opts.mode === 'separate' && fmt.supportsSeparateFiles) {
    results = await exportSeparate(doc.root, fmt,
      { ...opts, includeHidden: doc.includeHidden }, saveOutput, renderNodes);
  } else {
    const canvas = applyBounds(renderNodes(doc.root, doc.includeHidden, true), opts.canvasBounds);
    const output = await fmt.encode(canvas, base);
    await saveOutput(output); results = [resultMeta(output)];
  }
  toast(t('toast.exported', { n: results.length }));
  return results;
}

const defaultEncode = (canvas, name) => FORMATS.png.encode(canvas, name);
const defaultSave = (output) => saveFile(output.blob, output.name,
  output.mime, output.desc);

function targetIsSelected(target) {
  const index = S.layers.indexOf(target);
  if (index >= 0) return S.marked.has(index) ||
    (S.cur === index && S.selFolder == null && !S.fxCur && !S.bgSel);
  const folder = S.folders.find((item) => item === target || item.id === target?.id);
  return !!folder && (S.selFolder === folder.id || S.markedFolders.has(folder.id));
}

function rootsFor(target) {
  if (targetIsSelected(target)) {
    const roots = buildExportDoc('selected', true).root;
    if (roots.length) return roots;
  }
  const root = exportTargetRoot(target, true);
  return root ? [root] : [];
}

const boundedCanvas = (canvas, tight) => tight
  ? cropTo(canvas, visibleBounds(canvas)) : canvas;

async function writeTree(plan, tight, dependencies) {
  const result = await writeSelectedPngTree(plan, tight, {
    writerFactory: dependencies.writerFactory ?? createFileTreeWriter,
    renderLayer: dependencies.renderLayer ?? standaloneLayerCanvas,
    boundCanvas: boundedCanvas, encode: dependencies.encode ?? defaultEncode,
  });
  if (result.status === 'saved') {
    toast(t('toast.exported', { n: plan.items.length }));
    return { ...result.output, directories: result.directories, items: result.items };
  }
  if (result.status !== 'cancelled') toast(t(result.status === 'unsupported'
    ? 'toast.folderExportUnavailable' : 'toast.folderExportFailed'));
  return null;
}

export async function exportTargetPng(target, tight, dependencies = {}) {
  const roots = rootsFor(target); if (!roots.length) return null;
  if (roots.length === 1 && roots[0].kind === 'layer') {
    const canvas = boundedCanvas(
      (dependencies.renderLayer ?? standaloneLayerCanvas)(roots[0]), tight);
    const output = await (dependencies.encode ?? defaultEncode)(canvas, roots[0].name);
    await (dependencies.saveOutput ?? defaultSave)(output); return output;
  }
  const rootName = roots.length === 1 ? roots[0].name : docName();
  return writeTree(planSelectedPngTree(rootName, roots), tight, dependencies);
}
