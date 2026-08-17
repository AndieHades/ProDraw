import { t } from "../../i18n/index.ts";

export interface LibraryDialogOptions {
  readonly closeKey?: string;
  readonly currentKey?: string;
  readonly listId: string;
  readonly nameId: string;
  readonly nameMax?: number;
  readonly overlayId: string;
  readonly placeholderKey: string;
  readonly saveId: string;
  readonly saveKey?: string;
  readonly saveRowId?: string;
  readonly sheetId?: string;
  readonly titleKey: string;
}

export interface LibraryDialogPresenter {
  readonly head: HTMLDivElement;
  readonly list: HTMLDivElement;
  readonly name: HTMLInputElement;
  readonly overlay: HTMLDivElement;
  readonly save: HTMLButtonElement;
  readonly saveRow: HTMLDivElement;
  readonly sheet: HTMLDivElement;
  close(): void;
  open(): void;
  refresh(): void;
  setSaveVisible(visible: boolean): void;
}

const X_ICON = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const div = (className: string): HTMLDivElement => {
  const element = document.createElement("div"); element.className = className; return element;
};

export function createLibraryDialog(options: LibraryDialogOptions): LibraryDialogPresenter {
  const currentKey = options.currentKey ?? "label.current";
  const saveKey = options.saveKey ?? "btn.save";
  const closeKey = options.closeKey ?? "btn.close";
  let overlay = document.getElementById(options.overlayId) as HTMLDivElement | null;
  if (!overlay) {
    overlay = div("ovl"); overlay.id = options.overlayId; document.body.appendChild(overlay);
  }
  overlay.innerHTML = "";
  const sheet = div("sheet library-sheet");
  if (options.sheetId) sheet.id = options.sheetId;
  const head = div("pop-head");
  const title = document.createElement("span"); title.className = "pop-title";
  title.dataset.i18n = options.titleKey;
  const actions = document.createElement("span"); actions.className = "pop-acts";
  const close = document.createElement("button"); close.className = "win-x";
  close.dataset.i18nTitle = closeKey; close.innerHTML = X_ICON;
  actions.append(close); head.append(title, actions);
  const row = div("irow library-save-row");
  if (options.saveRowId) row.id = options.saveRowId;
  const label = document.createElement("label"); label.dataset.i18n = currentKey;
  const input = document.createElement("input"); input.id = options.nameId;
  input.type = "text"; input.maxLength = options.nameMax ?? 24;
  input.dataset.i18nPh = options.placeholderKey;
  const save = document.createElement("button"); save.id = options.saveId;
  save.className = "txtbtn"; save.dataset.i18n = saveKey;
  row.append(label, input, save);
  const list = div("library-list"); list.id = options.listId;
  sheet.append(head, row, list); overlay.appendChild(sheet);
  const presenter: LibraryDialogPresenter = {
    overlay, sheet, head, name: input, save, list, saveRow: row,
    refresh() {
      title.textContent = t(options.titleKey); label.textContent = t(currentKey);
      input.placeholder = t(options.placeholderKey); save.textContent = t(saveKey);
      close.title = t(closeKey);
    },
    open() { presenter.refresh(); overlay.dataset.openedAt = String(Date.now());
      overlay.classList.add("on"); },
    close() { overlay.classList.remove("on"); },
    setSaveVisible(visible) { row.style.display = visible ? "" : "none"; }
  };
  close.onclick = presenter.close;
  presenter.refresh();
  return presenter;
}
