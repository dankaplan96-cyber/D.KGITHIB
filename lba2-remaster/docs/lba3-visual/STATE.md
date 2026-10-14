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
| VP-0 | polish specialist | baseline + one complete player journey audit (Twinsen in Citadel: house → square → harbour, a fight, an interior); prioritized backlog | IN_PROGRESS | — |

## Next exact action
Dispatch from VP-0's backlog: highest-impact item first, to its owner (animator / graphics artist / character
artist / polish specialist), then lba3-visual-reviewer, then integrate.
