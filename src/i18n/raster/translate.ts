import { en } from "./en";
import { ru } from "./ru";

export type MessageKey = keyof typeof ru;
type Locale = "en" | "ru";

function locale(): Locale {
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function t(key: MessageKey): string {
  return (locale() === "ru" ? ru : en)[key];
}

export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as MessageKey;
    element.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((element) => {
    const key = element.dataset.i18nTitle as MessageKey;
    const value = t(key);
    element.title = value;
    element.setAttribute("aria-label", value);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel as MessageKey;
    element.setAttribute("aria-label", t(key));
  });
}
