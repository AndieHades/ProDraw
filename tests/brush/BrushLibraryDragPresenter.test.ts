/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { BrushLibraryService } from "../../src/core/brush-library/BrushLibraryService";
import { BrushLibraryDragPresenter } from "../../src/ui/brushes/BrushLibraryDragPresenter";
import { MemoryBrushStorage } from "./MemoryBrushStorage";

class Transfer {
  readonly #values = new Map<string, string>();
  readonly types: string[] = [];
  effectAllowed = "none";
  setData(type: string, value: string): void {
    this.#values.set(type, value);
    if (!this.types.includes(type)) this.types.push(type);
  }
  getData(type: string): string { return this.#values.get(type) ?? ""; }
}

function fire(element: Element, type: string, dataTransfer: Transfer): void {
  const event = new element.ownerDocument.defaultView!.Event(type,
    { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  element.dispatchEvent(event);
}

describe("BrushLibraryDragPresenter", () => {
  it("moves a dragged brush into its physical target set", async () => {
    const storage = new MemoryBrushStorage();
    const library = await BrushLibraryService.create(storage, BUNDLED_BRUSHES,
      () => "dragged-id");
    await library.createSet("Inks");
    const brush = await library.create(BUNDLED_BRUSHES[0]!, "Dragged");
    document.body.innerHTML = `<nav id="brush-set-list">
      <button data-set-name="Main">Main</button></nav>
      <div id="brush-list"><button data-brush-id="${brush.id}"
        data-brush-set="Inks">Dragged</button></div>`;
    try {
      let movedSet = "";
      new BrushLibraryDragPresenter(library, (moved) => { movedSet = moved.setName; });
      const transfer = new Transfer();
      const source = document.querySelector("[data-brush-id]")!;
      const target = document.querySelector("[data-set-name]")!;
      fire(source, "dragstart", transfer);
      fire(target, "dragover", transfer);
      fire(target, "drop", transfer);
      await vi.waitFor(() => expect(movedSet).toBe("Main"));
      expect(storage.files.has(`Main/${brush.fileName}`)).toBe(true);
      expect(storage.files.has(`Inks/${brush.fileName}`)).toBe(false);
    } finally {
      document.body.replaceChildren();
    }
  });
});
