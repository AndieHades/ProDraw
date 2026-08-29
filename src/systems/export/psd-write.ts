export const MIME = "image/vnd.adobe.photoshop";
type ChannelId = 0 | 1 | 2 | 3;
export interface PsdWriteLayer { readonly name: string; readonly opacity: number;
  readonly hidden?: boolean; readonly clip?: boolean; readonly lsct?: number;
  readonly data?: Partial<Record<ChannelId, Uint8Array>> | null }
export interface PsdWriteInput { readonly W: number; readonly H: number;
  readonly layers: readonly PsdWriteLayer[];
  readonly comp: Record<ChannelId, Uint8Array> }
interface ByteWriter { readonly length: number; readonly chunks: Uint8Array<ArrayBuffer>[];
  bytes(value: Uint8Array): void; u8(...value: number[]): void; u16(value: number): void;
  u32(value: number): void; ascii(value: string): void; zeros(count: number): void;
  append(value: ByteWriter): void }
function byteWriter(): ByteWriter {
  const chunks: Uint8Array<ArrayBuffer>[] = []; let length = 0;
  const push = (value: Uint8Array): void => {
    const owned = Uint8Array.from(value); chunks.push(owned); length += owned.length;
  };
  return { get length() { return length; }, chunks, bytes: push,
    u8: (...value) => push(Uint8Array.from(value)),
    u16: (value) => push(Uint8Array.from([(value >> 8) & 255, value & 255])),
    u32: (value) => push(Uint8Array.from([(value >>> 24) & 255,
      (value >>> 16) & 255, (value >>> 8) & 255, value & 255])),
    ascii: (value) => push(Uint8Array.from([...value].map((character) =>
      character.charCodeAt(0) & 255))), zeros: (count) => push(new Uint8Array(count)),
    append: (writer) => { for (const chunk of writer.chunks) push(chunk); } };
}
const pascalAscii = (name: string): string => {
  let value = ""; for (const character of name)
    value += character.charCodeAt(0) < 128 ? character : "_";
  return value.slice(0, 31) || "Layer";
};
const plane = (layer: PsdWriteLayer, channel: number): Uint8Array =>
  layer.data?.[channel === -1 ? 3 : channel as ChannelId] ?? new Uint8Array();
function writeRecord(info: ByteWriter, layer: PsdWriteLayer, width: number,
  height: number): void {
  const hasData = !!layer.data, length = hasData ? width * height : 0;
  info.u32(0); info.u32(0); info.u32(hasData ? height : 0);
  info.u32(hasData ? width : 0); info.u16(4);
  for (const channel of [0, 1, 2, -1]) { info.u16(channel & 0xffff); info.u32(2 + length); }
  info.ascii("8BIM"); info.ascii("norm"); info.u8(layer.opacity);
  info.u8(layer.clip ? 1 : 0); info.u8(layer.hidden ? 2 : 0); info.u8(0);
  const extra = byteWriter(); extra.u32(0); extra.u32(0);
  const ascii = pascalAscii(layer.name); extra.u8(ascii.length); extra.ascii(ascii);
  for (let index = 1 + ascii.length; index % 4; index++) extra.u8(0);
  extra.ascii("8BIM"); extra.ascii("luni"); extra.u32(4 + layer.name.length * 2);
  extra.u32(layer.name.length);
  for (const character of layer.name) extra.u16(character.charCodeAt(0));
  if (layer.lsct) { extra.ascii("8BIM"); extra.ascii("lsct");
    extra.u32(4); extra.u32(layer.lsct); }
  if (extra.length % 2) extra.u8(0); info.u32(extra.length); info.append(extra);
}
export function writePsd({ W, H, layers, comp }: PsdWriteInput): Blob {
  const output = byteWriter(); output.ascii("8BPS"); output.u16(1); output.zeros(6);
  output.u16(4); output.u32(H); output.u32(W); output.u16(8); output.u16(4);
  output.u32(0); output.u32(0); const info = byteWriter(); info.u16(layers.length & 0xffff);
  for (const layer of layers) writeRecord(info, layer, W, H);
  for (const layer of layers) for (const channel of [0, 1, 2, -1]) {
    info.u16(0); info.bytes(plane(layer, channel));
  }
  if (info.length % 2) info.u8(0); output.u32(4 + info.length + 4);
  output.u32(info.length); output.append(info); output.u32(0); output.u16(0);
  for (const channel of [0, 1, 2, 3] as const) output.bytes(comp[channel]);
  return new Blob(output.chunks, { type: MIME });
}
