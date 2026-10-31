# VP-0: baseline and first polish backlog (LBA3 0.26.0, main checkout 8c28476)

Polish specialist, read-only audit; no game source changed. Run in headless Chromium with SwiftShader through
`GAME_URL=http://localhost:8151/` at 1280×720 (UI also at 960×540). These results cover layout and motion only. No GPU
timing was taken and none is claimed. All runs used `?nocine`, Classic controls and the input harness (`tests/lib/player.js`).
Every frame was stepped with `game.step` and rendered on demand. Contact sheets label each frame with the state, the
animation and the speed. The scripts for every run are in `scripts/` and the raw results are in `logs/`.

Journey played by normal input, from a new game:
- The house in the prologue: idle, walk, turn and stop. Twinsen takes the ball from the cupboard and talks with Arthur, then leaves the house (`s01`).
- Zoé in the garden, the run, the square and the well. Then Gilbert, Xil and Doran at the harbour, Bug Street, Tim and Lulu, the overhearing and the clover, and the climb down the well. These are the steps of `tests/playthrough/01` (`s02`).
- In the well: crystal mites fought with standing and walking quick throws, then the remaining mites fought by `P.fight`. All three crystals, Sendell, and the chapter 2 card in the square (`s03`, steps of `tests/playthrough/02`).
- Back home by the lane: in through the door, then the scene with Zoé and Arthur (`s03`).
- No deaths and no ISO assists. No page errors were logged in any run.

The saves made between chunks (`vp0-save-0{1,2,3}.json`) are in the session scratchpad, not in the repository.

Already being handled elsewhere and not re-reported here: the coupler glow at Nell's shop and the pump step slide.

## Prioritized backlog (ranked by visible impact)

| ID | Owner | Issue (observed) |
|---|---|---|
| VP-1 | character artist | Twinsen's hair bun reads as a ball floating above his head |
| VP-2 | polish specialist (physics/NPC paths coordinated by the main session) | Twinsen walks through people |
| VP-3 | polish specialist (+ graphics artist for the faded look) | Leaving home: his own roof fills the screen, then a ghost house veils it |
| VP-4 | polish specialist | The chapter 2 title card collides with the first dialogue line |
| VP-5 | polish specialist | A stale interaction prompt and weapon pill show under dialogue, inventory and pause |
| VP-6 | polish specialist | Holomap labels overprint ("ToThe wellre") |
| VP-7 | graphics artist | The harbour customs booth reads as a blank placeholder box |
| VP-8 | graphics artist | The well's daylight shaft reads as a solid beige tube |

### VP-1: Twinsen's bun floats above his head (character artist)
- **Repro:** start a new game (house) and talk to Arthur, which shows Twinsen in his listen pose facing the camera. The same thing happens whenever he walks toward the camera.
- **Evidence:**
  - `motion/bun-listen.jpg` shows 16 frames, each with a clear gap.
  - `shots/house-arthur-dialog-1280.jpg` is a full frame at normal camera distance.
  - `motion/walk-cycle-close.jpg` and `motion/zoe-talk.jpg` show the same gap.
  - `logs/s05-bun.log`: the bones `tail0..2` keep a constant offset in the head's local space through idle and listen (tail0 = 0, 0.445, -0.147 in every frame). The rig is therefore rigid, and the gap comes from the mesh or its weights, not from animation.
- **Owning files:** `assets/poly/twinsen.json`, built by `tools/blender/twinsen_poly.py`. The LOOKS note is in `src/game/characters.js`.
- **Acceptance:**
  - The bun visibly joins the skull (a hair cap or tie) from front, three-quarter and side views at play distance, in idle, listen, walk and run.
  - The silhouette from behind is unchanged.
  - Capture the same frames before and after.
- **Gain:** the main character's head stops looking broken in every conversation. Of the issues seen, this is the one players notice most.

### VP-2: Twinsen passes through NPCs (polish specialist; physics and NPC paths coordinated by the main session)
- **Repro:** from save-01 (outdoors, prologue), walk with Up straight at Zoé.
- **Evidence:**
  - `logs/s06-npc-overlap.log`: the centre distance falls to 0.11 m while he walks at 2.4 m/s without slowing. The radii are 0.40 (Twinsen) and 0.45 (Zoé).
  - `motion/walk-into-zoe.jpg`.
  - The same overlap happens in normal play: `motion/run-start-stop.jpg` frames 4–8 (he runs through Zoé); `motion/gilbert-talk.jpg` and `shots/gilbert-closeup-1280.jpg` (Mira stands inside Twinsen while he talks to Gilbert); `shots/prologue-end-2-1280.jpg` (after the chapter 2 card he appears on top of Lulu).
- **Cause:** in code, nothing assigns NPCs a collider. `NPC.setPresent` toggles `this.collider`, but it is never created (`src/game/actors.js` ~l.401).
- **Owning files:** `src/game/actors.js` (NPC), `src/engine/physics.js`, and the story spawn spots in `src/game/story/*.js`.
- **Acceptance:**
  - Walking or running into any standing NPC stops him at roughly the sum of the radii.
  - Talk prompts still appear from 1.2–1.6 m.
  - A moving NPC never traps him and he is never pushed into geometry.
  - Chapter or scene spawns do not land on an NPC.
  - Playthrough 01–02, and `townlife`, `stability` and `transitions`, still pass.
- **Gain:** people feel physically present, and two-person dialogue shots stop showing bodies merged into each other.

### VP-3: Camera handoff when leaving the house (polish specialist + graphics artist)
- **Repro:** start a new game, take the ball, and walk out of the front door.
- **Evidence:** `motion/house-exit-fade.jpg`, 1/20 s per frame.
  - The house roof is fully opaque and covers about 60% of the frame through the whole fade-in. It is still opaque on frames 20–21, when control has already returned, and only then starts fading (rate 8/s).
  - On frames 22–27 and later, a translucent "ghost" house still tints about half the screen: `shots/door-out-control-0.0s/1.0s/4.0s-1280.jpg` (also `-960`). It is still there after 4 s standing at the door.
  - `motion/citadel-leave-door.jpg` shows a faded house popping back to opaque within one step (frames 6–7).
- **Cause:** `world.fadeOccluders` runs only in `updatePlay`, never during a transition (`src/main.js` ~l.1170). The faded house is several overlapping translucent layers, which is why it reads as a veil.
- **Owning files:** `src/main.js` (enterRoom/exitRoom/updateTransition) and `src/game/town.js` (`fadeOccluders`) for the polish specialist. The look of the faded state (`town.js` and `island.js` fade materials) belongs to the graphics artist.
- **Acceptance:**
  - On the first rendered frame of the fade-in, no occluding house covers Twinsen. Snap the occluder state on scene entry.
  - At the door, Twinsen and the path are readable without a tinted veil over more than about 15% of the frame.
  - No pop larger than 1 step when he walks 1 m away.
  - Capture before and after for: a new game leaving the house, Continue at the door, and entering then leaving again.
- **Gain:** leaving home is the most repeated transition in Citadel, and it stops opening on a wall of roof tiles.

### VP-4: The chapter card overlaps the first dialogue line (polish specialist)
- **Repro:** finish the prologue (Sendell). The fade to the square shows "CHAPTER 2 / The Joint Project" while Twinsen's line ("Her"? Who did Sendell mean?…) and his "…" speech bubble appear at the same moment, right over the title.
- **Evidence:** `shots/prologue-end-2-1280.jpg` (the bubble sits on "Joint Project"); `shots/prologue-end-5-1280.jpg`; `logs/s03-cave-home.log` lines "after sendell".
- **Owning files:** `src/game/story/prologue.js` (`endPrologue`), `src/game/story/index.js` (`nextChapter`, ~l.80), `src/game/hud.js` (`chapterCard`).
- **Acceptance:**
  - The card is readable on its own for its full display time, with no bubble or dialogue box over it, and the first line starts after it.
  - Alternatively, the card stays clear of the bubble and box at 1280×720 and 960×540.
  - Check other chapter starts the same way. Only chapter 2 was observed here.
- **Gain:** the chapter break lands as a beat instead of a cluttered frame.

### VP-5: Stale interaction prompt and weapon pill (polish specialist)
- **Repro:** near Zoé (prompt "W Talk"), press E. Then open the inventory (I) and the pause menu (Esc).
- **Evidence:**
  - `logs/s04-ui-*.log` record `#prompt` at opacity 1 during dialogue and pause.
  - The prompt shows through the dialogue box in `shots/ui-dialog-960.jpg` and `shots/zoe-dialog-1280.jpg`, behind the inventory panel in `shots/ui-inventory-960.jpg`, and between the Benchmark and Save & Quit buttons in `shots/ui-pause-960.jpg`.
  - The weapon pill ("Magic Ball · R: Fists") sits under the dialogue box, and the ▼ advance marker overlaps "R: Fists" in `shots/house-arthur-dialog-1280.jpg`.
- **Cause:** `hud.prompt()` is only updated in `updatePlay`, and `setState` does not clear it.
- **Owning files:** `src/main.js` (`setState`), `src/game/hud.js` (`prompt`, `weapon`), `css/style.css`.
- **Acceptance:**
  - No prompt or weapon pill is visible while the state is dialog, shop, inventory, map, pause or cinematic.
  - The prompt reappears correctly on return to play.
  - Check at 1280×720 and 960×540.
- **Gain:** cleaner dialogue and menus, with no ghost text behind them.

### VP-6: Holomap labels overprint (polish specialist)
- **Repro:** in the prologue, press M.
- **Evidence:** `shots/ui-holomap-1280.jpg` and `-960`. "Town Square" (`mapMarkers`) and "The well" (prologue marker) are drawn at almost the same point, so they read "ToThe wellre".
- **Owning files:** `src/main.js` (`mapMarkers`), `src/game/hud.js` (`drawHolomap` label drawing ~l.387), `src/game/story/prologue.js` (markers).
- **Acceptance:**
  - Labels that coincide are merged, offset, or suppressed, so each label is legible.
  - Check the holomap in every chapter's Citadel state at both sizes.
- **Gain:** the main objective label on the map becomes readable.

### VP-7: The harbour customs booth looks like a placeholder box (graphics artist)
- **Repro:** go to Doran at the harbour (prologue, "Doran: the stamp").
- **Evidence:** `shots/harbour-doran-1280.jpg`. From the normal camera, the booth shows two flat, untextured beige faces and a blue slab lid.
  - Its window, counter, bell and CUSTOMS sign are all on the +z face (`src/game/townlife.js` ~l.168–176), which faces away from the camera.
- **Owning files:** `src/game/townlife.js` (BOOTH, customs block).
- **Acceptance:**
  - From the default harbour camera, the booth reads as a customs post: sign or window visible, a material break, and no blank faces.
  - Colliders and the barrier, Odile's spot and the access paths are unchanged.
  - Re-run `townlife`.
- **Gain:** a prominent harbour prop stops reading as unfinished.

### VP-8: The well's daylight shaft reads as a solid tube (graphics artist)
- **Repro:** arrive in the well.
- **Evidence:** `shots/well-cave-1280.jpg` and `shots/well-after-fight-1280.jpg`. A hard-edged beige cylinder with a dark cap covers the purple crystal on the wall behind it.
- **Cause:** the shaft is an open, double-sided additive cylinder with uniform opacity (`src/game/interiors.js` ~l.875).
- **Owning files:** `src/game/interiors.js` (well room).
- **Acceptance:**
  - The shaft reads as soft light: edges fall off, there is no visible cap, and the crystal behind it stays readable.
  - No new post-processing.
  - Capture before and after from the arrival camera.
- **Gain:** the first underground room, and the combat area that follows, looks lit rather than containing a prop.

## Observed and acceptable (no item)
- **Ball release:** the quick throw releases at `quickRelease` 0.16 s from the hand's position. While the ball is held it stays 0.08 m from the hand. The walking throw keeps the walk legs and its follow-through blends. The ball returns to the hand. Evidence: `motion/throw-standing-0.jpg`, `throw-walking-1.jpg`, `throw-standing-2.jpg`; per-frame hand and ball positions in `logs/s03-cave-home.log`.
  - Minor: in the standing throw the hand drops about 0.46 m in the frame right after release (1.25 m → 0.79 m). Watch this, but it is not a backlog item.
  - One of three throws (a 2.6 m mite closing in) flew over the target. That is one sample only.
- **Foot contact:** planted-foot slip is about 5–6 cm per contact while walking and about 6–12 cm while running (`logs/s07-feet.log`). Start to full speed takes about 0.1–0.15 s. Stops take about 0.1 s from a walk and about 0.15 s from a run, with the rig blending to idle.
  - The robe hides most of the leg action, so judging this by eye is limited.
- **Door fades:** the door fades last 0.7 s and Twinsen keeps walking through them (`house-exit-fade`, `house-enter`).
- **Who talks and who listens:** the alternation is correct in the house scenes and at the square: Twinsen talks with a gesture, Zoé listens, Arthur listens (`home-scene`, `gilbert-talk`, `house-arthur-talk`).
- **Menus at 960×540:** inventory, journal, holomap and pause fit, apart from VP-5 and VP-6. The journal is not scrollable here because its content fits.
- **Minor, not ranked:**
  - In the Sendell cut-scene, the ball starts about 0.5–0.6 m from the hand, at the body centre (`prologue.js` `updateSendell` `ballPos`). It is small at that camera distance.
  - On the way down the well, the first line in the well appears while the screen is still fading in.
  - The green pendant lamp sits in front of Twinsen during the stove conversation.
- **Spheros:** they are faceted, but the code says they follow LBA1's Sphero bodies, so they are not reported.

## NOT TESTED
- GPU frame rate or performance (SwiftShader only).
- Audio of any kind: cue timing, music handoff, ambience, footsteps, leakage across pause, dialogue or transitions.
- Gamepad, touch and rebinding.
- Discreet (sneak) motion: the sheet was invalid and has been removed. The overhear step itself passed.
- Jump, sword or melee, dodge, charged throw.
- Death, game over and Retry.
- The chapter 2 depot drones.
- The other chapters' cards.
- Save or Continue beyond the chunk saves used.
- Big-text and 1997-look settings.
- Sizes other than 1280×720 and 960×540.

## Notes
- Tests in the main checkout wrote `C*-*.png` screenshots at 15:07 today, before or in parallel with this audit. They are gitignored and were not written by my runs, so I left them.
