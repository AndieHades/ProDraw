import { eqc } from "./color.ts";
import type { ColorChannels } from "./color.ts";

export function previousRampColor(current: ColorChannels,
  ramp: readonly ColorChannels[]): ColorChannels | null {
  const index = ramp.findIndex((color) => eqc(color, current));
  return index > 0 ? ramp[index - 1] ?? null : null;
}
