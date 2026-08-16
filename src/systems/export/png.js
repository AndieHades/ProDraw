// PNG-формат: склеенный canvas → PNG-блоб. Объявляет возможности (слои не
// поддерживает — UI сам отключит режим «со слоями»).
export const PNG = {
  id: 'png', label: 'PNG', ext: 'png', mime: 'image/png', desc: 'PNG',
  supportsFlattened: true, supportsLayered: false, supportsSeparateFiles: true,
  supportsFolders: false, supportsLayerEffects: false, supportsHiddenLayers: false,
  encode(canvas, name) {
    return new Promise((res) => canvas.toBlob((b) => res({ name: name + '.png', blob: b, mime: this.mime, desc: this.desc }), 'image/png'));
  },
};
