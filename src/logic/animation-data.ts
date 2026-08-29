import { ANIMATION, ANIMATION_MODES } from "../config/animation.ts";

export type AnimationMode = "once" | "loop" | "pingpong";
export interface AnimationFrame { id: string; name: string; duration: number | null;
  rev: number; readonly [key: string]: unknown }
export interface AnimationTimeline { id: string; name: string; frameIds: string[];
  fps: number; mode: AnimationMode; selectedFrameId: string }
export interface Animator { open: boolean; activeTimelineId: string | null;
  frameSeq: number; timelineSeq: number; timelines: AnimationTimeline[];
  frames: Record<string, AnimationFrame>; onion: typeof ANIMATION.onion;
  liveFrameId: string | null; playheadFrameId: string | null }
type Counter = { frameSeq: number; timelineSeq: number };
type FrameOverrides = { readonly name?: string; readonly duration?: number | null };
type TimelineOverrides = { readonly name?: string; readonly fps?: number;
  readonly mode?: unknown; readonly selectedFrameId?: string };
const frameName = (index: number): string => `Frame ${index}`;
const timelineName = (index: number): string => `Timeline ${index}`;
const frameId = (index: number): string => `fr-${index}`;
const timelineId = (index: number): string => `tl-${index}`;

export const nextFrameId = (animator: Pick<Counter, "frameSeq">): string =>
  frameId((animator.frameSeq || 0) + 1);
export const nextTimelineId = (animator: Pick<Counter, "timelineSeq">): string =>
  timelineId((animator.timelineSeq || 0) + 1);
export const safeMode = (mode: unknown): AnimationMode =>
  typeof mode === "string" && (ANIMATION_MODES as readonly string[]).includes(mode)
    ? mode as AnimationMode : ANIMATION.mode as AnimationMode;
export function makeFrameMeta(animator: Pick<Counter, "frameSeq">,
  overrides: FrameOverrides = {}): AnimationFrame {
  const index = (animator.frameSeq || 0) + 1; animator.frameSeq = index;
  return { id: frameId(index), name: overrides.name || frameName(index),
    duration: overrides.duration ?? null, rev: 0 };
}
export function makeTimeline(animator: Pick<Counter, "timelineSeq">,
  frameIds: readonly string[], overrides: TimelineOverrides = {}): AnimationTimeline {
  const index = (animator.timelineSeq || 0) + 1; animator.timelineSeq = index;
  return { id: timelineId(index), name: overrides.name || timelineName(index),
    frameIds: [...frameIds], fps: overrides.fps || ANIMATION.fps,
    mode: safeMode(overrides.mode), selectedFrameId: overrides.selectedFrameId || frameIds[0]! };
}
export function makeAnimator(firstFrame: Record<string, unknown>): Animator {
  const animator: Animator = { open: false, activeTimelineId: null, frameSeq: 0,
    timelineSeq: 0, timelines: [], frames: {}, onion: { ...ANIMATION.onion },
    liveFrameId: null, playheadFrameId: null };
  const metadata = makeFrameMeta(animator, { name: frameName(1) });
  animator.frames[metadata.id] = { ...firstFrame, ...metadata };
  const timeline = makeTimeline(animator, [metadata.id], { name: timelineName(1) });
  animator.timelines.push(timeline); animator.activeTimelineId = timeline.id;
  animator.liveFrameId = metadata.id; return animator;
}
export function activeTimeline(value: Animator | null | undefined): AnimationTimeline | null {
  if (!value) return null;
  return value.timelines.find((timeline) => timeline.id === value.activeTimelineId) ??
    value.timelines[0] ?? null;
}
export const activeFrameId = (animator: Animator | null | undefined): string | null => {
  const timeline = activeTimeline(animator);
  return timeline ? timeline.selectedFrameId || timeline.frameIds[0] || null : null;
};
export function normalizeAnimator(value: unknown): Animator | null {
  if (!value || typeof value !== "object") return null;
  const animator = value as Animator;
  if (!animator.frames || !Array.isArray(animator.timelines) || !animator.timelines.length)
    return null;
  animator.frameSeq ||= Object.keys(animator.frames).length;
  animator.timelineSeq ||= animator.timelines.length;
  animator.onion = { ...ANIMATION.onion, ...(animator.onion ?? {}) };
  for (const timeline of animator.timelines) {
    timeline.frameIds = (timeline.frameIds ?? []).filter((id) => !!animator.frames[id]);
    if (!timeline.frameIds.length) continue;
    timeline.fps ||= ANIMATION.fps; timeline.mode = safeMode(timeline.mode);
    if (!timeline.frameIds.includes(timeline.selectedFrameId))
      timeline.selectedFrameId = timeline.frameIds[0]!;
  }
  animator.timelines = animator.timelines.filter((timeline) => timeline.frameIds.length > 0);
  animator.activeTimelineId = activeTimeline(animator)?.id ?? animator.timelines[0]?.id ?? null;
  animator.liveFrameId ||= activeFrameId(animator); return animator.timelines.length ? animator : null;
}
export function insertFrameId(timeline: AnimationTimeline, id: string,
  nearId = timeline.selectedFrameId, after = true): void {
  const index = Math.max(0, timeline.frameIds.indexOf(nearId));
  timeline.frameIds.splice(index + (after ? 1 : 0), 0, id); timeline.selectedFrameId = id;
}
export function reorderFrameIds(timeline: AnimationTimeline,
  ids: readonly string[]): boolean {
  const known = new Set(timeline.frameIds);
  if (ids.length !== timeline.frameIds.length || ids.some((id) => !known.has(id))) return false;
  timeline.frameIds = [...ids]; return true;
}
export function removeFrameId(timeline: AnimationTimeline, id: string): string | null {
  if (timeline.frameIds.length <= 1) return null;
  const index = timeline.frameIds.indexOf(id); if (index < 0) return null;
  timeline.frameIds.splice(index, 1);
  timeline.selectedFrameId = timeline.frameIds[Math.min(index,
    timeline.frameIds.length - 1)]!; return timeline.selectedFrameId;
}
export function collectUnusedFrames(animator: Animator): string[] {
  const used = new Set(animator.timelines.flatMap((timeline) => timeline.frameIds));
  return Object.keys(animator.frames).filter((id) => !used.has(id));
}
