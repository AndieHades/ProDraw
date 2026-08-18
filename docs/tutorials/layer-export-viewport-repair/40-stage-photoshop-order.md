# LEP4: Photoshop PSD Order Correction

- Stable id: `LEP4`
- Status: `in_progress`
- Depends on: `LEP3A`
- Requirements: `LEP-PSD-03`

## Evidence

Two otherwise identical PSD files were generated with opposite raw descriptor
orders and opened in Photoshop 2026. The user confirmed `bottom-first.psd` is
correct and corrected an earlier mistaken response. ProDraw's runtime stack is
also bottom-first; its panel reverses that stack only for presentation.

## Steps

1. Restore bottom-first sibling traversal recursively in the PSD descriptor
   builder.
2. Restore baked folder rows to below, children, above order.
3. Replace top-first decoder expectations with a raw descriptor-order assertion.
4. Keep decode coverage for RGB mode, grouping and Unicode readability.
5. Run focused PSD, integration, type and lint gates.

## Acceptance

- Root and nested raw descriptors are bottom-first.
- Group grammar is boundary, bottom-first contents, header.
- The embedded composite still uses the unchanged runtime stack.
- No import, gallery-open or internal layer-order code changes.

## Completion record

- Commit: pending.
- Checks: pending.
