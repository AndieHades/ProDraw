import { getLocale } from "./index.ts";
import { ru } from "./raster/ru.ts";
import { en } from "./raster/en.ts";

const messages = {
  ru: { "brush.settings": "Настройки кисти", "brush.done": "Готово",
    "brush.restore": "Вернуть исходные настройки", "brush.noGrain": "В этой кисти нет карты зерна",
    "brush.liveHint": "Настройки применяются к следующему штриху и сохраняются автоматически." },
  en: { "brush.settings": "Brush settings", "brush.done": "Done",
    "brush.restore": "Restore original settings", "brush.noGrain": "This brush has no grain map",
    "brush.liveHint": "Settings apply to the next stroke and are saved automatically." }
};

export function liveBrushText(key: string): string {
  const locale = getLocale();
  const dictionary: Readonly<Record<string, string>> = { ...(locale === "ru" ? ru : en),
    ...messages[locale] };
  return dictionary[key] ?? key;
}
