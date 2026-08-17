export type SizeLimit = number | (() => number);

export interface FloatingWindowOptions {
  readonly alwaysOnTop?: boolean;
  readonly avoidOverlap?: boolean;
  readonly clampBottom?: number;
  readonly clampRight?: number;
  readonly grip?: HTMLElement;
  readonly handle?: HTMLElement;
  readonly minH?: SizeLimit;
  readonly minW?: SizeLimit;
  readonly onClose?: () => void;
  readonly onHeaderDblClick?: (event: MouseEvent) => void;
  readonly onResize?: (width: number, height: number) => void;
  readonly resizeEdges?: boolean;
  readonly storeKey?: string | undefined;
}

export interface WindowGeometry {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface WindowMotionPorts {
  readonly bringToFront: () => void;
  readonly place: (left: number, top: number) => void;
  readonly save: () => void;
}
