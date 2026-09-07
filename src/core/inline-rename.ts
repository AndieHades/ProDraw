// Инлайн-переименование contentEditable-спана: единый механизм для слоёв и
// кистей. Фокус + выделение всего, Enter — сохранить, Escape — отмена, blur —
// сохранить. onSave(value|null): value — новое имя (изменено и непусто),
// null — без изменений (вызывающий просто перерисовывает).
export function inlineRename(span: HTMLElement | null | undefined, name: string,
  onSave: (value: string | null) => void, max = 24): void {
  if (!span) return;
  span.contentEditable = "true"; span.classList.add("editing");
  span.textContent = name; span.focus();
  const r = document.createRange(); r.selectNodeContents(span);
  const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
  let done = false;
  const finish = (save: boolean): void => {
    if (done) return; done = true;
    span.contentEditable = "false"; span.classList.remove("editing");
    span.removeEventListener("blur", onBlur);
    span.removeEventListener("keydown", onKey);
    const v = (span.textContent ?? "").trim().slice(0, max);
    onSave(save && v && v !== name ? v : null);
  };
  const onBlur = (): void => finish(true);
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); span.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); finish(false); }
  };
  span.addEventListener("blur", onBlur); span.addEventListener("keydown", onKey);
}

// Единый жест переименования по имени (слои и галерея): тап по имени уже
// активной строки/плитки → rename; тап по неактивной → activate (или, если
// activate не задан, событие всплывает — строка выберется своим обработчиком).
// wasActive снимаем на pointerdown, до того как тап успеет сделать элемент
// активным, иначе первый же тап переименовывал бы.
export interface RenameGesture {
  isActive: () => boolean;
  rename: () => void;
  activate?: (() => void) | undefined;
}

export function nameRenameGesture(span: HTMLElement,
  { isActive, rename, activate }: RenameGesture): void {
  let wasActive = false;
  span.addEventListener("pointerdown", (e) => {
    if (span.isContentEditable) { e.stopPropagation(); return; }
    wasActive = !!isActive();
  });
  span.addEventListener("click", (e) => {
    if (span.isContentEditable) { e.stopPropagation(); return; }
    if (wasActive) { e.stopPropagation(); rename(); }
    else if (activate) { e.stopPropagation(); activate(); }
  });
}
