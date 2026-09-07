// Подсказки к кнопкам оболочки. Нативный тултип Chromium не показывается,
// когда последним вводом было перо или палец, а планшет — основной инструмент
// в этом редакторе. Поэтому подсказка рисуется своим элементом из того же
// атрибута `title`, который заполняет i18n.
const DELAY = 420;
const GAP = 8;

let element: HTMLDivElement | null = null;
let holder: HTMLElement | null = null;
let timer = 0;

function surface(): HTMLDivElement {
  if (element?.isConnected) return element;
  const node = document.createElement("div");
  node.id = "tip"; node.setAttribute("role", "tooltip");
  document.body.append(node); element = node; return node;
}

function place(target: HTMLElement, node: HTMLDivElement): void {
  const box = target.getBoundingClientRect();
  const size = node.getBoundingClientRect();
  const centred = box.left + (box.width - size.width) / 2;
  const left = Math.min(Math.max(GAP, centred), window.innerWidth - size.width - GAP);
  const below = box.bottom + GAP;
  const top = below + size.height <= window.innerHeight - GAP
    ? below : Math.max(GAP, box.top - size.height - GAP);
  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(top)}px`;
}

// Пока подсказка видна, `title` снят с элемента: иначе там, где нативный
// тултип всё же работает, пользователь увидел бы две подсказки сразу.
export function hideTooltip(): void {
  if (timer) { window.clearTimeout(timer); timer = 0; }
  const target = holder; holder = null;
  if (target) {
    const text = target.dataset["tip"];
    if (text !== undefined) { target.title = text; delete target.dataset["tip"]; }
  }
  element?.classList.remove("on");
}

function show(target: HTMLElement, text: string): void {
  timer = 0;
  if (!target.isConnected) { hideTooltip(); return; }
  const node = surface();
  node.textContent = text; node.style.left = "0px"; node.style.top = "0px";
  node.classList.add("on"); place(target, node);
}

function over(event: PointerEvent): void {
  if (event.pointerType === "touch") return;
  const node = event.target instanceof Element ? event.target : null;
  if (holder && node && holder.contains(node)) return;
  const target = node?.closest<HTMLElement>("[title]");
  if (target === holder) return;
  hideTooltip();
  const text = target?.title.trim();
  if (!target || !text) return;
  holder = target; target.dataset["tip"] = text; target.removeAttribute("title");
  timer = window.setTimeout(() => show(target, text), DELAY);
}

function out(event: PointerEvent): void {
  const next = event.relatedTarget;
  if (holder && next instanceof Node && holder.contains(next)) return;
  hideTooltip();
}

export function mount(): void {
  document.addEventListener("pointerover", over, true);
  document.addEventListener("pointerout", out, true);
  document.addEventListener("pointerdown", hideTooltip, true);
  document.addEventListener("keydown", hideTooltip, true);
  document.addEventListener("scroll", hideTooltip, true);
  document.addEventListener("wheel", hideTooltip, { capture: true, passive: true });
  window.addEventListener("blur", hideTooltip);
}
