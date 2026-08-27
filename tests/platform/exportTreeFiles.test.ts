import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { abortExportTree, commitExportTree, createExportTreeSession,
  ensureExportTreeDirectory, exportTreeDirectoryTarget, exportTreeTarget,
  writeExportTreeFile } from "../../desktop/export-tree-files.mjs";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "prodraw-export-tree-"));
  roots.push(root); return root;
}

describe("desktop export tree files", () => {
  it("writes nested PNGs and publishes without replacing an existing root", async () => {
    const parent = await temporaryRoot(); await mkdir(path.join(parent, "Hero"));
    const session = await createExportTreeSession(parent, "Hero");
    await ensureExportTreeDirectory(session, ["Parts", "Empty"]);
    await writeExportTreeFile(session, ["Parts", "Тень.png"], Uint8Array.of(1, 2, 3));
    const result = await commitExportTree(session);
    expect(result.name).toBe("Hero_2");
    expect(await readFile(path.join(result.location, "Parts", "Тень.png")))
      .toEqual(Buffer.from([1, 2, 3]));
    await expect(access(path.join(result.location, "Parts", "Empty"))).resolves.toBeUndefined();
  });

  it("rejects traversal/non-PNG paths and removes aborted staging", async () => {
    const parent = await temporaryRoot();
    const session = await createExportTreeSession(parent, "Layers");
    expect(() => exportTreeTarget(session, ["..", "escape.png"])).toThrow();
    expect(() => exportTreeTarget(session, ["not-png.txt"])).toThrow();
    expect(() => exportTreeDirectoryTarget(session, [".."])).toThrow();
    await writeExportTreeFile(session, ["safe.png"], Uint8Array.of(7));
    await abortExportTree(session);
    await expect(access(session.staging)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
