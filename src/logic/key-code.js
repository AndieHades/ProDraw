// Физическая клавиша из KeyboardEvent.code → имя в карте хоткеев. Зависит от
// раскладки НЕ зависит (code — позиция клавиши, не введённый символ), поэтому
// 'd' работает и в кириллице. Чистая строковая логика — без DOM и state.
export const SPECIAL = { Equal: '=', NumpadAdd: '=', Minus: '-', NumpadSubtract: '-',
  BracketLeft: '[', BracketRight: ']', Delete: 'delete', Backspace: 'backspace', Space: 'space' };

export function keyName(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(code)) return code.replace(/^\D+/, '');
  return SPECIAL[code] || null;
}

// модификаторы по позиции (left/right → одно имя). Тоже не зависят от раскладки.
const MODS = { AltLeft: 'alt', AltRight: 'alt', ControlLeft: 'control', ControlRight: 'control',
  ShiftLeft: 'shift', ShiftRight: 'shift', MetaLeft: 'meta', MetaRight: 'meta' };

// Стабильное имя клавиши для произвольного хоткея (буква/цифра/спец/модификатор)
// по физической позиции — одинаково в любой раскладке. null — клавиша без имени.
export function eventKey(e) { return keyName(e.code) || MODS[e.code] || null; }
