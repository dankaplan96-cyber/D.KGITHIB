# LBA3 Test Lab — repair tasks

Run 2026-10-31T16-12-41-diagnose · game 0.43.3 (build 292) (packaged) · commit n/a (packaged build) · battery · Test Lab 0.1.0

Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.
Measurements are from the machine in the manifest; do not claim a fix without rerunning there.

## F01 · medium · JavaScript hot spots on the street (V8 profiler, real walk): 1 visible frame over 50 ms — frame before: work #

- Confidence: likely
- Observed: 1 frames, worst 67 ms, 67 ms in all (street walk 15 s (profiled)); the frame itself recorded: frame before: work 38 ms; profiler inside the stall: shownTree /src/engine/drawcull.js:56 3.5 ms, (anonymous) /vendor/three/build/three.module.min.js:6 3.5 ms, now 2.3 ms
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-12-41-diagnose\scenarios\js-hotspots.json"`
- Evidence: none
- Source locations: __tlSync ← (anonymous) ← evaluate ← (anonymous)
- Acceptance: js-hotspots: frames over 50 ms in "street walk 15 s (profiled)" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change
