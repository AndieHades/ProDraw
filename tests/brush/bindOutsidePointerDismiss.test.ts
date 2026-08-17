/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindOutsidePointerDismiss } from
  "../../src/ui/dom/bindOutsidePointerDismiss";

describe("brush panel outside-pointer dismissal", () => {
  afterEach(() => document.body.replaceChildren());

  it("keeps the panel open for its content, trigger and menus", () => {
    const panel = element("panel"), trigger = element("trigger");
    const menu = element("menu"), outside = element("outside");
    panel.classList.add("on");
    const dismiss = vi.fn(() => panel.classList.remove("on"));
    const unbind = bindOutsidePointerDismiss(panel, [trigger, menu], dismiss);

    for (const target of [panel, trigger, menu]) pointerDown(target);
    expect(dismiss).not.toHaveBeenCalled();
    pointerDown(outside);
    expect(dismiss).toHaveBeenCalledOnce();
    expect(panel.classList.contains("on")).toBe(false);
    unbind();
  });
});

function element(id: string): HTMLElement {
  const node = document.createElement("div"); node.id = id;
  document.body.append(node); return node;
}

function pointerDown(target: HTMLElement): void {
  target.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
}
