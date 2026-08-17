// DOM adapter for Brightness/Contrast fields. The owning system keeps session
// state and transactions; this module only reads/writes the compact form.
import { $ } from '../../core/dom.js';
import { adjustmentParams } from '../../logic/adjustment.js';

export function controlsToParams() {
  return adjustmentParams({
    brightness: $('bc-bri').value, contrast: $('bc-con').value,
    saturation: $('bc-sat').value, hue: $('bc-hue').value,
  });
}

export function syncLabels() {
  $('bc-briv').textContent = $('bc-bri').value;
  $('bc-conv').textContent = $('bc-con').value;
  $('bc-satv').textContent = $('bc-sat').value;
  $('bc-huev').textContent = $('bc-hue').value;
}

export function setControls(params = {}) {
  const values = adjustmentParams(params);
  $('bc-bri').value = values.brightness; $('bc-con').value = values.contrast;
  $('bc-sat').value = values.saturation; $('bc-hue').value = values.hue;
  syncLabels();
}
