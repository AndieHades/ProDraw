export interface StrokeSample {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly time: number;
}

export interface StylusDiagnosticSample extends StrokeSample {
  readonly pointerType: string;
  readonly button: number;
  readonly buttons: number;
}

export interface BrushRenderSettings {
  readonly size: number;
  readonly opacity: number;
  readonly erase: boolean;
}

export type DrawingTool = "brush" | "smudge" | "eraser";

export interface SmudgeRenderSettings {
  readonly size: number;
  readonly strength: number;
  readonly flow: number;
  readonly pickup: number;
  readonly pull: number;
}
