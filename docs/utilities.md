# Переиспользуемые возможности

Старые JS helpers не считаются API: большинство принимает pixel grids и не
подходит для полноцветных больших документов.

Перед новым helper сначала проверь целевые владельцы:

- pure geometry/resampling/stroke math → `src/logic`;
- RGBA tile/surface/history/bus → `src/core`;
- DOM construction/view model binding → `src/ui`;
- filesystem/clipboard/window → `src/platform`;
- numeric/preset limits → `src/config`.

Переиспользование старого алгоритма допустимо после извлечения чистого контракта,
TypeScript-типизации и focused tests. Прямой import старого system запрещён.
Текущие проверяемые public helpers: `RasterSurface`, `TileHistory`,
`RasterDocument`, `compositeTile*`, `renderBrushDab`, `fit/zoom/rotateViewAt`,
`validateCanvasSize`, `serialize/restoreDocument` и `setPngDpi`.
