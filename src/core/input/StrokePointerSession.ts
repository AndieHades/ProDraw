import type { StrokeSample } from "../../contracts/stroke.ts";
import { strokeSampleFromPointer, type PointerSampleSource } from
  "../../logic/input/strokeSampleFromPointer.ts";
import { POINTER_INPUT } from "../../config/pointer.ts";

// A driver with no pressure uses the mouse fallback. Once pressure is observed,
// zero means a light contact/release and must never turn into a full-size dab.
export class StrokePointerSession {
  #pressureObserved = false;
  reset(): void { this.#pressureObserved = false; }
  sample(x: number, y: number, source: PointerSampleSource,
    release = false): StrokeSample {
    const sample = strokeSampleFromPointer(x, y, source, POINTER_INPUT);
    if (source.pointerType !== "pen") return sample;
    if (Number.isFinite(source.pressure) && (source.pressure ?? 0) > 0) {
      this.#pressureObserved = true;
    }
    return this.#pressureObserved && source.pressure === 0
      ? { ...sample, pressure: release ? 0 : POINTER_INPUT.minimumPenPressure } : sample;
  }
}
