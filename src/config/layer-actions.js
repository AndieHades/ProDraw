// Какие действия (иконки) показывать при свайпе строки слоя влево.
// Порядок = как лягут кнопки. Чтобы заменить набор — просто перепиши этот массив.
// Доступные id: lock, alphaLock, clip, duplicate, clean, delete.
// Иконка + обработчик каждого id живут в `systems/layers/swipe.js` (ICON + ACT);
// новое действие = добавить туда пару строк и вписать его id сюда.
export const LAYER_SWIPE_ACTIONS = ['alphaLock', 'clip', 'duplicate'];
