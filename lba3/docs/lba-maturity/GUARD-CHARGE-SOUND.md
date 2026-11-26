# GUARD-CHARGE-SOUND · the user's pick 26.11: the guards' rifle aim gets its own sound

**Fault (automated).** A guard's rifle tell (`guards.js`, state `aim`: the violet aim line brightening for `tune.tell` ×
the difficulty's wind-up) played no sound at all; `zap` only at the shot. The ear got no warning before a guard's bolt
(found by DRONE-CHARGE-SOUND.md).

**Fix.** A new sound, `guardCharge` (`src/engine/audio.js`, WebAudio synthesis like every other effect; no recordings),
held with `audio.held()` like the drone's `droneCharge`. A rifle powering up, not a buzzing drone:
- a dry two-part click as the rifle comes up (a bright tick, a lower one 45 ms later);
- then a smooth, low rising tone: a sine, a soft sawtooth under a low-pass that opens as it climbs (240 → 1200 Hz), and a
  quiet sub an octave below, 90 → 270 Hz on a charging curve (fast at first, settling toward the top). No flutter, no
  crackle (the drone: 170 → 510 Hz, even climb, 16 → 38 Hz flutter, crackle);
- it swells from 0.4 to full at 90 % of the tell and is silent at its end, so the shot's `zap` (unchanged) lands on silence.
- The Grobo guard and the FunFrock trooper (`grobo`) take it a tone lower (× 0.89).

| | |
|---|---|
| Event | the guard's state becomes `aim` (once per aim: `Guard._chargeSync`, not per frame) |
| Length | the tell: `tune.tell` (0.8 s; a guard's own `def.tune`) × the difficulty's wind-up (× 1.3 Gentle, × 0.85 Hard) |
| Stops | at once when the aim ends by any way: the shot (rifle lowered, `recover`), lost sight, jammed or no clear shot (abort), a hit (stagger/half-turn), the pulse, beaten, stood down (`standDown`), sent away (`setPresent(false)`), a scene change (`resetCombat` → `cutHeld()`); 25 ms fade. A brace on the armour does not end the aim, so the charge goes on |
| Place | positional like the other enemy sounds (level by distance, side by camera), follows the guard |
| Mix | pri 3 (a telegraph: never thinned or skipped for distance), gap 0, pitch ±1.2 %, level ±0.5 dB |
| Level (offline, 0 m, default sliders, dry) | peak about -33.9 dBFS, 50 ms loudness about -35.6 dB; the zap: -24.3 dBFS, -30.1 dB. In play (5.2 m, room): charge -34.5 / -37.3, shot -28.9 / -35.8 |
| Cost | per aim 3 oscillators, 2 noise one-shots, ~10 nodes, released at the tell's end; aims are limited by the attack director |

**Sweep (every rifle guard).** Only `Guard` has the `aim` state; `createEnemy` makes a `Guard` for kinds `guard`
(Quetch), `guardG` (Grobo) and `fclone` (FunFrock trooper), so every guard in every chapter takes it. The guard dog
(`GuardDog`) has no rifle. Story code that changes a guard's state directly (`depotwatch.js` calm-down, `network.js`
stand-down) is caught by the sync at the start of the guard's next update or by `standDown()` itself.

**Not changed, reported.**
- The mite's wind-up and ice slide, and the crawler's slam wind-up, still open with `zap` (the shot sound).
- A dialogue that starts mid-aim freezes the guard (enemies are not updated in `dialog`); the charge plays to its end
  and the shot after the dialogue has no charge before it. The drone has the same behaviour. Not changed.

**Tests (automated runtime only, SwiftShader).**
- `SERVE=1 node tests/guard-charge.mjs` (new): 28/28 PASS. For each kind (Quetch, Grobo, trooper): one charge per aim,
  no zap at its start, 0.8 s; the heavier two low. Gentle 1.04 s, a guard's own 1.1 s tell. One zap at the shot with the
  charge stopped in that step, never longer than the time to the shot. Panned right and at its distance for a guard to
  his right. Cut in the same call when hit, pulsed, sent away, stood down, beaten; in the next step for lost sight and a
  scene change; no zap after any cut. Offline: a click at the start, swells to its end, silent from the shot on
  (< -90 dBFS) and 30 ms after a cut, quieter than the zap (peak and 50 ms), lower than the drone's charge
  (zero-crossing pitch about 223 vs 295 Hz) and smooth (level flutter 0.2 vs 0.47).
- `SERVE=1 node tests/combat.mjs`: 84/84 PASS. `SERVE=1 node tests/action-sound.mjs`: 21/21 PASS.

**Listening file.** `captures/guard-sound/before-after-loud.wav` (10.15 s, 48 kHz stereo;
`tools/guard-charge-listen.mjs`), rendered offline with the game's own engine (BEFORE: `audio.js` before this change;
AFTER: this one), the source 5.2 m ahead and a little right, the whole file scaled +24.9 dB so its peak is -3 dBFS
(the order of loudness inside it is the game's). Layout: BEFORE guard, silent aim (aim 0.35 s, shot 1.15) · 1 s ·
AFTER guard (2.70, 3.50) · 1 s · AFTER heavy guard (5.05, 5.85) · 2 s · the drone's new charge for comparison (8.40,
9.15). **Nobody has listened to it.**
