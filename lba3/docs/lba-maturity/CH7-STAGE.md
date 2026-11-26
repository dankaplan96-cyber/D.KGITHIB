# CH7-STAGE — chapter 7's vent seal: a new stage in place of chapter 4's discs (tasks #18 + #28)

The user's choice (26.11): replace the repeat of chapter 4's disc puzzle in chapter 7 with a new stage on the main
path, which also makes the chapter a little longer. Built behind the URL switch **`?ch7stage=new`**; without it the
game is exactly as before (the discs), so the two can be compared. Base: branch `ccr-c1c2c4b9-dep6ed` at `ce018853`.
All results here are **automated runtime only (SwiftShader, headless Chromium)**. Nobody has played it; the minutes
below are estimates, not measurements.

## 1. What was repeated, and what the story needs there

- **Chapter 4 (the dig):** five stone discs round the temple door, three warm. Wake the three warm ones with the ball;
  a cold one thuds and shuts the others again (`story/dig.js`).
- **Chapter 7 (the observatory), the vent's seal today:** after the telescope melts the cap and the heavy drone falls, the
  seal is "carved like the ones at the dig". It has five discs round its rim: three steam, two are iced over. Break the
  two ice caps with the ball or a blow, and the seal turns (CHAPTER-BALANCE 7.11, reworked by PUZZLES P-B 20.11). It
  uses the same prop, the same "which discs" question and the same ball throws as chapter 4 (MIDDLE-VARIETY §1.3,
  world.md #44, maturity.md).
- **The story at that point:** the vent must be opened ("open the vent below this mountain, and she will breathe easier").
  When it opens, "the ground stops trembling", and Arthur calls. The chapter's own motif since chapter 6 is the
  mountain's **kick**: the rope lift's line kicks in threes and a rest (`winchline.js` PULSE: 11 s round). On the ridge
  in chapter 7 the snow jumps beside Twinsen with each kick and he says so (`passline.js`, `ob_snow`), and the telescope's
  fourth setting follows that shaking. MIDDLE-VARIETY had suggested a decision built on chapter 7's own rules.
- **Length:** the ledger puts chapter 7 at about 15.0 min, under the 16.7–27.9 band (CONTENT-15H.md; an estimate).

## 2. Three ideas

1. **The mountain's pulse** (observation; the chapter's own motif). Under the melted cap the seal sits in a stone ring
   with an arrow cut in it. Five old grooves (the monks' steam channels) run out from it across the ice. With each kick
   of the mountain, one groove's stones jump and snow flies along it, farther out kick by kick. The player watches,
   turns the ring until the arrow points down that groove, and leaves it there. The next kick lifts the seal. It fits
   because the trembling that has followed him since chapter 6 becomes the clue, and the vent opening is what stills it.
   *About 2–4 min* (versus about 1–2 min for the discs).
2. **The meltwater leat** (spatial reasoning; a consequence of the telescope's melt). Sefa already warns that the
   meltwater will fill the basin. A stone leat runs from the melt pool down to a paddle wheel under the seal, and it forks:
   one branch leads to the wheel, the other over the basin's lip. The player follows the channels by eye and lifts the
   right sluice board. Water runs down, the wheel turns the seal, and a wrong board spills harmlessly over the lip.
   *About 3–5 min.* It needs a pool, a leat, flowing water and a wheel: the largest build of the three.
3. **Over the floes** (traversal, Athletic). The meltwater floods the hollow round the seal, so Twinsen reaches it by
   jumping across ice floes and serac tops. A fall means wading out cold, with no life lost. *About 3–4 min.* It adds a
   jump course but no new decision, and its feel depends on jump precision that this environment cannot judge (no
   person, no real GPU).

**Built: idea 1.** It is the only one that pays off something the chapter has already taught (the kicks, the snow
jumping in threes). It asks for observation instead of another ice break; chapter 7 already has the frozen slit and
chapter 6 the frozen rope. Its answer is visible (stones and snow jumping on one groove), it cannot fail, and it reuses
the line's existing clock. Idea 2 is a good second choice if the user prefers a physical machine.

## 3. What was built (only with `?ch7stage=new`)

- **Look** (`src/game/ventseal.js`, called from `hamalayi.js` instead of the discs): a thick stone hoop round the
  seal, with an ochre arrow lying on it; five stone-lined grooves (strip and kerb stones) from 3.9 m to 11.4 m, each
  ending in a small cairn. The live groove's ice is a little darker and glossier (wet), as a second, quieter clue. Once
  the vent opens, a dark throat shows inside the hoop. Nothing new is solid except the cairns (low, see-through for the
  camera). The ring sits inside the vent's existing collider. No light, render pass or texture was added. Materials are
  shared, and the stones are three merged meshes per groove set.
- **Play** (`src/game/story/ventring.js`, asked first by `story/observatory.js`):
  - Kicks: every kick of the line while the cap is melted and the vent is shut makes one third of the live groove's
    stones hop. Snow powder and blue-grey ice chips fly along it, with a knock, moving outward through the three kicks.
    Nothing happens on the other four grooves. This already shows during the drone fight.
  - First E at the seal (label "Open"): *"The seal won't lift. It sits in a stone ring with an arrow cut in it, and five
    grooves run out from it across the ice."* The objective becomes *"Turn the seal's arrow to where the steam pushes"*.
  - Then E ("Turn") turns the ring one notch sunwise (0.7 s, a gear clack and a clunk).
  - At the first kick of each pulse the ring is read. On the live groove, and still for at least 1.2 s, the kick runs up
    the groove into the seal: *"There. That's the way it wants out."*, then the existing vent-opening narration, Arthur's
    call and Hesk. On a dead groove it jolts in place, with a clang. The first time he says *"(The seal jolts in its ring.
    Out on the ice, the snow jumps along one of the grooves.)"*; later, a toast if he turned it since: *"The ring jolts:
    not that groove"*.
  - Nothing resets and nothing fails. A wrong try costs at most the wait for the next kick (11 s). The arrow starts on
    the groove toward the descent (dead); the live one is two notches round.
  - **Spam:** a ring that is moving, or stopped for less than 1.2 s, is not read. Mashing E keeps it moving, so random
    pressing does not open it (test A7: 28 turns in three pulses, still shut).
  - Nudges (the existing HINTS-LESS pattern, toasts): 45 s with nothing turned, *"Wait for the next kick, and watch the
    grooves."*; 90 s, *"Turn the arrow to the groove where the snow jumps, then leave it be."*
- **The discs' game is unchanged.** `observatory.js` only gained `openVent(pre)` (the old seal's opening, moved into a
  method so both paths share it), plus the switch branches.

### Saves (format 6, nothing renamed)
- New flags: `c7r_jolt` (his line said once). The stage also uses the existing `c7_sealSeen`. The ring's notch is not
  saved: a load puts the arrow back on its rest, or on the live groove once the vent is open.
- A save from the discs' game (with `c7_free1` etc.) loads with the switch, with the new stage ahead (test A8). A save
  taken mid-stage loads without the switch into the discs and finishes there (test B). An old chapter-7 save from before
  CAMPAIGN-5 (no `ob_v`/`ps_v`, so the line does not run) still gets kicks: the stage keeps the line's rhythm on its own
  clock (test C).

### Text
EN `src/game/text/ch7.js`, HE `src/game/text/he/ch7.js` (8 keys: `p_ring`, `c7r_seal`, `c7r_jolt`, `c7r_toast_jolt`,
`c7r_there`, `c7r_nudge_watch`, `c7r_nudge_arrow`, `c7r_obj`). Delivery notes are in `text/voicemeta.js`.
`node tools/he-bundle.mjs` was rerun, and `node tests/dialogue-check.mjs` passes (Hebrew 6619/6619).

## 4. Tests (automated runtime only, SwiftShader; `SERVE=1`, one browser at a time)

| Run | Result |
|---|---|
| `SERVE=1 node tests/chapter7.mjs` (switch off: the game as it is) | **PASS** 20/20, no errors |
| `SERVE=1 node tests/ch7-stage.mjs` (A + B: switch on, then off) | **PASS** 12/12, no errors |
| `ONLY=C SERVE=1 node tests/ch7-stage.mjs` (part C, added after the A+B run) | **PASS** 2/2, no errors |
| `node tests/dialogue-check.mjs` | **PASS** |

How it was reached: chapter 7 was entered through the story's flags and staged to the telescope's turn. The mirrors,
Sendell and the fourth setting are chapter7.mjs's job. From there the drone, the seal, the turns and the waiting are
all done through game input (E, the ball's key) and steps of game time, with the hero placed by teleport. In A, the
kicks were counted on the live groove only (24 bursts in one pulse, 0 on the other four). A save/reload in the middle
and the end of the chapter (to evacuation) are included. Not run: `tests/puzzles.mjs` and `playthrough/10-observatory.mjs`
(both use the default game, which is unchanged); a full campaign chain.

Pictures: `lba3/captures/ch7-stage/sheet.png` (play camera, 960×540 scaled): the discs today; the new stage from the
same spot; a kick seen beside the live groove; the vent open. Made with `SERVE=1 node tools/ch7-stage-shots.mjs`, then
`python3 tools/ch7-stage-sheet.py`.

## 5. Visible world changes (only with `?ch7stage=new`; for the user's pick, P107)
- The glacier basin round the vent: five stone-lined grooves with cairns; a stone hoop and an ochre arrow round the seal
  (instead of the five discs); a dark throat once the vent is open.

## 6. Open questions for the user
1. Make the new stage the default (and retire the discs), keep the discs, or try idea 2 (the meltwater leat) instead?
2. The live groove's darker, wet ice is a second clue for anyone who misses the kicks (sound off, looking elsewhere). Keep
   it, or make the kick the only clue?
3. Is "the arrow must be left still for a kick" clear enough, or should the second nudge come sooner than 90 s?

## Resumable checkpoint
Done on the worktree branch: the switch, the stage, the text (EN+HE), the tests, the pictures, this doc. If the user
picks it as the default: set `CH7_NEW` true by default in `src/game/ch7stage.js` (keep `?ch7stage=old` for the discs).
Then update `tests/chapter7.mjs`'s seal steps (or point it at ch7-stage.mjs), `tests/puzzles.mjs`, playthrough 10, and
the chapter-balance ledger's chapter 7 row with a measured time.
