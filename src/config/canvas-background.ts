const WHITE = Object.freeze([255, 255, 255]);

export const DEFAULT_CANVAS_BACKGROUND = Object.freeze({
  id: 'white', label: 'new.bgWhite', color: WHITE, visible: true,
});

export const CANVAS_BACKGROUND_CHOICES = Object.freeze([
  Object.freeze({ id: 'transparent', label: 'new.bgTransparent', color: null }),
  DEFAULT_CANVAS_BACKGROUND,
  Object.freeze({ id: 'black', label: 'new.bgBlack', color: Object.freeze([0, 0, 0]) }),
]);
