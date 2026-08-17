# Huion Windows Ink Device Matrix

- Status: `pending_device`
- Owner stage: `R3 / F5`
- Automated baseline: `main@e7e44da`
- Required hardware: a Huion tablet with Windows Ink enabled

## Capture workflow

1. Open Brush Studio by double-clicking a brush and select `Huion Stylus`.
2. Press `Записать трассу Huion`; draw only inside Drawing Pad.
3. Exercise one matrix row at a time. The recorder keeps raw actual/coalesced
   Windows Ink samples, not predicted overlay points.
4. Press `Остановить запись`, then `Сохранить трассу`. The native dialog suggests
   `huion-<time>.prodraw-ink-trace.json` and remembers the last directory.
5. Record app commit, Huion model/driver, Windows build, display scale, tablet
   mapping and trace filename in the evidence record below.

The trace format is `prodraw-stylus-trace@1`. It contains relative coordinates,
raw pressure, tilt, contact dimensions, pointer/button bitfields and explicit
cancel/capture-loss/blur/hidden phases. It contains no artwork pixels.

## Required matrix

| Case | Manual gesture | Pass evidence |
| --- | --- | --- |
| Pressure | ten slow light→hard lines | monotonic response, no zero-pressure gaps after contact |
| Minimum pressure | feather-light starts | configured threshold removes hover noise, not intentional dots |
| Tilt | strokes in four pen directions | tilt sign/range changes and enabled brush response is visible |
| Eraser | flip the stylus and draw | one Eraser history entry; no simultaneous Brush marks |
| Barrel Smudge | hold mapped side button while drawing | one Smudge entry and bounded premultiplied smear |
| Barrel transition | press/release side button mid-stroke | old gesture cancels; no mixed-tool or stuck edit |
| Fast lift | fast curve ending off-axis | tail reaches exact lift point without a straight jump |
| Short dot | quick tap at three pressures | each intentional contact leaves one bounded dot |
| Long curve | 30-second slow curve | no jitter bursts, memory growth or delayed runaway tail |
| Focus loss | Alt+Tab while pen is down | active edit cancels once and next stroke starts normally |
| Capture loss | leave window/cancel capture while down | no stuck stroke or duplicate history transaction |
| Palm | rest palm while drawing with pen | no paint and no view jump from the palm contact |
| Two-finger view | pan, pinch and rotate | view changes; source pixels and Undo count do not |
| Finger paint | explicitly enable, draw, then add second finger | first stroke yields to navigation; setting survives restart |
| Predicted preview | fast Windows Ink stroke | overlay follows input, final RGBA contains actual samples only |

## Acceptance thresholds

- No stuck pointer session, transparent color halo or duplicate terminal commit.
- 60/120/240 Hz deterministic fixtures remain within 1.5 document pixels at
  the common sample times; the saved hardware trace must pass the same replay
  pipeline once captured.
- Input-to-present p95 remains within the frozen F3 budget on A4 300 DPI.
- Any failed row keeps F5 `in_progress`; do not replace device evidence with a
  synthetic trace or a successful packaged boot.

## Evidence record

| Field | Value |
| --- | --- |
| Date / tester | pending |
| ProDraw commit | pending |
| Huion model | pending |
| Huion driver | pending |
| Windows build | pending |
| Display scale / tablet mapping | pending |
| Trace file(s) | pending |
| Matrix result | pending |
| Notes / failed rows | pending |
