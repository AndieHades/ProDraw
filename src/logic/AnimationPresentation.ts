import type { AnimationMode } from "./animation-data.ts";

export interface AnimationFrameMeta { readonly id: string; readonly name?: string;
  readonly duration?: number | null }
export interface SpriteFrameMeta { readonly id: string; readonly name: string;
  readonly duration: number; readonly x: number; readonly y: number;
  readonly w: number; readonly h: number }
export interface SpriteSheetPlan { readonly columns: number; readonly rows: number;
  readonly width: number; readonly height: number; readonly frames: SpriteFrameMeta[] }
export function onionFrameIds(frameIds: readonly string[], activeId: string,
  previous: number, next: number): { previous: string[]; next: string[] } {
  const index = frameIds.indexOf(activeId); if (index < 0) return { previous: [], next: [] };
  return { previous: frameIds.slice(Math.max(0, index - previous), index).reverse(),
    next: frameIds.slice(index + 1, index + 1 + next) };
}
export function spriteSheetPlan(frameIds: readonly string[], width: number, height: number,
  fps: number, frames: Readonly<Record<string, AnimationFrameMeta>>): SpriteSheetPlan {
  const columns = Math.max(1, Math.ceil(Math.sqrt(frameIds.length || 1)));
  const rows = Math.max(1, Math.ceil((frameIds.length || 1) / columns));
  return { columns, rows, width: columns * width, height: rows * height,
    frames: frameIds.map((id, index) => ({ id, name: frames[id]?.name || id,
      duration: frames[id]?.duration || Math.round(1000 / fps),
      x: (index % columns) * width, y: Math.floor(index / columns) * height,
      w: width, h: height })) };
}
export function animationExportMetadata(timeline: { readonly name: string;
  readonly fps: number; readonly mode: AnimationMode }, plan: SpriteSheetPlan,
  frameWidth: number, frameHeight: number) {
  return { timeline: timeline.name, frameW: frameWidth, frameH: frameHeight,
    fps: timeline.fps, mode: timeline.mode, columns: plan.columns, frames: plan.frames };
}
export const safeAnimationFileSegment = (value: string, fallback: string): string =>
  value.replace(/[^\w.-]+/g, "_") || fallback;
