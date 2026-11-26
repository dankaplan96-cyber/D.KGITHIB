# P18: voices shaped by the line's English letters

Evidence label for everything below: **Automated runtime only; nothing listened to.** Headless Chromium with
SwiftShader. The audio was rendered in an OfflineAudioContext through the game's own voice bus. Nobody here can
listen, so nothing in this file says how a voice sounds.

## The request

The user (12.11, translated): "The characters' voices are fine. I want it to sound more like English in terms of the
letters, if possible."

- Keep: each voice's colour, pitch, pace and melody.
- Change: the babble's sounds should follow the line's own English text. "Have you seen the pump?" should carry its
  h-a-v, y-ou, s-ee-n.
- Stay: nonverbal. There is no speech engine at runtime, no recordings, and it should not become intelligible.

## What the game does now

Settings → Sound → **Voice Style**: **Words** (new, the default) / **Classic** (the voices before P18). The choice is
saved with the other settings. Settings saved before P18 have no Voice Style, so they load as Words, and so does an
unknown value or unreadable settings (tests/voice-phrase.mjs part 3).

### Words: from the letters to the syllables (src/engine/voicewords.js)

1. **The line's clauses.** The punctuation splits the line into clauses, each with a pause and an intention (tell,
   ask, exclaim, refuse, worry, warm, goes on). This is the same splitter the classic voices use
   (voiceplan.js `clauses`).
2. **Letters to sounds** (`g2p`). Simple English rules:
   - consonant digraphs: th (voiced in the/this/that/them/there…), sh, ch, tch, ph, wh, ck, ng, nk, qu, dge, kn-, wr-,
     -mb;
   - vowel digraphs: ee, ea, oo (short before k and d), ou, ow, ai/ay, ei/ey, ie, oa, oi/oy, au/aw, ew/ue, igh, eigh,
     ough;
   - the silent final e, which lengthens the vowel before it (name, time, hope, cute), also before -s and -d (names,
     hoped);
   - soft c and g; a voiced s between vowels and after a voiced sound; r after a vowel (er/ir/ur, ar, or);
   - endings: -tion, -sion, -ture, -ous, -le, -ed, -es;
   - about 150 common words that break the rules (the, one, said, would, people, water, the cast's names) and the
     contractions.
3. **Syllables** (`syllabify`). The most consonants that can start an English syllable go to the next one (st, pl,
   str…).
4. **Word stress.** Content words are stressed on the first syllable, on the second after a prefix (be-, re-, un-…),
   and on the syllable before -tion/-ic/-ity. Small words (the, of, to, is…) are unstressed and quick. An unstressed
   short vowel in a content word mostly becomes a schwa.
5. **The voice tables.** The sounds map onto `VOWELS` and `CONS`, extended with what English needs:
   - vowels ae, ih, uh, uu, er, ax (schwa), and diphthongs as a vowel gliding to a second one (ey, ay, ow, aw, oy);
   - consonants th, dh, sh, zh, ch, j, ng.
6. **Kept babble, in the speaker's colour.**
   - Each consonant may move to a neighbour of the same kind and voicing (p t k, b d g, f th s sh, m n, l r, w y).
     A consonant the speaker or their people favour moves less often (22 %), others more often (40 %), and they move
     towards the favoured ones. Of the onsets in the game's text, about 40 % are spoken as written; the rest keep their
     kind of sound.
   - A few vowels move to the next one (14 %).
   - Each people colours the sounds: Esmers voice their stops and fricatives, moles hum (stops become nasals),
     Mosquibees buzz, triangle-heads and machines clip, Sendell softens his stops to breath.
   - What stays is the shape of the words: their length, stress, vowels, and where their consonants sit.
7. **The speaker's delivery.** Pace, melody, contour, range, accents, the intention's ending, and the manners
   (Twinsen's "hm", Baldino's momentum and his beat before the last word, Vesk's clipped refusals, Zoé's sharpened
   worry, Sendell's spaciousness) use the same formulas as the classic gestures (voiceplan.js `gesture`).
8. **About as long as today.** The line is fitted to the length the classic line has. For a speaker heard from a
   phrase bank, that is the length of the Piper clips the classic line would play (voice.js `bankLength`).
   - Order of fitting: small words and unstressed vowels shortened; up to 15 % quicker; small words left out of the
     longer clauses; a long word's unstressed middle syllable swallowed; up to 30 % quicker.
   - It never drops below 70 % of the written syllables. Past that the words would no longer shape the line, so the
     line is let run longer instead.
   - A cinematic subtitle may still drop the last clauses, as before.

### Words: the voice (src/engine/voice.js `wordsVoice`)

A speaker who has a phrase bank keeps that bank's measured pitch and pace in Words mode: what the user has heard
since VOICES-PIPER, not the synthesis's own values.

- Twinsen is at 130 Hz (the synthesis alone had 195), Zoé at 206 Hz, Arthur at 274 Hz.
- A resident uses their family speaker's pitch, moved toward their own as before.
- Words are joined (legato at least 0.75), as the phrases are.
- Formant scale, brightness, breath, vibrato and the rest come from the speaker's voice as before.

### Words: playback, and why this one

The pre-rendered banks cannot follow arbitrary text: a clip is a fixed performance chosen by intention and length.
Four ways were weighed.

| Option | Verdict | Measured reason |
|---|---|---|
| Cut syllables out of the speaker's Piper bank and join them to spell the line | rejected | A bank holds 6-10 consonants and 3-5 vowels, and a family speaker about 108 syllables. Twinsen's bank covers 71 % of the consonants in the game's English text and 68 % of its vowels (by nearest vowel); an Esmer woman's 43 % and 59 %; a Grobo man's 37 % and 45 %. Missing are dh, p, w, f, b, h, g, ng, sh, th, j, ch and y in various banks. The letters could not be followed. Every join would also be a cut between two unrelated performances, the clipped sound the user rejected on 2.11 and 3.11. |
| Re-render the banks with English-shaped words | rejected | Piper is not part of the game. The text has 3,626 English lines and is still being written (chapter 9 is in progress). Thousands of files would go stale. |
| Words lines on the live synthesis chain (pooled filters, voice.js `_synth`) | measured, not chosen | On joins and voicing it equals the render (median join -6.9 dB against -6.0, 26 % deep for both, 89 % voiced for both). Its click crest is lower (4.8 against 5.9; both under the suites' 7). |
| **Words lines rendered by the sample-level formant synthesiser** (voicesynth.js, the VOICE-PHRASE banks' own) | **chosen** | See the tables and the reasons below. |

Why the rendered line was chosen:

- It is the synthesiser the VOICE-PHRASE banks were made with, so "brought up to the banks' quality" literally.
  - A glottal pulse, five cascade formants gliding sample by sample, nasal pole and zero.
  - Voicing carried through the voiced consonants.
  - True voiced fricatives (voice and noise together), stop bursts, aspiration, affricates and diphthongs.
- The chain can only approximate these: one noise band, filter frequencies automated per render quantum.
- Joins, voicing and level measured within about a dB of each other (tables), and both pass the click limit, so these
  reasons decided.
- A rendered line also repeats sample for sample, which the tests check.

What the rendered line costs:

- **In the game, the render runs in a worker**, a blob made from voicesynth.js's own functions, as main.js's
  thumbnail worker is. The frame on which a line starts does no synthesis; it plans the line (median 0.3 ms).
- The line is scheduled a moment ahead: 40 ms plus the render's expected time, learned from the worker, at most
  250 ms. The mouth and the syllable count start then. The sound starts then too, or joins where the line has got to
  with a 20 ms fade-in if the worker answers late (the headless test machine), so the mouth and the sound stay
  together.
- The worker is made and warmed when voices are first prepared. A cold first render took 200 ms in the test game.
- Offline (render harnesses, tests) a line renders in step with the render clock.
- Nothing runs per frame. No bank is fetched or decoded in Words mode (the manifest only).

The live chain stays as an engine switch for the comparison tool (`setWordsEngine('chain')`). Classic mode is
unchanged.

Rendering problems found and fixed on the way (measurements in `captures/p18/measurements.json`):

1. **The consonants' noise was 43 dB under the vowels**, so every s, sh and f was effectively a gap. In the synthesiser
   the vowels pass the formant cascade with about +14 dB of gain, and the noise was never scaled to that.
   - Now Words noise is made at a fixed scale, each fricative with its own strength.
   - It is set against the line's own voiced level: an s about 24 dB under the vowels, sh 25 dB, f and th 34 dB.
     VOICE-SOFT's consonants stay well under natural speech's, where s sits about 15 dB under the vowels.
   - It joins after the voice's brightness low-pass, through its own 6.5 kHz low-pass. Under the 2.5-3.4 kHz ceiling
     an s had vanished.
2. **Clicks.** A line rendered at half the context's rate measured a click crest of 8.5 in the game against 5.9 as
   rendered. The playback's linear interpolation puts a corner at every source sample. Lines are now rendered at the
   context's own rate, and bursts are 14 ms, rounder and softer.
3. **Joins.** English brings voiceless stops and fricatives that the made-up Piper words mostly avoided. With a silent
   closure the median join dropped 14 dB and half of all joins dropped more than 15 dB, the "clipped" sound.
   - Now, inside a phrase, a voiceless consonant keeps a low murmur of the voice, as quick connected speech does, and
     the voice eases into it over 50 ms. A phrase's edges stay clean.
   - A banked speaker's words are joined at a legato of at least 0.9. The classic synthesis leaves air between words
     for a less legato voice, 60 ms at 0.75, and the Piper phrases have none. At 1.0 the syllables ran together
     (syllabic modulation 11.6 dB against the phrases' 16-25).
   - Result: median join -6.0 dB against classic -4.0 dB, deep joins 26 % against 16 % (tables below).
4. **Level.** The chapter-1 conversation was 2.8 LU louder than with the phrases. The gain into the voice bus was set
   from it, and the conversation now measures -16.3 LUFS against classic -16.7.

## Measurements

All from `tools/voice-render/p18.mjs`, raw values in `captures/p18/measurements.json`.

- Each line is rendered through the game's Babble and voice bus (compressor, limiter), 48 kHz, offline.
- **classic**: the Piper phrase banks, as today.
- **words**: the chosen Words playback, rendered lines.
- **chain**: the Words plan on the live synthesis chain, the candidate not chosen.

Column meanings:

- **join dip**: the median drop of the 5 ms envelope between two neighbouring syllable peaks, pauses excluded, as VOICE-PHRASE measured it. The old per-letter blips dropped 15-22 dB.
- **deep**: the share of joins dropping more than 15 dB.
- **voiced**: the share of the line's sounding time with a detectable pitch.
- **s / typing**: the line's sounding time against its typing time at 50 characters a second.
- **/ classic**: the line's sounding time against the classic line's.
- **>3 kHz**: the share of energy above 3 kHz.
- **crest**: the click measure; the suites fail at 7.

### Per line

| speaker | line | mode | peak dBFS | RMS dB | f0 Hz | join dip dB | deep | voiced | s / typing | / classic | >3 kHz | crest |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Twinsen | I fixed that yesterday. | classic | -2.3 | -15.2 | 118 | -9.2 | 20 % | 48 % | 0.88 / 0.46 | 1.00 | 0.004 | 6.7 |
|  |  | words | -3.9 | -14.8 | 130 | -6.5 | 40 % | 81 % | 1.09 / 0.46 | 1.24 | 0.000 | 5.9 |
|  |  | chain | -3.8 | -15.1 | 132 | -14.8 | 50 % | 90 % | 1.07 / 0.46 | 1.22 | 0.000 | 4.2 |
| Twinsen | Next door's kettle furred up wit… | classic | -2.2 | -15.2 | 125 | -6.7 | 20 % | 32 % | 3.35 / 1.54 | 1.00 | 0.007 | 6 |
|  |  | words | -3.2 | -14.8 | 132 | -8 | 50 % | 85 % | 3.14 / 1.54 | 0.94 | 0.000 | 5.9 |
|  |  | chain | -2.7 | -15.3 | 133 | -9.9 | 50 % | 71 % | 3.11 / 1.54 | 0.93 | 0.001 | 4.8 |
| Zoé | Twinsen. The tap's stopped again. | classic | -3.2 | -13.6 | 186 | -1.3 | 25 % | 59 % | 1.32 / 0.66 | 1.00 | 0.004 | 6.2 |
|  |  | words | -3.8 | -14.8 | 207 | -5.2 | 17 % | 86 % | 1.65 / 0.66 | 1.25 | 0.001 | 5.5 |
|  |  | chain | -5.6 | -17 | 208 | -10.4 | 17 % | 78 % | 1.65 / 0.66 | 1.25 | 0.003 | 4.3 |
| Zoé | That's warm. It's never warm. | classic | -2.9 | -14 | 225 | -6.2 | 20 % | 53 % | 1.83 / 0.58 | 1.00 | 0.003 | 5.6 |
|  |  | words | -4.2 | -14.8 | 204 | -0.9 | 25 % | 89 % | 1.93 / 0.58 | 1.05 | 0.000 | 5.7 |
|  |  | chain | -5.5 | -17.1 | 204 | -0.8 | 20 % | 85 % | 1.91 / 0.58 | 1.04 | 0.001 | 4.6 |
| Arthur | Dad, can I fix the next radio too? | classic | -2.9 | -13.7 | 247 | -3.3 | 0 % | 66 % | 2.08 / 0.68 | 1.00 | 0.001 | 7.1 |
|  |  | words | -3.6 | -14.6 | 275 | -8.9 | 40 % | 93 % | 2.32 / 0.68 | 1.12 | 0.002 | 3.9 |
|  |  | chain | -6.4 | -17.3 | 275 | -6.9 | 18 % | 93 % | 2.3 / 0.68 | 1.11 | 0.001 | 4.5 |
| Arthur | Dad? Dad! It's Arthur. Mum's bus… | classic | -2.4 | -14.1 | 290 | -2 | 33 % | 40 % | 3.75 / 1.02 | 1.00 | 0.001 | 6.2 |
|  |  | words | -2.8 | -15.2 | 275 | -5.2 | 30 % | 91 % | 3.39 / 1.02 | 0.90 | 0.002 | 5.1 |
|  |  | chain | -3.2 | -17 | 279 | -11.6 | 29 % | 89 % | 3.36 / 1.02 | 0.90 | 0.002 | 4.5 |
| Joss (Quetch resident) | The goats are back in their fiel… | classic | -2.2 | -14.7 | 119 | -6.6 | 7 % | 30 % | 3.3 / 1.74 | 1.00 | 0.003 | 5.6 |
|  |  | words | -3.1 | -14.9 | 116 | -10.7 | 27 % | 80 % | 3.52 / 1.74 | 1.07 | 0.000 | 5.9 |
|  |  | chain | -2.5 | -15 | 116 | -6.1 | 27 % | 75 % | 3.5 / 1.74 | 1.06 | 0.000 | 4.1 |
| Nara (Esmer) | Need anything? | classic | -3.1 | -14.2 | 368 | -1.5 | 0 % | 70 % | 0.48 / 0.28 | 1.00 | 0.011 | 4.3 |
|  |  | words | -4.4 | -14.8 | 242 | -0.8 | 0 % | 97 % | 0.79 / 0.28 | 1.65 | 0.001 | 5 |
|  |  | chain | -3.7 | -15.3 | 243 | -6.6 | 0 % | 100 % | 0.77 / 0.28 | 1.60 | 0.003 | 4.3 |
| Nara (Esmer) | Esmer goods. That pistol came of… | classic | -3.3 | -14.1 | 256 | -4 | 21 % | 63 % | 3.71 / 2.42 | 1.00 | 0.005 | 5.7 |
|  |  | words | -4.4 | -14.8 | 240 | -6 | 4 % | 97 % | 4.69 / 2.42 | 1.26 | 0.000 | 4.9 |
|  |  | chain | -3.5 | -15.1 | 241 | -5.9 | 23 % | 95 % | 4.65 / 2.42 | 1.25 | 0.003 | 4.2 |

### Summary over the 9 lines

| mode | median join dip | mean deep joins | median voiced | max crest | length vs classic (median) |
|---|---|---|---|---|---|
| classic | -4.0 dB | 16 % | 53 % | 7.1 | 1.00 |
| words | -6.0 dB | 26 % | 89 % | 5.9 | 1.12 |
| chain | -6.9 dB | 26 % | 89 % | 4.8 | 1.11 |

### Loudness (EBU R128, the voice alone)

| speaker | classic LUFS / true peak | words | chain |
|---|---|---|---|
| Twinsen | -17.5 / -2.2 | -16.6 / -3.2 | -17.9 / -2.7 |
| Zoé | -16.4 / -2.9 | -16.6 / -3.8 | -19.3 / -5.5 |
| Arthur | -16.5 / -2.4 | -16.5 / -2.8 | -19 / -3.2 |
| Joss (Quetch resident) | -17.1 / -2.2 | -16.8 / -3.1 | -17.8 / -2.5 |
| Nara (Esmer) | -16.2 / -3.1 | -15.9 / -4.4 | -16.4 / -3.4 |

The chapter-1 conversation (76.81 s, 15 lines, Twinsen and Zoé at home, Mira and Gilbert at the well, Doran at the harbour, over home.mp3 ducked as in the game):

| mode | voice LUFS | voice true peak | mix LUFS | mix true peak | worst click crest |
|---|---|---|---|---|---|
| classic | -16.7 | -2.2 dBFS | -16.9 | -1.7 dBFS | 9.1 |
| words | -16.3 | -2.7 dBFS | -16.3 | -2.4 dBFS | 6 |

No clipping anywhere: every peak is under -2 dBFS.

### Length over the game's whole English text (3588 lines)

Words length / classic length: for a banked speaker, the clips the classic line plays.

| speaker | pitch Hz | pace syl/s | words / classic (p10, median, p90, max) | classic / typing (median) | words / typing (median) | written syllables spoken (median, min) | plan ms (median, p99) |
|---|---|---|---|---|---|---|---|
| hero | 130 | 5.41 | 1.02, 1.07, 1.32, 2.35 | 2.02 | 2.23 | 80 %, 71 % | 0.3, 5.3 |
| zoe | 206 | 4.4 | 1.03, 1.08, 1.36, 2.41 | 2.23 | 2.52 | 80 %, 71 % | 0.3, 2 |
| arthur | 274 | 5.59 | 1, 1.07, 1.22, 2.04 | 2.03 | 2.2 | 82 %, 71 % | 0.3, 3.2 |
| farmer1 | 115 | 5.43 | 1.04, 1.08, 1.4, 2.61 | 1.92 | 2.15 | 79 %, 71 % | 0.4, 3.6 |
| nara | 238 | 4.83 | 1.04, 1.1, 1.5, 2.57 | 1.8 | 2.18 | 80 %, 71 % | 0.3, 2.5 |
| vesk | 93 | 4.89 | 1.01, 1.07, 1.29, 2.32 | 2.01 | 2.19 | 79 %, 71 % | 0.3, 2.3 |
| sendell | 262 | 3.5 | 1.05, 1.48, 2.25, 4.87 | 2.34 | 3.53 | 75 %, 71 % | 0.5, 2.9 |
| baldino | 140 | 4.92 | 1.07, 1.31, 1.69, 2.96 | 1.86 | 2.48 | 75 %, 71 % | 0.4, 2.9 |

Notes on the length table:

- The voice already outlasts the typing in Classic (about 2x the typing time at 50 characters a second). Words keeps to that within about 10 % for most of the cast.
- Sendell and Baldino run longest (medians 1.48 and 1.31). They are the slowest and the most mannered speakers, and their clips are short for their syllables.
- Example: "Have you seen the pump?" reads as `h ae v | y uw | s iy1 n | dh ax | p ah1 m p`. Twinsen speaks it as `hev yu sin dhax puhmt`.
- Over the text, 41 % of the onset consonants are spoken as written. The rest keep their kind of sound (the blur).

### Cost

Render time of a line, warm, on the main thread of the measuring page, 48 kHz. The machine was shared with other runs, so these are upper figures:

| line | sound s | ms | ms per s of sound |
|---|---|---|---|
| hero: I fixed that yesterday. | 1.52 | 18.7 | 12.26 |
| hero: Next door's kettle furred up w | 3.7 | 24.5 | 6.62 |
| hero: Five stations. Five places whe | 8.64 | 44.4 | 5.14 |
| zoe: I fixed that yesterday. | 1.7 | 19.9 | 11.72 |
| zoe: Next door's kettle furred up w | 4.38 | 15.8 | 3.61 |
| zoe: Five stations. Five places whe | 9.75 | 47.8 | 4.9 |
| sendell: I fixed that yesterday. | 2.46 | 8.2 | 3.34 |
| sendell: Next door's kettle furred up w | 4.52 | 14.2 | 3.14 |
| sendell: Five stations. Five places whe | 14.2 | 75.9 | 5.35 |

- **Worker round trip**: post, render and answer for Zoé's 1.7 s line: 32 ms.
- **In the headless game**: the first Words line took 107-200 ms in the worker, because SwiftShader's software rendering fills every core there. Its sound came 220-380 ms after the box opened, inside the test's 400 ms limit. On a machine with a GPU the render is the figure above.
- **Main thread per line**: planning, median 0.3 ms.
- **Per frame**: nothing.

### Pictures and listening files (`captures/p18/`)

- `<speaker>-classic.wav` / `<speaker>-words.wav`: the same lines, same speakers, the reading pauses between dialogue boxes cut to 0.6 s. 22.05 kHz, 16-bit.
- `twinsen-words-chain.wav`, `zoe-words-chain.wav`: the rejected candidate.
- `<speaker>-classic.png` / `<speaker>-words.png`: spectrograms, 0-11 kHz.
- `conversation-classic.mp3` / `conversation-words.mp3`: the 77 s chapter-1 conversation over its music, for listening fatigue.

What the pictures show:

- The Words voice carries little energy above about 3.5 kHz apart from its consonants (thin vertical streaks).
- The Piper voices carry breath and brightness up to 7-9 kHz.
- Spectral centroids match within -60 to +110 Hz, but the share above 3 kHz is 0-0.2 % against 0.1-1.1 %.
- The cause is the soft style's source roll-off (VOICE-SOFT, kept for comfort). Raising the brightness ceiling alone measured no change.

## Tests

All on a snapshot served at port 8940, one suite at a time, SwiftShader. All PASS.

| suite | what it covers here |
|---|---|
| `voice-phrase` | Words offline, the same mechanical checks as the phrases and the synthesis: one utterance per line, released at the next line, the reveal and the close, rapid skipping (18 lines 60 ms apart) never stacking or clipping or clicking, turns, mute. Words' own: the phones of three lines, at least 60 % of the written syllables spoken, length against classic (median 1.06, 0.80 to 2.14 over 13 speakers x 8 lines), the bank's pitch planned and heard (Twinsen 133 Hz heard), a line repeating sample for sample. In the game: Classic phrases as before, then a Words line rendered by the worker, heard, the mouth moving, released and closed. The setting: old settings, a wrong value and unreadable settings load as Words; Classic picked in Settings is applied, saved and kept after a reload. |
| `voices` | Its synthesis measurements pinned to Classic. In the game, with Words as the default: babble, silent signs, the skip, the close, the cinematic pause. Tobin now has his own voice; this check failed before P18 because of him. |
| `menus` | The new stored setting has its control. The Sound page has 4 rows, at most 5. |
| `uipass` | Every Settings row has its line, Voice Style included. |
| `opening` | Every subtitle line babbles and moves its speaker's mouth (the film steps synchronously, so Words lines are scheduled at line start). |
| `chapter1`, `prologue`, `cast-rounds` | Unchanged behaviour. |

There is no settings or save-migration suite that covers settings (`save-migration` covers game saves only). The
settings load checks are in `voice-phrase` part 3.

## What only the user's ear can decide

- **Whether Words sounds "more like English letters"**, and whether it stays babble. The blur and the people's colours
  are set by numbers, not by listening. If it sounds too much like words, the blur rates in voicewords.js
  (`colourCons`: 0.22 / 0.40; vowels 0.14) go up. If it sounds too little like English, they go down.
- **Whether the voices still sound like the same people.** Words keeps each banked speaker's pitch and pace, but the
  timbre is the formant synthesiser's, not the Piper performance the user approved on 8.11. This is the largest
  difference between the two modes, and the reason Classic stays one click away.
- **Comfort over time.** Clicks and loudness measure inside the classic range. Joins are about 2 dB deeper than the
  phrases' (median -6.0 against -4.0 dB): English has more voiceless consonants than the made-up Piper words. Whether
  that reads as lively or as choppy, and listening fatigue over a long conversation, can only be judged by ear
  (`conversation-words.mp3`, 77 s).
- **Brightness.** Words has less air above 3 kHz than the Piper voices (0-0.2 % of the energy against 0.1-1.1 %). The
  soft style's source roll-off is kept for comfort. If Words sounds dull or muffled next to Classic, lower the source
  tilt for banked speakers in `wordsVoice` and re-measure.
- **The consonant level.** s about 24 dB under the vowels is a guess between VOICE-SOFT's softness and audible letters.

## Files

- `src/engine/voicewords.js` (new): letters to sounds, syllables, stress, the babble's blur and colours, the fitted
  plan.
- `src/engine/voicesynth.js` (moved here from tools/voice-render/synth.mjs, which re-exports it):
  - clusters, codas, affricates, diphthongs, released final stops;
  - the Words consonant noise and lenition;
  - an inner loop 2.4-3x quicker (against the per-sample version on the same lines: the same RMS, spectral centroid
    and pitch within 1 Hz, joins within 1.2 dB);
  - the line render and the worker source.
- `src/engine/voiceplan.js`: the extended vowel and consonant tables, the mode, `planLine` dispatching to the Words or
  the classic plan.
- `src/engine/voice.js`:
  - the mode and the bank-matched voice;
  - the bank length;
  - the worker, its warm-up and the scheduling;
  - `_words`, and clusters and codas on the live chain;
  - Tobin's own voice (he had none; the voices test failed on it).
- `src/engine/cinematic.js`: a subtitle's voice length from the mode in use.
- `src/main.js`, `index.html`, `src/game/text/common.js`: the setting.
- `tools/voice-render/p18.mjs` (new): the measurements and the listening files.
- `tools/voice-render/render.mjs`: mode and engine options.
- `tests/voice-phrase.mjs`: Words offline and in the game, and the setting saved and loaded.
- `tests/voices.mjs`: its synthesis part pinned to Classic.
- `tests/menus.mjs`: the new stored setting.
- `captures/p18/`: the listening files and pictures.
