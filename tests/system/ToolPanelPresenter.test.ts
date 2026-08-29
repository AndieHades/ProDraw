/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolPanelPresenter } from "../../src/ui/shell/ToolPanelPresenter";
import type { ToolPanelPort, ToolPanelState } from
  "../../src/ui/shell/ToolPanelTypes";

const BUTTON_IDS = ["t-pencil", "t-eraser", "t-fill", "t-select", "t-lasso",
  "t-move", "t-adjust", "t-shape", "sym", "flip-h", "img-settings", "center", "zoom",
  "trim-selected"];
const MENU_IDS = ["shape-choice", "sym-choice", "flip-choice", "center-choice",
  "zoom-choice", "adjpop"];

function baseState(): ToolPanelState {
  return { backgroundSelected: false, fillShape: {}, lineMode: "line",
    rotationActive: false, selectionActive: false, shapeTool: "rect", symEnabled: false,
    symFlags: { sym: false, symH: false, symD1: false, symD2: false },
    symLineMode: null, tool: "pencil" };
}

describe("tool panel active state", () => {
  beforeEach(() => {
    document.body.innerHTML = `${BUTTON_IDS.map((id) =>
      `<button id="${id}"></button>`).join("")}<canvas id="cv"></canvas>${MENU_IDS.map((id) =>
      `<menu id="${id}"></menu>`).join("")}`;
  });

  it("hides the remembered paint tool while Free Transform is active", () => {
    let state = { ...baseState(), rotationActive: true, tool: "eraser" };
    const listeners: Array<() => void> = [];
    const setTool = vi.fn();
    const port: ToolPanelPort = {
      changed: vi.fn(), ensureSymmetryDefaults: vi.fn(), registerAction: vi.fn(),
      replaceAction: vi.fn(), run: vi.fn((name) => { if (name === "transform.apply") {
        state = { ...state, rotationActive: false }; listeners[0]?.();
      } }), setLineMode: vi.fn(), setShape: vi.fn(),
      setSymEnabled: vi.fn(), setSymLineMode: vi.fn(), setTool, state: () => state,
      subscribe: (_event, listener) => listeners.push(listener), toggleSymmetry: vi.fn()
    };
    new ToolPanelPresenter(port).mount();

    document.getElementById("trim-selected")?.click();
    expect(port.run).toHaveBeenCalledWith("canvas.trimSelected");

    expect(document.getElementById("t-eraser")?.classList.contains("on")).toBe(false);
    expect(document.getElementById("t-move")?.classList.contains("on")).toBe(true);

    document.getElementById("t-move")?.click();
    expect(setTool).not.toHaveBeenCalled();
    expect(document.getElementById("t-eraser")?.classList.contains("on")).toBe(true);
    expect(document.getElementById("t-move")?.classList.contains("on")).toBe(false);
  });
});
