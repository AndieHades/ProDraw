import { mkdir } from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "./atomic-file.mjs";
import { brushFilePath, brushSetPath, pathExists } from "./brush-storage-paths.mjs";

const manifestName = ".seed-manifest-v2.json";

export async function brushSetSeedVersion(directory) {
  if (await pathExists(path.join(directory, manifestName))) return 2;
  return await pathExists(path.join(directory, ".seeded-v1")) ? 1 : null;
}

export async function seedBrushSet(setName, files) {
  const directory = brushSetPath(setName);
  const manifest = path.join(directory, manifestName);
  await mkdir(directory, { recursive: true });
  if (await pathExists(manifest)) return;
  const migrated = await pathExists(path.join(directory, ".seeded-v1"));
  if (!migrated) {
    for (const file of files) {
      const target = brushFilePath(setName, file.fileName);
      if (!(await pathExists(target))) await atomicWriteFile(target, file.bytes);
    }
  }
  const record = { format: "prodraw-brush-seed", version: 2,
    files: files.map((file) => ({ fileName: file.fileName, byteLength: file.bytes.length })) };
  await atomicWriteFile(manifest, new TextEncoder().encode(JSON.stringify(record, null, 2)));
}
