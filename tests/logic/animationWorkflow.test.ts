import { describe, expect, it } from "vitest";
import { makeAnimator, makeFrameMeta, makeTimeline, normalizeAnimator,
  removeFrameId, reorderFrameIds } from "../../src/logic/animation-data.ts";
import { framePlaybackDuration,
  nextPlaybackPosition } from "../../src/logic/AnimationPlayback.ts";
import { animationExportMetadata, onionFrameIds,
  spriteSheetPlan } from "../../src/logic/AnimationPresentation.ts";

describe("typed animation workflow owners", () => {
  it("creates, reorders and deletes frames while repairing selection", () => {
    const animator = makeAnimator({ layers: [], folders: [] });
    const timeline = animator.timelines[0]!;
    const second = makeFrameMeta(animator, { name: "Second" });
    const third = makeFrameMeta(animator, { name: "Third" });
    animator.frames[second.id] = second; animator.frames[third.id] = third;
    timeline.frameIds.push(second.id, third.id);
    expect(reorderFrameIds(timeline, [third.id, timeline.frameIds[0]!, second.id]))
      .toBe(true);
    timeline.selectedFrameId = third.id;
    expect(removeFrameId(timeline, third.id)).toBe(timeline.frameIds[0]);
  });

  it("rejects invalid reorder and repairs corrupt timeline references", () => {
    const animator = makeAnimator({ layers: [] }), timeline = animator.timelines[0]!;
    expect(reorderFrameIds(timeline, ["missing"])).toBe(false);
    timeline.frameIds.push("missing"); timeline.selectedFrameId = "missing";
    expect(normalizeAnimator(animator)?.timelines[0]?.frameIds)
      .toEqual([Object.keys(animator.frames)[0]]);
  });

  it("advances once, loop and pingpong without mutating frame data", () => {
    expect(nextPlaybackPosition(1, 1, 2, "once").stopped).toBe(true);
    expect(nextPlaybackPosition(1, 1, 2, "loop")).toEqual({
      index: 0, direction: 1, stopped: false });
    expect(nextPlaybackPosition(2, 1, 3, "pingpong")).toEqual({
      index: 1, direction: -1, stopped: false });
    expect(framePlaybackDuration(null, 20)).toBe(50);
    expect(framePlaybackDuration(2, 20)).toBe(16);
  });

  it("plans onion neighbours and a bounded sprite-sheet export", () => {
    const ids = ["a", "b", "c", "d"];
    expect(onionFrameIds(ids, "c", 2, 1))
      .toEqual({ previous: ["b", "a"], next: ["d"] });
    const frames = { a: { id: "a", name: "A", duration: 90 },
      b: { id: "b", duration: null }, c: { id: "c" }, d: { id: "d" } };
    const plan = spriteSheetPlan(ids, 16, 8, 10, frames);
    expect(plan).toMatchObject({ columns: 2, rows: 2, width: 32, height: 16 });
    expect(plan.frames[2]).toMatchObject({ id: "c", x: 0, y: 8, duration: 100 });
    const timeline = makeTimeline({ timelineSeq: 0 }, ids,
      { name: "Walk", fps: 10, mode: "loop" });
    expect(animationExportMetadata(timeline, plan, 16, 8).frames).toHaveLength(4);
  });
});
