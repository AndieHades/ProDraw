// Жёсткие пределы приложения. Менять — здесь.
import { RASTER_LIMITS } from "./raster.ts";
export const MAX_LAYERS = Infinity; // слои не ограничиваем искусственным потолком

// Сторона холста ограничена только тем же потолком, что и растровый runtime.
export const MAX_SIZE = RASTER_LIMITS.maximumSide;
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
