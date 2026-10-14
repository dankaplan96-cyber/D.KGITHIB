# Visual team STATE (polish, animation, graphics, characters)

Installed: .claude/agents/lba3-{polish-specialist,animator,graphics-artist,character-artist,visual-reviewer}.md and
this folder's WORKFLOW.md (the user's visual kit), alongside the earlier lba3-developer / lba3-reviewer kit.
Production state stays in docs/lba3-production/STATE.md and BACKLOG.md; this file tracks the visual pass only.

- Revision at install: 0e278f0 (0.26.0). Running in parallel at install: TY-3-FIX (developer), TY-4 Zeelich
  (developer), REV-TY-4 Desert Island (reviewer).
- Tools here: three.js runtime in headless Chromium with SwiftShader (screenshots and software counts only — no GPU
  frame times; a 60 FPS claim needs the user's PC: pause → Benchmark); Blender bpy 5.2 for the cast
  (tools/blender/cast_poly.py); the input harness tests/lib/player.js; procedural animation in src/engine/rig.js.
- Rule: no story or map expansion in this pass; improve existing content; same-condition before/after evidence.

## Tasks
| ID | Owner | Scope | State | Evidence |
|---|---|---|---|---|
| VP-0 | polish specialist (run as a general-purpose agent with the role file; the kit's agents loaded later) | baseline + one complete journey by input (house → square → harbour → well, mites, Sendell → home) | DONE | evidence/VP-0/BACKLOG.md |
| VP-1 | character artist | Twinsen's hair bun floats above his head in front/¾ views (mesh gap) | IN_PROGRESS | evidence/VP-0 motion/bun-listen.jpg |
| VP-2 | polish specialist (+ main session for the physics contract) | Twinsen walks through NPCs (no NPC colliders) | IN_PROGRESS | logs/s06-npc-overlap.log |
| VP-3 | polish specialist | leaving home: own roof fills the screen through the fade; ghost house tint 4 s | IN_PROGRESS | motion/house-exit-fade.jpg |
| VP-4 | polish specialist | chapter card shown under Twinsen's first line | IN_PROGRESS | shots/prologue-end-2-1280.jpg |
| VP-5 | polish specialist | prompt stays under dialogue/inventory/pause; weapon pill under the dialogue box | IN_PROGRESS | shots/ui-*-960.jpg |
| VP-6 | polish specialist | holomap labels overlap ("ToThe wellre") | IN_PROGRESS | shots/ui-holomap-1280.jpg |
| VP-7 | graphics artist | customs booth's window/sign face away from the camera | TODO (after TY-3-FIX, same file) | shots/harbour-doran-1280.jpg |
| VP-8 | graphics artist | well's daylight shaft reads as a solid beige tube, hides a crystal | IN_PROGRESS | shots/well-cave-1280.jpg |

## Next exact action
Dispatch from VP-0's backlog: highest-impact item first, to its owner (animator / graphics artist / character
artist / polish specialist), then lba3-visual-reviewer, then integrate.
