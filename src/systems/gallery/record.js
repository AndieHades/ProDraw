import { S, cloneFx } from '../../core/state.js';
import { liveFrameId } from '../../core/animation.js';
import { cloneTileset } from '../../logic/tileset-data.js';
import { cloneReferenceBoard } from '../../core/reference-board.js';
import { ensureGrid } from '../../core/grid.js';
import { t } from '../../i18n/index.js';
import { cloneAnimatorIdle, cloneLayersIdle } from './record-clone.js';
import { renderGalleryPreview } from './record-preview.js';

const cloneFolders = (folders) => folders.map((folder) =>
  ({ ...folder, effects: cloneFx(folder.effects) }));
const cloneBackground = () => ({ color: S.bg.color ? S.bg.color.slice() : null,
  visible: S.bg.visible !== false });

export async function buildGalleryRecord(id, folder, isCurrent) {
  if (!id || !isCurrent()) return null;
  const layers = await cloneLayersIdle(S.layers, () => undefined, isCurrent);
  if (!layers || !isCurrent()) return null;
  const liveFrame = { layers: S.layers, folders: S.folders, bg: S.bg, cur: S.cur,
    layerSeq: S.layerSeq, folderSeq: S.folderSeq };
  const animator = await cloneAnimatorIdle(S.animator, liveFrameId(), liveFrame, isCurrent);
  if (animator === undefined || !isCurrent()) return null;
  const preview = await renderGalleryPreview(isCurrent);
  if (preview === null || !isCurrent()) return null;
  const now = Date.now();
  return { id, kind: 'doc', folder, name: S.docName || t('gallery.untitled'),
    W: S.W, H: S.H, layerSeq: S.layerSeq, folderSeq: S.folderSeq,
    tilesetSeq: S.tilesetSeq, tilesets: S.tilesets.map(cloneTileset), layers,
    animator, referenceBoard: cloneReferenceBoard(S.referenceBoard),
    grid: { ...ensureGrid() }, bg: cloneBackground(),
    folders: cloneFolders(S.folders), palette: S.palette.map((color) => color.slice()),
    active: S.active.slice(), colorMode: S.colorMode || 'rgba', preview,
    order: now, updated: now };
}
