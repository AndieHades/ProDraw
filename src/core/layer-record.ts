// Фабрики и глубокие копии слоя и его эффектов. Все поля слоя описаны здесь —
// один источник для истории, галереи и дублирования.
import { EFFECT_DEFAULTS } from "../config/defaults.ts";
import { blank, cloneGrid, sparseGridStats } from "../logic/raster.ts";
import { normalizeLegacyRasterLayer } from "./raster/legacyRasterOwner.ts";
import { cloneTextSource } from "../logic/text-model.ts";
import { cloneRasterExt } from "../logic/raster/PackedRasterExt.ts";

export interface LayerEffect {
  id: number; type: string; visible: boolean; opacity?: number;
  params: Record<string, unknown>;
}
export interface LayerMask { alpha: Uint8Array | number[]; [key: string]: unknown }
export interface LayerRecord {
  name: string; grid: unknown; opacity: number; visible: boolean;
  fid: number | null; clip: boolean; lock: boolean; alphaLock: boolean;
  reference: boolean; symLock?: boolean; ext: Map<string, unknown>;
  effects: LayerEffect[]; kind: string; blendMode: string;
  masks: LayerMask[]; psdEffects: Record<string, unknown>[];
  text?: unknown; psdBounds?: Record<string, unknown> | undefined;
  psdAdjustment?: unknown;
  [key: string]: unknown;
}

const clonePsdEffects = (effects: readonly Record<string, unknown>[] = []) =>
  effects.map((effect) => ({ ...effect,
    properties: structuredClone(effect["properties"]) }));
const cloneMasks = (masks: readonly LayerMask[] = []): LayerMask[] =>
  masks.map((mask) => ({ ...mask, alpha: mask.alpha.slice() }));

export const newLayerRecord = (name: string, w: number, h: number): LayerRecord =>
  ({ name, grid: blank(w, h), opacity: 1, visible: true, fid: null, clip: false,
    lock: false, alphaLock: false, reference: false, ext: new Map(), effects: [],
    kind: "pixel", blendMode: "normal", masks: [], psdEffects: [] });

export const newLayer = (name: string, w: number, h: number): LayerRecord =>
  normalizeLegacyRasterLayer(newLayerRecord(name, w, h), w, h);

// фабрика эффекта слоя/папки: уникальный id, видимость, копия дефолтных параметров
let fxSeq = 0;
export const newEffect = (type: string,
  params: Record<string, unknown> = {}): LayerEffect => ({ id: ++fxSeq, type,
  visible: true, params: { ...(EFFECT_DEFAULTS as Record<string, Record<string, unknown>>)[type],
    ...params } });

// глубокая копия списка эффектов (только данные — для истории и копипаста)
export const cloneFx = (list?: readonly LayerEffect[] | null): LayerEffect[] =>
  (list || []).map((e) => ({ id: ++fxSeq, type: e.type,
    visible: e.visible !== false, opacity: e.opacity ?? 1, params: { ...e.params } }));

// глубокая копия слоя; overrides перекрывают поля (напр. дубликат: reference:false)
export const cloneLayerRecord = (L: LayerRecord,
  overrides: Partial<LayerRecord> = {}): LayerRecord => ({
  name: L.name, opacity: L.opacity, visible: L.visible, fid: L.fid,
  clip: !!L.clip, lock: !!L.lock, alphaLock: !!L.alphaLock,
  reference: !!L.reference, symLock: !!L.symLock,
  ext: Object.prototype.hasOwnProperty.call(overrides, "ext")
    ? overrides.ext! : cloneRasterExt(L.ext),
  grid: Object.prototype.hasOwnProperty.call(overrides, "grid")
    ? overrides["grid"] : cloneGrid(L.grid as object),
  effects: cloneFx(L.effects), kind: L.kind || "pixel",
  text: L.text ? cloneTextSource(L.text) : undefined,
  blendMode: L.blendMode || "normal", masks: cloneMasks(L.masks),
  psdBounds: L.psdBounds ? { ...L.psdBounds } : undefined,
  psdEffects: clonePsdEffects(L.psdEffects),
  psdAdjustment: L.psdAdjustment ? structuredClone(L.psdAdjustment) : undefined,
  ...overrides,
});

export const cloneLayer = (L: LayerRecord,
  overrides: Partial<LayerRecord> = {}): LayerRecord => {
  const layer = cloneLayerRecord(L, overrides);
  const rows = layer.grid as { length?: number; 0?: { length?: number } };
  const height = rows.length || 1;
  const sparse = sparseGridStats(layer.grid);
  return normalizeLegacyRasterLayer(layer,
    sparse?.width || rows[0]?.length || 1, height);
};
