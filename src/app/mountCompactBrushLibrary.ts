import type { CompactBrushShellPort } from "../ui/brushes/CompactBrushShellPort";
import { BrushCatalog } from "../core/brush/BrushCatalog";
import { BrushLibraryService } from "../core/brush-library/BrushLibraryService";
import { BUNDLED_BRUSHES } from "../config/bundledBrushes";
import { applyTranslations } from "../i18n/raster/translate";
import { BrushStudioPresenter } from "../ui/brushes/BrushStudioPresenter";
import { CompactBrushLibraryPresenter } from "../ui/brushes/CompactBrushLibraryPresenter";
import { requiredElement } from "../ui/dom/query";
import { createPlatform } from "./createPlatform";
import * as shellActions from "../core/actions";
import { setBrushShortcuts } from "../core/brush-library/brushShortcutRegistry";

export interface CompactBrushMount {
  readonly platform: ReturnType<typeof createPlatform>;
  readonly library: BrushLibraryService;
}

export async function mountCompactBrushLibrary(
  shell: CompactBrushShellPort
): Promise<CompactBrushMount> {
  const platform = createPlatform();
  const library = await BrushLibraryService.create(platform.brushStorage, BUNDLED_BRUSHES,
    undefined, platform.brushStateStorage ?? platform.brushStorage);
  const catalog = new BrushCatalog(platform.brushStorage, platform.brushDecoder);
  for (const selector of ["#brush-studio-dialog", "#brush-source-dialog",
    "#delete-brush-dialog"]) applyTranslations(requiredElement(selector));

  const studio = new BrushStudioPresenter(
    () => library.snapshot.sets.flatMap(({ brushes }) => brushes),
    (brush) => catalog.load(brush),
    async (source, draft) => {
      const applied = await library.applyDraft(source, draft);
      catalog.clear(source.id); compact.select(applied);
    },
    async (name, bytes) => Boolean(await platform.saveBinary({
      suggestedName: name, bytes,
      filters: [{ name: "ProDraw Ink Trace", extensions: ["json"] }]
    })), {
      read: (id) => library.snapshot.brushShortcuts[id] ?? "",
      write: async (id, combo) => {
        library.setShortcut(id, combo); await library.whenStateSaved();
      }
    });
  const compact = new CompactBrushLibraryPresenter(library, platform, shell, {
    edit: (brush) => studio.open(brush),
    select: (brush, loaded, mode) => shell.selectLegacyBrush(brush.id, loaded, mode),
    load: (brush) => catalog.load(brush)
  });
  library.subscribe(({ brushShortcuts }) => setBrushShortcuts(brushShortcuts));
  shellActions.registerOrReplace("brush.selectById", (id: string) => {
    const brush = library.snapshot.sets.flatMap(({ brushes }) => brushes)
      .find((candidate) => candidate.id === id);
    if (brush) compact.select(brush);
  });
  return { platform, library };
}
