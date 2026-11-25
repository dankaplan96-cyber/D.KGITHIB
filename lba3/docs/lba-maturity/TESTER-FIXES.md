# TESTER-FIXES — what a private tester trips on in the 0.50.0 build (24.11.2026)

Source: the desktop agent's install and play of the 0.50.0 Windows build (`tools/testlab/WORLD_ART_REQUESTS.md` sections
68.1, 68.3 and INSTALL-69; pictures `captures/hw-68/`, `captures/hw-69/`), and the user's pick for the Zeelich depot's guard
(item 9, 24.11). Every fix is made at its cause and holds wherever the same pattern occurs; the sweep for each is listed.
All results here: **automated runtime only (SwiftShader)** — headless Chromium in the cloud, `game.step`, no real GPU, no
person playing. Old saves (format 6, and the v5 fixtures the suites load) load unchanged: no save field was added or changed.

Not touched (as asked): `characters.js`, `sculpt.js`, the opening/tutorial files, `story/depth.js`, and the chapter 15–16
story files (`story/chapter3.js`, `story/answer.js`). No story-file change was needed for item 4.

## 1. E goes to the wrong thing next to people (P115, INSTALL-69 (1), 68.1)

**Observed** (reproduced before the fix, `captures/hw-69/play-en.log`, and a probe of the same spots): the use-target ranking
was distance first, with only a small penalty (≤ 0.9 m) for things to the side. Walking up to Zoé from the house's side,
the garden tap 0.84 m away and 78° to his side beat Zoé 1.6 m straight ahead. At the well, a person beside it could take the
key; the objective rule (INTERACT-PICK) let the objective's thing win only in some of these cases.
Separately, the tap "did nothing for 40 s": E starts a few scripted steps up to the tap (`handTo` → `walkTo`), and **any**
key in that moment (the player's turn to line up) silently threw the use away.

**Fix** (game-wide, every use-target in the game goes through `findInteractable`):
- `src/main.js` `facingPick` (FACE-PICK), the last step of `findInteractable`: every candidate in reach is read against his
  facing line: how far off the line it stands plus a fifth of how far along it (`LINE_ALONG`); the lower comes first (so of
  two on the line the nearer one — a ladder's top or the well's mouth before a person behind it — and the tap at arm's length
  20° aside before Zoé 2.4 m ahead). A thing counts as faced within 60°, a person within ~39°. A person wins over the faced
  thing only when he faces that person and stands nearer his line; a person he does not face gives the key to the thing he
  faces; a thing he does not face gives it to the person he faces. The objective's own thing (INTERACT-PICK's goal) faced
  within ~32° keeps the key. Things among themselves and people among themselves keep the existing ranking and rules
  (containers, signs, the counter rule). A thing under 0.5 m counts as faced only squarely ahead, so a search spot at his
  feet or side still does not take the key from the person he faces (CONTAINERS-3 kept).
- `src/game/actors.js` STEER-HOLD: the game's few steps to a use (`walkTo`, used by every `handTo` reach in the game) are
  taken over only by a move held 0.22 s (a deliberate walk away); a key tapped meanwhile no longer cancels the use.

**Test** `tests/interact-pick.mjs`, new section F (three spots: the tap's step walking up to Zoé, the tap faced with Zoé
beside it, the well's way down after climbing out with Gilbert 1 m and Mira 1.3 m beside him), F3 the steps survive a tapped
key; A2 widened (Zoé may answer where he faces her more squarely than the tap — the new rule). The game-wide sweep (E,
every campaign fixture's objective stars, base-01 … base-15): E1 PASS — 208 spots round 10 stars where the star's own
thing is in reach and faced, 0 lost to a person or another thing (the final run: 22/22 functional, no errors).
Result (the final run, automated runtime only): A1–A9, B1–B5, C1, D1, F1–F5 all PASS. F1: walking up to Zoé with the tap
45° or more off his line, 18 of 18 spots Zoé (before: the tap at 6). F2: the tap faced, Zoé beside it: 27 of 27 squarely
faced spots the tap. F3: a 0.1 s turn key during the step-up no longer drops the use (before: always dropped); a move held
0.45 s still takes over. F4: the well's way down, Gilbert 1 m and Mira 1.3 m at his sides, facing the well: 72 of 72 the
well. F5: turned squarely to Gilbert: 60 of 60 Gilbert. Note: the exact spot where the desktop's player got Gilbert was not
reproduced by staging (the old rule also gave the well at the staged F4 spots; B1's "before" list shows the ranking alone
giving Mira or Gilbert); one earlier run had Mira answer once at the exit's spot while she walked her round. The new rule
gives a person the key only where he faces them, whatever the ranking.

## 2. The pause menu's three Benchmark buttons (INSTALL-69 (2))

**Fix**: `index.html` the tools row is `dev-only`; `css/style.css` shows it only on `body.dev`; `src/main.js` wireUI sets
`dev` with `?bench` or `?dev` in the address, or in the desktop app run from source / with `LBA3_DEVTOOLS`
(`desktop/preload.js` `dev`, `desktop/main.js` `lba3:dev`: `!app.isPackaged`). The tools are unchanged. `menuButtons` skips a
button that is not shown (the desktop-only Quit Game in a browser was also an invisible stop for the arrows).
**Test** `tests/tester-fixes.mjs` A1–A2. Result: A1–A2 PASS (no flag: Resume, Journal, Save Game, Settings, Controls, Save & Quit; with ?bench the three tools too).

## 3. Quit Game ignored a click made the moment the title appeared (INSTALL-69 (3))

**Observed**: the desktop's script (`captures/hw-69/app69.mjs`, `saves.json`) read the title's buttons 1.5 s after the
reload — they were on the page (`offsetParent` set, no text yet) under the loading screen, and Quit Game was missing
(the `desktop` class is set by the game's code, later). So "the title appeared" before it could answer.
**Fix**: `index.html` the title screen starts hidden (the game shows it, `showScreen('title')`, when it is ready) and the
`desktop` class is set by a one-line script before the first paint, so Quit Game is there with the title.
**Test** `tests/tester-fixes.mjs` B1–B2 (the desktop bridge stood in by a test double; no Electron here). Result: B1–B2 PASS (148 looks during the load: never a title button under the loading screen; the first click on Quit Game as soon as it showed: one quit).

## 4. Modern controls: the bank shot from a throw plate never banked (68.3)

**Observed** (code): the plates line Twinsen up by setting his facing; a Modern throw takes the mouse's point (or the stick),
not his facing. **Fix** in the throw code only: `src/game/combat.js` `aimDir` asks `game.aimPlate()` (`src/main.js`): on a
throw plate (within 0.6 m of its middle) and lined up with its line (within 0.03 rad), a Modern throw goes along the plate's
line, as Classic's does. A lock-on still comes first. The sweep of plates in the game: the Core's three pylon plates
(`chapter3.js plates()`), the shaft's teaching plate (`underground.js` `c3shaft.teach.plate`) and the gallery's middle stone
(`c3gallery.stonePlate`) — all five read; nothing else in the game lines him up for a throw (the Off-the-Wall bank puzzle
has no plate and is aimed by hand). Facing a plate's line by chance off a live plate means the same throw as facing.
The hint: `c3_toast_fight` now says "Stand still on a glowing plate and throw: the ball goes along its arrow and banks off
the brass panel" (text/ch3.js; Hebrew in text/he/ch3.js). The shaft's lines (`sh_bal_bank`, `sh_toast_mirror`) already
say "stand still on the plate… it lines you up".
**Test** `tests/tester-fixes.mjs` C1–C4 (base-15, the Core: Modern with the mouse pointing elsewhere, before/after; Classic
on the same plate in a fresh boot; off the plate the mouse still aims). Result: C1–C4 PASS. On the first pylon plate, the mouse at the screen's corner: before (the plate rule off) the throw
left 0.91 rad off the plate's line, along the mouse, no pylon; after, 0.00 rad, the pylon converted. Classic: 0.00 rad,
converted. 2.2 m off the plate the Modern mouse aim is unchanged (0.86 rad).

## 5. P116 overhead remarks: Brix, Garrick and Dot opened the box (68.1)

**Observed** (the remark log in a probe on base-03): their lines are three short sentences ("Shh. I'm resting my eyes.
They've seen a lot.", "I'm carrying a message. It's a secret. It's for the baker.") or 81 characters (Garrick's) — the rule
allowed two sentences and 80 characters. **Fix** `src/game/walkers.js`: a remark is up to 90 characters and three sentences
(a fourth sentence, a longer line, a chain, a choice or anything the talk changes keeps the box). Game-wide: the rule is the
one every minor resident's talk goes through (all the residents' modules). Of the Citadel walkers' `rs_` lines, 40 of 94
were short before, 58 of 94 by sentences now (measured on the English source).
**Test** `tests/overhead-remarks.mjs` A13 (the rule), new A15 (Oda, Brix, Garrick, Dot each spoken to four times by the
key: always overhead; none of their lines keeps the box). Result: overhead-remarks 17/17 functional and its visual checks PASS; A15: Oda, Brix, Garrick and Dot 4 of 4 talks each overhead. Their longer story-state lines (`rs_oda_hot`, `rs_oda_gone`, `rs_garrick_hot`: over 95 characters or 4 sentences; `rs_dot_hot`: 4 sentences) still open the box, by the rule; shortening those lines is the way to have them overhead too (not done: text for the user/dialogue editor).

## 6. The talk camera with Zoé: his arm drawn see-through (68.1, picture 06)

**Observed**: the garden fence between the talk camera and Twinsen; the see-through silhouette (a play aid that shows him
behind walls) drew his arm and sleeve over it. **Fix** `src/main.js` setState: the silhouette's one material (shared by all
his bodies) is off in `dialog`, `cutscene` and `shop` and back in play; the story's own per-mesh switches are untouched.
**Test** `tests/tester-fixes.mjs` D1. Result: D1 PASS (the silhouette off in the talk with Zoé, back on in play). The picture this suite takes of that talk is black in the headless run (the house's room not drawn in that frame): judged by the check, not the picture.

## 7. The shop house's door sill at (−33.75, −1.5)

**Verified, no change needed on this tree.** worldfit (SERVE=1, this tree) passes 8/8 visual + 1 functional: no Citadel
building has a door sill under the ground; the shop has no finding at all. The 0.24 m sill was fixed by P113 (the shop on
its terrace, `town.js` `doorLift` / `terraceOf`, LBA3-RUN world), which is on this branch; the WALL-NORMALS report read it on
its own older base. (worldfit's unjudged areas list one similar case: the desert School's mask, a door sill 0.25 m under the
ground at (3404.5, 0.73) — Desert Island is listed, not judged, by the suite's design.)

## 8. The merged wall relief (wall-normals, on by default): overlap-sweep, citadel-structures, worldfit

SERVE=1 support: `tests/lib/boot.mjs` `launch()` now routes this checkout's files when `SERVE=1` (every suite that boots
through it; `tests/combat.mjs` got the same, it launches its own browser).
Each run once on this tree (wall relief on by default), automated runtime only (SwiftShader):
- `tests/overlap-sweep.mjs`: **PASS** (1 functional, 7/7 visual; no open finding; the known ones: a 2, b 13, c 124, d 259,
  e 22, f 0, g 1, all on the suite's KNOWN list).
- `tests/citadel-structures.mjs`: **PASS** (7/7).
- `tests/worldfit.mjs`: **PASS** (8/8 visual, 1 functional; Citadel's listed z-fights 25, none judged; 115 small ones listed
  game-wide).
Nothing in this order touches the walls; with the wall relief on, these three show no failure.

## 9. The Zeelich depot's Grobo guard, softer (the user's pick, 24.11)

**Change** (only this guard: `zguard1` in `story/chapter2.js`, both of its definitions; the `guardG` kind elsewhere — the
network's bore guard, the evacuation yard, the asylum, the dev arena — is unchanged): `src/game/guards.js` reads a guard's
fight values from `def.tune` over `GUARD_TUNE` (the values every guard had). The depot guard: the rifle only from 3–6.5 m
(was 0–8), a bolt half a life (was 1), slower (6.5 m/s, was 8), a 1.0 s aim line (was 0.8), 2.8 s rest after a shot (was
1.8); the baton from 1.5 m (was 1.9), its reach 1.3 m (was 1.6), the strike's step 1.2 m/s (was 2.2); the wind-up 0.9 s
(was 0.55) with a bark (`alert`) as the baton goes up. Armour 2, 5 lives and the baton's 2 stay; death's cost is unchanged.
A guard that keeps his rifle for range walks right into the baton's reach (no stand-off between 1.5 and 3 m).

**Before/after** (a fight probe, the same bot both times, the old values set on the same build for "before"; the drones and
the dog taken out so the guard's own share is measured; Twinsen staged 7 m from the alerted guard, Classic keys: he faces
the guard, keeps 3–5 m, throws when the ball is home — every third throw charged 1.1 s —, dodges on the baton's swing and
on a bolt within 1.8 m; 150 s of game time, 6 starts round the guard). Automated runtime only (SwiftShader):

| | damage taken / 150 s (mean) | deaths (of 11 lives) per start | bolts / baton hits (all starts) |
|---|---|---|---|
| before | 27.7 | 2, 2, 0, 3, 3, 3 | 166 / 0 |
| after | 1.9 | 0, 0, 0, 0, 0, 0 | 19 / 1 |
| before, the bot never dodging (4 starts) | 31.0 | 5, 4, 0, 1 | 124 / 0 |
| after, never dodging (4 starts) | 31.5 | 9, 1, 0, 0 | 40 / 53 |

Read: the guard no longer wears a player down from range (bolts 166 → 19); he now has to come in, and his swing is long and
heard, so dodging it works (156 swings, 1 hit). A player who never dodges or steps back takes about the same damage as
before, now from the baton (one start pinned the bot against a wall: 9 "deaths"). The probe's bot rarely beats him in 150 s
(its quick throws bounce off the armour); the desktop's real-key player won every try before. One start (3 of 6) never
engaged (no line of sight) in either run. Script: the fight probe in the agent's scratchpad (not kept in the repo).
**Suites** `tests/depot.mjs`, `tests/combat.mjs`: depot **PASS** (29/29 functional + 1 visual: the clue, the trick, the watch's own pursuit G1, progress kept, 30/60 FPS) and combat **PASS** (84/84), each run once, automated runtime only (SwiftShader).

## Files
- `src/main.js` — FACE-PICK (`findInteractable` → `facingPick`), AIM-PLATE (`aimPlate`), the silhouette off in talk/scene/shop
  shots (`setState`), the dev flag and the menu stops (`wireUI`, `menuButtons`)
- `src/game/actors.js` — STEER-HOLD (walkTo taken over only by a held move)
- `src/game/combat.js` — `aimDir`: a throw plate's line first in Modern
- `src/game/walkers.js` — the remark rule: 95 characters, three sentences
- `src/game/guards.js` — `GUARD_TUNE` / `def.tune`; `src/game/story/chapter2.js` — `ZGUARD_TUNE` for `zguard1`
- `src/game/text/ch3.js`, `src/game/text/he/ch3.js`, `src/game/he-text.js` — `c3_toast_fight` (English and Hebrew)
- `index.html` (title hidden until shown, the `desktop` class early, the tools row `dev-only`), `css/style.css` (`.dev-only`)
- `desktop/preload.js`, `desktop/main.js` — `dev` (run from source or `LBA3_DEVTOOLS`)
- tests: `tests/tester-fixes.mjs` (new), `tests/interact-pick.mjs` (F, A2), `tests/overhead-remarks.mjs` (A13, A15),
  `tests/lib/boot.mjs` and `tests/combat.mjs` (SERVE=1)
- `node tools/he-bundle.mjs` run; `node tests/dialogue-check.mjs` PASS (5695 of 5695 Hebrew keys)

## Remaining / for the user
- **Visible/feel changes for the user's keep-or-revert:** the use-target rule (FACE-PICK: a person answers only when faced;
  the steps to a use survive a tapped key); the remark rule (three short sentences overhead); the depot guard's softer fight.
  No world or character mesh changed.
- The depot guard: a player who never dodges or steps back takes about the same damage as before (now from the baton); if
  the user wants fewer deaths for that player too, the baton's 2 could become 1 for this guard (one value, `ZGUARD_TUNE`).
- Electron itself was not run here: the desktop's Quit Game and the `dev` flag were tested with a stand-in bridge. A real
  check on the desktop: the installed build shows no Benchmark row; `npm start` shows it; Quit Game at the first frame.
- The four residents' longer story-state lines stay in the box (see 5).
- worldfit lists the desert School's mask door 0.25 m under the sand (not judged by the suite).

## סיכום בעברית
- **E ליד אנשים:** הכלל החדש — מה שטווינסן פונה אליו והכי קרוב לקו הפנייה שלו מקבל את המקש; אדם רק כשפונים אליו. בברז
  בגינה זואי עונה כשהולכים אליה, הברז כשפונים לברז; בבאר הבאר (הירידה) לפני גילברט שעומד לידה. צעדי ההתקרבות לחפץ לא
  מתבטלים יותר מלחיצת מקש קצרה (הברז "לא עשה כלום 40 שניות"). בדיקה: interact-pick, עבר.
- **כפתורי Benchmark:** מוסתרים מהשחקנים; מופיעים עם ‎?bench‎ או בגרסת המחשב שמורצת מהקוד. בדיקה: tester-fixes, עבר.
- **Quit Game:** מסך הכותרת מוסתר עד שהמשחק מוכן, והכפתור קיים מהרגע הראשון; לחיצה אחת מספיקה. עבר (עם תחליף לגשר של Electron).
- **זריקה מלוח כיוון במצב Modern:** על לוח, הזריקה הולכת לאורך קו הלוח (כמו ב-Classic) ולא לכיוון העכבר; הרמז אומר זאת.
  בלי לגעת בקבצי הסיפור של פרקים 15–16. עבר (Modern ו-Classic על אותו לוח).
- **הערות מעל הראש:** בריקס, גאריק ודוט מדברים עכשיו מעל הראש כמו אודה (עד שלושה משפטים קצרים). עבר.
- **צללית שקופה בשיחה:** כבויה בזמן שיחה/סצנה/חנות. עבר.
- **סף הדלת של החנות:** כבר תוקן (המרפסת של P113); worldfit עובר.
- **תבליט הקירות:** overlap-sweep, citadel-structures, worldfit — שלושתם עוברים.
- **השומר הגרובו במחסן בזיליך:** פחות נזק מרחוק, טווח קצר יותר, הנפה ברורה עם קריאה. בבוט שמתחמק: 27.7 → 1.9 נזק ב-150 שניות,
  0 מוות. שחקן שלא מתחמק בכלל — נזק דומה לקודם (מהאלה). depot ו-combat עוברים.
כל התוצאות: הרצה אוטומטית בלבד (SwiftShader).
