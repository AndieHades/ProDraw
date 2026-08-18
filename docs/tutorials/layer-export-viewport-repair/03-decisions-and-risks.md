# Decisions and Risks

## Decisions

1. Keep ProDraw's internal bottom-first stack. Convert order only at the PSD
   boundary; changing `S.layers` would risk every compositor and drag operation.
2. Decode the generated PSD in tests. Blob size and marker-byte assertions do
   not prove the layer panel users see.
3. Add a distinct **Сохранить слои в PNG** command. The existing two actions
   remain flattened whole/cropped output, and future structural **Save as
   canvas** remains a different layered-document feature.
4. Export full-canvas leaves to retain registration. Cropped multi-file output
   would need sidecar offsets and is outside this repair.
5. Include hidden descendants because the request says all layers. Hidden state
   cannot be represented by PNG and remains a naming/tree concern only.
6. Render and write one PNG at a time through a directory session to avoid
   retaining every full document canvas or encoded file in renderer memory.
7. Filter only presentation downscaling. Export/composite source operations keep
   exact-size sampling and 100% view keeps deterministic pixel alignment.

## Risks and controls

- **PSD group markers.** Reversing the whole descriptor array would break group
  boundaries. Traverse sibling nodes top-first while retaining each group's
  end/content/start record grammar; decode nested fixtures as acceptance.
- **Folder effect placement.** Baked above/below rows must reverse together with
  child order. Test their decoded positions, not only folder names.
- **Filesystem traversal.** Validate every segment again in Electron main,
  resolve only beneath a session-owned staging root and reject non-PNG leaves.
- **Existing output.** Publish to `Name`, `Name_2`, and so on; never replace a
  prior directory or its files.
- **Partial failure.** Abort removes only the session's verified staging path.
  A crash may leave a staging directory, but never a falsely completed root.
- **Duplicate/invalid names.** Sanitize Windows-invalid characters, reserved
  device names and trailing dots/spaces before case-insensitive uniquing.
- **Filtered tile seams.** The live recovery shell scales one complete composite.
  Target tile presentation needs separate seam evidence before sharing this
  change after owner cutover.
