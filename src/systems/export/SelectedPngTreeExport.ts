import { FileTreeUnsupportedError } from "../../platform/fileTreeWriter.ts";
import type { FileTreeWriter, FileTreeWriteResult } from "../../platform/fileTreeWriter.ts";

export interface PngTreeItem<TNode> { readonly path: readonly string[];
  readonly node: TNode }
export interface PngTreePlan<TNode> { readonly rootName: string;
  readonly directories: readonly (readonly string[])[];
  readonly items: readonly PngTreeItem<TNode>[] }
export interface PngEncodedOutput { readonly blob: Blob | null | undefined }
export interface PngTreeDependencies<TNode, TCanvas> {
  readonly writerFactory: (rootName: string) => Promise<FileTreeWriter | null>;
  readonly renderLayer: (node: TNode) => TCanvas;
  readonly boundCanvas: (canvas: TCanvas, tight: boolean) => TCanvas;
  readonly encode: (canvas: TCanvas, name: string) => Promise<PngEncodedOutput>;
}
export type PngTreeExportResult<TNode> = {
  readonly status: "saved"; readonly output: FileTreeWriteResult;
  readonly directories: readonly (readonly string[])[];
  readonly items: readonly PngTreeItem<TNode>[];
} | { readonly status: "cancelled" | "unsupported" | "failed" };

export async function writeSelectedPngTree<TNode extends { readonly name: string }, TCanvas>(
  plan: PngTreePlan<TNode>, tight: boolean,
  dependencies: PngTreeDependencies<TNode, TCanvas>): Promise<PngTreeExportResult<TNode>> {
  let writer: FileTreeWriter | null = null;
  try {
    writer = await dependencies.writerFactory(plan.rootName);
    if (!writer) return { status: "cancelled" };
    for (const path of plan.directories) await writer.ensureDirectory(path);
    for (const item of plan.items) {
      const canvas = dependencies.boundCanvas(dependencies.renderLayer(item.node), tight);
      const output = await dependencies.encode(canvas, item.node.name);
      if (!output.blob) throw new Error("PNG encoder returned no data");
      await writer.write(item.path, output.blob);
    }
    const output = await writer.commit();
    return { status: "saved", output, directories: plan.directories, items: plan.items };
  } catch (error) {
    await writer?.abort().catch(() => undefined);
    return { status: error instanceof FileTreeUnsupportedError ? "unsupported" : "failed" };
  }
}
