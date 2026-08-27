import { SYM_MODES } from "../../config/toolbar.ts";
import { t } from "../../i18n/index.ts";
import { toast } from "../dom/ToastPresenter.ts";
import { buildToolChoices } from "./ToolChoiceMenus.ts";
import { bindToolPanelButtons } from "./ToolPanelBindings.ts";
import { ToolPanelModes } from "./ToolPanelModes.ts";
import type { ShapeChoice, SymmetryFlag, ToolPanelPort } from "./ToolPanelTypes.ts";

const TOOL_IDS = ["pencil", "eraser", "fill", "select", "lasso", "move", "adjust"];
const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing tool-panel element: ${id}`);
  return found as T;
};

export class ToolPanelPresenter {
  readonly #modes = new ToolPanelModes();
  readonly #port: ToolPanelPort;

  constructor(port: ToolPanelPort) { this.#port = port; }

  registerActions(): void {
    this.#port.registerAction("toggle.symV", () => this.toggleSymmetry("sym"));
    this.#port.registerAction("toggle.symH", () => this.toggleSymmetry("symH"));
  }

  mount(): void {
    buildToolChoices({
      shape: (mode) => this.activateShape(mode),
      symmetryFlag: (flag) => { this.#modes.symmetry = { kind: "flag", flag };
        this.toggleSymmetry(flag); },
      symmetryTool: (mode) => this.activateSymmetryTool(mode),
      action: (group, mode, action) => {
        this.#modes[group] = mode; this.syncModes(); this.#port.run(action);
      }
    });
    this.#port.replaceAction("tool.pencil", () => this.brushClick("pencil"));
    bindToolPanelButtons({
      brush: (tool) => tool === "pencil" ? void this.#port.run("tool.pencil") : this.brushClick(tool),
      shape: () => this.shapeToolActive() ? this.activateBrush() :
        this.activateShape(this.#modes.shape),
      move: () => { if (this.#port.state().rotationActive) {
        this.#port.run("transform.apply");
      } else this.#port.run("transform.enter"); },
      select: () => { const state = this.#port.state();
        if (state.tool === "select" || state.selectionActive) this.clearSelection();
        else this.#port.setTool("select"); },
      lasso: () => this.#port.state().tool === "lasso" ?
        this.clearSelection() : this.#port.setTool("lasso"),
      fill: () => this.#port.state().tool === "fill" ?
        this.activateBrush() : void this.#port.run("tool.fill"),
      adjust: () => this.#port.state().tool === "adjust" ?
        this.activateBrush() : this.#port.setTool("adjust"),
      symmetry: () => this.activateLastSymmetry(),
      flip: () => { this.#port.run(this.#modes.flipConfig().action); },
      imageSettings: () => { this.#port.run("effect.bc", null, null,
        { scope: this.#port.state().backgroundSelected ? "canvas" : "layer" }); },
      center: () => { this.#port.run(this.#modes.centerConfig().action); },
      zoom: () => { this.#port.run(this.#modes.zoomConfig().action); },
      showModes: () => this.syncModes()
    });
    for (const event of ["tool", "selection"] as const) {
      this.#port.subscribe(event, () => this.syncTools());
    }
    this.syncTools();
  }

  private activateBrush(): void { this.#port.setTool("pencil"); this.syncModes(); }

  private activateShape(mode: ShapeChoice): void {
    this.#modes.shape = { ...mode };
    if (mode.kind === "line") { this.#port.setLineMode(mode.mode); this.#port.setTool("line"); }
    else { this.#port.setShape(mode.tool, mode.fill); this.#port.setTool(mode.tool); }
    this.syncModes();
  }

  private activateSymmetryTool(mode: string): void {
    this.#modes.symmetry = { kind: "tool", mode }; this.#port.setSymEnabled(true);
    const next = this.#port.state().symLineMode === mode ? null : mode;
    this.#port.setSymLineMode(next); this.syncModes(); this.#port.changed("render");
  }

  private toggleSymmetry(flag: SymmetryFlag): void {
    const config = SYM_MODES.find((item) => item.flag === flag);
    if (!config) return;
    this.#port.ensureSymmetryDefaults(); this.#port.setSymEnabled(true);
    const enabled = this.#port.toggleSymmetry(flag);
    this.syncModes(); this.#port.changed("render", "layers");
    toast(t(enabled ? config.onKey : config.offKey));
  }

  private activateLastSymmetry(): void {
    const state = this.#port.state();
    if (this.#modes.symmetryActive(state)) {
      this.#port.setSymEnabled(false); this.#port.setSymLineMode(null);
      this.syncModes(); this.#port.changed("render", "layers"); return;
    }
    this.#port.setSymEnabled(true);
    if (Object.values(state.symFlags).some(Boolean)) {
      this.syncModes(); this.#port.changed("render", "layers"); return;
    }
    if (this.#modes.symmetry.kind === "tool") this.activateSymmetryTool(this.#modes.symmetry.mode);
    else this.toggleSymmetry(this.#modes.symmetry.flag);
  }

  private brushClick(tool: string): void {
    const current = this.#port.state().tool;
    if (tool === "pencil") {
      this.activateBrush(); if (current === "pencil") this.#port.run("ui.brushLibrary", "pencil");
    } else if (current === tool) this.activateBrush();
    else this.#port.setTool(tool);
  }

  private clearSelection(): void {
    if (this.#port.state().selectionActive) this.#port.run("select.none");
    this.activateBrush();
  }
  private shapeToolActive(): boolean { return ["line", "rect", "ellipse"].includes(this.#port.state().tool); }
  private syncModes(): void { this.#modes.sync(this.#port.state()); }
  private syncTools(): void {
    const state = this.#port.state(); this.#modes.updateShapeFrom(state);
    for (const id of TOOL_IDS) element(`t-${id}`).classList.toggle("on",
      !state.rotationActive && state.tool === id);
    element("t-shape").classList.toggle("on", !state.rotationActive && this.shapeToolActive());
    element("t-select").classList.toggle("on", !state.rotationActive &&
      (state.tool === "select" || state.selectionActive));
    element("t-move").classList.toggle("on", state.rotationActive);
    this.syncModes(); element("cv").style.cursor = state.tool === "move" ? "move" : "";
  }
}
