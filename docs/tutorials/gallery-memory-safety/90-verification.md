# Verification

## Automated evidence

| Requirement | Evidence | Status |
| --- | --- | --- |
| `GMS-01..03` | v1 migration plus projection/update/delete tests | passed |
| `GMS-04` | remap identity, crop/Trim and Undo performance tests | passed |
| `GMS-05` | incomplete-record projection and transaction tests | passed |
| `GMS-06` | changed-surface import/save tests and packaged smoke | passed |

Final gates are `npm run validate:changed`, `git diff --check`, task-owned diff
review and packaged desktop smoke. Validation output and commit hashes are
recorded here and in the root `Resume Here` after each stage.

Final evidence: focused remap/crop/Undo 3 files/10 tests; changed-surface 94
files/277 tests; all selected structural gates passed; packaged renderer smoke
reported workspace, file tree and alpha rendering ready.

## Manual acceptance

The user owns final acceptance with the actual large gallery:

1. launch the permanent desktop shortcut and open the gallery;
2. select and delete the unwanted large records;
3. open one remaining recent large document;
4. apply canvas Crop and Trim, then Undo/Redo;
5. Save its source-bound PNG/PSD and confirm the original file remains writable.

Automated completion and this real-data acceptance are reported separately.
