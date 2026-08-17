# PSD1: Safe Structural Decoder

- Stable id: `PSD1`
- Depends on: `PSD0`
- Status: `in_progress`

## Scope

- Add decoder dependency and a ProDraw-owned TypeScript adapter.
- Add normalized document/layer/group/mask/effect contracts.
- Preflight signature/version/dimensions and configurable allocation limits.
- Convert decoder image data into document-coordinate RGBA without losing alpha.
- Normalize groups, metadata, blend modes, clipping, locks, masks and effects.

## Failure Cases

Invalid signature/version, truncated data, unsupported colour/depth without a
rendered bitmap, oversized dimensions and absurd node counts return typed errors.
One malformed effect becomes a warning and does not erase the layer bitmap.

## Checks

Focused decoder tests cover raw/RLE/ZIP fixtures through the dependency, nested
groups, Unicode names, offset alpha/masks, clipping, opacity/blend metadata,
effect normalization and every rejection limit. Run typecheck, targeted lint,
docs and line gates.

## Completion Record

- Commit: pending
- Checks: pending
- Residual risk: pending
