export type BrushStudioSectionId = "strokePath" | "stabilization" | "taper" |
  "shape" | "grain" | "rendering" | "dynamics" | "huion" | "properties" |
  "preview" | "about";

export interface BrushStudioSection {
  readonly id: BrushStudioSectionId;
  readonly labelKey: string;
}

export interface BrushControlDefinition {
  readonly path: string;
  readonly labelKey: string;
  readonly kind: "range" | "text" | "checkbox" | "select";
  readonly minimum?: number;
  readonly maximum?: number;
  readonly step?: number;
  readonly display?: "percent" | "number" | "degrees" | "pixels";
  readonly options?: readonly string[];
}
