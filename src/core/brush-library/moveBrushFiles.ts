import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibraryStoragePort } from "../../contracts/brushStorage";

export async function moveBrushFiles(
  storage: BrushLibraryStoragePort | null,
  brush: BrushPreset,
  toSet: string
): Promise<void> {
  if (!storage) return;
  const files = [brush.replacesFileName, brush.fileName]
    .filter((file): file is string => !!file);
  const moved: string[] = [];
  try {
    for (const file of files) {
      await storage.moveFile(brush.setName, toSet, file);
      moved.push(file);
    }
  } catch (error) {
    for (const file of moved.reverse()) await storage.moveFile(toSet, brush.setName, file);
    throw error;
  }
}
