export { copyText } from "./ClipboardPresenter.ts";
export { showMenuForAnchor } from "./AnchoredMenuPresenter.ts";
export { closeMenus, showMenuAt, showMenuBeside } from "./MenuPresenter.ts";
export { toast } from "./ToastPresenter.ts";
export { t } from "../../i18n/index.ts";

export const $ = (id: string): HTMLElement | null => document.getElementById(id);
