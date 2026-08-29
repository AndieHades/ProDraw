import { lineAdvance } from '../../logic/text-layout.ts';

export const editorText = (editor) =>
  (editor.innerText ?? editor.textContent).replace(/\n$/, '');

export function setEditorText(editor, value) {
  editor.textContent = value; editor.innerText = value; return editor;
}

export function placeTextEditor(editor, canvas, src, font, view) {
  const rect = canvas.getBoundingClientRect(), zoom = view.zoom, box = src.box;
  const transform = src.transform;
  editor.style.left = rect.left + view.ox +
    (box.x + box.w / 2 + transform.x) * zoom + 'px';
  editor.style.top = rect.top + view.oy +
    (box.y + box.h / 2 + transform.y) * zoom + 'px';
  editor.style.width = Math.max(24, box.w * zoom) + 'px';
  editor.style.minHeight = Math.max(18, box.h * zoom) + 'px';
  editor.style.fontSize = Math.max(10, src.size * zoom) + 'px';
  editor.style.lineHeight = Math.max(12, lineAdvance(src) * zoom) + 'px';
  editor.style.fontFamily = font.family; editor.style.color = src.color;
  editor.style.letterSpacing = src.letterSpacing * zoom + 'px';
  editor.style.textAlign = src.align;
  editor.style.textTransform = src.uppercase ? 'uppercase' : 'none';
  editor.style.transform = `translate(-50%, -50%) rotate(${transform.rotation}rad) ` +
    `scale(${transform.scaleX}, ${transform.scaleY})`;
}
