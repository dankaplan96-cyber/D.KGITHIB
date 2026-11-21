# LBA3 Test Lab — repair tasks

Run 2026-10-31T14-34-33-full · game 0.43.3 (build 292) (packaged) · commit n/a (packaged build) · battery · Test Lab 0.1.0

Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.
Measurements are from the machine in the manifest; do not claim a fix without rerunning there.

## F01 · high · Door: leave the house by walking through it: the door leads outside to the Citadel

- Confidence: confirmed
- Observed: house
- Expected: citadel
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\door-house-exit.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "the door leads outside to the Citadel" passes in door-house-exit on the target laptop, three runs in a row

## F02 · high · Pause, resume, focus loss, fullscreen: losing focus pauses the game

- Confidence: confirmed
- Observed: play
- Expected: pause
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\pause-focus-fullscreen.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "losing focus pauses the game" passes in pause-focus-fullscreen on the target laptop, three runs in a row

## F03 · high · Save, exit, restart and load: same place after loading

- Confidence: confirmed
- Observed: citadel at -46.0,2.0
- Expected: citadel near -44.0,3.0
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\save-restart-load.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "same place after loading" passes in save-restart-load on the target laptop, three runs in a row

## F04 · high · Repeated visits and resource growth (game.bench.visits): the visits report has a growth line

- Confidence: confirmed
- Observed: not found
- Expected: growth line
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\repeated-visits.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "the visits report has a growth line" passes in repeated-visits on the target laptop, three runs in a row

## F05 · high · Opening cinematic: playback and handover did not complete

- Confidence: confirmed
- Observed: page.click: Timeout 30000ms exceeded.
- Expected: the test runs to its end
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\opening-cinematic.json"`
- Evidence: `evidence/opening-cinematic-failure.jpg`
- Source locations: not known
- Acceptance: opening-cinematic completes without errors on the target laptop

## F06 · high · Quest: take the ball from the cupboard did not complete

- Confidence: confirmed
- Observed: page.click: Timeout 60000ms exceeded.
- Expected: the test runs to its end
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\quest-cupboard.json"`
- Evidence: `evidence/quest-cupboard-failure.jpg`
- Source locations: not known
- Acceptance: quest-cupboard completes without errors on the target laptop

## F07 · high · Regions: first and second visit: 27.2 fps in "zeelich · first visit (built before: unloaded)"

- Confidence: likely
- Observed: 27.2 fps, p95 33.5 ms, GPU p50 17.98 ms, CPU work p50 16 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "zeelich · first visit (built before: unloaded)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F08 · high · Title to playable scene: 1 visible frame over 50 ms — frame before: work #, draw batches built #, shadow batches built #, shadow cache rebuilt (dropped: casters changed), +#geometries, +#textures on the GPU

- Confidence: likely
- Observed: 1 frames, worst 1217 ms, 1217 ms in all (New Game until playable); the frame itself recorded: frame before: work 661 ms, draw batches built 372 ms, shadow batches built 104 ms, shadow cache rebuilt (dropped: casters changed), +40 geometries, +0 textures on the GPU
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\title-to-play.json"`
- Evidence: `evidence/title-to-play-stall-1.json`
- Source locations: not known
- Acceptance: title-to-play: frames over 50 ms in "New Game until playable" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F09 · high · Regions: first and second visit: 33.6 fps in "hamalayi · first visit (built before: unloaded)"

- Confidence: likely
- Observed: 33.6 fps, p95 33.4 ms, GPU p50 14.81 ms, CPU work p50 6.3 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "hamalayi · first visit (built before: unloaded)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F10 · high · Regions: first and second visit: 35.7 fps in "desert · first visit (built before: unloaded)"

- Confidence: likely
- Observed: 35.7 fps, p95 33.2 ms, GPU p50 14.09 ms, CPU work p50 7.7 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "desert · first visit (built before: unloaded)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F11 · medium · Regions: first and second visit: 5 visible frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 5 frames, worst 67 ms, 284 ms in all (zeelich · first visit (built before: unloaded)); the frame itself recorded: frame before: work 38 ms
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: `evidence/region-entry-stall-1.json`, `evidence/region-entry-stall-2.json`
- Source locations: not known
- Acceptance: region-entry: frames over 50 ms in "zeelich · first visit (built before: unloaded)" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F12 · medium · Extended traversal: memory and GPU resources: 3 visible frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 3 frames, worst 100 ms, 234 ms in all (street loop 3 min); the frame itself recorded: frame before: work 14 ms
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\memory-long-walk.json"`
- Evidence: `evidence/memory-long-walk-stall-1.json`
- Source locations: not known
- Acceptance: memory-long-walk: frames over 50 ms in "street loop 3 min" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F13 · medium · Street traversal (Citadel square): 2 visible frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 2 frames, worst 100 ms, 150 ms in all (street walk 20 s); the frame itself recorded: frame before: work 101 ms
- Expected: no visible frame over 50 ms during play
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\street-traversal.json"`
- Evidence: none
- Source locations: not known
- Acceptance: street-traversal: frames over 50 ms in "street walk 20 s" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F14 · high · Regions: first and second visit: 44.3 fps in "zeelich · second visit (built before: cached)"

- Confidence: likely
- Observed: 44.3 fps, p95 33.5 ms, GPU p50 17.75 ms, CPU work p50 14.4 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "zeelich · second visit (built before: cached)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F15 · medium · Street traversal (Citadel square): 45.2 fps in "street walk 20 s"

- Confidence: likely
- Observed: 45.2 fps, p95 33.4 ms, GPU p50 17.37 ms, CPU work p50 13.6 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\street-traversal.json"`
- Evidence: none
- Source locations: not known
- Acceptance: street-traversal "street walk 20 s" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F16 · medium · Extended traversal: memory and GPU resources: 46.1 fps in "street loop 3 min"

- Confidence: likely
- Observed: 46.1 fps, p95 33.4 ms, GPU p50 17.41 ms, CPU work p50 12.9 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\memory-long-walk.json"`
- Evidence: none
- Source locations: not known
- Acceptance: memory-long-walk "street loop 3 min" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F17 · medium · Regions: first and second visit: 51 fps in "desert · second visit (built before: cached)"

- Confidence: likely
- Observed: 51 fps, p95 33.4 ms, GPU p50 14.3 ms, CPU work p50 9.9 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "desert · second visit (built before: cached)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F18 · medium · Regions: first and second visit: 53.6 fps in "hamalayi · second visit (built before: cached)"

- Confidence: likely
- Observed: 53.6 fps, p95 33.4 ms, GPU p50 14.84 ms, CPU work p50 6.9 ms — GPU-bound by the timer query
- Expected: 55–60 fps
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: none
- Source locations: not known
- Acceptance: region-entry "hamalayi · second visit (built before: cached)" ≥ 55 fps on the target laptop on battery, without lowering resolution globally or removing scenery

## F19 · low · Regions: first and second visit: 6 behind-loading frames over 50 ms — frame before: work #

- Confidence: likely
- Observed: 6 frames, worst 1633 ms, 4466 ms in all (zeelich · first visit (built before: unloaded)); the frame itself recorded: frame before: work 21 ms
- Expected: loading work hidden and short
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: `evidence/region-entry-stall-1.json`, `evidence/region-entry-stall-2.json`
- Source locations: (anonymous) 
- Acceptance: region-entry: frames over 50 ms in "zeelich · first visit (built before: unloaded)" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F20 · low · Regions: first and second visit: 2 behind-loading frames over 50 ms — frame before: work #, draw batches built #, shadow batches built #, #shader programs compiled, +#geometries, +#textures on the GPU, geometry upload

- Confidence: likely
- Observed: 2 frames, worst 2117 ms, 3367 ms in all (zeelich · first visit (built before: unloaded)); the frame itself recorded: frame before: work 2106 ms, draw batches built 1031 ms, shadow batches built 160 ms, 11 shader programs compiled, +105 geometries, +49 textures on the GPU, geometry upload
- Expected: loading work hidden and short
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: `evidence/region-entry-stall-1.json`, `evidence/region-entry-stall-2.json`
- Source locations: not known
- Acceptance: region-entry: frames over 50 ms in "zeelich · first visit (built before: unloaded)" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change

## F21 · low · Regions: first and second visit: 1 behind-loading frame over 50 ms — frame before: work #, draw batches built #, shadow batches built #, #shader program compiled, +#geometries, +#textures on the GPU, geometry upload

- Confidence: likely
- Observed: 1 frames, worst 1100 ms, 1100 ms in all (hamalayi · first visit (built before: unloaded)); the frame itself recorded: frame before: work 1092 ms, draw batches built 408 ms, shadow batches built 159 ms, 1 shader program compiled, +84 geometries, +30 textures on the GPU, geometry upload
- Expected: loading work hidden and short
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T14-34-33-full\scenarios\region-entry.json"`
- Evidence: `evidence/region-entry-stall-9.json`, `evidence/region-entry-stall-10.json`
- Source locations: not known
- Acceptance: region-entry: frames over 50 ms in "hamalayi · first visit (built before: unloaded)" reduced (baseline → candidate → baseline, 3 repeats, battery and plugged separately), with no visual change
