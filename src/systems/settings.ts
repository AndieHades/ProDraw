// Настройки приложения: тема (тумблер), язык и жест Brush Size Modifier
// (Hot Key / чувствительность / направление). Шестерёнка в галерее.
import { S } from "../core/state.ts";
import * as bus from "../core/bus.ts";
import * as actions from "../core/actions.ts";
import type { ShellActionName } from "../contracts/shellActionCatalog.ts";
import { $ } from "../core/shell.ts";
import { openMenuAt } from "../core/menus.ts";
import { t, getLocale, locales, setLocale } from "../i18n/index.ts";
import { toggleTheme, getTheme } from "../styles/theme.ts";

interface EyedropperState { capturing?: boolean; key?: string }
const eyedropper = (): EyedropperState =>
  (S["eyedrop"] as EyedropperState | undefined) ?? {};

// строка «подпись → значение», клик запускает действие и перерисовывает меню
function valRow(menu: HTMLElement, labelKey: string, value: string,
  action: ShellActionName): void {
  const row = document.createElement("div"); row.className = "set-row";
  const label = document.createElement("span"); label.textContent = t(labelKey);
  const shown = document.createElement("span");
  shown.className = "set-val"; shown.textContent = value;
  row.append(label, shown);
  row.onclick = () => { void actions.run(action); build(); };
  menu.appendChild(row);
}

function build(): void {
  const menu = $("setmenu"); if (!menu) return;
  menu.innerHTML = "";
  const head = document.createElement("div");
  head.className = "cctx-head"; head.textContent = t("ui.settings");
  menu.appendChild(head);

  const themeRow = document.createElement("div"); themeRow.className = "set-row";
  const themeLabel = document.createElement("span");
  themeLabel.textContent = t("ui.lightTheme");
  const toggle = document.createElement("span"); toggle.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox"; input.checked = getTheme() === "light";
  toggle.append(input, document.createElement("span"));
  themeRow.append(themeLabel, toggle);
  themeRow.onclick = () => { toggleTheme(); input.checked = getTheme() === "light"; };
  menu.appendChild(themeRow);

  const langRow = document.createElement("div"); langRow.className = "set-row";
  const langLabel = document.createElement("span");
  langLabel.textContent = t("ui.language");
  const langValue = document.createElement("span");
  langValue.className = "set-val"; langValue.textContent = getLocale().toUpperCase();
  langRow.append(langLabel, langValue);
  langRow.onclick = () => {
    const available = locales();
    const next = available[(available.indexOf(getLocale()) + 1) % available.length];
    if (next) setLocale(next);
    $("setmenu")?.classList.remove("on");
  };
  menu.appendChild(langRow);

  const eye = eyedropper();
  valRow(menu, "eye.key", eye.capturing ? t("brsz.press") :
    (eye.key ?? "").toUpperCase(), "eyedropper.capture");
}

function openSettings(): void {
  build();
  const gear = $("gal-settings"); if (!gear) return;
  const rect = gear.getBoundingClientRect();
  openMenuAt({ menuId: "setmenu", x: rect.left + rect.width / 2, y: rect.bottom + 2 });
}

export function mount(): void {
  const gear = $("gal-settings"); if (gear) gear.onclick = openSettings;
  // захват клавиши/смена настроек — обновляем открытое меню
  bus.on("eyedropper", () => {
    if ($("setmenu")?.classList.contains("on")) build();
  });
}
