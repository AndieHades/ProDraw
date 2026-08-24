// Явное сохранение рабочего документа в галерее. Экспорт PNG/PSD намеренно
// остаётся отдельной командой: Save не меняет формат и не открывает диалог.
import * as actions from '../core/actions.ts';
import { S } from '../core/state.js';
import { $, toast, t } from '../ui/dom/ShellDom.ts';
import { saveCurrent } from './gallery/doc.js';
import { saveActivePsd } from './psd-save.js';

export function createDocumentSaver(save, notify) {
  let pending = false;
  return async () => {
    if (pending) return false;
    pending = true;
    try {
      const saved = await save();
      notify(saved); return saved;
    } finally { pending = false; }
  };
}

const saveDocument = createDocumentSaver(async () => {
  const saved = await saveActivePsd();
  if (saved) void saveCurrent();
  return saved;
}, (saved) => toast(t(saved ? 'toast.psdSaved' : 'toast.psdSaveUnavailable', {
  name: (S.sourceLocation || 'PSD').split(/[\\/]/).pop()
})));

export function mount() {
  const button = $('save-btn'); if (!button) return;
  button.onclick = () => { void saveDocument(); };
}

actions.register('file.save', saveDocument);
