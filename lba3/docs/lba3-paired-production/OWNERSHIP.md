# Ownership (coordinator-only file)

## Active now
| Task | Worker | Writable | Read-only |
|---|---|---|---|
| PERF-HIGH | frame-pacing / 60fps brief | src/engine/** except audio.js; src/bench*; tests/perf*; docs/lba3-performance/** | src/game/** |
| CH1-LONGER | adventure-design | src/game/story/{prologue,chapter1}.js + their text, citizens/life only where ch.1 needs it; tests/playthrough/01–05; chapter-1 tests; WORKLIST #41 row | src/engine/** |

## Planned: G1 Round 1 (after both return)
| Task | Worker | Writable | Read-only |
|---|---|---|---|
| G1-ART | lba3-character-art | assets/poly/**, tools/blender/**, src/game/characters.js (looks only), src/game/statue.js | camera, story, engine |
| G1-CAM | lba3-camera-director | src/engine/camera.js, src/game/story/revealcam.js, camera tests (camfollow, camclear, camsteady) | assets, story text |
Shared contracts: bone names, rig and clip compatibility (art publishes before any skeleton change); camera hooks (camera owner only).
