function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing preserved-shell element: ${id}`);
  return found;
}

function pixels(value: string | null | undefined, fallback = 0): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sidebarMetrics(): {
  readonly border: number; readonly buttonHeight: number; readonly buttonWidth: number;
  readonly count: number; readonly gap: number; readonly horizontalPadding: number;
  readonly verticalPadding: number;
} {
  const bar = element("sidebar");
  const style = window.getComputedStyle(bar);
  const buttons = [...bar.querySelectorAll("button")];
  const buttonStyle = buttons[0] ? window.getComputedStyle(buttons[0]) : null;
  return {
    count: buttons.length,
    buttonWidth: pixels(buttonStyle?.width, 38),
    buttonHeight: pixels(buttonStyle?.height, 38),
    gap: pixels(style.rowGap || style.gap, 2),
    verticalPadding: pixels(style.paddingTop, 14) + pixels(style.paddingBottom, 10),
    horizontalPadding: pixels(style.paddingLeft, 5) + pixels(style.paddingRight, 5),
    border: pixels(style.borderLeftWidth, 1) + pixels(style.borderRightWidth, 1)
  };
}

function sidebarMinHeight(width: number): number {
  const metrics = sidebarMetrics();
  if (!metrics.count) return 80;
  const contentWidth = Math.max(metrics.buttonWidth,
    width - metrics.horizontalPadding - metrics.border);
  const columns = Math.min(2, Math.max(1, Math.floor(
    (contentWidth + metrics.gap) / (metrics.buttonWidth + metrics.gap))));
  const rows = Math.ceil(metrics.count / columns);
  return Math.ceil(metrics.verticalPadding + rows * metrics.buttonHeight +
    Math.max(0, rows - 1) * metrics.gap);
}

export function defaultSidebarWidth(): number {
  return pixels(window.getComputedStyle(element("sidebar")).width, 90);
}

export function defaultSidebarHeight(width: number): number {
  return sidebarMinHeight(width);
}

export function resizeSidebar(width: number, height: number): void {
  const bar = element("sidebar");
  const metrics = sidebarMetrics();
  const minWidth = metrics.buttonWidth + metrics.horizontalPadding + metrics.border;
  const maxWidth = Math.min(window.innerWidth - 12,
    metrics.buttonWidth * 2 + metrics.gap + metrics.horizontalPadding + metrics.border);
  const requested = Math.max(minWidth, Math.min(maxWidth, width));
  const appliedWidth = requested > (minWidth + maxWidth) / 2 ? maxWidth : minWidth;
  const minHeight = sidebarMinHeight(appliedWidth);
  bar.style.width = `${appliedWidth}px`;
  bar.style.minHeight = `${minHeight}px`;
  bar.style.maxHeight = `${Math.max(minHeight,
    Math.min(window.innerHeight - 12, height))}px`;
}

function paletteChromeHeight(): number {
  const bar = element("palbar");
  const palette = element("pal");
  const style = window.getComputedStyle(bar);
  return [...bar.children].filter((child) => child !== palette &&
    window.getComputedStyle(child).position !== "absolute")
    .reduce((sum, child) => sum + child.getBoundingClientRect().height,
      pixels(style.borderTopWidth, 1) + pixels(style.borderBottomWidth, 1));
}

export function resizePalette(width: number, height: number): void {
  element("palbar").style.width = `${Math.max(130,
    Math.min(window.innerWidth - 12, width))}px`;
  element("pal").style.height = `${Math.max(38,
    Math.min(window.innerHeight * 0.6, height - paletteChromeHeight()))}px`;
}

export function resetPalette(): void {
  const bar = element("palbar");
  const palette = element("pal");
  const style = window.getComputedStyle(bar);
  const columns = pixels(style.getPropertyValue("--pal-default-cols"), 6);
  const cell = pixels(style.getPropertyValue("--pal-cell"), 34);
  const padding = pixels(style.getPropertyValue("--pal-pad"), 8);
  const border = pixels(style.borderLeftWidth, 1) + pixels(style.borderRightWidth, 1);
  bar.style.width = `${Math.min(window.innerWidth - 12,
    columns * cell + padding * 2 + border)}px`;
  palette.style.height = "";
}
