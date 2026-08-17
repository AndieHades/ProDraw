# Keyboard and Pen Map

Полный typed action registry принадлежит R3/R5. Текущий recovery-runtime
нормализует клавиатуру и назначенные драйвером кнопки пера через data-driven
`src/systems/keyboard/keymap.js` и запускает общие toolbar actions.

Базовые действия: brush/eraser, eyedropper, undo/redo, brush size, pan, rotate
view, fit/100%, layer commands, selection/transform, save/export. Windows `Ctrl`
и macOS/web `Meta` нормализуются как `mod` в development runtime.

Pen eraser/barrel buttons и touch gestures имеют отдельную data-driven map.
Predicted pointer samples не являются commands и никогда не коммитятся.

`B` выбирает Brush. Повторное отдельное нажатие `B`, когда Brush уже активен,
открывает компактную библиотеку; автоповтор удерживаемой клавиши игнорируется.
Кнопка стилуса, которой Windows-драйвер назначил `B`, использует тот же путь.
