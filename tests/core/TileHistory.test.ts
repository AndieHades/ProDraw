import { describe, expect, it } from "vitest";
import { TileHistory } from "../../src/core/history/TileHistory";
import { changeSetBytes } from "../../src/core/history/tilePatch";
import { RasterSurface } from "../../src/core/raster/RasterSurface";

const ink = { red: 17, green: 83, blue: 201, alpha: 255 };

describe("TileHistory", () => {
  it("undoes and redoes exact tile bytes", () => {
    const surface = new RasterSurface("paint", 10_000, 10_000, 4);
    const history = new TileHistory();
    const edit = history.begin(surface, "Stroke");
    edit.blendPixel(2, 2, ink);
    edit.blendPixel(3, 2, ink, 0.25);
    const changeSet = edit.commit();
    expect(history.record(changeSet)).toBe(true);
    const painted = surface.copyTile(0, 0);
    expect(changeSet?.patches).toHaveLength(1);
    expect(changeSetBytes(changeSet!)).toBe(4 * 4 * 4);
    history.undo();
    expect(surface.copyTile(0, 0)).toBeNull();
    history.redo();
    expect(surface.copyTile(0, 0)).toEqual(painted);
  });

  it("restores the open edit on pointer cancellation", () => {
    const surface = new RasterSurface("paint", 8, 8, 4);
    surface.blendPixel(1, 1, ink);
    const before = surface.copyTile(0, 0);
    const edit = new TileHistory().begin(surface, "Cancelled stroke");
    edit.erasePixel(1, 1);
    edit.blendPixel(7, 7, ink);
    edit.cancel();
    expect(surface.copyTile(0, 0)).toEqual(before);
    expect(surface.copyTile(1, 1)).toBeNull();
  });

  it("reports only the current lifecycle's open edits", () => {
    const surface = new RasterSurface("open", 8, 8, 4);
    const history = new TileHistory();
    const first = history.begin(surface, "first");
    expect(history.hasOpenEdit).toBe(true);
    first.cancel();
    expect(history.hasOpenEdit).toBe(false);
    const stale = history.begin(surface, "stale");
    history.reset();
    history.begin(surface, "current");
    stale.cancel();
    expect(history.hasOpenEdit).toBe(true);
  });

  it("does not record no-op edits and clears redo after a new edit", () => {
    const surface = new RasterSurface("paint", 4, 4, 4);
    const history = new TileHistory();
    const noop = history.begin(surface, "No-op");
    noop.erasePixel(0, 0);
    expect(history.record(noop.commit())).toBe(false);
    const first = history.begin(surface, "First");
    first.blendPixel(0, 0, ink);
    history.record(first.commit());
    history.undo();
    const second = history.begin(surface, "Second");
    second.blendPixel(1, 1, ink);
    history.record(second.commit());
    expect(history.redoCount).toBe(0);
  });

  it("evicts old patches by retained byte budget", () => {
    const surface = new RasterSurface("budget", 8, 4, 2);
    const history = new TileHistory(100, 20);
    for (const x of [0, 3]) {
      const edit = history.begin(surface, "Budget stroke");
      edit.blendPixel(x, 0, ink);
      history.record(edit.commit());
    }
    expect(history.undoCount).toBe(1);
    expect(history.undoBytes).toBe(16);
    history.undo();
    expect(history.undoBytes).toBe(0);
    expect(history.redoBytes).toBe(16);
  });
});
