# TALK-LBA: do our conversations feel like LBA2's (and LBA1's)?

**Status: partial, handed to lba3-dialogue (wave 2).** Stopped on the coordinator's order (23.11, a new structured
polish run). Nothing in the game was changed. No browser run of our game was made, so **there are no pictures yet**.

The user, 23.11: "the conversations should be in the original LBA style."

Evidence labels:
- **LBA2/LBA1 text**: measured from the original English text banks that lba2remake.net serves (`data/LBA2/TEXT.HQR`,
  `data/LBA/TEXT.HQR`), parsed in memory and in `/dev/shm` only. Nothing original is committed here; only counts and a
  few words are quoted.
- **LBA2 presentation**: from `docs/LBA2_SOURCE_NOTES.md` (read earlier from the GPL engine source) and from
  lba2remake's own implementation (its bundle: the `MESSAGE_OBJ` handler and the `.textbox` CSS). lba2remake is a
  reconstruction, so its box style is the remake's own approximation. Its script handling follows the original data.
  The engine source on GitHub could not be opened this session (access refused).
- **Ours**: source only (`src/game/hud.js` `say`/`advance`/`updateDialog`, `css/*.css` `#dialog`), plus FACE-2.md and
  VOICE-2.md. Not seen in play this session.

## 1. Comparison table (ours vs LBA2)

| Aspect | LBA2 (LBA1 where it differs) | Ours (source only) | Match? |
|---|---|---|---|
| Starting a talk | W (the talk/search key) next to the actor, in any behaviour. No on-screen prompt. The actor's life script decides what is said (`MESSAGE_OBJ`). | The talk key, plus a "[W] Talk" prompt after 0.15 s in reach (UI-P92). | Close. The prompt is our addition, kept for clarity. |
| Camera at the start | **No change.** The exterior or isometric camera stays where it is, and the game clock pauses. Scripts only move the camera for set scenes (`CAMERA_CENTER`, `SET_CAMERA`). | Outdoors, a cut to a talk two-shot that favours the speaker (FACE-2/FACE-3). Interiors keep the iso view. | **Differs most.** |
| Text box | One box along the bottom, about 3 lines. lba2remake draws it full width, 30 px from the edges: 50 % black, a 2 px light-cyan outset frame, rounded corners, the LBA font, a drop shadow. Type-3 messages use a tall "big" box (letters, signs, books). | A bottom box, 70 vw wide (620–1180 px), 55 % black, a 1 px white frame, square corners, bold 22–30 px text (`css` line ~227, the later override of the gold-framed version at line ~87). | Close in place and weight. Frame, corners and width differ. |
| Speaker's name | **None.** The speaker is shown by the **text colour** (each actor's own talk colour) and by a speech-bubble sprite on the speaker's side, left or right. | A name tag on the box's top edge in the speaker's colour, and the text in a gradient of that colour (`--spk`). | Colour matches. The name tag is ours; LBA2 has the side bubble instead. |
| Portrait | None, in LBA1 and LBA2. | None. | Matches. |
| Reveal | Letter by letter at **50 chars/s**; the newest letters fade in through the speaker's colour. | Letter by letter at `textRate` 50 chars/s (a setting); a plain cut per letter. | Speed matches; the fade on new letters does not. |
| Advancing | First press: show the whole page. Second press: next page or end. A long message runs over several pages of the same box. `@` marks a paragraph break (3 % of LBA2 messages). | The same two presses. Each line in the array is one "page"; a line that overflows the box grows it. An optional AUTO-TALK moves on by reading time. | Matches. Page splitting differs (see line length). |
| Line length (measured) | LBA2, 1,181 dialogue messages: **median 62 chars**, 12 words, 2 sentences; 49 % ≤ 60 chars, 69 % ≤ 100, 80 % ≤ 140, 93 % ≤ 200; a sentence's median 7 words. LBA1, 871 messages: median 49 chars, 9 words, 1 sentence; 62 % ≤ 60 chars. | **Not measured yet** (next step: the same script over `src/game/text/*.js`). DIALOGUE-2 and P91 already aimed at one or two sentences a turn. | Unknown. |
| Voice | **Recorded voice actors** in the CD versions (lba2remake lists `LBA2/VOX/<lang>_*.VOX` for English, French and German; LBA1 CD likewise). Not gibberish. The only nonsense text is a few alien-language lines (e.g. scrambled letters printed as speech). | Nonverbal "pleasant gibberish": the Expressive phrase banks by intention (VOICE-2), by the user's own rule (PROJECT_CONTRACT). | Deliberately different. **Correction for the brief:** LBA's voices were real speech, so there is no "LBA gibberish voice" to match. |
| Gestures | When Twinsen speaks he plays his TALK animation (lba2remake: `AnimType.TALK`) and stops moving. Other actors do what their script sets: many turn to him, some keep working. No facial animation (LBA2 faces are textures). | Speaker faces the listener; FACE-1/FACE-2 expressions (brows, mouth, head nod/tilt, chest) per line; talk and listen poses. | Ours does more. Nothing missing from LBA's set. |
| Camera during talk | The play camera throughout. | Shot/reverse shot with cuts on a change of speaker (FACE-2's rules: held 2.2 s, etc.). | Differs (by an earlier decision: faces read at dialogue distance). |
| Overhead remarks | **Type-9 messages**: short lines in a bubble above the actor's head for about 4.5 s, without pausing the game (88 of the LBA2 messages). | Residents' ambient lines (talkAhead, barks); not checked against this. | To check. |
| Humour and tone | Short, plain, often one joke in a line; everyday business ("Gas for 10 voyages costs 30 Kashes."-type lines); polite or rude shopkeepers; ~35 messages of just "Good day"-style greetings in LBA1. | DIALOGUE-2 and P91 passes toward the same register; not compared line for line here. | To check. |
| Second talk | Decided by each actor's script: many repeat the same message, others switch to a short follow-up after a flag. | Repeat branches exist in many scenes (DIALOGUE-EDIT). | Not compared yet. |
| Choices | `ASK_CHOICE`: a short list of answers in the box; rare. | Choice menus exist in some talks (not inspected). | Not compared yet. |
| Ending | The box disappears and play continues at once; the camera never moved. | The box hides; the camera returns to his side before the chase takes over (FACE-2). | Close; ours has a camera return LBA2 does not need. |

## 2. What already matches
- A box along the bottom, translucent black, white-ish frame, no portrait.
- The speaker shown by colour (LBA2's per-actor talk colour).
- 50 chars/s typing; one press shows the page, the next one moves on.
- The game waits while the box is open.
- Text is the only carrier of meaning (no spoken English in ours; in LBA2 the voice duplicates the text).

## 3. Proposals so far (ranked; none implemented, all need the user's pick when visible, P107)

| # | Proposal | Files | Risk | Visible? |
|---|---|---|---|---|
| 1 | Measure our line lengths with the same method; split or trim only outliers over ~200 chars (LBA2's 93rd percentile) into two box pages, keeping IDs (array entries). | `src/game/text/*.js` + `he/`, `tools/he-bundle.mjs`, `tests/dialogue-check.mjs` | Low; voice timing follows the text at run time | Yes (text) |
| 2 | An `?talkcam=lba` flag: keep the play camera during talks (LBA2's way) for a before/after next to FACE-2's shots. Default unchanged. | `src/engine/camera.js`, `src/main.js` (flag read) | Low behind a flag; faces get small again (FACE-2's reason) | Yes |
| 3 | The newest letters fade in through the speaker's colour (LBA2's reveal), instead of a hard cut per letter. | `src/game/hud.js`, CSS | Low; per-letter spans cost DOM work, so do it per line chunk | Yes, subtle |
| 4 | Name tag replaced or joined by a small speech-bubble mark on the speaker's side (left/right). | `src/game/hud.js`, CSS | Low; the name tag helps new players, so offer both | Yes |
| 5 | A `?talkstyle=lba2` prototype of the box: full width with margins, rounded 2 px light frame, LBA2-like proportions; mock pictures before/after. | CSS (+ a flag read in `hud.js`) | Low behind a flag | Yes |
| 6 | Short overhead remarks for residents (LBA2's type-9 bubbles) where we now open the full box for one-line greetings. | `hud.js`, the residents' story modules | Medium (new UI path) | Yes |
| 7 | Second-talk audit: list NPCs that repeat a long first line on every talk and give them a short follow-up. | `src/game/text/*.js`, story modules | Low | Text only |

## 4. Questions for the user
1. Camera: keep FACE-2's talk shots, or go back to LBA2's way (the camera never moves during a talk)? A flag would let
   you compare.
2. The name tag: keep it, or speaker shown only by colour and side, as in LBA2?
3. Voice: LBA2 used recorded actors. Do you want to keep the gibberish (the current rule) or was "LBA gibberish" meant
   as something else?

## 5. Resume point for lba3-dialogue (wave 2)
- Parser and stats scripts (not committed; they read only fetched data): the HQR format is a table of u32 offsets; each
  entry has real size, compressed size, mode (0 raw, 1/2 LZ with length +mode+1); LBA2 English text banks are entries
  2b/2b+1 (30 entries per language; each string has a type byte first and a NUL last), LBA1 28 per language, no type
  byte. Types in LBA2: 1 normal, 3 big box, 9 overhead remark, 65 inventory descriptions.
- Next: (a) the same length stats over our `src/game/text/*.js`; (b) pictures of Zoé in the yard, a townsperson, Pippa
  and one chapter-2 talk (approach, first line, mid, end) with `tests/lib/boot.mjs`; (c) lba2remake pictures of a
  Citadel talk for the reference column (outside lba3/, `/dev/shm`); (d) the flag prototypes 2 and 5.
