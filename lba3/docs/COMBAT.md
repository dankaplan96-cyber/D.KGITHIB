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
- **Dodge:** a 0.36 s hop in the stick's direction, or a backstep with no direction. Its distance is LBA2's by the
  way it goes from his facing (CONTROL-FEEL; docs/LBA2_MEASUREMENTS.md "Jump and dodges"): 2.41 m aside (1.17 H,
  anims 78/79), 2.03 m back and for the backstep (0.98 H, 53), 1.45 m ahead (0.70 H, 52), blended between; it was
  3.1 m every way (3.3 m measured). It is invulnerable from 0.04 to 0.27 s, with a 0.28 s cooldown. It cancels late
  recovery, never a startup or active frames.
- **Ball:** states are idle → in hand → fly → impact → return. Movement is substepped (≤ 12 cm per step), so the
  ball never tunnels at low frame rates.
  - As in LBA2: every throw costs 1 magic. With magic it bounces 4 times and returns on the 5th contact;
    without magic it returns at its first contact. A ground bounce restarts the arc with the behaviour's own Vy
    (LBA2's skips; a throw at a target: from at least 2.5 m/s, as before); walls reflect it. Water returns it. It
    returns at about 10 m/s, speeding up (+22 m/s²) so a far miss comes back quickly.
  - How far and how high: "The ball's throw" below (each behaviour its own LBA2 arc; Modern aims at a point; the
    automatic aim at enemies kept).
  - Its colour shows the magic level: yellow, green, red, and at level 4 the fire ball. Only the story raises the
    level (never a shop): 1 from the ball, then three story moments (docs/lba3-production/MAGIC_LEVELS.md).
  - It brings back a bonus it touches (coins, hearts, flasks, clovers, keys, crystals), except a heart while life
    is full or a flask while magic is full (CONTAINERS: those stay on the ground).
  - Damage: the magic level (at least 1), +1 when charged (LBA2: 10/20/30/40 by level).
  - Each target is hit once per throw. A quick throw returns after its first hit. A charged throw ricochets on
    to the next visible enemy within 8 m.
  - The return never damages. Recall works after 0.2 s.
  - It can't be lost: a 4.2 s flight limit (Discreet's four tall hops take ~3.8 s), a 2.5 s return limit, and a
    reset on every scene change.
  - A full charge needs magic (the throw's 1 point). While charging, dots follow the whole first arc and a small ring
    marks where it will first touch down (the same plan the throw uses). Magic does not regenerate (as the
    original, the user 5.11): it refills only from flasks (crates, enemies, shops) and givers (the wizard, Bersimon).
- **Classic controls (LBA2's keys, default):** Twinsen aims the way he faces; holding the ball key (Alt)
  plants his feet and ←/→ turn him (90°/s, as LBA2 turns him while aiming); the release throws. No mouse aim in
  Classic. The tank controls themselves: "Movement and camera" below.
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
  same clock as the pose. Charging allows a slow aimed walk (×0.42). How each move is posed: "Twinsen's combat animation" below.
- **Attack director:** at most 2 enemies may be winding up or attacking at once (Gentle 1, Hard 3). Enemies
  can't start an attack for 1.2 s after a scene change (0.6 s after dialogue).
- **Difficulty** changes damage taken (×0.5 / 1 / 1.5), wind-up length (×1.3 / 1 / 0.85) and cooldowns,
  never enemy health.
- **Hit-stop:** 45 ms on a hit, 85 ms on a heavy hit (actors only; input is still read), from the frame the blow lands
  (ACTION-FEEL: the struck enemy no longer moves on before the hold). Camera shake follows the existing Shake setting.

## Movement and camera (CTRL-1)
The user: "the camera doesn't follow Twinsen comfortably, the tank control doesn't feel right like in the second game,
and the ball throws to a fixed distance." The numbers below are LBA2's own, read from the engine source released by
its rights holder in 2021 (the lba2-classic repository; numbers and rules only, no code copied) and from the user's
ANIM.HQR / RESS.HQR (study scripts in the session's scratch space, as in docs/LBA2_MEASUREMENTS.md). Twinsen's height
H = 1238 LBA2 units = 2.065 m here (1 unit ≈ 1.67 mm); LBA2's timers run in ms, its projectiles in 1/50 s ticks.

### Tank controls (Classic) — `GAITS` in src/game/actors.js
| Behaviour | Walk (LBA2 anim) | Back-step | Turn on the spot | Start to full speed | Stop |
|---|---|---|---|---|---|
| Normal | 2.00 m/s (anim 1: 960 units / 0.8 s = 0.97 H/s) | 1.78 m/s (anim 2: 0.86 H/s) | 100°/s (anims 3/4) | 0.12 s | 0.07 s |
| Athletic | 4.96 m/s (anim 67: 2491 units / 0.84 s = 2.40 H/s) | 2.36 m/s (anim 68: 1.14 H/s) | 169°/s (anims 69/70) | 0.42 s (the run's build-up) | 0.17 s |
| Aggressive | 2.52 m/s (anim 83: 1.22 H/s) | 1.64 m/s (anim 84: 0.79 H/s) | 116°/s (anims 85/86) | 0.12 s | 0.08 s |
| Discreet | 0.67 m/s (anim 94: 0.32 H/s) | 0.67 m/s (anim 95) | 90°/s (anims 96/97 carry no root rotation) | 0.08 s | 0.05 s |

- Speeds are the root motion of the original anims (each key's step ÷ its time, over the loop; the format from
  LIB386/ANIM ANIM.ASM / INTERDEP.ASM). Walking, running or stepping back he turns at **90°/s in every behaviour**:
  OBJECT.CPP `ManualRealAngle` sets the turn speed to ±1024 (of 4096) per second with no ramp (LIB386/3D/MOVE.CPP
  `ChangeSpeedMove`). Standing, LBA2 plays the turn-on-the-spot anims, whose root rotation (`Master` flag 1) gives the
  rates in the table. Holding the ball key turns him at 90°/s (OBJECT.CPP, `MOVE_MANUAL`, `I_THROW`).
- LBA2 starts the walk only after the anim's blend to its first key (Normal 300 ms, Athletic 140 ms, Discreet 400 ms
  of standing still) and stops dead. Ours has **no input lag**: the turn starts and stops on the frame of the key; the
  walk starts at once and ramps up in the times above (the Athletic run builds up as its first keys do); it stops
  short. No turn-before-move delay. He moves only along his facing, so a turn never drifts.
- A stick turns in proportion to its tilt (short corrections); keys turn at the full rate. The same speeds apply in
  Modern (camera-relative, otherwise unchanged). The previous speeds were 2.4 / 5.4 / 2.7 / 1.4 m/s, back-step ×0.5,
  every turn 90°/s ("a little faster than LBA2"; Discreet twice LBA2's sneak).
- Frame rate: everything integrates with the frame's dt (Game.advance splits slow frames into ≤ 1/30 s steps), so
  30 fps and intermittent 0.1 s frames cover the same ground (tests/controls.mjs §5: within 1%).
- For the animator and the camera, `hero.motion` each frame: `speed` (the ground really covered, m/s: zero against a
  wall), `fwd` / `side` (that, relative to his facing), `turnRate` (rad/s, + = left), `grounded`, `landed` (the impact
  speed on the frame he lands, else 0), `backward`, `blocked` (asked to move, got under a quarter of it), `wanted`.
  The feet already follow the resolved speed: against a wall he stands instead of walking on the spot.

### The follow camera (LBA view) — src/engine/camera.js
LBA2 (PERSO.CPP main loop, INTEXT.CPP `CameraCenter`, GLOBAL.CPP `DefAlphaCam` / `DefVueDistance`): the view's angle
never turns with Twinsen; when he leaves the box x 80–539, y 80–429 of the 640×480 screen it re-centres (a cut) on a
point `DISTANCE_VISEE` (2500 units, ~2 H) ahead of his facing, keeping the angle; Enter re-centres behind him
(`CameraCenter(1)`); two views, AlphaCam 300 / 530 at 10500 / 17000 units, focal 600.
- **1997 look** (Retro): exactly that, hard cuts.
- **Remaster** (default): the same rules made continuous. The angle holds through every turn (no swing, no snap; a
  turn on the spot moves nothing). The aim point is DISTANCE_VISEE ahead along the way he really moves (stepping back
  or blocked, it follows what he does, not his facing), swinging round gently with his turns and held when he stops,
  so the view stays still while he stands or shuffles, as LBA2's does. A dead zone (±1.4 m across, ±1.0 m along)
  keeps small moves from moving the view; a critically damped spring (5/s) follows: no lurch, no overshoot, the same
  at 30 and 60 fps. The height follows the ground under him through its own spring (3.2/s): stairs and slopes glide,
  a jump doesn't bob the view, a long fall is followed. He can never leave LBA2's frame box (a guard slides the view
  just enough). Enter / R3 swing it round behind him, eased (≤ 60°/s).
- Hidden for most of a second behind something solid (a wall, a cliff, a tower; not trees, posts or rails, which he
  shows between): the smallest turn of the view, in 15° steps up to 90°, that shows him again, eased (≤ 60°/s), and
  not again for 4 s. Before, it swung right round behind him at up to ~800°/s, and tree crowns set it off again and
  again: measured on an open route, the yaw turned at up to 455°/s and Twinsen left the frame. Houses between the
  camera and Twinsen fade instead (town.js / island.js, VP-10's work; not touched here).
- The free camera is unchanged.
- **Follow** (CONTROL-FEEL, the user: "when I turn round he runs toward me, which is strange"; Settings → Camera, the
  third choice; LBA2's view stays the default): the remaster's view above, and once he has kept one way (within 23°,
  never turning faster than 40°/s) at a walk or more for 1.2 s, the view swings round behind him, eased and gentler than
  Enter's (≤ 45°/s, ≤ 60°/s²), and keeps behind him while he keeps on (a curve up to ~1.6 rad/s carries it round,
  re-aimed only past 8°; a sharp turn ends it and the view stays). Never while he stands, turns on the spot, makes short
  corrections, runs less than 1.2 s, fights (a lock-on, a move, enemies after him), or indoors (the iso rooms); only to
  a heading where nothing hides him and where neither it nor the way round to it needs the view to rise over the
  scenery (so by the houses it often stays as LBA2's); none for 4 s after a hidden or steep swing, nor for 2.5 s after a
  follow ends. With Modern controls the stick keeps the heading it was pushed under until it is let go or pushed a new way
  (45°+), so the swing never turns his way and chases itself. In the 1997 look it glides too. tests/camfollow.mjs;
  tests/camsteady.mjs runs its routes in Follow with the LBA view's budgets.

### The jump — `JUMP` in src/game/actors.js
LBA2's jump (ANIM.HQR 71) rises 0.577 H and carries him 1.55 H: here 1.19 m up and 3.2 m along (it was 1.77 m up and
3.6 m at a run; the user: "the jump is too high"). The time in the air stays 0.72 s, so the jump has its own gravity
(18.4 m/s²) from the take-off until he is back down at its height; anything further, and the ball, enemies and pickups,
fall at 26 m/s². A run is trimmed to 4.44 m/s at the take-off and in the air. The crouch (0.09 s; standing only since
ACTION-FEEL: on the move he takes off on the press), coyote time (0.12 s), the press buffer (0.15 s) and the landing's squash and dust are as before. In the air his feet catch a
ledge up to 0.25 m above them: he takes a ledge about 1.4 m up (1.33 m at 30 fps), 2.0 m before. Measured (60 fps):
apex 1.14 m, 0.72 s, 3.1 m at a run (tests/controls.mjs 6b).
- Places built for the jump, crossed by jumps in tests/jumpreach.mjs (at the harness' 30 fps): the Whispering Cliffs'
  13 stones (rises 0.98 m; the first now 1 m over the lowest ground beside it — from the street's side it stood 2 m up,
  which only the old jump took), the deep installation's stepping stones (flush, 0.9–1.0 m gaps: a short hop from the
  brink; a full run carries ~3 m, past a 1.3 m stone, as the old jump's 3.6 m did), Zeelich's old mill (now seven
  stair-stones 1.09 m apart, the gallery 1.09 m over the last and its planks starting just past it; it was six 1.25 m
  apart with a 0.6 m gap to the gallery). Built against it, still out of reach: the test step's deck (2.35 m), the
  depot's fence (2.4 m).

### The ball's throw — `BALL_THROW`, `MagicBall.plan` in src/game/actors.js
LBA2: each behaviour's File3D (RESS.HQR entry 44) gives the throw anim (LANCE, anim 6) an `F_THROW_MAGIC` on its 6th
key (FICHE.CPP `GereAnimAction` → `ThrowMagicBall`): launch angle α (of 4096), speed (units per tick) and weight;
EXTRA.CPP `InitFly` and the `EXTRA_FLY` step fly it as y = Vy·t − weight·t²/16 with Vy = speed·sin α and speed·cos α
along his facing, released 1200 units up. Each bounce restarts the same Vy (`BounceExtra`). No input changes it: in
LBA2 the behaviour is the distance.

| Behaviour | α / speed / weight | Forward, up, gravity | First touch-down on the flat (LBA2) |
|---|---|---|---|
| Discreet | 572 (50°) / 100 / 35 | 5.33 m/s, 6.42 m/s, 18.2 m/s² | 2.4 H (5.0 m): a high lob (+1.1 m), tall hops |
| Normal | 120 (10.5°) / 100 / 16 | 8.20, 1.53, 8.3 | 3.6 H (7.4 m): flat, low skips |
| Athletic | 80 (7°) / 105 / 14 | 8.69, 1.07, 7.3 | 3.8 H (7.8 m): flatter |
| Aggressive | 40 (3.5°) / 110 / 12 | 9.16, 0.56, 6.3 | 4.0 H (8.2 m): flat and fast |

(So LBA2's Athletic throw is long but low, not high; its Discreet throw is the short, high lob.)
- **Classic:** LBA2's throw for the behaviour, along his facing, from the hand (the forward speed scaled so the
  touch-down on the flat is LBA2's despite our lower hand). A charged throw: ×1.3 the speed, so further.
- **Modern:** aim at a point. The cursor (where its ray meets the ground) or an analog stick's tilt sets the distance,
  0.8 m up to 1.6 × the behaviour's own throw (Discreet 8 m, Normal 11.8 m, Athletic 12.5 m, Aggressive 13.1 m); the
  arc first lands there, at the behaviour's pace (its forward speed × √(distance ÷ its own distance): near is a softer
  lob, far a faster, flatter throw). Keyboard only, no cursor: the behaviour's own throw. A charged aimed throw lands
  on the same point, faster. While charging, dots follow the whole first arc and a ring marks the touch-down.
- **The automatic aim at enemies is kept exactly as it was** (the user: "the ball aimed itself at them… keep it"):
  when the aim assist picks a target (the lock, an enemy or a switch in the aim cone; the chevron shows it), the throw
  goes to it, whatever distance the cursor asks for, with the same flight as before (13 / 15 / 19 / 9 m/s across for
  Normal / Athletic / Aggressive / Discreet, ×1.3 charged, gravity 22 m/s²); the in-flight assist is unchanged. The
  distance control applies only when there is no target. The puzzles' switches and targets are aimed this way, so
  they solve as before.
- Damage, magic cost, bounces (4, home on the 5th contact), ricochets, fetching and recall are unchanged.
- **Point-blank** (POINT-BLANK, 8.11.2026; chapter 2's depot, chapter-balance.md). The ball leaves the hand 0.9 m ahead,
  0.19 m to his right, 1.45 m up (measured at the release frame). Three faults at close range, fixed:
  (1) a throw at a target under 1.6 m from the hand crossed the ground at the full aimed pace while its fall was planned
  for 0.12 s: it went past the target before it came down (13 m/s sideways over a dog at his feet; hits only by the
  hit cylinder's luck). Now it crosses in those 0.12 s (`MagicBall.plan`; the charged ricochet the same). Farther
  throws are unchanged (13 m/s at 3 and 6 m). (2) Close to a wall or fence the hand was inside the collider (the ball
  stuck there, its four bounces spent in 0.03 s) or past a thin one (thrown through the depot fence). Now the arm's way
  out, from his body at the hand's height to the hand, is followed: the ball leaves short of anything solid, and an
  enemy the arm reaches first is struck there (`MagicBall.armReach`). (3) The depot valve's bypass loop had one
  collider standing 0.4 m over the pipe: an unseen wall for a throw down at the dog beside him. The ball now meets the
  pipe, the wheel and the risers as drawn (island.js; walking unchanged). LBA2 releases from the hand too (key 6 of
  LANCE, 1200 units up); its throws are not aimed, so a close enemy is simply in the ball's way.
- **The preview** (AIM-MATCH, the same day): the charge's dots and ring were drawn from the hand cocked behind his head,
  not from where the ball leaves: the ring fell 1.3–1.4 m short of the throw's touch-down in every behaviour. Now from
  the release point (the last throw's, relative to him): within 0.07 m. `tests/ball-close.mjs` checks all of this.

## Twinsen's combat animation (ANIM-COMBAT) — src/engine/rig.js
The user: "in combat Twinsen's movements feel unnatural and weird." The animation was reworked; no timing, hit window,
damage, cooldown, input lock or speed changed (the numbers above and in `COMBAT` / `MOVES` are untouched; the poses are
keyed on the same clocks: the throw's on `throwing.at`, each strike's on its own startup / active / recovery).
Posed after LBA2's own anims (ANIM.HQR, measured: numbers only): the throw LANCE (6), the Aggressive idle (82) and
punches (87–89), the sword attack (42), the hit reactions (7–9).
- **The ball throw** (`THROW`): the arm rises out to the side and cocks behind the head with the chest turned away and
  the free arm on the target, the front knee lifts (0–0.115 s; the loaded pose is also what a held press waits in and
  what a charge holds); the whip brings the hand over the top to the release point, high in front of the head, as the
  front foot lands, and the ball leaves from the hand there at 0.16 s; the arm follows through across the body into a
  bow over the front foot, the head kept on the target, back up by 0.62 s. Before: the chest turned the throwing
  shoulder toward the target in the wind-up (the sign was inverted), the arm swung up in front of the face, the
  release snapped in one frame into a held bow (51 rad/s) and the ball appeared 35 cm from the hand. On the move the
  same arm plays over the walk with half the chest's turn and no deep bow; throw → charge → release is one motion
  (the layer no longer dips out and back).
- **Strikes** (`STRIKES`, keyed in phase units so the blade or fist crosses the middle of its arc in the middle of the
  active frames, where the hit is swept): sword 1 a backhand cocked over the left shoulder, sword 2 a forehand back the
  other way, sword 3 two hands overhead into a bow that holds the blow's weight, the heavy blow from the raised blade
  (`heavyCharge`); the jab drives the right shoulder into it (it turned back before), the left jab mirrors it, the kick
  chambers the knee, snaps out, comes back and is put down (it used to stay out through its whole recovery). The upper
  arm can now turn about its length (shoulder order X·Z·Y, as LBA2's): the forearm folds across for a backhand.
- **Feet** (`Rig._plant`, the hero only): standing, striking, throwing or hurt, a foot on the ground stays where it was put
  down; when the pose wants it more than 12 cm away (a strike's forward step, a turn, a push) it takes a short lifted step;
  a foot the pose lifts (a throw's front knee, a kick) is put down where the pose lands it. Running, jumps and story poses
  keep their own legs; walking holds the foot he stands on (ANIM-POLISH-2, below).
- **Hit reaction** (`_hurtPose`, the hero): the chest and head snap away from the blow and the arms fly up, the body sags
  and rebounds into his stance by 0.42 s (`hurtT` 0.4); the feet stumble back with the push. A second blow restarts it.
- **Stance** (`GUARD`): engaged (a lock, a move, a held charge, a hit, and 2.5 s after) his idle eases into his combat
  stance for the weapon in hand (fists: LBA2's guard, fists up; sword: the blade forward; ball: the hand ready), with no
  fidgets; the strikes start and end in it. With a lock his head and chest turn toward the target (`Rig.combatLook`).
- **Interruptions**: a hit, death, pause, dialogue or scene change calls the throw off with no whip played on
  (`HeroCombat.reset` clears the layer); nothing is left in the hand.
- `tests/anim-combat.mjs` checks all of this at 30, 60 and 120 fps; frame strips and capture tools:
  docs/lba3-production/reviews/ANIM-COMBAT/.

## Twinsen between the moves (ANIM-POLISH-2, task #72) — src/engine/rig.js `_plant`, src/game/actors.js
Starts, stops, turning on the spot, landings, stairs and melee contact, Twinsen first (the hero's rig only: `footPlant`).
Visual only: no speed, acceleration, turn rate, jump, collision, hit window, damage or input lock changed; every move
still begins on the frame of its key (tests/anim-polish.mjs checks it). Before / after strips: docs/lba3-production/review/anim-polish/.
Rechecked on 0aed5b2 first: the earlier ANIM-POLISH pass (75df846: lean springs, a pivot step every 35°, a knee bend by
fall height) was in place; what was still wrong, measured in Citadel's square by input at 60 fps:
- **Turning on the spot** (Classic left/right, 100°/s Normal, 169°/s Athletic): the body turned 0.35 s as a statue, then
  both feet tapped 4 cm in 0.25 s, and so on; the planted feet slid 21–26 cm over a 120° turn (the hip's turn dragged the
  ankle round: it was applied after the leg's swing). Now a stepping turn: the foot on the side he turns to lifts within a
  frame or two of the key, then the feet step in turn (0.13–0.2 s a step by the turn rate, a step every ~0.22 s at 100°/s),
  each lifted 7.5 cm and put down ahead of the body by the turn it makes meanwhile; the chest leans over the standing foot,
  the pelvis hikes on the stepping side, the opposite arm swings a little. Planted feet slide 0.2 cm. The hip turns about
  the vertical first (hip rotation order YXZ, the target taken into the turned frame).
- **Walking**: the foot under him slid back at ~0.5 m/s while he walked at 2.0 m/s (LBA2's walk keys on our shorter
  legs) and never quite reached the ground (2 cm short at mid-stance, 13 cm at the heel strike). Now the walk's stance
  half (phase 0–0.5, read behind the joints' easing lag) holds the foot where it struck, from the moment the leg can reach
  the ground below it, easing in over 5 % and out over the last 12 % (not let go while braking); his pelvis rides 3 cm
  lower in the walk so the standing leg reaches. The lower foot on the ground now moves ~0.1 m/s (3–4 cm per metre walked,
  the heel strike's settle). LBA2's cadence and stride (0.78 H per 0.8 s) are unchanged. The run keeps its own legs.
- **Stops**: the swinging foot came down wherever the blend to the stance brought it near the ground, slid there, and
  both feet then shuffled (up to three steps over 0.6 s; the run's stop slid both feet in). Now a foot nearly down is
  put down where it is, a foot in the air comes down in one 0.17 s step to where he will stand (under his hip), the
  other closes after it, one foot at a time: two steps, planted within ~0.4 s. The braking dip and lean are as before.
  **STOP-ROBUST** (later): that held at some phases of the gait only. A step started before the blend to the stance was done (in
  the first 0.1 s, or by another rule: the leg out of reach) went to the blend's passing pose and was not counted as the foot's stop
  step; once the blend was done the foot stood 4-20 cm off its stance and stepped again at 0.4-0.8 s (three steps). Swept over 40
  phases × 3 idle clocks, 30/60/120 fps, Classic/Modern: 226 of 720 stops broke a rule (third step, or planted after 0.45 s).
  Now, in the stop's window, every step goes to the spot the foot will stand on in the stance being blended to (`Rig._stanceAt`:
  the leg's target angles from the pelvis at rest, tilted by the idle's weight shift; within 0.7 cm of the converged pose),
  whatever rule starts it, and is the foot's one stop step (taken in the first 0.45 s); a stop's step lasts 0.1-0.15 s by its
  length (was 0.17-0.2). 0 of 720 now: at most two steps, planted by 0.34-0.4 s, the last step starting by 0.4 s.
- **Landings**: the absorb (pelvis down 9–15 cm by fall height, 0.1–0.26 s) was there, but the soles sank 2–3 cm into
  the ground while the plant came in; both feet now stand where they touched down on that frame. The jump's crouch
  (`jumpPrep`) plants too (its soles slid and sank 4 cm). A step down of more than 0.3 m that the ground takes in one
  frame (a kerb) also gets a small absorb.
- **Stairs** (his cellar stairs, 0.2 m treads; the house's 0.13 m): each tread jerked the whole body 20 cm in one frame.
  The drawn body now keeps its height and follows in about a tenth of a second (`Hero.visY`, up quicker than down): at
  most 6.6 cm in a 60 fps frame. The gameplay height, collisions and the camera are the ground's at once, as before.
- **Melee contact** (combat.js `MOVES` unchanged): measured the frame each pose reads as contact (the fist / foot at 90 %
  of its reach out, the blade tip crossing straight ahead, the overhead blade coming down through chest height) against
  when combat.js strikes a body 1.6 m ahead. The jabs, slash1 and slash3 were within a frame (−10 … +9 ms); the
  forehand (`slash2`) crossed in front of him 20 ms after its strike and is keyed 0.2 u earlier (now −1 ms). The kick's
  foot is out 30 ms before its land at 0.5 and holds through it (left as is: it reads as contact on the hit frame). The
  gameplay and the hit windows were not mismatched; nothing in combat.js changed.
- Interruptions checked: a hit mid-turn / mid-walk / on the stop, the pause in the middle of a step (frozen, finished after),
  a dialogue mid-walk (planted again on return). Cost: the hero's two-bone leg fit now also runs while he walks (the hero
  only, nobody else); his Rig.update measured 0.0–0.1 ms median, 0.1–0.2 ms p95 walking / turning / standing, the same as
  before within the browser timer's 0.1 ms (tools/cost.js, SwiftShader's CPU; no fps claim).
- Open: during a dialogue the hero's own update does not run, so his feet are not planted while he talks (as before);
  the run's stop brings both feet down together (they are both off the ground in the run's flight); a short start drags
  the first swinging foot ~3 cm before it lifts; NPCs still use the unplanted walk (their feet slide as Twinsen's did).

## The others between the moves (ANIM-POLISH-3) — src/engine/rig.js `plantLite`, drawcull.js, actors.js, walkers.js, guards.js
The user (01.11): "yes, do it for the other characters too". The townsfolk, the story's people (Zoé, Arthur, Bram ...) and Vesk's
guards now plant their feet through the hero's own code (`Rig._plant`), switched on per body by `Rig.plantIfFits()` (`plantLite`;
the hero keeps `footPlant`, and nothing he does changed: tests/anim-polish.mjs unchanged). Visual only: no speed, route, AI, turn
rate, hit window, damage or collision changed (tests/npc-feet.mjs plays the depot guard frame for frame with and without it).
Before / after strips (a walker's body, Zoé, Arthur, a guard; walk, stop, turn by script in Citadel's square, the lowest foot's move
per 0.05 s printed under each frame): docs/lba3-production/review/npc-feet/ (tools/cap.mjs, tools/strip.py).
Measured first on 0d045bf, each body alone at its own walking speeds (residents 0.75-1.6 m/s, kids up to 1.6, guards 1.4-2.4):
- **Walking**: unplanted, the lower foot never came nearer than 1-3 cm to the ground (4-7 cm on average: the walk's keys hang it)
  and skated at 0.4-0.9 m/s (1.3 m/s a guard at its run-up 2.4). Now the stance foot is held where it strikes, as his, the pelvis
  riding as his planted walk does; on the ground it moves 0.04-0.07 m/s (0.09 a Grobo guard at 2.4 m/s), the leg reaching it
  (≤ 1.06 leg lengths; the Spheros 1.13). Their walks are slower than his (2.0 m/s), and at those cadences the foot let go at 38 %
  of the cycle was drawn back to its pose along the ground (0.1-0.15 m/s): the others hold it to 44 % and let it go over 6 %.
- **Stops**: their walk becomes their stance in one frame (his brakes over a few), so a foot near the ground but off its spot was put
  down, stepped by the blend and corrected again (three steps), and a foot in the air glided along the blend. Now: a foot more than
  10 cm off the spot it will stand on steps there at once; one waiting for the other's step is held in the air where it is; the
  other closes after it. 1-2 steps, both planted within 0.35 s; none later (standing, their feet may sit up to 9 cm off the stance
  pose before a shuffle, his 5 cm; a leg straight in standing up to 1.03 of its length, his 1.01).
  **STOP-ROBUST** (later): the same blend's-pose targets as his, the same fix (`Rig._stanceAt`, one step a foot); and with both feet
  in the air at the stop (30-40 % of their cycle) the foot waiting for the other's step was held in the air: standing on neither foot
  for 0.1-0.17 s in about a quarter of all stops. Now the lower foot is put down where it is and the other steps to its spot first
  (the 10 cm off-spot step only while the other foot stands). Swept (40 phases × 2 idle clocks, 12 bodies, 30/60/120 fps): 747 of
  2880 stops had both feet off the ground over 0.05 s, 1 a step at 0.63 s; now 0 of 6720 (4 idle clocks, 14 bodies): at most two
  steps, planted by 0.37 s, never both feet off the ground.
  The turn where they stand failed now and then too (the Spheros, "the feet step in turn", once the slide): not the gait's phase but
  the idle clock, random per body. The idle's weight shift tilts the pelvis up to 0.05 rad; on the Spheros' 0.58 m hips that lifts
  one hip 1.5 cm, so that leg stood on a foot hanging in the air (1.02-1.04 leg lengths) and the turn ended in two closing steps,
  the same foot twice. A planting character's pelvis now sits lower by that lift (`hipsY`, the others only; Twinsen unchanged).
  Swept over 40 clocks: the Spheros at 30 fps 3 of 40 runs failed (2 not alternating, 1 slide 3.1 cm), at 60 fps 1; now 1 at 30 fps
  (that slide, 3.1 cm against < 3: the controller turns them 0.57 rad in the first 30 fps frame, and the standing foot, 0.29 m out
  from the middle, is dragged before the first step can land) and 0 at 60 / 120 fps; Arthur, Bram, Zoé, Pim, the Grobo guard 0 of 40.
- **Turning where they stand** (to face Twinsen when he comes near or talks to them, to face each other, a guard turning to him):
  their controllers only turn them (an exponential turn, up to 6 rad/s at first), so the rig reads the turn from the facing: standing,
  talking or listening while it turns faster than ~45°/s it is a stepping turn as his turn anims (on until under 20°/s): the lead
  foot first, alternating, the chest over the standing foot, the pelvis hiked, the head leading. Turning faster than he ever does,
  their steps lead the body by up to 0.8 rad (his 0.45), and a foot the turn leaves out of reach while the other steps takes its turn
  step at once (it used to step back under the hip, then again: the same foot twice); a foot whose turn it is not waits for it unless
  1.15 leg lengths out. A half-turn: 4 steps (a closing fifth on the Spheros), a planted foot slides ~1 cm; unplanted the feet were
  dragged round 0.5-1.8 m (the statue).
- **Bodies**: every body shares the skeleton's layout and reaches the ground standing; what decides is the legs (thigh + shin)
  against the hip's height (`Rig.legReach`): Twinsen, Zoé, the Quetches, Rabbibunnies, the Esmers 0.89-0.90, the Grobos 0.86, the
  kids 0.85, the Spheros 0.82 — all plant. **Baldino (0.77) and the FunFrock trooper `fclone` (0.78) keep the unplanted walk**: a
  big boot on a short shin can't reach the held foot (1.2-1.6 leg lengths; planted they still slid 0.4-0.5 m/s). The Grey Sentinels
  (createHumanoid, later chapters) are not switched on; the dogs have their own four-legged rig.
- **Guards**: patrol, chase, search and home walks planted, stops at the waypoints, turning where they stand. Waiting in reach for its
  turn to strike (chase, 1.9-2.2 m from Twinsen) a guard played its walk at speed 0, frozen mid-stride on one foot: it now stands
  (idle) there. The strikes, hit reactions and the knock-out keep their own legs (the plant lets go over 0.1 s).
- **Where**: only within 30 m of the camera and in view (`PLANT_VIEW`; drawcull.js FarCull marks the view each drawn frame), beyond
  that the unplanted walk over 0.1 s. Each planted character is put where it stands this frame before its rig's update
  (`Actor.placeRig`), as he is.
- **Cost** (tests/npc-feet.mjs on 5885f20, chapter 1's Citadel, everybody simulated, 23 rigs posed a frame; SwiftShader's CPU, browser
  timer 0.1 ms; medians): Rig.update over the whole crowd but the hero 0.7 ms with the 7-8 people near and in view planted, 0.3-0.5 ms
  unplanted (drawn frames); 0.4-0.5 against 0.2 ms with 12 planted (undrawn frames, the distance gate only); all 20 standing or walking
  ones planted at once 0.7 against 0.3 ms: about 0.02-0.04 ms a planted person. tests/walkers.mjs's own figure for the residents'
  whole update, run back to back on the same machine: five minutes of all ten in full 0.475 ms a frame on 0d045bf, 0.678 on 5885f20;
  a minute at the quay (most far off) 0.052 / 0.070 ms. No draw, no material, no program added (perfbudget, drawcalls PASS).
- Open: the walkers' `gait` (their walk speed for the animation) is smoothed, so the first steps of a start lag the body a little
  (the stance foot reaches its leg's length a moment, ≤ 1.1); a resident giving way sideways still plays its forward walk (VP-11);
  story scenes that move a person themselves (a scene's own `rig.update`) solve its feet a frame late (steady while it walks, a
  frame's move on a start or a stop); not looked at in later chapters' places. As in Twinsen's walk, the heel strikes only once the leg
  can reach the ground (LBA2's long stride on our legs), so for 30-40 % of a walk's frames neither foot is held (each 1-6 cm up, moving
  with the step; riding the pelvis 1-3 cm lower shortened that by a few points but drew the held foot along the ground at 0.1-0.5 m/s,
  so it was left as his). The opening scene places its people's feet itself: their plantLite is off for it (opening.js `actor`).
  tests/townlife.mjs's FIX-PUMP-N check (between Bram and the pump) fails on 0d045bf as well, with the same numbers.

## Enemies are solid (SOLID-ENEMY)
The user (29.10): "what LBA2 did". From LBA2 itself (the engine source released by its rights holder, and the user's
SCENE.HQR / RESS.HQR / BODY.HQR read with a study script in the session's scratch space; numbers only):
- Twinsen always tests collisions with actors (OBJECT.CPP `RestartPerso`: CHECK_OBJ_COL), and `CheckObjCol` tests his box
  against the box of every actor that has a body, whatever that actor's own flags; he is set back out along the shorter
  overlap (he slides along it). An actor whose life reaches 0 loses its body (PERSO.CPP: `Body.Num = -1`): it is no longer
  solid. The killable actors of its scenes (armour < 50, a finite life: 557) carry CHECK_OBJ_COL themselves in 533 cases
  (96 %), so they stop at him too.
- The box (FICHE.CPP `InitBodyZV`) is square, its half side the mean of the body's half width and half depth, or the
  File3D's own ZV: Twinsen 250 units (0.42 m); its soldiers 200–256 (0.33–0.43 m), its dog 240 (0.40 m), its height y too.
- A punch, kick or blade (an anim's F_HIT) hits what his box meets once pushed 200 units (0.33 m) ahead: blows land from
  where he stops.

Here (src/game/actors.js `Hero.keepApart`, SOLID-NPC's contact, extended): each living enemy has a body radius
(`bodyR`, enemies.js `BODY_R`; the guards the girth of their race as SOLID-NPC's residents), measured from our models the
way LBA2 measures its boxes and trimmed of what sticks out; a flyer's hull has a height and blocks only where it overlaps
him (his feet + 0.1 to 1.95 m: a drone over his head is walked under). He stops at it head on (no side-step round a foe,
as with pets) and slides round it off centre, with no jitter and never launched; the correction goes through physics, so a
lunge or a bash never puts him into a wall. The enemy's own moves (chase, lunge, bash, knock-back) stop at his body
(`Actor.keepOffHero`). A beaten enemy (alive is false from the blow) is not solid. Only bodies within 3 m of him are tested.

| Enemy | Body radius | He stops at (his 0.4 + it) | LBA2's nearest |
|---|---|---|---|
| Vesk's Quetch guard | 0.46 | 0.86 m | soldiers 0.33–0.43 m |
| Vesk's Grobo guard | 0.65 | 1.05 m | |
| FunFrock's trooper | 0.50 | 0.90 m | |
| Guard dog | 0.50 | 0.90 m | its dog 0.40 m |
| Crystal mite | 0.50 | 0.90 m | |
| Crystal crawler | 1.05 | 1.45 m | |
| Sentry | 0.60 | 1.00 m | |
| Warden drone (hull 0.81–1.95 m up) | 0.50 | 0.90 m | |
| Heavy drone (hauler) | 0.90 | 1.30 m | |
| The guardian (out of melee's height) | 1.40 | 1.80 m | |

Every attack still lands from there: a blow reaches `reach` + the target's radius, which is 0.80 m (a jab on the
crawler) to 2.15 m past the stop distance; played for every kind and every move in tests/solidenemy.mjs (each contact in
the move's active frames, never inside the body during the forward step). The enemies' own blows reach from their stop
too (the mite's bite 1.0 m, the dog's 1.4, the guards' baton 1.6, the sentry's bash 1.5). Not changed: any reach, timing or
damage.

## Action feel, chapters 1–2 (ACTION-FEEL, G1 round 3)
Measured by input in the developer arena's flat floor (scratch probes probe-feel.mjs / probe-b.mjs / probe-melee.mjs:
frames counted from the press or the release, at 30 / 60 / 144 fps). What was already right and is unchanged: Classic
starts move on the frame of the key (90 % of a walk in 5 frames at 60 fps), stops in 3 frames (0.05 m), the turn on the
spot starts and stops on the frame of the key with no drift, a landing with Up held runs straight on. Four changes (the third, when a blow lands, in two rows):

| | Before (30 / 60 / 144 fps) | After | Where |
|---|---|---|---|
| Running jump (Athletic): from the press to the take-off | 2 / 5 / 12 frames stood dead still (4.96 → 0 → 4.2 m/s), take-off 3 / 6 / 13 frames after the press | takes off on the press, from the same spot; standing jumps keep their crouch | actors.js `Hero.jump` |
| ... its length (LBA2: 1.55 H = 3.20 m) | 2.99 / 3.12 / 3.15 m (its take-off frame lost speed under the crouch's lock) | 3.28 / 3.27 / 3.21 m; height and time in the air unchanged | |
| Modern, letting go: frames to a standstill (Normal / Athletic) | 7 / 15 / 37 and 9 / 19 / 47, of which 3 / 7 / 18 slid in the idle pose | 1 / 3 / 9 and 4 / 9 / 23 (as Classic), none sliding in the idle pose; overshoot Normal 0.13 → 0.05 m, Athletic 0.32 → 0.37 m (Classic's) | actors.js `Hero.update` |
| A punch or kick on a guard at his stop distance: where the fist or foot is when the blow lands (+ short of the body's front, − at or in it) | jab +0.13, jab 2 +0.04, kick +0.06, glove +0.33 / +0.23 m: the arc took the body from its edge at the first active frame, 2–3 frames before the limb arrived, and the guard was already pushed away | −0.16, −0.12, −0.08, −0.17 / −0.09 m: struck in the middle of the active frames, where the pose has the limb furthest out (`MOVES` `land`). The sword's sweeps reach the body as the arc does and are unchanged | combat.js `HeroCombat.land` |
| Hit-stop: the struck guard's move on the contact frame | 8.3 cm (full speed), then 3 held frames, then on: a jerk, a stop, a go | 0.8 cm, held, then the push: the hold starts with the contact; its length is unchanged | main.js `Game.update` |
| A guard's half-turn reaction (LBA1's CHOC2, half the hits) | the feet shuffled on the spot: the head moved 1–3 cm, the body turned 0.05 rad: nothing showed but the push | the body spins 0.9 rad away from the blow in 0.3 s (the chase turns it back) | guards.js |

Not changed: walk/run speeds, turn rates, the jump's height and air time, the dodge, every strike's timing window, reach,
arc and damage (which enemies a blow takes is decided as before; a punch's blow is only dealt 1–3 frames later, inside its
active frames). Not done: how the start of a walk reads by eye (its stance foot slides 0.4 m/s on average over the first
0.5 s against 0.16 m/s in a steady walk): a rig matter left for an animation pass.

## Enemy roles
| Enemy | Role | Tell | Opening | Hit reaction |
|---|---|---|---|---|
| Crystal mite | cautious close-range | rears up, crystals flare (0.5 s) | sits low for 0.6 s after the lunge | always staggers |
| Warden drone | ranged, mechanical | prongs crackle, a red aim line brightens (0.75 s); needs a clear shot | cooldown after firing | staggers, but steadies after two staggers in 2 s; the pulse stuns it |
| Sentry automaton | protected | pulls its shield back, red eye (0.7 s) | shield down for 1.1 s after its bash | blocks frontal ball and sword (clang); heavy strike, charged ball or pulse breaks the guard |
| Crystal crawler | heavy, controls space | rears, a ring spreads on the ground (1 s) | 1.3 s after the slam | only heavy hits stagger it; dodge or leave the ring (being airborne also avoids it) |
| FunFrock's old trooper (LBA1's fat clone soldier, bodies 18–20; kind `fclone`) | ranged + close, reactivated by the project | as Vesk's guards: the rifle comes up with the violet aim line (0.8 s); close in, the arm goes up | as the guards | the Grobo guard's rules: armour 2 (a magic-level-1 ball needs a charge, or a heavy strike), 5 HP, two hit reactions; beaten: falls, leaves one bonus |
| Guard dog (LBA2's Zeelich guard dog, bodies 51–53) | fast melee, works with the guards | stops and barks (the jaw drops; its group is alerted), then close in: crouches with the jaw wide open and growls (0.5 s) | stands panting for 0.9 s after the bite | 3 HP, no armour; notices a running Twinsen close by even out of sight; a hit makes it yelp and skid back; knocked out: rolls over, leaves one bonus; the pulse stuns it; gives up beyond its leash |
| Vesk's guard (Quetch / Grobo) | ranged + close, people in his uniform | the stun rifle comes up and a violet aim line brightens (0.8 s); close in, the baton goes up (0.55 s) | rifle lowered for 0.9 s after a shot or a swing | LBA1's rules: armour (Quetch 1, Grobo 2) — a hit weaker than the armour is braced against, no harm; two hit reactions at random (stagger, half-turn: the body spun 0.9 rad away from the blow, ACTION-FEEL); beaten: falls, leaves one bonus. The pulse jams the rifle, not the guard |
| Heavy drone (ch. 7), Guardian (ch. 12) | mechanical bosses | existing | existing | existing |

All enemies give up and go home beyond a pursuit limit.

## Knock-outs (ANIM-DEATH) — src/game/death.js
The user: "when a character dies the animation doesn't work well." Before: each enemy had its own ad-hoc end (a guard
tipped over in 0.3 s and lay with its arms and rifle sticking up, a mite flipped through the floor, a drone or the
guardian sank half into the ground, a sentry dropped 20 cm in one frame, a dog's legs snapped straight), none fell
if killed in the air, every body vanished in one frame, and the bonus popped out at the feet before the fall.
Now one controller runs every knock-out on game time (the same at 30 and 60 fps):

| Kind | Hit reaction → fall | Impact | Rests | Blink → gone |
|---|---|---|---|---|
| Vesk's guards (Quetch, Grobo), FunFrock's fat troopers | 0.14 s recoil (chest thrown back, a stagger step, the rifle flies out of the hand), then a pole's fall on the heels (accelerating) onto the back, away from the blow — onto the front if hit from behind; a round body's arms drop to the sides | 0.62 s, thud, small bounce | 1.1 s | 1.55 → 2.15 s |
| Guard dog | yelp, head up, legs braced in the skid; legs give, it rolls onto its side away from the blow | 0.46 s | 0.8 s | 1.45 → 2.05 s |
| Crystal mite, crawler | the crystals shatter; a hop and a flip onto its back, legs curled up, twitching after it lands, glow out | when it lands (~0.4 s) | 0.75 / 1.1 s | 1.15 → 1.65 / 1.6 → 2.2 s |
| Warden drone, heavy drone, the guardian (powered down) | the rotor runs down, the hull tumbles and falls with gravity, one bounce, rocks to a stop, eye out | when it lands | +0.45 / 0.6 s | 1.9 → 2.5 / 3.0 → 3.6 s |
| Sentry | a wobble, then it tips over stiffly like a barrel, clang, small rock, shield arm out, eye out | 0.78 s | 1.15 s | 1.75 → 2.35 s |

- The humanoid fall's keys are in src/engine/rig.js (`KO_HUMAN`: back / front / slump, round-body arms), after
  LBA2's own knock-down (Twinsen's "beaten", ANIM.HQR: ~1.1 s to the ground, root pushed back ~0.3 H; ours is
  0.62 s so play is not held up). Numbers only; nothing taken from the originals' files.
- No pop: every joint of a knock-out is rate-limited (≤ 13 rad/s for a humanoid, 10–12 for the others) from whatever
  pose the blow interrupted. No clipping, no floating: every frame the body's own surface (about 140 sampled vertices)
  is measured against the ground under each point; the body is lifted out of the ground and, once down, rests on its
  lowest point; on a slope or stairs it leans onto the ground's plane as it goes down. Killed in the air it falls
  with gravity and the fall plays out where it lands. The blow's push is a short stagger (≤ ~0.3 m, through
  collision); after the impact the body never moves. A humanoid with a wall or a drop behind it falls the other way,
  and slumps where it stands if neither way has room.
- The enemy leaves every target list on the frame of the blow (alive is false: the lock lets go, the soft target and
  the ball's automatic aim move on to a living enemy, hits pass through the body). CTRL-1's auto-aim is unchanged.
- The bonus (LBA's GiveExtraBonus) comes out of the body when it hits the ground, in an arc toward Twinsen, and lands
  on the ground (a wall in its way stops its drift). The guardian still gives none.
- Bonuses and full bars (CONTAINERS, the user's decision 2026-10-25; LBA2 does the same, EXTRA.CPP): a heart is not
  taken while life is full, nor a flask while magic is full. Walking into one makes it hop aside (the bonus sound) and
  it stays on the ground. Coins, keys and clovers are always taken. An enemy's bonus keeps LBA2's 20 s (blinking for
  the last 3); a container's never times out (docs/LBA2_MEASUREMENTS.md "Givers and bonuses").
- The end is LBA's blink (faster and faster), a puff of stars, and the body, its shadow, its tells and its dropped
  rifle are taken out of the scene. Nothing waits for it: the player is never locked. The pause freezes it; a
  dialogue lets it land (only knock-outs move during a dialogue); leaving the place, or the story changing the cast,
  lets it finish on its own clock; a reload brings a saved kill back as gone.
- Cost: a dying enemy's update takes 0.1–0.2 ms a frame (median, headless CPU), up to 1.4 ms on its first frame (its
  vertices sampled once); only while it dies, nothing afterwards (it is out of the scene).
- `tests/deaths.mjs` measures all of this per type (MEASURE lines); frame strips before/after per type:
  docs/lba3-visual/evidence/ANIM-DEATH/.

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

Baldino's hop-pack (EQ-1, 0.30.0; src/game/jetpack.js, story/arsenal.js): the one exception to "no flight", and a hop,
not a flight. From chapter 10, on its peg by Baldino's workshop door (he points it out after his briefing). Worn on the
back; the inventory takes it off and puts it on (E). In Athletic mode: jump, keep holding the jump key (Space / pad A /
touch ⬤) — once the jump stops rising the pack lights (a fresh press in the air lights it too; letting go cuts it).

| | Number | Why |
|---|---|---|
| Lift | at most 2.4 m above the take-off ground and above the ground under him (a jump: ~1.2 m) | one storey; no climbing a stack of ledges or a slope in one flight |
| Ground grip | it pushes on the highest ground within 0.9 m of his feet; with none within 3.1 m it fades out over 1 m | never over a drop, a gap, the sea or the cloud sea: he falls as from a jump |
| Fuel | 2.2 s of thrust; refills by itself on firm ground (0.3 s, then 1.4 s from empty) | short hops, nothing to buy |
| Air speed | 3.0 m/s, gentle steering (a run's momentum fades into it) | a hover, not a race |
| Fences | while it has him airborne his feet must clear a thin unstandable thing's top by 0.15 m | fences of ~2.4 m and more (built against a jump) hold |
| Ceiling | no rising with less than 0.2 m between his head and anything solid overhead | no rising into an overhang |
| Cushion | held near the ground it brakes a fall to ≤1.6 m/s | soft landings |
| Not | indoors, underground, under anything overhead, as Zoé or in the borrowed coat, in Normal/Aggressive/Discreet; doors wait until he lands; dialogue, menus, a fade, a hit or death put it out and it needs a fresh press | |

HUD: a slim gauge beside Twinsen while it fires or refills (blue, amber when low, red and shaking when empty, ✕ when it
can't fire there); the bead on top of the pack shows the same colours. Sounds: short synthesised bursts only (nothing
keeps sounding through a pause or a dialogue). Particles: one puff per 0.06 s from the shared pool, dust near the ground.

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
- LBA1's rooms (open in every chapter): FunFrock's asylum on Citadel (ASYLUM-2: the project's workers' hostel), after
  the prologue and in chapters 1–2 only: two of Vesk's guards (a Quetch, a Grobo) on his store under it; the Temple of Bù's dark halls: six
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

`tests/controls.mjs` (CTRL-1 part) measures by input, at 60 fps, 30 fps and with intermittent long frames: the turn
rates and a one-frame tap, start / stop / back-step speeds per behaviour, walls (no walking on the spot; sliding), the
ball's touch-down per behaviour (Classic) and at near / far / out-of-range aim points (Modern) with the preview, the
automatic aim at an enemy (kept), and the camera on an open route (frame box, lead / lag, acceleration, yaw,
stillness), hidden behind a tower, and on stairs. Every number is printed on a MEASURE line.

`tests/arsenal.mjs` covers the arsenal: each weapon and gadget obtained and used by input, its effect measured,
ammunition and costs, Save & quit → Continue, and a format-3 save's migration. `tests/jetpack.mjs` covers the hop-pack:
acquisition, flight, fuel, the test step, the mill, every boundary, interruptions, saves, a low frame rate and its cost.

Not verified: feel with a real gamepad and touch screen; the feel of the tank controls and the camera by hand (only
measured); audio balance by ear; real-GPU frame rate.
