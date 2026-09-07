/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideTooltip, mount } from "../../src/systems/tooltip.ts";

const hover = (target: Element, related: Element | null = null): void => {
  target.dispatchEvent(Object.assign(new Event("pointerover", { bubbles: true }),
    { pointerType: "mouse", relatedTarget: related }));
};
const leave = (target: Element, related: Element | null = null): void => {
  target.dispatchEvent(Object.assign(new Event("pointerout", { bubbles: true }),
    { pointerType: "mouse", relatedTarget: related }));
};
const tip = (): HTMLElement | null => document.getElementById("tip");

describe("shell tooltip", () => {
  let button: HTMLButtonElement;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = "";
    button = document.createElement("button");
    button.title = "Карандаш (B)";
    button.append(document.createElement("svg"));
    document.body.append(button);
    mount();
  });
  afterEach(() => { hideTooltip(); vi.useRealTimers(); });

  // Нативный тултип Chromium молчит после ввода пером, поэтому оболочка
  // показывает свой из того же `title`.
  it("shows the title after a hover delay and hides it on leave", () => {
    hover(button);
    expect(tip()?.classList.contains("on")).not.toBe(true);
    vi.advanceTimersByTime(500);
    expect(tip()?.textContent).toBe("Карандаш (B)");
    expect(tip()?.classList.contains("on")).toBe(true);
    leave(button);
    expect(tip()?.classList.contains("on")).toBe(false);
  });

  // Пока подсказка держится, нативный тултип снят, иначе их было бы две.
  it("restores the native title once the pointer leaves", () => {
    hover(button);
    expect(button.hasAttribute("title")).toBe(false);
    leave(button);
    expect(button.title).toBe("Карандаш (B)");
  });

  it("keeps the tooltip while the pointer moves inside the same button", () => {
    hover(button); vi.advanceTimersByTime(500);
    const icon = button.firstElementChild!;
    hover(icon, button);
    expect(tip()?.classList.contains("on")).toBe(true);
  });

  it("ignores touch, which has no hover", () => {
    button.dispatchEvent(Object.assign(new Event("pointerover", { bubbles: true }),
      { pointerType: "touch" }));
    vi.advanceTimersByTime(500);
    expect(button.title).toBe("Карандаш (B)");
    expect(tip()?.classList.contains("on")).not.toBe(true);
  });

  it("drops the tooltip when a gesture starts", () => {
    hover(button); vi.advanceTimersByTime(500);
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(tip()?.classList.contains("on")).toBe(false);
    expect(button.title).toBe("Карандаш (B)");
  });
});
