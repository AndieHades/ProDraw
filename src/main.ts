import "./styles/raster-tokens.css";
import "./styles/raster-base.css";
import "./styles/raster-workspace.css";
import "./styles/raster-dialogs.css";
import { createPlatform } from "./app/createPlatform";
import { createInitialDocument } from "./app/createInitialDocument";
import { RasterEditorApp } from "./app/RasterEditorApp";
import { DocumentRepository } from "./core/persistence/DocumentRepository";

async function bootstrap(): Promise<void> {
  const repository = new DocumentRepository();
  const document = await createInitialDocument(repository);
  new RasterEditorApp(createPlatform(), repository, document);
}

void bootstrap();
