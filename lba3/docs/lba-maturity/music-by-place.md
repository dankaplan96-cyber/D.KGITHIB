# Music by place (wave C item 6, 9.11.2026)

What every place plays, which places borrowed a piece written for somewhere else, and the three new pieces.
Evidence labels as PROJECT_CONTRACT.md. **Nobody has listened** to anything here: the pieces were written, rendered and
measured in an environment with no audio output. Listening files for the user are listed at the end.

## How a place chooses its music (source)
- A room: `R.music`, else `ROOM_MUSIC[id]` (src/main.js), else `citadel`; the name goes through `MOODS`
  (src/engine/music.js) to a track, a playlist (`PLAYLISTS`, pieces in rotation with silences outdoors), or a playlist
  "through the walls" (gain 0.6, 1.1 kHz low-pass: `office`, `zeelich_in`, `desert_in`, now `hamalayi_in`).
- Citadel outdoors (no room): `outdoorMood` by position: the village and harbour `citadel`, the fort `station`,
  elsewhere `island`.
- Story scenes: `audio.setMood` / `audio.cue` in src/game/story/; combat everywhere: `combat` (Danger).

The table below was dumped from the running game (Automated runtime: every room of `?allregions`, its mood and what
the mood resolves to; the probe is a scratch script, not committed). "Before" is the build this pass started from
(ccr-c1c2c4b9-dep6ed).

## The map

### Citadel island
| Place | Mood | Plays | Reads |
|---|---|---|---|
| Village square, harbour (outdoors) | `citadel` | Village ↔ Market Day | own |
| Open island (outdoors) | `island` | Island Exploration ↔ Sea Wind | own |
| Old fort, project station (outdoors) | `station` | Energy Facility | own |
| Twinsen's house, cellar, lighthouse lamp room | `home` | Home | own |
| Neighbours' house, Nell's house | `home` | Home | fits (Citadel homes, the family's neighbours) |
| Water office, Bazoo's shop, pharmacy, ticket office, baggage claim, tavern cellar | `office` | the town's playlist through the walls | fits |
| Chez Luc's tavern | `village` | the town's playlist | fits (folk) |
| Project office | `stealth` | Energy Facility, stealth mix | own |
| Control room | `station` | Energy Facility | own |
| FunFrock's valve room (ch. 10) | `facility` | Energy Facility | fits (machinery) |
| Old asylum / hostel | `asylum` | The Old Asylum | own (ORDER 19) |
| Baldino's workshop | `workshop` | Baldino's Workshop | own |
| The well cave | `well` | The Well | own |
| Tralu's cave, the sewers (3 rooms) | `cave` | The Well | **borrowed** (one cave piece for every cave and temple) |
| Citadel Spaceport terminal | `island` | the island's playlist | fits (travel) |

### Desert Island
| Place | Mood | Before | Now |
|---|---|---|---|
| Outdoors (Kesh, the dunes, the dig) | `desert` | Sea Wind ↔ Island Exploration (**Citadel's**) | **Desert Island** ↔ Sea Wind |
| Kesh's houses, the post's three cabins, Bashir's house (S40) | `desert_in` | Citadel's pieces through the walls | Desert Island (↔ Sea Wind) through the walls |
| The dig crew's bunkhouse (S28) | `desert_in` | the same | the same as Kesh's houses |
| **School of Magic** (Rector Hougo, Ker'aooc) | `desert_in` → `school` | Citadel's island pieces through the walls (before DESERT-BAR: Twinsen's Home) | **The School of Magic** |
| The pupils' dormitory (the hall) | `desert_in` → `school` | the same | **The School of Magic** |
| Bersimon's tent (the weather wizard) | `home` → `school` | **Twinsen's Home** | **The School of Magic** |
| Temple of Bù, its maze | `cave` | The Well | unchanged (**borrowed**) |
| FunFrock's condenser hall, hangar | `facility` | Energy Facility | unchanged (fits: FunFrock's machinery) |

### The Hamalayi
| Place | Mood | Before | Now |
|---|---|---|---|
| Outdoors (Lhar, the paths, the landing) | `hamalayi` | The Well alone (**a cave piece**) | **The High Hamalayi** ↔ The Well |
| The monastery hall | `mountain` | **silence**: the room asked for `mountain`, which no mood or track named ("no track for mountain") | **The High Hamalayi** (the outdoor piece goes on, not restarted) |
| Lhar's five houses, the landing's hut, the keeper's house | `home` → `hamalayi_in` | **Twinsen's Home** | the mountain's playlist through the walls |
| The observatory (Sendell's message) | `well` | The Well | unchanged (fits: the Entity's wonder) |

### Zeelich and its isles
| Place | Mood | Plays | Reads |
|---|---|---|---|
| Esmer street, the floating isles (outdoors) | `zeelich` | Zeelich ↔ Cloud Gardens | own |
| Esmer homes, the isles' 56 house rooms, Zeelich Spaceport terminal, Imperial Hotel | `zeelich_in` | Zeelich's playlist through the walls | fits |
| **Otringal's bar** | `zeelich` | Zeelich's outdoor playlist at full volume | **borrowed** (exploration music in a bar) |
| Council antechamber, council chamber | `zeelich` | Zeelich's outdoor playlist at full volume | **borrowed** (a council hall) |
| The Joint Project's archive | `stealth` | Energy Facility, stealth mix | fits (sneaking past a guard) |
| Temple of the Dark Monk (Celebration) | `cave` | The Well | **borrowed** |

### Under the island (chapter 3) and other
| Place | Mood | Plays | Reads |
|---|---|---|---|
| Shaft, gallery | `under` | The Well | fits (the dark under the island) |
| Sendell's chamber | `cave` | The Well | fits |
| The deep works | `facility` | Energy Facility | fits (the project's plant) |
| The core | `boss` (`cave` in the epilogue) | Finale | own |
| Combat arena | `facility` | Energy Facility | developer area, not in the adventure |

### Story scenes
| Scene | Call | Plays |
|---|---|---|
| Title | `setMood('title')` | Main Theme |
| Opening film | `cue('opening')` | Opening (one-shot, written to the film's clock) |
| Prologue at home → the storm | `home` → `storm` | Home → The Well (**borrowed**: a storm on the island plays the cave piece) |
| Sendell's call (prologue, ch. 1, ch. 2) | `cue('revelation')` | Revelation (one-shot) |
| Chapter 1's end, the epilogue's end, credits | `ending` | Homecoming |
| Chapter 3's fight in the core | `boss` | Finale |
| The epilogue at home | `home` | Home |
| Any fight | (automatic) | Danger |

## What was done (Automated runtime + measured; not listened)
The places that most needed a piece, in order: the School of Magic (the user's first), the monastery hall (silent, a
bug), the Hamalayi outdoors and houses (a cave piece and the family's theme on a mountain), the Desert (a whole island
on another island's two pieces). Three original pieces, scores in `tools/music/tracks/`, rendered by `build.py` with the
same soundfont and chain as the rest (draft quality, as every track: docs/MUSIC.md):

| Piece | For | Key, meter, tempo | Colours | Length (loop) | Loudness / true peak (decoded MP3) | Seam error / MP3 coding error, click ratio | File |
|---|---|---|---|---|---|---|---|
| **The School of Magic** (`school`) | the School, its dormitory, Bersimon's tent | G major (lydian sparkle), 4/4, 100 | clarinet, flute, celesta, harp, bassoon, cello, strings, soft choir, glass; a wood block | 1:49 (1:36) | −18.4 LUFS / −4.7 dBTP | −34.5 / −25.2 dB, 0.56 | 1.53 MB |
| **The High Hamalayi** (`mountain`) | the Hamalayi outdoors (first piece), the monastery hall, Lhar's houses (muffled) | A dorian, 4/4, 80 | pan flute, violins, horn, a unison choir chant, tubular bells, an A drone, a soft low drum | 1:49 (1:36) | −18.4 / −5.6 | −36.9 / −25.6, 0.43 | 1.53 MB |
| **Desert Island** (`desert_isle`) | the Desert outdoors (first piece), Kesh's houses and the other Desert rooms (muffled) | D mixolydian, 4/4, 96 | oboe, fiddle, nylon and steel guitars, flute, horns, fretless bass, hand drums | 1:44 (1:30) | −18.0 / −5.2 | −29.7 / −23.8, 0.47 | 1.45 MB |

- Themes: the School's spells are the project's own Entity cell (themes.py ENT_A, wonder form, in G lydian) — magic is
  Sendell's gift; its lesson tune, the mountain's tune and the Desert's tune are new. No melody, recording or
  arrangement of LBA1/LBA2 or of anything else was used or consulted.
- Wiring: `MOODS.school {track, alt: 'home'}`, `MOODS.mountain {track, alt: 'well'}`, `MOODS.hamalayi_in`,
  `PLAYLISTS.desert = ['desert_isle', 'island_b']`, `PLAYLISTS.hamalayi = ['mountain', 'well']`; a build without the
  renders plays what each place had (the playlists skip a missing piece). Rooms: wizards.js (school, tent), ihomes.js
  (the dormitory's style, the `ham-` houses). The crossfade, duck, fxDuck and output chain are untouched.
- Measured (Automated runtime): `check.py` (above; every seam below the MP3's own coding error); decoded in headless
  Chromium as the game decodes (48 and 44.1 kHz): lengths exact, peaks 0.52–0.58, 0 discontinuities over each whole
  file, loop seam jump 0.7–3.1× the local second-difference level (the shipped tracks 0.35–6.3); the bus recorded in
  headless Chromium (44.1 kHz) through the Desert, a Kesh house, the School (across its loop seam), the Hamalayi, the
  hall and a Lhar house, nulled against the source: median residual −71 to −72 dB, the School's stretch across its
  loop seam worst −58 dB; the Desert's worst blocks (−44 dB, on the shaker's eighth notes) are the two resamplers'
  difference above 8 kHz (below 8 kHz: worst −61 dB); fitted gain 0.55 = the slider. Section loudness was evened
  after a first render (the Desert's A2 was 4 dB under its A, the mountain's chant 5 dB under, the School's mischief
  4 dB under: the fiddle, choir and bassoon raised; now every section but the intros and the thinned ends within
  −16 to −21 LUFS). Decode: ~200 ms each off the main
  thread, 40–42 MB decoded (Sea Wind 69, The Well 56: the Desert and the Hamalayi now start on smaller buffers).
- Tests: `tests/music-places.mjs` (each piece in its place on the real audio clock, the alt fallback) PASS 21/21;
  `tests/music.mjs` PASS 26/26 (the Desert and the Hamalayi now have two pieces); `tests/voices.mjs` PASS 27/27;
  `tests/hamalayi-life.mjs` PASS 18/18 (the hall's music); `tests/island-doors.mjs` PASS 89/89 (Kesh's and the
  Hamalayi's houses in and out); `tests/audio.mjs` 5/6: the sliders check fails on the effects
  bus (0.51–0.60 for 0.5) **on the base build as well** (same value with this pass's files reverted): not this pass's.

## Not done, by need
1. One piece for every cave and temple: Tralu's cave, Citadel's old sewers, the Temple of Bù and its maze, the Temple of the Dark Monk all play The Well (written for the well cave). A "temple" piece would separate the old temples from the caves.
2. Otringal's bar and Zeelich's council rooms play Zeelich's outdoor exploration playlist at full volume: a bar piece
   (and the council as `zeelich_in`, or a hall piece) would fit better.
3. The prologue's storm plays The Well (a cave drone for a storm on the island).
4. Sea Wind is still the Desert's second piece (Citadel's): a second Desert piece would make the island its own.
5. Listening: every piece above, the balance between instruments, whether the School's lydian sparkle and the
   mountain's drone sound as meant; the user's hardware (the crackle report is separate: docs/MUSIC.md MUSIC-CRACKLE).

## Listening files (outside the repository; not shipped)
`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/music2/` with `LISTEN.txt`:
each piece whole (the game's file), two excerpts, the loop seam at 8 s; before/after pairs per place as the game plays
them (gain and low-pass applied); the game's own music bus captured in headless Chromium per place, and a matched
game/source pair across the School's loop seam.

## Reproduce
```sh
python3 -m venv /dev/shm/musvenv && /dev/shm/musvenv/bin/python -m pip install -r tools/music/requirements.txt
MUSIC_SF2=<path to MuseScore_General.sf2> /dev/shm/musvenv/bin/python tools/music/build.py school mountain desert_isle
/dev/shm/musvenv/bin/python tools/music/check.py school mountain desert_isle
python3 -m http.server 8123 &  node tests/music-places.mjs
```
Builds are deterministic (the shipped asylum re-rendered bit for bit here before the new pieces were made).
