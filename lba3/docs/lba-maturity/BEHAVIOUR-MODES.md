# BEHAVIOUR-MODES (P125): the user's picks from MECHANICS-AUDIT, built

The user, 24.11, from MECHANICS-AUDIT.md section 4: build (1+2) the mode's name and what the action key does for ~2 s
after every switch, and a hide tip; (3) a short forced yard step, sneaking up to the napping Dino-Fly in Discreet, with
the pipe step asking for Athletic; (4) Discreet works against every enemy; (6) "?" then "!" over a watching enemy;
(8) Aggressive hits harder in melee. Talk, search and fight stay possible in every mode (no LBA1-style mode locks).
Not chosen: (5) Discreet's lob at targets, (7) overhearing.

Base `ccr-c1c2c4b9-dep6ed` at `9d2c7278`. Evidence labels: **Automated runtime** (headless Chromium, SwiftShader,
`game.step`; nobody played, no real GPU), **Source only**. Results: see "Evidence" at the end.

## 1. The mode caption (proposals 1+2)

- After every behaviour switch the player makes (F1-F4 / 1-4, Tab, the Ctrl menu, the pad's D-pad, the HUD's icons:
  `Hero.setBehaviour`), a small caption at the bottom-left corner for 2.0 s of play: the behaviour's picture (the
  same icon as the Always-on HUD's bar), its name, and what the action key does in it, in the key in use (`hud.key
  ('action')`: Space, a remapped key, the pad's A).
  - Normal: "Space Talk, search" · Athletic: "Space Jump" · Aggressive: "Space Strike" · Discreet: "Hold Space to hide".
  - Show control tips: Off leaves the key line out; the name always shows.
  - LBA HUD (the default): a black box with a thin white border and square corners, as the tip panel; the Always-on HUD:
    above the behaviour bar, rounded like its panels. Hidden under dialogue, menus and the found box (`#hud.busy`).
  - A switch made in the Ctrl menu shows once the menu closes (its clock runs in play). A behaviour the story sets
    (Zoé's search, the escorts, a load) shows nothing.
  - Files: `src/game/hud.js` (`modeCap`, `_modeTick`, the style), `src/game/actors.js` (`setBehaviour`),
    `src/game/text/modes.js` + `text/he/modes.js` (bm_*).
- **The hide tips** (`src/game/tutorial.js`, both in the tip panel, Show control tips like every tip):
  - `hide`: the first time he is in Discreet with the panel free: "Hold Space to hide" (the key in use). Learned the
    first time he hides; 10 s at most. (In a new game the first Discreet is the yard's Dino-Fly step, whose panel shows
    the step: the caption's "Hold Space to hide" covers that moment, the tip comes at the next Discreet, usually the kids.)
  - `cover`: wherever the story asks him to hide: a watcher on his round in the scene (Zoé's office, the archive:
    `Watcher.start` registers in `game.watching`) or a room with cover spots and an enemy about (c3deep): "Hold Space to
    hide. Crouched behind furniture, they can't see you." In each such place until he hides there, 12 s at most there;
    not saved (shown again after a load).
  - The kids' "Back to Normal" goes before the plain hide tip (ORDER).

## 2. The yard's Dino-Fly step (proposal 3)

**The check asked for:** the Dino-Fly's LBA2 spot (-58.0, 95.3) is **21.6 m** from the front door (-46.15, 77.2):
outside the yard's 15 m edge, on the rock shelf south of the house, 3.7 m above the yard, reached only round by the
beach (26 m of walking, 41 s in Normal: Automated runtime, `P.plan`). Not a short yard step.

**The nearest sensible spot chosen:** the yard's west lawn by the north-west corner of the house, **(-53.7, 70.6)**,
10.6 m from the front door: open level grass, inside the edge with room round him, seen from the yard and from Zoé,
off the walk to the beach and the lane. He lies there in every chapter (one place: the conch's "the Dino-Fly hears it"
and his talk work as before). **A visible world change for the user's pick:** `?dino=lba2` puts him back on LBA2's
shelf (and the step is then left out, as it would leave the yard). Pictures: captures/behaviour-modes/dino-spot-*.jpg.

The step (`src/game/story/openingsteps.js` 'dino', `src/game/dinofly.js`):
- Order: Zoé → inventory → tap → **Dino-Fly** → barrels → pipe (the dots: six).
- Zoé asks in one line: "Shh, the Dino-Fly's asleep. Creep up in Discreet and give him a pat without waking him."
  The goal: "Sneak up to the sleeping Dino-Fly in Discreet and pet him"; the key line: the Discreet key, then, in reach
  of him asleep, "W Pet him". The gold marker over his back, a ring round him, the map's star on him, the where line
  and Zoé's reminders as every step (TUTOR-TARGETS).
- His hearing (game-wide): in Normal, Athletic or Aggressive within 9 m of him he wakes and looks at Twinsen (as before:
  9 m); in Discreet only right against him (1.2 m from his middle, inside his flank's reach). Awake, he dozes off
  3 s after he last heard him. Asleep, the hand key strokes his snout: "(He sleeps on, rumbling softly, as Twinsen
  strokes his snout.)", a rumble; the prompt reads "Pet" (Hebrew "ללטף"). Awake, the hand key talks to him as before.
- Nothing fails, nothing is timed: woken, Zoé says once in a while (14 s apart at least, her name at the screen's edge
  when she is out of view): "He heard you. Let him doze off again, then creep up in Discreet." Petted early (before
  the step), it counts (`pr_dino`).
- Round him counts as the yard while his step is open (6 m), so circling him never trips the yard's edge.
- **The pipe step asks for Athletic:** "Switch to Athletic and jump the copper pipe" (Zoé: "Go Athletic and jump the
  project's pipe..."). Walked round after the switch to Athletic, it ends as he leaves the yard ("Close enough"); walked
  round in another behaviour, the yard lets go as before (her one call).
- An expert adds about 15-25 s (the Discreet walk is 0.67 m/s; the step can be done from the tap in ~12 m).
- **Saves (format 6):** a save from before the steps (no `pr_tut2`) sees nothing. A mid-yard save from before this
  build (no `pr_dino`) resumes on the Dino-Fly step if it is still open (the first undone step: kettle, tap and the rest
  kept), then goes on as it was. A save made mid-yard in this build resumes at its step; the Dino-Fly is asleep again on
  a load (his sleep is not saved).

## 3. Discreet works against every enemy (proposal 4)

`hero.sneak()` (actors.js): his own Discreet share of visibility, 0.4 sneaking, 0.25 still, 0.12 hiding, 1 otherwise (no
storm, no coat, no run). The mites, sentries and crawlers multiply their fixed ranges by it; their old gate (visibility
over 0.2) stays, so a storm, a coat or hiding still blind them as before. Normal, Athletic and Aggressive: unchanged
for every kind. The guards, drones and dogs: unchanged (they already used his visibility).

| Enemy | Rule | Normal / Athletic / Aggressive | Discreet sneaking, before → after | Discreet still, before → after | Hiding |
|---|---|---|---|---|---|
| Guard (Vesk's, Grobo, FunFrock clone) | 10 m × visibility, cone, line of sight | 10 m (Athletic run 12.5) | 4 m (unchanged) | 2.5 m (unchanged) | blind past 1.5 m |
| Drone | 9 m × visibility, cone, line of sight | 9 m (run 11.25) | 3.6 m (unchanged) | 2.25 m (unchanged) | blind past 1.5 m |
| Guard dog | 11 m × visibility, wide cone; nose 3.2 m when visibility > 0.5 | 11 m (run 13.75) | 4.4 m (unchanged) | 2.75 m (unchanged) | blind past 1.5 m |
| Mite (crystal, ice) | fixed range, no cone | 6 m | **6 → 2.4 m** | **6 → 1.5 m** | blind (as before) |
| Sentry | sight 9 m + line of sight; sure within 6 m or facing him | 9 / 6 m | **9 / 6 → 3.6 / 2.4 m** | **9 / 6 → 2.25 / 1.5 m** | blind (as before) |
| Crawler | fixed range, no cone | 9 m | **9 → 3.6 m** | **9 → 2.25 m** | blind (as before) |
| Watcher (Zoé's office guard, the archivist) | suspicion × max(0.15, visibility) | unchanged | unchanged | unchanged | at cover spots: unseen |
| The bore's guardian (boss) | always fighting | unchanged | unchanged | unchanged | unchanged |

Tuned fights: the Citadel depot watch and the Zeelich depot (guards, drones, dogs) are untouched; every mite, sentry
and crawler fight is the same in Normal, Athletic and Aggressive; only a player who chooses to sneak is noticed later.
Mites that stir before they come (`def.wake`: chapter 3's galleries, chapter 6's ice mites) stir only once noticed,
now at the shorter range. Files: `src/game/enemies.js` (MITE_SEE, SENTRY_SEE, SENTRY_SURE, CRAWLER_SEE),
`src/game/actors.js` (`sneak`).

## 4. "?" then "!" (proposal 6)

`src/game/noticemark.js` (new), one rule for every enemy that watches:
- **"?"** (yellow) while it is starting to notice him: its own sight test with the range stretched ×1.5 holds (he is
  in its cone and line of sight, a little too far, or too sneaky, to be seen yet). It rises in ~0.1 s and fades in
  ~0.7 s when he slips out. Purely a read-out: no rule of sight or timing changed.
- **"!"** (red, pops in a touch larger) for 1.3 s when it has seen him: the moment its state turns on him (the alert
  sound's moment). It replaces the floating "!" the guards, drones, dogs and the depot watch had (one look for all).
- Who: guards (on their round, a search, the way home), drones (round, search), dogs (round, way home; not while
  calmed by the conch), sentries ("?" while it has him in sight but is not yet sure, or nearly in sight; "!" as it
  comes), mites that stir first (`def.wake`: "?" while they stare; no "!": the charge says it), the watchers (Zoé's
  office, the archive: "?" once his torch comes up, "!" as he spots her). Not: plain mites, crawlers, the boss (the
  marks would be clutter there). A calm watch (the Citadel depot before he crosses its line) shows "?" only where it
  minds him: the yard past the line (`def.cares`, story/depotwatch.js).
- Depth-tested sprites (a mark never shows an enemy through a wall); one sprite per enemy, made the first time it is
  needed; hidden when the enemy is not updated (dead, knocked out, another area, a dialogue or a menu); a fresh "!"
  stays its 1.3 s over a watcher who stops to speak. Cost: one distance test per calm enemy a frame, its sight test
  every 0.15 s within the stretched range only.
- **Sound:** the palette has no soft suspicion cue (`alert` is the "!"'s; `blip`, `tick`, `mode` are interface
  sounds). **For the sound owner (action-sound):** a cue `suspect` (soft, low, rising two-note murmur; priority 2;
  spatial; at most once per enemy per ~1.5 s), played when a "?" first shows: `noticemark.js` `draw()`, where `show`
  turns on with `eT` 0. Not added here.

## 5. Aggressive hits harder (proposal 8)

`src/game/combat.js` `AGGR = 1.5`: in Aggressive, every melee move's damage ×1.5 (fists, kicks, the sword's strikes,
the glove); the same moves, reach and timing; every other mode as before; the ball and the gadgets unchanged.
Armour's rule kept: a jab (1.5) still braces off a Grobo's armour 2, a kick (3) gets through (as its 2 did).

| Move | dmg | in Aggressive |
|---|---|---|
| jab, jab2 | 1 | 1.5 |
| kick, slash1, slash2, glove1, glove2 | 2 | 3 |
| slash3 | 3 | 4.5 |
| heavy (sword, held) | 4 | 6 |

E.g. a Quetch guard (3 HP): 3 jabs → 2; a Grobo (5 HP): 3 kicks → 2; a mite (2 HP): 2 jabs either way. Fights stay
winnable in every mode (nothing else got weaker).

## Not changed (by the user's decision)

Talk, search and fight work in every behaviour (E / W / the pad's A; the attack key). Discreet's throw (proposal 5)
and overhearing (7) not built.

## Evidence (24.11, commits on the worktree branch after `9d2c7278`)

All **Automated runtime** (headless Chromium, SwiftShader, `game.step`; nobody played; no real GPU; no listening).

| Run | Result | What it shows |
|---|---|---|
| `SERVE=1 node tests/opening.mjs` | PASS 50/50 | the opening film and the house unchanged (the Dino-Fly's new place is clear of the film's paths) |
| `node tests/opening-tutorial.mjs` | PASS 48/48 (after two fixes: the test read a typing dialogue line; from the Dino-Fly the barrels and the well are approached from the other side, so the test faces them; and the kids' tips, see below) | A13 the tap then the Dino-Fly step (goal, Discreet key, Zoé's ask); A13b walked up in Normal: he wakes, Zoé's gentle line, the step stays; A13c Discreet: the caption ("Discreet · Hold Space to hide"), gone after 2 s; he dozes off; crept up to: "W Pet", the panel's "Pet him"; petted: his line, the step done, the barrels; A17 the whole house and yard by the steps 106.5 s of game time; B1 tips Off: every step by its keys, the caption with the name only; B10 the kids' "Switch to Discreet" / "Back to Normal" still shown; C3b a mid-yard save from before this step resumes on it (3 of 6), kettle and tap kept |
| `node tests/tutor-targets.mjs` | PASS 28/28 | R1.9b the Dino-Fly step's marker and star on him; R3.1 a reload mid-yard: the Dino-Fly step, then the barrels; R3.4 an older mid-yard save (barrels hit, no `pr_dino`): loads on the Dino-Fly step, petted, the jump finishes the yard |
| `node tests/combat.mjs` | PASS 84/84 (4 new checks; one run before had a test fault: the moved crawler went back to its arena post) | notice ranges standing still, measured in 0.5 m steps: Normal mite 5.5, sentry 8.5, crawler 8.5, guard 10, drone 9, dog 11 (unchanged rules); Discreet mite 2, sentry 2, crawler 2, guard 2.5, drone 2, dog 2.5; a guard at 12 m: "?", still on his round; at 7 m: "!", alerted; a jab: Normal 1, Discreet 1, Aggressive 1.5 |
| `node tests/dialogue-check.mjs` | PASS (5695/5695 keys in Hebrew) | every new line has its Hebrew |

Found and fixed while testing: the yard's Dino-Fly step switched to Discreet and back, which counted as the kids'
"Switch to Discreet" and "Back to Normal" lessons, so the kids' scene lost its hint; a switch made during the yard's
steps no longer counts for those two lessons (tutorial.js `observe`).

Pictures and the clip (captures/behaviour-modes/):
- `yard-dino-step.mp4` (29 s, 12.5 fps, 960×540; the bot by keys): the step begins (Zoé's ask), the walk in Normal (he
  wakes, her line at the screen's edge), F4 (the caption), he dozes off, the creep up, "Pet", the line, the tick.
- `mode-caption-{normal,athletic,aggressive,discreet}-{en,he}.jpg`, `mode-caption-discreet-tips-off.jpg`,
  `mode-caption-and-pet-prompt.jpg`.
- `hide-tip-first-discreet.jpg` (the first Discreet after the yard), `cover-tip-zoe-office.jpg` (STAGED: chapter 2's
  own `startZoe()` with the chapter set: the 'cover' tip in Zoé's office).
- `mark-question-guard.jpg`, `mark-exclaim-guard.jpg` (STAGED: the Citadel depot's guard alone in its yard, a fixed
  camera; 13 m "?", 8 m "!" and the watch's own warning).
- `dino-spot-lba2.jpg`, `dino-spot-yard.jpg`, `dino-spot-before-after.jpg`: the same view from the yard, before
  (`?dino=lba2`: he is on the shelf behind the house, not seen) and after.

Not verified at runtime (**Source only**): the watchers' "?" / "!" (Zoé's office, the archive: the staged office had no
running watcher update), the sentries' and waking mites' "?" in their own places, the archive's and c3deep's 'cover'
tip, the depot-watch suite and the Zeelich depot suite (their rules are untouched; only the "!" there is the new mark).

## Files

New: `src/game/noticemark.js`, `src/game/text/modes.js`, `src/game/text/he/modes.js`. Changed: `src/game/actors.js`
(sneak, setBehaviour), `combat.js` (AGGR), `dinofly.js` (hearing, pet, DINO_AT), `enemies.js` (mites, sentries,
crawlers, drones, watchers), `guards.js`, `guarddog.js`, `hud.js` (caption), `tutorial.js` (hide, cover, the dino
step's keys, the kids' lessons), `story/openingsteps.js` (dino step, the pipe), `story/depotwatch.js` (cares, the "!"),
`world.js` (two lines: the Dino-Fly's place), `main.js` (the pet's label, the marks' tick), `text/opening.js` +
`text/he/opening.js`, `he-text.js`; tests `opening-tutorial.mjs`, `tutor-targets.mjs`, `combat.mjs`, `lib/player.js`.

## סיכום למשתמש

- אחרי כל החלפת מצב: למשך 2 שניות, בפינה למטה, שם המצב ומה עושה רווח בו (עם "טיפים: כבוי" רק השם).
- טיפ הסתתרות: בפעם הראשונה במצב דיסקרטי, ובכל מקום שהסיפור מבקש להסתתר (המשרד של זואי): "להחזיק רווח כדי להסתתר".
- צעד חדש בחצר: להתגנב לדינו־זבוב הישן במצב דיסקרטי וללטף אותו. אם הוא מתעורר, הוא נרדם שוב וזואי אומרת מילה עדינה. אי אפשר להיכשל.
- הדינו־זבוב היה מחוץ לחצר (על המדף מאחורי הבית, 21.6 מ' מהדלת), ולכן הוא ישן עכשיו על הדשא ליד פינת הבית. שינוי שרואים: תמונות לפני/אחרי, ואפשר להחזיר אותו (?dino=lba2).
- צעד הצינור מבקש עכשיו במפורש לעבור לאתלטי.
- מצב דיסקרטי עובד עכשיו גם נגד הקרדיות, הזקיפים והזוחלים. בשאר המצבים שום דבר לא השתנה.
- "?" מעל שומר, רחפן או כלב שמתחילים לחשוד, ו-"!" כשראו אותו.
- במצב אגרסיבי המכות חזקות פי 1.5. דיבור, חיפוש ולחימה נשארים אפשריים בכל מצב.
