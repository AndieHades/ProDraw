export function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required UI element is missing: ${selector}`);
  return element;
}

export function setSelected(element: HTMLElement, selected: boolean): void {
  element.classList.toggle("selected", selected);
  element.setAttribute("aria-pressed", String(selected));
}
