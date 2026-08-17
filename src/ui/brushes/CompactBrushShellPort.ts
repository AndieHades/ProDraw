import type { LoadedBrush } from "../../contracts/brush";

export interface CompactBrushShellPort {
  registerOpen(handler: (mode: string) => void): void;
  mountFloating(panel: HTMLElement, grip: HTMLElement, handle: HTMLElement,
    onClose: () => void): void;
  showMenu(menu: HTMLElement, x: number, y: number, preferAbove?: boolean): void;
  attachReorder(tile: HTMLElement, save: () => void, squelch: () => void): void;
  selectLegacyBrush(id: string, brush: LoadedBrush, mode: string): void;
}
