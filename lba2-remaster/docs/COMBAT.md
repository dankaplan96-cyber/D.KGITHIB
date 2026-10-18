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
    without magic it returns at its first contact. A ground bounce restarts the arc with the behaviour's own Vy
    (LBA2's skips; a throw at a target: from at least 2.5 m/s, as before); walls reflect it. Water returns it. It
    returns at about 10 m/s, speeding up (+22 m/s²) so a far miss comes back quickly.
  - How far and how high: "The ball's throw" below (each behaviour its own LBA2 arc; Modern aims at a point; the
    automatic aim at enemies kept).
  - Its colour shows the magic level: yellow, green, red, and at level 4 the fire ball.
  - It brings back a bonus it touches (coins, hearts, flasks, clovers, keys, crystals).
  - Damage: the magic level (at least 1), +1 when charged (LBA2: 10/20/30/40 by level).
  - Each target is hit once per throw. A quick throw returns after its first hit. A charged throw ricochets on
    to the next visible enemy within 8 m.
  - The return never damages. Recall works after 0.2 s.
  - It can't be lost: a 4.2 s flight limit (Discreet's four tall hops take ~3.8 s), a 2.5 s return limit, and a
    reset on every scene change.
  - A full charge needs magic (the throw's 1 point). While charging, dots follow the whole first arc and a small ring
    marks where it will first touch down (the same plan the throw uses). Magic regenerates slowly (ours; the
    original refills only from flasks and givers).
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
  same clock as the pose. Charging allows a slow aimed walk (×0.42).
- **Attack director:** at most 2 enemies may be winding up or attacking at once (Gentle 1, Hard 3). Enemies
  can't start an attack for 1.2 s after a scene change (0.6 s after dialogue).
- **Difficulty** changes damage taken (×0.5 / 1 / 1.5), wind-up length (×1.3 / 1 / 0.85) and cooldowns,
  never enemy health.
- **Hit-stop:** 45 ms on a hit, 85 ms on a heavy hit (actors only; input is still read). Camera shake follows
  the existing Shake setting.

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
- The end is LBA's blink (faster and faster), a puff of stars, and the body, its shadow, its tells and its dropped
  rifle are taken out of the scene. Nothing waits for it: the player is never locked. The pause freezes it; a
  dialogue lets it land (only knock-outs move during a dialogue); leaving the place, or the story changing the cast,
  lets it finish on its own clock; a reload brings a saved kill back as gone.
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
| Lift | at most 2.4 m above the take-off ground and above the ground under him (a jump: ~1.8 m) | one storey; no climbing a stack of ledges or a slope in one flight |
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
