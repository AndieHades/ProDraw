// Общие метрики квантизации: тип цвета, ключи дедупликации и цветностное
// расстояние. Отдельный модуль, потому что ими пользуются и median-cut, и
// выборка палитры из готовых сэмплов.
export type Color = number[];
export type ReadColor = readonly number[];
export interface ColorEntry { c: Color; n: number }

export const CUBE_SHIFT = 4;  // дедупликация входа по кубам 16×16×16

export const ch = (c: ReadColor, i: number): number => c[i] ?? 0;

// цветностное расстояние²: разница тона (R−G, G−B) дороже разницы яркости —
// анти-алиасные переходы того же тона близко, уникальный тон далеко
export const chromaD2 = (a: ReadColor, b: ReadColor): number => {
  const rg = (ch(a, 0) - ch(a, 1)) - (ch(b, 0) - ch(b, 1));
  const gb = (ch(a, 1) - ch(a, 2)) - (ch(b, 1) - ch(b, 2));
  const l = (ch(a, 0) + ch(a, 1) + ch(a, 2) - ch(b, 0) - ch(b, 1) - ch(b, 2)) / 3;
  return 4 * (rg * rg + gb * gb) + l * l;
};

export const keyOf = (c: ReadColor): string =>
  ch(c, 0) + "," + ch(c, 1) + "," + ch(c, 2);
export const cubeKey = (c: ReadColor): string => (ch(c, 0) >> CUBE_SHIFT) + "," +
  (ch(c, 1) >> CUBE_SHIFT) + "," + (ch(c, 2) >> CUBE_SHIFT);

export const bnd = (b: readonly ReadColor[]): [Color, Color] => {
  const mn: Color = [255, 255, 255], mx: Color = [0, 0, 0];
  for (const c of b) for (let k = 0; k < 3; k++) {
    mn[k] = Math.min(mn[k] as number, ch(c, k));
    mx[k] = Math.max(mx[k] as number, ch(c, k));
  }
  return [mn, mx];
};
