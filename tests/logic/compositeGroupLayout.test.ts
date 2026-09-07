import { describe, expect, it } from "vitest";
import { compositeGroupLayout } from "../../src/logic/compositeGroupLayout.ts";

const group = (id: string, bottom: number, top: number, depth: number) =>
  ({ f: { id, depth }, bottom, top });
const depthOf = (folder: { depth: number }) => folder.depth;
const ids = (list: readonly { f: { id: string } }[] | undefined) =>
  (list ?? []).map((entry) => entry.f.id);

describe("composite group layout", () => {
  it("indexes effect groups by their bottom and top layer", () => {
    const layout = compositeGroupLayout([group("a", 1, 4, 0)], [], depthOf);
    expect(ids(layout.below.get(1))).toEqual(["a"]);
    expect(ids(layout.above.get(4))).toEqual(["a"]);
    expect(layout.below.get(4)).toBeUndefined();
  });

  it("draws shallow groups under first and deep groups over first", () => {
    const groups = [group("deep", 0, 9, 3), group("shallow", 0, 9, 1)];
    const layout = compositeGroupLayout(groups, [], depthOf);
    expect(ids(layout.below.get(0))).toEqual(["shallow", "deep"]);
    expect(ids(layout.above.get(9))).toEqual(["deep", "shallow"]);
  });

  it("keeps the first isolated group when two start on the same layer", () => {
    const layout = compositeGroupLayout([],
      [group("first", 2, 5, 0), group("second", 2, 7, 0)], depthOf);
    expect(layout.isolated.get(2)?.f.id).toBe("first");
    expect(layout.isolated.size).toBe(1);
  });

  it("returns empty maps for an empty stack", () => {
    const layout = compositeGroupLayout([], [], depthOf);
    expect(layout.isolated.size).toBe(0);
    expect(layout.below.size).toBe(0);
    expect(layout.above.size).toBe(0);
  });
});
