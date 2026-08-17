export interface CanvasBackgroundChoice {
  readonly id: "transparent" | "white" | "black";
  readonly label: "new.bgTransparent" | "new.bgWhite" | "new.bgBlack";
  readonly color: readonly [number, number, number] | null;
  readonly visible?: boolean;
}

export const DEFAULT_CANVAS_BACKGROUND: CanvasBackgroundChoice & {
  readonly id: "white";
  readonly color: readonly [255, 255, 255];
  readonly visible: true;
};
export const CANVAS_BACKGROUND_CHOICES: readonly CanvasBackgroundChoice[];
