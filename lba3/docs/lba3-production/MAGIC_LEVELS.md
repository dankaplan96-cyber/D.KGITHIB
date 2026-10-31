# Magic levels (MAGIC-LEVELS)

**The request (31.10).** The player had the green ball within ten minutes. That came from buying levels at Pippa's
stall (15, 30 and 50 kashes). The user asked for three things. Magic should be earned the way LBA2 did it. The levels
should be spread across the game and not come easily. Magic levels should not be for sale.

**Spoiler note.** This file names the moments in every chapter. The player-facing summary for chapters 1–2 is
the first line of the schedule below.

## 1. How LBA2 did it (evidence)

### The engine: `2point21/lba2-classic` (GPL-2.0, local copy, read for behaviour only)

- `MagicLevel` is one byte. A new game sets it to **0** (PERSO.CPP:259).
- During play, only one thing sets it: the scene script command **`LM_SET_MAGIC_LEVEL`** (opcode 59, one byte;
  GERELIFE.CPP:867–873). The same command sets `MagicPoint = MagicLevel × 20`, so a level-up also fills the magic.
  A comment there says the command should add one level instead of setting it if a scenario ever allowed the
  magic objects in any order. The code still sets the value.
- The only other places that write the level are loading a save (SAVEGAME.CPP:630, 1118) and starting a new game.
  The cheat codes refill magic points only (CHEATCOD.CPP:143, 160). No shop code touches the level.
- Scripts can test the level with `LF_MAGIC_LEVEL` (23; GERELIFE.CPP:230), so characters and scenes can react to
  it.
- Magic *points* (not levels) come from several places:
  - `LM_SUB_MAGIC_POINT` (60) takes points away.
  - `LM_FULL_POINT` (79) fills life and magic (GERELIFE.CPP:1925).
  - Using a clover fills both (OBJECT.CPP:705).
  - Flasks from bonus givers and enemies give magic, but not when the magic is already full (EXTRA.CPP:2503).
  Our flasks, givers and Bersimon's top-up already follow this.
- What each level does:
  - Ball damage is 10, 10, 20, 30, 40 for levels 0–4 (COMMON.H:330–333; FICHE.CPP:24).
  - Hand damage is 5, 8, 18, 28, 38 (COMMON.H:325–329).
  - The ball sprite changes with the level (FICHE.CPP:31, 964), and level 4 has its own fire sound (FICHE.CPP:174).
  - The inventory's ball model also changes with the level (INVENT.CPP:462).
  - Maximum magic is 20 × level, and the bar's scale goes to 80 (COMPORTE.CPP:297).
  - The lightning spell needs full magic (PERSO.CPP:1332).
  - The number of bounces does not depend on the level: with any magic left, the ball bounces four times
    (docs/LBA2_SOURCE_NOTES.md).

### The scene scripts: the user's SCENE.HQR and TEXT.HQR (numbers only)

The files read are the user's GOG copies in the session's scratch space: SCENE.HQR SHA-256 d5ac2728…, TEXT.HQR
a66785c5…. These are byte-identical to the uploads (`*-SCENE.HQR`, `*-TEXT.HQR`) and were read, not modified.
Following SOURCE_INVENTORY.md's rule, no original text, model or script leaves them. The table comes from a byte search for opcode 59. Each hit was checked against the
commands next to it: `FOUND_OBJECT` (46), `SET_VAR_GAME` (36) and `MESSAGE` (25). This is **not a full
disassembly**. Many lone 59 bytes are arguments of other commands, so only hits that sit inside a clear block are
listed. The messages are paraphrased, with their TEXT bank and id.

| Level | Scene (island) | What the script does | What the game tells the player |
|---|---|---|---|
| 0 | 1 (Citadel, Twinsen's house) | Hero: `FOUND_OBJECT` ball, `SET_VAR_GAME` ball = 1. **No level is set.** | Bank 4 id 1: the ball is found, but it will only bounce once he wears his ancestral tunic. |
| 1 | 15 (Citadel; walkthroughs place it in Miss Bloop's museum) | Object 10: tunic = 1, the hero's body becomes the tunic body, `FOUND_OBJECT` tunic, `SET_MAGIC_LEVEL 1`. | Bank 4 id 4: the tunic and Sendell's medallion store magic, so the ball can bounce. Bank 6 id 29: a note says Twinsen once lent them to the museum. |
| 2 | 27 (Desert Island; the School of Magic's master, body 123) | Object 8: a line saying he is now a wizard, then `FOUND_OBJECT` diploma, diploma = 1, `SET_MAGIC_LEVEL 2`, then news that Twinsun's wizards have gone missing. Both branches of the script hold this block. | Bank 10 ids 19, 22, 23: he must enrol first; there are three tests, in any order; the diploma and the new level come only after all three. Ids 663, 666 and 664 are the tests: blowgun targets against the clock, fetching a balsam that grows in the desert, and the Slate, on its own island near Citadel. Bank 4 id 30 names the Green Ball. |
| 3 | 34 (a Citadel interior; walkthroughs: a secret room in the sewers, opened with the pyramid key; a sphere guards the ball and breaks only to the lightning spell) | Object 3: `FOUND_OBJECT` Sendell's Ball, Sendell's Ball = 1. The hero's script: `SET_MAGIC_LEVEL 3`. | Bank 4 ids 3 and 203: Red Ball, and Sendell can now reach him when he is in danger. |
| 4 | 80 (island 4, Otringal), 103 (island 7, the Mosquibees), 109 (island 8, the Knartas), 117 (island 6) | In each scene the script gives that scene's key fragment (`FOUND_OBJECT`, its flag = 1), and then runs **the same block**: an inventory state, `FOUND_OBJECT` key (31), `SET_MAGIC_LEVEL 4`, and the fragment flags cleared. | Bank 4 id 44: the key to Dark Monk's temple, and the last level, the Fire Ball. |

The same block appears in all four fragment scenes, so the level comes with whichever fragment completes the key.
The condition before the block was not decoded. Walkthroughs agree that the level comes when the four fragments are
together. Scenes 197–220 set the level directly, along with the ball and the tunic; they look like demo or test
starts and are left out.

### Pacing: walkthrough order, not measured

| Level | Where in LBA2's story |
|---|---|
| 0 → 1 | The first region (Citadel). |
| 2 | The second island (Desert Island), after enrolling and passing three tests, one of them on another island. |
| 3 | Back on Citadel, at the end of the Twinsun part. It needs the pyramid key from Desert Island and the lightning spell made from the pearl. |
| 4 | Late on Zeelich: four peoples, four fragments, in any order, before the last dungeon. |

So LBA2 gave **one level per act, each at the end of a quest with several steps**. No play-time figures were
measured: there are no recordings in this container.

### Web sources (search-result summaries only)

The session's network policy blocked the pages themselves: lba.fandom.com, twinsuniverse.xesf.net and
the-spoiler.com did not resolve. The summaries agree with the scripts above:
- https://lba.fandom.com/wiki/Magic_Ball (colours yellow, green, red, fire; the items behind each level).
- https://lba.fandom.com/wiki/Sendell%27s_Ball (the sewers' secret room, the pyramid key, the lightning spell).
- https://lba.fandom.com/wiki/Dark_Monk%27s_Key (four fragments; the Sups' fragment in the Emperor's palace).
- https://magicball.net/lba2/hints/darksphere-walkthrough/ and https://magicball.net/lba2/hints/speedrun-walkthrough/
  (the school in the Desert Island cemetery; the headmaster gives the diploma and the green ball).
- https://www.justadventure.com/walkthrough/twinsen2-cheats/ and https://gameboomers.com/wtcheats/pcLl/LitBigAdv2a.htm
  (the museum tunic heist; the ball in the house's basement).

## 2. What made it work (inferences)

| # | Principle | Evidence | Confidence |
|---|---|---|---|
| P1 | A level is never for sale. Each one is a named thing in the world: the ancestors' tunic, a diploma, Sendell's own ball, an old key. | One writer (the script command); the four items | High (code) |
| P2 | Each level closes a quest with several steps that uses what the player already knows: a timed heist; three tests that reuse old skills; lightning and full magic against the guard sphere; four islands. | Scripts and walkthroughs | Medium–high |
| P3 | About one level per act. Each colour becomes a memory of a place and a person. | Walkthrough order | Medium (interpretation) |
| P4 | Clear feedback: magic refilled to the new maximum, a new ball sprite and inventory model, and a message that names the colour and says what it gives. | Engine code; bank 4 ids 3, 30 and 44 | High |
| P5 | Freedom inside a step: three tests in any order; four fragments in any order, the last one completing the key. | Bank 10 id 22; the repeated block | High |
| P6 | Friction we do not copy: the diploma's errands (an enrolment fee, then a peddler for the parade tunic) delay the reward without teaching anything. | Bank 10 ids 19, 55, 62, 72 | Medium (opinion) |

## 3. Our schedule (chapters 1–12)

The hero starts a new game at level 1 (actors.js), and the levels go up to 4. The story gives every later level.
`mpMax = 6 + 2 × level` is unchanged (see section 6).

| Level (ball) | Chapter | The moment | Why there (principle) |
|---|---|---|---|
| **1 (yellow)** | **1–3** | The ball from the cupboard at home (ch. 1). Level 1 lasts **to the end of chapter 3**. | LBA2 gave nothing beyond its first level in the first region, and chapters 1–2 are our first region (Citadel). It started at 0 and found level 1 there; we hand that level out with the ball. Chapter 3 (Zeelich) is a setback chapter, the plan confiscated: it gives no new power. |
| 2 (green) | 4 The Dig (Desert Island) | The Temple of Bù's door. The player opens it by striking only the discs with heat behind them (crystals grow where heat leaks), and the heat stays in the ball. Twinsen says so. Rector Hougo at the School of Magic, on the same island, notices the new colour once ("last time it took you three tests and a diploma"). | P2: he applies a learned rule. This is the same island as LBA2's diploma. P4: the reward is explained by cause, and a return visit gets a response. |
| 3 (red) | 7 The Observatory | Sendell speaks plainly, fading, and gives "a little of my light" for the ball. The red ball is ready just before the duel with the heavy drone. | LBA2's level 3 was Sendell's Ball. Here her gift costs her something, which the story needs (she is fading). |
| 4 (fire) | 10 Baldino's Network | The five friends hold their stations, the code opens the shaft, and the heat that rises sets the ball alight ("it feels like all five of them at once"). Used in chapters 11–12. | LBA2's fire came from four peoples' fragments, gathered in any order. Ours comes from the five stations of chapter 10, also in any order: the community's work, not a purchase. |

By the STORY_BIBLE's budgets (planned minutes, not measured play), level 2 comes about 2.5–3.5 hours in, level 3
about 5–5.5 hours in, and level 4 about 7.5–8 hours into a game of about 10 hours.

## 4. Implementation

| File | Change |
|---|---|
| `src/game/story/magic.js` | New. `MAGIC_STEPS`; `grant(level, {lines, same, done})`; `catchUp()`; `due()`; `ballNote()`; Hougo's `talkFirst`. |
| `src/game/text/magic.js` | New. English text. |
| `story/index.js` | Builds `story.magic`. `catchUp()` runs in `nextChapter` and `applyFlags` (a load). Hougo's line is routed after the arsenal's. |
| `story/dig.js` | `openSeal`, third disc: after `c4_seals_all` → `grant(2)`. |
| `story/observatory.js` | `lightCrystal`: Sendell's line `ml_c7_gift`, then `grant(3)` when her words end. |
| `story/network.js` | `sendCode`: after `c10_shaft` → `grant(4)` with two lines, then Baldino's lines as before. |
| `main.js` | The `magic` item and its price and buy lines are gone from `SHOP` and `openShop`. The potion, flask and clover stay. Nara's case (arsenal.js) never sold magic. |
| `i18n.js`, `text/common.js` | `shop_magic` removed. Pippa's greeting and the kashes description no longer offer a "magic crystal". The Hebrew lines were changed the same way. |
| `inventory.js` | The ball's description gets one line about where its colour came from (`ballNote`). |

How a step behaves:
- **Once only.** Each step has a flag, `ml_2`, `ml_3` or `ml_4`. A second call does not change the level, show a
  toast or refill the magic; it only runs `done`.
- **Never lower.** A step raises the level only if the hero is below it.
- **Feedback.** The magic fills, the sound plays, particles in the new colour appear on Twinsen, the HUD bar changes
  colour, and a toast appears ("Magic level 2: the green ball").
- **Never missable.** A chapter that begins, or a save that loads, past a step's moment gets that level at once
  (`catchUp`, with one toast). This covers a chapter started by a test and saves from before this change.

## 5. Saves

- **No format change.** `SAVE_VERSION` stays 5. The level was already saved, and the `ml_*` flags travel with the
  other flags.
- **A bought level is kept.** The user's own save is at the green ball from the old stall. Taking a level back
  would punish a choice the game offered, and the level gates no story step. The cost is small: when that save
  reaches a step it already has, the step refills the magic, shows "Magic refilled" and uses a line without the
  colour (`ml_c4_same`, `ml_c10_same`).
- **A save below its chapter's level is caught up on load.** For example, a save in chapter 8 at level 1 loads
  at level 3, with `ml_2` and `ml_3` set and one toast.
- **A broken or missing level** loads as 1, never NaN.

## 6. Open points (not changed here)

- **Magic points grow slowly.** Ours is 8, 10, 12, 14 by level; LBA2's was 20, 40, 60, 80. Ball damage already
  scales with level (COMBAT.md). Making each level feel bigger in magic is a combat-balance task for the combat
  owner.
- **Untested by players.** Whether the three moments are noticed and feel earned is a design judgement until a
  first-time player plays them. Only the chapters' own player-input tests play the puzzles that lead to them.

## 7. Tests

`tests/magic-levels.mjs` checks:
- No stall or vendor sells a magic level. Every item each shop offers is bought, and the level stays the same.
- A flask still fills the magic.
- The level is 1 at a new game, with the ball, and at the ends of chapters 1, 2 and 3.
- Each step fires once, through the chapter's own hook called twice: one toast, the magic filled once, plus the
  line and the inventory note.
- Save → Continue keeps the level.
- Old saves: bought levels 2 and 3 are kept, catch-up works on load, and a broken level loads as 1.

Results are in the MAGIC-LEVELS entry in QA.md.
