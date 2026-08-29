export type TilePoint = readonly [number, number];
export interface TileBlock { readonly x: number; readonly y: number;
  readonly width: number; readonly height: number }

export const wrapCoordinate = (value: number, size: number): number =>
  size > 0 ? ((value % size) + size) % size : value;
export const wrapTilePoint = (x: number, y: number, width: number,
  height: number): TilePoint => [wrapCoordinate(x, width), wrapCoordinate(y, height)];
export function isInsideTileWorkArea(x: number, y: number, width: number,
  height: number, tiled: boolean): boolean {
  return tiled ? x >= -width && y >= -height && x < 2 * width && y < 2 * height :
    x >= 0 && y >= 0 && x < width && y < height;
}
export const tileRepeatOffsets = (tiled: boolean): readonly number[] =>
  tiled ? [-1, 0, 1] : [0];
export function tileRenderBlock(originX: number, originY: number, tileWidth: number,
  tileHeight: number, tiled: boolean): TileBlock {
  return tiled ? { x: originX - tileWidth, y: originY - tileHeight,
    width: tileWidth * 3, height: tileHeight * 3 } :
    { x: originX, y: originY, width: tileWidth, height: tileHeight };
}
