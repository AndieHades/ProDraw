# Decisions and Risks

## Decisions

1. Use Electron as the initial Windows shell because the reference repository
   already proves its packaging/validation workflow and Chromium exposes Pointer
   Events pressure/tilt. Platform ports keep a later shell replacement possible.
2. Use Canvas2D/OffscreenCanvas for the first correct renderer behind a typed
   `RasterSurface`; allow a later WebGL/WebGPU backend without changing systems.
3. Use 256×256 lazy RGBA tiles and dirty rectangles. This avoids allocating
   256 MiB for every untouched 8192² layer.
4. Store physical DPI metadata but keep painting coordinates in pixels.
5. Default transform filtering to Lanczos3 for painted art, with Nearest exposed
   for hard-edge/game assets. View filtering is presentation-only.
6. Do not attempt file-by-file TypeScript conversion of the obsolete grid engine.
   New production paths are strict TS; old JS remains outside the new check until
   its behaviour is ported and it is deleted in `R6`.

## Risks and mitigations

| Risk | Mitigation / clearing evidence |
| --- | --- |
| Procreate archive references missing stock Shape/Grain | procedural named fallbacks, compatibility badge, distinct-stroke tests; exact parity only after legal source assets are supplied |
| Canvas/browser maximum texture dimensions | tiled surfaces; export/composite iterates tiles rather than one giant GPU texture |
| Electron increases package size | narrow adapter and packaging report; revisit shell only after working tablet build |
| Pointer pressure varies by tablet driver | log-free diagnostics view and smoke matrix for pen/mouse/touch fallbacks |
| Lanczos/Liquify cost on A4/4K | dirty bounds, worker/offscreen execution, preview quality tiers, one final high-quality pass |
| Old IndexedDB format is pixel-grid based | read-only legacy importer is a separate optional migration; no dual-write |
| Replacing entrypoint temporarily drops old features | cut over only when R2 minimum is playable; retain old commit as oracle and list deferred parity visibly |

## Rollback

Each stage is independently revertible. `R1` does not change the product
entrypoint. `R2` cutover is one commit and can be reverted without rewriting
legacy saves. Document migration never deletes a legacy record before a verified
new-format write.
