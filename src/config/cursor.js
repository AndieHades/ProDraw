// Cursor Preview Mode: как выглядит курсор-предпросмотр отпечатка кисти.
// 'real' — реальная форма кисти, 'circle' — только круг размера (для слабых
// устройств). По умолчанию — Real Brush.
export const CURSOR_MODES = ['real', 'circle'];
export const CURSOR = { mode: 'real' };
// инструменты, под которыми показываем предпросмотр отпечатка (вместо нативного
// курсора): системный crosshair прячется, прицел рисует Brush Cursor Renderer.
export const CURSOR_TOOLS = ['pencil', 'eraser', 'line', 'adjust'];
