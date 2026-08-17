import { $ } from '../../core/dom.js';

let creating = false;

export const isCreatingCanvas = () => creating;

export function setCreatingCanvas(on) {
  creating = on;
  const panel = $('new-ovl')?.querySelector('.new-panel');
  panel?.setAttribute('aria-busy', String(on));
  $('new-create').disabled = on;
  panel?.querySelectorAll('.new-row').forEach((element) => {
    if ('disabled' in element) element.disabled = on;
    element.classList.toggle('disabled', on);
  });
}
