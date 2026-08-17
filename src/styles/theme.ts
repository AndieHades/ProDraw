// Тема: ставит data-theme на <html> (токены в tokens.css переопределяются).
import * as bus from "../core/bus.ts";

const STORE = 'theme';

export type ThemeName = "dark" | "light";

export function applyTheme(): void {
  let theme: string | null = null;
  try { theme = localStorage.getItem(STORE); } catch { /* storage is optional */ }
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
}

export const getTheme = (): ThemeName =>
  document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

export function toggleTheme(): void {
  const next: ThemeName = getTheme() === "light" ? "dark" : "light";
  try { localStorage.setItem(STORE, next); } catch { /* storage is optional */ }
  applyTheme();
  bus.emit("theme", next);
  bus.emit("render");
}
