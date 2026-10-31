# LBA3 Test Lab — repair tasks

Run 2026-10-31T14-29-36-reproduce · game 0.43.3 (build 292) (packaged) · commit n/a (packaged build) · battery · Test Lab 0.1.0

Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.
Measurements are from the machine in the manifest; do not claim a fix without rerunning there.

## F01 · high · Title to playable scene: 3 visible frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 3 frames, worst 533 ms, 667 ms in all (New Game until playable); the frame itself recorded: frame before: work 33 ms; profiler inside the stall: 
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-29-36-reproduce\scenarios\title-to-play.json"`
- Evidence: `evidence/title-to-play-stall-1.json`
- Source locations: tick /src/engine/perf.js:337, __tlSync ← (anonymous) ← evaluate ← (anonymous)
- Acceptance: title-to-play: frames over 50 ms in "New Game until playable" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change
