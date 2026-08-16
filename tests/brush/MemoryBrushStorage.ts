import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { BrushLibraryStoragePort } from "../../src/contracts/brushStorage";

export class MemoryBrushStorage implements BrushLibraryStoragePort {
  readonly files = new Map<string, Uint8Array<ArrayBuffer>>();
  readonly directories = new Set(["Main"]);
  readonly seeded = new Set(["Main"]);
  readonly trashed: string[] = [];
  state: string | null = null;

  constructor() {
    for (const brush of BUNDLED_BRUSHES) {
      this.files.set(`Main/${brush.fileName}`, new Uint8Array());
    }
  }

  async ensureSeeded(setName: string): Promise<void> { this.seeded.add(setName); }
  async listSets() {
    return [...this.directories].map((name) => ({ name, seeded: this.seeded.has(name),
      files: [...this.files.keys()].filter((key) => key.startsWith(`${name}/`))
        .map((key) => ({ fileName: key.slice(name.length + 1),
          byteLength: this.files.get(key)?.byteLength ?? 0, modifiedAt: 1 })) }));
  }
  async readFile(setName: string, fileName: string) {
    const bytes = this.files.get(`${setName}/${fileName}`);
    if (!bytes) throw new Error("missing file");
    return bytes.slice();
  }
  async writeFile(setName: string, fileName: string, bytes: Uint8Array<ArrayBuffer>) {
    const key = `${setName}/${fileName}`;
    if (this.files.has(key)) throw new Error("duplicate file");
    this.files.set(key, bytes.slice());
  }
  async trashFile(setName: string, fileName: string) {
    const key = `${setName}/${fileName}`;
    if (!this.files.delete(key)) throw new Error("missing file");
    this.trashed.push(key);
  }
  async createSet(setName: string) {
    if (this.directories.has(setName)) throw new Error("duplicate set");
    this.directories.add(setName);
  }
  async renameSet(from: string, to: string) {
    if (!this.directories.delete(from)) throw new Error("missing set");
    this.directories.add(to);
    for (const [key, bytes] of [...this.files]) {
      if (!key.startsWith(`${from}/`)) continue;
      this.files.delete(key);
      this.files.set(`${to}/${key.slice(from.length + 1)}`, bytes);
    }
  }
  async moveFile(fromSet: string, toSet: string, fileName: string) {
    const bytes = await this.readFile(fromSet, fileName);
    await this.writeFile(toSet, fileName, bytes);
    this.files.delete(`${fromSet}/${fileName}`);
  }
  async trashSet(setName: string) {
    if (!this.directories.delete(setName)) throw new Error("missing set");
    for (const key of [...this.files.keys()]) {
      if (key.startsWith(`${setName}/`)) this.files.delete(key);
    }
    this.trashed.push(`${setName}/`);
  }
  async readState() { return this.state; }
  async writeState(json: string) { this.state = json; }
}
