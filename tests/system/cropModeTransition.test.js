/** @vitest-environment jsdom */
/* global document */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newLayer, S } from '../../src/core/state.js';
import * as actions from '../../src/core/actions.ts';
import { cancelCrop, toggleCrop } from '../../src/systems/crop.js';

describe('Crop mode transition', () => {
  let applyTransform;
  beforeEach(() => {
    document.body.innerHTML = '<canvas id="cv"></canvas><button id="crop"></button>' +
      '<div id="cropbar"></div><input id="crop-w"><input id="crop-h">' +
      '<span id="crop-px"></span>';
    S.W = S.H = 8; S.layers = [newLayer('Layer', 8, 8)]; S.cur = 0;
    S.sel = S.selMask = S.cropMode = S.rotMode = null; S.tool = 'pencil';
    applyTransform = vi.fn(() => { S.rotMode = null; });
    actions.registerOrReplace('transform.apply', applyTransform);
  });
  afterEach(() => { if (S.cropMode) cancelCrop(); S.rotMode = null; });

  it('ends Transform before opening Crop', () => {
    S.rotMode = { active: true };
    toggleCrop(); expect(S.rotMode).toBeNull(); expect(S.cropMode).not.toBeNull();
    expect(applyTransform).toHaveBeenCalledOnce();
  });

  it('returns the legacy Move tool to Pencil', () => {
    S.tool = 'move'; toggleCrop();
    expect(S.tool).toBe('pencil'); expect(S.cropMode).not.toBeNull();
  });
});
