import { describe, expect, it } from "vitest";
import { createEffectsEntry, swapEffectsEntry } from
  "../../src/core/history/effectsPatch";
import type { EffectsState } from "../../src/core/history/effectsPatchTypes";

describe("typed effects patch", () => {
  it("restores layer and folder effects without retaining mutable settings", () => {
    const state: EffectsState = { cur: 0,
      layers: [{ effects: [{ type: "blur", params: { radius: 3 } }] }],
      folders: [{ id: 7, effects: [{ type: "shadow", opacity: 0.4 }] }] };
    const entry = createEffectsEntry([0, state.folders[0]!], state);
    if (!entry) throw new Error("Missing effects entry");
    (state.layers[0]!.effects?.[0] as { params: { radius: number } })
      .params.radius = 9;
    state.folders[0]!.effects = [];
    const inverse = swapEffectsEntry(entry, state);
    expect(inverse).not.toBeNull();
    expect(state.layers[0]!.effects).toEqual([{ type: "blur", params: { radius: 3 } }]);
    expect(state.folders[0]!.effects).toEqual([{ type: "shadow", opacity: 0.4 }]);
  });
});
