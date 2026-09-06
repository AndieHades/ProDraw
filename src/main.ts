import "./styles/brush-studio-shell.css";
import type { CompactBrushShellPort } from "./ui/brushes/CompactBrushShellPort";
import { DocumentRepository } from "./core/persistence/DocumentRepository";
import {
  rendererSmokeRequested, reportRendererSmokeFailure, runRendererSmoke
} from "./app/runRendererSmoke";
import { mountCompactBrushLibrary } from "./app/mountCompactBrushLibrary";
import { registerLegacyClose } from "./app/registerLegacyClose";

export async function mountOriginalInterfaceBridge(shell: CompactBrushShellPort,
  saveCurrent: () => Promise<boolean>): Promise<void> {
  try {
    const mounted = await mountCompactBrushLibrary(shell);
    registerLegacyClose(mounted.platform, saveCurrent);
    if (rendererSmokeRequested()) {
      await runRendererSmoke(mounted.platform, new DocumentRepository(), mounted.library);
    }
  } catch (error: unknown) {
    if (rendererSmokeRequested()) reportRendererSmokeFailure(error);
    else throw error;
  }
}
