# Target Contract

## PSD boundary

ProDraw keeps its internal flat raster stack bottom-first. The PSD encoder alone
maps every sibling collection to top-first records. Group boundary records stay
well-formed, nested group order is mapped recursively, and optional baked folder
effect rows occupy their visual above/below positions. The embedded composite is
not used to hide a structural mismatch.

The writer declares RGB mode for R, G, B and alpha channels. A decoder round trip
must recover Unicode names, groups and sibling order without patching bytes.

## Folder layers to PNG

The third folder-only RMB action takes the clicked folder as its immutable root.
It includes all descendant paint layers, including hidden branches, and plans
collision-safe relative paths before the first write:

```text
Clicked folder/
  Direct layer.png
  Child folder/
    Nested layer.png
```

Every file uses the document's full pixel dimensions and transparent space so
the files can be recombined without losing registration. Each leaf is rendered
with its own enabled effects. Visibility and group-wide effects are structural
context and are not baked repeatedly into independent leaf PNGs.

The Windows adapter asks for a parent directory once, writes to an allowlisted
staging tree and atomically publishes a new unique root directory on completion.
Renderer requests contain only normalized path segments and PNG bytes. The web
development adapter uses the File System Access directory API when available;
unsupported browsers report a localized limitation rather than pretending that
separate downloads preserved folders.

## Viewport presentation

Source RGBA remains untouched. When the effective presentation scale is below
one source pixel per display pixel, Canvas2D smoothing is enabled with high
quality before the composite draw. At exact 100%, smoothing remains disabled so
pixel alignment and the existing actual-size view are unchanged.
