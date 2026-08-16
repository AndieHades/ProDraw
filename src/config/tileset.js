// Настраиваемые данные системы тайлов: пресеты размера тайла, размеры карты,
// дефолтные веса и флаги трансформации. Не магические числа в системах.

// пресеты размера тайла (квадратные); custom задаётся в диалоге создания
export const TILE_SIZE_PRESETS = [8, 16, 32];
export const TILE_SIZE_DEFAULT = 16;

// Tileset Grid: размер квадратов, с которыми работает тайлсет (всегда квадрат).
// Отдельно от обычной сетки (Grid). Только эти значения, при любом размере холста.
export const TILE_GRID_SIZES = [16, 32, 48, 96, 128];
export const TILE_GRID_DEFAULT = 16;
export const TILEMAP_PRESET_SIZES = [32, 48, 96];

// размеры новой tilemap-карты в клетках
export const MAP_CELLS_DEFAULT = { w: 16, h: 16 };
export const MAP_CELLS_MAX = 512;

// вес тайла по умолчанию для Random Variant Brush
export const TILE_WEIGHT_DEFAULT = 10;

// стартовые transform-флаги Tile Brush (применяются к новым экземплярам)
export const TILE_FLAGS_DEFAULT = { flipX: false, flipY: false, diagonalFlip: false, rotation: 0 };

// допустимые углы поворота экземпляра
export const TILE_ROTATIONS = [0, 90, 180, 270];
