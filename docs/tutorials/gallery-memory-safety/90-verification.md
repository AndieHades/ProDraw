# Verification

## Automated evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| `GMS-01..03` | v1 migration plus projection/update/delete tests | passed |
| `GMS-04` | remap identity, crop/Trim and Undo performance tests | passed |
| `GMS-05` | incomplete-record projection and transaction tests | passed |
| `GMS-06` | changed-surface import/save tests and packaged smoke | passed |
| `GMS-07` | packed-row compatibility, history, persistence and A4 performance tests | passed |

Final gates are `npm run validate:changed`, `git diff --check`, task-owned diff
review and packaged desktop smoke. Validation output and commit hashes are
recorded here and in the root `Resume Here` after each stage.

Final evidence: focused remap/crop/Undo 3 files/10 tests; changed-surface 94
files/277 tests; all selected structural gates passed; packaged renderer smoke
reported workspace, file tree and alpha rendering ready.

## Dense PSD evidence

- `Items (1).psd`: 69,483,464 bytes, 4539x2553, 74 nodes, 50 pixel
  layers and 24 folders.
- Exact-file decode completed with zero compatibility warnings in about 4.2
  seconds and retained 120,280,572 bitmap bytes.
- Packed record construction completed in about 0.25 seconds with 113,529,904
  row-buffer bytes and about 14 MiB of JavaScript heap instead of exhausting a
  2 GiB heap while creating one property per opaque pixel.
- Fake-IndexedDB save/open completed with all 50 layers, source identity and a
  sampled pixel preserved. Full validation passed 118 files/350 tests plus 15
  performance files/53 tests; permanent packaged desktop smoke passed.

## Manual acceptance

The user owns final acceptance with the actual large gallery:

1. launch the permanent desktop shortcut and open the gallery;
2. select and delete the unwanted large records;
3. open one remaining recent large document;
4. apply canvas Crop and Trim, then Undo/Redo;
5. Save its source-bound PNG/PSD and confirm the original file remains writable.

Automated completion and this real-data acceptance are reported separately.
