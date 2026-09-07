// Каталог и кеш декодированных `.brush` пресетов для продакшн-оболочки.
// Ассеты и декодер загружаются лениво, чтобы не попадать в основной чанк.
// Ошибка одной кисти изолируется: вызывающий продолжает твёрдым отпечатком.
import type { BrushPreset, LoadedBrush } from "../../contracts/brush.ts";

const PREFIX = "preset:";
const decoded = new Map<string, LoadedBrush>();
const failed = new Set<string>();
let catalog: Promise<readonly BrushPreset[]> | null = null;

export interface PresetBrushEntry { readonly id: string; readonly name: string }

const bundled = (): Promise<readonly BrushPreset[]> => (catalog ??=
  import("../../config/bundledBrushes.ts").then((module) => module.BUNDLED_BRUSHES)
    .catch(() => []));

export const presetShapeId = (id: string): string => PREFIX + id;
export const presetIdOf = (shape: unknown): string | null =>
  typeof shape === "string" && shape.startsWith(PREFIX)
    ? shape.slice(PREFIX.length) : null;

export async function presetBrushCatalog(): Promise<readonly PresetBrushEntry[]> {
  return (await bundled()).map(({ id, name }) => ({ id, name }));
}

export const presetBrush = (id: string | null): LoadedBrush | null =>
  (id && decoded.get(id)) || null;

export const presetBrushForShape = (shape: unknown): LoadedBrush | null =>
  presetBrush(presetIdOf(shape));

export async function ensurePresetBrush(id: string,
  onFailure?: (name: string) => void): Promise<LoadedBrush | null> {
  const cached = decoded.get(id); if (cached) return cached;
  if (failed.has(id)) return null;
  const preset = (await bundled()).find((item) => item.id === id);
  if (!preset) { failed.add(id); return null; }
  try {
    const [module, response] = await Promise.all([
      import("../../core/brush/procreateBrush.ts"), fetch(preset.sourceUrl)
    ]);
    if (!response.ok) throw new Error(`brush request failed: ${response.status}`);
    const brush = await module.decodeProcreateBrush(
      new Uint8Array(await response.arrayBuffer()), preset);
    decoded.set(id, brush); return brush;
  } catch {
    failed.add(id); onFailure?.(preset.name); return null;
  }
}
