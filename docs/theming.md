# Темизация

UI использует semantic CSS variables из `src/styles/raster-tokens.css`; компоненты не
хардкодят цвета, размеры, spacing, radius или animation timing.

Canvas checkerboard, selection overlays и brush cursor используют отдельные
presentation tokens и не входят в экспорт. Цвет artwork никогда не берётся из
темы. High-DPI viewport синхронизируется с `devicePixelRatio` без изменения
документных пикселей.

Desktop/tablet controls должны сохранять touch target sizes и keyboard focus.
Dark/light themes меняют один набор semantic tokens. Новые hardcoded style
values будут запрещены lint/validation после `R1`.
