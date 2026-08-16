import type { BrushPreset } from "../../contracts/brush";
import type { BrushSetModel } from "../../contracts/brushLibrary";
import type {
  BrushLibraryStoragePort, BrushStoredSet
} from "../../contracts/brushStorage";
import { parsePresetFile, presetBaseFileName } from "./brushPresetFile";

export async function ensureBundledSeed(
  storage: BrushLibraryStoragePort,
  bundled: readonly BrushPreset[]
): Promise<readonly BrushStoredSet[]> {
  let sets = await storage.listSets();
  if (sets.find(({ name }) => name === "Main")?.seeded) return sets;
  const files = await Promise.all(bundled.map(async (brush) => {
    const response = await fetch(brush.sourceUrl);
    if (!response.ok) throw new Error(`Bundled brush fetch failed: ${brush.fileName}`);
    return { fileName: brush.fileName,
      bytes: new Uint8Array(await response.arrayBuffer()) };
  }));
  await storage.ensureSeeded("Main", files);
  sets = await storage.listSets();
  return sets;
}

export async function loadBrushSets(
  storage: BrushLibraryStoragePort,
  bundled: readonly BrushPreset[]
): Promise<readonly BrushSetModel[]> {
  const storedSets = await ensureBundledSeed(storage, bundled);
  const baseByFile = new Map(bundled.map((brush) => [brush.fileName, brush]));
  const fallback = bundled[0];
  const output: BrushSetModel[] = [];
  for (const storedSet of storedSets) {
    const originals = storedSet.files.flatMap((file) => {
      const base = baseByFile.get(file.fileName);
      return base ? [{ ...base, setName: storedSet.name, fileName: file.fileName }] : [];
    });
    const custom = [];
    for (const file of storedSet.files.filter(({ fileName }) =>
      fileName.endsWith(".prodraw-brush"))) {
      try {
        const bytes = await storage.readFile(storedSet.name, file.fileName);
        const baseName = presetBaseFileName(bytes);
        const bundledBase = baseName ? baseByFile.get(baseName) : undefined;
        const base = bundledBase ?? (baseName ? fallback : undefined);
        if (base) {
          const parsed = parsePresetFile(bytes, storedSet.name, file.fileName, base);
          custom.push(bundledBase ? parsed : { ...parsed, sourceUrl: "" });
        }
      }
      catch { /* One corrupt brush cannot block its set. */ }
    }
    const newest = new Map<string, BrushPreset>();
    for (const brush of custom) {
      const previous = newest.get(brush.id);
      if (!previous || previous.revision < brush.revision) newest.set(brush.id, brush);
    }
    const replacements = new Set([...newest.values()].flatMap((brush) =>
      brush.replacesFileName ? [brush.replacesFileName] : []));
    output.push({ name: storedSet.name,
      brushes: [...originals.filter((brush) => !replacements.has(brush.fileName)),
        ...newest.values()].sort((left, right) => left.name.localeCompare(right.name)) });
  }
  return output;
}
