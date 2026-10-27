# Desktop builds: number → commit → what changed

Every desktop build is tagged `desktop-build-N` on the exact commit it was built from; tags are never deleted. To get an old build back, run the "Desktop builds" workflow by hand (Actions → Desktop builds → Run workflow) on that tag. The milestones the user tested are marked ★.

| Build | Commit | Date | What changed |
|---|---|---|---|
| 213 | cee615f | 27.10 12:44 | Desktop builds: run artifacts kept 5 days instead of 30 (the installers stay on the release; the artifacts only carry them to it) |
| 212 | 5721173 | 27.10 10:43 | PLAN_NEXT: 60 fps steady at every quality level is the target (the user) |
| 211 | e53f082 | 27.10 10:25 | Pickups smaller (the user): the coin a small gold Kash on its edge (0.26 m, was a 0.73 m octahedron), hearts ×0.6, magic flasks ×0.62, clo |
| 210 | 25353c0 | 27.10 10:17 | POLISH-AUDIT: #4 done |
| 207 | 0c2e1b5 | 27.10 10:09 | WORKLIST #16: Twinsen's house walls and windows after the user's reference (sea-blue upper wall with small fish, wood wainscot, curtained fr |
| 206 ★ | 6de13c4 | 27.10 09:41 | POLISH-AUDIT: statuses (#1, #12, #13 done; #4 in progress) |
| 205 | 001af01 | 27.10 09:02 | Merge WELL-POLISH (WORKLIST #38): the well's crystals as faceted prism clusters with glowing cores, nodes that flash and glow when lit; the  |
| 204 | aa5fc5e | 27.10 08:53 | POLISH-AUDIT: wording |
| 202 | 6720843 | 27.10 07:36 | PLAN_NEXT: the user plays chapters 1–2 only (no spoilers); the agents review 3–12 |
| 201 | 8b863a9 | 27.10 07:31 | WORKLIST: #22 closed; #38 the well at chapter 1's end (the thrown ball's animation, the crystals), the user's note |
| 200 ★ | 7576a45 | 27.10 03:18 | MORNING_CHECK.he.md: what went in tonight, what was tested, a 20-minute check for the user, what is still open |
| 198 | 43210be | 27.10 02:50 | Chapter 12 begins at full life (Sendell's light): its save and every Retry of the final fight no longer start at what the galleries left |
| 197 | ef4927e | 27.10 01:58 | Merge CH-11/12 (WORKLIST #22): the final chapter is two, 11 The Shell (to Sendell) and 12 The Core (Vesk, the guardian, the pylons, the coil |
| 196 | c38bdff | 27.10 01:36 | Merge FIX-A: Desert Island's bank beside the pier's land end eased (D10, steep since the Desert rebuild); camsteady separates the Follow cam |
| 195 | 0d4e65f | 27.10 01:28 | Merge FIX-B: jetpack and arsenal tests build the areas they read (workshop, cellar, Bersimon's tent, the school) the way a door-walk does si |
| 194 | 5272634 | 27.10 00:59 | Test evidence refreshed by the night suite on 82e7a76 (screenshots and result files the tests write) |
| 192 | 82e7a76 | 26.10 22:55 | Merge PLAY-7-14: the scripted playthrough 01→14 passes by input with the lower jump (0 deaths, no assist in 14): Whispering Cliffs' last s |
| 191 | eeeb04f | 26.10 22:47 | Merge CAM-CLIFF: the LBA view swings up and in before a rock face instead of being popped up it by the floor (Hamalayi west wall: accelerati |
| 190 | 0fa75a8 | 26.10 21:28 | PLAN_NEXT: CAM-CLIFF (the LBA view's lift jumps at the Hamalayi's west wall) |
| 189 | 8afee58 | 26.10 21:25 | WORKLIST #37: characters moving through the world (the user's request, for later) |
| 188 | 87b761c | 26.10 20:38 | Merge BALL-30FPS: the ball is seated on this frame's hand at release and flies 0 s in that frame, so its landing no longer depends on the fr |
| 187 | e302b69 | 26.10 20:18 | PLAN_NEXT: the Hamalayi camp wants a polish pass |
| 186 | 47b4a8b | 26.10 20:08 | Merge HARBOUR-CUT (WORKLIST #17): Citadel's basin an ellipse 14 × 9 m instead of a straight cut to the map's edge (no pale bar in the water |
| 185 | 0d7c683 | 26.10 19:37 | PLAN_NEXT: tonight's notes (the controls ball-at-30-fps failure that predates today's merges; what merged today on targeted tests only) |
| 183 | f09724b | 26.10 19:22 | Merge FACE-MOUTH: Twinsen and Arthur get a mouth (a calm crescent on the face, 12 triangles each; Arthur's a touch more of a smile) |
| 182 | 48924ea | 26.10 19:08 | Merge WORLD-80 step 3, Desert Island 39.4 → 85.0: the ground is the original's outside our places (the invented mesas gone, the beach abov |
| 181 | 798f301 | 26.10 18:45 | PLAN_NEXT: the user's token-saving rules (cheap models for routine agents, small tasks, few resumes, 1-3 targeted tests per agent, the full  |
| 180 | 715ea1a | 26.10 18:25 | docs/future/TRAILER_BRIEF.md: the user's 60-second trailer brief, deferred until the base game is verified; WORKLIST #36 |
| 179 | 432290c | 26.10 18:20 | docs/future/EXPANSION_BRIEF.md: the user's 15-hour expansion brief (Nera, Sendell's underground, side stories), gated on the verified base g |
| 177 | e084b07 | 26.10 17:50 | STORY_SYNOPSIS.he.md: the story by chapter, in Hebrew, for building more content outside; the 15-hour target and the user's ideas noted |
| 176 | 00ec83c | 26.10 17:44 | WORKLIST: statuses brought up to date |
| 175 | e98a8eb | 26.10 17:35 | CAM-FOLLOW: the Follow camera stands at Twinsen's back (7 m, 1.4 m up, critically damped on his facing, settles in ~0.25 s, no flip when bac |
| 174 | 14d4850 | 26.10 17:22 | drop scratch scripts that rode in with the WIP checkpoint |
| 173 | 8ce958e | 26.10 16:50 | Laptop benchmark, build 172 (Vega 8): startup 19.5 → 10.7 s, Medium 58-60 on every route, High 53-60, 0 compiles while measured |
| 172 ★ | 6dbac07 | 26.10 16:10 | Stop at the usage limit: WIP patches for WORLD-80 Citadel and CAM-FOLLOW, PLAN_NEXT with the state and the order to resume |
| 170 | dc270c0 | 26.10 14:02 | Benchmark, second computer (Intel UHD), build 169: startup ~110 s → 6.6 s; Medium 52-60 fps on every route (street 37 → 52), High street |
| 169 ★ | 705d354 | 26.10 13:33 | Merge LAZY-REGIONS + AUTO-FIT: only Citadel (and the save's own area) is built at startup, every other area on first entry behind the black  |
| 168 | f09ce7e | 26.10 07:38 | Benchmark on the user's second computer (Intel UHD, DPR 1.475): startup ~110 s, Medium street 37 fps GPU-bound, no shader compiles during pl |
| 167 ★ | 7fd0657 | 26.10 06:38 | WORLD_SIMILARITY: the School of Magic is the north-west giant stone mask (the high façade) with the arched hall beside it, per the user's r |
| 165 | a3df09f | 26.10 06:29 | WORLD_SIMILARITY: the user's call on Hamalayi (ours, with a few recognisable LBA1 places), the façade question open |
| 164 | c8ce078 | 26.10 05:37 | Merge VALVE-STUCK: the playthrough bot counts a throw that hits nothing as a miss for both the faced and the aimed enemy, so it leaves enemi |
| 163 | 5e0a599 | 26.10 04:40 | Merge MUSIC-2: playlists per place (village/village_b, island/island_b, zeelich/zeelich_b), each piece played once to its end, 20-60 s silen |
| 162 | 6ad111c | 26.10 03:17 | Merge SAVE-SLOTS: Save Game in the pause menu (six slots, overwrite asks first, refused in scenes, fights or when down), Load Game on the ti |
| 160 | 71da4f3 | 26.10 02:36 | Merge PERF-ARRIVAL: no shader program compiles during play on any route or preset (warm-up of every shadow caster kind and light count, post |
| 159 | 68a01a7 | 26.10 01:29 | prologue test: throw at each well mite from 4-6 m and wait for the ball to come back (a mite that walked up to 2.5 m had the ball fly over i |
| 158 | 503b383 | 26.10 00:08 | prologue test: keep his magic up during the well's mite fight, like his life (missed throws spent it; CONTROL-FEEL's runs failed this step 2 |
| 157 | b9de5a7 | 25.10 22:51 | opening test: confirm New Game when a save is present (the confirmation screen since 7fcaade) |
| 156 | 15af8bb | 25.10 20:19 | PLAN_NEXT: the night plan (CONTROL-FEEL, ARTHUR-12 running; then PERF-ARRIVAL, SAVE-SLOTS, WORLD-80 research, MUSIC-2) |
| 153 | ee08273 | 25.10 19:55 | Laptop benchmark, build 150 on battery (balanced power): GPU time 2-4x on every route with the same draw calls; not comparable, rerun plugge |
| 152 | 699cc60 | 25.10 19:51 | WORKLIST #31: control feel (jump height and dodge distance to LBA2's, a Follow camera mode, LBA2 stays default) |
| 150 ★ | 38a92e7 | 25.10 19:30 | prologue test: 16 ball tries per well mite (one wandering mite dodged 8 in one of four runs); WORKLIST #30 Arthur at 12 |
| 149 | fdf4a1b | 25.10 18:48 | Merge R7-VERDICTS: one verdict policy for every test (tests/lib/boot.mjs: FAIL on a failed check, page/console error, crash, missing own fil |
| 148 | 7fcaade | 25.10 18:29 | New Game asks before replacing a saved game (Back first), and keeps the old save as lba3_save_v1_before_new; WORKLIST #29 save slots after t |
| 147 | 7461225 | 25.10 17:42 | Laptop benchmark, build 145: Medium 60 fps on street/combat/interior; the arrival route is the weak spot (53.5 fps, GPU p95 18 ms) |
| 145 ★ | 487408d | 25.10 17:16 | Merge CONTAINERS-2: containers refill on each visit as in LBA2 (once per visit; clover/key givers once ever; at most 3 untaken bonuses each) |
| 144 | 6d7bc38 | 25.10 14:36 | Merge CONTAINERS: LBA2-style containers (search any time; the bonus pops after 0.7 s and stays until taken, saved as loot; a heart/flask is  |
| 143 | 923ba48 | 25.10 13:19 | audio.mjs expects the voice bus with VOICE-MIX's x2.2 boost; WORKLIST #28 done |
| 142 | 9b27941 | 25.10 11:58 | Merge WORLD-FIX + R6 + DINOFLY-POS + STATUE: a world-fit scan (tests/worldfit.mjs) and its fixes (houses on level ground, re-laid doors and  |
| 141 | 3dca29c | 25.10 11:42 | Merge R5-OPENING: Zoé's hand on the tap and in the stream (a grip layer), the kitchen reframed (less dark ceiling), planted feet in the ope |
| 140 | 843e3a5 | 25.10 09:31 | VOICE-LEN: long lines no longer cut the gibberish short (syllables the typing gets ahead by are queued and spoken at the voice's pace until  |
| 139 | e87209b | 25.10 07:12 | Merge ANIM-COMBAT: Twinsen's combat keyed after LBA2's own anims (throw cocks back and whips over, release from the hand; sword backhand/for |
| 137 | 48992d3 | 24.10 23:13 | Remove the applied CAM-2 and CLAR-2 WIP patches |
| 136 | e65f548 | 24.10 22:31 | Merge CHAR-2: Twinsen's neck reads as a neck (round sections, a nape into the skull, the cape's shoulders rising into a soft collar; still L |
| 135 | e2ba54f | 24.10 21:36 | Merge CLAR-2 + HINTS-LESS: the objective shows only when it changes (5 s), toasts that repeat what was just said cut (-53% toast text), key  |
| 134 | f30d36d | 24.10 20:30 | Block 8 running (camera, text/hints, characters), block 9 next (world graphics, combat animation, opening polish) |
| 132 | 9aa5f63 | 24.10 19:50 | Loading screen (#27): MEA Studio's logo animation (as in the studio's other games) while the assets download, then a picture of the harbour  |
| 131 | ad2be62 | 24.10 19:29 | Merge RENDER-INV: draw batches per 48 m cell in every area, lamps skip unlit pixels, the MSAA target resolves colour only (D3D11 emulated th |
| 130 | 8c3fc46 | 24.10 19:22 | WORKLIST: the overnight plan (RENDER-INV merge and build, then camera + text/hints, the MEA loading screen, then world graphics + Twinsen's  |
| 129 | 6602903 | 24.10 18:42 | The user's laptop benchmark on build 127: MSAA 2x is ~10 ms of the Medium street's 19 ms GPU time |
| 127 | cd2b29b | 24.10 17:58 | Loading screen plan: the MEA STUDIO logo animation from lo-meushar (saved for reuse), then a rendered game picture with a real progress bar |
| 126 | f560b9e | 24.10 17:04 | WORKLIST: LBA2-style money/life in bins and suitcases (with R10), the world after the original incl. structure and statues plus the 12 years |
| 124 | 971dc70 | 24.10 16:16 | Laptop benchmark notes: plugged in for build 122; Medium is the user's target |
| 123 | ff438c2 | 24.10 16:13 | The user's laptop benchmark on build 122 (interim RENDER-INV): Medium near 60 fps indoors, 43 on the street; High GPU-bound at 25-34 fps |
| 122 | 06ce023 | 24.10 16:00 | The user's laptop benchmark (build 120): GPU-bound at Medium/High (interior 109 draws at 50 ms vs ~12 ms CPU) |
| 121 | 0c4a30d | 24.10 15:45 | Merge RENDER-INV interim (for the user's laptop benchmark): the map's background build in short slices once per displayed frame (no stutter  |
| 120 | 10009ea | 24.10 15:41 | PLAN_NEXT: top priority, the game runs well and looks good (the draw-cost fix across every region, High as a goal), then the regular fixes |
| 119 | 6b7ffda | 24.10 14:02 | The user's research-based performance agent installed (lba3-performance-engineer); frame rate first: RENDER-INV resumed alone with its requi |
| 118 | 9faa1a8 | 23.10 09:52 | Block 7a scheduled: RENDER-INV, CAM-2 (resume), CLAR-2/HINTS-LESS (resume); 7b next |
| 117 | c61e9b0 | 21.10 15:34 | New agent lba3-rendering-investigator (not run); the user's photos and notes (Twinsen's neck, Zoé in the opening, the whole-world rendering |
| 116 | 031b294 | 21.10 14:48 | Small fixes: see-through glass over the house windows' views (HOUSE-WIN); chapter 4's calm between storms 45 -> 22 s (CH4-STORM); a guard kn |
| 114 | 3f9a7dc | 20.10 14:39 | PLAN_NEXT: the external build-109 review (saved as reviews/BUILD109_REVIEW.md) checked against build 111 and sorted into the small/medium/la |
| 113 | 6835f2b | 20.10 14:35 | PLAN_NEXT: all open work sorted small / medium / large / very large, with the recommended way of working per size |
| 112 | 50ecb02 | 20.10 13:27 | The user's notes on build 111 saved for later: 9 parked rows (music, combat anims, voice mix, Dino-Fly, world match, house windows, statue,  |
| 111 | d652c30 | 20.10 13:03 | PLAN_NEXT: FRAME-1 merged (stopped after its tested work), its unfinished extra kept as a patch |
| 110 | b36c05c | 20.10 12:34 | Development pause: CAM-2 and CLAR-2 stopped, their unfinished work kept as patches (docs/lba3-production/wip/); the next-steps plan (PLAN_NE |
| 109 | 4dd9501 | 20.10 11:57 | Development paused by the user: block 6b finishes, block 6c (WORLD-FIX, VOICE-2) parked |
| 107 | 1a182a4 | 19.10 07:34 | Merge ADV-2: chapter 4's wind-pump fault found by watching and listening (gusts, a jammed gear that grinds, Brosk half right: a shaken pipe  |
| 106 | 1dea515 | 19.10 06:27 | Merge CHAR-OPEN: Zoé's bun on her head, Twinsen's tunic with sleeves (arms and shrug read), Zoé's arms with volume, the guard's coat hem s |
| 105 | 40946f8 | 19.10 04:41 | Block 6 scheduled: FRAME-1, ADV-2, CHAR-OPEN (BACKLOG row, PRODUCTION block table) |
| 104 | ea9f446 | 19.10 04:26 | Merge PERF-2: street draw calls -40%, render-submit CPU -42-46% (shown-only matrix updates, far-actor cull, merged textured materials, insta |
| 103 | 9750466 | 19.10 03:53 | Merge OPEN-3: the opening's 30-item bug list, 26 fixed one by one (no pass-through of solids, faces seen, cave framing, ceiling), a per-fram |
| 102 | 533d0b5 | 18.10 23:19 | BACKLOG: BUG-WALL-T (a flaky held-frame check after BUG-WALL) for block 6 |
| 101 | cd1134b | 18.10 20:36 | Merge ANIM-DEATH: one knock-out for every enemy (fall with weight, on the ground, blink; bonus lands on the ground) |
| 100 | 8ff2e59 | 18.10 20:08 | Merge WORLD-SHAPE: Desert Island's coastline and high ground after the original, the Hamalayi de-boxed; audit of every region against the or |
| 99 | 4918e9b | 18.10 19:04 | BACKLOG: VOICE-1 approved by the user by ear |
| 97 | a1ff730 | 18.10 15:50 | Desktop builds show their CI build number (title screen corner, benchmark report), so the installed download can be told apart |
| 96 | a9863db | 18.10 15:43 | DOOR-SP: the spaceport terminal's door is a real door (it read as an empty frame); BACKLOG OPEN-3 item-by-item plan |
| 95 | bb8492d | 18.10 15:26 | Install the performance/opening agents (runtime-performance, frame-pacing, opening-cinematic) and record the block schedule |
| 94 | 31d9a78 | 18.10 14:15 | Merge OPEN-2: the opening reworked (new Zoé, a voice on every line, no vanishing, the story's set-up told in shots) |
| 93 | 292a775 | 18.10 13:57 | Install the final release auditor agent; record the mandatory final audit rule (PRODUCTION.md, COORDINATION.md) |
| 92 | a4fac7f | 18.10 13:14 | BACKLOG: ADV-1 done, ADV-2 next |
| 91 | 1ee0ef4 | 18.10 12:28 | 0.31.0: blocks 1–2 (PERF-IGPU, VP-10, CTRL-1, MAP-1, PLANET-1, SD-2-FIX, EQ-1) |
| 89 | 5d892c0 | 18.10 11:21 | MAP-1 evidence re-shot on the merged tree (CTRL-1 + MAP-1) |
| 88 | 7ba4227 | 18.10 09:26 | Merge EQ-1: Baldino's hop-pack, a bounded jetpack from chapter 10 (0.30.0) |
| 87 | cb5649e | 18.10 08:50 | Merge PLANET-1: every Twinsun-Zeelich crossing is a spaceship flight (0.29.2) |
| 86 | 0d3bfb7 | 18.10 08:42 | Merge SD-2-FIX: Zeelich buildings de-boxed (Esmer builder), Knartas jars/lamps/harbour basin, island cameras clear of occluders |
| 85 | 2d767be | 17.10 19:11 | Merge SRC-1: source inventory; Zoé rebuilt from LBA2 body 26's measurements |
| 84 | a9c1ec8 | 17.10 19:09 | PLAY-1: Doran's boat rides above the swell (no sea inside it); no V hotkey for the Retro 1997 look (Settings only); the user's playtest note |
| 83 | a568362 | 17.10 14:55 | BACKLOG: PERF-IGPU with the user's benchmark numbers and the black-frame flicker report |
| 82 | d3a7343 | 17.10 14:37 | BACKLOG: CTRL-1 — tank controls, follow camera, ball distance (the user's feedback) |
| 80 | ea058fc | 17.10 14:20 | BACKLOG: PACK-2 started (SRC-1, EQ-1, ADV-1); NARR-1, CLR-1, UX-1, LOCO-1 queued |
| 79 | c0264c8 | 17.10 14:11 | BACKLOG: OPEN-2 (opening rework, the user's feedback) and PACK-2 (the new agent packs' tasks) |
| 78 | 04afa20 | 15.10 10:15 | characters.js: Twinsen's hair note after VP-1b |
| 77 | b183aa7 | 15.10 08:51 | Merge branch 'worktree-agent-a1c7ad5e93b7c9608' into ccr-adf00ea7-37ebl3 |
| 76 | 7d38299 | 15.10 08:18 | BACKLOG: VP-1b (Twinsen's hair) and VP-10 (occluders) as in the original LBA2 — the user's decision |
| 75 | d1addce | 15.10 05:49 | REV-V-1: visual review of VP-1..8, SD-1..3, CH-DF (accept with notes; CH-DF doze pose rework) |
| 74 | f0f3980 | 15.10 05:45 | BACKLOG: PLANET-1 — story crossings to Zeelich by spaceship only (user approved) |
| 73 | 567e9b8 | 15.10 04:20 | Merge branch 'worktree-agent-af7090bcb43ba8f62' into ccr-adf00ea7-37ebl3 |
| 72 | 31deb6c | 15.10 04:12 | REV-TY-5: review of TY-3-FIX and TY-4 (accept; D1–D3 Low, T1 chapter10.mjs on head); TY-5-FIX in BACKLOG |
| 71 | 49cacad | 15.10 03:40 | Merge branch 'worktree-agent-a5c22898755b8fc79' into ccr-adf00ea7-37ebl3 |
| 70 | 826718d | 15.10 03:22 | Merge branch 'worktree-agent-a1a0212d48c0a6069' into ccr-adf00ea7-37ebl3 |
| 69 | 1f2dc97 | 14.10 23:23 | Merge branch 'worktree-agent-a1c4957c846e50461' into ccr-adf00ea7-37ebl3 |
| 68 | d5310fc | 14.10 21:16 | BACKLOG: Zeelich stays a separate planet (spaceship only); CH-DF Dino-Fly after the original. desert-life reads the toast in its own step |
| 67 | 3391c8d | 14.10 18:23 | Merge branch 'worktree-agent-a7062f65796f4ce04' into ccr-adf00ea7-37ebl3 |
| 66 | 67179cd | 14.10 18:11 | Tools: shots.mjs 'islands' set (Zeelich, its seven islands, four Hamalayi spots) |
| 65 | 87bd056 | 14.10 18:00 | Tools: tests/lib/shots.mjs takes progress screenshots of 16 places from the play camera |
| 64 | 2cb8d8f | 14.10 17:07 | Tests: quitAndKeep reports where a reload's boot stopped; LIVE_ERRS=1 prints page errors as they happen |
| 63 | 5941bb5 | 14.10 15:45 | Visual pass VP-0: baseline and journey audit by input, prioritized backlog VP-1..VP-8 |
| 62 | 34fd9c9 | 14.10 15:27 | Review REV-TY-4 of 0.26.0 (Desert Island): report and evidence |
| 61 | 8c28476 | 14.10 14:33 | Install the visual team kit (polish, animator, graphics, character, visual reviewer) and its workflow |
| 60 | 0e278f0 | 14.10 13:41 | Merge TY-3 (Desert Island's Kesh and The Wind-Catcher, 0.26.0) |
| 59 | ce4ff85 | 14.10 12:38 | Review REV-TY-3 of 0.25.1 (independent re-review): report and evidence |
| 58 | 41363db | 14.10 11:22 | Fix the twelve-years-on reviews' defects (REV-TY-1, REV-TY-2) and the flaky chapter-10 drone step (0.25.1) |
| 57 | f0cc0a7 | 14.10 10:31 | Review REV-TY-2 of 0.25.0 (independent reviewer): report and evidence |
| 56 | 926b21e | 14.10 09:47 | Review REV-TY-1 of 0.24.0 (independent reviewer): report and trimmed evidence |
| 55 | eee77ea | 14.10 06:55 | Twelve years on, first set: the family home, The Old Pump, the harbour's trade (0.24.0) |
| 54 | d4149a8 | 14.10 04:50 | Zeelich's seven islands and Citadel Spaceport (0.23.0) |
| 53 | 07a7d7f | 14.10 03:25 | Playthrough: Zoé's segment retries from the gate; STATE: open item and the next task (Zeelich islands) |
| 52 | b5e70c2 | 14.10 03:04 | Fix D18: fill the dead-end gully below the orchard (soft-lock: a dodge at the plateau's edge dropped Twinsen in for good) |
| 51 | 0eaee61 | 14.10 02:58 | Review follow-ups: pier banks walkable (D10), Twinsen's ball back after a Zoé resume (D5), safe-spot retry, D14 dead fallback removed, CSS  |
| 50 | 173e47d | 14.10 02:20 | 0.22.1: stabilization pass docs (QA story table, packaged app, blocked items; STATE, BACKLOG, PROGRESS, TASKS, NEXT_ACTION) |
| 49 | 45c7999 | 14.10 02:17 | Playthrough: the guardian is never assisted; the coil's logged ISO fallback under ASSIST; chain reaches the end |
| 48 | a48fb46 | 14.10 02:12 | Fix D16/D17: Continue no longer cuts a scene the load began (core fight, Sendell, control room) |
| 47 | 29696ba | 14.10 01:39 | Harness: opt-in logged ISO assist (ASSIST=1) for fights the bot loses; old-mill climb shared; chapter 10 segment steps |
| 46 | 55c96ec | 14.10 01:08 | Harness: use can wait for a particular prompt (someone walking past the thing) |
| 45 | 9349bd4 | 14.10 01:02 | Fix D15: the control room's door is there in chapter 8 after a real chapter 2 (blocker) |
| 44 | e28a870 | 14.10 00:56 | Fix D14: Zoé's chapter-8 run started inside the square's barrier ring (blocker) |
| 43 | 248a723 | 14.10 00:44 | Fix D13: chapter 8's cistern lever stood inside a station tank (blocker) |
| 42 | 8934217 | 14.10 00:35 | Harness: sword when the ball can't reach, use accepts the thing's prompt short of its spot |
| 41 | c28bf08 | 14.10 00:17 | Fix D12: step off the Hamalayi lift at the top of the cliff (chapter 6 blocker) |
| 40 | 47d2d09 | 14.10 00:01 | Playthrough: chapter 5 board from the glider's free side; use waits out the hero's action; planner refuses steep patches on the way; chapter |
| 39 | 3865eae | 13.10 23:48 | Fix D11: a story exit naming only the room no longer puts the hero at NaN (chapter 5 hangar blocker) |
| 38 | c8fb2f6 | 13.10 23:38 | Playthrough: chapter 4 descent waits out its line; segment helpers live in the harness (P.exitTo, P.flyTo, P.hitTarget) |
| 37 | fa401ec | 13.10 23:31 | Fix D10: the Desert Island pier's land end meets the sand (chapter 4 blocker) |
| 36 | f1d7046 | 13.10 23:22 | Fix D9: ship LBA1's room layouts in the desktop app and published page |
| 35 | 76eac02 | 13.10 23:15 | Harness: guard openings for charged throws, outdoor-region scene lookup, braked hops; old-mill climb by jumps in the Zeelich segment |
| 34 | c79cf45 | 13.10 23:00 | Harness: paths keep out of door triggers (also when smoothed), walk out of the one he stands in |
| 32 | 8fad4d6 | 13.10 22:47 | Production docs (backlog, story map) and harness: full charge hold, aimed-target charge, back-step on tells |
| 31 | feb6d7a | 13.10 22:44 | Stabilization pass, part 2: safe spots, small-screen menus, refused-exit order, playthrough harness |
| 30 | c36d8dd | 13.10 21:45 | Stabilization pass (part 1): five defects fixed, player-input harness and regression tests; agent kit installed |
| 29 | 177d0ea | 13.10 19:09 | 0.22.0: walk-through door transitions, shaders compiled behind the fade, settling animations |
| 28 | 39aa722 | 13.10 17:53 | 0.21.0: LBA1's rooms rebuilt from their layouts: FunFrock's asylum, the Temple of Bù's maze and halls |
| 27 | bcf9215 | 13.10 17:19 | LBA1 catalogue: the room/grid format and what each of the 120 rooms is (descriptions only) |
| 26 | ca5de1c | 13.10 17:13 | 0.20.0: LBA1's fat FunFrock troopers return as enemies |
| 25 | 104c535 | 13.10 16:57 | 0.19.0: LBA1's Spheros come back to Citadel |
| 24 | 7f983f4 | 13.10 16:44 | LBA1 study: body format and a catalogue of LBA1's cast (numbers and descriptions only) |
| 23 | dde5312 | 13.10 16:34 | 0.18.0: guard dogs, Bersimon's tent and the School of Magic |
| 22 | 0754919 | 13.10 16:02 | 0.17.0: Joe the Elf, the Esmers' shuttles, LBA2's dogs and the dog-training yard |
| 21 | 7cb6a15 | 13.10 15:18 | Chapter 4: the dig reaches the Temple of Bù (Temple-Park, Bald Mountain) |
| 20 | 5605835 | 13.10 15:10 | 0.16.0: Vesk's guards — Quetch and Grobo troopers in his uniform |
| 19 | c25d60a | 13.10 14:56 | 0.15.0: Vesk becomes the villain, with a silhouette of his own |
| 18 | a2cf0f8 | 13.10 14:41 | Zeelich's moles after the original (robed, the long pale snout) and the triangle-headed townsfolk |
| 17 | 9f83c4c | 13.10 14:25 | 0.14.0: Zeelich's peoples after the original — capsule Esmers, Mosquibees, burrowers |
| 16 | 3d5d10e | 13.10 14:09 | 0.13.0: the characters after the original, one design language for the cast (Blender via bpy) |
| 15 | 287fb0a | 13.10 12:06 | Tests: the interaction prompt shows W in Classic (LBA2's talk key) |
| 14 | c8d56f5 | 13.10 11:38 | 0.12.0: from the user's benchmark (Intel UHD, GPU-bound): the lamp light pool by quality (8/4/2), bloom on High only, a 1024 PCF shadow map  |
| 13 | 639f613 | 13.10 10:29 | Re-bake (the Dino-Fly) |
| 12 | b5f1948 | 13.10 09:05 | The harbour at the west end of the original's pier: built in its first frame and shifted whole (quay, pier, Doran's boat, the ferry, the lif |
| 11 | 52b264b | 13.10 08:40 | Magic ball after LBA2: a throw costs 1 magic; with magic 4 bounces and home on the 5th contact, without magic home at once; the arc restarts |
| 10 | d8cf6df | 13.10 08:30 | Re-bake the sculpted models (palms, the house's new cushions, quilt and curtain) |
| 9 | 53e59fc | 13.10 07:35 | Merge branch 'citadel-wip' into ccr-adf00ea7-37ebl3 |
| 8 | d6b9639 | 13.10 07:22 | Gibberish voices: every character babbles in their own voice while their line types out |
| 7 | e7d7338 | 13.10 06:29 | Givers after LBA2: the Normal-mode action hop pops a bonus out of bins, cupboards and barrels |
| 6 | 56a86ea | 13.10 05:46 | The athletic run and the ball throw after LBA2's own (mapped through its File3D tables) |
| 5 | dfed311 | 13.10 05:34 | Characters and walk measured on LBA2: Twinsen's split robe and big hands, Zoé remodelled, the original's walk and idle |
| 4 | 130d043 | 12.10 19:14 | Start-up behind the loading screen, a fixed light pool, aiming while holding the ball, blonde Zoé |
| 3 | 2990268 | 12.10 18:50 | Review fixes: real-time simulation at low frame rates, frame-time instrumentation, settings applied only when changed, cheaper shadows |
| 2 | 4229393 | 12.10 17:02 | Docs: first desktop release built on all three platforms |
| 1 | 25dc708 | 12.10 16:50 | Desktop app: Electron build for Windows, macOS and Linux, built by GitHub Actions |
