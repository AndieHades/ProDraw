export interface CanvasPanPointer {
  readonly pointerType: string;
  readonly button: number;
}

export interface CanvasPanContext {
  readonly modifierHeld: boolean;
  readonly modeActive: boolean;
  readonly modeHit: boolean;
  readonly insideWorkArea: boolean;
}

export function shouldStartCanvasPan(pointer: CanvasPanPointer,
  context: CanvasPanContext): boolean {
  if (pointer.pointerType === "mouse" && pointer.button === 1) return true;
  if (pointer.pointerType !== "touch" && pointer.button === 0 &&
    context.modifierHeld) return true;
  if (pointer.pointerType !== "mouse" || pointer.button < 0 || pointer.button > 2)
    return false;
  if (context.modeActive) return !context.modeHit;
  return pointer.button === 2 || (pointer.button === 0 && !context.insideWorkArea);
}
