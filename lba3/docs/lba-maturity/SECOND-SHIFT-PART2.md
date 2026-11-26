# THE SECOND SHIFT — part 2 (P109, docs/SECOND-SHIFT.md: free play, Hamalayi, Ballastra)

Worker SHIFT-PART2, 23.11.2026, branch worktree-agent-a52610e0f5c8d0561 (from ccr-c1c2c4b9-dep6ed 157d9e12).
All results: **Automated runtime only** (headless Chromium, SwiftShader). Nobody has played it with hands, eyes or ears.

## What the source had (read, not assumed)
- Chapter order (story/index.js ORDER): observatory = ch 7 (story/observatory.js; the dome is an interior room, obsv, at
  x 4600; the peak, Lhar and the lift are the Hamalayi region at x 4300); survey = expanded ch 13 "The Cradles"
  (story/balances.js Cradles; the Cradle Hall archrooms.js bl_cradles); home = the epilogue (free play after the end card).
- Free play: Brum at Mill Lane's handle after his lesson (council.js, cn_brum); Kell by the cart up on the terrace
  (zeelift.js); Mother Snuff's bakehouse is an interior (zhomes.js zh_bakery), hot once the Second Bake is done (zl_crate).
- Esmers do not sit (walkers.js canSit: one robe from shoulders to ground, no hips to bend). Kell is an Esmer.
- Lhar evacuates to the monastery in ch 6; in ch 7 the village is empty (hamlife.js 'camp'). The goats went up to the
  monks' meadow (hl_pen). Pim said in ch 6 "Can I come? I know the ridge!".
- Line of sight, measured with physics.lineOfSight from the peak's south lip: the 26 m rock shelf between the peak and
  Lhar hides Lhar's ground and the goat pen; only roof ridges 6–7 m tall on the village's south rim clear it. The lift's
  top landing on the monastery terrace is in plain sight. (probe in the scratchpad; the test I0 repeats it.)
- Ch 13's end: after the families' decision the wake chain ran straight into Tessa's lines (wk_done → the freighter).
  A save made between the two (the game saves there) came back with "Talk to Tessa" and a Tessa who only said "Thank me
  when it repeats": **the chapter could not end** (latent soft-lock, fixed here).
- The epilogue's Cradle Hall opened back-row lids 1, 4, 5 plus J-17 (four, while its line says three); lid 1 is the
  cradle right behind Nan Odra's spot, her mother's, whose answer is "Not yet".

## What is now in the game
### 1. Free play — Kell's bread (commit 69e24f99, then the spot by the oven)
After the ending, with Brum's lesson made (cn_brum) and Snuff's oven hot (zl_crate): Kell is in Mother Snuff's
bakehouse by the oven's warm front with his loaf in hand (zhomes.js npcSpots.kell; zeelift.js breadTime, kellBread). Brum
is at the handle, as part 1 made him; the deck stands (the user's part-1 pick). No banner, no objective, no journal.
Asked, Kell says one line: "Still warm. Go and get your own." Without the lesson (or a base-campaign game) Kell is at
his lever as before; with the oven cold he stays by the cart (part 1). The epilogue's Kell and Brel lines in zeelift.js
(zt_kell_home, zt_brel_idle) were never reached — a later chapter's talk does not pass through chapter 3's — and they
said generic idle lines; zeelife.js now routes those two to them in the epilogue.
### 2. Chapter 7 — "The wrong roof" (commit d67e5d2a, observatory.js RoofThread)
Setup: on the peak's south lip, by the dome's door, the observatory's old signalling shutter (a heliograph: round mirror,
four slats, sighting tube on a stone post; hamalayi.js R.shutter). Sefa is out at it, Pim beside him (he followed up
the ridge); Tashi minds the lift's upper brake on the top landing all chapter (the line still kicks until the vent).
Twinsen passes Tashi on the way to the ridge (his word: "Somebody has to mind the brake while the line still kicks.
Today that's me. All day.").
Scene (on coming within 10 m of the shutter; or on talking to Sefa there): Sefa's existing greeting; "Three long, one
short. Watch that roof." — through the sight (a camera beat) the ridge of an old two-storey house on Lhar's south rim,
the light on it, the slats clacking; nothing answers. "Nothing. She always answered before I'd let go of the handle."
Pim: "That's Grandma's old house. That's where we keep the goats now." Sefa: "Goats." Pim: "Grandma lives with us.
You'd know if you ever came down." Sefa: "I'd know if anyone ever came up." Twinsen: "Tashi's minding the lift brake on
the top landing. Let me try him."
Play: "Signal" at the shutter (from behind it). In his hands Left/Right swing it, Up/Down send the light farther or
nearer (it stays on the ground), E lets go (nothing lost; take it again). The view is the sight's: a narrow lens
following the light over the snow. When the beam passes the landing (within 3 m of Tashi: the flash is seen off the
beam's edge), Tashi answers at once from his belt buckle, two quick and one long (a visible flash, three blips, the
caption "(A flash answers from the lift's top landing: two quick, one long.)"). Pim: "That's Tashi! He's doing it with
his belt buckle." Sefa: "Somebody answered." / "Come inside, then. You didn't climb all this way for my shutter." He
walks in; inside, his old talk follows without the greeting said twice; the mirrors, Sendell, the telescope, the vent and
Arthur's call are untouched. Measured: the first answer came after 142 frames of keys (≈5 s) in the test.
Return: Pim stays by the shutter until the vent breathes ("Tashi says the brake's fine. Tashi says he's bored. Tashi
says hello."); the shutter stays aimed at the landing in every later chapter; the goats' house in Lhar has a look line
(changes after the scene: "Sefa flashed at that roof for years. The goats never answered."). Journal: rf_j_roof.
### 3. Chapter 13 — "A chair by the cradle" (commit 00beba65)
After the families' decision Tessa waits at the door ("Talk to Tessa", as her objective already said; her lines now play
when he talks to her — the soft-lock above is gone). Two seconds later Wenna crosses the hall with a bowl of the row's
soup to Nan Odra at her mother's cradle: "Mags sent soup up. You've been on your feet since the bell, Nan." / "If I sit
at that table, she's down here on her own." / "Then I'll sit with her. If there were anything to sit on." A real chair
stands against the left wall ("Move"): Twinsen lifts it, carries it in front of him and sets it down beside the cradle.
Wenna sits in it: "Go on, Nan. I've got her." Nan Odra: "Don't let anyone lift her lid. Not yet." Wenna: "Not yet." Nan
Odra takes the bowl to the keepers' desk and eats there on their stool. The lid stays shut. Oren says nothing; no
reward; nothing is needed for progress. Out of the hall and back, Save & quit, a later chapter: Wenna is still in the
chair by the cradle, Nan Odra at the desk ("Still asleep. Still not yet. It's a good chair for it." / "Good soup. Don't
tell Mags, she'll be unbearable."). The epilogue's hall opens J-17 and back-row lids 4 and 5 (three, as its line says),
never Nan Odra's mother's.

## Story map and who knows what when (part 2)
| When | Twinsen | Sefa | Pim | Tashi | Wenna / Nan Odra | Kell |
|---|---|---|---|---|---|---|
| ch6 end | Lhar up at the monastery | (in his dome) | asks to come, told no | up with the first trip | — | — |
| ch7 start | passes Tashi at the brake | out at his shutter, unaware Lhar moved | followed up the ridge | minds the upper brake | — | — |
| ch7 shutter | learns the roof is the goats' | learns Grandma lives with Pim's family; someone answered | knows it all | answers, surprised | — | — |
| ch7 dome | (as before) | talks mirrors without a second greeting | stays by the shutter till the vent | at the landing | — | — |
| ch13 decision | — | — | — | — | Nan Odra: not yet, her choice | — |
| ch13 after | moves the chair | — | — | — | Wenna sits her turn; Nan Odra eats; lid shut | — |
| ch14+ / epilogue | — | at home / dome | Lhar (epilogue) | — | Wenna still in the chair, Nan Odra at the desk | — |
| free play | — | — | — | — | — | eats warm bread in the bakehouse; Brum at the handle |
Nothing here is needed for progress except the shutter in ch 7 (one prompt, a star and an objective; the direction is
said by Sefa if asked: "The landing is off to the left of my old roof", and the landing is in view through the sight).

## Flags and saves (format 6; the save format did not change)
New: rf_v, rf_shut, rf_roof (ch 7); wk_food, wk_chair (ch 13, expanded campaign only). Older saves: a ch-7 save with
Sefa not met (c7_keeper unset) gets rf_v on load and plays the scene; one with Sefa met plays as before (no Pim on the
peak, Tashi in the yard). Ch-13 saves before the decision play the soup scene after it; a save made after the decision
and before Tessa now ends normally on talking to her. Base-campaign saves never reach ch 13 and never get wk_ flags.
Free play needs no flag of its own.

## Visible changes (each for the user's pick; pictures in lba3/captures/second-shift/part2/)
1. **Kell in Snuff's bakehouse in free play** (pair-1a lane: no Kell; pair-1b bakehouse: Kell by the oven, his loaf).
2. **The signalling shutter on the peak's south lip**, Sefa and Pim at it in ch 7 (pair-2a; 2d through the sight, 2e
   sweeping, 2f Tashi's answer, 2g the shutter in his hands, 2h after). A mossy rock that stood on that spot is gone.
3. **The goats' house in Lhar**: a two-storey old stone house with a slate roof and a hay rack on the village's south
   rim (pair-2b), from ch 6 on, both campaigns. A rock that stood there is gone.
4. **Tashi at the lift's top landing in ch 7** (pair-2c; before: in the yard).
5. **The Cradle Hall's chair (by the left wall, then by the cradle), the keepers' stool at their desk, a bowl** (pair-3,
   3b, 3c).
6. **The epilogue's Cradle Hall: three lids open, not four** (Nan Odra's mother's stays shut). No picture.

## Decisions for the user
1. **Kell sits?** The brief says "sitting in the bakery". Esmers cannot sit in this game (their robe is one piece to
   the ground; walkers.js canSit; decision-kell-sit-pose-evidence.png shows the sit pose on Kell: he sinks into the
   floor). (A) he stands by the oven with his loaf — built, recommended; (B) a proper seated pose for robed Esmers,
   game-wide (a rig job for every Esmer, a separate task); (C) sitting with the robe through the seat.
2. **The lift outside**: your part-1 pick was "still on later visits", so it stands. (A) still — built, recommended;
   (B) slow ambient trips while Twinsen is away from the bay (needs the part-1 physics care).
3. **Kell only when the oven is hot** (the Second Bake done). (A) as built (cold oven: no warm bread, he stays by the
   cart; doing the side story in free play brings him in next visit) — recommended; (B) always in the bakehouse.
4. **Where the old roof is.** Lhar's ground is hidden from the peak by the rock shelf; only a tall ridge on its south
   rim shows. (A) a new two-storey goats' house there (built; a new building in Lhar from ch 6, both campaigns) —
   recommended; (B) a smaller byre on the monastery terrace instead (always visible, but Lhar's evacuation no longer
   explains the silence); (C) use an existing house (all five are lived in: their owners' lines would need changing).
5. **The shutter is outdoors, and "the telescope" is its sighting tube** (the dome's own telescope is in an interior
   that cannot show the outside). (A) as built — recommended; (B) a ladder to the dome's balcony with the shutter up
   there (37 m: some of Lhar's roofs show, more building work).
6. **The shutter is required before the mirrors** for games that have not met Sefa (≈1–2 min). (A) required —
   built (the brief's "before the mirror encounter"); (B) optional: Sefa goes in after "Nothing answers" and the shutter
   stays for later.
7. **Tashi at the landing and Pim on the peak for all of ch 7** (Pim until the vent). (A) as built; (B) only while the
   scene is ahead.
8. **Ch 13 now ends when he talks to Tessa** (needed for any moment after the decision, and it fixes the soft-lock).
   (A) as built — recommended; (B) automatic again after the soup scene (the chair then could not follow).
9. **Wenna stays in the chair on every later visit and in the epilogue's hall**, not at her rafts with Jory. (A) as
   built (the brief: "still sitting there"); (B) only for the rest of ch 13.
10. **The base campaign's save names Ballastra in its chapter table** (s.order lists every chapter of the build, as it
    did before this work); no flag, line or place of Ballastra is in it. (A) leave it; (B) write BASE_ORDER for
    exp_base games (a save-format detail: needs save-migration's tests).

## Tests (Automated runtime only)
tests/second-shift.mjs, extended with H (free play), I (ch 7), J (ch 13); fixtures rewritten to the run's port, a fresh
profile each. One run of the whole suite: A–D and V passed (19/19), then the local server's two-hour limit cut the run
(connection refused at E, the harness's own failure); E–J were run once more on a fresh server: **36/36 PASS, no
errors** (E, F×3, G unchanged from part 1 and still passing). Played by input (keys held and tapped, time stepped; nothing
teleported, no flag set) unless STAGED:
- H STAGED free play (new-15-last + the epilogue's flags; Zeelich entered by enterRoom): Brum at the handle, the deck
  standing, Kell not on the lane; into the bakehouse by its door (E): Kell at his spot with his loaf, "Still warm. Go and
  get your own.", no toast, objective or journal change; Save & quit → Continue in the bakehouse: the same; STAGED a free
  play without Brum's lesson: Kell at his lever, not in the bakehouse — PASS.
- I base-10 by input: rf_v on load; Tashi at the landing, Pim and Sefa at the shutter; line of sight (physics) from the
  shutter to the goats' house ridge and to Tashi, none to Lhar's square; up the ridge: the 8 lines in order, the greeting
  once, the light on the goats' house (0.5 m from it), 8 clacks, no answer; Save & quit → Continue: Sefa aside, Pim by
  it, the shutter's prompt, the objective; taken, swung, let go (E), taken again; left until level with the landing then
  nearer: answered after 142 frames, the flash seen (25 frames), the blips, the caption, Pim, "Somebody answered.", Sefa
  walks in; in the dome his talk starts at Twinsen's question (no second greeting), c7_keeper, the journal line; Save &
  quit → Continue after: the shutter aimed at the landing, Pim by it; new-10-lit (Sefa met before): no scene — PASS.
- J STAGED ch 13 after the decision (new-12-stop + the chapters' flags, as exp-balances stages them; the hall entered by
  enterRoom), then by input: the soup scene, no Oren line; Save & quit → Continue: Wenna with the bowl, the chair's
  prompt; the chair carried to the cradle: both seated (pose checked on the seat), lines, coins unchanged; out to the
  Arches and back in: still seated, her line; Save & quit → Continue: still so; Tessa talked to: chapter 14; the hall's
  placement afterwards: Wenna seated; base-13 (exp_base): ch 13 not in its campaign, no wk_/bl_ flag, nothing of
  Ballastra or the chair in the save outside its chapter table — PASS.
- tests/world-consistency.mjs once: 36 passed, 1 FAIL, no errors. The FAIL is this work's expected change: chapter 7's
  yard had 4 people with a round, not 5 (Pim is up on the peak); the 3 that walk moved, Tashi stands at the brake. The
  test's count is recalibrated to 4 (commented); **not rerun** (the few-tests rule). The dome (Sefa inside after the
  scene, rf_roof) passed.
- node tools/he-bundle.mjs, node tests/dialogue-check.mjs — PASS (5680/5680 Hebrew keys).
Developing the new sections took a few single-section runs (H twice, I four times, J once) before the suite run.

## Pictures
lba3/captures/second-shift/part2/: pair-1a-free-play-mill-lane, pair-1b-free-play-bakehouse, pair-2a-ch7-peak-shutter,
pair-2b-ch7-lhar-goats-house, pair-2c-ch7-lift-top-tashi, pair-3-ch13-cradle-hall-chair (before | after: before from
the base revision 157d9e12 served from a copy, after from this branch; play camera Follow/Far 1280×720, rooms their fixed
camera); after only: 2d–2h (2d, 2e, 2f through the sight: the reveal camera), 3b, 3c (a crop), and the decision picture.
Ch 13 and free play pictures are STAGED saves (flags on a fixture, the area entered by enterRoom); ch 7 from base-10 by
input (the camera beats forced on for pictures: game.revealForce).

## Time (estimates from the tests' game time, not a person's play)
Ch 7 shutter ≈ 1–1.5 min (13 short lines, a 4.6 s signal, ≈5 s of sweeping); ch 13 chair ≈ 1 min (6 lines, two walks,
a 3 s carry); free play: none added (an idle line).

## Not verified
A person's hands, eyes, ears; real GPUs; the gamepad and touch on the shutter (it reads the same move axis); Hebrew in
the game (checked by the tools and by reading); the epilogue's Cradle Hall with the chair (placement code read, not
played); the Lhar house from every camera distance; the 'blip' and 'gearClack' by ear. Updated but not run (the
user's few-tests rule): tests/playthrough/10-observatory.mjs (a shutter step), tests/chapter7.mjs (rf_roof set),
tests/exp-balances.mjs (talks to Tessa), tests/cast-rounds.mjs (ch 7's yard cast).

## The sweep (every case of the same fault)
- Hold hooks: game.heroHold is now used by Mill Lane's handle and the shutter; both clear it on every load
  (applyFlags) and when he leaves the area; both ignore the key that took them. Story steps that walk the hero in an
  area (walkTo) must be marked indoor or life.js cancels them: every walkTo in story/ was checked (reach.js, zeelift,
  netline, ferry, yearslate mark it; the chair carry and the shutter now do).
- Seating: walkers.js sitShape's "back" window reached the big low heads of Ballastra's canal bodies; they are the only
  ones this window misreads, and no resident of theirs sits anywhere else (searched ballastra/ and story/ for seats);
  the fix is in the one place they sit (balances.js seatOn).
- Unreachable later-chapter lines of chapter 3's Mill Lane thread (zt_kell_later, zt_irsa_later): reported, not
  changed outside the epilogue (they would change Kell's words in chapters 4–8 and 10–16).
- Dressing: the Hamalayi's random rocks and pines are filtered off both new pieces after the draws (nothing else moves).
