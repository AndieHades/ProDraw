// Система Export: кнопка рядом с Import → перетаскиваемое окно. Регистрирует
// именованные действия (универсальный пайплайн); старые команды-совместимости
// (быстрый PNG/PSD всего проекта, PNG слоя) тоже идут через него — без дублей.
import * as actions from '../../core/actions.js';
import { $ } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { runExport, exportSingleLayer } from './pipeline.js';
import { mountExportUI, openExport } from './ui.js';

export function mount() {
  mountExportUI();
  floatingWindow($('export-win'), { grip: $('export-grip'), storeKey: 'exportwin' });
  $('export-btn').onclick = openExport;
}

// универсальный экспорт по параметрам (для хоткеев/кнопок)
actions.register('file.export', openExport);
// совместимость со старыми точками вызова (тулбар, хоткеи, меню слоя)
actions.register('file.exportPng', () => runExport({ scope: 'project', mode: 'flattened', format: 'png', canvasBounds: 'current', includeHidden: false }));
actions.register('file.exportPsd', () => runExport({ scope: 'project', mode: 'layered', format: 'psd', canvasBounds: 'current', includeHidden: false }));
actions.register('export.layer', (L, tight) => exportSingleLayer(L, tight));
