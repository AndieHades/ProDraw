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
  let attempt = `${base}${extension}`;
  for (let index = 2; used.has(attempt.toLowerCase()); index += 1) {
    attempt = `${base}_${index}${extension}`;
  }
  used.add(attempt.toLowerCase());
  return attempt;
}

function visit(nodes: readonly FolderPngNode[], path: readonly string[],
  items: FolderPngLeafPlan[]): void {
  const used = new Set<string>();
  for (const node of nodes) {
    const fallback = node.kind === "folder" ? "Folder" : "Layer";
    const base = safeExportSegment(node.name, fallback);
    if (node.kind === "folder") {
      const folder = uniqueSegment(base, used);
      visit(node.children ?? [], [...path, folder], items);
    } else {
      const fileName = uniqueSegment(base, used, ".png");
      items.push({ path: [...path, fileName], node });
    }
  }
}

export function planFolderPngTree(root: FolderPngNode): FolderPngPlan {
  if (root.kind !== "folder") throw new Error("Folder PNG export requires a folder root");
  const items: FolderPngLeafPlan[] = [];
  visit(root.children ?? [], [], items);
  return { rootName: safeExportSegment(root.name, "Folder"), items };
}
