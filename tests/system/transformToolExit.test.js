/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as actions from '../../src/core/actions.ts';
import { S } from '../../src/core/state.js';
import { setTool } from '../../src/core/tools.js';
import '../../src/systems/transform/index.js';

describe('transform paint-tool transition', () => {
  afterEach(() => { S.rotMode = null; S.tool = 'pencil'; vi.restoreAllMocks(); });

  it.each(['pencil', 'eraser'])('applies transform before activating %s', (tool) => {
    const apply = vi.fn(() => { S.rotMode = null; return true; });
    actions.registerOrReplace('transform.apply', apply);
    S.rotMode = { active: true }; S.tool = 'pencil';

    setTool(tool);

    expect(apply).toHaveBeenCalledOnce();
    expect(S.rotMode).toBeNull(); expect(S.tool).toBe(tool);
  });

  it('does not end transform for an unrelated tool transition', () => {
    const apply = vi.fn(); actions.registerOrReplace('transform.apply', apply);
    const mode = { active: true }; S.rotMode = mode;
    setTool('line');
    expect(apply).not.toHaveBeenCalled(); expect(S.rotMode).toBe(mode);
  });
});
