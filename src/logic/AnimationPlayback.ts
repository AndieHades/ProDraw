import type { AnimationMode } from "./animation-data.ts";

export interface PlaybackPosition { readonly index: number; readonly direction: 1 | -1;
  readonly stopped: boolean }
export function framePlaybackDuration(duration: number | null | undefined,
  fps: number | null | undefined): number {
  return Math.max(16, duration || Math.round(1000 / (fps || 12)));
}
export function nextPlaybackPosition(index: number, direction: 1 | -1,
  count: number, mode: AnimationMode): PlaybackPosition {
  if (count <= 0) return { index: 0, direction, stopped: true };
  let next = index + direction, nextDirection = direction;
  if (next >= count || next < 0) {
    if (mode === "once") return { index: Math.max(0, Math.min(count - 1, index)),
      direction, stopped: true };
    if (mode === "pingpong") {
      nextDirection = direction === 1 ? -1 : 1;
      next = Math.max(0, Math.min(count - 1, next + nextDirection * 2));
    } else next = 0;
  }
  return { index: next, direction: nextDirection, stopped: false };
}
