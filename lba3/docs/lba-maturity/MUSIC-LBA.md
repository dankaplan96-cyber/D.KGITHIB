# MUSIC-LBA: livelier music in the style of LBA1 and LBA2 (17.11.2026)

The user (17.11): "The music is a bit too boring during the game too; the style needs improving, toward the style of
the second and the first game", with links to the LBA2 and LBA1 soundtracks on YouTube.

**Status: Automated runtime only. Nobody listened.** This environment has no audio output and cannot play YouTube.
The pieces were written, rendered and measured. Whether they sound good is not verified. The A/B clips at the end are
there for that.

## References: what was and was not used
- **Not auditioned.** The two YouTube links were not played or downloaded. No recording, MIDI, transcription,
  melody, chord progression, riff or arrangement from Philippe Vachey's scores was used.
- **Used:** only the soundtracks' published general character. That means strong hummable lead tunes that return as
  themes; bright, playful General-MIDI-style colours (flutes and pan pipes, marimba and kalimba, plucked strings,
  accordion and harmonica, bells, warm bass); light percussion with a bounce; a different colour and groove for
  each place; loops long enough not to tire, with A/B sections; tempos that move; an adventurous, optimistic mood
  with some gentle melancholy.
- Every note in `tools/music/tracks/*.py` and `tools/music/themes.py` was written by hand for this project.

## Why the pieces read as boring (measured)
`tools/music/analyse.py` reads each score (it renders nothing) and measures over the loop body (a one-shot: the whole
piece). The "top line" is the highest note sounding at each 16th: where the ear finds the tune. The "bottom line" is
the lowest note sounding. Columns: tempo; loop length; top-line range (5th to 95th percentile); top-line pitch
changes per second; bottom-line pitch changes per bar; pitched onsets per second; percussion strokes per bar; the
entropy of where onsets land in the bar on a 16th grid (rhythmic variety); the share of soloist onsets off the beat;
chord changes per bar; the share of note-time in notes a bar long or longer (pads, drones); the share of time a
soloist plays.

Before (build `ccr-c1c2c4b9-dep6ed`, all 20 pieces):

| Track | bpm | meter | loop s | top range st | top moves/s | bass moves/bar | notes/s | drum/bar | rhythm bits | sync % | chord chg/bar | pad % | tune % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| main_theme | 94 | 4/4 | 92.2 | 17 | 1.10 | 1.2 | 10.3 | 0.2 | 2.91 | 24 | 1.19 | 20 | 57 |
| home | 84 | 3/4 | 111.7 | 21 | 0.97 | 1.5 | 5.2 | 0.0 | 2.37 | 21 | 1.17 | 20 | 83 |
| village | 108 | 6/8 | 133.4 | 22 | 1.91 | 1.9 | 8.8 | 0.1 | 2.41 | 52 | 1.04 | 18 | 76 |
| island | 108 | 4/4 | 133.4 | 26 | 1.43 | 1.4 | 8.6 | 0.1 | 2.90 | 21 | 1.17 | 13 | 38 |
| well | 66 | 4/4 | 130.8 | 24 | 0.94 | 0.4 | 2.6 | 0.0 | 2.73 | 21 | 0.94 | 30 | 56 |
| workshop | 120 | 4/4 | 108.0 | 43 | 2.38 | 2.9 | 6.1 | 3.1 | 2.71 | 34 | 0.91 | 17 | 60 |
| facility | 112 | 4/4 | 102.9 | 22 | 1.92 | 13.4 | 11.2 | 7.9 | 3.40 | 24 | 0.90 | 31 | 58 |
| combat | 132 | 4/4 | 80.3 | 18 | 2.09 | 3.1 | 9.4 | 4.0 | 3.02 | 47 | 0.98 | 13 | 13 |
| zeelich | 100 | 7/8 | 126.0 | 14 | 2.10 | 1.9 | 8.8 | 9.8 | 2.95 | 28 | 0.98 | 21 | 59 |
| revelation | 60 | 4/4 | 74.5 | 29 | 0.50 | 0.5 | 2.9 | 0.1 | 2.81 | 7 | 0.94 | 27 | 77 |
| finale | 120 | 4/4 | 96.0 | 28 | 1.36 | 1.3 | 9.8 | 2.9 | 2.88 | 0 | 1.06 | 23 | 5 |
| homecoming | 76 | 3/4 | 151.3 | 24 | 0.71 | 1.9 | 4.9 | 0.1 | 2.29 | 12 | 0.98 | 25 | 47 |
| opening | 86 | 3/4 | 85.8 | 18 | 0.86 | 1.2 | 4.0 | 0.0 | 2.31 | 19 | 0.97 | 34 | 58 |
| village_b | 104 | 4/4 | 171.9 | 24 | 1.86 | 3.0 | 8.0 | 5.4 | 3.13 | 23 | 1.15 | 27 | 86 |
| island_b | 90 | 12/8 | 177.3 | 19 | 0.98 | 2.9 | 5.5 | 10.0 | 3.34 | 43 | 1.07 | 26 | 72 |
| zeelich_b | 80 | 4/4 | 163.4 | 17 | 1.03 | 1.5 | 6.9 | 4.8 | 3.12 | 28 | 1.07 | 24 | 51 |
| asylum | 76 | 3/4 | 94.8 | 21 | 0.78 | 2.3 | 3.9 | 0.8 | 2.19 | 14 | 0.97 | 32 | 95 |
| school | 100 | 4/4 | 96.0 | 29 | 1.32 | 2.8 | 6.5 | 0.4 | 2.80 | 36 | 1.25 | 29 | 72 |
| mountain | 80 | 4/4 | 96.0 | 14 | 0.77 | 0.6 | 3.5 | 0.8 | 1.83 | 10 | 1.09 | 14 | 50 |
| desert_isle | 96 | 4/4 | 90.0 | 11 | 0.93 | 4.8 | 6.7 | 9.7 | 2.93 | 35 | 1.08 | 13 | 83 |

What the numbers show for the places heard most (title, home, town, island, mountain, desert):
1. **No groove.** The title, Home, the town and the island have 0 to 0.2 percussion strokes per bar. In practice they
   have no percussion at all. The mountain has 0.8.
2. **A slow tune.** The top line moves about once a second: title 1.1, Home 0.97, island 1.43, mountain 0.77,
   desert 0.93. A bouncy, hummable tune at these tempos moves 2 to 4 times a second.
3. **A bass that barely moves.** The bottom line changes 0.6 to 1.9 times per bar: roots held under each chord
   (title 1.2, Home 1.5, island 1.4, mountain 0.6).
4. **Slow tempos** for daytime places: Home 84, mountain 80, desert 96, title 94.
5. **Held notes.** 13 to 34 % of all note-time sits in notes a bar or longer (pads, pedals, drones). The mountain's
   rhythm entropy, 1.83 bits, is the lowest of all: its onsets almost always land in the same places.
6. **Long loops for the material.** The town and the island run 133 s before repeating, on 60-bar forms that mostly
   reorchestrate one tune. That gives length without contrast.

The harmonic rhythm (about one chord per bar) and the tune's range (14 to 26 semitones) were not the problem.

## Twinsen's theme (new, `themes.TWIN_A` / `TWIN_B`)
D major, 4/4. **The hook:** three rising eighths, a leap up a fourth or sixth held for a dotted quarter, then a quick
fall (D E F# | B- A F#). The answer sequences the hook a step lower on the dominant (C# D E | A- G E). The second
half climbs to the high D. The B strain turns to B minor and climbs back. The title states the whole theme. Every
new place piece quotes the hook, or the whole theme, in its own colour (table below). The older themes stay where
they were: Home (the family), Adventure and the Entity are still quoted by the opening, Revelation, the finale and
Homecoming.

## The new pieces (they replace the old files in place: same names, same moods)
| Piece (file) | Place | Key, meter, tempo | Colours | Form | Twinsen's theme | Loop |
|---|---|---|---|---|---|---|
| **Main Theme** (`main_theme`) | title screen | D, 4/4, 112 | pan flute, marimba, kalimba, pizzicato, fingered bass, violins + flute, horn countermelody, oboe over accordion, tin whistle, trumpet; kick, side stick, shaker, congas | intro, A, A' (violins), B (B minor), C (adventure episode in G), A'' (tutti) | the whole theme, A and B strains | 85.8 s |
| **Citadel Village** (`village`) | the town and harbour (first piece of its playlist), muffled in town interiors | G, 6/8 jig, dotted quarter = 104 | clarinet, accordion off-beats, oom-pah bass, xylophone + flute staccato, bassoon, fiddle, nylon guitar, oboe, tin whistle, marimba, horns; kick, side stick, shaker, wood block | A1, A2, B1, B2, C1, C2 (E minor), A3 (tutti), B3, A4, link | the hook as bar 5 of the B strain | 87.8 s |
| **Home** (`home`) | Twinsen's house, cellar, lamp room, the neighbours' homes | F, 3/4 waltz, 120 | clarinet, flute, nylon guitar and pizzicato oom-pah-pah, harp, celesta, kalimba, accordion, cello, horn, bassoon; brush kit | A (16 bars), B (the family Home motif, then the hook), A', C (D-minor evening), link | the hook as the house's answer (flute), in D minor in the evening strain, teased on the celesta in the link | 96.0 s |
| **Island Exploration** (`island`) | Citadel island outdoors (first piece of its playlist), the spaceport terminal | C, 4/4, 120 | recorder, clarinet + flute, oboe, steel guitar strum, marimba, pizzicato, harp, fingered bass, horns, violins, timpani; kick, side stick, shaker, tambourine, congas | A, A', B (A minor), C (the theme), A'' + a quiet walk back | the whole theme in C on horns and violins | 88.0 s |
| **Danger** (`combat`) | every fight | E minor, 4/4, 144 | horns, trumpet, trombone + bassoon riff, xylophone answers, staccato string ostinato, tremolo violins, marimba, pizzicato, fingered bass, clarinet, timpani; kick, light snare, shaker, congas, bongos, toms only at the turnarounds | intro, A (hook in E minor), B (riff), C (theme in G), D (breakdown), A' (tutti), E | the hook in E minor (chased); the whole theme in G on the trumpet (he fights back) | 79.9 s |
| **Zeelich** (`zeelich`) | Esmer and the floating isles (first piece), muffled in Zeelich's halls | A lydian, 7/8 (2+2+3), 150 | ocarina, kalimba ostinato, vibraphone + flute, koto, sitar, celesta, harp, steel drum, glass pad, violins, fretless bass; kick, bongos, congas, shaker, triangle | A, A', B (F# minor), B', C (hook), C' (hook on steel drum), A'' | the hook bent into 7/8 and lydian | 78.4 s |
| **Desert Island** (`desert_isle`) | the Desert outdoors (first piece), muffled in Kesh's houses | D mixolydian, 4/4, 104 | harmonica, steel guitar strum, banjo rolls, fretless bass, flute + marimba, fiddle, tin whistle, horns; kick, side stick, shaker, congas, guiro, cowbell | A, A', B (B minor), C (the theme), A'' | the whole A strain with the island's C natural | 92.2 s |
| **The High Hamalayi** (`mountain`) | the Hamalayi outdoors (first piece), the monastery hall, Lhar's houses (muffled) | A dorian, 4/4, 92 | pan flute, shakuhachi, hammered dulcimer ostinato, kalimba, harp, horn, violins, cello, a short unison chant, tubular bells, acoustic bass; kick, low tom, shaker, triangle; no drone | A, A', B (C major), C (the theme, then the chant), A'' | the theme's first half, which sits in the mode | 93.9 s |

Every piece has a lead tune in every section, a bass that moves, a groove, two or three contrasting sections and a
seamless loop. The players' code is unchanged: moods, playlists, crossfades, the duck, prefetch. The old pieces stay
in git history (the scores at `ccr-c1c2c4b9-dep6ed`).

After (the same measure):

| Track | bpm | loop s | top range st | top moves/s | bass moves/bar | notes/s | drum/bar | rhythm bits | sync % | chord chg/bar | pad % | tune % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| main_theme | 112 | 85.8 | 12 | 2.23 (1.10) | 4.2 (1.2) | 13.8 | 17.3 (0.2) | 3.20 | 40 | 1.15 | 7 (20) | 96 |
| village | 156 (6/8) | 87.8 | 24 | 3.52 (1.91) | 4.0 (1.9) | 19.2 | 9.8 (0.1) | 2.56 | 54 | 0.93 | 2 (18) | 78 |
| home | 120 | 96.0 | 19 | 2.41 (0.97) | 3.0 (1.5) | 10.9 | 5.5 (0.0) | 2.42 | 24 | 1.02 | 15 (20) | 81 |
| island | 120 | 88.0 | 22 | 2.40 (1.43) | 4.7 (1.4) | 20.4 | 16.6 (0.1) | 3.04 | 43 | 1.02 | 0 (13) | 69 |
| combat | 144 | 79.9 | 28 | 2.99 (2.09) | 12.5 (3.1) | 18.8 | 19.7 (4.0) | 3.21 | 41 | 0.92 | 20 (13) | 35 |
| zeelich | 150 (7/8) | 78.4 | 17 | 3.02 (2.10) | 4.7 (1.9) | 16.5 | 14.5 (9.8) | 2.83 | 48 | 1.02 | 8 (21) | 87 |
| desert_isle | 104 | 92.2 | 15 | 2.01 (0.93) | 4.7 (4.8) | 17.6 | 18.6 (9.7) | 3.09 | 42 | 0.93 | 9 (13) | 94 |
| mountain | 92 | 93.9 | 14 | 1.95 (0.77) | 3.8 (0.6) | 8.4 | 12.8 (0.8) | 2.97 | 36 | 0.94 | 0 (14) | 63 |

(Old value in brackets.) Combat's pad share rose: tremolo violins and held brass under the riff and the theme.

## Measurements (Automated runtime / measured; not listened)
**Part balance** (`tools/music/balance.py`: each part rendered alone and dry, K-weighted level per 8-bar section). After
one round of gain changes, the tune stands 3 to 10 dB above any single accompanying part in every section. The first
render failed this check in several places: the bass was within 1 dB of the tune in the town, Home and the desert;
held horns and trombones were 3 dB over the trumpet in combat; the koto and the harmonica sat under the bass. The
bass, the pads and the counter-lines were lowered, and the koto, the harmonica, the xylophone and the steel drum
raised. (With dry renders and no room, this is a proxy for balance. It is not listening.)

**Harmony scan** (a scratch script, not committed): every melody note a beat or longer that sits a semitone from a
tone of the chord under it. It found two real clashes, and both chords were rewritten. In Home's evening strain, a B
flat was held over D minor; in Zeelich's B strain, the koto's D was held over F# minor (now Dmaj7/F#). The other hits
are the intended colours: major sevenths, the lydian D#, 4-3 suspensions that resolve, and short anticipations.

**Rendered files** (`tools/music/check.py`, the MP3 decoded with ffmpeg; loudness of the loop body):

| Track | LUFS new (old) | true peak dBTP | seam error / MP3 coding error dB | click ratio | sub/low/mid/presence/air % |
|---|---|---|---|---|---|
| main_theme | −16.9 (−16.8) | −2.0 | −26.9 / −22.1 | 0.85 | 4/13/76/6/1 |
| village | −17.5 (−17.4) | −3.7 | −36.0 / −20.5 | 0.13 | 9/17/63/10/1 |
| home | −18.5 (−18.4) | −5.8 | −31.7 / −21.1 | 0.49 | 8/15/65/12/0 |
| island | −17.4 (−17.4) | −3.0 | −29.6 / −22.0 | 0.27 | 3/14/79/3/1 |
| combat | −17.0 (−16.9) | −2.4 | −38.3 / −22.0 | 0.13 | 6/15/75/3/1 |
| zeelich | −17.7 (−17.4) | −3.7 | −26.3 / −20.9 | 0.47 | 2/10/83/4/1 |
| desert_isle | −18.1 (−18.0) | −4.6 | −34.3 / −20.9 | 0.67 | 5/12/68/14/1 |
| mountain | −18.4 (−18.4) | −5.3 | −35.1 / −21.5 | 0.58 | 4/20/71/3/1 |

- **Loudness** matches the old pieces within 0.3 LU, at the same targets (title and combat −16.5, home and mountain
  −18, desert −17.5, the rest −17). Because the music bus feeds the voice duck at the same level as before, the music
  sits under the voices as before. **No clipping:** every true peak is at −2.0 dBTP or lower, and the limiter acted
  on none (0.0 dB gain reduction).
- **Loops:** every seam error is below the MP3's own coding error at the same spot, and every click ratio is below 1:
  the step across the seam is smaller than the large steps around it. In the FLAC masters the seams match to −75 to
  −79 dB, the dither floor.
- **One seam was fixed.** Zeelich's master seam first measured −56 dB (8e-3), against −75 to −79 dB for the others.
  Every part rendered alone was clean. The fault appeared only with the kalimba and the other plucked parts in one
  FluidSynth instance: its voices came out of FluidSynth's voice pool in a different order on the two passes. The
  kalimba now renders on a stem of its own. The seam is 9.7e-5, −77 dB.
- **Combat's presence band** is 3 % (the old piece measured 1 to 2 %), from the xylophone's answers. There are still
  no hi-hats or cymbals. Whether the game's bright alert, zap and hit cues stay clear over it is **not measured in
  play**.
- **Decoded in headless Chromium**, as the game decodes, at 48 and 44.1 kHz: lengths exact (±1 sample at 44.1 kHz),
  peaks 0.51 to 0.80, a loop-seam step 0.08 to 0.87 times the local 99.5th-percentile step (below 1: no jump),
  decode 170 to 530 ms each, off the main thread (the old files, same run: 200 to 520 ms; the title 192 ms, was
  516). The largest sample step anywhere in a file rose from 0.09-0.21 to 0.20-0.28. These are percussion
  attacks inside the music, not seams. Decoded size at 48 kHz: 35 to 41 MB. Before, the same eight
  pieces were 35 to 57 MB: the town −18 MB, the island −17, Zeelich −18, the title −9, combat +0.8. The files total
  11.35 MB, down from 13.82 MB (1.30 to 1.51 MB each); `assets/music` is 2.5 MB smaller. File count: unchanged
  (0 new files in the game).
- The older tracks were not re-rendered. `asylum` was rebuilt as a determinism check after the changes to
  `score.py`, and its MP3 and MIDI came out byte-identical.

## A/B clips for listening (`captures/music-lba/`)
Each clip is 30 s from the start of the piece's loop body, decoded from the game's MP3 at its own loudness and
re-encoded at 112 kbps, with a 0.3 s fade in and a 1.5 s fade out. `-A-old` is the build before this pass;
`-B-new` is this pass.

| Place | Old | New |
|---|---|---|
| Title | `main_theme-A-old.mp3` | `main_theme-B-new.mp3` |
| Citadel town | `village-A-old.mp3` | `village-B-new.mp3` |
| Twinsen's house | `home-A-old.mp3` | `home-B-new.mp3` |
| Citadel island | `island-A-old.mp3` | `island-B-new.mp3` |
| Any fight | `combat-A-old.mp3` | `combat-B-new.mp3` |
| Zeelich | `zeelich-A-old.mp3` | `zeelich-B-new.mp3` |
| Desert Island | `desert_isle-A-old.mp3` | `desert_isle-B-new.mp3` |
| The Hamalayi | `mountain-A-old.mp3` | `mountain-B-new.mp3` |

## Tests (Automated runtime, headless Chromium with SwiftShader, port 8980; 17.11, 15:30 to 18:00)
The machine was shared with other agents' browsers, and pages often crashed under memory pressure ("Target
crashed"). Other agents' logs on the same machine show the same crashes. Each suite below was run until it gave a
verdict, and where a run failed it was compared with the base build (the same code, with the old music files
swapped into the served copy).

| Suite | This pass | Base (old music), same machine | Reading |
|---|---|---|---|
| `tests/music.mjs` | **PASS 26/26**: playlists, phrase starts, silences, combat in a silence, equal-power crossfades on bar lines, the duck to 0.5 and back, never more than two voices | (not needed) | the music system works unchanged with the new files |
| `tests/music-places.mjs` | **PASS 21/21** on the third run (the first two crashed: "Target crashed") | PASS 21/21 | each piece in its place, the alt fallback |
| `tests/action-sound-2.mjs` | **PASS 40/40** | (not needed) | |
| `tests/audio.mjs` | 3 of 6 checks reached. Then the click on Settings → Back timed out ("waiting for element to be visible, enabled and stable"), in three runs; two other runs crashed. One run also failed the sliders check on the effects bus (0.78 for 0.75). | 5/6: the same sliders check fails (effects bus 0.92 for 0.75), as recorded in music-by-place.md; one more run crashed | the sliders failure is the base's. The Back-button timeout is a UI click under load: `menus.mjs` on the base build times out on the same kind of click. **Not settled.** |
| `tests/menus.mjs` | 20 checks pass, then a settings-button click times out (twice) | **the same failure at the same click**, 20 checks pass | not caused by this pass |
| `tests/chapter1.mjs` | one full run: 8 pass, then "valve orchard (ball) opened false". The ball valve is thrown at from random angles (`Math.random` in the test), and every later failure follows from the shut valve. Other runs crashed. | crashed | not caused by the music. **No clean chapter-1 run on this machine.** |

**Boot and loading.** The game fetches no music file at boot. The manifest is fetched when audio starts, and each
track on demand (src/engine/music.js). The title's file is 1.43 MB (was 1.76 MB), and its decode measured 192 ms
(was 516 ms in the same run). Every replaced piece decodes to the same size or less (above). So music loading
cannot make boot slower. Boot time itself was not timed in this pass.

## Tools added and changed
- `tools/music/analyse.py`: the musical numbers above, from the scores.
- `tools/music/balance.py`: part balance per section, from dry single-part renders.
- `tools/music/score.py`: the GM standard, room and brush kits (one kit per song, on channel 10); the harmonica,
  bandoneon, banjo, fingered bass and a few other GM colours; `groove()` (percussion as step patterns) and `comp()`
  (chord comping that follows the harmony). Existing scores render unchanged.
- `tools/music/themes.py`: Twinsen's theme (`TWIN_A`, `TWIN_B`, `TWIN_HOOK`).

## Open points
1. **Listening.** Every piece above, its balance, and whether the GM patches carry the intended character (the
   harmonica, the koto, the steel drum, the tin whistle, the brush kit). The renders are draft quality, as before
   (MuseScore_General via FluidSynth).
2. **Not renewed yet**, and still the older, slower style: the town's and the island's second pieces (Market Day,
   Sea Wind), Zeelich's second piece (Cloud Gardens), the Well (every cave and temple), Baldino's Workshop, the
   Energy Facility, the Old Asylum, the School of Magic, and the story pieces (Opening, Revelation, Finale,
   Homecoming). Those last four still quote the older Adventure theme, not Twinsen's.
3. Combat over the effects: whether the cues stay clear (the presence band rose by about 1 point).
4. The user's hardware: nothing here was played on it.

## Reproduce
```sh
python3 -m venv /tmp/musvenv && /tmp/musvenv/bin/pip install -r tools/music/requirements.txt
sh tools/music/fetch_soundfont.sh     # or MUSIC_SF2=<path to MuseScore_General.sf2>
/tmp/musvenv/bin/python tools/music/build.py main_theme village home island combat zeelich desert_isle mountain
/tmp/musvenv/bin/python tools/music/check.py main_theme village home island combat zeelich desert_isle mountain
/tmp/musvenv/bin/python tools/music/analyse.py --md
/tmp/musvenv/bin/python tools/music/balance.py village
```
Builds are deterministic: `home` re-rendered byte-identical, and so did `asylum` after the `score.py` changes.
