# Combat

The tunable numbers all live in `src/game/combat.js` (`COMBAT`, `MOVES`). The ball's flight rules sit at the
top of `MagicBall` in `src/game/actors.js`. Enemies are in `src/game/enemies.js`.

## Controls (defaults; rebindable in Controls)
| Action | Keyboard / mouse | Gamepad |
|---|---|---|
| Attack with the weapon in hand (hold: charge the ball / heavy sword strike) | Left click, K | X |
| Throw the ball (hold: charge); press again while it flies: recall | F | Y |
| Dodge | Shift | B |
| Focus target (toggle or hold, see Settings) | Right click, L | RB |
| Next target | Mouse wheel, T | R3 |
| Swap to the last weapon | R | LB |
| Weapon wheel (the world slows) | hold X | hold RT |
| Talk / use | E | A (when something is in reach) |
| Behaviour action (jump, hide, attack in Aggressive, talk in Normal) | Space | A |
| Aim | the cursor | the left stick |

Touch adds attack, dodge and swap buttons next to the existing ones. You never have to change behaviour to
fight; Aggressive mode's Space still attacks with the same moves.

## Rules
- **Input buffer:** one press, kept 0.22 s. A combo continues when the next press lands in the second half of
  the recovery. Mashing during a startup does not queue a chain. Presses during dialogue, menus and
  transitions are dropped.
- **Melee:** each move has startup, active and recovery frames. Damage lands only in the active frames, along
  the swept arc of the strike, once per target per move. Hits never reach through walls (line of sight).
  During startup Twinsen turns toward the intended target at a capped rate, but not toward targets behind
  him. His forward step stops short of the target and goes through collision.
- **Sword:** three strikes. The first two are horizontal sweeps (2 damage); the third is an overhead blow
  (3 damage, staggers). Holding attack through the first strike winds up a heavy blow, released by letting go
  (4 damage). It breaks guards.
- **Fists** (before the sword): jab, jab, kick.
- **Dodge:** a 0.36 s hop of about 2.5 m in the stick's direction, or a backstep with no direction. It is
  invulnerable from 0.04 to 0.27 s, with a 0.28 s cooldown. It cancels late recovery, never a startup or
  active frames.
- **Ball:** states are idle → in hand → fly → impact → return. Movement is substepped (≤ 12 cm per step), so the
  ball never tunnels at low frame rates.
  - As in LBA2: every throw costs 1 magic. With magic it bounces 4 times and returns on the 5th contact;
    without magic it returns at its first contact. A ground bounce restarts the arc from the throw's lift;
    walls reflect it. Water returns it. It returns at about 10 m/s, speeding up (+22 m/s²) so a far miss comes
    back quickly.
  - Its colour shows the magic level: yellow, green, red, and at level 4 the fire ball.
  - It brings back a bonus it touches (coins, hearts, flasks, clovers, keys, crystals).
  - Damage: the magic level (at least 1), +1 when charged (LBA2: 10/20/30/40 by level).
  - Each target is hit once per throw. A quick throw returns after its first hit. A charged throw ricochets on
    to the next visible enemy within 8 m.
  - The return never damages. Recall works after 0.2 s.
  - It can't be lost: a 3.2 s flight limit, a 2.5 s return limit, and a reset on every scene change.
  - A full charge needs magic (the throw's 1 point) and shows a short dotted arc while held. Magic
    regenerates slowly (ours; the original refills only from flasks and givers).
- **Classic controls (LBA2's keys, default):** Twinsen aims the way he faces; holding the ball key (Alt)
  plants his feet and ←/→ turn him; the release throws. No mouse aim in Classic.
- **Aim and targeting (Modern):** aiming follows the lock, then the mouse cursor (projected onto the plane at Twinsen's
  chest height), then the stick, then the facing. Soft targeting uses a cone set in Settings (Off / Low /
  Normal / High) and needs line of sight. Lock-on lets go at once of a dead or absent target, at 17 m, or
  after 1.5 s out of sight. A small chevron marks the target. A slim health bar shows only for the locked or
  recently hit enemy.
  - The mouse stays the aim while the cursor is over the game and mouse + keyboard is the device in use: a
    still cursor never times out. Only a stick or touch, leaving the canvas, or a menu changes that. While the
    mouse aims, walking never redirects a throw (a cursor on Twinsen himself keeps the last mouse aim).
  - Right mouse: a short tap (under 180 ms, no drag) or a still hold focuses; a drag turns the camera and
    never toggles the lock.
  - Aim Assist Off: no soft target, no throw or melee correction; only a deliberate lock aims for you.
  - The chevron shows the target a throw would use right now (an enemy, a switch, the target); the dotted
    preview and the launch use the same target.
- **Throw animation:** standing, the planted full-body throw; on the move, an upper-body layer over the walk
  (the legs step sideways or backwards while aiming). The controls are free again at 0.36 s; the follow-through
  runs on to ~0.62 s on the layer and blends into the walk or idle. The ball leaves the hand at 0.16 s on the
  same clock as the pose. Charging allows a slow aimed walk (×0.42).
- **Attack director:** at most 2 enemies may be winding up or attacking at once (Gentle 1, Hard 3). Enemies
  can't start an attack for 1.2 s after a scene change (0.6 s after dialogue).
- **Difficulty** changes damage taken (×0.5 / 1 / 1.5), wind-up length (×1.3 / 1 / 0.85) and cooldowns,
  never enemy health.
- **Hit-stop:** 45 ms on a hit, 85 ms on a heavy hit (actors only; input is still read). Camera shake follows
  the existing Shake setting.

## Enemy roles
| Enemy | Role | Tell | Opening | Hit reaction |
|---|---|---|---|---|
| Crystal mite | cautious close-range | rears up, crystals flare (0.5 s) | sits low for 0.6 s after the lunge | always staggers |
| Warden drone | ranged, mechanical | prongs crackle, a red aim line brightens (0.75 s); needs a clear shot | cooldown after firing | staggers, but steadies after two staggers in 2 s; the pulse stuns it |
| Sentry automaton | protected | pulls its shield back, red eye (0.7 s) | shield down for 1.1 s after its bash | blocks frontal ball and sword (clang); heavy strike, charged ball or pulse breaks the guard |
| Crystal crawler | heavy, controls space | rears, a ring spreads on the ground (1 s) | 1.3 s after the slam | only heavy hits stagger it; dodge or leave the ring (being airborne also avoids it) |
| FunFrock's old trooper (LBA1's fat clone soldier, bodies 18–20; kind `fclone`) | ranged + close, reactivated by the project | as Vesk's guards: the rifle comes up with the violet aim line (0.8 s); close in, the arm goes up | as the guards | the Grobo guard's rules: armour 2 (a magic-level-1 ball needs a charge, or a heavy strike), 5 HP, two hit reactions; beaten: falls, leaves one bonus |
| Guard dog (LBA2's Zeelich guard dog, bodies 51–53) | fast melee, works with the guards | stops and barks (the jaw drops; its group is alerted), then close in: crouches with the jaw wide open and growls (0.5 s) | stands panting for 0.9 s after the bite | 3 HP, no armour; notices a running Twinsen close by even out of sight; a hit makes it yelp and skid back; knocked out: rolls over, leaves one bonus; the pulse stuns it; gives up beyond its leash |
| Vesk's guard (Quetch / Grobo) | ranged + close, people in his uniform | the stun rifle comes up and a violet aim line brightens (0.8 s); close in, the baton goes up (0.55 s) | rifle lowered for 0.9 s after a shot or a swing | LBA1's rules: armour (Quetch 1, Grobo 2) — a hit weaker than the armour is braced against, no harm; two hit reactions at random (stagger, half-turn); beaten: falls, leaves one bonus. The pulse jams the rifle, not the guard |
| Heavy drone (ch. 7), Guardian (ch. 12) | mechanical bosses | existing | existing | existing |

All enemies give up and go home beyond a pursuit limit.

## Tools
- **Sword** (Chapter 6, from Yorna when the lift is ready). First use: cutting the platform's frozen mooring
  rope (fists can't). Then the ice mites.
- **Pulse tool** (Chapter 10, from Baldino). Jams machines in a 4.8 m cone: drones are stunned for 2.6 s and
  sentries lose their shield for 3.2 s. It also stalls the north mill (an alternative to the ball on the
  brake). It does nothing to living creatures and takes 5 s to recharge (shown on the weapon badge).

## The arsenal (WPN-1; src/game/weapons.js, gadgets.js, story/arsenal.js)
LBA2's other weapons and gadgets, in our style: the models are built in code, the sounds synthesised, the numbers
and descriptions LBA2's where it had them (three darts and a meca-penguin cost 4 kashes; the penguin is set down
"in a level and unencumbered area" and goes off "a few seconds later"; the pistol needed a crystal; the glove threw
fireballs back; the tunic's shielding spell cost magic and was used from the inventory). Weapons go on the wheel's
diagonals (hold X / G / RT; up-right blowgun, down-right laser, down-left glove, up-left lightning) and fire with
the attack key; gadgets are used from the inventory (select, E). Owned items, darts, laser charge and penguins
are saved with the hero (`hero.arms`, save format 4; older saves migrate to an empty arsenal).

| Weapon / gadget | Where (chapter) | Cost | Numbers | Use |
|---|---|---|---|---|
| Blowgun | Pippa's stall, Citadel (2) | 15 (with 6 darts) | 1 dmg, 24 m/s, 17 m, 0.55 s between darts | cheap ranged chip damage; a Grobo's armour (2) stops it |
| Darts | Pippa, Nara (2/3); the cellar's gap in the foundations (6) | 3 for 4 | max 30 | blowgun ammunition |
| Blowtron | Nara's case, Zeelich (6) | 35 | 2 dmg, 30 m/s, 20 m, 0.27 s | the blowgun upgraded (Mosquibee work) |
| Esmer laser pistol | Nara's case, Zeelich (3) | 30 (with a cell) | 2 dmg, 3 to machines, 52 m/s, 26 m, 0.5 s; a cell = 5 shots (max 20), else 2 magic a shot | drones and sentries' bodies at range |
| Wannie glove | the old Wannie mine on Under Celebration, beside the gas works, with the lantern lit (4, shuttle) | — | two punches: 2 dmg, poise 3/4, knock-back 11/14 m/s, the second breaks guards | throws enemies back, sends their bolts back (2 dmg to whoever they meet), breaks the boards over the cellar's coal chute (a clover, 12 kashes) |
| Lightning | Bersimon, with Rector Hougo's pearl of incandescence (4) | 3 magic | 2 dmg to the target, then 1 to up to two more within 5.5 m; counts as a charged hit | crowds; breaks a sentry's guard |
| Protection | Ker'aooc, School of Magic (4) | 20 kashes; 3 magic a cast | 15 s, damage taken ×0.5 | before a hard fight |
| Meca-penguin | Pippa, Nara (2/3) | 4 each, max 5 | walks 7 s at 1.3 m/s; lures enemies within 11 m that can see it; 2 hits wreck it; pops for 2 within 2.2 m | a decoy, then a small bang |
| Arthur's conch | Arthur lends it, at home (2) | — | 4 s between calls; dogs within 14 m cower 3 s; people within 16 m look; the Dino-Fly (Citadel, 70 m) answers | calls off guard dogs; the Dino-Fly answers (he can't fly any more: no flight) |
| Lantern | Pippa (2) | 10 | a warm light (8 m) from the light pool | shows the dark places: the gap in the cellar's foundations, the Wannie mine, the galleries' hollow boulder (11: a clover) |

No jetpack: the story bible keeps flight out of this game (the Dino-Fly is too old to fly; the islands' edges, the
cliffs' puzzle and the chapters' routes are built on walking and jumping), and a jetpack confined to marked zones
would add a tool no chapter uses.

Balance: nothing on the main path needs the arsenal. The blowgun (chapter 2) hits for 1 and is stopped by a Grobo's
armour; the harder hitters arrive later and cost kashes or magic (the laser at chapter 3 for 30 kashes, the glove and
the lightning from chapter 4, the Blowtron from chapter 6). The chapter fights are unchanged.

## Encounters using the systems
- Vesk's guards, beside the drones: ch. 1 depot (Quetch), ch. 2 Zeelich depot (Grobo), ch. 4 post (Quetch),
  ch. 5 condenser hall (Quetch), ch. 8 crowd-control yard (Quetch + Grobo), ch. 10 at the bore (Grobo); two in the
  training arena.
- FunFrock's old troopers (LBA1): ch. 5 in his buried condenser hall, ch. 8 crowd-control yard, ch. 10 at the bore;
  one in the training arena.
- Guard dogs, trotting the guards' loops: ch. 1 depot, ch. 2 Zeelich depot, ch. 4 post, ch. 8 crowd-control yard;
  one in the training arena. The yard on Zeelich trains them (those bark from behind the palisade).
- LBA1's rooms (open in every chapter): FunFrock's asylum on Citadel, after the prologue: Quetch and Grobo guards
  at the original nurses' spots, a fat trooper at the clone's, two guard dogs; the Temple of Bù's dark halls: six
  crystal mites.
- Ch. 4 dig: mites in the trench.
- Ch. 5 valve hall: drones among cover.
- Ch. 6 lift: the rope, then three cautious mites.
- Ch. 7 glacier: the heavy drone.
- Ch. 10 Desert Island: a lone sentry at the post gate, then three drones at the bore.
- Ch. 10 Hamalayi ridge: a lone crystal crawler, then two mites by the dome.
- Ch. 9 archive: avoidance (stealth).

## Verification
`tests/combat.mjs` runs in the developer arena (`?arena`). Its 22 checks currently pass (headless, software GL):
- active-frame timing and one hit per swing;
- combo buffering and mashing limits;
- walls blocking melee and targeting;
- dodge invulnerability and frame-rate consistency (30 vs 60 fps);
- the ball at 15 fps through a thin wall;
- recall, and the ball being reset on a scene change;
- no attack firing after dialogue;
- lock-on and release;
- the sentry's block and guard break;
- the crawler's slam and a dodge through it;
- the ball switch;
- weapon save/load.

`tests/arsenal.mjs` covers the arsenal: each weapon and gadget obtained and used by input, its effect measured,
ammunition and costs, Save & quit → Continue, and a format-3 save's migration.

Not verified: feel with a real gamepad and touch screen, audio balance by ear, real-GPU frame rate.
