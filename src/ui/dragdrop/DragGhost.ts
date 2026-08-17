export interface DragGhost {
  move(x: number, y: number): void;
  remove(): void;
}

const TRANSIENT_CLASSES = [
  "dragging", "source-gap", "lifting", "sel", "on", "marked",
  "swiping-right", "drop-into", "drop-before", "drop-above", "drop-below"
] as const;

export function dragGhost(element: HTMLElement, width?: number, stack?: number): DragGhost {
  const ghost = element.cloneNode(true) as HTMLElement;
  ghost.classList.add("drag-ghost");
  ghost.classList.remove(...TRANSIENT_CLASSES);
  ghost.querySelectorAll(".swipe-acts").forEach((node) => node.remove());
  const front = ghost.querySelector<HTMLElement>(".swipe-front");
  if (front) front.style.transform = "";
  const rect = element.getBoundingClientRect();
  const thumbnail = element.querySelector<HTMLElement>(".gal-thumb");
  if (thumbnail) {
    const thumbnailRect = thumbnail.getBoundingClientRect();
    ghost.style.setProperty("--gal-tile", `${Math.round(thumbnailRect.width || rect.width)}px`);
  }
  ghost.style.margin = "0";
  ghost.style.width = `${Math.round(width || rect.width)}px`;
  if (stack && stack > 1) ghost.dataset.stack = stack > 2 ? "3" : "2";
  document.body.appendChild(ghost);
  return {
    move(x, y) { ghost.style.left = `${x}px`; ghost.style.top = `${y}px`; },
    remove() { ghost.remove(); }
  };
}
