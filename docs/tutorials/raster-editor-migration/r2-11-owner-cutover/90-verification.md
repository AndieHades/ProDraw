# Verification

## Stage gates

| Stage | Required focused evidence | Aggregate gate |
| --- | --- | --- |
| `C0` | validator rejections, IPC sender rejection, audit/brand/error UI | changed + browser |
| `C1` | DOM/order/ARIA, windows, RU/EN/theme, lazy failures | validate + browser |
| `C2` | input/RGBA/history/render/autosave plus A4 budgets | validate + performance |
| `C3` | tree/effects/selection/Undo/export/reopen matrix | validate + package |
| `C4` | source hashes, tools/text/colour/view multi-input matrix | validate + package |
| `C5` | gallery/files/tile/animation round trips and failures | validate + package |
| `C6` | graph/absence, fresh profile and final scenario | full/package/browser |

## Per-workflow evidence

Every parity workflow records:

1. its typed command and owning system/core contract;
2. the view-model/UI control that dispatches it;
3. positive observable state/output;
4. no-op, cancel and failure behaviour;
5. Undo/Redo boundary when mutating;
6. save/reopen or explicit non-persistent classification;
7. mouse, pen, touch and keyboard access as applicable;
8. proof that production imports no retired owner.

## Continuous invariants

- exact current DOM/tool order and floating panels;
- no `any`, `ts-nocheck`, cross-system imports or DOM contracts;
- no full-document work on pointer or view-only paths;
- byte-bounded history and two-generation recovery;
- one corrupt optional asset cannot block app startup;
- RU/EN visible strings and theme-owned UI values;
- no high/critical dependency finding.

## Final scenario

From a fresh Windows profile: gallery New 800x600 and A4, draw with every brush,
Smudge/Fill/Shapes, create folders/effects/selections/text/tile/animation content,
transform through repeated previews, save/restart/reopen, then export PNG/PSD and
Save as Canvas scopes. UI placement and shortcuts survive restart; source hashes,
RGBA output, history and recovery match focused evidence.

## Manual evidence

Run packaged Huion pressure, tilt, eraser, barrel, palm, focus-loss, dot, fast
lift and long-curve matrix. If hardware is unavailable, automated trace evidence
must pass and the physical matrix remains explicitly skipped rather than implied.
