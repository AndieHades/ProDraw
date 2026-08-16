// Дефолты инструментов, эффектов и импорта. Стартовые значения настроек —
// здесь, чтобы подправить поведение без копания в системах.
export const BRUSH_DEFAULTS = () => ({ pencil: { size: 1, op: 1 }, eraser: { size: 1, op: 1 } });
export const FLAGS_DEFAULT = { pixelPerfect: false, stabilize: true };

export const ADJUST_DEFAULT = { mode: 'dodge', amount: 8 };

// Неразрушающие эффекты слоя/папки (Photoshop-style). Порядок — порядок в меню.
export const EFFECT_TYPES = ['stroke', 'glow', 'dropShadow', 'innerShadow'];
export const EFFECT_DEFAULTS = {
  stroke: { size: 1, color: '#ff7a18' },
  glow: { size: 6, intensity: 0.8, color: '#78d7ff' },
  dropShadow: { size: 1, intensity: 0.6, color: '#000000', dx: 2, dy: 2 },
  innerShadow: { size: 2, intensity: 0.6, color: '#000000', dx: 2, dy: 2 },
  adjustment: { brightness: 0, contrast: 0, saturation: 0, hue: 0 },
};
export const EFFECT_LIMITS = { size: { min: 1, max: 16 }, intensity: { min: 5, max: 100 }, offset: { min: -12, max: 12 } };
// какие поля настроек показывает окно Edit для каждого типа эффекта
export const EFFECT_FIELDS = {
  stroke: ['size', 'color'],
  glow: ['size', 'intensity', 'color'],
  dropShadow: ['size', 'intensity', 'color', 'offset'],
  innerShadow: ['size', 'intensity', 'color', 'offset'],
  adjustment: ['brightness', 'contrast', 'saturation', 'hue'],
};
export const IMPORT_DEFAULT = { colors: 24, cell: 0, bgTol: 30 };
