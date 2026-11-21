/** @vitest-environment jsdom */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCropControls } from "../../src/ui/crop/CropControlsPresenter";

describe("Crop controls keyboard", () => {
  const calls: string[] = [];
  let active = true;

  beforeAll(() => {
    document.body.innerHTML = '<button id="crop"></button><button id="crop-ok"></button>' +
      '<button id="crop-cancel"></button><button id="crop-fit"></button>' +
      '<input id="crop-w"><input id="crop-h">';
    mountCropControls({
      active: () => active, apply: () => calls.push("apply"),
      cancel: () => calls.push("cancel"), fit: () => calls.push("fit"),
      toggle: vi.fn(), bindCanvasMode: vi.fn(),
      dimensionInput: (_dimension, commit) => { if (commit) calls.push("commit"); }
    });
  });
  beforeEach(() => { calls.length = 0; active = true; });

  const press = (target: EventTarget) => target.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

  it("applies the crop on Enter away from the fields", () => {
    press(document.body);
    expect(calls).toEqual(["apply"]);
  });

  it("commits a typed size and applies with one Enter", () => {
    const input = document.getElementById("crop-w") as HTMLInputElement;
    input.focus(); press(input);
    expect(calls).toEqual(["commit", "apply"]);
    expect(document.activeElement).not.toBe(input);
  });

  it("fits the frame to content from its button without applying", () => {
    (document.getElementById("crop-fit") as HTMLButtonElement).click();
    expect(calls).toEqual(["fit"]);
  });

  it("ignores Enter when Crop is not active", () => {
    active = false; press(document.body);
    expect(calls).toEqual([]);
  });
});
