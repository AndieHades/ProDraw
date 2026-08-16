import { t } from './dom.js';

const X_ICON = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// Единый каркас окна «сохранить/загрузить библиотеку»: палитры, тайлсеты и т.п.
export function createLibraryDialog(opts) {
  const {
    overlayId, sheetId, titleKey, nameId, saveId, saveRowId, listId,
    placeholderKey, nameMax = 24, currentKey = 'label.current',
    saveKey = 'btn.save', closeKey = 'btn.close',
  } = opts;
  let ovl = document.getElementById(overlayId);
  if (!ovl) {
    ovl = document.createElement('div');
    ovl.className = 'ovl';
    ovl.id = overlayId;
    document.body.appendChild(ovl);
  }
  ovl.innerHTML = '';

  const sheet = document.createElement('div');
  sheet.className = 'sheet library-sheet';
  if (sheetId) sheet.id = sheetId;

  const head = document.createElement('div');
  head.className = 'pop-head';
  const title = document.createElement('span');
  title.className = 'pop-title';
  title.dataset.i18n = titleKey;
  const acts = document.createElement('span');
  acts.className = 'pop-acts';
  const close = document.createElement('button');
  close.className = 'win-x';
  close.dataset.i18nTitle = closeKey;
  close.innerHTML = X_ICON;
  acts.append(close);
  head.append(title, acts);

  const row = document.createElement('div');
  row.className = 'irow library-save-row';
  if (saveRowId) row.id = saveRowId;
  const label = document.createElement('label');
  label.dataset.i18n = currentKey;
  const input = document.createElement('input');
  input.id = nameId;
  input.type = 'text';
  input.maxLength = nameMax;
  input.dataset.i18nPh = placeholderKey;
  const save = document.createElement('button');
  save.id = saveId;
  save.className = 'txtbtn';
  save.dataset.i18n = saveKey;
  row.append(label, input, save);

  const list = document.createElement('div');
  list.id = listId;
  list.className = 'library-list';
  sheet.append(head, row, list);
  ovl.appendChild(sheet);

  const refresh = () => {
    title.textContent = t(titleKey);
    label.textContent = t(currentKey);
    input.placeholder = t(placeholderKey);
    save.textContent = t(saveKey);
    close.title = t(closeKey);
  };
  const api = {
    overlay: ovl, sheet, head, name: input, save, list, saveRow: row,
    refresh,
    open() { refresh(); ovl.dataset.openedAt = Date.now(); ovl.classList.add('on'); },
    close() { ovl.classList.remove('on'); },
    setSaveVisible(on) { row.style.display = on ? '' : 'none'; },
  };
  close.onclick = () => api.close();
  refresh();
  return api;
}
