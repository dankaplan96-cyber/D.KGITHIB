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

## Evidence

(filled in below as run)
