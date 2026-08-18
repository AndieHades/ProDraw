import type { CompactBrushShellPort } from "./CompactBrushShellPort";
import { requiredElement } from "../dom/query";

export function mountCompactBrushPanel(
  shell: CompactBrushShellPort,
  panel: HTMLElement,
  _menu: HTMLElement,
  close: () => void
): void {
  shell.mountFloating(panel, requiredElement("#brush-head"),
    requiredElement("#brush-rsz"), close);
}
