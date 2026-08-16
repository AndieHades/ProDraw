export interface StrokeSample {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly time: number;
}

export interface BrushRenderSettings {
  readonly size: number;
  readonly opacity: number;
  readonly erase: boolean;
}
