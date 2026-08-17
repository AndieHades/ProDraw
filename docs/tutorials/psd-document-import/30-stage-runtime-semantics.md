# PSD3: Masks, Blend Modes and Effects

- Stable id: `PSD3`
- Depends on: `PSD2`
- Status: `done`

## Scope

- Persist/clone layer masks and PSD compatibility metadata.
- Apply masks before clipping/effects and expose mask state in layer metadata.
- Add complete blend-mode compositing, including isolated/pass-through groups.
- Map decoded drop/inner shadow, glow, stroke and overlays to non-destructive
  effects; add bounded renderers for missing equivalents selected by fixtures.
- Preserve effect opacity, visibility, colour, size, angle and offsets.

## Checks

Golden RGBA fixtures cover nested group opacity, clipping plus mask, alpha edge
values, every blend family and each normalized effect. Toggle visibility/mask,
save/reopen, merge/export and Undo paths retain the same visible result.

## Completion Record

- Commit: `d0228af` (`feat: render imported psd semantics`)
- Checks: 31 blend modes, mask density/relative coordinates, exact alpha edge,
  ordered mask/clipping/group/effect blend fixture, all decoded effect families,
  nested isolated/pass-through groups, gallery persistence, 393 module
  integration checks, TypeScript/lint/cutover/cycles/lines and production build
- Residual risk: Photoshop pattern resources remain metadata-only; feather,
  noise-gradient, inner-glow, bevel, satin and height-family rendering are
  deterministic approximations and create compatibility warnings
