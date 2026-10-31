# LBA3 Test Lab — repair tasks

Run 2026-10-31T14-56-59-full · game 0.43.3 (build 292) (packaged) · commit n/a (packaged build) · battery · Test Lab 0.1.0

Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.
Measurements are from the machine in the manifest; do not claim a fix without rerunning there.

## F01 · high · Opening cinematic: playback and handover: 31.2 fps in "opening playback 12 s"

- Confidence: likely
- Observed: 31.2 fps, p95 33.8 ms, GPU p50 26.72 ms, CPU work p50 19.9 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\opening-cinematic.json"`
- Evidence: none
- Source locations: not known
- Acceptance: opening-cinematic "opening playback 12 s" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F02 · medium · Opening cinematic: playback and handover: 7 visible frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 7 frames, worst 100 ms, 484 ms in all (opening playback 12 s); the frame itself recorded: frame before: work 21 ms
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\opening-cinematic.json"`
- Evidence: `evidence/opening-cinematic-stall-1.json`
- Source locations: not known
- Acceptance: opening-cinematic: frames over 50 ms in "opening playback 12 s" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F03 · high · Opening cinematic: playback and handover: 1 visible frame over 50 ms — frame before: work #, GC −#

- Confidence: likely
- Observed: 1 frames, worst 333 ms, 333 ms in all (opening playback 12 s); the frame itself recorded: frame before: work 20 ms, GC −27 MB
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\opening-cinematic.json"`
- Evidence: `evidence/opening-cinematic-stall-1.json`
- Source locations: not known
- Acceptance: opening-cinematic: frames over 50 ms in "opening playback 12 s" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F04 · medium · Door: leave the house by walking through it: 50.1 fps in "walk through the door"

- Confidence: likely
- Observed: 50.1 fps, p95 33.4 ms, GPU p50 15.04 ms, CPU work p50 8.3 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\door-house-exit.json"`
- Evidence: none
- Source locations: not known
- Acceptance: door-house-exit "walk through the door" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F05 · low · Door: leave the house by walking through it: 1 behind-loading frame over 50 ms — frame before: work #, #shader program compiled, +#geometries, +#textures on the GPU, geometry upload

- Confidence: likely
- Observed: 1 frames, worst 133 ms, 133 ms in all (walk through the door); the frame itself recorded: frame before: work 134 ms, 1 shader program compiled, +3 geometries, +0 textures on the GPU, geometry upload
- Expected: loading work hidden and short
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\door-house-exit.json"`
- Evidence: `evidence/door-house-exit-stall-1.json`
- Source locations: not known
- Acceptance: door-house-exit: frames over 50 ms in "walk through the door" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F06 · low · Door: leave the house by walking through it: 1 behind-loading frame over 50 ms — frame before: work #, shadow cache rebuilt (dropped: casters changed)

- Confidence: likely
- Observed: 1 frames, worst 66 ms, 66 ms in all (walk through the door); the frame itself recorded: frame before: work 35 ms, shadow cache rebuilt (dropped: casters changed)
- Expected: loading work hidden and short
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-56-59-full\scenarios\door-house-exit.json"`
- Evidence: `evidence/door-house-exit-stall-1.json`
- Source locations: not known
- Acceptance: door-house-exit: frames over 50 ms in "walk through the door" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change
