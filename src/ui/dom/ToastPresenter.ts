import { TOAST_MS } from "../../config/timings.ts";

let timeout: number | null = null;

export function toast(message: string): void {
  const element = document.getElementById("toast");
  if (!element) return;
  element.textContent = message;
  element.classList.add("show");
  if (timeout !== null) window.clearTimeout(timeout);
  timeout = window.setTimeout(() => element.classList.remove("show"), TOAST_MS);
}
