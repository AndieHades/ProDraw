export interface LegacyViewPosition {
  readonly ox: number;
  readonly oy: number;
}

export interface PanPointerPosition {
  readonly button: number;
  readonly clientX: number;
  readonly clientY: number;
}

export interface PanMove {
  readonly ox: number;
  readonly oy: number;
  readonly moved: boolean;
}

interface PanStart extends PanPointerPosition, LegacyViewPosition {
  moved: boolean;
}

export class CanvasPanSession {
  readonly #threshold: number;
  #start: PanStart | null = null;

  constructor(threshold: number) { this.#threshold = threshold; }
  get active(): boolean { return this.#start !== null; }

  begin(pointer: PanPointerPosition, view: LegacyViewPosition): void {
    this.#start = { ...pointer, ...view, moved: false };
  }

  move(pointer: Pick<PanPointerPosition, "clientX" | "clientY">): PanMove | null {
    const start = this.#start; if (!start) return null;
    const dx = pointer.clientX - start.clientX, dy = pointer.clientY - start.clientY;
    if (Math.hypot(dx, dy) > this.#threshold) start.moved = true;
    return { ox: start.ox + dx, oy: start.oy + dy, moved: start.moved };
  }

  finish(): { readonly button: number; readonly moved: boolean } | null {
    const start = this.#start; this.#start = null;
    return start ? { button: start.button, moved: start.moved } : null;
  }

  cancel(): void { this.#start = null; }
}
