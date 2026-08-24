// Контекстный PSD-экспорт использует те же параметры scope/mode/format,
// что и диалог Export. Один контракт гарантирует одинаковый layered-файл.
export const SELECTED_PSD_EXPORT_OPTIONS = Object.freeze({
  scope: 'selected', mode: 'layered', format: 'psd',
  canvasBounds: 'current', includeHidden: false
});

export const exportSelectedPsd = (runExport) =>
  runExport(SELECTED_PSD_EXPORT_OPTIONS);
