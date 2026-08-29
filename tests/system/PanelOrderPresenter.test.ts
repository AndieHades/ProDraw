/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "../../src/ui/shell/PanelOrderPresenter";

describe("panel order migrations", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `<div id="tb-left"></div><div id="tb-right"></div>
      <aside id="sidebar"><button id="crop"></button>
      <button id="trim-selected"></button><button id="t-select"></button></aside>`;
  });

  it("places the new selected trim button directly after Crop for saved V2 layouts", () => {
    localStorage.setItem("panelOrderV2", JSON.stringify({
      sidebar: ["trim-selected", "t-select", "crop"]
    }));
    mount();
    const crop = document.getElementById("crop");
    expect(crop?.nextElementSibling?.id).toBe("trim-selected");
    const stored = JSON.parse(localStorage.getItem("panelOrderV2") ?? "null");
    expect(stored.schema).toBe(3);
    expect(stored.sidebar.indexOf("trim-selected"))
      .toBe(stored.sidebar.indexOf("crop") + 1);
  });
});
