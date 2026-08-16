// Карта хоткеев по умолчанию: комбо → имя действия. Это ДАННЫЕ — чтобы
// перенастроить, правишь здесь или через rebind() в рантайме (index.js).
// Комбо: модификатор 'mod+' (Ctrl/Cmd), 'shift+', 'alt+' + клавиша
// (буква в нижнем регистре, цифра, или '=', '-', '[', ']', 'delete'…).
export const DEFAULT_KEYMAP = {
  // инструменты
  b: 'tool.pencil', e: 'tool.eraser', f: 'tool.fill',
  m: 'tool.select', u: 'tool.line', k: 'tool.rect', q: 'tool.ellipse',
  // переключатели и панели
  l: 'ui.layers', p: 'toggle.pixelPerfect', t: 'toggle.stabilize', 'shift+t': 'tool.text',
  s: 'toggle.symV', 'shift+s': 'toggle.symH', o: 'fx.panel',
  // холст и слой
  h: 'layer.flipH', v: 'layer.flipV', r: 'canvas.rotate', c: 'canvas.crop', n: 'doc.new',
  // тайлы: флип тайла на кисти (удержан Space) — сразу видно на превью
  'space+x': 'tile.flipH', 'space+y': 'tile.flipV',
  // вид
  '=': 'zoom.in', '-': 'zoom.out', 0: 'view.fit', '[': 'brush.smaller', ']': 'brush.bigger',
  // правка
  delete: 'edit.delete', backspace: 'edit.delete',
  'mod+z': 'edit.undo', 'mod+shift+z': 'edit.redo', 'mod+y': 'edit.redo',
  'mod+c': 'edit.copy', 'mod+x': 'edit.cut', 'mod+v': 'edit.paste', 'mod+d': 'select.none',
  // слои и трансформация
  'mod+e': 'layer.merge', 'mod+g': 'layer.group', 'mod+a': 'selection.layer', 'mod+n': 'layer.add', 'mod+t': 'transform.enter',
  'mod+b': 'brush.fromSelection',
  // файл
  'mod+o': 'file.import', 'mod+s': 'file.exportPng', 'mod+shift+s': 'file.exportPsd',
};
