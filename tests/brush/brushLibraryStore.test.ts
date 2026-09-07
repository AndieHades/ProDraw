/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { addUserBrush, removeUserBrush, userBrush, userBrushes, userIdOf,
  userShapeId } from "../../src/systems/draw/brush-library-store.ts";

describe("user brush library", () => {
  beforeEach(() => { localStorage.clear();
    for (const brush of [...userBrushes()]) removeUserBrush(brush.id); });

  it("keeps a copy with its own name, size and opacity", () => {
    const copy = addUserBrush({ source: "gundersen", name: "Gundersen copy",
      size: 34, opacity: 0.4 });
    expect(userBrush(copy.id)).toMatchObject({ source: "gundersen", size: 34,
      opacity: 0.4 });
    expect(userIdOf(userShapeId(copy.id))).toBe(copy.id);
    expect(JSON.parse(localStorage.getItem("userBrushes") ?? "[]")).toHaveLength(1);
  });

  it("reads only well formed entries back from storage", () => {
    localStorage.setItem("userBrushes", JSON.stringify([
      { id: "a", source: "lineart", name: "Ink" }, { id: 7 }, null, "x"]));
    // Кеш держится в модуле, поэтому перечитывание идёт через запись.
    const added = addUserBrush({ source: "texture", name: "T", size: 8, opacity: 1 });
    expect(userBrushes().map((brush) => brush.id)).toContain(added.id);
  });

  it("reports nothing for a shape that is not a user copy", () => {
    expect(userIdOf("preset:gundersen")).toBeNull();
    expect(userIdOf("round")).toBeNull();
    expect(userBrush(null)).toBeNull();
  });

  it("removes only the requested copy", () => {
    const first = addUserBrush({ source: "a", name: "A", size: 4, opacity: 1 });
    const second = addUserBrush({ source: "b", name: "B", size: 4, opacity: 1 });
    expect(removeUserBrush(first.id)).toBe(true);
    expect(removeUserBrush(first.id)).toBe(false);
    expect(userBrushes().map((brush) => brush.id)).toEqual([second.id]);
  });
});
