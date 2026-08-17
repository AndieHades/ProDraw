// Локализация: t(ключ, vars?) берёт строку текущей локали; смена языка
// применяет переводы к DOM ([data-i18n*]) и шлёт событие 'locale'.
// Добавить язык = один файл в locales/ + строка в LOCALES.
import * as bus from "../core/bus.ts";
import { en } from "./locales/en.ts";
import { ru } from "./locales/ru.ts";

const LOCALES = { ru, en };
export type LocaleCode = keyof typeof LOCALES;
export type TranslationVars = Readonly<Record<string, string | number>>;
const STORE = "locale";
let current: LocaleCode = "ru";

function isLocaleCode(value: string | null): value is LocaleCode {
  return value !== null && Object.hasOwn(LOCALES, value);
}

export function t(key: string, vars?: TranslationVars): string {
  const dict = LOCALES[current];
  let value = dict[key] ?? ru[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

export const getLocale = (): LocaleCode => current;
export const locales = (): readonly LocaleCode[] =>
  Object.keys(LOCALES) as LocaleCode[];
export const localeValues = (key: string): readonly string[] =>
  [...new Set(Object.values(LOCALES).map((dict) => dict[key]).filter(
    (value): value is string => value !== undefined))];

export function applyDom(): void {
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n ?? "");
  }
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle ?? "");
  }
  for (const element of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "[data-i18n-ph]")) {
    element.placeholder = t(element.dataset.i18nPh ?? "");
  }
  for (const element of document.querySelectorAll<HTMLImageElement>("[data-i18n-alt]")) {
    element.alt = t(element.dataset.i18nAlt ?? "");
  }
}

export function setLocale(code: string): void {
  if (!isLocaleCode(code)) return;
  current = code;
  try { localStorage.setItem(STORE, code); } catch { /* storage is optional */ }
  applyDom();
  bus.emit("locale", code);
}

export function detect(): void {
  let code: string | null = null;
  try { code = localStorage.getItem(STORE); } catch { /* storage is optional */ }
  if (!code) {
    const language = typeof navigator === "undefined" ? "ru" : navigator.language;
    code = language.slice(0, 2);
  }
  current = isLocaleCode(code) ? code : "ru";
}
