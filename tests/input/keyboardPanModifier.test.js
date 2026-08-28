/** @vitest-environment jsdom */
/* global document, window, KeyboardEvent, Event */
import { afterEach, describe, expect, it } from 'vitest';
import { canvasPanModifierHeld,
  setCanvasPanModifierHeld } from '../../src/core/navigationModifiers.ts';
import { mount } from '../../src/systems/keyboard/index.js';

describe('keyboard canvas-pan modifier', () => {
  afterEach(() => setCanvasPanModifierHeld(false));

  it('tracks Space globally, clears on keyup/blur and ignores editable targets', () => {
    document.body.innerHTML = '<input id="text"><div id="plain"></div>';
    mount();
    const down = new KeyboardEvent('keydown',
      { code: 'Space', bubbles: true, cancelable: true });
    document.getElementById('plain').dispatchEvent(down);
    expect(canvasPanModifierHeld()).toBe(true); expect(down.defaultPrevented).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    expect(canvasPanModifierHeld()).toBe(false);

    const typed = new KeyboardEvent('keydown',
      { code: 'Space', bubbles: true, cancelable: true });
    document.getElementById('text').dispatchEvent(typed);
    expect(canvasPanModifierHeld()).toBe(false); expect(typed.defaultPrevented).toBe(false);

    document.getElementById('plain').dispatchEvent(new KeyboardEvent('keydown',
      { code: 'Space', bubbles: true, cancelable: true }));
    window.dispatchEvent(new Event('blur'));
    expect(canvasPanModifierHeld()).toBe(false);
  });
});
