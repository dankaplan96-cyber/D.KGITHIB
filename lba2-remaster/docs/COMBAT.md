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
- **Aim and targeting:** aiming follows the lock, then the mouse cursor (projected onto the plane at Twinsen's
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
| Heavy drone (ch. 7), Guardian (ch. 12) | mechanical bosses | existing | existing | existing |

All enemies give up and go home beyond a pursuit limit.

## Tools
- **Sword** (Chapter 6, from Yorna when the lift is ready). First use: cutting the platform's frozen mooring
  rope (fists can't). Then the ice mites.
- **Pulse tool** (Chapter 10, from Baldino). Jams machines in a 4.8 m cone: drones are stunned for 2.6 s and
  sentries lose their shield for 3.2 s. It also stalls the north mill (an alternative to the ball on the
  brake). It does nothing to living creatures and takes 5 s to recharge (shown on the weapon badge).

## Encounters using the systems
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

Not verified: feel with a real gamepad and touch screen, audio balance by ear, real-GPU frame rate.
