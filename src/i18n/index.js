// Локализация: t(ключ, vars?) берёт строку текущей локали; смена языка
// применяет переводы к DOM ([data-i18n*]) и шлёт событие 'locale'.
// Добавить язык = один файл в locales/ + строка в LOCALES.
import * as bus from '../core/bus.js';
import { ru } from './locales/ru.js';
import { en } from './locales/en.js';

const LOCALES = { ru, en };
const STORE = 'locale';
let current = 'ru';

export function t(key, vars) { const dict = LOCALES[current] || ru;
  let s = key in dict ? dict[key] : (key in ru ? ru[key] : key);
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s; }

export const getLocale = () => current;
export const locales = () => Object.keys(LOCALES);
export const localeValues = (key) => [...new Set(Object.values(LOCALES).map((dict) => dict[key]).filter(Boolean))];

export function applyDom() {
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
  for (const el of document.querySelectorAll('[data-i18n-alt]')) el.alt = t(el.dataset.i18nAlt);
}

export function setLocale(code) { if (!LOCALES[code]) return; current = code;
  try { localStorage.setItem(STORE, code); } catch (e) {}
  applyDom(); bus.emit('locale', code); }

export function detect() { let code;
  try { code = localStorage.getItem(STORE); } catch (e) {}
  if (!code) { const nav = ((typeof navigator !== 'undefined' && navigator.language) || 'ru').slice(0, 2); code = LOCALES[nav] ? nav : 'ru'; }
  current = LOCALES[code] ? code : 'ru'; }
