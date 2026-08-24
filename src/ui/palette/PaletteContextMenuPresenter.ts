import { t } from "../../i18n/index.ts";
import { copyText } from "../dom/ClipboardPresenter.ts";
import { toast } from "../dom/ToastPresenter.ts";

type Rgb = readonly [number, number, number];
export interface PaletteContextSelection {
  readonly colors: readonly Rgb[];
  readonly indices: readonly number[];
}
export interface PaletteContextPort {
  readonly delete: (indices: readonly number[]) => void;
  readonly replace: (colors: readonly Rgb[]) => void;
  readonly select: (colors: readonly Rgb[]) => void;
  readonly selection: () => PaletteContextSelection;
}

const colorHex = (color: Rgb): string => `#${color.map((value) =>
  value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export function mountPaletteContextMenu(port: PaletteContextPort): void {
  const menu = document.getElementById("ctx");
  if (!menu) throw new Error("Missing palette context menu");
  menu.addEventListener("click", (event) => {
    const target = event.target;
    const button = target && "closest" in target && typeof target.closest === "function" ?
      target.closest("button") as HTMLButtonElement | null : null;
    if (!button) return;
    const { colors, indices } = port.selection();
    menu.classList.remove("on");
    if (!colors.length) return;
    const action = button.dataset.act;
    if (action === "copy") {
      const text = colors.map(colorHex).join("\n");
      void copyText(text).then(() => toast(t("toast.copied", { s: text })));
    } else if (action === "delete") port.delete(indices);
    else if (action === "select") port.select(colors);
    else if (action === "replace") port.replace(colors);
  });
}
