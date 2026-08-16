// Tint & Shade Generator: шаги шкал и углы цветовых гармоний (настраиваемое — данные).
// Каждая шкала = база + 4 шага: ровно 5 цветов (требование PixelHeart, не 10/20).
export const TINT_SHADE_STEPS = [0.2, 0.4, 0.6, 0.8];

// Сдвиги тона (°) для дополнительных базовых цветов гармонии.
export const HARMONY_OFFSETS = {
  complementary: [180],
  splitComplementary: [150, 210],
  analogous: [-30, 30],
  triadic: [120, 240],
};
