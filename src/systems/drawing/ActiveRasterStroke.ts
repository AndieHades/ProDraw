import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { RgbaColor } from "../../contracts/raster";
import type { DrawingTool, StrokeSample } from "../../contracts/stroke";
import type { ViewportPort } from "../../contracts/view";
import { visitBrushDab } from "../../core/brush/renderBrushDab";
import { renderSmudgeDab, type SmudgeState } from "../../core/brush/renderSmudgeDab";
import type { TileHistory } from "../../core/history/TileHistory";
import type { RasterSurface } from "../../core/raster/RasterSurface";
import { StrokePipeline } from "../../logic/stroke/StrokePipeline";
import { PixelOpacityAccumulator } from "../../logic/brush/PixelOpacityAccumulator";
import { eraseAlpha, sourceOver } from "../../logic/raster/colorComposite";

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
  readonly #surface: RasterSurface;
  readonly #opacity: PixelOpacityAccumulator | null;
  readonly #base = new Map<number, RgbaColor>();
  readonly #color: RgbaColor;

  constructor(options: DrawingStrokeOptions, surface: RasterSurface, tool: DrawingTool) {
    this.#options = options; this.#tool = tool; this.#surface = surface;
    const label = tool === "brush" ? "Brush stroke" :
      tool === "eraser" ? "Erase stroke" : "Smudge stroke";
    this.#edit = options.history.begin(surface, label);
    this.#pipeline = new StrokePipeline(options.getBrush(), options.getSize());
    this.#smudge = tool === "smudge" ? { carried: null } : null;
    this.#opacity = tool === "smudge" ? null : new PixelOpacityAccumulator(
      surface.width, surface.tileSize);
    this.#color = options.getColor();
  }

  push(sample: StrokeSample): void {
    this.draw(this.#pipeline.push(sample));
  }

  commit(): boolean {
    const tail = this.#pipeline.finish();
    if (this.#tool === "smudge") this.draw(tail);
    else { this.resetOpacity(); this.draw(this.#pipeline.completedPlan()); }
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
        visitBrushDab(brush, sample, { size: this.#options.getSize(),
          opacity: this.#options.getOpacity(), erase: this.#tool === "eraser" },
        (x, y, opacity) => {
          if (this.#surface.containsPixel(x, y)) this.#opacity?.add(x, y, opacity);
        });
        this.flushOpacity();
      }
      this.#options.viewport.requestRender();
    }
  }

  private flushOpacity(): void {
    this.#opacity?.visitDirty((x, y, opacity) => {
      const key = y * this.#surface.width + x;
      let base = this.#base.get(key);
      if (!base) { base = this.#edit.getPixel(x, y); this.#base.set(key, base); }
      this.#edit.setPixel(x, y, this.#tool === "eraser"
        ? eraseAlpha(base, opacity) : sourceOver(base, this.#color, opacity));
    });
  }

  private resetOpacity(): void {
    for (const [key, color] of this.#base) {
      const x = key % this.#surface.width, y = Math.floor(key / this.#surface.width);
      this.#edit.setPixel(x, y, color);
    }
    this.#base.clear(); this.#opacity?.clear();
  }
}
