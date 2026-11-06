# Handoff for a new cloud session (4.11.2026)

Start here: read this file, then `docs/future/WORLD_CONSISTENCY.md` (rules R1–R11), `tools/testlab/CLOUD_ORDERS.md`
(orders to the laptop) and `tools/testlab/WORLD_ART_REQUESTS.md` (requests from the laptop). Branch: commit and push
only to `ccr-adf00ea7-37ebl3` (and `expansion/ballastra` for the expansion). No PRs. Reply to the user in Hebrew,
short; player text is English.

## The user's standing rules (keep them)
- The user plays chapters 1–2 only: **no spoilers** past chapter 2 (no pictures, places, people or events from 3–12 or
  the expansion unless asked). Report later-chapter work as "a later chapter".
- Story: Twinsen the protagonist; Zoé and Arthur (12) have agency; two suns, no Earth-style night; FunFrock dead;
  Vesk the villain; planets joined only by spaceship; "Esmer" for Zeelich's peoples, "Wannies" for the moles; no
  sequel promise.
- **IP:** never redistribute LBA1/LBA2 assets; numbers and descriptions only. The GOG files under
  `/root/.claude/uploads/...` are read-only; extract to `/dev/shm` only; never commit originals or the user's photos.
- **R11:** every place has a meaning for the journey, even a small one; no superfluous LBA places, no cacophony.
- ~80 % likeness to LBA1/LBA2 for kept places (`ALIGNMENT.md`).
- Honesty: the container renders with SwiftShader; never claim fps; say when something is unverified by a human.
- **Save tokens** (the user asked): at most 2 agents at a time; short messages; only relevant tests; publish the
  artifact once per batch. Ask before starting new agents beyond the agreed plan.
- No desktop builds for small changes (`docs/BUILDS.md`); the user plays through the pinned artifact
  https://claude.ai/artifact/EjPMQXPwbmre2kDevMC4tA (publish with `root=lba3`, `files` = changed `src`/`assets` paths;
  if refused for "unread" files, check the published sha256 equals an older git version, then `overwrite_unread`).
- Voices: Piper-rendered gibberish banks (`tools/voice-render/piper-banks.py`, `assets/voice/`), LibriTTS-R CC BY 4.0
  credited. The user's taste: soft, varied, human; not synthetic.
- Saves are not critical: old saves must not crash (a clean fallback is enough).

## Testing (how)
`git archive HEAD lba3 | tar -x -C /dev/shm/tNNN`; serve from inside `/dev/shm/tNNN/lba3` with
`(setsid nohup python3 -m http.server PORT >/dev/null 2>&1 < /dev/null &)`; run
`(cd /home/user/geriatrics-course/lba3 && BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:PORT/ timeout 2400 node /home/user/geriatrics-course/lba3/tests/X.mjs)`
(absolute paths: `cd` may not stick); kill the server by pid in its OWN command
(`ps -eo pid,args | awk '/[h]ttp.server PORT/{print $1}' | xargs -r kill`), never on the line that starts it; delete
snapshots after. Scratch probes: `tests/lib/try.mjs <script.js>`. Ports: cloud 850x–852x; agents 8530–8599.

## State at handoff (4.11.2026)
Merged and on the artifact (v32): spaceport crowds by chapter, story journeys (films), residents in chapters 4–9 and on
Zeelich's nine islands (PEOPLE-1), the sewers' ways (SEWERS-1), the asylum (ASYLUM-1: reason, Twinsen's cell, cut-away
ceiling), EQUIP-2 a+b (five new gadgets), the follow camera after doors, fuller 1.25× rooms, the clutter cleanup and
purposes (DECLUTTER), the laptop's requests (CAMPAIGN-1/2, DOORS-1, ZEELICH BAR/HOTEL/TEMPLE/SKY/WANNIE, BG-STUCK-1,
LINE-CLEAR-1), Piper voices, Medium as the default camera distance. A 26-test regression passed on 4.11.

Merged since (4.11): `audio-fix` (Sendell's and Vesk's voices; the reverb cap and an underrun counter, `game.audio.stats()`; the music crackle NOT reproduced here — ask the user for the counter if it recurs) and `ch12-staging` (below). Leftovers from them:
- the shot where the crystals take in the ball is too tight; the follow camera near a wall still ends 1.25 m away with his back 0.9 m from Twinsen's house wall; a real fade of walls needs the merged-mesh owner (`merge.js`/`texarray.js`); near-lens culling within 1 m is in, the user hasn't approved it explicitly; `tests/prologue.mjs` "the well's mites beaten" fails on the base too.
They were (for the record):
- `ch12-staging`: chapter 1–2 staging fixes from the user's playtest: the crystal + Sendell scene as a cinematic with
  close-ups; Vesk's ship (docked in ch 1 then "arriving" again in ch 2) and its arrival animation; Vesk's entrance
  framed close; after the Vesk talk Twinsen left in the beam pad's light and Zoé vanishing; Doran teleporting after a
  talk; the follow camera crushed against a window.
- `audio-fix`: Sendell's voice more like a magical spirit; Vesk clearly different from Twinsen; the music crackling
  again (find the cause). Listening files go to the scratchpad `voices/8-sendell.mp3`, `9-twinsen-vesk.mp3`.

## Done in the second cloud session (4.11.2026, branch `ccr-c1c2c4b9-dep6ed`, fast-forward of ccr-adf00ea7-37ebl3)
- The laptop's five applied (ISO-CLOSE-1, HARBOUR-1, ASYLUM-2, OTRINGAL-1, JUMP-CAPE-1), a commit each; the Camera
  distance hint names the big rooms' view too.
- **ASYLUM-2's story part** (`story/hostel.js`, `text/hostel.js`): the hostel's seven people on the npcSpots with
  lines by phase (1–2, 3–7, 8, 9 on), Vesk's two guards on his store in 1–2 only, the humming crate (pocket set) → his
  key → his office (notebook, strongbox 20 kashes), the two plaques, the cook's soup; the store cleared from chapter 3.
  NPCs take `y` and `pin` (sit, a new 'sleep' pose). Leftover: chapter 8's shelter as a mechanic (lines only).
- Sendell's call: the "crystals take in the ball" shot is wide now (pictured in SwiftShader; the user hasn't seen it).
- Artifact v35 published (the game files above; the page itself unchanged).
- Tests (SwiftShader): asylum, lba1rooms, transitions, chapter1, opening, shops, purposes, anim-polish PASS;
  zislands: one check timing-sensitive (a Knartas resident walking past the pad takes the prompt; the test now waits).
- The expansion merge (base → `expansion/ballastra`): resolved (regions, citizens, story/index, zeelife, main.js
  migrateSave, STORY_MAP); see the commit for its checks.

- 5.11 (same session, night mode): TREES-1 and CLIMB-1 applied; the ship's landing film at the ends of chapters 2
  and 8, chapter 10's glider flights as films (Hesk's parked gliders fly; his landing line after); `Game.doorStep`
  (out of a door, 1 m further out on open level ground: the follow camera no longer hangs over his head under the
  eaves). camfollow: five wall checks fail on the old base too (since ch12-staging's 3.2 m minimum): to reconcile with
  the user's choice, not a regression of this session.

- 5.11 (the user: "make sure no open requests are left"): every diff in `tools/testlab/requests/` is applied or was
  replaced by the user's choice (WA-15 → WA-15b); every section of `WORLD_ART_REQUESTS.md` is applied, answered or
  set aside by the user; USER-ASKS of 2.11 all done (the lighthouse door: steps and a "locked" look, 5.11); WA-10's grey
  rock handed to the laptop (CLOUD_ORDERS 13); the old test failures: prologue, chapter4 (54/54) and controls (92/92)
  pass now. **Still open (the cloud's): `tests/solidnpc.mjs`, 13 checks, identical on the base before this session**:
  its story-person case picks Zoé (indoors, ~1 km away in the house's room: the "launch" is that teleport, a stale
  setup, not a game bug); "no free approach to tobb|marda|brix|dot" and "tilde|maro|ume" and the bench checks look
  stale after BENCHES-1/DECLUTTER too. Fix the setup case by case; confirm each bench sitter on the seat in a picture.

- 5.11 (the user: "send an agent to test the whole game in depth"): **two polish passes** (agents A: Citadel, chapters
  1–2, UI/cameras/transitions; B: chapters 3–12, the other regions, all equipment), merged. A: solidnpc's 13 failures
  were the test's set-up (54/54 now; no game change); chapter 2's depot patrol stands down in view instead of vanishing;
  the harbour worker no longer stands inside Xil (he took Xil's Talk prompt), the guard no longer in the bell post; the
  fortress objective's map star (a person in a room is starred at its street door). B: held weapons and tools put away
  in talks like the sword; the pulse tool shown in his hand; shots and the line leave from the hand; Zeelich residents
  no longer 12 m under the street after a load; **`refreshCast({walk:true})`** for chapters 3–12 and the epilogue (a
  person whose new spot or who is on screen walks there, `from`/`via` doors; chapters 1–2 keep instant placement);
  the Hamalayi landing glider's collider mirrored; the epilogue reached straight through clears chapter 8's fences;
  chapter 10's parked gliders solid; cast-round stops off the heat-flask prompts; "night" lines (R7). Then the cloud:
  CHEST-1 applied (picture), walkers' stuck rescue never puts a resident on a point in view (the child seen sliding
  30 m in chapter 10; not reproduced, the cause read from the code). Known failing, identical on the base: chapter5
  (its teleport-and-use helper never turns valve 4; input segment 08 does), combat (dodge 30 vs 60 fps), camfollow
  (5 wall checks), doorcull (too slow on SwiftShader). Visual leftovers → CLOUD_ORDERS 14.

- 5.11 evening, the user's playtest (each fixed, pictured, published; artifact v39 → v47): build stamp on the title and
  pause screens (`src/build-stamp.js`, `sh tools/stamp-build.sh` before every publish; a newer published copy says
  "reload"); dialogue advances by itself (Settings → Game → Dialogue Advances, on by default, off under automation);
  the town well dry until chapter 2's water (`town.js setWater`); Doran dozes on the ground (rig pose `doze`, sleeps
  through talk); Tobb's smock violet (two red Grobos); Vesk's speech over Twinsen's shoulder; the jump leans and tucks,
  running landings lighter; the well cave's lamp posts to the back wall; the climb ramp filled level to its wall
  (`climbRampFill`, applied after the house pads); the opening has no ferry at the pier (Vesk brings it in ch. 2); the
  water main's ground collars and end caps; the fort gate's passage has one floor; magic no longer regenerates (LBA2);
  FIDGET-1, CHEST-1, ASYLUM-3 applied. `.claude/settings.json` allows the tools (the user asked; read at session start).
  Open: laptop orders 14–16 (visual leftovers; the climb's likeness; the asylum flight's top: squared, the trench, the
  camera with the fort wall 2.5 m behind — the user was offered a camera change there, no answer yet); the overlap
  sweep (an agent, worktree) running; the expansion merge of 5.11 being tested.

- Night of 5–6.11 (night mode; artifact v48 → v50): Zoé's office harder (Watcher notice/cool/speed/glance; tests and
  zoe-resume retry the way out) and lit by its own lamps (PLAY-3); OVERLAP-1 (an agent: a coplanar-surface detector,
  `tests/overlaps.mjs`, six faults fixed: the beam pad, the drill collar, the lighthouse door, the tavern, its cellar,
  the baggage claim, Tralu's cave); the laptop's CLIMB-2, CLIMB-15, PLAY-3, POLISH-14, ROCK-13, GLIDER-1, SKY-9 applied,
  CHARS-1 merged (branch: the Grobos' trunks, the cast's seams; the poly models carry their colours baked — a look
  change in characters.js needs the model rebuilt, as Tobb's violet showed); sewers.js reads the tent through
  regions.built (lazyregions 13/13). Known failing, identical on yesterday's base: sewers.mjs 3 checks (back up the
  well-house lift), combat (dodge 30/60), chapter5, camfollow, doorcull. Expansion: base merged twice (branch
  `exp-merge-5n`, the 5.11 test routes by the asylum climb's foot; skeletons.json merged by key, the expansion's tessa
  and dockers kept), oren-first/oren-square/ballastra-harbor PASS; pushed to `expansion/ballastra` once its batch ends.

## Queue (after those)
0. ~~**Apply the laptop's new requests**~~ (done 4.11, second session) in `tools/testlab/requests/` as listed in `WORLD_ART_REQUESTS.md` (OTRINGAL-1 waits now: Otringal's identical shells → fewer buildings of recognisable kinds). Note the user's correction there: order 5 is the paved climb to the **asylum**, not the tavern.
1. ~~**ASYLUM-2 story part:**~~ (done 4.11, second session; chapter 8's shelter mechanic left) the laptop builds the place (two entrances, the Esmer workers' hostel, Vesk's store, the
   plaque "SEALED BY ORDER OF THE CITADEL ISLAND COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN.", `R.npcSpots`); the cloud
   then writes the people, lines, Vesk's notebook, the hidden humming crate (Arthur's pocket set), the two guards and
   the chapter states (answer in `WORLD_ART_REQUESTS.md`, "ASYLUM-2 · the cloud's answer").
2. Laptop orders 5–6 (`CLOUD_ORDERS.md`): pave the way up to Citadel's tavern as LBA2; bring Zeelich closer to LBA2's.
3. Expansion (`expansion/ballastra`, `docs/future/OREN_PROGRESS.md`): next NW-2 "Local Override" (needs a source the
   player saw, or BR-4); OG-5 when the laptop's W-8 lands; W-1 waits for the user's approval of its pictures.
4. ~~Smaller: chapter 10's glider film; arrival films 2→3 and 8→9; the follow camera's first half-second outside a
   door~~ (done 5.11).
