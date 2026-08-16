// Панель действий над выделением (#selbar): копировать/вырезать/вставить/
// удалить/снять. Видна, пока есть активное выделение — снять можно при любом
// инструменте, не только при «Выделении».
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, showMenuAt } from '../../core/dom.js';

const closeMenu = () => $('sctx').classList.remove('on');

export function mount() {
  $('sel-copy').onclick = () => actions.run('edit.copy');
  $('sel-cut').onclick = () => actions.run('edit.cut');
  $('sel-paste').onclick = () => actions.run('edit.paste');
  $('sel-del').onclick = () => actions.run('edit.delete');
  $('sel-off').onclick = () => actions.run('select.none');
  $('sctx-off').onclick = () => { closeMenu(); actions.run('select.none'); };
  $('sctx-invert').onclick = () => { closeMenu(); actions.run('selection.invert'); };
  $('sctx-transform').onclick = () => { closeMenu(); actions.run('selection.transform'); };
  $('sctx-copy-layer').onclick = () => { closeMenu(); actions.run('selection.copyLayer'); };
  const sync = () => $('selbar').classList.toggle('on', !!S.sel && !S.selFloat);
  bus.on('selection-menu', (e) => { if (e && S.sel && !S.selFloat) showMenuAt($('sctx'), e.clientX, e.clientY, true); });
  bus.on('selection', sync); sync();
}
