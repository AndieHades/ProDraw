import type { ShellActionName } from "../../contracts/shellActionCatalog.ts";

export type SymmetryFlag = "sym" | "symH" | "symD1" | "symD2";
export type ShapeChoice =
  | { readonly kind: "line"; readonly mode: string }
  | { readonly fill: boolean; readonly kind: "shape"; readonly tool: string };

export interface ToolPanelState {
  readonly backgroundSelected: boolean;
  readonly fillShape: Readonly<Record<string, boolean | undefined>>;
  readonly lineMode: string;
  readonly rotationActive: boolean;
  readonly selectionActive: boolean;
  readonly shapeTool: string;
  readonly symEnabled: boolean;
  readonly symFlags: Readonly<Record<SymmetryFlag, boolean>>;
  readonly symLineMode: string | null;
  readonly tool: string;
}

export interface ToolPanelPort {
  readonly changed: (...events: readonly ("layers" | "render")[]) => void;
  readonly ensureSymmetryDefaults: () => void;
  readonly registerAction: (name: ShellActionName, action: () => void) => void;
  readonly replaceAction: (name: ShellActionName, action: () => void) => void;
  readonly run: (name: ShellActionName, ...args: readonly unknown[]) => unknown;
  readonly setLineMode: (mode: string) => void;
  readonly setShape: (tool: string, fill: boolean) => void;
  readonly setSymEnabled: (enabled: boolean) => void;
  readonly setSymLineMode: (mode: string | null) => void;
  readonly setTool: (tool: string) => void;
  readonly state: () => ToolPanelState;
  readonly subscribe: (event: "selection" | "tool", listener: () => void) => void;
  readonly toggleSymmetry: (flag: SymmetryFlag) => boolean;
}
