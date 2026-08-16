import type { BrushPreset } from "../../contracts/brush";
import type { BrushExportFile } from "../../contracts/brushLibrary";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";
import { brushFileName } from "../../logic/brush/brushFileName";
import { cloneBrushPreset } from "../../logic/brush/cloneBrushPreset";
import { decodeProcreateBrush } from "../brush/procreateBrush";
import { parsePresetFile, presetBaseFileName, presetFileBytes } from "./brushPresetFile";
import { moveBrushFiles } from "./moveBrushFiles";

function importedName(requested: string, existing: readonly string[]): string {
  const raw = requested.replace(/\\/g, "/").split("/").at(-1) ?? "Imported.brush";
  const stem = raw.replace(/\.(?:prodraw-)?brush$/i, "")
    .replace(/[<>:"/\\|?*]/g, "_").replace(/[. ]+$/g, "").slice(0, 72) || "Imported";
  const extension = raw.toLowerCase().endsWith(".prodraw-brush")
    ? ".prodraw-brush" : ".brush";
  const occupied = new Set(existing.map((name) => name.toLowerCase()));
  let candidate = `${stem}${extension}`;
  for (let suffix = 2; occupied.has(candidate.toLowerCase()); suffix += 1) {
    candidate = `${stem} (${suffix})${extension}`;
  }
  return candidate;
}

export class BrushLibraryFileActions {
  readonly #storage: BrushLibraryStoragePort | null;
  readonly #bundled: readonly BrushPreset[];
  readonly #createId: () => string;

  constructor(storage: BrushLibraryStoragePort | null, bundled: readonly BrushPreset[],
    createId: () => string) {
    this.#storage = storage; this.#bundled = bundled; this.#createId = createId;
  }

  async copy(source: BrushPreset, name: string, setName: string): Promise<BrushPreset> {
    const id = this.#createId();
    const brush = { ...cloneBrushPreset(source), id, name, revision: 1, setName,
      replacesFileName: null, fileName: brushFileName(name, id, 1) };
    await this.write(brush); return brush;
  }

  async apply(source: BrushPreset, draft: BrushPreset): Promise<BrushPreset> {
    const revision = source.revision + 1;
    const brush = { ...cloneBrushPreset(draft), id: source.id, revision,
      setName: source.setName, fileName: brushFileName(draft.name, source.id, revision),
      replacesFileName: source.fileName.endsWith(".brush")
        ? source.fileName : source.replacesFileName };
    await this.write(brush);
    if (this.#storage && source.fileName.endsWith(".prodraw-brush")) {
      await this.#storage.trashFile(source.setName, source.fileName);
    }
    return brush;
  }

  async trash(brush: BrushPreset): Promise<void> {
    if (!this.#storage) return;
    await this.#storage.trashFile(brush.setName, brush.fileName);
    if (brush.replacesFileName) {
      await this.#storage.trashFile(brush.setName, brush.replacesFileName);
    }
  }

  move(brush: BrushPreset, toSet: string): Promise<void> {
    return moveBrushFiles(this.#storage, brush, toSet);
  }

  async importFile(setName: string, requested: string,
    bytes: Uint8Array<ArrayBuffer>): Promise<BrushPreset> {
    if (!this.#storage) throw new Error("Brush import requires desktop storage");
    const set = (await this.#storage.listSets()).find(({ name }) => name === setName);
    const fileName = importedName(requested, set?.files.map(({ fileName }) => fileName) ?? []);
    return fileName.endsWith(".prodraw-brush")
      ? this.importPreset(setName, fileName, bytes) : this.importArchive(setName, fileName, bytes);
  }

  async exportFile(brush: BrushPreset): Promise<BrushExportFile> {
    if (!this.#storage) return { name: brush.fileName, bytes: presetFileBytes(brush) };
    return { name: brush.fileName,
      bytes: await this.#storage.readFile(brush.setName, brush.fileName) };
  }

  async resetDraft(brush: BrushPreset): Promise<BrushPreset> {
    if (!this.#storage) throw new Error("Brush reset requires desktop storage");
    const bytes = await this.#storage.readFile(brush.setName, brush.baseFileName);
    const archive = await decodeProcreateBrush(bytes, { ...brush,
      fileName: brush.baseFileName, replacesFileName: null });
    if (archive.compatibility.archiveVersion === null) throw new Error("Incompatible brush archive");
    return { ...cloneBrushPreset(archive), id: brush.id, name: brush.name,
      setName: brush.setName, fileName: brush.fileName, baseFileName: brush.baseFileName,
      replacesFileName: brush.replacesFileName };
  }

  restoreTrash(): Promise<number> {
    return this.#storage?.restoreTrash() ?? Promise.resolve(0);
  }
  revealFolder(setName: string | null): Promise<void> {
    return this.#storage?.revealFolder(setName) ?? Promise.resolve();
  }

  private async importArchive(setName: string, fileName: string,
    bytes: Uint8Array<ArrayBuffer>): Promise<BrushPreset> {
    const id = this.#createId();
    const fallback = this.#bundled[0];
    if (!fallback) throw new Error("No brush defaults available");
    const loaded = await decodeProcreateBrush(bytes, { ...fallback, id, setName,
      name: fileName.replace(/\.brush$/i, ""), fileName, baseFileName: fileName,
      replacesFileName: null, sourceUrl: "" });
    if (loaded.compatibility.archiveVersion === null) throw new Error("Incompatible .brush file");
    const name = loaded.compatibility.archiveName?.trim() || loaded.name;
    const brush = { ...cloneBrushPreset(loaded), id, name, setName, baseFileName: fileName,
      replacesFileName: fileName, fileName: brushFileName(name, id, 1), sourceUrl: "" };
    await this.#storage!.writeFile(setName, fileName, bytes);
    try { await this.write(brush); }
    catch (error) { await this.#storage!.trashFile(setName, fileName); throw error; }
    return brush;
  }

  private async importPreset(setName: string, fileName: string,
    bytes: Uint8Array<ArrayBuffer>): Promise<BrushPreset> {
    const baseName = presetBaseFileName(bytes);
    const base = this.#bundled.find((brush) => brush.fileName === baseName);
    if (!base) throw new Error("Imported preset requires a bundled base brush");
    const parsed = parsePresetFile(bytes, setName, fileName, base);
    const id = this.#createId();
    const brush = { ...parsed, id, revision: 1, replacesFileName: null,
      fileName: brushFileName(parsed.name, id, 1) };
    await this.write(brush); return brush;
  }

  private write(brush: BrushPreset): Promise<void> {
    return this.#storage?.writeFile(brush.setName, brush.fileName,
      presetFileBytes(brush)) ?? Promise.resolve();
  }
}
