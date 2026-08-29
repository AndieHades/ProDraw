/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newLayer, S } from "../../src/core/state.js";
import { activeFrameId, activeTimeline, createFrame, deleteFrame, ensureAnimator,
  reorderFrames, saveActiveFrame, selectFrame,
  setFrameDuration } from "../../src/core/animation.js";
import { startPlayback, stopPlayback } from "../../src/systems/animation/playback.js";

function resetState() {
  S.W = 4; S.H = 4; S.layers = [newLayer("Original", 4, 4)]; S.cur = 0;
  S.folders = []; S.bg = { color: null, visible: true }; S.layerSeq = 1;
  S.folderSeq = 0; S.animator = null; S.marked.clear(); S.markedFolders.clear();
  S.undoStack.length = 0; S.redoStack.length = 0;
}

describe("live typed animation workflow", () => {
  beforeEach(() => { vi.useFakeTimers(); resetState(); });
  afterEach(() => { stopPlayback(); vi.useRealTimers(); });

  it("creates, selects, reorders and deletes isolated frame snapshots", () => {
    ensureAnimator(); const first = activeFrameId(), second = createFrame();
    S.layers[0].name = "Second"; saveActiveFrame();
    expect(selectFrame(first)).toBe(true); expect(S.layers[0].name).toBe("Original");
    expect(selectFrame(second)).toBe(true); expect(S.layers[0].name).toBe("Second");
    expect(setFrameDuration(second, 120)).toBe(true);
    expect(reorderFrames([second, first])).toBe(true);
    expect(activeTimeline().frameIds).toEqual([second, first]);
    expect(deleteFrame(second)).toBe(true); expect(activeFrameId()).toBe(first);
  });

  it("moves only the playhead during playback and restores selected frame", () => {
    ensureAnimator(); const first = activeFrameId(), second = createFrame();
    selectFrame(first); setFrameDuration(first, 16); setFrameDuration(second, 16);
    startPlayback(); expect(activeFrameId()).toBe(first);
    vi.advanceTimersByTime(20);
    expect(activeFrameId()).toBe(first);
    expect(S.animator.playheadFrameId).toBe(second);
    stopPlayback(); expect(activeFrameId()).toBe(first);
    expect(S.animator.playheadFrameId).toBeNull();
  });
});
