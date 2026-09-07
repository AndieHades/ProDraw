// Доступ runtime к оболочке: узел по идентификатору, короткое сообщение и
// перевод. Это единственная точка, через которую `core` и `systems` касаются
// оболочки, — импортировать `src/ui` им запрещено.
export { $ } from "./shell-dom.ts";
export { toast } from "./feedback.ts";
export { t } from "../i18n/index.ts";
