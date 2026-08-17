import type { PsdImportedEffect, PsdJsonValue } from "./psdEffects";

export type PsdBlendMode =
  "pass through" | "normal" | "dissolve" | "darken" | "multiply" |
  "color burn" | "linear burn" | "darker color" | "lighten" | "screen" |
  "color dodge" | "linear dodge" | "lighter color" | "overlay" |
  "soft light" | "hard light" | "vivid light" | "linear light" |
  "pin light" | "hard mix" | "difference" | "exclusion" | "subtract" |
  "divide" | "hue" | "saturation" | "color" | "luminosity" |
  "linear height" | "height" | "subtraction";

export interface PsdImportBitmap {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8ClampedArray;
}

export interface PsdImportMask {
  readonly source: "user" | "real";
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly defaultAlpha: number;
  readonly disabled: boolean;
  readonly relativeToLayer: boolean;
  readonly rasterizedVector: boolean;
  readonly density: number;
  readonly feather: number;
  readonly alpha: Uint8Array;
}

interface PsdNodeBase {
  readonly name: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: PsdBlendMode;
  readonly effects: readonly PsdImportedEffect[];
}

export interface PsdImportLayer extends PsdNodeBase {
  readonly kind: "layer";
  readonly bitmap?: PsdImportBitmap;
  readonly masks: readonly PsdImportMask[];
  readonly clipping: boolean;
  readonly locked: boolean;
  readonly alphaLocked: boolean;
  readonly adjustment?: Readonly<Record<string, PsdJsonValue>>;
}

export interface PsdImportGroup extends PsdNodeBase {
  readonly kind: "group";
  readonly opened: boolean;
  readonly children: readonly PsdImportNode[];
}

export type PsdImportNode = PsdImportLayer | PsdImportGroup;

export interface PsdImportedDocument {
  readonly width: number;
  readonly height: number;
  readonly dpi: number;
  readonly stackOrder: "top-first";
  readonly children: readonly PsdImportNode[];
  readonly composite?: PsdImportBitmap;
  readonly warnings: readonly string[];
}
