# VOICE-2 listening files

**Automated runtime only; nothing listened to.** Every file here was rendered and measured through the game's own
voice playback (src/engine/voice.js) and a copy of its voice bus, in an OfflineAudioContext at 48 kHz, then written as a
mono MP3. Nobody who made them could listen to them. Whether they sound human and pleasant is for the user to judge.
Details and numbers: `docs/lba-maturity/VOICE-2.md`.

The four voice styles:

- **Classic**: the Piper phrase banks of 8.11 (Settings → Sound → Voice Style → Classic).
- **Words (14.11)**: the voices the user described on 14.11 as monotonous, robotic and too deep.
- **Words after VOICE-2**: the same synthesis with its measured faults corrected (candidate B; the Words choice now).
- **Expressive**: the new phrase banks (candidate A; the new default).

## Start here

| file | what |
|---|---|
| `ab/twinsen-AB-compare.mp3` | Twinsen's five situations (greeting, curious question, worried observation, urgent warning, warm reply). Each line four times: **1 beep Classic, 2 beeps Words 14.11, 3 beeps Words after VOICE-2, 4 beeps Expressive.** |
| `ab/zoe-AB-compare.mp3` | The same for Zoé. |
| `conversation-expressive.mp3` | The chapter-1 conversation (Zoé and Twinsen at home, Mira and Gilbert at the well, Doran at the harbour), 77 s, over the home music, ducked as in the game: for listening fatigue. |
| `conversation-words-1411.mp3` | The same conversation as it sounded on 14.11, for comparison. |
| `cast-sampler-expressive.mp3` | "Have you seen the pump?" by Twinsen, Zoé, Arthur, Baldino, Vesk, Sendell, Gilbert, Mira, Doran, a Quetch farmer, an Esmer trader, a Grobo councillor and a Rabbibunny; then Zoé worried ("The pump is broken again...") and pleased ("The pump works again! Well done."). |

## The rest

| folder | what |
|---|---|
| `ab/` | Per style, each speaker's five lines alone (`<who>-ab-<style>.mp3`), and their measurements (`measurements-ab.json`). |
| `before/` | The diagnosis: Twinsen, Zoé, Arthur, Vesk and Joss (an ordinary Quetch resident), a statement, a question, a warning and a warm line each, in Classic and Words (14.11). |
| `after/` | The same lines in Words after VOICE-2 and Expressive. |

Each `measurements-*.json` has, per line: the pitch track and its median, 5-95 % range and spread; the end's rise or fall;
the syllables' timing spread and loudness contrast; the joins; the voiced share; the spectral tilt, centroid and the
shares under 250 Hz and over 3 kHz; peak, loudness (EBU R128), true peak; the click measure; the line's length against
its typing time.
