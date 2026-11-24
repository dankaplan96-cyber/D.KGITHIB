# LBA3-RUN — sound (lba3-sound, wave 3)

Base: branch `ccr-c1c2c4b9-dep6ed` at `eb5928b0` (the wave 2 checkpoint). Work: this worktree's commits `aeae8689`
(scene pause fade), `a12fa809` (combat music under the pause), `61264ab0` (eight voices). Owned: `src/engine/audio.js`,
`voice.js`, `voiceplan.js`, `music.js`, the music files, `tools/music`; one line outside them, in `src/main.js`
`setState` (the hold, below).

**What kind of evidence this is.** Everything here is **automated** (headless Chromium 153, SwiftShader, no audio
device: Chromium's fake output at 44.1 kHz) or **inspected** (code, decoded files). **Nothing was played by a person
and nothing was heard: hardware playback is untested** — no speakers, no laptop, no Windows mixer or driver. The
"recordings" are the game's own output, taken inside the browser: an AudioWorklet tap (float32, sample-exact) on four
points of the graph — `out` (after the master and the pause fade: what goes to the speakers), the music bus, the voice
chain after its limiter, and the effects stage (`fxDuck`) — while the game runs in real time (frames stepped by the
wall clock, drawing off, as the opening agent did), with a timeline of every `play()` ask, every voice line, the
music's own log, every buffer-source start and the context's output timestamps.

## Results by checklist item

| Item | How | Result |
|---|---|---|
| Ball throw, return, hit | the developer yard, real ball key: open floor, wall, a guard, the dummy (`r1/ball`) | Each event one sound: `throw` ×4, `bounceStone` ×7, `bounceWall` ×2 (a third merged inside its 50 ms gap: one contact), `ballHit` + the material (`hitFlesh` on the guard, `hitWood` on the dummy), `ballReturn` ×4, `catch` ×4 (one per throw). No sound twice within 30 ms, no clipping (out peak −10.7 dBFS), no step or gap in the output. |
| Item pickup | kash run of six, heart, flask, clover, a found object (`r1/picks`) | All ten sounded, the kash run as six takes (climbing), each pick its own; out peak −12.9 dBFS. |
| Music loop | every file decoded by Chromium at 44.1 and 48 kHz and each looping piece rendered across its seam exactly as the game plays it (`seam.mjs`); in the game: Combat and Home cued 6 s before their loop ends, the music bus nulled against the decoded files (`r2/seam`, `nulltest.py`) | **No bad seam.** Offline: at every seam the largest 2nd difference within 3 ms is at most 1.43× the 99.9th percentile of the half-second before it (no click), at both rates; no file clips (peaks 0.51–0.82), lengths match the manifest, one-shot pieces end in silence. In the game: residual against the files **−137 dB** (bit-exact) through both seams; worst quantum −33 dB, at the recording's first block. |
| Conversation | six turns, three speakers, the game's own lines, the box on Auto, over Home (`r1/convo`) | **One planned utterance per line** (9 lines → 9 plans; the typing never restarts a syllable — `Babble.chars` plans the whole line on its first character). Music ducked ~6 dB for the whole talk and back after. Delivery varies: f0 range per line 9–27 semitones (a rough autocorrelation track; octave slips inflate the top), the contours rise or fall differently, clause pauses 110–430 ms; the same line said twice came out different (cross-correlation 0.14). Every Expressive clip in all 35 banks starts and ends silent (edges ≤ 0.04 % of the clip's peak, at 44.1 and 48 kHz): slicing them can't click. Steps the detector flagged in the voice are consonants (inside voiced syllables at 0.06–0.46). |
| Pause / resume | in play (house), in a story scene (the notebook opening, `opening_nb`), in a fight | In play: the music goes on under the menu, nothing clicks. **Story scene: a click at every resume — fixed** (below). **Fight: the combat music was handed back under the menu and returned after it — fixed** (below). |
| Busy fight | nine yard enemies fighting, sword, ball, dodges, 32 s, a 5 s pause in the middle (`r1/fight`, after: `r4/fight`) | 140–165 sounds in 34 s, at most 8 at once, none dropped, a few merged inside their gaps; out peak −8 dBFS; the music bus bit-exact against the files (−137 dB) under it all. |
| Busy fight, every slider at full, a shout every 4 s | music, effects and voice at 1.0 (`rmax/fight`, `rmax/convo`) | **No clipping**: out peak −0.73 dBFS (7 samples over −1 dBFS), conversation −1.17 dBFS. Headroom is thin at full sliders but holds (the master's fixed 0.8 and the two limiters). |
| Clipping / underruns / duplicates / seams told apart | per recording: samples at full scale on `out`; the output clock against the wall clock and the context's frame count (a skipped block shows as a gap in every tap at once); buffer sources of one buffer started twice at once, a line planned twice, one effect twice in 30 ms; seams as above | **Clipping 0** anywhere. **Underruns: none attributable to the game** — two 81 ms skipped blocks in 15 recordings, both within 0.2 s of creating the recording taps (most likely the harness; one also while the combat piece was decoding), and single odd output timestamps (filtered); no stall of the output clock otherwise. **Duplicates 0** (music never more than two voices: a crossfade). **Seams 0.** Headless numbers only: the laptop's own crackle history (I-8, MUSIC-CRACKLE) stays unreproduced. |
| New cues | `wheelJoint` (THE SECOND SHIFT's barrow over the joint) and `opening_nb` | `wheelJoint`: 50 ms loudness −30.1 LUFS offline (with kick, catch, zap; peak −19 dBFS); in the house mix its loudest 50 ms (−22.4 dBFS) is above the music's (−24.2), so it reads; in chapter 16/12 it plays under the narrator's caption, which has no voice (only the effects' −4 dB duck). Distinct from the near miss (`thump`, 9 dB louder) as designed. `opening_nb`: decodes clean (peak 0.59, starts and ends silent, 93.37 s as the manifest), starts at the scene's 0.6 s with its 1.8 s fade, ducked from −27.8 to −32.7 dB under the scene's lines. |
| Cues against speech and music | every effect rendered offline with the game's own chain at default settings (`sweep.mjs`); the mix in the house with and without a line over it (`r2/mix`) | Under a line the effects sit 20–27 dB below the voice (−4 dB duck): **no cue drowns speech.** Against the music (−24 to −26 LUFS at the output, −30 to −32 ducked) the outcomes and hits reach the music's 50 ms level (`found` −20.4, `hurt` −25.9, `lever` −25.8, `clang` −25.4 LUFS); small repeated sounds stay under it (`throw` −34.9, steps −40 to −42, `tick` −39.8) — the ACTION-SOUND balance the user heard on 16.11 (P24, +3.5 dB). No change. |

## Fixed (game-wide)

1. **A click at every resume of a story scene** (`audio.js`, PAUSE-FADE). Measured in the game's output: the fade-out
   was a clean 20 ms, but on resume the output went from silence to **86–88 % of its level in one sample**, then
   crept to 100 % over 20 ms. Cause: the fade-in's `linearRampToValueAtTime` ran from the *previous event* — the end
   of the fade-out — across the ~120 ms rendered silent before the suspend, so it was mostly done by the first audible
   frame. Now `_ramp` sets the value at its own start (worked out from the last fade) before ramping, the fade-in is
   put on the stopped clock before `resume()`, a fade asked while the context runs starts 20 ms ahead, and a resume
   asked while the suspend is on its way resumes as soon as the suspend lands. After: 0 → 1 linearly over 20 ms from
   the first frame (0.013 at 0.5 ms, 0.5 at 10 ms). Sweep: every other ramp in `src/` (`grep linearRamp|exponentialRamp
   |cancelAndHold`: audio.js, voice.js, music.js, townbusy.js, townbits.js, main.js's title sting) sets its start
   value first or uses `setTargetAtTime`; `_ramp` was the only one without. Covers every story scene's pause, lost
   focus and resume in every chapter (all go through `Cinematic.pause/resume`). `tests/voices.mjs` PASS (the fade
   before the suspend, suspended in 163 ms ≤ 200, gain 1 after resume).
2. **The combat music dropped out under the pause menu** (`music.js`, `audio.js`, one line in `main.js setState`).
   The combat watchdog treats 2.5 s without `setCombat` as the fight being over (meant for dialogue, scenes, game
   over); the pause menu stops `setCombat` too: 3.3 s into a 5 s pause the combat piece crossfaded to the yard's
   piece over 2.8 s, and 1.0 s after resume crossfaded back. Now the game holds the music in the states where a fight
   is frozen and goes on after — `pause`, `map` (holomap), `inventory` — and the 2.5 s count restarts on letting go;
   dialogue, scenes, shops and game over hand back as before. After: no music change across the pause
   (`r4/fight`). Every fight in every chapter. `tests/music.mjs` PASS.
3. **Eight speakers had no voice of their own** (`voice.js`; `tests/voices.mjs` "every named speaker has an own voice"
   was FAIL before this wave). `bl_fennick`, `bl_garrow`, `bl_odra` (Nan Odra), `bl_jory` (chapters 12–13, the
   expansion) and the spaceport apron's `rhun`, `pema` (Ambo), `kesa`, `brin` fell back to a voice made from the
   name's hash with a coin-toss sex. Each now has one fitted to the character (look, lines, age); all 248 named
   speakers have their own, no two alike, each distinct from the others in the same place. **An audible character
   change (P107): listed for the user's pick.** Sweep: the suite's own check over every `n_*` key in the text.

## Before / after recordings (scratchpad, not in the repo; 44.1 kHz WAV of the `out` tap)

Folder `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-sound/`:
- `ab/scene-pause-resume-BEFORE.wav`, `ab/scene-pause-resume-AFTER.wav` — the notebook opening at its 24 s, paused
  3 s and resumed (the suspend is not in the file: the context stops; the resume is at 2.14 s).
- `ab/fight-pause-BEFORE.wav`, `ab/fight-pause-AFTER.wav` — the busy fight with the 5 s pause at 4.4 s.
- Whole recordings (`out.wav` in each, with `timeline.json` and `report.json`): `r1/ball`, `r1/picks`, `r1/convo`,
  `r1/pause`, `r1/fight` (before), `r2/seam`, `r2/opening` (before), `r2/mix`, `r4/opening` (after), `r4/fight`
  (after), `rmax/convo`, `rmax/fight` (sliders at full).
- Tools: `rec.mjs` (taps and timeline), `arena.mjs`, `convo.mjs`, `opening.mjs`, `cues.mjs` (scenarios),
  `analyze.py`, `nulltest.py`, `seam.mjs`, `voicebank.mjs`, `sweep.mjs`, `late.mjs`, `gaincurve.py`.

## Not changed, for the coordinator

- **Effects asked at `currentTime` can start late** (inspected + a bare-context probe, `late.mjs`): with the game's
  80 ms buffer, 6 of 150 pings asked from timers landed 5.8–11.6 ms in the past and began at full level (their 3–4 ms
  attack skipped: a small click on a sound that is itself a hit or a knock); with a 30 ms lead, 1 of 150. Not seen as
  a defect in the game's recordings; on a busy laptop the share would grow with the audio thread's load. A fix is a
  15–20 ms lead in `play()` — 15–20 ms more latency on every effect. A trade the user's ear should judge; not done.
- **The voices sit ~20 dB over the ducked music in a conversation** (voice lines −13.5 dBFS RMS on the voice bus,
  music −33 under them): the user's own mix (VOICE-MIX, VOICE-MIX-2: "too quiet" twice). Recorded, not changed.
- Narration, signs and notes (no voice) type with a quiet `blip` every third character (`hud.js`): not a voice and
  not changed.
- No loudness or limiter change was made: no "Decision for the user" from this wave.

## Remaining uncertainty

- **Hardware playback untested**: the user's laptops (UHD 620 at 59.9 Hz; the Ryzen/Vega laptop of MUSIC-CRACKLE),
  their output rate (48 kHz there, 44.1 here), Windows' mixer and drivers. Underruns depend on that machine; here the
  audio thread was never short. Whether the resume click was audible on speakers, and whether the new voices please,
  only a listen can tell.
- The recordings run with drawing off; a real frame's GPU and main-thread load may change the audio thread's timing.
- Chapters touched: every chapter's story scenes (pause fix), every fight (combat hold), chapters 12–13 and the
  spaceport apron (voices). The music files, the motifs and the Expressive banks are unchanged.
