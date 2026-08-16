import "./styles/raster-tokens.css";
import "./styles/raster-base.css";
import "./styles/raster-workspace.css";
import "./styles/raster-dialogs.css";
import { createPlatform } from "./app/createPlatform";
import { createInitialDocument } from "./app/createInitialDocument";
import { RasterEditorApp } from "./app/RasterEditorApp";
import {
  rendererSmokeRequested, reportRendererSmokeFailure, runRendererSmoke
} from "./app/runRendererSmoke";
import { BUNDLED_BRUSHES } from "./config/bundledBrushes";
import { BrushLibraryService } from "./core/brush-library/BrushLibraryService";
import { DocumentRepository } from "./core/persistence/DocumentRepository";

async function bootstrap(): Promise<void> {
  const repository = new DocumentRepository();
  const document = await createInitialDocument(repository);
  const platform = createPlatform();
  const brushes = await BrushLibraryService.create(platform.brushStorage, BUNDLED_BRUSHES);
  new RasterEditorApp(platform, repository, document, brushes);
  if (rendererSmokeRequested()) await runRendererSmoke(platform, repository, brushes);
}

void bootstrap().catch((error: unknown) => {
  if (rendererSmokeRequested()) reportRendererSmokeFailure(error);
  else console.error("ProDraw bootstrap failed", error);
});
