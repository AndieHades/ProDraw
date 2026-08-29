export interface SymmetryOptions {
  readonly x?: boolean;
  readonly y?: boolean;
  readonly d1?: boolean;
  readonly d2?: boolean;
  readonly axisX?: number;
  readonly axisY?: number;
  readonly diagP?: number;
  readonly diagN?: number;
}

export interface SymmetryConfig {
  readonly x: boolean;
  readonly y: boolean;
  readonly d1: boolean;
  readonly d2: boolean;
  readonly axisX: number;
  readonly axisY: number;
  readonly diagP: number;
  readonly diagN: number;
}
