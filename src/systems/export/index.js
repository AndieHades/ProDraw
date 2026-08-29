// Система Export: кнопка рядом с Import → перетаскиваемое окно. Регистрирует
// именованные действия (универсальный пайплайн); старые команды-совместимости
// (быстрый PNG/PSD всего проекта, PNG слоя) тоже идут через него — без дублей.
import * as actions from '../../core/actions.ts';
import { $, toast, t } from '../../ui/dom/ShellDom.ts';
import { floatingWindow } from '../../ui/windows/FloatingWindow.ts';
import { runExport, exportTargetPng } from './pipeline.js';
import { exportSelectedPsd } from './selected-psd.ts';
import { mountExportUI, openExport } from './ui.js';

export function mount() {
  mountExportUI();
  floatingWindow($('export-win'), { grip: $('export-grip'), storeKey: 'exportwin' });
  $('export-btn').onclick = openExport;
}

// универсальный экспорт по параметрам (для хоткеев/кнопок)
actions.register('file.export', openExport);
// совместимость со старыми точками вызова (тулбар, хоткеи, меню слоя)
const safeExport = (opts) => runExport(opts).catch(() => toast(t('toast.exportFailed')));
actions.register('file.exportPng', () => safeExport({ scope: 'project', mode: 'flattened', format: 'png', canvasBounds: 'current', includeHidden: false }));
actions.register('file.exportPsd', () => safeExport({ scope: 'project', mode: 'layered', format: 'psd', canvasBounds: 'current', includeHidden: false }));
actions.register('export.selectedPsd', () => safeExport(exportSelectedPsd(runExport)));
actions.register('export.targetPng', (target, tight) => exportTargetPng(target, tight));
actions.register('export.layer', (layer, tight) => exportTargetPng(layer, tight));
