export interface TransformPoint { readonly x: number; readonly y: number }
export interface TransformBounds {
  readonly x0: number; readonly y0: number; readonly w: number; readonly h: number;
}
export interface TransformState {
  readonly b: TransformBounds;
  ang: number; sx: number; sy: number; tx: number; ty: number;
  changed?: boolean;
  readonly sym?: { readonly sx: boolean; readonly sy: boolean } | null;
}
export interface TransformSnapshot {
  readonly ang: number; readonly sx: number; readonly sy: number;
  readonly tx: number; readonly ty: number;
}
export interface TransformSourceBounds {
  readonly minx: number; readonly miny: number; readonly maxx: number; readonly maxy: number;
}
export type TransformCell = readonly number[];
export type TransformSource = readonly (readonly (TransformCell | null | undefined)[] |
  null | undefined)[];
export interface TransformResult extends TransformSourceBounds {
  readonly cells: readonly (readonly [number, number, TransformCell])[];
}
export interface TransformFrame {
  readonly p: readonly TransformPoint[];
  readonly sides?: readonly { readonly kind: "scale-x" | "scale-y";
    readonly sign: -1 | 1; readonly p: TransformPoint }[];
}
