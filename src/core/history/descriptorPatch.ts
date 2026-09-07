type DescriptorKind = "layer" | "folder" | "background";
type Mutable = Record<string, unknown>;

const PROPERTIES: Readonly<Record<DescriptorKind, ReadonlySet<string>>> = {
  layer: new Set(["name", "opacity", "visible", "lock", "alphaLock",
    "clip", "reference", "symLock"]),
  folder: new Set(["name", "opacity", "visible", "symLock"]),
  background: new Set(["color", "visible"]),
};

export interface DescriptorRequest {
  readonly kind: DescriptorKind;
  readonly index?: number;
  readonly id?: number;
  readonly properties: readonly string[];
}
interface DescriptorField {
  readonly property: string; readonly present: boolean; readonly value: unknown;
}
interface DescriptorTarget {
  readonly kind: DescriptorKind; readonly index?: number; readonly id?: number;
  readonly fields: DescriptorField[];
}
export interface DescriptorEntry {
  readonly kind: "descriptor-patch";
  readonly targets: DescriptorTarget[];
}
interface DescriptorState {
  readonly layers: readonly Mutable[];
  readonly folders: readonly Mutable[];
  readonly bg: Mutable | null;
}

function cloneValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .map(([key, item]) => [key, cloneValue(item)]));
}

const resolveTarget = (descriptor: { kind: DescriptorKind; index?: number;
  id?: number }, state: DescriptorState): Mutable | null | undefined => {
  if (descriptor.kind === "layer") return state.layers[descriptor.index ?? -1];
  if (descriptor.kind === "folder")
    return state.folders.find((folder) => folder["id"] === descriptor.id);
  return descriptor.kind === "background" ? state.bg : null;
};
const targetKey = (descriptor: { kind: DescriptorKind; index?: number;
  id?: number }): string => descriptor.kind === "layer"
  ? `layer:${descriptor.index}`
  : descriptor.kind === "folder" ? `folder:${descriptor.id}` : "background";
const targetAddress = (descriptor: { kind: DescriptorKind; index?: number;
  id?: number }) => ({ kind: descriptor.kind,
  ...(descriptor.kind === "layer" ? { index: descriptor.index } : {}),
  ...(descriptor.kind === "folder" ? { id: descriptor.id } : {}) });

function validDescriptor(descriptor: DescriptorRequest | null | undefined):
  descriptor is DescriptorRequest {
  if (!descriptor || !PROPERTIES[descriptor.kind]) return false;
  if (descriptor.kind === "layer" && !Number.isInteger(descriptor.index)) return false;
  if (descriptor.kind === "folder" && !Number.isInteger(descriptor.id)) return false;
  return Array.isArray(descriptor.properties) && descriptor.properties.length > 0 &&
    descriptor.properties.every((property) => PROPERTIES[descriptor.kind].has(property));
}

const captureField = (target: Mutable, property: string): DescriptorField => ({
  property, present: Object.prototype.hasOwnProperty.call(target, property),
  value: cloneValue(target[property]) });

export function createDescriptorEntry(
  descriptors: DescriptorRequest | readonly DescriptorRequest[],
  state: DescriptorState
): DescriptorEntry | null {
  const list = Array.isArray(descriptors) ? descriptors : [descriptors];
  if (!list.length || list.some((descriptor) => !validDescriptor(descriptor))) return null;
  const merged = new Map<string, DescriptorTarget>();
  for (const descriptor of list) {
    const target = resolveTarget(descriptor, state); if (!target) return null;
    const key = targetKey(descriptor);
    if (!merged.has(key)) merged.set(key, { ...targetAddress(descriptor), fields: [] });
    const entry = merged.get(key) as DescriptorTarget;
    const known = new Set(entry.fields.map((field) => field.property));
    for (const property of descriptor.properties) if (!known.has(property)) {
      entry.fields.push(captureField(target, property)); known.add(property);
    }
  }
  return { kind: "descriptor-patch", targets: [...merged.values()] };
}

export const isDescriptorEntry = (entry: unknown): entry is DescriptorEntry =>
  (entry as DescriptorEntry | null)?.kind === "descriptor-patch";

export function swapDescriptorEntry(entry: DescriptorEntry,
  state: DescriptorState): DescriptorEntry | null {
  const resolved = entry.targets.map((target) => resolveTarget(target, state));
  if (resolved.some((target) => !target)) return null;
  const inverse: DescriptorEntry = { kind: "descriptor-patch", targets: [] };
  entry.targets.forEach((stored, index) => {
    const target = resolved[index] as Mutable;
    inverse.targets.push({ ...targetAddress(stored),
      fields: stored.fields.map((field) => captureField(target, field.property)) });
    for (const field of stored.fields) {
      if (field.present) target[field.property] = cloneValue(field.value);
      else delete target[field.property];
    }
  });
  return inverse;
}
