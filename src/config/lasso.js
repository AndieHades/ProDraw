// Настройки инструмента Freehand Selection (свободное выделение).
// Дефолты и пороги — данные, не магические числа в системах.
export const LASSO_DEFAULT = { mode: 'continuous', op: 'replace' };
export const LASSO_CLOSE_PX = 16;  // дистанция до старта (экранные px), на которой контур можно замкнуть
export const LASSO_MIN_POINTS = 3; // меньше точек — контур не образует область выделения
