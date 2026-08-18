/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import type { CompactBrushShellPort } from
  "../../src/ui/brushes/CompactBrushShellPort";
import { mountCompactBrushPanel } from
  "../../src/ui/brushes/mountCompactBrushPanel";

describe("persistent compact brush panel", () => {
  it("ignores outside pointerdown and closes through the floating X callback", () => {
    document.body.innerHTML = `<button id="t-pencil"></button>
      <section id="brush-pop"><header id="brush-head"></header>
      <span id="brush-rsz"></span></section><menu id="brush-menu"></menu>
      <menu id="brush-plus"></menu><main id="outside"></main>`;
    const close = vi.fn(); let closeButton = (): void => undefined;
    const shell: CompactBrushShellPort = { registerOpen: vi.fn(), showMenu: vi.fn(),
      attachReorder: vi.fn(), selectLegacyBrush: vi.fn(),
      mountFloating: vi.fn((_panel, _grip, _handle, onClose) => {
        closeButton = onClose ?? (() => undefined);
      }) };
    mountCompactBrushPanel(shell, document.querySelector("#brush-pop")!,
      document.querySelector("#brush-menu")!, close);
    document.querySelector("#outside")!.dispatchEvent(new PointerEvent("pointerdown",
      { bubbles: true }));
    expect(close).not.toHaveBeenCalled(); closeButton(); expect(close).toHaveBeenCalledOnce();
  });
});
