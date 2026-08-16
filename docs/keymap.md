# Keyboard and Pen Map

Полный typed action registry и data-driven bindings принадлежат R3/R5. Текущий
R2 runtime поддерживает pointer/pen, toolbar actions, wheel zoom, Alt+wheel
rotate и Space-pan; production не импортирует legacy keymap.

Базовые действия: brush/eraser, eyedropper, undo/redo, brush size, pan, rotate
view, fit/100%, layer commands, selection/transform, save/export. Windows `Ctrl`
и macOS/web `Meta` нормализуются как `mod` в development runtime.

Pen eraser/barrel buttons и touch gestures имеют отдельную data-driven map.
Predicted pointer samples не являются commands и никогда не коммитятся.

Старый `src/systems/keyboard/keymap.js` остаётся неисполняемым oracle до R6;
новые действия туда не добавляются.
