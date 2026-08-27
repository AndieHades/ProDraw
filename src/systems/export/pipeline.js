// Единый пайплайн экспорта: Scope → ExportDocument → Mode → Format → Save.
// Никаких отдельных веток «экспорт слоя/папки/проекта» — режим и формат
// комбинируются над одним и тем же документом.
import { saveFile } from '../../core/io.js';
import { toast, t } from '../../ui/dom/ShellDom.ts';
import { buildExportDoc, docName, exportTargetRoot } from './tree.js';
import { flattenNodes, standaloneLayerCanvas } from './render.js';
import { applyBounds, visibleBounds, unionBounds, cropTo } from './bounds.js';
import { FORMATS } from './formats.js';
import { planFolderPngTree } from '../../logic/export/folderPngPlan.ts';
import { createFileTreeWriter,
  FileTreeUnsupportedError } from '../../platform/fileTreeWriter.ts';

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

// Быстрый PNG из RMB слоя/папки использует тот же effect-aware композит, что
// общий Export. Обрезка считается только после финального рендера.
export async function exportTargetPng(target, tight) {
  const node = exportTargetRoot(target, false); if (!node) return null;
  const rendered = flattenNodes([node], false);
  const bounds = tight ? visibleBounds(rendered) : null;
  if (tight && !bounds) { toast(t('toast.exportEmpty')); return null; }
  const canvas = tight ? cropTo(rendered, bounds) : rendered;
  const output = await FORMATS.png.encode(canvas, node.name);
  await saveOne(output); return output;
}

const encodePng = (canvas, name) => FORMATS.png.encode(canvas, name);
async function writePngTree(plan, writerFactory, renderLayer, encode) {
  let writer = null;
  try {
    writer = await writerFactory(plan.rootName);
    if (!writer) return null;
    for (const path of plan.directories) await writer.ensureDirectory(path);
    for (const item of plan.items) {
      const output = await encode(renderLayer(item.node), item.node.name);
      if (!output.blob) throw new Error('PNG encoder returned no data');
      await writer.write(item.path, output.blob);
    }
    const result = await writer.commit();
    toast(t('toast.exported', { n: plan.items.length }));
    return { ...result, directories: plan.directories, items: plan.items };
  } catch (error) {
    await writer?.abort().catch(() => undefined);
    toast(t(error instanceof FileTreeUnsupportedError
      ? 'toast.folderExportUnavailable' : 'toast.folderExportFailed'));
    return null;
  }
}

export async function exportFolderLayersPng(target,
  writerFactory = createFileTreeWriter, renderLayer = standaloneLayerCanvas,
  encode = encodePng) {
  const node = exportTargetRoot(target, true);
  if (!node || node.kind !== 'folder') return null;
  return writePngTree(planFolderPngTree(node), writerFactory, renderLayer, encode);
}

export const exportSingleLayer = exportTargetPng;
