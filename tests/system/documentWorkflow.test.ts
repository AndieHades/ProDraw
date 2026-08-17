import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { DocumentWorkflow } from "../../src/app/DocumentWorkflow";
import { RasterEditorSession } from "../../src/app/RasterEditorSession";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { PlatformPort } from "../../src/contracts/platform";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import { decodeNativeDocument } from "../../src/core/persistence/nativeDocumentFile";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";

describe("document workflow", () => {
  it("guards replacement, reuses Save path and flushes before close", async () => {
    let confirm = true;
    const closeHandlers: Array<() => Promise<boolean>> = [];
    let savedBytes: Uint8Array<ArrayBuffer> | null = null;
    let writtenBytes: Uint8Array<ArrayBuffer> | null = null;
    let openedBytes: Uint8Array<ArrayBuffer> | null = null;
    const saveBinary = vi.fn(async (request: { bytes: Uint8Array<ArrayBuffer> }) => {
      savedBytes = new Uint8Array(request.bytes);
      return { name: "Workflow.prodraw", location: "C:\\Art\\Workflow.prodraw" };
    });
    const writeBinary = vi.fn(async (_location: string, bytes: Uint8Array<ArrayBuffer>) => {
      writtenBytes = new Uint8Array(bytes);
      return true;
    });
    const platform: PlatformPort = { kind: "windows", brushStorage: null,
      brushDecoder: { decode: decodeProcreateBrush },
      openBinary: async () => openedBytes ? { name: "Reopened.prodraw",
        location: "C:\\Art\\Reopened.prodraw", bytes: openedBytes } : null, saveBinary,
      writeBinary, confirmDiscard: async () => confirm,
      onCloseRequested: (handler) => { closeHandlers.push(handler); return () => undefined; } };
    const ids = ["workflow", "paint"];
    const document = createRasterDocument({ name: "Workflow", width: 16, height: 16,
      dpi: 144, layerName: "Paint" }, () => ids.shift() ?? "extra");
    const brush = BUNDLED_BRUSHES[0];
    if (!brush) throw new Error("Bundled brush fixture is unavailable");
    const session = new RasterEditorSession(document, brush,
      { width: 800, height: 600 }, null);
    const statuses: string[] = [];
    const workflow = new DocumentWorkflow({ platform,
      repository: new DocumentRepository(new IDBFactory()), session,
      viewport: () => ({ width: 800, height: 600 }), onChanged: () => undefined,
      onStatus: (status) => statuses.push(status) });

    document.editableSurface().blendPixel(3, 5,
      { red: 12, green: 120, blue: 240, alpha: 255 });
    workflow.documentChanged();
    expect(session.isDirty).toBe(true);
    await expect(workflow.save(true)).resolves.toBe(true);
    expect(session.isDirty).toBe(false);
    expect(savedBytes).not.toBeNull();

    document.editableSurface().blendPixel(7, 8,
      { red: 240, green: 60, blue: 12, alpha: 255 });
    workflow.documentChanged();
    await expect(workflow.save()).resolves.toBe(true);
    expect(writeBinary).toHaveBeenCalledWith("C:\\Art\\Workflow.prodraw", expect.any(Uint8Array));
    if (!writtenBytes) throw new Error("Existing-path save did not write bytes");
    expect(decodeNativeDocument(writtenBytes).compositePixel(7, 8).alpha).toBe(255);
    openedBytes = writtenBytes;
    await workflow.open();
    expect(session.sessionSnapshot.nativeLocation).toBe("C:\\Art\\Reopened.prodraw");
    expect(session.document.compositePixel(7, 8).alpha).toBe(255);

    workflow.create({ name: "New", width: 32, height: 24, dpi: 72 }, "Paint");
    confirm = false;
    let openedNewDialog = false;
    await workflow.requestNew(() => { openedNewDialog = true; });
    expect(openedNewDialog).toBe(false);
    const closeHandler = closeHandlers[0];
    if (!closeHandler) throw new Error("Desktop close handler was not registered");
    await expect(closeHandler()).resolves.toBe(false);
    confirm = true;
    await expect(closeHandler()).resolves.toBe(true);
    expect(statuses).toContain("status.nativeSaved");
  });
});
