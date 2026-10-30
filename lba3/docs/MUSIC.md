# LBA3: The Awakening — original soundtrack

All music in the game is original and was written for this fan project. No melodies, recordings,
MIDI transcriptions or arrangements from the Little Big Adventure soundtracks were used or consulted.
Philippe Vachey's LBA2 score is a reference for *character* only, in the general terms it is usually
described in: melodic, orchestral, adventurous, warm and mysterious.

## Honest status

* **Rendered, not recorded.** Every track is rendered from the score with FluidSynth and the
  MuseScore_General General-MIDI soundfont (the three MUSIC-2 pieces with its larger HQ edition, see "Sources"),
  then given a synthetic room, EQ and mastering. That is
  **draft orchestral quality**: sampled single notes, no real ensemble playing, no real room.
* **Nobody has listened to it yet.** The soundtrack was written and produced in an environment with no
  audio output. Everything below about loudness, peaks, loops and spectra was *measured*; the musical
  result (balance between instruments, how the patches really sound, whether a phrase works) is
  **unverified by ear**. Please listen before treating any track as final; every track is marked draft.
* What would improve it most, roughly in order: listening passes and mix fixes per track; rendering the
  same MIDI (in `art/music/midi/`) with a better orchestral sample library (e.g. a commercial or free
  orchestral library in a DAW, or the larger MuseScore_General-HQ); and eventually live players for the
  solo lines (clarinet, flute, horn) — the scores are plain MIDI and readable Python, so they can be
  handed to anyone.

## The three themes

Written out in `tools/music/themes.py`; every track either quotes or develops them.

| Theme | Character | Shape | Where it changes |
|---|---|---|---|
| **Home** (family, the house, Zoé, Arthur) | warm, simple, F major 3/4 | a dotted falling third (mi-re-do) answered by an upward sixth that sighs back down; the second phrase reaches an octave higher | Home, quoted in Citadel Village, as *hope* on a horn in the Finale, in D minor in Revelation (what the danger means for the family), in full orchestra in Homecoming |
| **Adventure** (exploration, travel, victories) | curious, optimistic, D major 4/4 | the long-short dotted step at the start of each bar, a leap up a fourth, a rising third; the answer climbs and cadences 3-2-1 | Main Theme, Island Exploration (main version), in E minor in Combat and the Finale's battle, bent into 7/8 lydian on Zeelich, in Bb in Baldino's Workshop, as a broad **waltz** in Homecoming, in major over the Entity cell in the Finale |
| **The Entity & the project** | wonder → trouble → resolution | the cell D-A-B-G#: up a fifth, up a step, down a minor third onto the raised fourth; long-short-short-long | lydian *wonder* in the Main Theme and The Well; *troubled* (same cell over Dm6/Bb7, continuation bent a semitone) in Energy Facility, Revelation, Combat and the Finale; *resolved* (the G# finally rises to A) at the climax of the Finale and in Homecoming |

## Tracks

All tracks: status **draft** (rendered with the MuseScore_General GM soundfont, unverified by ear).
Durations are of the file; the loop region is `loopStart`–`loopEnd` in `assets/music/manifest.json`.

| Track | Scene / mood names | Duration | Loop length | Key, meter | Files |
|---|---|---|---|---|---|
| Main Theme | title screen (`title`) | 2:06 | 1:32 (loop starts 33 s in, after the intro) | D, 4/4 | `assets/music/main_theme.mp3`, `art/music/masters/main_theme.flac`, `art/music/midi/main_theme.mid`, `tools/music/tracks/main_theme.py` |
| Home | Twinsen's house, lighthouse lamp room (`home`, `house`) | 2:03 | 1:52 | F, 3/4 | `home.*` |
| Citadel Village | town, harbour (`citadel`, `calm`, `clear`, `village`, `harbour`); muffled inside town buildings (`office`) | 2:29 | 2:13 | G, 6/8 | `village.*` |
| Island Exploration | Citadel island away from the village (`island`) | 2:26 | 2:13 | D, 4/4 | `island.*` |
| The Well | the well cave; underground places until chapter 3 has its own (`well`, `cave`, `storm`, `under`, `underworld`) | 2:26 | 2:11 | D lydian, 4/4 | `well.*` |
| Baldino's Workshop | the workshop (`workshop`) | 2:01 | 1:48 | Bb, 4/4 | `workshop.*` |
| Zeelich | the Zeelich region (`zeelich`) | 2:20 | 2:06 | E lydian, 7/8 | `zeelich.*` |
| Energy Facility | project station in the fort, control room (`station`, `control`, `facility`) | 1:55 | 1:43 | D minor, 4/4 | `facility.*` |
| Energy Facility (stealth mix) | project office, Zoé sneaking (`stealth`) — same performance without brass, drums and synth bass; switches in sync with the full mix | 1:55 | 1:43 | | `facility_stealth.*` (no MIDI of its own) |
| Danger | combat, entered automatically (`combat`) | 1:30 | 1:20 | E minor, 4/4 | `combat.*` |
| Revelation | story cue, one-shot (`audio.cue('revelation')`) | 1:17 | — | D, 4/4 | `revelation.*` |
| Finale | chapter 3 finale / boss (`boss`, `finale`) | 1:49 | 1:36 | D minor → D, 4/4 | `finale.*` |
| Homecoming | ending screens, credits (`ending`, `credits`, `homecoming`) | 2:49 | 2:31 | F, 3/4 | `homecoming.*` |
| Opening | the new-game opening scene, one-shot (`audio.cue('opening')`), written to the scene's clock (each section starts on its shot; see the score header) | 1:29 | — | F, 3/4 | `opening.*` |
| Market Day (MUSIC-2) | Citadel town and harbour, second piece of the `citadel` playlist (also heard muffled in town interiors) | 2:56 | — (one pass, ends) | A, 4/4 | `village_b.*` |
| Sea Wind (MUSIC-2) | the open island, second piece of the `island` playlist; first piece of the Desert's | 3:00 | — (one pass, ends) | E dorian, 12/8 | `island_b.*` |
| Cloud Gardens (MUSIC-2) | Zeelich (Esmer, the floating islands, its interiors), second piece of the `zeelich` playlist | 2:47 | — (one pass, ends) | A mixolydian, 4/4 | `zeelich_b.*` |

Each score file starts with a section plan (bars, instruments, what happens to the themes).

## How the music is made (pipeline)

```
tools/music/
  score.py      the score DSL: notes as text bar by bar ("A4:q. G4:e F4:q | D5:h C5:q"), dynamics and
                hairpins, chord symbols, voicing / arpeggio / bass helpers, humanisation, loop layout, MIDI
  themes.py     the three themes
  tracks/*.py   one score per track (song() -> Song)
  synth.py      renders a score with libfluidsynth (ctypes), sample-accurately
  render.py     stems -> synthetic room (convolution) -> EQ -> loudness -> true-peak limiter -> FLAC + MP3
  build.py      build all or some tracks, update assets/music/manifest.json
  lint.py       parse every score (bar lengths, chords) without rendering
  check.py      technical QA of the MP3s as a browser would decode them (+ optional spectrogram plots)
```

Setup and build (from `lba3/`):

```sh
python3 -m venv tools/music/.venv && tools/music/.venv/bin/pip install -r tools/music/requirements.txt
sh tools/music/fetch_soundfont.sh              # MuseScore_General.sf2 (215 MB, git-ignored)
tools/music/.venv/bin/python tools/music/build.py            # every track (~5 min)
tools/music/.venv/bin/python tools/music/build.py well home  # some tracks
tools/music/.venv/bin/python tools/music/check.py [--plots DIR]
```

Needs `ffmpeg` (libmp3lame) and `libfluidsynth` on the system. Builds are deterministic: rebuilding a
track reproduces the same MIDI, FLAC and MP3 bit for bit.

* **Writing**: melodies and harmony are written by hand in the score files. Accompaniment helpers
  (`pad`, `arp`, `bassline`) realise *written* chord symbols with closest-motion voice leading and a
  written figure — nothing is chosen at random. Humanisation is small and seeded (timing ±6 ms typical,
  velocity ±3), legato lines overlap by 35 ms, staccato shortens, long notes swell.
* **Expression**: the MuseScore_General "Expr." presets (bank 17) take their dynamics from CC2; the score's
  dynamics and hairpins become CC2 curves (plus a small swell on long melody notes), other instruments
  use velocity and CC11.
* **Rendering**: three stems per track (front: soloists, mid: strings/harp/rhythm, back: brass/percussion)
  are rendered separately and get different amounts of a synthetic room (decaying stereo noise with early
  reflections, different decay per band; `make_ir` in render.py), then summed, EQ'd (32 Hz high-pass,
  a small cut around 260 Hz, a small lift around 3 kHz), normalised to the target loudness and peak-limited
  (offline look-ahead limiter on 4x oversampled peaks, ceiling −1.5 dBTP). Masters: 48 kHz 16-bit FLAC
  (dithered). Runtime: MP3 112 kbps stereo 48 kHz (MP3 because the publishing host only serves
  mp3/ogg/wav/webm and Safari lacks Ogg Vorbis).
* **Seamless loops**: a looping track is rendered as `[intro][body][the first bars of the body again]`.
  Both loop points sit a few bars inside the body (`loopStart = bodyStart + seam`, `loopEnd = bodyEnd + seam`),
  where pass 1 and pass 2 are sample-identical — same events on the same sample grid, and every stage after
  the synth (room, EQ, limiter) is time-invariant with a memory shorter than the seam offset. So the reverb
  tail of the end of the loop is already "folded" into the audio after `loopStart`; nothing is cut off.
  The file continues 1 s past `loopEnd`, so MP3 frame padding never reaches the seam, and an encoder or
  decoder delay shifts both points together. Two details made this exact: events are scheduled by
  `synth.py` on a 64-sample grid computed in exact rational arithmetic (FluidSynth's own MIDI-file player
  drifts by a block at large absolute times), and humanised times are quantised to MIDI ticks before the
  body is copied. `score.py` warns if a note from an intro would still be sounding at the seam.

## How the game plays it (music manager)

`src/engine/music.js` (used through `src/engine/audio.js`):

| Call | What it does |
|---|---|
| `audio.setMood(name)` | base music for the place. Names are mapped by `MOODS` in music.js (table above); the long-stay places map to a **playlist** (below). Asking for what is already playing does nothing (no restart); a mood can be a variant (`office` = the town playlist at −4.4 dB through a 1.1 kHz low-pass) which is reached by a ramp, not a restart. `null`/`silence` fades out. |
| `audio.setOutdoorArea(pos, POI)` | outdoors on Citadel: village/harbour → `citadel`, fort → `station`, elsewhere → `island`; 10 m of hysteresis on the village border |
| `audio.setCombat(level)` | called every frame by the game with its smoothed threat level (0..1). Combat music starts after 1.2 s of sustained threat (≈1.7 s after a chase begins, with the game's smoothing) and hands back after 3.5 s of calm; if the game stops calling (dialogue, cutscene, game over) for 2.5 s, combat ends |
| `audio.cue(name)` / `audio.endCue()` | story cue over the base music; a one-shot cue returns to the base music when it ends; base changes meanwhile are remembered. `title`, `ending`, `credits`, `boss`, `finale` end a running cue |
| `audio.duck(on)` | music to 0.5 (−6 dB, VOICE-MIX) under dialogue (0.25 s down; back up over 0.9 s, 0.45 s after the last line so consecutive lines do not pump). (Until MUSIC-2 `AudioEngine` defined `duck` twice and the later one, 0.55, was in force: VOICE-MIX's 0.5 never applied. One definition now; the music bus stays at the slider value.) |

* **Playlists (MUSIC-2)**: the places the player stays in rotate through pieces instead of looping one track
  (`PLAYLISTS` in music.js): Citadel town and harbour `village` ↔ `village_b`; the open island `island` ↔ `island_b`;
  Zeelich `zeelich` ↔ `zeelich_b`; the Desert `island_b` ↔ `island`; the Hamalayi `well` alone (until it has a piece of its
  own). Each piece is played **once, to its end**: a looping render to the end of its body (it fades over its last
  6 s, the link back to the top, which thins out in every score), a MUSIC-2 piece to its last note. Then
  **outdoors a silence of 20–60 s** (uniform; ambience, surf and wind go on), and the next piece of the list starts from
  its first bar; **indoors** (and in the Zeelich interiors that use the playlist) the next piece follows at once.
  Rooms that hear the outdoor music through their walls (`office`) follow the outdoor silences. Arriving in a place
  starts a piece **at a phrase start chosen at random** (bar 1 or the first bar of an 8-bar phrase in the first 60 %
  of the piece; manifest `bars`, `bodyBar`, `phrase`), so the town does not always greet the player with the same
  bar; coming back within 150 s resumes where it was; later the next piece of the list starts. The first piece of
  each list on a new session is chosen at random. Combat interrupts a piece or a silence as before; after the fight
  a silence that is still running goes on (no piece is forced in). Story cues are unchanged.
* **Crossfades**: equal-power (sin/cos, written as linear segments so a fade can be interrupted at any
  point): 2.6 s between places, 1.1 s into combat, 2.8 s out of combat, 1.8 s for cues. A change of place (a
  `setMood` that changes track) waits for the old track's next bar line (manifest `bars`; at most 3.2 s, else at
  once) so the crossfade starts on the beat; the new piece starts on a bar line too (a phrase start, or where it was
  left). Combat and cues do not wait.
  Never more than two tracks audible: an older track still fading out is hurried out in 0.4 s.
  Going back through a door while the old track is still fading revives it instead of restarting it.
* **Resume**: a looping track left less than 150 s ago resumes where it was (after combat, after a cue,
  in and out of a house). Tracks with the same `group` (facility / facility_stealth) switch in sync.
* **Loading**: `manifest.json` is fetched when audio starts; tracks are fetched and decoded on demand
  (`decodeAudioData`), the next likely track is prefetched 4 s after a track starts (a playlist piece: the next piece
  of its list, then the combat music), and nothing blocks the game: the previous music keeps playing until the new one
  is ready. At most 3 decoded tracks are kept (a decoded 3 min stereo track is about 69 MB at 48 kHz).
  `window.LBA_MUSIC_URL` overrides the folder.
* **Autoplay**: the first click / key / touch anywhere starts the AudioContext (the title theme then
  starts); the game's own `audio.init()` calls still work.
* **Volumes** (settings, saved): Music, Sound Effects, and Voice (a bus reserved for future voice acting).
  SFX and ambience remain procedural WebAudio as before.
* **Silence**: `setMood('silence')` (or a mood mapped to `null`) fades out; nothing currently uses it, but
  rooms can (set `R.music = 'silence'`).
* Debug: `game.audio.music.state()` returns the base mood, cue, combat flag, the playlists (current piece, started,
  seconds of silence left), playing voices with gain, position and seconds to the end of their piece, decoded tracks
  and a short log. `game.audio.music.finishPiece()` ends the current playlist piece now (tests);
  `game.audio.music.gapRange` sets the silence range (tests shorten it).

For chapter 3: moods `under`, `cave` (The Well for now), `boss` (Finale), `home`, `ending` (Homecoming) are
mapped; a room's `R.music` takes any mood name or a track name from the manifest directly.

## Technical checks (measured, not listened)

From `tools/music/check.py`, on the MP3s decoded with ffmpeg (as Chrome decodes them):

| Track | Integrated loudness (loop body) | True peak (MP3) | Loudness range | Seam error / MP3 coding error | Seam click ratio |
|---|---|---|---|---|---|
| main_theme | −16.8 LUFS | −1.6 dBTP | 16.1 LU | −28.1 / −22.5 dB | 0.63 |
| home | −18.4 | −5.6 | 7.3 | −36.1 / −25.3 | 0.45 |
| village | −17.4 | −3.2 | 13.0 | −26.3 / −23.2 | 0.44 |
| island | −17.4 | −2.9 | 8.0 | −29.2 / −21.7 | 0.32 |
| well | −18.4 | −4.1 | 11.8 | −36.4 / −24.8 | 0.59 |
| workshop | −17.3 | −3.1 | 13.8 | −50.2 / −24.5 | 0.10 |
| zeelich | −17.4 | −2.7 | 5.3 | −39.4 / −22.2 | 0.61 |
| facility | −17.1 | −1.9 | 17.6 | −26.0 / −19.8 | 0.24 |
| facility_stealth | −18.8 | −4.6 | 13.1 | −38.8 / −25.5 | 0.31 |
| combat | −16.9 | −2.5 | 14.6 | −32.1 / −24.1 | 0.50 |
| revelation (one-shot) | −18.0 | −1.7 | 19.5 | — | — |
| finale | −17.0 | −4.6 | 8.2 | −26.8 / −22.4 | 0.37 |
| homecoming | −17.3 | −1.7 | 13.1 | −28.5 / −24.4 | 0.54 |
| village_b (MUSIC-2, one pass) | −17.4 | −2.6 | 11.0 | — | — |
| island_b (MUSIC-2, one pass) | −17.9 | −5.4 | 6.4 | — | — |
| zeelich_b (MUSIC-2, one pass) | −17.9 | −4.4 | 7.3 | — | — |

* Loudness targets: −17 LUFS (combat, main theme, finale −16.5; quiet beds home, well, revelation −18;
  stealth mix −18.5). All tracks are within −16.8…−18.8 LUFS integrated after MP3 encoding.
* True peak ≤ −1.5 dBTP on every decoded MP3 (target ≤ −1). The limiter acted on 4 tracks by at most 1.5 dB.
* Loop seams: in the FLAC masters the two sides of the seam match to −69…−79 dB (the 16-bit dither) —
  before dithering they matched to ~1e-5 or better. In the MP3s the seam error is always below the MP3's own
  coding error at the same spot, and the largest sample step across the seam is smaller than the typical
  large steps around it (click ratio < 1): no click, gap or cut reverb is measurable.
* Spectral balance (share of energy 250 Hz–2 kHz): 58–90 % per track — music stays present on small
  speakers. Combat and Facility are deliberately light above 2 kHz (1–2 %) so the game's bright alert /
  zap / hit cues stay audible. The Well has the most sub-bass (14 %, its low D pedal).
* In the game (headless Chromium driven by Playwright test scripts, not committed): the title theme starts on the first
  click; new game → Home; village, open island, fort/control room, project office (stealth mix switched
  in sync, 30 ms apart), well, office (village muffled, not restarted), Zeelich moods; repeated mood
  requests keep the track playing; a real mite chase starts the combat music ~1.5–2 s in and hands back
  ~4 s after it ends; Sendell's call starts Revelation and chapter 1 ends it; `ending` / `boss` / `under`
  / `cave` / `home` map correctly; dialogue ducks the music to 0.55 and restores it; after a reload exactly
  one track plays; no console errors.
* Not verified: anything by ear (instrument balance, patch quality, whether the combat music masks cues
  in practice, the mix of music against the procedural SFX and ambience), behaviour in Safari and Firefox
  (only Chromium was run), and mobile memory use.

## Sizes

`assets/music`: 30 MB (16 MP3s at 112 kbps + manifest; MUSIC-2 added 7.3 MB: village_b 2.47, island_b 2.53,
zeelich_b 2.34); `art/music/midi`: 0.9 MB. Listening excerpts of the MUSIC-2 pieces (not shipped):
`docs/lba3-production/reviews/MUSIC-2/*.mp3`, 6 × 27–28 s at 96 kbps, 2.0 MB. The FLAC masters
(`art/music/masters`, 119 MB) are not committed: they rebuild bit for bit from the scores and the soundfont
(see above), so they are git-ignored and made locally when needed. At most 3 tracks are kept decoded
(~55 MB each) to stay friendly to phones.

## Sources and licences

* **MuseScore_General.sf2** v0.2 by S. Christian Collins — MIT licence (derived from FluidR3 / FluidR3Mono
  by Frank Wen and Michael Cowgill, MIT; some samples public domain / CC0). Downloaded from
  `https://ftp.osuosl.org/pub/musescore/soundfont/MuseScore_General/` (sha256 in `fetch_soundfont.sh`);
  licence text in `tools/music/soundfonts/MuseScore_General_License.md`. Not committed (215 MB).
* **MuseScore_General_HQ** (`MuseScore_General_Full.sf2`, 490 MB, the "lossless" edition 0.2.1 of the same
  soundfont by S. Christian Collins) — MIT, parts public domain / CC0 (VSCO 2.1.1 Community Edition strings, VCSL
  cymbals, MuseScore Drumline samples; licence text in the package's `copyright` file). Used for the three MUSIC-2
  pieces only, because the osuosl download of MuseScore_General.sf2 failed certificate verification from the
  machine they were made on (the host's chain ends in an emSign root this system does not trust; verification was
  not disabled). Taken from Ubuntu's signed archive: `apt-get download musescore-general-soundfont-lossless`
  (0.2.1-1, noble/universe), `dpkg-deb -x`, then `MUSIC_SF2=…/usr/share/sounds/sf2/MuseScore_General_Full.sf2
  tools/music/.venv/bin/python tools/music/build.py village_b island_b zeelich_b`. It has every preset the scores use
  (bank 17 "Expr." included). The older tracks were not re-rendered; rendering them with the HQ edition would change
  them, so a later re-render should do all tracks with one soundfont.
* Fallback, not used for the committed renders: FluidR3_GM.sf2 (MIT) from the system.
* Tools (not shipped): FluidSynth (LGPL-2.1), FFmpeg with LAME (LGPL/GPL tools), Python packages mido (MIT),
  numpy (BSD), scipy (BSD), pyloudnorm (MIT), soundfile (BSD), matplotlib (PSF-style, only for QA plots).
* The music (scores, MIDI, renders) is original work made for this non-commercial fan project.

## MUSIC-2: less repetition (2026-10-26)

The user on build 111: "the music is good but repetitive; it should be closer to LBA2's style".

**Where the repetition came from** (measured in the code and the manifest before the change): one track per place,
looped without end by `AudioBufferSourceNode.loop` from `loopStart` to `loopEnd`. The same music came back every
loop length, always the same order of sections, and every arrival in a place started from bar 1 of the intro (or
where it was left). There was no silence between plays. The loop seams were not the problem: `tools/music/check.py`
on the shipped MP3s (now runnable without the git-ignored FLAC masters) measures every seam below the MP3's own
coding error, click ratio 0.10–0.63 (< 1 = no click), the same as recorded before; nothing was changed there.

**Time until the same music comes back, per place** (seconds; "before" = the loop length; "after" = the time from
the start of a piece to the next start of the same piece: piece A to its end, a silence, piece B to its end, a
silence; silences uniform 20–60 s, so the range is min–max and the middle is the mean):

| Place | Before | After |
|---|---|---|
| Citadel town and harbour | 133 (village loop) | 356–436, mean 396 (village 140 + Market Day 176 + 2 silences) |
| Citadel's open island | 133 (island loop) | 358–438, mean 398 (island 138 + Sea Wind 180 + 2 silences) |
| Zeelich outdoors (Esmer, the islands) | 126 (zeelich loop) | 337–417, mean 377 (zeelich 130 + Cloud Gardens 167 + 2 silences) |
| Zeelich interiors on the playlist | 126 | 297 (the two pieces back to back) |
| Desert Island | 133 (the island loop) | 358–438, mean 398 (Sea Wind + island + 2 silences) |
| Hamalayi | 131 (the well loop) | 158–198 (the well's piece + a silence; still one piece) |
| House, workshop, facility, caves, combat | 112 / 108 / 103 / 131 / 80 | unchanged (loops; short stays, or cues) |

Arrivals in a playlist place start at one of 4–7 phrase starts per piece (8–13 per place), so even the first minute differs from visit
to visit. Outdoors, roughly a fifth of the time is now silence with the ambience (mean 40 s after each ~2.5 min
piece), as LBA2 did.

**The three new pieces** (scores `tools/music/tracks/{village_b,island_b,zeelich_b}.py`, each with its section plan
in the header; MIDI in `art/music/midi/`): written by hand note by note in the score DSL (melodies, chords, bass and
inner parts; accompaniment figures from written chord symbols with the existing `pad`/`arp`/`bassline` helpers;
nothing generated at random), through-composed with an ending (A, A2, B, contrasting episodes, A', coda), 2:47–3:00
each, rendered by the same pipeline (FluidSynth stems → synthetic room → EQ → loudness −17/−17.5 LUFS → limiter →
MP3 112 kbps). LBA2's character is the brief, not its notes: melodic leads (recorder, flute, ocarina, shakuhachi,
accordion), light orchestra (strings, horns, harp), synth colour (warm and bowed-glass pads, a soft poly-synth
pulse) and folk/ethnic colour (steel drum, kalimba, hammered dulcimer, koto, hand drums). Licence: original work for
this non-commercial fan project, like the rest of the score; no melody, recording, MIDI or arrangement of the Little
Big Adventure soundtracks was used or consulted.

* **Market Day** (`village_b`, town and harbour): A major 4/4, ~104 bpm; a recorder tune over nylon guitar and
  pizzicato, the accordion answering and then singing an F♯-minor episode, a harbour interlude of steel drum and
  kalimba over hand drums and a synth pulse, a small mystery in an alley (low clarinet over a walking pizzicato),
  the tune with the whole band, a slow plagal close.
* **Sea Wind** (`island_b`, the open island, the Desert): E dorian 12/8, ~90 bpm; a flute tune over a hammered
  dulcimer and a soft 12/8 hand-drum groove, an ocarina answering, broad violins in C lydian / G with horns below,
  a quiet "lighthouse" breakdown with bells, the tune back, an open end on Em9.
* **Cloud Gardens** (`zeelich_b`, Zeelich): A mixolydian 4/4, 80 bpm; a shakuhachi tune over a koto ostinato and
  bowed-glass pads, a choir in F (♭VI) for the gardens, a livelier market episode (hand drums, koto and kalimba
  trading phrases over a synth arpeggio), the tune back with violins, a quiet end on A.

Checked without listening: every bar's length (the DSL rejects a wrong bar), a harmony lint of long notes on strong
beats against the written chords (`scratchpad` tool, 0 semitone clashes in the three pieces), loudness, true peak,
loudness range and spectral balance (table above; spectrograms looked at for the section shapes and for a too-quiet
episode: Market Day's harbour interlude was 10 dB under the rest and was raised to ~5 dB under). **Not verified by
ear**: whether the tunes are good, the balance between instruments, how the HQ soundfont's patches sound next to the
older renders, and whether 20–60 s silences feel right in play. The excerpts in
`docs/lba3-production/reviews/MUSIC-2/` are for that.
