// Пресеты размеров нового документа. Данные — добавить размер = одна строка.
// Sprite — квадратные холсты, Game frame — 16:9 кадры, которые чисто
// масштабируются/кадрируются до 1920px по ширине.
export const DEFAULT_DOC = { w: 32, h: 32 };

export const SPRITE_PRESETS = [
  { w: 16, h: 16, label: '16 x 16' },
  { w: 32, h: 32, label: '32 x 32' },
  { w: 48, h: 48, label: '48 x 48' },
  { w: 96, h: 96, label: '96 x 96' },
  { w: 128, h: 128, label: '128 x 128' },
];

export const GAME_FRAME_PRESETS = [
  { w: 320, h: 180, label: '320 x 180' },
  { w: 384, h: 216, label: '384 x 216' },
  { w: 480, h: 270, label: '480 x 270' },
  { w: 640, h: 360, label: '640 x 360' },
  { w: 960, h: 540, label: '960 x 540' },
];

export const SIZE_PRESETS = [...SPRITE_PRESETS, ...GAME_FRAME_PRESETS];
