import { describe, expect, it, vi } from "vitest";
import { writeSelectedPngTree } from
  "../../src/systems/export/SelectedPngTreeExport.ts";
import type { FileTreeWriter } from "../../src/platform/fileTreeWriter.ts";

const plan = { rootName: "Layers", directories: [["Group"]], items: [
  { path: ["Group", "A.png"], node: { name: "A" } },
  { path: ["Group", "B.png"], node: { name: "B" } }
] } as const;
function writer(overrides: Partial<FileTreeWriter> = {}): FileTreeWriter {
  return { ensureDirectory: vi.fn(async () => undefined),
    write: vi.fn(async () => undefined),
    commit: vi.fn(async () => ({ name: "Layers", location: "C:/Layers" })),
    abort: vi.fn(async () => undefined), ...overrides };
}
const dependencies = (output: FileTreeWriter) => ({
  writerFactory: vi.fn(async () => output),
  renderLayer: (node: { name: string }) => node.name,
  boundCanvas: (canvas: string) => canvas,
  encode: vi.fn(async () => ({ blob: new Blob(["png"]) }))
});

describe("selected PNG tree export", () => {
  it("uses one destination session and publishes after every write", async () => {
    const output = writer(), ports = dependencies(output);
    const result = await writeSelectedPngTree(plan, true, ports);
    expect(result.status).toBe("saved");
    expect(ports.writerFactory).toHaveBeenCalledOnce();
    expect(output.ensureDirectory).toHaveBeenCalledWith(["Group"]);
    expect(output.write).toHaveBeenCalledTimes(2);
    expect(output.commit).toHaveBeenCalledOnce(); expect(output.abort).not.toHaveBeenCalled();
  });

  it("aborts the unpublished tree after any encode or write failure", async () => {
    const output = writer(), ports = dependencies(output);
    ports.encode.mockRejectedValueOnce(new Error("encode failed"));
    const result = await writeSelectedPngTree(plan, false, ports);
    expect(result).toEqual({ status: "failed" });
    expect(output.abort).toHaveBeenCalledOnce(); expect(output.commit).not.toHaveBeenCalled();
  });

  it("treats destination cancellation as a no-write result", async () => {
    const output = writer(), ports = { ...dependencies(output),
      writerFactory: vi.fn(async () => null) };
    expect(await writeSelectedPngTree(plan, false, ports))
      .toEqual({ status: "cancelled" });
    expect(output.write).not.toHaveBeenCalled(); expect(output.abort).not.toHaveBeenCalled();
  });
});
