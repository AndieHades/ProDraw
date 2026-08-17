import type { LocaleDictionary } from "./types.ts";
import { ruShell } from "./ru-shell.ts";
import { ruDocument } from "./ru-document.ts";
import { ruMenus } from "./ru-menus.ts";
import { ruFeedback } from "./ru-feedback.ts";
import { ruPreferences } from "./ru-preferences.ts";

export const ru: LocaleDictionary = {
  ...ruShell,
  ...ruDocument,
  ...ruMenus,
  ...ruFeedback,
  ...ruPreferences,
};
