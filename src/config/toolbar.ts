// Данные кнопок тулбара: SVG-иконки + таблицы режимов (кисть/линия/фигура/
// симметрия/флип). Не логика — состав и вид правятся здесь, поведение в
// systems/toolbars.js. `icon` ссылается на ключ ICONS, `key`/`onKey`/`offKey` —
// на i18n, `action` — на core/actions.
export const ICONS = {
  pencil: '<svg viewBox="0 0 24 24"><path d="M4.5 19.5l.9-3.6L16.6 4.7a2.05 2.05 0 0 1 2.9 2.9L8.3 18.8l-3.8.7z"/><path d="M14.7 6.6l2.9 2.9"/></svg>',
  shading: '<svg viewBox="0 0 24 24"><path d="M5 17.5c2.2-6.8 7.5-11.2 14-12"/><path d="M5 17.5h14"/><path d="M8 14.5h3.2M11 11.5h3.2M14 8.5h3.2"/></svg>',
  line: '<svg viewBox="0 0 24 24"><path d="M6 18 18 6"/></svg>',
  contour: '<svg viewBox="0 0 24 24"><path d="M5 15c1.3-6.5 8.6-10.2 12.6-5.4 3.7 4.4-1.4 9.5-7.2 8.6-2.7-.4-4.6-1.5-5.4-3.2z"/></svg>',
  rect: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  rectFill: '<svg viewBox="0 0 24 24"><rect x="4.5" y="6.5" width="15" height="11" rx="1.5" fill="currentColor"/><rect x="4.5" y="6.5" width="15" height="11" rx="1.5"/></svg>',
  ellipse: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
  ellipseFill: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="7.5" ry="5.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="7.5" ry="5.5"/></svg>',
  symV: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/></svg>',
  symH: '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/></svg>',
  symD1: '<svg viewBox="0 0 24 24"><path d="M5 19 19 5" stroke-dasharray="3 3"/><path d="M6 11l-3 3 3 3"/><path d="M18 7l3 3-3 3"/></svg>',
  symD2: '<svg viewBox="0 0 24 24"><path d="M5 5 19 19" stroke-dasharray="3 3"/><path d="M6 13l-3-3 3-3"/><path d="M18 17l3-3-3-3"/></svg>',
  symBoth: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/><path d="M8 8l4-4 4 4M8 16l4 4 4-4"/></svg>',
  symMulti: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16" stroke-dasharray="3 3"/><path d="M6 18 18 6" stroke-dasharray="3 3"/><path d="M6 6 18 18" stroke-dasharray="3 3"/></svg>',
  symMove: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M8 8l4-4 4 4"/><path d="M8 16l4 4 4-4"/></svg>',
  symReset: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="3 3"/><path d="M4 12h16"/><path d="M8.5 7.5A5 5 0 1 1 7 11"/><path d="M7 7.5v3.5h3.5"/></svg>',
  flipH: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M8 7.5v9L3.8 12 8 7.5z" fill="currentColor" stroke="none"/><path d="M16 7.5v9l4.2-4.5L16 7.5z" fill="currentColor" stroke="none"/></svg>',
  flipV: '<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke-dasharray="2 2"/><path d="M7.5 8h9L12 3.8 7.5 8z" fill="currentColor" stroke="none"/><path d="M7.5 16h9L12 20.2 7.5 16z" fill="currentColor" stroke="none"/></svg>',
  transformCanvas: '<svg viewBox="0 0 24 24"><path d="M12 4v16" stroke-dasharray="2 2"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M18.5 6.5A6.5 6.5 0 0 0 7.5 5"/><path d="M7.5 2.5V5h2.5"/></svg>',
  rotate90: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-7-7"/><path d="M9.8 2.6L12.4 5l-2.6 2.4"/></svg>',
  center: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg>',
  centerFit: '<svg viewBox="0 0 24 24"><rect x="5.5" y="5.5" width="13" height="13" rx="2"/><path d="M8.5 12h7M12 8.5v7"/><path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4"/></svg>',
  zoomReal: '<svg viewBox="0 0 24 24"><text x="12" y="15.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="currentColor" stroke="none">1:1</text></svg>',
  zoomIn: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M10.5 7.5v6M7.5 10.5h6"/><path d="M15.2 15.2 20 20"/></svg>',
  zoomOut: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M7.5 10.5h6"/><path d="M15.2 15.2 20 20"/></svg>',
  adjDodge: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>',
  adjBurn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none"/><path d="M12 6.5v11"/></svg>',
  adjColorize: '<svg viewBox="0 0 24 24"><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/><path d="M8.5 16.5h7" stroke-dasharray="2 2"/></svg>',
  adjMono: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M12 5v14" stroke-dasharray="2 2"/><path d="M12 5h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-4z" fill="currentColor" stroke="none"/></svg>',
};

export const BRUSH_MODES = [
  { mode: 'normal', icon: 'pencil', key: 'tool.pencil' },
  { mode: 'shading', icon: 'shading', key: 'tool.brushShading' },
];
export const LINE_MODES = [
  { mode: 'line', icon: 'line', key: 'tool.lineStraight' },
  { mode: 'contour', icon: 'contour', key: 'tool.lineContour' },
];
export const SHAPE_MODES = [
  { tool: 'rect', fill: false, icon: 'rect', key: 'tool.rect' },
  { tool: 'rect', fill: true, icon: 'rectFill', key: 'tool.rectFill' },
  { tool: 'ellipse', fill: false, icon: 'ellipse', key: 'tool.ellipse' },
  { tool: 'ellipse', fill: true, icon: 'ellipseFill', key: 'tool.ellipseFill' },
];
export const SYM_MODES = [
  { flag: 'sym', icon: 'symV', key: 'side.symV', onKey: 'toast.symVon', offKey: 'toast.symVoff' },
  { flag: 'symH', icon: 'symH', key: 'side.symH', onKey: 'toast.symHon', offKey: 'toast.symHoff' },
  { flag: 'symD1', icon: 'symD1', key: 'side.symD1', onKey: 'toast.symD1on', offKey: 'toast.symD1off' },
  { flag: 'symD2', icon: 'symD2', key: 'side.symD2', onKey: 'toast.symD2on', offKey: 'toast.symD2off' },
];
export const SYM_TOOLS = [
  { mode: 'move', icon: 'symMove', key: 'side.symMove' },
  { mode: 'reset', icon: 'symReset', key: 'side.symReset' },
];
export const FLIP_MODES = [
  { mode: 'h', icon: 'flipH', key: 'side.flipH', action: 'layer.flipH' },
  { mode: 'v', icon: 'flipV', key: 'side.flipV', action: 'layer.flipV' },
  { mode: 'r', icon: 'rotate90', key: 'side.rotate', action: 'canvas.rotate' },
];
export const CENTER_MODES = [
  { mode: 'center', icon: 'center', key: 'side.center', action: 'layer.center' },
  { mode: 'fitShortSide', icon: 'centerFit', key: 'side.centerFit', action: 'layer.fitShortSide' },
];
export const ZOOM_MODES = [
  { mode: 'fit', icon: 'zoomReal', key: 'tool.realSize', action: 'view.realSize' },
  { mode: 'in', icon: 'zoomIn', key: 'tool.zoomIn', action: 'zoom.in' },
  { mode: 'out', icon: 'zoomOut', key: 'tool.zoomOut', action: 'zoom.out' },
];
export const ADJUST_MODES = [
  { mode: 'dodge', icon: 'adjDodge', key: 'adj.dodge' },
  { mode: 'burn', icon: 'adjBurn', key: 'adj.burn' },
  { mode: 'colorize', icon: 'adjColorize', key: 'adj.colorize' },
  { mode: 'mono', icon: 'adjMono', key: 'adj.mono' },
];
