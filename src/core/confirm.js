// Подтверждение действия: модальное окно с сообщением и Да/Отмена. Возвращает
// Promise<boolean>. Единый помощник для деструктивных операций (удаление тайла).
import { t } from '../i18n/index.js';

let ovl = null, msgEl = null, resolver = null;

function build() {
  if (ovl) return;
  ovl = document.createElement('div'); ovl.className = 'ovl'; ovl.id = 'confirm-ovl';
  const sheet = document.createElement('div'); sheet.className = 'sheet';
  msgEl = document.createElement('p'); msgEl.className = 'confirm-msg';
  const act = document.createElement('div'); act.className = 'iact';
  const no = document.createElement('button'); no.className = 'txtbtn'; no.textContent = t('btn.cancel');
  const yes = document.createElement('button'); yes.className = 'txtbtn primary'; yes.textContent = t('btn.ok') || 'OK';
  no.onclick = () => done(false); yes.onclick = () => done(true);
  act.append(no, yes); sheet.append(msgEl, act); ovl.appendChild(sheet); document.body.appendChild(ovl);
}

function done(v) { ovl.classList.remove('on'); const r = resolver; resolver = null; if (r) r(v); }

export function confirmDialog(message) {
  build(); msgEl.textContent = message;
  ovl.dataset.openedAt = Date.now(); ovl.classList.add('on');
  return new Promise((res) => { resolver = res; });
}
