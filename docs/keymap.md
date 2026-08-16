# Хоткеи (data-driven)

Цель: настроить/переназначить горячую клавишу = поменять **данные** в одном
месте, а не лезть в логику. Никаких простыней `if (key === …)`.

## Три части

1. **Реестр действий** `core/actions.js` — система регистрирует команду по имени:
   ```js
   import { register } from '../../core/actions.js';
   register('tool.pencil', () => setTool('pencil'));
   register('edit.undo', doUndo);
   ```
   Кто вызовет действие (хоткей, кнопка, меню) — не знает, какая система за ним.

2. **Карта хоткеев** `systems/keyboard/keymap.js` — чистые данные «комбо → имя»:
   ```js
   export const DEFAULT_KEYMAP = { b: 'tool.pencil', 'mod+z': 'edit.undo', … };
   ```

3. **Слушатель** `systems/keyboard/index.js` — нормализует событие в комбо, берёт
   действие из активной карты (дефолт + переопределения) и запускает из реестра.

## Формат комбо

`mod+` (Ctrl/Cmd, кроссплатформенно) · `shift+` · `alt+` + клавиша:
буква в нижнем регистре (`b`), цифра (`0`), либо `=`,`-`,`[`,`]`,`delete`,
`backspace`,`space`. Примеры: `b`, `shift+s`, `mod+z`, `mod+shift+s`, `]`.

## Добавить хоткей

1. Зарегистрировать действие в своей системе: `register('effect.glow', openGlowPop)`.
2. Добавить строку в `DEFAULT_KEYMAP`: `g: 'effect.glow'`.
3. Готово. Незарегистрированное или несвязанное действие просто игнорируется.

## Переназначить в рантайме (и UI настроек)

```js
import { rebind, unbind, resetKeymap, getKeymap } from './systems/keyboard/index.js';
rebind('p', 'effect.outline');  // сохранится в localStorage
unbind('r');                    // убрать привязку
resetKeymap();                  // вернуть дефолт
```

Будущий экран настроек хоткеев строится поверх `getKeymap()` + `rebind()` —
данные уже отделены от логики, UI только редактирует карту.

## Правила

- Дискретные команды — только через `register` + `keymap`. Прямых
  `addEventListener('keydown', …)` с разбором клавиш в системах быть не должно.
- Модальные `Enter`/`Escape` (кроп, трансформация) и удержание (Alt-пипетка) —
  это не дискретные хоткеи; их обрабатывают свои системы (input/crop/transform).
- Имена действий — по неймспейсам: `tool.*`, `edit.*`, `layer.*`, `file.*`,
  `view.*`, `canvas.*`, `toggle.*`, `effect.*`, `ui.*`, `doc.*`, `select.*`.
