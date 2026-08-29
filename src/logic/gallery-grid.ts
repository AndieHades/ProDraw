export interface GalleryGridItem {
  readonly id: string;
  readonly name?: string;
  readonly order?: number;
  readonly updated?: number;
}
const rank = (item: GalleryGridItem): number => item.order || item.updated || 0;
const byName = (left: GalleryGridItem, right: GalleryGridItem): number =>
  String(left.name || "").localeCompare(String(right.name || ""));
const byId = (left: GalleryGridItem, right: GalleryGridItem): number =>
  String(left.id || "").localeCompare(String(right.id || ""));

export function sortGalleryItems<T extends GalleryGridItem>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => rank(right) - rank(left) ||
    byName(left, right) || byId(left, right));
}
export function reorderedIds<T extends GalleryGridItem>(items: readonly T[],
  ids: readonly string[], beforeId: string | null | undefined): string[] | null {
  const selected = new Set(ids);
  const moving = sortGalleryItems(items.filter((item) => selected.has(item.id)));
  if (!moving.length) return null;
  const rest = sortGalleryItems(items.filter((item) => !selected.has(item.id)));
  let index = beforeId ? rest.findIndex((item) => item.id === beforeId) : -1;
  if (index < 0) index = rest.length;
  return [...rest.slice(0, index), ...moving, ...rest.slice(index)].map((item) => item.id);
}
