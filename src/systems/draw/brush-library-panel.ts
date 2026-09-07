// Панель библиотеки кистей: встроенные формы, пресеты и пользовательские копии.
import { S } from "../../core/state.ts";
import * as actions from "../../core/actions.ts";
import * as bus from "../../core/bus.ts";
import { $, t, toast } from "../../core/shell.ts";
import { ensurePresetBrush, presetBrush, presetBrushCatalog, presetIdOf,
  presetShapeId, type PresetBrushEntry } from "./preset-brush.ts";
import { brushTile, panelInk } from "./brush-tile.ts";
import { addUserBrush, removeUserBrush, userBrush, userBrushes, userIdOf,
  userShapeId } from "./brush-library-store.ts";
import { buildBrushPanel } from "./brush-panel-chrome.ts";

type BrushTool = "pencil" | "eraser";
const SHAPES = [{ id: "round", key: "brush.round" },
  { id: "square", key: "brush.square" }] as const;
const STORE = "simpleBrushShapes";

// Кисть живёт в состоянии под индексной сигнатурой: сужаем её здесь один раз.
const shapes = (): Record<string, string> => S["brushShape"] as Record<string, string>;
const opacities = (): Record<string, number> => S["brushOpacity"] as Record<string, number>;
const activeTool = (): BrushTool => S["tool"] === "eraser" ? "eraser" : "pencil";
const sizeKey = (tool: BrushTool): string => tool === "eraser" ? "eraserSize" : "pencilSize";
const toolSize = (): number => Number(S[sizeKey(activeTool())] ?? 1);
const selected = (): string => shapes()[activeTool()] ?? "round";

function save(): void {
  try { localStorage.setItem(STORE, JSON.stringify(shapes())); } catch { /* хранилище необязательно */ }
}

let presets: readonly PresetBrushEntry[] = [];

function choose(shape: string): void {
  const tool = activeTool(); shapes()[tool] = shape;
  const copy = userBrush(userIdOf(shape));
  if (copy) { // копия несёт свои размер и непрозрачность
    S[sizeKey(tool)] = copy.size; opacities()[tool] = copy.opacity;
  }
  save(); render(); bus.emit("tool"); bus.emit("render");
}

// Пресет выбирается только после успешной загрузки: пока кисть декодируется
// или если она не загрузилась, инструмент остаётся на прежней форме.
async function choosePreset(shape: string): Promise<void> {
  const id = presetIdOf(shape); if (!id) return;
  const brush = await ensurePresetBrush(id,
    (name) => toast(t("toast.brushLoadFailed", { name })));
  if (brush) choose(shape);
}

const presetName = (id: string): string =>
  presets.find((preset) => preset.id === id)?.name ?? id;

function duplicate(): void {
  const shape = selected(), source = presetIdOf(shape);
  if (!source) { toast(t("toast.brushCopyShape")); return; }
  const base = userBrush(userIdOf(shape))?.name ?? presetName(source);
  const copy = addUserBrush({ source, name: t("brush.copyName", { name: base }),
    size: toolSize(), opacity: opacities()[activeTool()] ?? 1 });
  choose(userShapeId(copy.id));
}

// Встроенные пресеты поставляются с приложением: удалить можно только копию.
function remove(): void {
  const id = userIdOf(selected());
  if (!id) { toast(t("toast.brushBuiltin")); return; }
  removeUserBrush(id); choose("round");
}

const libraryTile = (shape: string, label: string,
  ink: readonly [number, number, number], current: string): HTMLButtonElement =>
  brushTile({ key: shape, label, ink, selected: current === shape,
    brush: presetBrush(presetIdOf(shape)), choose: () => void choosePreset(shape) });

function render(): void {
  const list = $("brush-list"); if (!list) return;
  const ink = panelInk(), current = selected();
  list.replaceChildren(
    ...SHAPES.map((shape) => brushTile({ key: shape.id, label: t(shape.key), ink,
      selected: current === shape.id, square: shape.id === "square",
      choose: () => choose(shape.id) })),
    ...presets.map((preset) =>
      libraryTile(presetShapeId(preset.id), preset.name, ink, current)),
    ...userBrushes().map((copy) =>
      libraryTile(userShapeId(copy.id), copy.name, ink, current)));
  const trash = $("brush-del");
  if (trash instanceof HTMLButtonElement) trash.disabled = !userIdOf(current);
}

// Превью читает декодированную кисть, поэтому библиотека декодируется при
// первом открытии панели — иначе все пресеты выглядели бы одинаково.
async function loadPresets(): Promise<void> {
  if (presets.length) return;
  presets = await presetBrushCatalog(); render();
  await Promise.all(presets.map((preset) => ensurePresetBrush(preset.id)));
  render();
}

function toggle(): void {
  const panel = $("brush-pop"); if (!panel) return;
  panel.classList.toggle("on");
  if (panel.classList.contains("on")) { render(); void loadPresets(); }
}

// Сохранённый пресет нужно декодировать при запуске: иначе инструмент молча
// рисовал бы твёрдым отпечатком, хотя в панели выбрана кисть.
export async function restoreSelectedPresets(): Promise<void> {
  const ids = [...new Set(Object.values(shapes()).map(presetIdOf))];
  for (const id of ids) {
    if (!id) continue;
    const brush = await ensurePresetBrush(id,
      (name) => toast(t("toast.brushLoadFailed", { name })));
    if (brush) continue;
    for (const tool of Object.keys(shapes())) {
      if (presetIdOf(shapes()[tool]) === id) shapes()[tool] = "round";
    }
    save();
  }
  bus.emit("render");
}

export function mount(): void {
  try {
    Object.assign(shapes(), JSON.parse(localStorage.getItem(STORE) ?? "{}"));
  } catch { /* сохранённый выбор необязателен */ }
  void restoreSelectedPresets();
  const panel = $("brush-pop"); if (!panel) return;
  buildBrushPanel(panel, { duplicate, remove });
  actions.registerOrReplace("ui.brushLibrary", toggle);
  bus.on("tool", () => { if (panel.classList.contains("on")) render(); });
  bus.on("locale", () => { buildBrushPanel(panel, { duplicate, remove }); render(); });
}
