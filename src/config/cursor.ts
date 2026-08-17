// Единственный режим — прозрачный контур реального следующего отпечатка.
// Универсальный круг запрещён: круглой бывает только круглая кисть.
export const CURSOR_MODES = ['real'];
export const CURSOR = { mode: 'real' };
export const CURSOR_ALPHA_THRESHOLD = 12;
export const CURSOR_LINE_WIDTH = 1.2;
// инструменты, под которыми показываем предпросмотр отпечатка (вместо нативного
// курсора): системный crosshair прячется, прицел рисует Brush Cursor Renderer.
export const CURSOR_TOOLS = ['pencil', 'eraser', 'smudge', 'line', 'adjust'];
