# WAVE1 · Expansion wave 1: H-1 and H-2 on the main path (24.11.2026)

Approved by the user on 24.11 (CONTENT-15H.md §3, wave 1; the cards C11-1 and C12-1 in DEPTH-PLAN.md). The cards say
chapters 11/12; in the current numbering they are **chapter 15, The Shell** and **chapter 16, The Core** (11 and 12 on
the base campaign). Both live in `src/game/story/chapter3.js` (one class, two parts) and its rooms in
`src/game/underground.js`. Branch `wave1-relays-feeds` (from `ccr-c1c2c4b9-dep6ed` at 745b7ba5). Not pushed, not
published.

Labels: **Automated runtime only (SwiftShader)** for every test result below; **estimate** for every minute figure. No
person has played these steps.

## H-1 · Baldino's relays down the shaft (chapter 15)

- **Hook.** At the shaft's foot Baldino's radio: below the shaft his radio goes blind; relays talk by sight; one in each
  hall, on a bracket that sees both doors; a green lamp means it sees that door. Twinsen: two relays, one for each hall.
  (He has them from the collar, where Baldino waits since chapter 14: no pick-up step.)
- **Five survey brackets** (small props: a weighted post with a hazard plate and a brass clamp; one arm off the
  catwalk's east post):
  - the deep installation: **D1** on the floor by the way in from the shaft; **D2** on the catwalk's east post;
  - the crystal galleries: **G1** on the start shelf by the crew's crates; **G2** on the far shelf north of the stones'
    landing; **G3** on the far shelf beside the old arch.
- **The rule, shown.** A relay set on a bracket shows two lamps, each on the side of the door it is for; green when the
  relay's head has a line of sight to that doorway (the physics' own `lineOfSight`, the guards' rule), red when not.
  Measured from the rooms as built (a sight-map probe, then the suite): only **D2** and **G3** see both doors. D1 sees the
  tunnel but not the shutter (from the floor it lies flat along its wall); G1 sees the tunnel but not the arch (a pillar);
  G2 sees the arch but not the tunnel (the pillars).
- **Clue lines.** A red lamp: Twinsen says which door is out of sight and where to look ("The catwalk runs right beside
  it"; "It wants the far side"; "Nearer the arch, maybe"); a second time, a toast. Both green: Baldino answers once per
  hall. After 45 s with a red relay in an open hall: one nudge toast.
- **The obstacle.** Each hall's far door (the held shutter; the old arch) refuses him until a relay in that hall has both
  lamps green (a line once, then a toast); the objective carries "Set a relay where it sees both doors" in both halls.
  Going through fixes the hall's relay (its brackets go quiet) and unclips any spare left on another bracket of that
  hall (a toast), so the second relay is always in hand for the galleries. A relay is never lost: two minus the placed
  ones are in his hands. The deep's right bracket is on the catwalk the ladder puzzle already opens; the galleries' is on
  the way to the arch.
- **Payoff.** In Sendell's chamber Baldino: her light carries his signal better than any relay; the chamber is hers. In
  the core the relays carry the allies (H-2).
- **Flags (saved):** `dx_relay_v`, `dx_relay_told`, `dx_relay_at` (the brackets holding a relay, e.g. `D2,G3`),
  `dx_relay_deep` / `dx_relay_gal` (`true` by play, `'past'` from an old save).

## H-2 · The allies' feeds at the deck ring (chapter 16)

- **Between the bank shots, not inside them.** A plate's bank shot now *opens* its pylon (amber). The open pylon draws on
  the guardian: it sags and **stays down while the pylon is open** (its bolts in flight cleared, no fan, no dive). The fight
  segments themselves (stun, plate, bank shot) are unchanged in length; the new step sits between them with no enemy
  pressure. When the box is done the pylon holds (cyan, as before), its station's ally speaks the old line, the
  guardian a level up rises 1.6 s later and the fight goes on. One pylon open at a time.
- **Three junction boxes** (small props on the deck ring, one per pylon, each labelled with its station and with a
  station lamp: dark, amber while waiting, green once fed). Their ally speaks through the relays:
  - **LIGHTHOUSE (Zoé)**: three dials (sun, wave, star faces, as the lamp room's). Star, sun, wave, "the same as always".
    All three different but in another order: the box buzzes and Zoé says it once (then a toast).
  - **MAINS (Mira)**: the wheel raises the needle a notch a turn; between the gauge's two brass marks, let it settle
    (1.2 s): fed. A turn past the second mark trips it back to nothing (Mira says it once, then a toast).
  - **MILLS (Oku)**: the coupling's flywheel spins with a white mark; a ball hit brakes it within 0.3 s. Stopped with the
    mark within 43° of the top (a yellow mark on the housing): it holds. Otherwise it slips loose after 1.4 s and spins
    on (Oku says it once). No penalty, no clock.
  - Stuck 45 s at a box: one nudge toast with the rule.
- **Flags (saved):** `c3_prime` (the pylon open, its box waiting), `dx_feed_light` / `dx_feed_mains` / `dx_feed_mills`
  (`true`, or `'past'` for a pylon turned without its box: an old save, or the story's own call).
- **Mapping change:** each pylon's ally line now follows the pylon (pylon 1 Zoé, 2 Mira, 3 Oku) rather than the order of
  conversion; in the usual order nothing changes.

## Saves

- Format 6 unchanged; old saves load (the suite loads three fixtures written before the wave).
- An old save **in the shell**: the relays turn on; a hall it is already past counts as set (its relay shown on the
  bracket that sees both); Baldino's hook is said once play is under way if a hall is still to do.
- An old save **in the core or later**: both halls past; every pylon already turned counts its feed done (box lit
  green); a pylon not yet turned needs its box.
- **Mid-core**: a reload with a box waiting comes back to that box: the pylon open, the guardian down, the box's
  objective (the box itself starts over). A Retry after a death keeps every pylon held and every feed done.

## Files

- `src/game/story/relays.js` (new): both threads, their props, flags and rules.
- `src/game/story/chapter3.js`: the hooks (begin, exits, interaction, ball hits, update, flags, rooms, objective,
  Sendell's line); the bank shot primes instead of converting; the ally line per pylon.
- `src/game/text/relays.js`, `src/game/text/he/relays.js` (new): 35 English lines and their Hebrew;
  `src/game/he-text.js` rebuilt (`node tools/he-bundle.mjs`).
- Tests: `tests/wave1.mjs` (new, the covering suite); `tests/chapter3.mjs`, `tests/playthrough/14-shell.mjs`,
  `tests/campaign-thread.mjs` (O5, O7) updated for the new steps; `tests/lib/player.js` (`P.coreFeed`, `coreFight`
  plays the boxes); `tests/lib/boot.mjs` (`SERVE=1` in `launch`).
- `tools/wave1-shots.mjs` (new): the before/after pictures.
- Not touched: `story/depth.js`, `characters.js`, `sculpt.js`, the opening and tutorial files.

## Tests (Automated runtime only, SwiftShader, headless Chromium; `SERVE=1`; each run once unless a test was fixed)

| Suite | Result | Notes |
|---|---|---|
| `tests/wave1.mjs` (new, covering) | **PASS 24/24** | A: hook, D1 red, the shutter refusing (line, then toast), D2 green-green, spare taken along, quiet brackets after, G2 red/green, the arch refusing, G3, death in the galleries → Retry (relays as saved), Sendell's line. B: bank shot opens a pylon, guardian down 8 s with no bolts and no harm, wrong dial order buzzes, star-sun-wave holds, Save → Continue with the MAINS box waiting, the needle trips then holds, death in the fight → Retry (pylons and feeds kept), the flywheel slips then holds, the overload follows. C: three saves from before (galleries; core fight; after the coil). The first run had 2 test-side FAILs (a hit taken after Retry before the life check; Baldino's hook said before the line recorder was on) and showed that an old save after the coil drew its boxes unlit: fixed (feeds counted before the rooms are dressed); the second run PASS |
| `tests/chapter3.mjs` (chapters 15–16, updated) | **PASS 55/55** | the relays by input in both halls (D1 red, refused, D2, spare; G1 red and taken back; G3), Save → Continue in the galleries, each pylon's box by input (`P.coreFeed`), the rest of the chapter to the end screen |
| `tests/playthrough/14-shell.mjs` from `base-14` (`ASSIST=1 STATS=`) | **PASS**, 0 ISO assists | the bot places D1, moves to D2, G3 and plays the three boxes inside its fight. The first run stopped at "her answer, the knocker": the bot skipped waiting when her answer was already being said and walked under the catwalk; the step now waits it out (a test fix; the relay step also climbs the stair before its bracket) |
| `tests/campaign-thread.mjs` ONLY=O | **PASS 8/8** | O5/O7 now set the relays (an old save mid-machinery); the first run's O5 walked under the catwalk to the bracket (test fix: up the stair first) |
| `node tests/dialogue-check.mjs` | **PASS** | Hebrew 100 % |

Not run: the full campaign chain; `resume.mjs` (D16 calls `convertPylon` directly, which still works: the feed counts
as `'past'`); `save-migration.mjs`; the other suites that stage the core with all pylons set (their flags give `'past'`
feeds). After the last fixes to `14-shell.mjs` (the climb before the catwalk relay) it was not run again.

## Minutes (estimate: the chapter-balance formula, not measured on a person)

Formula: 1.8 × the bot's free play + 60 s per deduction puzzle + reading (words ÷ 3.3 + 0.6 s a line).

- **H-1 ≈ 4–5 min.** Bot free play in its relay steps 38 s (D1 1 s, D1 → D2 31 s, G3 6 s) → 69 s; two deductions (which
  bracket sees both, per hall) 120 s; ~150 words, 9 lines → 51 s. ≈ 4.0 min with no wrong bracket in the galleries; a
  first player who tries G1 or G2 adds ~0.5–1 min. Target +5.
- **H-2 ≈ 3.5–5 min.** The bot's pylon step took 73 s of play with ~10 s of fighting → ~50 s at the boxes → 90 s; three
  boxes at 30–60 s each (the ally says the rule) 90–180 s; ~85 new words, 5 lines → 28 s. ≈ 3.5–5 min. Target +4. The
  fight's own length is unchanged (the steps sit between bank shots, with the guardian down).
- Chapter 15 (17.7 in the ledger) to ≈ 22; chapter 16 (11.3) to ≈ 15–16 (both estimates).

## Visible changes (P107, for the user's pick): pictures from the play camera, 1280×720

`captures/wave1/before-*.png` and `after-*.png`, the same spots: `deep-entrance` (D1, a relay shown red/green),
`deep-catwalk` (D2, green/green), `gallery-start` (G1), `gallery-far` (G2 empty, G3 by the arch), `gallery-arch` (G3),
`core-light`, `core-mains`, `core-mills` (the core camera is wide: the boxes are small at the deck ring's inner edge).
Inspected by the agent only (SwiftShader), not judged by a person. Nothing existing moved; the props are new (5
brackets, the relays drawn on them, 3 junction boxes).

## Decisions for the user

1. **Keep the props as drawn?** (pictures above). The relays are small (about 30 cm) with glowing lamps; the boxes are
   1 m teal cabinets labelled LIGHTHOUSE, MAINS, MILLS.
2. **The MILLS flywheel asks for some timing** (a ball as the mark comes up; a window of about 0.9 s in its 3.9 s turn; a
   miss only spins it again, no harm, no clock). The card asked for "no tight timing". Wider (a slower wheel) or as is?
3. **Card differences:** Baldino gives the relays in his first radio line (he waits at the collar; the chapter starts at
   the shaft's foot) rather than in person; the brackets are placed by measured sight lines (the card's catwalk post holds
   in the machinery; in the galleries the bracket beside the old arch is the one).

## Remaining gaps

- No person has played either step; the minutes are estimates; the lamps' readability on a real GPU and screen is
  unverified.
- OPEN-TASKS item 12 (the third pylon too long) is not addressed here; this wave adds no fight time.
- `resume.mjs`, `save-migration.mjs` and the full chain were not run on this branch.

## סיכום בעברית

גל הרחבה 1 נבנה בפרקים 15–16 (הירידה והליבה). בכל אחד מהם נוסף שלב קצר בדרך הראשית, שמשתמש בדברים שהשחקן כבר מכיר
מהפרקים הקודמים. נוספו רק אביזרים קטנים, ושום דבר קיים לא זז. יש תמונות לפני ואחרי בתיקייה captures/wave1, לבחירתך.
שמירות ישנות נטענות, ומה שכבר עבר בהן נחשב כאילו נעשה. אין טיימר ואין עונש על טעות. ההערכה היא כ־4–5 דקות לכל שלב
במשחק ראשון, וזו הערכה בלבד. הבדיקות האוטומטיות עברו (SwiftShader). אדם עוד לא שיחק בזה.
