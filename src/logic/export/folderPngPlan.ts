export interface FolderPngFolderNode {
  readonly kind: "folder";
  readonly name: string;
  readonly children?: readonly FolderPngNode[];
}

export interface FolderPngLayerNode { readonly kind: "layer"; readonly name: string }
export type FolderPngNode = FolderPngFolderNode | FolderPngLayerNode;

export interface FolderPngLeafPlan {
  readonly path: readonly string[];
  readonly node: FolderPngLayerNode;
}

export interface FolderPngPlan {
  readonly rootName: string;
  readonly directories: readonly (readonly string[])[];
  readonly items: readonly FolderPngLeafPlan[];
}

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const INVALID = '<>:"/\\|?*';
const MAX_SEGMENT_CHARS = 96;

export function safeExportSegment(value: string, fallback: string): string {
  let segment = Array.from(String(value).trim(), (character) =>
    character.charCodeAt(0) < 32 || INVALID.includes(character) ? "_" : character)
    .join("").replace(/[. ]+$/g, "");
  segment = Array.from(segment).slice(0, MAX_SEGMENT_CHARS).join("");
  if (!segment) segment = fallback;
  if (RESERVED.test(segment)) segment = `_${segment}`;
  return segment;
}

function uniqueSegment(base: string, used: Set<string>, extension = ""): string {
  for (let index = 1; index < 10000; index += 1) {
    const suffix = index === 1 ? "" : `_${index}`;
    const stem = Array.from(base).slice(0,
      MAX_SEGMENT_CHARS - suffix.length - extension.length).join("");
    const attempt = `${stem}${suffix}${extension}`;
    if (used.has(attempt.toLowerCase())) continue;
    used.add(attempt.toLowerCase()); return attempt;
  }
  throw new Error("Could not reserve a unique export path");
}

function visit(nodes: readonly FolderPngNode[], path: readonly string[],
  directories: (readonly string[])[], items: FolderPngLeafPlan[]): void {
  const used = new Set<string>();
  for (const node of nodes) {
    const fallback = node.kind === "folder" ? "Folder" : "Layer";
    const base = safeExportSegment(node.name, fallback);
    if (node.kind === "folder") {
      const folder = uniqueSegment(base, used);
      const directory = [...path, folder];
      directories.push(directory);
      visit(node.children ?? [], directory, directories, items);
    } else {
      const fileName = uniqueSegment(base, used, ".png");
      items.push({ path: [...path, fileName], node });
    }
  }
}

export function planFolderPngTree(root: FolderPngNode): FolderPngPlan {
  if (root.kind !== "folder") throw new Error("Folder PNG export requires a folder root");
  return planSelectedPngTree(root.name, [root]);
}

export function planSelectedPngTree(rootName: string,
  roots: readonly FolderPngNode[]): FolderPngPlan {
  const directories: (readonly string[])[] = [];
  const items: FolderPngLeafPlan[] = [];
  const nodes = roots.length === 1 && roots[0]?.kind === "folder"
    ? roots[0].children ?? [] : roots;
  visit(nodes, [], directories, items);
  return { rootName: safeExportSegment(rootName, "Layers"), directories, items };
}
