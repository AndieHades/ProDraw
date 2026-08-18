# Target Contract

## PSD boundary

ProDraw keeps its internal flat raster stack bottom-first. The PSD encoder writes
that same bottom-first order at every nesting depth, as confirmed by opening two
minimal raw-order fixtures in Photoshop 2026. Group boundary records stay
well-formed and optional baked folder-effect rows occupy their visual above/below
positions. The embedded composite is not used to hide a structural mismatch.

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

Source RGBA remains untouched. Canvas2D smoothing is enabled with high quality
for positive presentation scales below or above 100%. At exact 100%, smoothing
remains disabled so pixel alignment and the existing actual-size view are
unchanged.

## Export execution

Separate export measures and writes items sequentially. Shared trim bounds may
require a second render pass, but canvases and encoded blobs are never collected
for every layer at once. The export window owns one awaited run, rejects re-entry
and reports failure without changing document or gallery state.
