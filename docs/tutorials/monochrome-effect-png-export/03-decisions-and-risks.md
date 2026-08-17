# Decisions and Risks

## Decisions

1. Extract a pure monochrome color helper instead of approximating the existing
   result with HSV saturation `-100`; HSV value produces a different gray.
2. Reuse generic effect history, visibility, clipboard and persistence paths.
3. Keep rendering bounded. No full A4 canvas is introduced merely to apply the
   color transform.
4. Reuse `ExportDocument` target nodes for quick layer/folder PNG.
5. Save output is flattened PNG; layer/folder structure remains the selection
   boundary, not data embedded into PNG.

## Risks

- Folder effects are drawn as separate surfaces. Acceptance must cover an outer
  monochrome folder with colored child and folder styles, not only base pixels.
- Hidden effects and hidden descendants can leak if tests inspect only output
  counts. Pixel assertions are mandatory.
- Trim may omit glow/shadow reach if bounds are calculated before compositing.
- Authored names may contain Windows-invalid characters. The derived name stays
  authoritative; platform-safe replacement is allowed only at the save edge.

## Rollback

Each stage is one commit. `ME-1` can be reverted without changing document
schema version because generic effects tolerate absence of the new type.
`ME-2` can be reverted independently to the layer-only quick action.
