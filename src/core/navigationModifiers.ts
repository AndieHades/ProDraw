let canvasPanHeld = false;

export const canvasPanModifierHeld = (): boolean => canvasPanHeld;
export const setCanvasPanModifierHeld = (held: boolean): void => {
  canvasPanHeld = held;
};
