# Keyboard and Pen Map

Дискретные действия регистрируются в typed action registry, а bindings живут в
`src/config/keymap.ts`. UI и systems не разбирают глобальный `keydown` напрямую.

Базовые действия: brush/eraser, eyedropper, undo/redo, brush size, pan, rotate
view, fit/100%, layer commands, selection/transform, save/export. Windows `Ctrl`
и macOS/web `Meta` нормализуются как `mod` в development runtime.

Pen eraser/barrel buttons и touch gestures имеют отдельную data-driven map.
Predicted pointer samples не являются commands и никогда не коммитятся.

Старый `src/systems/keyboard/keymap.js` остаётся oracle до `R2`; новые действия
не добавляются туда без отдельной необходимости поддержать legacy runtime.
