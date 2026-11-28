# THE SECOND SHIFT — the Zeelich thread (P109, docs/SECOND-SHIFT.md, part 1)

Worker SHIFT-ZEELICH, 23.11.2026, branch worktree-agent-ab43d3cf6d7fac153 (from ccr-c1c2c4b9-dep6ed f4c38661).
All results: **Automated runtime only** (headless Chromium, SwiftShader). Nobody has played it with hands, eyes or ears.

## What the source had (read, not assumed)
- Chapter order (src/game/story/index.js ORDER): Mill Lane's lift is chapter 3 `zeelich` (story/chapter2.js owns
  `LiftThread`, story/zeelift.js; the lift's build src/game/zlift.js); the council is chapter 9 `council` (story/council.js,
  thread story/cnline.js, Mill Lane's part `KellThread` in zeelift.js); the Core is `core` (expanded 16, base 12;
  story/answer.js `ShellThread.irsaHolding`, the line `co_irsa_1`). EXP_KEYS = throttle, ballastra, balances, survey.
- Brum is the council's `councilC` (n_councilC "Councillor Brum"); Mother Snuff's bakery is the old watch house at
  Zeelich-local (12, −9), ~38 m from the lift at (−10, 22): out of earshot, so Brel relays (the brief's own condition).
  Her oven is cold until the side story "the Second Bake" moves the crate off her flue (`zl_crate`).
- The lift had no cable and no stop mark; Kell held a brake lever; the platform's line powered it.

## What is now in the game
### Chapter 3 — Kell's lunch (optional; after the water is in and Kell has thanked Twinsen)
Setup: coming by the lift on the lane, Twinsen hears Brel at the tap pass on Mother Snuff's word (warm bread if her oven
was fixed, yesterday's if not); Kell won't leave the handle with Brel's barrow due up; Twinsen offers one trip; Kell lets
the deck down and Brel wheels his barrow on. Goal: take the handle (prompt "Take the Handle"; talking to Kell does the
same). Challenge: Up/Down move the deck (slow to start, so taps nudge), letting go of the keys brakes; from the handle the
deck's lip can't be judged, the yellow rag on the haul cable and the nail (chalk band) on the batten can — rag to the
nail = level. Stopped level: one wheel-over-joint sound and the barrow seen rolling over onto the terrace. Near miss
(7–45 cm off): the barrow runs at the lip and jolts back, Brel "Up a touch!" / "Down a touch!"; the second miss adds
"Cloth to the nail, Twinsen."; nudge from where it is, nothing restarts. Far short: "Keep her coming!" once. Let go (E):
the deck stays; walk off and Kell comes back with his loaf and waits by the lever; the trip stays Twinsen's. Outcome: Kell
eats ("Bread tastes better when somebody else drives."), the barrow by the service door, Brel unloading on the terrace;
journal line zt_j_lunch (the cloth/nail rule, kept for later). No currency, collection, meter or objective.
Flags: zt_lunchCall, zt_lunchGo, zt_lunch. Save/reload anywhere returns to "the deck down for the barrow" (or done).

### Chapter 9 — Brum comes downstairs (on the chapter's path, after the stop)
Kept: the stop order, the stalled cart and Brel's empty jug (the cut-away), the isolator on exactly one relay. New: after
the stop Brum is on Mill Lane by the dry tap ("I voted for this, so I came down to look at it."). After the clip the
motor runs off the mills, Kell brings the stalled cart down and explains the staffing: the platform's line stopped the
deck at the landing by itself, the mills' doesn't, so somebody stops it by hand while somebody rides up and tips the
cart; Brum offers his hand (his ward, his vote); Kell steps onto the deck (names the cloth himself if the chapter-3 lunch
was skipped). Objective "Show Brum the cloth mark from the lift's handle" (star on the handle). Brel tugs the cable (the
rag jumps, a rattle; his line the first time only) if Twinsen stays away. At the handle Twinsen shows him ("From here you
can't see the landing… Cloth to the nail, and she's level."), Brel minds Brum's coat ("keep that coat clear of the cable"
/ "eleven budgets"), Brum takes the handle and runs the trip: the cloth to the nail, the cart's wheel over the joint (the
same sound), the cistern fills, the tap runs, Kell: "Level as a table. You'll do, Councillor." → the chapter ends as before.
Revisits (any later chapter): Brum at the handle, his violet council coat on a peg on the motor house clear of the cable,
Kell up by the cart at the cistern; Brum's idle lines. Flags: cn_bv, cn_brumShow, cn_brum. Brum's council scenes are all
before the stop, so he is never needed upstairs afterwards.

### The Core
In a game with cn_brum: after the branch is turned in the rest, the radio carries Kell ("Brum, she's coming up. Watch the
cloth, and when it gets to the..."), Brum ("Cloth to the nail. I know."), Kell ("Right. I'll see to the cart."), the caption
"(On the radio: a wheel rolls over the lift's joint without a bump.)" with the wheel sound, then Irsa's unchanged "I've let
go. Kell's cart is still climbing." Then Vesk's choice-dependent lines, his key, the bar after her two, the two knocks,
Arthur, Zoé's signal, the arrest — unchanged. No boss phase. Without cn_brum (every older save): Irsa alone, as before.
The knocks are not used for the lift.

## Story/quest map and who knows what when
| When | Twinsen | Kell | Brel | Brum | Irsa |
|---|---|---|---|---|---|
| ch3 before the lunch | the lift's repair | the rag is his own mark | knows it (docker) | — (upstairs) | — |
| ch3 lunch (optional) | learns rag-to-nail by sight (or Brel's 2nd hint) | goes for bread; back says "Cloth to the nail" | gives the hints | — | — |
| ch9 after the stop | — | learns the platform's auto-stop is gone with the line | jug empty | comes down, sees his dry ward | "the chief warned us" |
| ch9 lesson | shows Brum (Kell names the cloth if the lunch was skipped) | rides the cart | tugs the cable, minds the coat | learns rag-to-nail, runs the trip | — |
| ch10+ revisits | — | by the cart up top | at his tap | at the handle, coat on the peg | at the feed (as before) |
| the Core | hears it on the radio | starts to explain | — | "Cloth to the nail. I know." | "still climbing" |
Clue redundancy for the rule (rag to the nail): Kell's "I watch my cloth" (ch3), the rag and nail seen, Brel's second
hint, the journal (ch3), Kell's ch9 line when the lunch was skipped, Twinsen's own words to Brum, Brel's tug and word,
the ch9 journal. None of it is needed for progress except the ch9 "show" prompt, which has an objective and a star.

## Flags and saves (format 6; nothing in the save format changed)
New flags only: zt_lunchCall, zt_lunchGo, zt_lunch (ch3); cn_bv, cn_brumShow, cn_brum (ch9). Every older save has none
of them: ch3 saves play the lunch if they are before it; ch9 saves before the clip play the lesson; a ch9 save with the lane
already running and no cn_bv (made just before the old chapter end) ends the chapter as before; every save past ch9 (both
campaigns; base-campaign games are only ever such saves, main.js migrateSave) keeps Kell at his lever, no Brum on the lane,
and the original Core exchange. Re-entry and reload rebuild every moment from flags (the deck, the barrow, who stands where).

## Visible changes (each for the user's pick; pictures in captures listed below)
1. **The lift's haul cable, batten, sheave and arm, the stop mark** (yellow rag on the cable, a nail with a chalk band on
   the batten a metre above the motor house), **and a bail with a hoist cable over the deck** — on the lift in every
   chapter. Before: the deck hung on nothing visible.
2. **Brel's barrow** (ch3 lunch only): on the lane, on the deck, then by the service door for the rest of ch3.
3. **Kell's loaf** in his hand when he comes back (ch3 lunch).
4. **Brum on Mill Lane** (ch9 after the stop: by the dry tap, by the motor house, at the handle) and at the handle on every
   later visit; **Kell on the terrace by the cart** on later visits (before: at his lever).
5. **Brum's council coat on a brass peg** on the motor house (later visits; violet with brass collar and hem; the peg itself
   is there in every chapter, empty).
6. The Core: no picture change; four radio lines and one caption line before Irsa's (text evidence in the test log).

## Decisions for the user
1. **Kell's lunch is optional** (recommended), or a required step before Irsa's bench? Optional keeps chapter 3's path
   and every old route untouched; the Core needs only the chapter-9 scene. (A) optional — chosen; (B) required.
2. **Brum's lesson is a required step at chapter 9's end** (one prompt at the handle, ~10 s of his trip), or played
   automatically? (A) required with objective and star — chosen (the brief: "Twinsen shows Brum"); (B) automatic.
3. **The stop mark's look**: (A) yellow rag + nail + chalk band at 3 m — chosen for legibility at Far; (B) a red rag (as
   first built: lost against the red flywheel); (C) a bigger painted target board instead of a nail.
4. **The coat**: Brum's model wears a slate-blue robe that can't come off (a baked model), so the "council coat" is a
   second, violet council coat on a peg. (A) as built; (B) hang his violet hat instead; (C) no coat prop, Brum just
   stands clear of the cable.
5. **Kell on revisits** stands by the cart up on the terrace. (A) as built; (B) beside Brum at the lane (crowds the handle).
6. **The lift on revisits is still** (deck up), not running trips; "the moving cable" is not animated. (A) still —
   chosen (no physics risk with Twinsen on the bay); (B) a slow ambient trip cycle that pauses while he is near the bay.
7. **The new support work over the motor house** (batten, arm, sheave, a cable over to the jib, a bail on the deck) is
   in every chapter, also chapter 3 before the lunch. (A) keep; (B) only the cable and the mark, no bail.

## Tests (Automated runtime only; tests/second-shift.mjs, fixtures rewritten to the run's port, a fresh profile each)
Played by input (keys held and tapped through tests/lib/player.js, time stepped; no teleport, no flag set):
- A chapter 3 from new-05: the repair to the water, the lunch's setup, Save & quit → Continue there, the handle, the
  first-try stop (24 frames of Up after the first stretch; stopped 7 mm from the nail), the wheel sound once, the barrow
  over, Kell back with yesterday's bread, Save & quit → Continue after, Irsa's bench and Baldino as before — PASS (A4's
  prompt check failed on the test's own read of a still-hidden prompt box; fixed in the test and passed as V0).
- B near miss over (barrow jolts 0.24 m, "Down a touch!", the deck kept), 9 taps of Down to level; two misses short
  ("Up a touch!", then the clue named once) — PASS. C let go half way, walked off, Kell back with the loaf; Save & quit
  with the handle in hand → nothing in hand, the deck reset, Kell back; taken again, level, "I watched." — PASS.
- D every volume 0: the near miss seen (jolt, the text box), the stop by sight — PASS. V the Follow/Far pictures with the
  nail and knot inside the frame above his head — PASS.
- E chapter 9 from new-12-stop (no lunch: the optional scene skipped): Brum at the dry tap, the isolator, the lesson's
  setup, Brel's tug (spoken once, then silent), Save & quit in the lesson, the show, Save & quit before Brum's trip →
  his trip runs (cloth exactly at the nail, the wheel once) → Borrowed Time — PASS.
- F the Core from new-15-last: as saved (Irsa alone, as before; Vesk pulled clear) and STAGED with cn_brum, Vesk pulled
  clear and STAGED with cn_brum, Vesk left: the line order Kell → Brum → Kell → caption (+ sound) → Irsa → Vesk's key,
  then the bar, two knocks, Arthur, the signal, the guard, the epilogue — PASS ×3.
- G base-13 (base campaign, past ch9): Mill Lane as before — PASS; STAGED ch9 save with the lane running and no new
  flags: the old ending, no lesson — PASS. E8 STAGED expanded network-chapter save with cn_brum: the revisit (Brum at
  the handle, the coat, Kell by the cart, Brum's idle line) — PASS.
- tests/playthrough/12-council.mjs from base-12 (updated: the show step) — PASS (once).
- node tools/he-bundle.mjs, node tests/dialogue-check.mjs — PASS.
Not run (the user, 23.11: fewer tests): 06-zeelich and 14-shell segments, chapter3.mjs, chapter9.mjs (updated, not run),
campaign-thread B/K/P (K updated, not run), world-consistency, dialogue-scenes. second-shift A plays chapter 3's repair
the same way campaign-thread B does; F plays the Core to the epilogue as campaign-thread P does.

## Pictures (lba3/captures/second-shift/; play camera, Follow, Far, 1280×720; before = the starting commit's src)
pair-1-lift-from-the-lane, pair-2-at-the-handle (change 1), pair-3-ch9-dry-tap (change 4), pair-4-revisit-the-lane
(changes 4, 5; STAGED save) — before | after. After only: V1/V2/V3 the handle (cloth high, half way, at the nail) and
V3-crop, A2 the barrow aboard (2), B1 a near miss, C1 Kell back with his bread (3), E2 the lesson waiting, E5 Brum at the
handle, E8 the revisit, Fb1 the Core (no change in the picture). Capture command:
`GAME_URL=… SHOTS=<dir> node tests/second-shift.mjs` (and ONLY=V for the handle alone).

## Time (estimates from the tests' game time, not a person's play)
Chapter 3 lunch ≈ 1–2 min (four lines, 7 s of setup, a 6–8 s raise, the crossing and Kell's return); chapter 9 ≈ 1–1.5
min more than before (six lines, the walk to the handle, a 10 s trip); the Core ≈ 15–20 s more (four lines).

## Not verified
A person's hands, eyes and ears (no one played it); real GPUs; the wheel sound by ear (only that it plays, once); the
voices of the new lines (synthesised, unheard); Hebrew read in the game (the text checked by the tools and by reading);
touch and gamepad at the handle (the code reads the same move axis; not driven); the Medium/Near camera distances and the
Fixed (LBA) camera at the handle.

## The sweep (the user's rule: fix the cause in every case)
- Lifts: every lift/platform in src/game was listed by searching moveDeck, liftWinch, riders, ride(): Mill Lane (zlift.js),
  the Hamalayi cliff lift (hamalayi.js ride()), the dig's bore winch (digtest.js), the isles' lift sound (isleslife.js),
  the sewers' lift, Vesk's platform lift (chapter2.js), the shaft (chapter3.js), the lane cart (laneline.js). Only Mill
  Lane's deck is stopped by hand at a landing; the others run to fixed stops, so the stop mark and the hold mechanic
  belong to Mill Lane alone. Riders: the Hamalayi lift already carries its riders' y each frame, as the barrow and Brel do.
- The hold hook (actors.js heroHold) is used only by Mill Lane's handle; it is cleared on every load (LiftThread.applyFlags,
  which runs for every chapter) and whenever the hero leaves Zeelich.
- Prompt priority while something is in his hands: findInteractable ranks people ahead (−0.35 m); the "Let Go" prompt is
  ranked ahead of anyone (−1). No other "in hand" mode uses a prompt (the jetpack and the Esmer line have their own).
- Tests that assumed the clip ends chapter 9 (searched for cn_clip/isoAt in tests/): 12-council segment, chapter9.mjs,
  campaign-thread K — all three now do the show step; campaign-hands only measures the hand at the clip (unchanged).
