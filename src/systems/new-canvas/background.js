import { CANVAS_BACKGROUND_CHOICES, DEFAULT_CANVAS_BACKGROUND } from '../../config/canvas-background.ts';
import { $ } from '../../ui/dom/ShellDom.ts';
import { t } from '../../i18n/index.ts';
import { rgb } from '../../logic/color.ts';

const defaultIndex = CANVAS_BACKGROUND_CHOICES.findIndex(
  ({ id }) => id === DEFAULT_CANVAS_BACKGROUND.id
);
let index = defaultIndex;

function sync() {
  const state = CANVAS_BACKGROUND_CHOICES[index], swatch = $('new-bg-swatch');
  swatch.classList.toggle('transparent', !state.color);
  swatch.style.background = state.color ? rgb(state.color) : '';
  $('new-bg-text').textContent = t(state.label);
}

export const newCanvasBackground = {
  color: () => CANVAS_BACKGROUND_CHOICES[index].color,
  next() { index = (index + 1) % CANVAS_BACKGROUND_CHOICES.length; sync(); },
  reset() { index = defaultIndex; sync(); },
};
