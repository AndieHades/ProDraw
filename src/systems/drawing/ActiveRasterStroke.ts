import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { DrawingTool, StrokeSample } from "../../contracts/stroke";
import type { ViewportPort } from "../../contracts/view";
import { renderBrushDab } from "../../core/brush/renderBrushDab";
import { renderSmudgeDab, type SmudgeState } from "../../core/brush/renderSmudgeDab";
import type { TileHistory } from "../../core/history/TileHistory";
import type { RasterSurface } from "../../core/raster/RasterSurface";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";

export interface DrawingStrokeOptions {
  readonly viewport: ViewportPort;
  readonly history: TileHistory;
  readonly getBrush: () => BrushPreset | LoadedBrush;
  readonly getColor: () => RgbaColor;
  readonly getSize: () => number;
  readonly getOpacity: () => number;
}

export class ActiveRasterStroke {
  readonly #options: DrawingStrokeOptions;
  readonly #tool: DrawingTool;
  readonly #edit;
  readonly #pipeline;
  readonly #smudge: SmudgeState | null;

  constructor(options: DrawingStrokeOptions, surface: RasterSurface, tool: DrawingTool) {
    this.#options = options; this.#tool = tool;
    const label = tool === "brush" ? "Brush stroke" :
      tool === "eraser" ? "Erase stroke" : "Smudge stroke";
    this.#edit = options.history.begin(surface, label);
    this.#pipeline = new StrokePipeline(options.getBrush(), options.getSize());
    this.#smudge = tool === "smudge" ? { carried: null } : null;
  }

  push(sample: StrokeSample): void {
    this.draw(this.#pipeline.push(sample));
  }

  commit(): boolean {
    this.draw(this.#pipeline.finish());
    return this.#options.history.record(this.#edit.commit());
  }

  cancel(): void { this.#edit.cancel(); }

  private draw(samples: readonly StrokeSample[]): void {
    for (const sample of samples) {
      const brush = this.#options.getBrush();
      if (this.#tool === "smudge" && this.#smudge) {
        renderSmudgeDab(this.#edit, brush, sample,
          { size: this.#options.getSize(), strength: this.#options.getOpacity(),
            ...brush.smudge }, this.#smudge);
      } else {
        renderBrushDab(this.#edit, brush, sample,
          { size: this.#options.getSize(), opacity: this.#options.getOpacity(),
            erase: this.#tool === "eraser" }, this.#options.getColor());
      }
      this.#options.viewport.requestRender();
    }
  }
}
