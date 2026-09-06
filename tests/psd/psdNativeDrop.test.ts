/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { bindFileDrop } from "../../src/systems/import/file-drop.ts";

type Transfer = Pick<DataTransfer, "files" | "items" | "types" | "dropEffect">;

function transfer(types: string[], files: File[] = []): Transfer {
  return { types, files: files as unknown as FileList,
    items: [] as unknown as DataTransferItemList, dropEffect: "none" };
}

function fire(type: string, dataTransfer: Transfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  window.dispatchEvent(event);
  return event;
}

describe("native PSD file drop", () => {
  it("accepts the public.file-url type exposed by macOS Finder", () => {
    const show = vi.fn(), onFile = vi.fn();
    bindFileDrop(window, show, onFile);
    const entering = fire("dragenter", transfer(["public.file-url"]));
    const dragging = fire("dragover", transfer(["public.file-url"]));
    const psd = new File(["8BPS"], "drawing.psd");
    const dropped = fire("drop", transfer(["public.file-url"], [psd]));
    expect([entering.defaultPrevented, dragging.defaultPrevented,
      dropped.defaultPrevented]).toEqual([true, true, true]);
    expect(show.mock.calls).toEqual([[true], [false]]);
    expect(onFile).toHaveBeenCalledWith(psd);
  });
});
