import { clamp } from "../../logic/math.ts";
import { menuArrow, prepareMenu, resetMenuArrow } from "./MenuPresenter.ts";

type Side = "right" | "left" | "bottom" | "top";
export interface AnchoredMenuOptions { readonly containerSelector?: string }

function placeSidebarMenu(
  menu: HTMLElement, arrow: HTMLElement, anchorRect: DOMRect, hostRect: DOMRect,
  viewportWidth: number, viewportHeight: number
): void {
  const side = hostRect.left + hostRect.width / 2 <= viewportWidth / 2 ? "right" : "left";
  const anchorY = anchorRect.top + anchorRect.height / 2;
  const rect = menu.getBoundingClientRect();
  let left = side === "right" ? anchorRect.right + 10 : anchorRect.left - 10 - rect.width;
  let top = anchorY - rect.height / 2;
  left = clamp(left, 8, viewportWidth - rect.width - 8);
  top = clamp(top, 8, viewportHeight - rect.height - 8);
  resetMenuArrow(arrow);
  arrow.className = `menu-arrow ${side === "right" ? "left" : "right"}`;
  arrow.style.top = `${clamp(anchorY - top, 16, rect.height - 16) - 6}px`;
  menu.style.left = `${left}px`; menu.style.top = `${top}px`;
  menu.style.visibility = "";
}

function chooseSide(host: DOMRect, menu: DOMRect, width: number, height: number): Side {
  const room: Record<Side, number> = {
    right: width - host.right - 18, left: host.left - 18,
    bottom: height - host.bottom - 18, top: host.top - 18
  };
  const need: Record<Side, number> = {
    right: menu.width, left: menu.width, bottom: menu.height, top: menu.height
  };
  const horizontal = host.width >= host.height * 1.2;
  const vertical = host.height >= host.width * 1.2;
  const order: readonly Side[] = vertical ? ["right", "left", "bottom", "top"] :
    horizontal ? ["bottom", "top", "right", "left"] : ["right", "left", "bottom", "top"];
  return order.find((side) => room[side] >= need[side]) ?? order.reduce((best, side) =>
    room[side] - need[side] > room[best] - need[best] ? side : best);
}

export function showMenuForAnchor(
  menu: HTMLElement, anchor: HTMLElement, options: AnchoredMenuOptions = {}
): void {
  prepareMenu(menu);
  const arrow = menuArrow(menu);
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const host = anchor.closest<HTMLElement>(options.containerSelector ?? "#sidebar, #topbar") ?? anchor;
    const hostRect = host.getBoundingClientRect();
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (host.id === "sidebar") {
      placeSidebarMenu(menu, arrow, anchorRect, hostRect, width, height); return;
    }
    const anchorX = anchorRect.left + anchorRect.width / 2;
    const anchorY = anchorRect.top + anchorRect.height / 2;
    const side = chooseSide(hostRect, rect, width, height);
    let left = anchorX - rect.width / 2;
    let top = anchorY - rect.height / 2;
    resetMenuArrow(arrow);
    if (side === "right") { left = hostRect.right + 10; arrow.className = "menu-arrow left"; }
    else if (side === "left") { left = hostRect.left - 10 - rect.width; arrow.className = "menu-arrow right"; }
    else if (side === "bottom") { top = hostRect.bottom + 10; arrow.className = "menu-arrow up"; }
    else { top = hostRect.top - 10 - rect.height; arrow.className = "menu-arrow down"; }
    left = clamp(left, 8, width - rect.width - 8);
    top = clamp(top, 8, height - rect.height - 8);
    menu.style.left = `${left}px`; menu.style.top = `${top}px`;
    if (side === "right" || side === "left") {
      arrow.style.top = `${clamp(anchorY - top, 16, rect.height - 16) - 6}px`;
    } else arrow.style.left = `${clamp(anchorX - left, 16, rect.width - 16) - 6}px`;
    menu.style.visibility = "";
  });
}
