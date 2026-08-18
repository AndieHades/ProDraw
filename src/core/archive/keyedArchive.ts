import {
  parseBinaryPlist, type BinaryPlistUid, type BinaryPlistValue
} from "./binaryPlist";

const isRecord = (value: BinaryPlistValue | undefined):
value is { [key: string]: BinaryPlistValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value) &&
  !(value instanceof Uint8Array) && !("uid" in value);

const isUid = (value: BinaryPlistValue | undefined): value is BinaryPlistUid =>
  typeof value === "object" && value !== null && "uid" in value;

export function decodeKeyedArchiveRoot(
  bytes: Uint8Array<ArrayBuffer>
): Readonly<Record<string, BinaryPlistValue>> {
  const archive = parseBinaryPlist(bytes);
  if (!isRecord(archive) || !Array.isArray(archive.$objects) || !isRecord(archive.$top)) {
    throw new Error("NSKeyed archive structure is invalid");
  }
  const objects = archive.$objects;
  const rootReference = archive.$top.root;
  if (!isUid(rootReference)) throw new Error("NSKeyed archive root is missing");
  const root = objects[rootReference.uid];
  if (!isRecord(root)) throw new Error("NSKeyed archive root is not a dictionary");
  const resolving = new Set<number>();
  const resolve = (value: BinaryPlistValue): BinaryPlistValue => {
    if (isUid(value)) {
      if (resolving.has(value.uid)) return null;
      resolving.add(value.uid);
      const output = resolve(objects[value.uid] ?? null);
      resolving.delete(value.uid); return output;
    }
    if (Array.isArray(value)) return value.map(resolve);
    if (!isRecord(value)) return value;
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, resolve(item)]));
  };
  return resolve(root) as Readonly<Record<string, BinaryPlistValue>>;
}
