// Native open dialog keeps the source location of a PSD, so Ctrl+S can write
// its updated layered bytes back to the same desktop file.
export const PSD_FILTERS = [{ name: 'Photoshop PSD', extensions: ['psd', 'psb'] }];
export const IMPORT_FILTERS = [...PSD_FILTERS,
  { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif'] }];

function mime(name) {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'psd' || extension === 'psb') return 'image/vnd.adobe.photoshop';
  return extension === 'jpg' ? 'image/jpeg' : extension ? `image/${extension}` : '';
}

export async function openDesktopFile(filters = PSD_FILTERS) {
  const bridge = typeof window === 'undefined' ? null : window.prodrawDesktop;
  if (!bridge) return undefined;
  const opened = await bridge.openBinary(filters);
  if (!opened) return null;
  return { file: new File([opened.bytes], opened.name, { type: mime(opened.name) }),
    location: opened.location };
}
