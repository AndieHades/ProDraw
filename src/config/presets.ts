// Временный адаптер старого интерфейса к единому каталогу растровых холстов.
import presets from "./canvas-presets.json" with { type: "json" };

export interface SizePreset {
  readonly id: string;
  readonly labelKey: string;
  readonly w: number;
  readonly h: number;
  readonly dpi: number;
  readonly category: string;
}

export const DEFAULT_DOC = { w: 32, h: 32 };

const adapt = ({ id, labelKey, width, height, dpi, category }: {
  id: string; labelKey: string; width: number; height: number;
  dpi: number; category: string;
}): SizePreset => ({ id, labelKey, w: width, h: height, dpi, category });

export const SIZE_PRESETS: readonly SizePreset[] = Object.freeze(presets.map(adapt));

export const DIGITAL_CANVAS_PRESETS: readonly SizePreset[] = Object.freeze(
  SIZE_PRESETS.filter(({ category }) => category === "screen" || category === "art")
);

export const PRINT_SOCIAL_CANVAS_PRESETS: readonly SizePreset[] = Object.freeze(
  SIZE_PRESETS.filter(({ category }) => category === "print" || category === "social")
);
