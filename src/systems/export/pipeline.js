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

export async function exportFolderLayersPng(target,
  writerFactory = createFileTreeWriter) {
  const node = exportTargetRoot(target, true);
  if (!node || node.kind !== 'folder') return null;
  const plan = planFolderPngTree(node);
  if (!plan.items.length) { toast(t('toast.exportEmpty')); return null; }
  let writer = null;
  try {
    writer = await writerFactory(plan.rootName);
    if (!writer) return null;
    for (const item of plan.items) {
      const output = await FORMATS.png.encode(standaloneLayerCanvas(item.node),
        item.node.name);
      if (!output.blob) throw new Error('PNG encoder returned no data');
      await writer.write(item.path, output.blob);
    }
    const result = await writer.commit();
    toast(t('toast.exported', { n: plan.items.length }));
    return { ...result, items: plan.items };
  } catch (error) {
    await writer?.abort().catch(() => undefined);
    toast(t(error instanceof FileTreeUnsupportedError
      ? 'toast.folderExportUnavailable' : 'toast.folderExportFailed'));
    return null;
  }
}

export const exportSingleLayer = exportTargetPng;
