export interface StrokeSample {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly time: number;
  readonly sizeScale?: number;
  readonly opacityScale?: number;
  readonly rotation?: number;
  readonly dabIndex?: number;
  readonly exactPosition?: boolean;
  readonly pointerType?: "pen" | "mouse" | "touch";
}

export interface StylusDiagnosticSample extends StrokeSample {
  readonly pointerType: "pen" | "mouse" | "touch";
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
