import type { SelectionPoint, SelectionRect } from "../contracts/selection.ts";
import { cellsSelectionMask, isSelectionMask, rectangleSelectionMask,
  type SelectionMask } from "./selection-mask.ts";

export const SEL_OPS = ["replace", "add", "subtract", "intersect"] as const;
export type SelectionOperation = typeof SEL_OPS[number];
export type SelectionCells = Iterable<string | SelectionPoint>;
export interface CompactSelectionState {
  readonly sel: SelectionRect;
  readonly mask: SelectionMask | null;
}

const pointFromKey = (key: string | SelectionPoint): SelectionPoint => {
  if (typeof key !== "string") return key;
  const value = key, separator = value.indexOf(",");
  return [Number(value.slice(0, separator)), Number(value.slice(separator + 1))];
};

export function selectionMaskFromState(selection: SelectionRect | null | undefined,
  mask: SelectionMask | SelectionCells | null | undefined, width: number,
  height: number): SelectionMask {
  if (mask) return cellsSelectionMask(mask, width, height);
  return selection ? rectangleSelectionMask(selection, width, height)
    : cellsSelectionMask(null, width, height);
}

export function selectionStateFromMask(mask: SelectionMask): CompactSelectionState | null {
  if (!mask.size) return null;
  if (mask.size === mask.width * mask.height) return {
    sel: { x0: 0, y0: 0, x1: mask.width - 1, y1: mask.height - 1 }, mask: null
  };
  const bounds = mask.bounds();
  return bounds ? { sel: bounds, mask: mask.isPlainRectangle() ? null : mask } : null;
}

export function combineSelectionState(selection: SelectionRect | null | undefined,
  mask: SelectionMask | SelectionCells | null | undefined,
  addition: SelectionMask | SelectionCells, operation: SelectionOperation,
  width: number, height: number): SelectionMask {
  if (operation === "replace" || !selection)
    return cellsSelectionMask(addition, width, height);
  const base = selectionMaskFromState(selection, mask, width, height);
  const incoming = isSelectionMask(addition) ? addition.points() : addition;
  if (operation === "intersect") {
    const output = cellsSelectionMask(null, width, height);
    for (const key of incoming) { const [x, y] = pointFromKey(key);
      if (base.hasXY(x, y)) output.forceSelected(x, y); }
    return output;
  }
  for (const key of incoming) { const [x, y] = pointFromKey(key);
    if (operation === "add") base.forceSelected(x, y);
    else if (operation === "subtract") base.forceUnselected(x, y); }
  return base;
}

type StringCells = ReadonlySet<string>;
export function combineMask(base: StringCells | SelectionMask | null | undefined,
  addition: StringCells | SelectionMask, operation: SelectionOperation):
StringCells | SelectionMask {
  const compact = isSelectionMask(base) ? base : isSelectionMask(addition) ? addition : null;
  if (!compact) {
    const source = base ?? new Set<string>();
    if (operation === "replace" || !base) return new Set(addition as StringCells);
    if (operation === "add") return new Set([...source, ...(addition as StringCells)]);
    if (operation === "subtract") return new Set([...source]
      .filter((key) => !(addition as StringCells).has(key)));
    if (operation === "intersect") return new Set([...(addition as StringCells)]
      .filter((key) => source.has(key)));
    return new Set(addition as StringCells);
  }
  const selected = base ? selectionStateFromMask(cellsSelectionMask(base,
    compact.width, compact.height)) : null;
  return combineSelectionState(selected?.sel, selected?.mask, addition, operation,
    compact.width, compact.height);
}
