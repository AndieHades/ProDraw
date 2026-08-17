import { nextFloatingZ } from "../windows/FloatingWindow.ts";

const MENU_IDS = [
  "ctx", "lctx", "cctx", "sctx", "trctx", "fxctx", "impmenu", "setmenu",
  "tctx", "rowctx", "brush-plus", "brush-menu", "font-menu", "brush-choice",
  "shape-choice", "sym-choice", "flip-choice", "center-choice", "zoom-choice",
  "adjust-choice", "adjpop", "pal-new-choice", "ref-ctx", "anim-menu"
] as const;
let menuCloseBound = false;

function menus(): HTMLElement[] {
  return MENU_IDS.map((id) => document.getElementById(id))
    .filter((element): element is HTMLElement => element !== null);
}

export function closeMenus(except: HTMLElement | null = null): void {
  for (const menu of menus()) if (menu !== except) menu.classList.remove("on");
}

function inOpenMenu(target: Node): boolean {
  return menus().some((menu) => menu.classList.contains("on") && menu.contains(target));
}

function closeIfOutside(event: Event): void {
  const target = event.target;
  if (target && "nodeType" in target && !inOpenMenu(target as Node)) closeMenus();
}

function bindMenuClose(): void {
  if (menuCloseBound) return;
  menuCloseBound = true;
  document.addEventListener("pointerdown", closeIfOutside, true);
  document.addEventListener("contextmenu", (event) => {
    if (!event.defaultPrevented) closeIfOutside(event);
  });
  document.addEventListener("ui-close-popovers", () => closeMenus(), true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenus();
  }, true);
}

function raiseMenu(menu: HTMLElement): void {
  const cssZ = Number(window.getComputedStyle(menu).zIndex || 0);
  menu.style.zIndex = String(Math.max(cssZ || 0, nextFloatingZ()));
}

export function prepareMenu(menu: HTMLElement): void {
  bindMenuClose(); closeMenus(menu); raiseMenu(menu);
  menu.style.visibility = "hidden";
  menu.classList.add("on");
}

export function menuArrow(menu: HTMLElement): HTMLElement {
  const current = menu.querySelector<HTMLElement>(":scope > .menu-arrow");
  if (current) return current;
  const arrow = document.createElement("div");
  arrow.className = "menu-arrow";
  menu.appendChild(arrow);
  return arrow;
}

export function resetMenuArrow(arrow: HTMLElement): void {
  for (const property of ["left", "right", "top", "bottom"] as const) {
    arrow.style[property] = "";
  }
}

export function showMenuAt(
  menu: HTMLElement, anchorX: number, anchorY: number, above = false
): void {
  prepareMenu(menu);
  const arrow = menuArrow(menu);
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const gap = 10;
    const left = Math.max(8, Math.min(anchorX - rect.width / 2,
      window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(above ? anchorY - rect.height - gap : anchorY + gap,
      window.innerHeight - rect.height - 8));
    menu.style.left = `${left}px`; menu.style.top = `${top}px`;
    arrow.className = `menu-arrow ${above ? "down" : "up"}`;
    arrow.style.left = `${Math.max(16, Math.min(anchorX - left, rect.width - 16)) - 6}px`;
    menu.style.visibility = "";
  });
}

export function showMenuBeside(
  menu: HTMLElement, anchor: HTMLElement, anchorY: number
): void {
  prepareMenu(menu);
  menu.querySelector(":scope > .menu-arrow")?.remove();
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    let left = anchorRect.right + 8;
    if (left + rect.width > window.innerWidth - 8) left = anchorRect.left - 8 - rect.width;
    left = Math.max(8, Math.min(left, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(anchorY - rect.height / 2,
      window.innerHeight - rect.height - 8));
    menu.style.left = `${left}px`; menu.style.top = `${top}px`;
    menu.style.visibility = "";
  });
}
