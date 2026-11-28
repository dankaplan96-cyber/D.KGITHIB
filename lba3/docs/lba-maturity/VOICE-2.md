# VOICE-2 (P21): expressive voices

Evidence label for everything below: **Automated runtime only; nothing listened to.** Headless Chromium (SwiftShader),
an OfflineAudioContext at 48 kHz through a copy of the game's voice bus, and the running game in Playwright. Nobody here
can listen. No number in this file says that a voice sounds human, pleasant or expressive; only the user can judge that.

## The request

The user, 14.11: "The voices resemble English, but sound monotonous, robotic and excessively deep. They lack expression
and natural phrasing." Keep fictional speech with English subtitles; no text-to-speech project; work in the existing
audio system; ten points (inspect first, connected phrases, intentions, a less deep timbre, distinct characters, a
consistent fictional sound, match the subtitles, quality and performance, Twinsen and Zoé first, test in the game).

## 1. What was changed

### The choice: Expressive phrase banks (candidate A), measured against an improved Words synthesis (candidate B)

Two candidates were built and rendered on the same Twinsen and Zoé lines, same timing, same voice bus, matched loudness
(`captures/voice-2/ab/`):

- **A, Expressive:** new pre-rendered phrase banks of natural, connected performances (Piper, offline, the LibriTTS-R
  model the Classic banks already use, CC BY 4.0), a made-up language, each clip performed for an intention and chosen
  by its measured melody; played by intention, length and accent.
- **B, Words after VOICE-2:** the P18 formant synthesis with its measured faults corrected (pitch, darkness, contrast,
  intonation, vibrato, voicing).

A was chosen as the default. On every measure that separates natural speech from the synthesis it sits with natural
speech (the Classic Piper phrases) and B does not (tables in section 3): the spectral tilt (A -5.6 dB/oct, Classic -5.4,
B -7.6, Words -8.6), the energy above 3 kHz (A 0.43 %, Classic 0.37 %, B 0.07 %, Words 0.03 %), the loudness contrast
between syllables (A 5.9 dB, Classic 5.2, B 2.9, Words 1.8) and the voiced share (A 49 %, Classic 38 %, B 78 %, Words 84 %:
a continuous hum). B keeps a synthesiser's timbre whatever its parameters; the brief's own point 2 asks for expressive
phrase recordings as source material rather than manufacturing expression from a flat source. B is kept as the Words
choice (better than before on each measure) and is the comparison in the audition view.

### Settings → Sound → Voice Style

- **Expressive** (new, the default), **Words** (now B), **Classic** (unchanged: the Piper banks of VOICES-PIPER).
- Settings saved before VOICE-2 hold "words" because P18 wrote its default for everyone: they move to Expressive once
  (`settings.voiceV = 2`). A Words or Classic choice made afterwards is kept. No value, a wrong value or unreadable
  settings load as Expressive. Old saves are untouched (voice settings are not in saves).

### The Expressive banks (`assets/voice2/`, `tools/voice-render/piper-expressive.py`)

- **35 banks, 6.62 MB** (+ a 541 KB manifest): the main cast (Twinsen, Zoé, Arthur, Baldino, Vesk, Sendell, Gilbert, Mira,
  Doran: 144 clips each) and ten resident families (Quetch, Grobo, Rabbibunny and Esmer men and women; Quetch and Grobo
  children), one to three speakers per family, 31 clips each. Ogg Opus, 20 kbps, as the Classic banks.
- **A fictional language of its own** (brief point 6). The made-up words are written as phonemes (Piper's `[[ ]]`
  input), not as letters, so no English spelling rule turns them into English: open syllables, pure vowels (a e i o u, a
  tap for r between vowels), each people's own consonants (Quetch m n l v d t s r k; Grobo b g d m n r h l; Rabbibunny
  p b t l n m k v; Esmer s z v l n r h), few closing consonants, no clusters. Words that are English are rejected.
  Example Twinsen clips: `kˌɔːvɑl vɑː dˈɑː?`, `nˈɔːlɔ tˌɔːsɔn tˌiː.`; Zoé: `mˌɑːɹɑnɛ vˈɛ?`.
- **Intentions performed, not randomised** (brief point 3): neutral (tell), a clause that goes on (cont), curious (ask),
  uncertain (unsure: a short "mm"/"eh" and a pause first), pleased (warm; one variant opens with a released breath, for
  relief), concerned (worry), urgent (excl), annoyed (no). Each sets the punctuation that gives Piper its tune, the pace,
  Piper's expressiveness and timing freedom, where the main stress goes (early or late), and a loudness offset (urgent
  +2 dB, worried -1.5, unsure -2).
- **Chosen by measurement**: each clip is the best of up to 6-10 renderings scored against its intention's shape
  (praat pitch track): a neutral line within a semitone of the speaker's level with a falling end; a curious question
  rising at least 2.5 semitones at the end, or (half the variants, "not every question rises") a high key word with a
  level end; urgent 1-3.2 semitones above the speaker's level, never more than 8 semitones above it at its peak
  (excited, not shrill); annoyed compressed and falling; concerned a little higher, its end level; no squeaks (no frame
  more than 9 semitones over the clip's median); no hard attack (the Classic banks' click measure). The accent each clip
  actually carries (pitch, loudness and length of each syllable) is measured and stored (`acc`).
- **Pitch** (brief point 4): speakers chosen nearer each character (`tools/voice-render/choose-speakers.py`: all 904
  speakers surveyed; pitch window, a man's or a woman's vocal tract by formant dispersion, expressiveness, clean voice,
  timbre apart from the others), then moved by **PSOLA** (praat Change gender, formants kept) by at most 2.5 semitones,
  the clip's own melody moved as a whole so an urgent clip stays above a neutral one. Not the Classic banks' sox pitch
  shift, which moves the formants too.
- **Less filtering**: the top shelf at 6 kHz -2 dB and a 9 kHz low-pass (Classic: -4 dB at 5 kHz, 7.5 kHz), a gentle
  high-pass under each voice (75-140 Hz), the Classic de-esser.
- **Loudness**: every clip to the same speech level, then the intention's offset, every bank to -20 LUFS, then each
  bank's game gain set so that, through the voice bus, all 35 land at -16.5 LUFS (`tools/voice-render/v2-gain.mjs`;
  before it they spread over 3 LU, -15.8 to -18.8).

### Voice profiles (Expressive)

Speaker: the LibriTTS-R speaker id. Pitch: the speaker's own median (praat, nine neutral phrases) -> the bank's (PSOLA,
at most 2.5 semitones). Range: the melody widened about its median. Pace: Piper's length scale (above 1 slower).
Expressive: Piper's noise scale (how much a performance varies). Classic pitch for comparison.

| character | speaker | pitch Hz (Classic) | range | pace | expressive | sounds (consonants / vowels) | delivery |
|---|---|---|---|---|---|---|---|
| Twinsen | 549 (new) | 142 -> 158 (130) | x1.1 | 0.98 | 0.75 | m n l v d t s k / a e o i | warm, direct; a short "hm" before answering a question or a worry; varied accent |
| Zoé | 161 (kept) | 201 -> 218 (206) | x1.1 | 0.95 | 0.80 | l n m s v r t / e i a | clear, connected, her own vowels (e, i); concern quickens her (pauses x0.85), not higher |
| Arthur | 693 (kept) | 228 -> 262 (274) | x1.05 | 0.88 | 0.85 | b p d t k m n / i a o e | quick and light, no squeak (no frame more than 9 semitones over a clip's median; urgent at most 8 over his level) |
| Baldino | 441 (kept) | 139 -> 142 (140) | x1.15 | 0.86 | 0.90 | b d l n p z / o i a e | momentum: quick between clauses, a beat (x1.6) before the last; a comma before the last word in most long clips |
| Vesk | 156 (new) | 102 -> 112 (93) | x1.0 | 1.12 | 0.55 | t k v s d r n / e a o, words closing on s t n | measured: slower, steadier, pauses x1.3; short and decisive (x0.75) before a refusal or an order; tension in timing, not a lower pitch |
| Sendell | 372 (kept) | 209 -> ~242 (262) | x1.0 | 1.35 | 0.50 | l m n v s h / a e o u | calm and spacious; her spirit chain kept (shimmer, a quiet octave halo, a wet room under the voice) |
| Gilbert | 353 (new) | 106 -> 112 (90) | x1.05 | 1.08 | 0.70 | g r b d h m / o u a | an old man's grumble, no longer a 90 Hz rumble |
| Mira | 595 (kept) | 215 -> 228 (232) | x1.05 | 0.92 | 0.85 | m l r s v n / a i e o (a Rabbibunny's) | brisk |
| Doran | 413 (kept) | 101 -> 108 (96) | x1.0 | 1.10 | 0.70 | b r d g m n / o u a | unhurried |
| Quetch men (3) | 758, 275, 328 | 125 / 132 / ~136 (105-118) | x1.05 | 1.00 | 0.80 | Quetch | each resident keeps one speaker (by their id), moved at most 1 semitone to their own pitch |
| Quetch women (3) | 853, 566, 195 | 205-225 (185) | | 0.97 | 0.85 | Quetch | |
| Quetch children (2) | 54, 449 | 255-280 (264) | | 0.90 | 0.90 | Quetch | |
| Grobo men (3) | 867, 618, 742 | 108-~114 (89-103) | | 1.08 | 0.75 | b g d m n r h l / o a u | big, not a growl |
| Grobo women (3) | 507, 213, 865 | 175-195 (165-171) | | 1.04 | 0.80 | Grobo | |
| Grobo children (1) | 351 | 245 (250) | | 0.95 | 0.90 | Grobo | |
| Rabbibunny men (3) | 291, 492, 476 | 135-150 (125-132) | | 0.90 | 0.90 | p b t l n m k v / i e a o | quick |
| Rabbibunny women (2) | 207, 681 | 220-240 (206-211) | | 0.88 | 0.95 | Rabbibunny | |
| Esmer men (3) | 812, 616, 795 | 140-155 (147-150) | | 1.04 | 0.70 | s z v l n r h / e i a o | airy |
| Esmer women (3) | 551, 229, 377 | 215-235 (212-218) | | 1.00 | 0.75 | Esmer | |

Speakers chosen by measurement only (formant dispersion for a man's or a woman's vocal tract, pitch window,
expressiveness, harmonics-to-noise ratio, timbre distance from the others): `tools/voice-render/expressive-speakers.json`.
Twinsen's first pick (88) was replaced by 549 because its formant dispersion (1087-1092 Hz) bordered on a woman's;
549 measured 1030-1034 Hz in two runs. Families with fewer than three speakers had no more candidates in their window.

### Playback (`src/engine/voice.js`, `voiceplan.js`)

- A line is planned whole when it starts: its clauses (punctuation), each clause's intention from the line's metadata or
  its words, the word that carries the accent. Each clause plays one clip: its intention, the nearest length, among that
  length's variants the one whose measured accent is nearest to the emphasis word, a breath first for relief, never a
  clip used in the bank's last six, then the line's own hash (the same line, the same performance; said again at once, a
  different one).
- Clauses are joined at their measured sound edges with the planned pause between (a comma 0.13 s, a full stop 0.3 s,
  "..." 0.42 s, plus any pause the metadata adds). The speaker's own timing between clauses (brief point 5): Vesk 30 %
  longer pauses, but 25 % shorter before a refusal or an order; Baldino quick, then a beat before his last clause; Zoé's
  concern quickens her.
- **Never stretched**: a cinematic's subtitle first takes shorter clips, then drops its last clauses. A short subtitle
  plays a short clip; the voice may end before the reading does.
- One playback rate per line (only a resident's small move to their own pitch, at most a semitone): no pitch jumps
  between clauses, no per-syllable randomisation.
- **Twinsen's "hm"** before answering a question or a worry (as before) comes from his bank.
- **No overlap**: a new line never starts over the previous one's fading tail (it starts at least 90 ms after the
  release). A skip or close fades the line with a 25 ms time constant; its sources stop 0.15 s later (as before).
- The talking mouth follows each clip's own syllable timings (Piper's phoneme alignment), as Classic.
- A voice without a bank (Mosquibees, moles, Spheros, machines...) is synthesised as in Classic.
- The opening film's gestures use the Expressive line's length (`planVoiceLine`).

### The metadata (`src/game/text/voicemeta.js`)

- 357 lines by key, all found by their text in the game: the opening film, the home and town scenes, chapter 1 entirely
  (including the confrontation with Vesk), chapters 2 and 3, the epilogue, and the main cast's key lines in chapters 5-10
  (Sendell, Arthur's call, the return home, the network). Each gives one intention per sentence, optionally the
  emphasis word, a hesitation, a breath, an extra pause.
- A line without an entry is read from its words and punctuation with more cues than before (`intentOf`: uncertain,
  urgent, pleased and annoyed words besides the old ones).

### Words after VOICE-2 (candidate B, `voicewords.js`, `voice.js brighter`)

- Pitch from the speaker's Expressive bank (Twinsen 158 Hz, not 130; Vesk 112, not 93).
- The source a third less tilted, the brightness ceiling the soft style had cut by 38 % raised again (at most 4.6 kHz),
  formants a fifth narrower, vibrato down to 40 %, voiceless consonants nearly silent inside a phrase again (the P18
  murmur 0.15 -> 0.07), their noise 2 dB stronger.
- Stressed syllables longer and louder, small words quicker and softer, the melody 45 % wider with a clear accent on the
  metadata's emphasis word, a question's rise 40 % larger; the metadata's intentions.
- `setWordsLegacy(true)` plays Words exactly as on 14.11 (the audition view's "before").

### The audition view (`src/engine/voicelab.js`)

`index.html?voicelab`: developer only, in no menu. Character (17: the main cast and family residents), intention (the
eight), variant (four lines each), style (Expressive / Words after VOICE-2 / Words before / Classic), Play, Stop, and
"Play all styles" one after another. It plays through the game's own Babble and a copy of the voice bus.

## 2. What was listened to

**Nothing.** No one in this session can hear audio. Every file in `captures/voice-2/` was produced and measured, none
was heard. Listening review is pending and belongs to the user.

## 3. What was verified technically

### The causes of the low, robotic sound (diagnosis, before any change)

Five speakers (Twinsen, Zoé, Arthur, Vesk, Joss) x statement, question, warning, warm line; `captures/voice-2/before/`.
Medians over the 20 lines:

| mode | f0 Hz | range st (5-95) | pitch sd st | syll. timing CV | syll. loudness sd dB | join dip dB | voiced | tilt dB/oct | centroid Hz | < 250 Hz | > 3 kHz | voice / typing | max click crest |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Classic (Piper) | 136 | 9.2 | 2.83 | 0.32 | 5.2 | -2.6 | 0.38 | -5.4 | 480 | 0.311 | 0.0037 | 2.41 | 7.4 |
| Words (14.11) | 132 | 5.3 | 1.65 | 0.39 | 1.8 | -4.4 | 0.84 | -8.6 | 406 | 0.325 | 0.0003 | 2.60 | 6.1 |

Not one cause; in order of size:

1. **Darkness from the processing, not only the pitch.** Words' spectrum fell 8.6 dB an octave (Vesk 11.6, Joss 9.1)
   against the natural phrases' 5.4, with almost nothing above 3 kHz (0.03 % against 0.37 %). Source: the soft style's
   added source tilt (+0.4), its brightness ceiling (x0.62, at most 3.4 kHz, two low-pass stages), formant bandwidths
   x2.2. A voice with no air reads as large and deep at any pitch.
2. **Low pitch.** P18 gave Words the Classic banks' pitch (Twinsen 130 Hz, Vesk 93, Joss 115); the synthesis's own
   values had been higher (Twinsen 195). The Classic banks themselves are low: Twinsen's speaker 118-136 Hz, Vesk 81-99,
   Gilbert 90, the Grobo men 89-103, the Quetch men 105-118.
3. **A flat melody.** Words' pitch spread was 1.65 semitones (Classic 2.83), Vesk's 0.97; the question's rise often
   under 2 semitones (Twinsen's "The shell? What shell?" +1.4 against Classic +8.4). The range was the voice's own
   (4-5 semitones), accents small, the intention's ending modest.
4. **Equal emphasis.** The syllables' loudness varied by 1.8 dB (Classic 5.2): stress changed amplitude by 12 %, and the
   line's normalisation and the bus compressor flattened the rest.
5. **A continuous hum.** Voiced 84 % of the time (natural speech here 38-65 %): legato at least 0.9 and a murmur through
   every voiceless consonant (P18's fix for deep joins).
6. **A constant vibrato** on every vowel (5.2 Hz), and intentions read from punctuation only.
7. **Not the cause:** syllable timing was not uniform (CV 0.39, Classic 0.32); joins were not chopped (median -4.4 dB).

### After

Same five speakers and lines (`captures/voice-2/after/`, the final banks), medians over the 20 lines:

| mode | f0 Hz | range st (5-95) | pitch sd st | syll. timing CV | syll. loudness sd dB | join dip dB | voiced | tilt dB/oct | centroid Hz | < 250 Hz | > 3 kHz | voice / typing | max click crest |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Words after VOICE-2 (B) | 162 | 6.8 | 2.21 | 0.40 | 2.9 | -5.1 | 0.78 | -7.6 | 486 | 0.234 | 0.0007 | 2.58 | 6.1 |
| **Expressive (A)** | 170 | 9.5 | 2.70 | 0.35 | 5.9 | -3.7 | 0.49 | -5.6 | 446 | 0.376 | 0.0043 | 2.29 | 7.1 |

Loudness per speaker, Expressive (four lines each, through the voice bus): Twinsen -16.2, Zoé -16.6, Arthur -16.9,
Vesk -17.8, Joss -17.3 LUFS; true peaks -1.9 to -2.5 dBFS (Words 14.11: -16.2 to -16.9; Classic -15.9 to -18.3).

Per speaker (median f0 Hz / pitch sd st / syllable loudness sd dB / voiced / tilt dB/oct / > 3 kHz):

| speaker | Words 14.11 | Expressive |
|---|---|---|
| Twinsen | 132 / 1.96 / 1.5 / 0.82 / -8.8 / 0.01 % | 167 / 2.47 / 5.2 / 0.57 / -6.3 / 0.30 % |
| Zoé | 208 / 2.58 / 2.2 / 0.83 / -7.4 / 0.04 % | 233 / 2.67 / 7.7 / 0.57 / -5.6 / 0.58 % |
| Arthur | 274 / 1.70 / 2.1 / 0.87 / -5.7 / 0.14 % | 288 / 2.44 / 5.4 / 0.45 / -5.8 / 0.32 % |
| Vesk | 94 / 0.97 / 1.6 / 0.86 / -11.6 / 0.01 % | 114 / 2.96 / 6.0 / 0.31 / -5.4 / 0.35 % |
| Joss (Quetch man) | 116 / 1.64 / 1.9 / 0.78 / -9.1 / 0.03 % | 133 / 3.97 / 5.2 / 0.39 / -5.6 / 0.46 % |

The share under 250 Hz is higher with Expressive (0.38 against 0.33): at 150-290 Hz the fundamental itself lies under
250 Hz; the tilt and the share above 3 kHz, the measures of a dark, muffled voice, are those of natural speech.

### Twinsen and Zoé A/B (brief point 9; `captures/voice-2/ab/`)

Greeting, curious question, worried observation, urgent warning, warm reply each; Classic, Words 14.11, Words after
VOICE-2, Expressive. Loudness of each speaker's five lines: Twinsen -16.6 / -16.6 / -16.4 / -16.6 LUFS, Zoé -16.3 /
-16.6 / -16.5 / -16.5 LUFS (matched within 0.3 LU). True peaks -2.0 to -3.1 dBFS. Medians over the ten lines:

| mode | f0 Hz | pitch sd st | syll. loudness sd dB | voiced | tilt dB/oct | > 3 kHz | voice / typing | max click crest |
|---|---|---|---|---|---|---|---|---|
| Classic | 204 | 2.74 | 5.4 | 0.42 | -5.2 | 0.42 % | 2.87 | 6.5 |
| Words 14.11 | 204 | 2.46 | 2.3 | 0.79 | -7.6 | 0.02 % | 2.88 | 6.0 |
| Words after VOICE-2 | 222 | 2.96 | 3.2 | 0.76 | -6.8 | 0.07 % | 2.82 | 6.1 |
| Expressive | 212 | 2.71 | 7.8 | 0.57 | -5.6 | 0.56 % | 2.53 | 7.0 |

### The chapter-1 conversation (76.8 s, 15 lines, over home.mp3 ducked as in the game)

| mode | voice LUFS / true peak | mix LUFS / true peak | pitch sd st | syll. loudness sd dB | voiced | tilt dB/oct | > 3 kHz | voice / typing (median) | worst click crest |
|---|---|---|---|---|---|---|---|---|---|
| Words 14.11 | -16.3 / -2.7 dBFS | -16.3 / -2.4 | 1.98 | 1.5 | 0.84 | -7.5 | 0.03 % | 2.79 | 6.0 |
| Expressive | -17.1 / -2.0 dBFS | -17.3 / -1.6 | 2.64 | 5.2 | 0.52 | -6.1 | 0.44 % | 1.97 | 8.3 |

- Every cinematic line ended inside its subtitle (voice 0.46-1.58 s against subtitles of 1.7-2.5 s); the voice is
  shorter against the typing than before (median 1.97x the typing time at 50 characters a second, Words 2.79x).
- The worst click crest, 8.3, is Gilbert's "My pipes are fine!": a plosive onset after silence. Measured on every one of
  the 2,104 Expressive clips alone (`tools/voice-render/v2-clicks.py`), 414 exceed 7, almost all at a word-initial
  consonant's release just after the clip's lead silence. A softer onset envelope, or a 7-8.5 kHz low-pass, left most of
  them over 7 (tried on the 60 worst: medians 7.3-9.1 against 9.3). The Classic Piper banks measure the same way (the P18
  conversation's worst 9.1). In the suites' own checks (turn changes, rapid skipping) Expressive stays under 7 (6.1).
  This is a property of natural consonant releases on this measure; whether any of them is heard as a click is for
  the listening review.
- No clipping anywhere (true peaks -1.6 dBFS or lower, the voice -2.0).

### Cast sampler (`captures/voice-2/cast-sampler-expressive.mp3`)

"Have you seen the pump?": median pitch per speaker (Hz) and pitch spread (5-95 %, semitones): Twinsen 193 / 6.2, Zoé
236 / 9.9, Arthur 296 / 7.6, Baldino 182 / 9.8, Vesk 125 / 4.1, Sendell 268 / 2.8, Gilbert 139 / 10.2, Mira 284 / 9.3,
Doran 130 / 7.9, Joss (Quetch man) 145 / 8.2, Nara (Esmer) 287 / 7.6, Brum (Grobo man) 133 / 9.6, Tilde (Rabbibunny)
287 / 4.5. Then Zoé worried (233 Hz, 7.8 st) and pleased (273 Hz, 6.9 st). A question sits higher than each speaker's
level, as a question should; Vesk and Sendell keep the narrowest melodies (measured, spacious).

### Suites (the snapshot on port 8940, one at a time, SwiftShader)

| suite | result | what it covers here |
|---|---|---|
| `voice-phrase` | **64/64 PASS** | Classic, synthesis, Words and Expressive offline: one utterance per line, release, rapid skipping (no stacking, no clipping, crest < 7), turns, mute; the Expressive banks (size under 9 MB, every intention, every clip's edges and syllables); the metadata's intentions; a repeated line not the same twice running; a speaker cutting in starts 90 ms after the release, silent 0.15 s after it; in the game Classic, Words and Expressive lines released and closed; a line's start 0.4-4 ms of main thread; the settings migration (no value, a wrong value, unreadable, Words saved before VOICE-2 -> Expressive; Words chosen since stays); Classic picked and kept after a reload. |
| `voice-2` (new) | **9/9 PASS** | In the game: a quiet conversation at home (Zoé, Twinsen with his "hm", Arthur), Gilbert outdoors in Citadel, the chapter-1 confrontation (Zoé urgent, Vesk, Twinsen annoyed then urgent, Vesk annoyed: one voice at a time), E every other frame through ten lines (never two voices, peak 0.01, silence after), the same NPC five times (never the same performance twice running), pause in a cinematic (silent under the pause, the next subtitle speaks after resuming), a scene change mid-line (no stacking, silence after the close), the start of a line 0.4-0.5 ms in Citadel with 30 people about. |
| `voicelab-smoke` (new) | **2/2 PASS** | `?voicelab` opens with 17 characters, 8 intentions, 4 styles; a line plays in each style; no page error. |
| `voices` | 27/27 PASS | the classic synthesis's measures, neighbours apart, babble, signs, skip, close, cinematic pause (now with Expressive the default in the game). |
| `menus` | 39/39 PASS | the Sound page's rows, the Voice Style control. |
| `uipass` | 25/25 PASS | every Settings row has its line (Expressive's included). |
| `opening` | 41/41 PASS | every subtitle line voiced, mouths moving. |
| `chapter1` | 32/32 PASS | |
| `prologue` | 31/31 PASS | |
| `cast-rounds` | 221/221 PASS | |

Not run: there is no indoor/outdoor acoustic difference to test (the voices have no room processing in either), and no
low-spec hardware here; the headless machine is the only one measured.

### Cost

- **Main thread per line (Expressive):** the metadata lookup and the plan, median 0.04-0.06 ms, 99th percentile
  0.3-0.7 ms over the game's 4,012 English strings (`tools/voice-render/v2-plan-cost.mjs`); in the game the whole start
  of a line (metadata, plan, clip choice, scheduling) measured 0.4-0.5 ms in Citadel with 30 people about (voice-2) and
  under 5 ms for the first line (voice-phrase). No synthesis: the clips are pre-rendered, decoded off the main thread.
- **Per frame:** nothing new.
- **Memory:** a main-cast bank decodes to about 12-30 MB at 48 kHz (its 175-320 s), a family speaker's to 6-8 MB; at most
  five banks stay decoded when not in use (as Classic).
- **Download:** banks load only when their speaker is near or speaks; 6.62 MB in all.

## 4. Remaining subjective listening review (the user)

- **Whether Expressive sounds like people talking, and pleasant**: start with `captures/voice-2/ab/twinsen-AB-compare.mp3`
  and `zoe-AB-compare.mp3` (each line four times: 1 beep Classic, 2 beeps Words 14.11, 3 beeps Words after VOICE-2,
  4 beeps Expressive), then `conversation-expressive.mp3` (the chapter-1 conversation, 77 s, over its music).
- **Whether the made-up language sounds consistent and fictional**, neither English nor nearly-English; whether
  Piper's English model still colours it.
- **Pitch and age**: Twinsen now about 158 Hz (was 130), Zoé 218, Arthur 262, Vesk 112 (was 93), Gilbert 112 (was 90),
  Doran 108. Whether Twinsen sounds young and warm without sounding light; whether Vesk sounds controlled, not
  monstrous; whether PSOLA left artefacts (moves of 1-2.5 semitones).
- **The speakers chosen by measurement, not by ear**: Twinsen's new speaker (LibriTTS-R 549) was picked for a man's
  vocal tract, expressiveness and distance from Baldino and Vesk; Vesk's (156) and Gilbert's (353) likewise. If one
  sounds wrong, `expressive-speakers.json` takes another and `piper-expressive.py <bank>` renders it again.
- **The intentions**: whether urgent, concerned, pleased, uncertain and annoyed are heard as such, and whether the
  metadata's choices fit the scenes.
- **Click crest**: natural plosive releases measure 6-7.1 on the click scale (Classic 6-7.4); the suites' limit of 7 is
  met on their checks. Whether any consonant release sounds like a click.
- **Indoor and outdoor**: the voice has no room processing in either; whether it sits well over the music and the
  ambience in both.

## Files

- `assets/voice2/` (new): 35 Expressive banks and their manifest.
- `src/engine/voice.js`: the Expressive mode, its banks and manifest, `_expr`, `exprClip`, `mannerGap`, `quietAt`, the
  Expressive line length, Words `brighter` and `setWordsLegacy`.
- `src/engine/voiceplan.js`: `intentOf`, metadata in `clauses`, the `unsure` intention, the three modes.
- `src/engine/voicewords.js`: Words after VOICE-2 (`X2`), the emphasis word, the metadata.
- `src/engine/voicelab.js` (new): the audition view.
- `src/game/text/voicemeta.js` (new): the metadata.
- `src/main.js`, `index.html`, `src/game/text/common.js`: Voice Style Expressive, the migration, `?voicelab`.
- `tools/voice-render/piper-expressive.py`, `choose-speakers.py`, `expressive-speakers.json`, `v2.mjs`, `v2-gain.mjs`,
  `v2-table.mjs`, `v2-plan-cost.mjs` (new); `measure.mjs` (prosody, balance, contrast), `render.mjs` (modes, text
  modules), `clip-edges.py` (a bank folder argument).
- `tests/voice-2.mjs` (new), `tests/voice-phrase.mjs` (Expressive, the setting).
- `captures/voice-2/` (new): the listening files and measurements, README.

## Resume notes

- Banks: `PIPER_SITE=<piper-tts, praat-parselmouth> python3 tools/voice-render/piper-expressive.py [bank ...]`, then
  `node tools/voice-render/v2-gain.mjs`.
- Measures and files: `node tools/voice-render/v2.mjs diag|ab|cast|talk <out> [modes]`.
