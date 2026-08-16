export const FOLDER_PALETTE_URLS = import.meta.glob('../app-folders/palettes/*.{png,jpg,jpeg,gif,webp,bmp,avif}', {
  query: '?url',
  import: 'default',
  eager: true,
});
