export type PointerKind = "mouse" | "pen" | "touch";

export interface PointerContact {
  readonly id: number;
  readonly kind: PointerKind;
  readonly button: number;
  readonly buttons: number;
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly width: number;
  readonly height: number;
  readonly time: number;
}
