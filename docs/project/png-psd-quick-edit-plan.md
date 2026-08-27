# PNG/PSD quick edit plan

- Status: `ready`
- Owner: production legacy shell (`index.html -> legacy-entry.js -> app.js`)
- Baseline: `aset-editor@65a6b21`, 2026-08-26
- Stage: `QED1`

## Evidence baseline

- `src/systems/import/index.js` routes a dropped PSD to a separate gallery
  document, but does not provide its desktop path. A dropped PNG over the open
  editor is inserted into the current document instead.
- `src/systems/import/desktop-file.js` preserves a path only for files selected
  through the native Open dialog.
- `src/systems/document-save.js` and `src/systems/psd-save.js` can overwrite an
  opened `.psd`; no equivalent source-bound PNG saver exists.
- `desktop/electron-ipc.mjs` rejects existing-path writes outside `.prodraw` and
  `.psd`, and the preload exposes no safe dropped-file path resolver.
- Gallery records already persist the generic `sourceFormat` and
  `sourceLocation` fields, so reopening can retain either source binding.

## Target contract

- `QED-01`: dropping a PNG or PSD over either gallery or editor immediately
  opens it as a separate gallery document; it never inserts into the current
  layer tree and opens no conversion prompt.
- `QED-02`: the desktop drop route obtains the real source path through the
  sandboxed preload. Browser fallback may open the file without a writable path.
- `QED-03`: PNG opens at native dimensions as one editable RGBA layer and keeps
  transparency. PSD keeps its editable imported layer/folder structure.
- `QED-04`: ordinary Save atomically overwrites the remembered source path.
  PNG writes the current visible full-canvas composite; PSD writes layered PSD.
- `QED-05`: gallery autosave remains separate from source-file Save and retains
  the source binding across gallery close, restart and reopen.
- `QED-06`: unsupported files and decode/write failures leave the current work
  intact and report failure through localized feedback.

## QED1 change map

1. Expose an allowlisted dropped-file location resolver from Electron preload
   and permit atomic existing-path writes to `.png`.
2. Route recognized PNG/PSD drops through separate-document gallery commands,
   carrying the resolved source path.
3. Add a transactional native-size PNG document builder and persist its source
   metadata in the existing gallery record.
4. Generalize Save feedback and dispatch to PNG or PSD source encoders.
5. Cover drop routing, source metadata, exact PNG save bytes/path, PSD path
   propagation and desktop write allowlisting.

## Verification

- Focused import/source-save/platform tests.
- `npm run check`, targeted ESLint, docs and line gates.
- `npm run validate:changed`.
- `npm run package:desktop`, including packaged renderer smoke.
- Manual visual acceptance: user opens the permanent shortcut, drops real PNG
  and PSD over gallery/editor, edits, saves and confirms the original files.

## Completion definition

- Both drop surfaces share the same format route and source-path behavior.
- Save performs no dialog for a path-bound PNG/PSD and preserves current format.
- Gallery reopen retains that path binding.
- Focused/full gates and packaged desktop smoke pass; branch is committed/pushed.

## Resume Here

- Current stage: `QED1`
- Status: `ready`
- Last completed stage: plan/evidence baseline
- Next action: implement dropped-file path bridge and PNG document transaction
- Blockers: none
- Working paths: `desktop`, `src/contracts`, `src/systems/import`,
  `src/systems/gallery`, `src/systems/document-save.js`, `tests`
- Last checks: evidence-only source inspection
- Last updated: 2026-08-26
