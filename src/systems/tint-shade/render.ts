// Рисует содержимое окна генератора: базовый цвет, шкалы тинтов/шейдов, блоки
// гармонии и превью выбранных цветов. Чистый DOM — данные берёт из store и logic.
import { $, t } from "../../core/shell.ts";
import { rgb, rgbToHex } from "../../logic/color.ts";
import { generateTints, generateShades,
  generateTintShadeScalesForHarmony } from "../../logic/tint-shade.ts";
import { tsg, isSel, allSel, setGroup } from "./store.ts";

type Color = readonly number[];
export interface TintShadeHandlers {
  readonly onTap: (color: Color) => void;
  readonly onAdd: (color: Color) => void;
}

// обработчики из index (выбор / ПКМ-добавление)
let handlers: TintShadeHandlers = { onTap: () => {}, onAdd: () => {} };
export const setHandlers = (next: TintShadeHandlers): void => { handlers = next; };

const clear = (id: string): HTMLElement | null => {
  const node = $(id); if (node) node.innerHTML = ""; return node;
};

// Галочка у базового цвета: выбрать/снять всю шкалу (тинты + шейды) целиком.
function groupCheck(colors: readonly Color[]): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button"; button.className = "tsg-check";
  if (allSel(colors)) button.classList.add("on");
  button.title = t("tsg.selectAll");
  button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
  button.addEventListener("click", () => { setGroup(colors, !allSel(colors)); render(); });
  return button;
}

function swatch(color: Color): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "tsg-sw"; button.type = "button";
  button.style.background = rgb(color); button.title = rgbToHex(color).toUpperCase();
  if (isSel(color)) button.classList.add("on");
  button.addEventListener("click", () => handlers.onTap(color));
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault(); handlers.onAdd(color);
  });
  return button;
}

function scaleRow(colors: readonly Color[], title: string): HTMLDivElement {
  const wrap = document.createElement("div"); wrap.className = "tsg-scale";
  const head = document.createElement("div");
  head.className = "tsg-stitle"; head.textContent = title; wrap.appendChild(head);
  const row = document.createElement("div"); row.className = "tsg-row";
  colors.forEach((color, index) => {
    const cell = document.createElement("div"); cell.className = "tsg-cell";
    cell.appendChild(swatch(color));
    const label = document.createElement("span"); label.className = "tsg-lab";
    label.textContent = index === 0 ? t("tsg.base") : `${index * 20}%`;
    cell.appendChild(label); row.appendChild(cell);
  });
  wrap.appendChild(row); return wrap;
}

function harmonyBlocks(): void {
  const wrap = clear("tsg-harm");
  if (!wrap || !tsg.base || !tsg.harmony) return;
  for (const scale of generateTintShadeScalesForHarmony(tsg.base, tsg.harmony)) {
    const block = document.createElement("div"); block.className = "tsg-block";
    const head = document.createElement("div"); head.className = "tsg-bhead";
    const dot = document.createElement("span");
    dot.className = "tsg-dot"; dot.style.background = rgb(scale.base);
    const hex = document.createElement("span");
    hex.textContent = rgbToHex(scale.base).toUpperCase();
    head.append(dot, hex, groupCheck([...scale.tints, ...scale.shades]));
    block.append(head, scaleRow(scale.tints, t("tsg.tints")),
      scaleRow(scale.shades, t("tsg.shades")));
    wrap.appendChild(block);
  }
}

function renderSelected(): void {
  const box = clear("tsg-selprev"); if (!box) return;
  for (const color of tsg.sel) {
    const chip = document.createElement("span"); chip.className = "tsg-chip";
    chip.style.background = rgb(color); chip.title = rgbToHex(color).toUpperCase();
    box.appendChild(chip);
  }
  const count = $("tsg-selcount");
  if (count) count.textContent = String(tsg.sel.length);
}

export function render(): void {
  const base = tsg.base; if (!base) return;
  const preview = $("tsg-baseprev"); if (preview) preview.style.background = rgb(base);
  const hex = $("tsg-basehex");
  if (hex instanceof HTMLInputElement) {
    hex.value = rgbToHex(base).toUpperCase(); hex.classList.remove("bad");
  }
  const tints = generateTints(base), shades = generateShades(base);
  const scales = clear("tsg-scales");
  if (scales) scales.append(scaleRow(tints, t("tsg.tints")),
    scaleRow(shades, t("tsg.shades")));
  const check = clear("tsg-basecheck");
  if (check) check.appendChild(groupCheck([...tints, ...shades]));
  harmonyBlocks(); renderSelected();
  for (const button of document.querySelectorAll<HTMLElement>("#tsg-win [data-harm]")) {
    button.classList.toggle("on", button.dataset["harm"] === tsg.harmony);
  }
}
