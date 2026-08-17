import { describe, expect, it } from "vitest";
import { LegacyCompositeCache, type LegacyCompositeState } from
  "../../src/core/render/LegacyCompositeCache";

function fixture(): LegacyCompositeState {
  return {
    W: 2480,
    H: 3508,
    bg: { visible: true, color: null },
    layers: [{ visible: true, opacity: 1, fid: null, clip: false, effects: [] }],
    folders: []
  };
}

describe("legacy composite cache", () => {
  it("reuses a stable A4 composite until content or presentation changes", () => {
    const cache = new LegacyCompositeCache();
    const state = fixture();
    const first = cache.candidate(state, 7);

    expect(cache.isHit(first)).toBe(false);
    cache.commit(first);
    expect(cache.isHit(cache.candidate(state, 7))).toBe(true);
    const contentEdit = cache.candidate(state, 8);
    expect(cache.isHit(contentEdit)).toBe(false);
    expect(cache.canPatch(contentEdit)).toBe(true);

    const faded = { ...state, layers: [{ ...state.layers[0], opacity: 0.5 }] };
    const visualEdit = cache.candidate(faded, 7);
    expect(cache.isHit(visualEdit)).toBe(false);
    expect(cache.canPatch(visualEdit)).toBe(false);
  });

  it("does not invalidate for cursor or viewport-only state", () => {
    const cache = new LegacyCompositeCache();
    const state = { ...fixture(), hoverPx: [20, 30],
      view: { zoom: 0.25, ox: 10, oy: 12 } };
    cache.commit(cache.candidate(state, 4));

    state.hoverPx = [80, 90];
    state.view = { zoom: 0.5, ox: -20, oy: 4 };
    expect(cache.isHit(cache.candidate(state, 4))).toBe(true);
  });

  it("rejects an old document after a full content generation reset", () => {
    const cache = new LegacyCompositeCache();
    const state = fixture();
    cache.commit(cache.candidate(state, 7, 2));

    const nextDocument = cache.candidate(state, 8, 3);
    expect(cache.isHit(nextDocument)).toBe(false);
    expect(cache.canPatch(nextDocument)).toBe(false);
  });

  it.each(["cropMode", "rotMode", "rotPrev", "moveDrag", "selFloat"] as const)(
    "bypasses and invalidates cache while %s is live", (key) => {
      const cache = new LegacyCompositeCache();
      const base = fixture();
      const stable = cache.candidate(base, 3);
      cache.commit(stable);
      const live = { ...base, [key]: { revision: 1 } };

      const candidate = cache.candidate(live, 3);
      expect(candidate).toBeNull();
      expect(cache.isHit(candidate)).toBe(false);
      cache.commit(candidate);
      expect(cache.isHit(cache.candidate(base, 3))).toBe(false);
    }
  );

  it("reuses an unchanged effect draft across cursor-only frames", () => {
    const cache = new LegacyCompositeCache();
    const base = fixture();
    const eff = { type: "stroke", params: { size: 4 } };
    const state = { ...base, fxDraft: { target: base.layers[0], eff } };
    const first = cache.candidate(state, 3);
    cache.commit(first);

    const moved = { ...state, hoverPx: [30, 40] };
    expect(cache.isHit(cache.candidate(moved, 3))).toBe(true);
    eff.params.size = 8;
    expect(cache.isHit(cache.candidate(state, 3))).toBe(false);
  });
});
