import type { DrawingTool } from "../../contracts/stroke";
import type { PointerKind } from "../../contracts/pointer";

export type PointerTermination = "commit" | "cancel";

export interface ActivePointerStroke {
  readonly pointerId: number;
  readonly pointerKind: PointerKind;
  readonly tool: DrawingTool;
}

export class PointerStrokeSession {
  #active: ActivePointerStroke | null = null;

  get active(): ActivePointerStroke | null { return this.#active; }

  begin(pointerId: number, pointerKind: PointerKind, tool: DrawingTool): boolean {
    if (this.#active) return false;
    this.#active = { pointerId, pointerKind, tool };
    return true;
  }

  accepts(pointerId: number): boolean {
    return this.#active?.pointerId === pointerId;
  }

  toolChanged(pointerId: number, tool: DrawingTool): boolean {
    return this.accepts(pointerId) && this.#active?.tool !== tool;
  }

  end(pointerId: number, termination: PointerTermination): PointerTermination | null {
    if (!this.accepts(pointerId)) return null;
    this.#active = null;
    return termination;
  }

  cancel(): PointerTermination | null {
    if (!this.#active) return null;
    this.#active = null;
    return "cancel";
  }
}
