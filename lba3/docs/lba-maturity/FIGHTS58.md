# FIGHTS58 · #58 "the first fights are still hard" (25.11.2026)

The local agent played v168 on the user's PC (ORDER-71, `tools/testlab/WORLD_ART_REQUESTS.md`; `captures/hw-71/ch2.log`,
`zdepot.log`): the chapter 2 depot cost 20 hits and both clovers, the Zeelich depot 17 hits and one clover. This card finds
where the hits come from, builds three candidates behind a URL switch, measures them with the same bot, and recommends.

**Labels.** *Played (hardware)*: the local agent's bot with real keys on the user's PC (ORDER-71). *Automated runtime
only (SwiftShader)*: headless Chromium here, game time stepped, a bot pressing keys (`tests/fight58.mjs`,
`tests/lib/fight58bot.js`). *Source*: read in the code. Nobody has played the candidates. A bot is not a person: its hit
counts say where it hurts, not how hard it is.

## 1. Diagnosis

### 1.1 Where the hits come from

**Chapter 2, the Citadel depot (base-03).** *Played (hardware)*: 18 of 20 hits were bolts; from 105 s on, the two drones
held 6.0 m off and hit him about once a second until both clovers were gone (`ch2.log`). *Automated runtime only*: the
same bot ported to game time, every hit tagged by its real source (`tests/lib/fightlog.js`): every hit in every chapter 2 run was a drone's bolt (65 of 65, Modern and Classic, both bots, every variant). Walked from the save's start as on the hardware, one run of three met the same streak: one drone hit him 14 times in 34 s, mostly 2.3–2.5 s apart, while the bot's ball missed it.

**Chapter 3, the Zeelich depot (base-05).** *Played (hardware)* `zdepot.log` gives the Grobo guard 10 of 17 hits, but
its tag is "the nearest enemy" when no bolt was within 3 m at the last sample. Read by the damage of each hit instead
(baton 2, the guard's rifle 0.5, a drone's bolt 1, the dog 1 with the dog 12–29 m away): **2–3 baton blows (4–6 life),
2 rifle bolts (1 life) and 11–12 drone bolts (11–12 life)**. So on the hardware run too, the drones did most of the
damage. *Automated runtime only*: with fight68's rules the hits split three ways — over 15 runs drone bolts 48, the Grobo's rifle 31, his baton 27 (each blow 2 life: 54 of the 115 life lost, about half); with the reader, the baton and the dog's bite take over in its long runs.

Two things the bot does that a person may not (both from fight68, kept in the "fight68" profile so the numbers compare):
- it never dodges a bolt, and it stands still to throw: every bolt aimed at a standing target hits (below);
- it dodges a guard's baton by a fixed table, 0.55 s into the wind-up (fight68 `TELL.guardG`). The Zeelich guard's
  wind-up has been 0.9 s since v162 (`ZGUARD_TUNE`), so the bot's dodge (pressed at 0.43 s, invulnerable to 0.70 s) is over 0.3 s before the blow lands (1.02 s). The test
  harness has the same old table (`tests/lib/player.js P.meleeThreat`). Part of the "10 guard hits" is this.

A second profile, "reader", plays as a person who reads the tells: it sidesteps a bolt it has seen for 0.3 s, dodges a
baton from the guard's own wind-up, steps behind cover within 4 m while a shooter aims at it, charges the ball against
the armoured guard only outside his reach (1.9 m) or in his opening, and searches a container for a heart at 40 % life.
Its first two versions had faults (it watched only the nearest enemy's wind-up; it backed off the Grobo forever); only
its third version's runs are reported. It still stalls against the Grobo in some runs (the 300 s cap): read its Zeelich
numbers with care.

### 1.2 The drones' bolt (Source, measured where marked)

| | Today (every drone in the game) |
|---|---|
| Wind-up (the tell) | 0.75 s × difficulty (`enemies.js`) |
| Rest after a shot | 1.6 s × difficulty: one bolt per drone every **2.35 s**; measured 2.3–2.5 s between one drone's hits (automated) |
| Two drones | the attack director lets two shooters aim 0.7 s apart (`COMBAT.stagger`): a bolt every ~1.2 s, as on the hardware run |
| Range | it keeps 3.5–6 m off and fires inside 8 m with line of sight; never through a fence (COMBAT-2) |
| The bolt | 9 m/s straight at where he stands when it fires, 1 damage; 0.67 s to cover 6 m; hits within 0.55 m of him |
| Accuracy at 6 m | a standing or throwing Twinsen: every bolt hits (no spread, no lead); walking across its line at Normal's 2.0 m/s from the moment it fires: 1.3 m off by arrival, a miss |
| The tell, seen | a red aim line **1.6–1.8 px wide** at 1366×768 from the play camera (11.5 m), 0.63 opacity at 80 % of the wind-up (*automated*, `captures/fights58/sheet.png`); the arms raise; a 7–10 cm spark under the drone; the eye brightens |
| The tell, heard | `zap` as the wind-up starts — **the same sound as the shot itself**, so the ear can't tell "aiming" from "fired" |
| Cover | the yards have it: the Citadel yard's 2 m crate stack beside the valve, the Zeelich yard's containers and shed; a crate stack under 1.6 m is seen over |

A person can dodge a bolt (the dodge's invulnerable hop, or walking across its line during the wind-up), but only if
they notice the wind-up; at the play camera the line is one to two pixels of pale red over the yard's brown or grey.

### 1.3 The guards (Source)

| | Citadel depot Quetch | Zeelich depot Grobo (v162 `ZGUARD_TUNE`) | Later Grobo / FunFrock trooper |
|---|---|---|---|
| Armour, life | 1, 3 | 2, 5 (a charged throw at magic level 1) | 2, 5 |
| Baton | 1 a hit, wind-up 0.55 s | **2 a hit (kept)**, wind-up 0.9 s with a bark, reach 1.3 m | 2, wind-up 0.55 s |
| After the baton | 0.9 s baton down, next wind-up 1.2 s after | same | same |
| Rifle | 0.8 s tell, 1 a bolt, 0–8 m | 1.0 s tell, 0.5 a bolt, 3–6.5 m | 0.8 s, 1, 0–8 m |

The baton knocks Twinsen down: 0.5 s down and 0.8 s getting up (`hero.damage`, heavy). The guard's next blow lands
2.4 s after the last (measured: 16.6, 19.0, 21.4, 23.9, 26.3 s in one automated run): **after getting up he has about 1.1
s**, and a charged throw takes 0.75 s held with no dodge possible while held. So a player hit once is often hit again and
again; the counter he is told to use (the armour hint: "a charged throw") barely fits.

### 1.4 Healing (Source)

- **Citadel depot:** none in or near the yard (no container that gives within 30 m: `containers.js`); only what a beaten
  enemy drops (LBA's one bonus each). He arrives with 10 life, 2 clovers (base-03).
- **Zeelich depot:** two searchable barrel givers in the yard (`z-depot-barrels`, `z-yard-barrels`: a heart when he is
  hurt), and the drops. He arrives with 11 life, 2 clovers (base-05).

### 1.5 The curve (Source; the hero from the campaign fixtures)

| Fight | Enemies | Drone timing | Hero (fixture) | Ball on a drone |
|---|---|---|---|---|
| Ch 2 Citadel depot | 2 drones (3 life), Quetch, dog | 0.75 + 1.6 s | 10 life, magic 1 | 3 throws each |
| Ch 3 Zeelich depot | 2 drones (2 life), soft Grobo, dog | 0.75 + 1.6 s | 11 life, magic 1 | 2 throws |
| Ch 4 dig post | 2 drones, Quetch, dog (a stealth watch) | 0.75 + 1.6 s | 10, magic 1 | 3 |
| Ch 5 condenser A | 2 drones, Quetch, FunFrock trooper | 0.75 + 1.6 s | 10–11, magic 2 | 2 (1 charged) |
| Ch 8 crowd-control yard | 2 drones, Quetch, FunFrock trooper, dog | 0.75 + 1.6 s | 10, magic 3 | 1 |
| Ch 7, 14, 15 | the hauler (8 life), the bore's drones, the shell's drone | 0.75 + 1.6 s | 12, magic 3–4 | 1 |

The drone is the same in every fight, so **the first fights are the hardest drone fights relative to the hero**: at magic
level 1 a drone lives three throws (two at Zeelich), at level 3 one. The bolts he takes grow with how long the drones
live. The curve should rise from the first fight; today it falls. *Automated*: the bot in chapter 8's yard (STAGED next
to it): the same run in chapter 8's yard (base-11, STAGED beside it) did not boot in time (Playwright's 300 s timeout, once): **Blocked**, so the later fights are compared from the source only.

## 2. The candidates (`?fight58=a|b|c`, several: `?fight58=a,c`; off by default)

All in `src/game/fight58.js`. Without the switch the game is as before (defaults equal today's numbers; the suites below).

- **a — a tell that reads, and slower drones in the first two fights.** Every drone's and every guard's aim line ×3 wide
  (1.6–1.8 → 5.0–5.4 px at the play camera) ending at full opacity (was 0.75): *game-wide* (all drones and guards, every
  chapter; the line was the fault). In the Citadel and Zeelich depots only, the drones' wind-up 0.75 → 1.1 s and their rest
  1.6 → 2.6 s (a bolt per drone every 3.7 s, was 2.35 s: −36 %). Later fights keep 0.75 + 1.6, so the curve rises.
- **b — cover and a heart.** A 2 m stack of two crates side by side in each yard: in the Citadel yard between the drones'
  loop and the valve (design 14.6, 51.9–52.9), in the Zeelich yard between the drones' east-half beat and the guard's way to
  the locker (16.0, 16.6–17.6); both clear of every round by 1 m or more. The Citadel depot's barrels on the public path
  (before the yellow line) become a heart giver (LBA2's, once a visit). Visible change: two new crate stacks.
- **c — the Zeelich Grobo's pause.** After a baton strike (hit or miss) he holds the baton down 1.7 s (was 0.9) and starts
  the next wind-up 2.2 s after it (was 1.2): about 2.1 s after Twinsen is up again, room for a charged throw back. The hit
  stays 2. Only this guard (`ZGUARD_TUNE`); every other guard keeps 0.9 / 1.2.

## 3. The numbers (automated runtime only, SwiftShader; a bot, 3 runs each unless marked)

Modern controls. "fight68": the hardware bot's rules; "reader": the person-like profile (1.1). Hits, life lost and clovers
per run; time is from the fight's start to the valve turned / the yard cleared and the locker reached (game seconds).
Chapter 2 is STAGED outside the depot's east gate (the walk from the save's start is not the fight); the Zeelich depot
STAGED at the gate as fight68 and `tests/depot.mjs` do.

### 3.1 The drill: one side of the fight against a Twinsen who stands still (no bot)

STAGED: he is put in the yard (by the valve; in the middle of the Zeelich yard) and the watch is set on him. Drones alone,
40 s: every bolt that reaches him counted, his life restored, no knock-back. The Zeelich Grobo alone, 40 s: each blow lands
for real (knocked down, up again), his life restored. One run each; the game's own AI, game time.

| | Today | a | c |
|---|---|---|---|
| Ch 2 depot: drones' wind-up (s) | 0.73–0.77 | 1.10 | (as today) |
| Ch 2 depot: bolts that hit a still Twinsen, per minute | **48** (32 of 33 fired) | **31.5** (21 of 21) | (as today) |
| Ch 2 depot: time between bolts, two drones (s) | 1.21 | 1.86 | (as today) |
| Zeelich depot: drones' wind-up (s) | 0.73–0.77 | 1.10 | 0.73–0.77 |
| Zeelich depot: bolts that hit, per minute | **49.5** (33 of 34) | **33** (22 of 22) | 49.5 |
| Zeelich depot: time between bolts (s) | 1.17 | 1.80 | 1.17 |
| Zeelich Grobo: baton blows per minute on a still Twinsen | **22.5** | 22.5 | **16.5** |
| Zeelich Grobo: from getting up to the next blow (s) | **1.09–1.18** | 1.09–1.18 | **2.10–2.17** |

(a) cuts the drones' bolts by a third and gives 0.35 s more to see each one coming; (c) nearly doubles the time to answer
the Grobo after a blow. A charged throw takes 0.75 s held: today it does not fit after getting up and stepping out of his
reach; with (c) it does. Neither changes a hit's damage.

### 3.2 The bot (fight68 and reader)

"ch2" is the chapter 2 (Citadel) depot, "zdepot" the Zeelich depot. Modern controls, and Classic for today and (a).
"Hits by source" adds all runs. Chapter 2 STAGED outside the depot's east
gate unless "walked" (from base-03's own start, as on the hardware: the walk itself is not counted). The Zeelich depot
STAGED at its gate as fight68 and `tests/depot.mjs` do. Fight time: game seconds with an enemy on him; 300 s and more is
the bot stalling (it could not finish an enemy), not the fight. Run k of every set starts the same way (the same
wait before the bot starts; the walked runs of today came out hit for hit the same when repeated), so the sets compare
run by run.

| Fight | Controls | Bot | Variant | Runs | Hits per run | Life lost | Clovers spent | Died | Fight time (s) | Hits by source (all runs) |
|---|---|---|---|---|---|---|---|---|---|---|
| ch2 | classic | fight68 | today | 2 | 5, 5 | 5, 5 | 0, 0 | 0 | 451, 14 | drone bolt 10 |
| ch2 | classic | fight68 | a | 2 | 3, 3 | 3, 3 | 0, 0 | 0 | 451, 451 | drone bolt 6 |
| ch2 | modern | fight68 | today | 3 | 2, 5, 0 | 2, 5, 0 | 0, 0, 0 | 0 | 11, 15, 10 | drone bolt 7 |
| ch2 | modern | fight68 | a | 3 | 1, 1, 0 | 1, 1, 0 | 0, 0, 0 | 0 | 11, 11, 11 | drone bolt 2 |
| ch2 | modern | fight68 | b | 3 | 5, 2, 0 | 5, 2, 0 | 0, 0, 0 | 0 | 15, 11, 10 | drone bolt 7 |
| ch2 | modern | reader | today | 3 | 2, 2, 0 | 2, 2, 0 | 0, 0, 0 | 0 | 11, 11, 10 | drone bolt 4 |
| ch2 | modern | reader | a | 3 | 1, 1, 0 | 1, 1, 0 | 0, 0, 0 | 0 | 11, 11, 11 | drone bolt 2 |
| ch2 | modern | reader | b | 3 | 2, 2, 0 | 2, 2, 0 | 0, 0, 0 | 0 | 11, 11, 11 | drone bolt 4 |
| ch2 walked | modern | fight68 | today | 3 | 14, 2, 2 | 14, 2, 2 | 1, 0, 0 | 0 | 38, 14, 11 | drone bolt 18 |
| ch2 walked | modern | fight68 | a | 3 | 2, 1, 2 | 2, 1, 2 | 0, 0, 0 | 0 | 13, 17, 12 | drone bolt 5 |
| zdepot | classic | fight68 | today | 2 | 3, 5 | 2.5, 4 | 0, 0 | 0 | 10, 15 | drone bolt 5, Grobo rifle 3 |
| zdepot | modern | fight68 | today | 3 | 9, 3, 13 | 11, 2.5, 11.5 | 1, 0, 1 | 0 | 71, 9, 36 | drone bolt 13, Grobo rifle 7, Grobo baton 5 |
| zdepot | modern | fight68 | a | 3 | 8, 1, 13 | 11, 0.5, 12.5 | 1, 0, 1 | 0 | 45, 8, 40 | drone bolt 9, Grobo rifle 7, Grobo baton 6 |
| zdepot | modern | fight68 | b | 3 | 3, 7, 1 | 3, 6, 1 | 0, 0, 0 | 0 | 9, 16, 5 | drone bolt 8, Grobo rifle 2, dog 1 |
| zdepot | modern | fight68 | c | 3 | 9, 4, 12 | 13, 3, 11.5 | 1, 0, 1 | 0 | 48, 12, 34 | drone bolt 11, Grobo rifle 7, Grobo baton 7 |
| zdepot | modern | fight68 | a,c | 3 | 9, 5, 10 | 13, 3.5, 12 | 1, 0, 1 | 0 | 48, 12, 26 | Grobo baton 9, Grobo rifle 8, drone bolt 7 |
| zdepot | modern | reader | today | 3 | 1, 25, 11 | 0.5, 33, 19 | 0, 2, 1 | 1 | 362, 60, 72 | Grobo baton 19, dog 8, drone bolt 7, Grobo rifle 3 |
| zdepot | modern | reader | a | 3 | 1, 21, 6 | 0.5, 22, 6 | 0, 2, 0 | 0 | 9, 361, 361 | dog 15, drone bolt 6, Grobo rifle 4, Grobo baton 3 |
| zdepot | modern | reader | c | 3 | 3, 4, 7 | 1.5, 4, 11 | 0, 0, 1 | 0 | 362, 29, 35 | Grobo baton 5, Grobo rifle 4, drone bolt 4, dog 1 |
| zdepot | modern | reader | a,c | 3 | 1, 15, 13 | 0.5, 14, 12 | 0, 1, 1 | 0 | 362, 360, 60 | dog 14, drone bolt 11, Grobo rifle 4 |

What the bot shows, with three runs a set (the spread inside a set is as wide as between sets):
- **Chapter 2** STAGED is short for this bot (10–15 s, 0–5 hits, never a clover), unlike the hardware run (150 s, both
  clovers). Walked from the save, one run in three met the streak the hardware run met (one drone hit him 14 times; a
  clover). The hits are always drone bolts; (a) gives the fewest in every chapter 2 set (Modern 2 and 2 against 7 and 4,
  walked 18 hits against 5: the run with the streak, 14 hits and a clover today, was 2 hits and no clover with (a)).
- **The Zeelich depot**, fight68: a clover in two runs of three in every variant but (b) (none); the baton's share does not fall
  with (c), because fight68 dodges too early and charges its throw beside the guard (no dodge while charging), whatever
  his pause. The reader, which dodges on time and charges in his opening: baton blows 19 today, 5 with (c), 3 with (a)
  (a does not touch him: noise), 0 with (a, c); life lost 52.5 today (one run dead after both clovers) against 16.5 with (c) over three runs each.
- **(b)** with fight68 at Zeelich: 3, 7, 1 hits and no baton blow in three runs; neither bot uses the new crates on
  purpose (the reader steps behind whatever cover is near, the yard's old containers too), so the change in the
  fight's course is not explained: three runs, read it as unproven.
- **Classic** (fight68 rules turned to arrows): chapter 2 today 5 and 5 hits, (a) 3 and 3; the Classic bot stalls in
  chapter 2 (450 s, the valve not reached) in three of four runs, and the Zeelich depot today 3 and 5 hits. No
  Classic-only cause seen: the hits are drone bolts there too.


## 4. Recommendation

**Take (a) and (c) together; leave (b) out, or keep only its heart.**

- **(a)** removes the cause the hardware run and the drill agree on: two drones putting a bolt every 1.2 s into a
  Twinsen who stands to throw, behind a 1.6 px tell whose sound is the shot's own. With (a) it is a bolt every 1.8–1.9 s
  behind a 5 px line and a 1.1 s wind-up. The fights stay fights: the same enemies, life, damage and aim; a standing
  Twinsen is still hit by every bolt. Later drone fights keep today's timing, so the curve rises again: from chapter 4 the
  faster rate, from chapter 5 more enemies (a FunFrock trooper) as the hero's ball grows. The thicker line is game-wide: every drone's and guard's
  tell, in every chapter (the readability fault was everywhere).
- **(c)** turns the Grobo's "hit, get up, hit" into "hit, get up, answer": the counter the armour hint tells him to use
  (a charged throw) fits after a blow. The blow stays 2 (the user's pick). Only this guard; the FunFrock troopers and
  Grobos of later chapters keep 0.9 / 1.2 s.
- **(b)** is not needed for the cause: both yards already have cover that stops a drone's line (the Citadel yard's 2 m
  crate stack by the valve, the Zeelich yard's two containers and shed), the bots do not show a clear gain, and it adds
  two visible crate stacks. Its one part that answers a real gap is the heart: the Citadel depot has no healing at all
  near it (the Zeelich yard has two barrel givers). If the user wants it, the barrels' heart can go in alone.

Turning on (a, c) by default is a small change in `fight58.js` (the switch's default), after the user's pick.

## 5. Unchanged with the switches off

Automated runtime only (SwiftShader), the working tree with no `?fight58`, each suite once:

| Suite | Covers | Result |
|---|---|---|
| `tests/combat.mjs` | the drones and guards in the arena (the shared `DRONE_TUNE` / `GUARD_TUNE` defaults) | 84/84 PASS |
| `tests/depot-watch.mjs` | the chapter 2 depot's watch (chapter1.js defs, island.js) | 12/12 PASS |
| `tests/depot.mjs` | the Zeelich depot (chapter2.js defs, the Grobo's `ZGUARD_TUNE`, zeelich.js) | 29/29 + 1 visual PASS |

Off, every number equals the old one (`DRONE_TUNE` 0.75 / 1.6, line ×1 to 0.75; `GUARD_TUNE.recover` 0.9, `strikeCool`
1.2), no crate and no giver is built, and the depots' defs carry no tune: the game is as before. Saves are untouched
(format 6: nothing new is saved).

## 6. Files

- `src/game/fight58.js` (new): the switch and the candidates' numbers.
- `src/game/enemies.js` (Drone: `def.tune`, `DRONE_TUNE`), `src/game/guards.js` (`GUARD_TUNE.recover`, `strikeCool`,
  the line), `src/game/story/chapter1.js`, `chapter2.js` (the depots' defs), `src/game/island.js`, `src/game/zeelich.js`
  (b's crates and giver).
- `tests/fight58.mjs`, `tests/lib/fight58bot.js`: the measuring bot (a run, not a pass/fail suite).
- `captures/fights58/sheet.png`: the tell today against a and b, from the play camera.

## 7. Questions for the user

1. Turn on (a) and (c) by default? (Visible: the aim lines of every drone and guard are thicker and brighter, in every
   chapter.)
2. (b): leave it out, take only the heart in the Citadel depot's barrels, or take the crates too?
3. The drone's wind-up and its shot make the same `zap`. Should the wind-up get a sound of its own (a rising charge),
   so a player who hears it knows to move? Not built.
4. Would the local agent play (a, c) on the PC with the same ORDER-71 run (`?fight58=a,c`), for a number from hardware?

## תקציר בעברית

- **מה גורם לזה:** בשני הקרבות הראשונים רוב הפגיעות באות מהיריות של שני הרחפנים. שני רחפנים יחד יורים פעם ב-1.2
  שניות, וכל ירייה פוגעת בטווינסן כשהוא עומד או זורק את הכדור. האזהרה לפני הירייה היא קו אדום ברוחב 1.6–1.8 פיקסלים
  בלבד במסך 1366×768, והצליל של ההכנה זהה לצליל הירייה. אותו רחפן מופיע בכל קרבות המשחק, אבל בפרקים 2–3 הכדור עוד חלש,
  ולכן שם הרחפנים חיים הכי הרבה זמן: העקומה יורדת במקום לעלות.
- **השומר הגרובו בזיליץ':** אחרי מכת אלה (2, כמו שבחרת) טווינסן קם ויש לו רק כשנייה אחת עד המכה הבאה, קצר מדי לזריקה
  טעונה. חלק מ"10 הפגיעות של השומר" בריצה על המחשב הן בעצם יריות רחפנים, וחלק נובעות מהבוט שמתחמק מוקדם מדי.
- **שלוש הצעות (מאחורי מתג, כבויות כברירת מחדל):**
  - **א** – קו האזהרה עבה פי 3 ובהיר (לכל הרחפנים והשומרים במשחק), ובשני הקרבות הראשונים בלבד הרחפנים מכוונים 1.1
    שניות במקום 0.75 ונחים יותר: 31–33 פגיעות לדקה במקום 48–50 למי שעומד במקום.
  - **ב** – ערימת ארגזים גבוהה למחסה בכל חצר, וחביות על השביל במחסן בסיטדל שנותנות לב בחיפוש.
  - **ג** – השומר בזיליץ' ממתין אחרי מכה: כ-2.1 שניות מהקימה עד המכה הבאה (היה כ-1.1). המכה נשארת 2.
- **המלצה:** א + ג. את ב לא צריך (בחצרות כבר יש מחסה), אפשר לקחת ממנו רק את הלב בחביות של סיטדל.
- **תמונה:** `lba3/captures/fights58/sheet.png` – האזהרה היום מול א, והארגזים של ב.
- כל המספרים מבוט אוטומטי (SwiftShader), לא ממשחק של אדם.
