export interface SelectionRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type SelectionPoint = readonly [number, number];

export interface SelectionMaskQuery {
  readonly size?: number;
  has(key: string): boolean;
  hasXY?(x: number, y: number): boolean;
  points?(): Iterable<SelectionPoint>;
  intersectsRect?(rect: SelectionRect): boolean;
}
