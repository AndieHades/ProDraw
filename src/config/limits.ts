// Жёсткие пределы приложения. Менять — здесь.
export const MAX_LAYERS = Infinity; // слои не ограничиваем искусственным потолком
export const MAX_SIZE = 4096;    // A4/4K и пользовательские raster-холсты
export const BP_SMAX = 500;      // профессиональный raster-диапазон кисти/ластика, px
export const BP_SIZE_CURVE = 1.7; // нелинейная шкала: больше точности на малых кистях
export const ZOOM_MIN = 0.05;    // 5%: большие raster-холсты всегда можно увидеть целиком
export const ZOOM_MAX = 48;      // максимальный зум холста
export const VIEW_FIT_MARGIN_MIN = 32;
export const VIEW_FIT_MARGIN_RATIO = 0.06;
export const GALLERY_PREVIEW_MAX_SIDE = 512; // PNG-превью не повторяет размер A4
// Bulk edits switch from a sparse Map to one reversible grid reference before
// millions of per-cell history records can freeze an A4 document.
export const PIXEL_BATCH_SPARSE_LIMIT = 65536;
export const ROT_MIN_SCALE = 0.15; // минимальный масштаб при свободной трансформации
export const IMPORT_MAX_SIDE = 2048; // конвертер: даунскейлим исходник только выше этого (иначе теряется сетка пиксель-арта)

// глубина истории отмен по площади холста (компромисс память/удобство)
export const historyCap = (area: number): number =>
  area > 90_000 ? 8 : area > 20_000 ? 15 : 30;
