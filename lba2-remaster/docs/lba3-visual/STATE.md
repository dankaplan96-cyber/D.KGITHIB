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
| VP-1 | character artist | Twinsen's hair bun floats above his head in front/¾ views (mesh gap) — hair cap added | MERGED (3226e9e), review next | evidence/VP-0 motion/bun-listen.jpg |
| VP-2 | polish specialist (+ main session for the physics contract) | Twinsen walks through NPCs (no NPC colliders) | MERGED (VP-2..6 merge), visual review next | logs/s06-npc-overlap.log |
| VP-3 | polish specialist | leaving home: own roof fills the screen through the fade; ghost house tint 4 s | MERGED (VP-2..6 merge), visual review next | motion/house-exit-fade.jpg |
| VP-4 | polish specialist | chapter card shown under Twinsen's first line | MERGED (VP-2..6 merge), visual review next | shots/prologue-end-2-1280.jpg |
| VP-5 | polish specialist | prompt stays under dialogue/inventory/pause; weapon pill under the dialogue box | MERGED (VP-2..6 merge), visual review next | shots/ui-*-960.jpg |
| VP-6 | polish specialist | holomap labels overlap ("ToThe wellre") | MERGED (VP-2..6 merge), visual review next | shots/ui-holomap-1280.jpg |
| VP-7 | graphics artist | customs booth's window/sign face away from the camera | MERGED (3391c8d), review next; the beige box by Doran is the prologue's shed (prologue.js) — new item VP-12 | shots/harbour-doran-1280.jpg |
| VP-8 | graphics artist | well's daylight shaft reads as a solid beige tube, hides a crystal | MERGED (632db3d), review next | shots/well-cave-1280.jpg |

| SD-1 | graphics artist | user: "the world must not feel empty (bins, planters, signs); the spaceport looks empty" — street-furniture kit in props.js, Citadel Spaceport, bare stretches of town (citydress.js) | IN_PROGRESS | evidence/SD-1/ |
| SD-2 | graphics artist | Zeelich's seven islands: each its own identity + dressing (props-esmer.js), arrival view not filled by the shuttle pad | IN_PROGRESS | evidence/SD-2/ |
| SD-3 | graphics artist (after SD-1's kit lands) | the Hamalayi: Lhar, the monastery, the foothills dressed; then its twelve-years set (developer) | TODO | — |

| VP-9 | (design) | the holomap in other regions still shows Citadel, no hero dot — goes with CONNECT (holomap per planet) | REVIEW (CONNECT: hud.js drawHolomap — the region's own map with his dot, the planet inset; tests/travel.mjs) | VP-6 report; evidence/ZL-ALL/holomap-*.jpg |
| VP-10 | graphics artist | how a faded house should read (now fully hidden, shadow kept); island.js faders may veil at 0.12 | TODO | VP-3 report |
| VP-11 | animator | side-step around an NPC plays the forward walk | TODO | VP-2 report |
| ANIM-DEATH | animator | every enemy's knock-out: fall with weight, on the ground, LBA blink, bonus on the ground (src/game/death.js; tests/deaths.mjs) | REVIEW | evidence/ANIM-DEATH/ |
| VP-12 | graphics artist | the prologue's harbour master's shed by Doran is a plain box (src/game/story/prologue.js decorate) | TODO | VP-7 report |
| SRC-2 | source-character integrator | Baldino rebuilt from LBA2 body 139 (a Grobo; his own skeleton, ear/trunk bones, his walk/idle/talk timing); Zoé no longer pregnant (the user); the Dino-Fly's doze (REV-V-1 D1/D2: wings folded along the flanks, one-eyed look, subtler rounder muzzle) | REVIEW (visual review next) | evidence/SRC-2/, character-review §16 |
| ARTHUR-12 | character artist | WORKLIST #30: Arthur at twelve (eyes 0.835 of Twinsen; preteen proportions, his father's face, an older cut; the opening's close-ups and looks follow his height) | REVIEW (visual review next) | docs/lba3-production/reviews/ARTHUR-12/, character-review §19 |
| GFX-LOOK | graphics artist | the user, 29.10: "uglier, not sharp, pixelated" on the Vega 8 (battery look most): the sun's shadow read with hardware comparison (smooth edges; battery 4 reads, Medium/High 9, was 5/17/16), a depth-only shadow pass, edge smoothing (no MSAA) and sharpening (below 100 %) inside the output pass instead of an FXAA pass; bench.js variants for the user's next run. Open: LbaMaterial characters ignore the sun's shadow (character artist) | REVIEW (the user's benchmark on battery next) | evidence/GFX-LOOK/ |
| GFX-LOOK-2 | graphics artist | the user, 29.10 ("look good and sharp … 50–55 fps"), round 2 on Citadel ch. 1–2 at the same cost: the trees' undersides were black (a lightness offset on linear colours; re-baked), the paving and cliff edges smeared into the grass over the ~1 m terrain grid (now re-split per pixel, terrain.js, no extra read), flat lawns (painted tufts in the grass tile, broad warm/cool tint), the soil's pebbles never drawn (a line lost in a comment), a cooler shadow fill, a cyan-er sea, lighter rubble, the lighthouse barrels; Citadel's sun from the south-west (`?oldsun`: before). Cost on SwiftShader: same main draws, programs and textures; street −6 shadow draws (the sun); frame times within noise (interleaved A/B 0.97–1.03); bench line 'res x0.9, output plain' prices round 1's output work on battery | REVIEW (coordinator's look review, the sun especially: sun-*.jpg; then the user's laptop) | evidence/GFX-LOOK-2/ (medium-*, battery-*, sun-*, swiftshader-timing.json) |
| CHAR-OPEN | character artist | OPEN-3's model leftovers: Zoé's bun on the head; Twinsen's tunic with sleeves of its own (arms and shrug read); Zoé's arms with volume, armSpread 0.08; the guard's coat on the legs when knocked out | REVIEW (visual review next) | docs/lba3-production/reviews/CHAR-OPEN/, character-review §17 |

## Next exact action
All of VP-1..VP-8 are dispatched. As each returns: re-run its tests in the main checkout, merge, push, then
lba3-visual-reviewer on it (report under evidence/VP-n/REVIEW.md). VP-2..6 and TY-3-FIX both touch
src/game/actors.js (Hero.walkTo): resolve at merge. Then a second audit pass (VP-0 style) for the next backlog.
