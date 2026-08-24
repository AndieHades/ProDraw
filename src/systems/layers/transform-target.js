// Смена слоя не должна выбрасывать уже изменённую свободную трансформацию.
// Transform остаётся владельцем Apply/Enter через команды, не через импорт системы.
import { S } from '../../core/state.js';
import * as actions from '../../core/actions.ts';

export function switchLayerDuringTransform(change) {
  const resume = Boolean(S.rotMode);
  if (resume) actions.run('transform.apply');
  change();
  if (resume) actions.run('transform.enter');
}
