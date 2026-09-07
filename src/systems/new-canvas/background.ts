import { CANVAS_BACKGROUND_CHOICES,
  DEFAULT_CANVAS_BACKGROUND } from "../../config/canvas-background.ts";
import { $ } from "../../core/shell.ts";
import { t } from "../../i18n/index.ts";
import { rgb } from "../../logic/color.ts";

const defaultIndex = CANVAS_BACKGROUND_CHOICES.findIndex(
  ({ id }) => id === DEFAULT_CANVAS_BACKGROUND.id
);
let index = defaultIndex;

const choice = () => CANVAS_BACKGROUND_CHOICES[index] ??
  CANVAS_BACKGROUND_CHOICES[0];

function sync(): void {
  const state = choice(), swatch = $("new-bg-swatch"), text = $("new-bg-text");
  if (!state || !swatch) return;
  swatch.classList.toggle("transparent", !state.color);
  swatch.style.background = state.color ? rgb(state.color) : "";
  if (text) text.textContent = t(state.label);
}

export const newCanvasBackground = {
  color: () => choice()?.color,
  next() { index = (index + 1) % CANVAS_BACKGROUND_CHOICES.length; sync(); },
  reset() { index = defaultIndex; sync(); },
};
