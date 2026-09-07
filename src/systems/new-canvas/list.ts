// Списки обычных растровых холстов и сохранённых пользовательских размеров.
import { $ } from "../../core/shell.ts";
import { openMenuAt } from "../../core/menus.ts";
import { t } from "../../i18n/index.ts";
import { DIGITAL_CANVAS_PRESETS,
  PRINT_SOCIAL_CANVAS_PRESETS } from "../../config/presets.ts";

export interface CanvasPreset {
  readonly w: number; readonly h: number;
  readonly id?: string; readonly label?: string; readonly labelKey?: string;
}
export interface PresetListHandlers {
  readonly create: (preset: CanvasPreset) => void;
  readonly edit: (index: number) => void;
  readonly remove: (index: number) => void;
}

const dim = (preset: CanvasPreset): string => `${preset.w} x ${preset.h}`;
export const presetLabel = (preset: CanvasPreset): string =>
  preset.labelKey ? t(preset.labelKey) : preset.label || dim(preset);

function menuForSaved(event: MouseEvent, index: number,
  handlers: PresetListHandlers): void {
  event.preventDefault(); event.stopPropagation();
  const menu = $("rowctx"); if (!menu) return;
  menu.innerHTML = "";
  for (const action of [
    { label: t("menu.edit"), danger: false, run: () => handlers.edit(index) },
    { label: t("gallery.delete"), danger: true, run: () => handlers.remove(index) },
  ]) {
    const button = document.createElement("button");
    button.textContent = action.label;
    if (action.danger) button.classList.add("danger");
    button.onclick = () => { menu.classList.remove("on"); action.run(); };
    menu.appendChild(button);
  }
  openMenuAt({ menuId: "rowctx", x: event.clientX, y: event.clientY });
}

function row(preset: CanvasPreset, savedIndex: number | null,
  handlers: PresetListHandlers): HTMLElement {
  const element = document.createElement(savedIndex === null ? "button" : "div");
  element.className = "new-row" + (savedIndex === null ? "" : " saved");
  if (element instanceof HTMLButtonElement) element.type = "button";
  if (preset.id) element.dataset["presetId"] = preset.id;
  const name = document.createElement("span");
  name.className = "new-name"; name.textContent = presetLabel(preset);
  if (preset.labelKey) name.dataset["i18n"] = preset.labelKey;
  const size = document.createElement("span");
  size.className = "new-size"; size.textContent = dim(preset);
  element.append(name, size);
  element.onclick = () => handlers.create(preset);
  if (savedIndex !== null) {
    const dots = document.createElement("button");
    dots.type = "button"; dots.className = "new-dots"; dots.textContent = "...";
    dots.onclick = (event) => menuForSaved(event, savedIndex, handlers);
    element.appendChild(dots);
  }
  return element;
}

function fillStack(id: string, list: readonly CanvasPreset[],
  handlers: PresetListHandlers, saved = false): void {
  const box = $(id); if (!box) return;
  box.innerHTML = "";
  if (saved && !list.length) {
    const empty = document.createElement("p");
    empty.className = "new-empty"; empty.textContent = t("new.savedEmpty");
    box.appendChild(empty); return;
  }
  list.forEach((preset, index) =>
    box.appendChild(row(preset, saved ? index : null, handlers)));
}

export function buildPresetLists(saved: readonly CanvasPreset[],
  handlers: PresetListHandlers): void {
  fillStack("new-digital", DIGITAL_CANVAS_PRESETS, handlers);
  fillStack("new-print-social", PRINT_SOCIAL_CANVAS_PRESETS, handlers);
  fillStack("new-saved", saved, handlers, true);
}
