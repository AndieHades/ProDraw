// Сборка системы эффектов слоя: панель, окно настроек, контекст-меню и буфер.
// Регистрирует именованные действия — список слоёв (fx-строки) дёргает их через bus.
import * as actions from '../../core/actions.js';
import { mountPanel } from './panel.js';
import { mountSettings, openFxEdit } from './settings.js';
import { mountClipboard, openFxMenu, deleteFx, copyFx, copyEffectsOf, duplicateFx, pasteFx, hasFxClipboard } from './clipboard.js';
import { convertFxToLayer } from './convert.js';

export function mount() {
  mountPanel(); mountSettings(); mountClipboard();
  actions.register('fx.edit', openFxEdit);
  actions.register('fx.menu', openFxMenu);
  actions.register('fx.delete', deleteFx);
  actions.register('fx.copy', copyFx);
  actions.register('fx.copyAll', copyEffectsOf);
  actions.register('fx.convert', convertFxToLayer);
  actions.register('fx.duplicate', duplicateFx);
  actions.register('fx.paste', pasteFx);
  actions.register('fx.clipboardHasEffects', hasFxClipboard);
}
