# LEP1: PSD Structural Order

- Stable id: `LEP1`
- Status: `ready`
- Depends on: `LEP0`
- Requirements: `LEP-PSD-01`, `LEP-PSD-02`

## Change map

- `src/systems/export/psd.js`: map bottom-first export nodes to top-first PSD
  records recursively and place baked folder-effect rows correctly.
- `src/systems/export/psd-write.js`: declare RGB colour mode.
- `test/module-int.mjs` or a focused export test: decode the generated PSD and
  compare nested panel order, group boundaries and composite contract.

## Steps

1. Build a nested source stack whose top/bottom rows produce distinguishable
   colours and whose group is positioned between root siblings.
2. Assert the current decoded PSD panel order fails against the source tree.
3. Reverse sibling traversal only at PSD descriptor emission.
4. Emit group content in panel order: above effect, top-first children, below
   effect, while retaining the required group boundary records.
5. Change the header colour-mode id from CMYK to RGB.
6. Decode the result with the installed adapter and compare names/hierarchy.

## Failure and edge cases

Empty/nested groups remain valid. Unicode `luni` names survive. Hidden/open state
does not affect record position. The flattened composite bytes remain generated
from the original bottom-first tree and are not reordered.

## Acceptance

- Decoder returns root and nested children top-first, matching the layer panel.
- Exported RGB PSD decodes without modifying bytes.
- Moving a decoded row changes canvas order in the same direction the panel shows.
- Existing PSD import/order and export integration tests remain green.

## Completion record

- Commit: pending
- Checks: pending
- Residual risk: physical Photoshop comparison remains a named manual check.
