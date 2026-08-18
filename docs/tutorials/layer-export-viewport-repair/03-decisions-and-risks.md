# Decisions and Risks

## Decisions

1. Keep ProDraw's internal bottom-first stack and preserve it at the PSD record
   boundary. Physical Photoshop validation owns order acceptance; the installed
   decoder's tree convention is useful for structure, not panel direction.
2. Assert descriptor order and group grammar before writing, then retain decoder
   coverage for file readability and Unicode names.
3. Add a distinct **Сохранить слои в PNG** command. The existing two actions
   remain flattened whole/cropped output, and future structural **Save as
   canvas** remains a different layered-document feature.
4. Export full-canvas leaves to retain registration. Cropped multi-file output
   would need sidecar offsets and is outside this repair.
5. Include hidden descendants because the request says all layers. Hidden state
   cannot be represented by PNG and remains a naming/tree concern only.
6. Render and write one PNG at a time through a directory session to avoid
   retaining every full document canvas or encoded file in renderer memory.
7. Filter scaled presentation in both directions. Export/composite source
   operations keep exact-size sampling and 100% keeps pixel alignment.
8. Stream separate items through render, encode and save. Shared trim performs a
   bounded measurement pass rather than retaining all rendered canvases.

## Risks and controls

- **PSD group markers.** Retain each group's bottom boundary, bottom-first
  contents and top header grammar. A raw descriptor assertion prevents another
  decoder-convention reversal.
- **Folder effect placement.** Baked above/below rows must reverse together with
  child order. Test their decoded positions, not only folder names.
- **Filesystem traversal.** Validate every segment again in Electron main,
  resolve only beneath a session-owned staging root and reject non-PNG leaves.
- **Existing output.** Publish to `Name`, `Name_2`, and so on; never replace a
  prior directory or its files.
- **Partial failure.** Abort removes only the session's verified staging path.
  A crash may leave a staging directory, but never a falsely completed root.
- **Renderer memory.** Layered PSD still scales with encoded layer content, but
  separate export no longer multiplies that cost by retaining every output.
- **Duplicate/invalid names.** Sanitize Windows-invalid characters, reserved
  device names and trailing dots/spaces before case-insensitive uniquing.
- **Filtered tile seams.** The live recovery shell scales one complete composite.
  Target tile presentation needs separate seam evidence before sharing this
  change after owner cutover.
