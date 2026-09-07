// Каталог и кеш декодированных `.brush` пресетов для продакшн-оболочки.
// Ассеты и декодер загружаются лениво, чтобы не попадать в основной чанк.
// Ошибка одной кисти изолируется: вызывающий продолжает твёрдым отпечатком.
import type { BrushPreset, LoadedBrush } from "../../contracts/brush.ts";
import { userBrush, userIdOf } from "./brush-library-store.ts";

// Рендерер даба и планировщик хода нужны только тому, кто выбрал пресет,
// поэтому они грузятся вместе с кистью и не лежат в основном чанке.
type DabModule = typeof import("../../core/brush/renderBrushDab.ts");
type StrokeModule = typeof import("../../logic/stroke/StrokePipeline.ts");
export type PresetEngine = DabModule & StrokeModule;
let engine: PresetEngine | null = null;
export const presetEngine = (): PresetEngine | null => engine;

async function loadEngine(): Promise<PresetEngine> {
  if (engine) return engine;
  const [dab, stroke] = await Promise.all([
    import("../../core/brush/renderBrushDab.ts"),
    import("../../logic/stroke/StrokePipeline.ts")
  ]);
  engine = { ...dab, ...stroke }; return engine;
}

const PREFIX = "preset:";
const decoded = new Map<string, LoadedBrush>();
const failed = new Set<string>();
let catalog: Promise<readonly BrushPreset[]> | null = null;

export interface PresetBrushEntry { readonly id: string; readonly name: string }

const bundled = (): Promise<readonly BrushPreset[]> => (catalog ??=
  import("../../config/bundledBrushes.ts").then((module) => module.BUNDLED_BRUSHES)
    .catch(() => []));

export const presetShapeId = (id: string): string => PREFIX + id;
// Пользовательская копия ссылается на встроенный пресет: рисует она тем же
// декодированным ассетом, отличаются только имя и настройки инструмента.
export const presetIdOf = (shape: unknown): string | null => {
  if (typeof shape !== "string") return null;
  if (shape.startsWith(PREFIX)) return shape.slice(PREFIX.length);
  return userBrush(userIdOf(shape))?.source ?? null;
};

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
      import("../../core/brush/procreateBrush.ts"), fetch(preset.sourceUrl),
      loadEngine()
    ]);
    if (!response.ok) throw new Error(`brush request failed: ${response.status}`);
    const brush = await module.decodeProcreateBrush(
      new Uint8Array(await response.arrayBuffer()), preset);
    decoded.set(id, brush); return brush;
  } catch {
    failed.add(id); onFailure?.(preset.name); return null;
  }
}
