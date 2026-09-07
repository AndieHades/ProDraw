// Давление для устройств, которые его не сообщают, и нижняя граница для пера.
// Часть планшетов отдаёт нулевое давление в момент касания, и штрих пропадал бы.
export const POINTER_INPUT = Object.freeze({
  mousePressure: 1,
  touchPressure: 1,
  minimumPenPressure: 0.01
});
