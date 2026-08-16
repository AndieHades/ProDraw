export interface BinaryPlistUid { readonly uid: number }
export type BinaryPlistValue = null | boolean | number | string |
  Uint8Array<ArrayBuffer> | BinaryPlistUid | BinaryPlistValue[] |
  { [key: string]: BinaryPlistValue };

const decoder = new TextDecoder();

class BinaryPlistParser {
  readonly #view: DataView;
  readonly #bytes: Uint8Array<ArrayBuffer>;
  readonly #offsetSize: number;
  readonly #referenceSize: number;
  readonly #offsets: number[];
  readonly #cache = new Map<number, BinaryPlistValue>();
  readonly #topObject: number;

  constructor(bytes: Uint8Array<ArrayBuffer>) {
    if (bytes.length < 40 || decoder.decode(bytes.subarray(0, 8)) !== "bplist00") {
      throw new Error("Binary plist header is invalid");
    }
    this.#bytes = bytes;
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const trailer = bytes.length - 32;
    this.#offsetSize = bytes[trailer + 6] ?? 0;
    this.#referenceSize = bytes[trailer + 7] ?? 0;
    const objectCount = this.unsigned(trailer + 8, 8);
    this.#topObject = this.unsigned(trailer + 16, 8);
    const offsetTable = this.unsigned(trailer + 24, 8);
    if (!this.#offsetSize || !this.#referenceSize || objectCount < 1) {
      throw new Error("Binary plist trailer is invalid");
    }
    this.#offsets = Array.from({ length: objectCount }, (_, index) =>
      this.unsigned(offsetTable + index * this.#offsetSize, this.#offsetSize));
  }

  parse(): BinaryPlistValue { return this.object(this.#topObject); }

  private object(index: number): BinaryPlistValue {
    const cached = this.#cache.get(index);
    if (cached !== undefined) return cached;
    const offset = this.#offsets[index];
    if (offset === undefined) throw new Error(`Binary plist object is missing: ${index}`);
    const marker = this.#bytes[offset] ?? 0;
    const type = marker >> 4;
    const info = marker & 15;
    if (type === 0) return info === 8 ? false : info === 9 ? true : null;
    if (type === 1) return this.signed(offset + 1, 2 ** info);
    if (type === 2) return this.real(offset + 1, 2 ** info);
    if (type === 8) return { uid: this.unsigned(offset + 1, info + 1) };
    const [length, content] = this.length(info, offset + 1);
    if (type === 4) return this.#bytes.slice(content, content + length);
    if (type === 5) return decoder.decode(this.#bytes.subarray(content, content + length));
    if (type === 6) return this.utf16(content, length);
    if (type === 10) return this.array(index, content, length);
    if (type === 13) return this.dictionary(index, content, length);
    throw new Error(`Unsupported binary plist object type: ${type}`);
  }

  private array(index: number, content: number, length: number): BinaryPlistValue[] {
    const output: BinaryPlistValue[] = [];
    this.#cache.set(index, output);
    for (let item = 0; item < length; item += 1) {
      output.push(this.object(this.unsigned(
        content + item * this.#referenceSize, this.#referenceSize)));
    }
    return output;
  }

  private dictionary(index: number, content: number, length: number) {
    const output: { [key: string]: BinaryPlistValue } = {};
    this.#cache.set(index, output);
    const values = content + length * this.#referenceSize;
    for (let item = 0; item < length; item += 1) {
      const key = this.object(this.unsigned(
        content + item * this.#referenceSize, this.#referenceSize));
      if (typeof key !== "string") throw new Error("Binary plist dictionary key is not text");
      output[key] = this.object(this.unsigned(
        values + item * this.#referenceSize, this.#referenceSize));
    }
    return output;
  }

  private length(info: number, cursor: number): readonly [number, number] {
    if (info < 15) return [info, cursor];
    const marker = this.#bytes[cursor] ?? 0;
    if ((marker >> 4) !== 1) throw new Error("Binary plist length marker is invalid");
    const size = 2 ** (marker & 15);
    return [this.unsigned(cursor + 1, size), cursor + 1 + size];
  }

  private unsigned(offset: number, size: number): number {
    let value = 0n;
    for (let index = 0; index < size; index += 1) {
      value = (value << 8n) | BigInt(this.#bytes[offset + index] ?? 0);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number)) throw new Error("Binary plist integer is too large");
    return number;
  }

  private signed(offset: number, size: number): number {
    let value = BigInt(this.unsigned(offset, size));
    const bits = BigInt(size * 8);
    if (value & (1n << (bits - 1n))) value -= 1n << bits;
    return Number(value);
  }

  private real(offset: number, size: number): number {
    if (size === 4) return this.#view.getFloat32(offset, false);
    if (size === 8) return this.#view.getFloat64(offset, false);
    throw new Error(`Unsupported binary plist real size: ${size}`);
  }

  private utf16(offset: number, length: number): string {
    return String.fromCharCode(...Array.from({ length }, (_, index) =>
      this.#view.getUint16(offset + index * 2, false)));
  }
}

export function parseBinaryPlist(bytes: Uint8Array<ArrayBuffer>): BinaryPlistValue {
  return new BinaryPlistParser(bytes).parse();
}
