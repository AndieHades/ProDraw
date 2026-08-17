import type { CompactBrushShellPort } from "./CompactBrushShellPort";
import { bindOutsidePointerDismiss } from "../dom/bindOutsidePointerDismiss";
import { requiredElement } from "../dom/query";

export function mountCompactBrushPanel(
  shell: CompactBrushShellPort,
  panel: HTMLElement,
  menu: HTMLElement,
  close: () => void
): void {
  shell.mountFloating(panel, requiredElement("#brush-head"),
    requiredElement("#brush-rsz"), close);
  bindOutsidePointerDismiss(panel, [requiredElement("#t-pencil"), menu,
    requiredElement("#brush-plus")], close);
}
