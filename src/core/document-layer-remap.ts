// Пересадка слоя на новую растровую основу: сетка и запас за краем меняются,
// а идентичность структуры и текстовый источник переносятся честной копией.
import { inheritStructureIdentity } from "./history/structurePatch.ts";
import { cloneTextSource, isTextLayer } from "../logic/text-model.ts";
import type { LayerRecord } from "./layer-record.ts";

export interface RemapRaster {
  readonly grid: unknown;
  readonly ext: unknown;
}
export interface RemapOptions {
  readonly moveText?: (text: unknown) => unknown;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, cloneValue(item)]));
}

export function remappedLayer(layer: LayerRecord, raster: RemapRaster,
  options: RemapOptions = {}): LayerRecord {
  const source = layer as unknown as Record<string, unknown>;
  const text = isTextLayer(layer) ? cloneTextSource(source["text"]) : source["text"];
  const effects = (source["effects"] as unknown[] | undefined) ?? [];
  const next = {
    ...source, grid: raster.grid, ext: raster.ext,
    effects: effects.map(cloneValue),
    text: options.moveText && text ? options.moveText(text) : text,
  } as unknown as LayerRecord;
  return inheritStructureIdentity(layer, next);
}

export function applyLayerRemap(layer: LayerRecord, raster: RemapRaster,
  options: RemapOptions = {}): LayerRecord {
  const target = layer as unknown as Record<string, unknown>;
  target["grid"] = raster.grid; target["ext"] = raster.ext;
  if (isTextLayer(layer)) {
    const text = cloneTextSource(target["text"]);
    target["text"] = options.moveText ? options.moveText(text) : text;
  }
  return layer;
}
