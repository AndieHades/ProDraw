import type { BrushPreset } from "../../contracts/brush.ts";
import type { StrokeSample } from "../../contracts/stroke.ts";

export class StrokeOrientation {
  #path = 0;
  #initialAzimuth: number | null = null;

  rotation(brush: BrushPreset, sample: StrokeSample,
    previous: StrokeSample | null): number {
    if (previous && Math.hypot(sample.x - previous.x, sample.y - previous.y) > 0.001) {
      const angle = Math.atan2(sample.y - previous.y, sample.x - previous.x);
      this.#path += Math.atan2(Math.sin(angle - this.#path), Math.cos(angle - this.#path));
    }
    if (brush.properties.orientToScreen) return 0;
    const shape = brush.shape;
    const hasAzimuth = sample.pointerType === "pen" && shape.inputStyle !== "touch" &&
      Math.hypot(sample.tiltX, sample.tiltY) > 0.01;
    if (!hasAzimuth) return this.#path * shape.rotation;
    const azimuth = Math.atan2(sample.tiltY, sample.tiltX);
    this.#initialAzimuth ??= azimuth;
    return shape.relativeToStroke ? azimuth - this.#initialAzimuth : azimuth;
  }
}
