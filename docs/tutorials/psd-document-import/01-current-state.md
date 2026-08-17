# Current State Audit

Baseline: clean `main@440b0cb`, synchronized with `origin/main`.

## Confirmed Behaviour

- Production still boots `index.html -> src/legacy-entry.js`; the preserved
  gallery/runtime is the observable owner during the TypeScript cutover.
- Gallery Import calls `readPsd` and then `newWorkFromLayers`.
- Editor File/Ctrl+O calls `insertPsd`, which inserts a folder into the current
  document instead of creating a separate gallery work.
- Window drop selects only files whose MIME starts with `image/`; a PSD with an
  empty or vendor MIME is rejected, while a vendor image MIME reaches `Image`
  decoding instead of the PSD reader.
- The hand-written reader accepts only 8-bit channel data with Raw/PackBits and
  returns a flat record list. It discards DPI, blend mode, layer opacity, mask
  pixels and alpha values below 8.
- `newWorkFromLayers` discards decoded visibility, groups and effects by creating
  every imported layer as visible, root-level, opacity 1 and effect-free.
- Gallery persistence already stores layer/folder objects and waits for current
  work to save before a normal New/Open transition.

## Evidence

- Routing: `src/systems/import/index.js`, `src/systems/import/editor.js`,
  `src/systems/gallery/index.js`.
- Decode: `src/logic/psd.js`, `src/logic/psd-effects.js`.
- Document creation/persistence: `src/systems/gallery/doc.js`,
  `src/systems/gallery/record.js`, `src/systems/gallery/record-clone.js`.
- Existing shallow PSD proof: `test/module-int.mjs`, case 066.

## Gap

The application has a PSD-shaped path but not a document interchange contract.
Catalog/import presence is not runtime parity: current gallery import visibly
flattens metadata, editor import violates the requested new-file rule, and drop
does not reliably recognize PSD at all.
