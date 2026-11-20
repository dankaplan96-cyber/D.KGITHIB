# U-2 "One More Place" — as built

The user's own side quest (brief: `DEPTH-PLAN.md`, "The user's five side quests", U-2). Built 15.11.2026 on
`ccr-c1c2c4b9-dep6ed`. **Automated runtime only** (headless Chromium, SwiftShader): nobody has played it, nothing was
listened to, no frame rate is claimed.

## What the player finds and does

Twinsen's house, from chapter 2 on. Old Brix is an existing Citadel walker (`walkrounds.js`: the old man of the lane's
benches, "I've sat on every bench in this town"); that he was the family's neighbour before Hedda, and the rest of this
quest, is our invention (no LBA1/LBA2 canon involved).

1. **One chair too many.** In chapter 2, once the hot water runs in the house (the pump thread's last step, `ct_home`; a
   save from before that thread: the water's return), the family table is laid for four: a fourth chair on its north
   side (an old green cushion) and a bowl at each place. Looked at (E): "A fourth chair... Zoé put it out."
2. **Zoé's story** (talk to her at home): a proper meal at last; four chairs; it is Brix's place, he lived next door
   and ate with them every week until he moved up the lane; nobody has asked him since, "not even me". Arthur: he sits
   on the benches along the lane and tells the gulls off. (In later chapters her first line is "I've cooked enough for
   four again".) No map marker: the clue is the lane's benches (Zoé, Arthur, the chair's look, the journal).
3. **Brix on the lane** (his usual round): "I thought you'd all forgotten the way up the lane." He comes, but brings his
   radio ("your house always had music in it") and takes his short cut through the gardens: he stays on his bench while
   the camera sees him, then he is at the table at home.
4. **The radio's rule, before it is needed** (talk to him, or reach for the set): it has only hissed since he moved;
   turn the wheel on top slowly and watch the green eye, wide open is a station; find the house's tune, which he heard
   through their window every week. Arthur: "Grandpa's radio has an eye like that. Can I watch?"
5. **The tuning** (E at the set: his right hand on its thumb wheel, a close-up over the table onto the dial on its top).
   Left / right turn the wheel, E lets go (the needle stays where it was left, `dx_om_dial`). The house's music stops
   while he tunes. Three stations open the eye: the project's bulletin (chapter 2: "Hot water for every home on
   Citadel..."; later: the weather), a Zeelich station (horns and bells), and the house's own tune — the game's 'home'
   track, the music that plays in the house (`engine/music.js` MOODS.house). **By ear:** static silence, the bulletin's
   voice-less words, Zeelich's music (`zeelich_b`), then the house's music returning on its station. **By sight**
   (sound off): the red needle along the dial, the green eye's glow (shut far off, opening as the needle nears a
   station, wide open on one), and the radio's caption strip under the picture: `(hiss)`, the bulletin's words,
   `♪ horns and bells, far away ♪`, `♪ a tune you know ♪`. A wrong station lingered on: Brix's word ("Not that. They
   read it every hour." / "That's a Zeelich station. Lovely. Not ours."), nothing lost. Held on the house's tune for
   1.4 s: found. Zoé: "That's ours!" Arthur: "The eye's wide open!" Brix: "Now it sounds like a house."
6. **The meal** ("Sit down, all of you"): E at Twinsen's chair. A short scene at the table (skippable by holding E):
   Brix, Twinsen and Arthur seated, Zoé standing at her place (her LBA2 body keeps its legs straight in the rig's sit
   pose), the radio playing. The emotional turn: "Come next week. Same chair." / "Next week, then. I'll bring the
   radio. It sulks if I leave it at home." Life refilled. Brix goes home with his radio; back on his round.
7. **Payoffs.** Brix on the lane has a word of it once a chapter ("Tell Zoé the soup was adequate. She'll know what I
   mean."). In chapter 2's radio scene, Arthur tuned Grandpa's radio "slowly, like Mr Brix showed us, till the green eye
   opened" (`chapter1.js`, only if the quest was done before it: the machine's rule learned, then relied on).

## How it changes with the story (the "come back in three chapters" test)

The fourth chair stays at the table for good. Coming home in a later chapter where Zoé and Arthur are at home, the table
is laid and Brix sits at it with his radio, its eye open on the house's tune; E at the chair: a short meal (life
refilled). The first meal in a chapter that has a conversation plays it; every other meal is music and food only. One
meal an outing: he has to have been out of the house and its garden (40 m from the door, or another room or region)
since the last one.

| Chapter (key) | Meal | Conversation (first meal there) |
|---|---|---|
| 2 `project` | the quest's own meal | the first meal (above) |
| 3 `zeelich` | — (Twinsen cannot reach Citadel) | — |
| 4 `dig` | yes | Zoé's voice on every radio (her broadcast of chapter 3); Arthur: does yours get Zeelich? |
| 5 `steam` | yes | Hedda wants her big pot back (her own line: Zoé "has had it since spring") |
| 6 `pass` | yes | "You look like a man who's walked across an island." "Two, this week." |
| 7 `observatory` | yes | music and food only |
| 8 `evacuation` | — (the streets are empty; Zoé busy) | — |
| 9 `council` | yes | the old fortress for two days; "You weren't on their list." "Nobody my age was." Gilbert's complaining |
| 10 `network` | — (Zoé at the lighthouse) | — |
| 11 `shell`, 12 `core` | yes | music and food only (nobody at the table knows what Twinsen is about to do) |
| epilogue `home` | yes, after the family's own dinner and one outing | the ground's quiet; Arthur wants to take the radio apart; "Same time next week, Brix. Your chair stays." |

The quest itself (not only its meals) is offered in every chapter of that table where Zoé is at home, so it cannot be
missed: a player who never asks keeps seeing Zoé's fourth place. A player who skips it gets the complete main story.

## Character knowledge

Brix knows what the street knows in the same chapter (the walkers' lines and `text/zeelife.js` were the reference): no
one at the table mentions the evacuation list before chapter 8 has happened (chapter 9's line), the shell, Sendell or
the core. In chapters 11–12 the meal is wordless on purpose. Hedda (next door, `roomlife.js`) is mentioned, not seated:
one guest, a small cast. "Grandpa Gilbert" is Arthur's own name for Gilbert (`text/ch8.js`). Arthur stays a boy with an
interest (radios, as in chapters 2, 7 and 10), not a chosen hero: he watches, asks, and later uses what he saw.

## Where (files)

- `src/game/oneplace.js` (new): the fourth chair (and its collider, which follows its visibility; the household rounds'
  planner forgets the floor when it comes or goes), the four bowls (one merged draw), Brix's radio (cabinet, speaker
  cloth, thumb wheel, the dial lying on its top with its red needle, the green eye: emissive only, no light).
- `src/game/story/oneplace.js` (new): state, prompts, talks, the guest `om_brix` (a second body for Brix, his dress and
  tint, shown only at the table while the street's Brix is taken off his round), the tuning (a `cutscene` state with its
  own input: left/right, E), the caption strip `#omtune`, the meal (a Cinematic), the later meals.
- `src/game/text/oneplace.js` (new): English text.
- `src/game/story/index.js`: registered (cast, placement after the ferry's and before the town's, prompts, interact,
  talk before depth.js, update, flags, journal, regionBuilt, onEnterRoom).
- `src/game/story/chapter1.js`: Arthur's radio scene: one line added when `dx_om_tuned`.
- `tests/one-more-place.mjs` (new). Captures: `captures/one-more-place/`.

Object count (no-clutter rule): the family room +3 while the quest is open or a meal is laid (the chair, the bowls as one
piece, the radio while Brix is there); afterwards +1 for good (the chair). Nothing removed: the table had three chairs
and needed a fourth. Nothing added outdoors.

## Flags (all `dx_om_`, default absent: an old save loads with the quest offered where its chapter allows)

`dx_om_ask`, `dx_om_chair`, `dx_om_yes`, `dx_om_here`, `dx_om_dial` (0..1), `dx_om_wrong`, `dx_om_tuned`, `dx_om_done`,
`dx_om_lastCh`, `dx_om_away`, `dx_om_heard`, `dx_om_bseen`, `dx_om_meals`, `dx_om_ep`. Each later step implies the
earlier ones on a load (`applyFlags`). Nothing about the tuning or the meal is saved mid-way: a load puts him in play
by the table.

## Playtime (estimate, not a measurement of a person)

Measured on the bot's routes (game seconds, `tests/one-more-place.mjs`): the house to Brix, who was by the shop's heat
post near the square on his round, 54 s; back to the house's door and in, 42 s; the first meal's scene 34 s (seven
lines), a later meal with a conversation 26 s, a meal with music and food only 10 s; the bot's tuning took a few
seconds because it knows where to stop. With the plan's formula (1.8 × the walk, about 60 s a deduction — finding Brix
on his round, finding the house's tune —, 200 words a minute for the roughly 260 words read): about **6–9 min** for a
first play that finds it, then about half a minute per later meal plus the walk home. Not calibrated against anyone.

## Tests (Automated runtime only)

Snapshot of the worktree served from `/dev/shm/t991` (python http.server on 127.0.0.1), headless Chromium on
SwiftShader, 960×540 (the new suite at deviceScaleFactor 1), one suite at a time on a shared machine (load 6–9).

| Suite | Result | Note |
|---|---|---|
| `one-more-place` (new) | PASS, 28 checks (twice) | the whole quest by input (below); first run: 1 FAIL, the test read the table 0.1 s after Zoé's line while the module updates it every 0.5 s: the test now waits 0.6 s (no game change) |
| `opening` | PASS | |
| `opening-tutorial` | PASS | the house in chapter 1 is untouched: the chair, bowls, radio and guest are hidden there |
| `prologue` | PASS | |
| `chapter1` (chapter 2 of the story) | PASS | Zoé's talks of the chapter are its own; the quest only speaks once the hot water runs |
| `house` | PASS | |
| `interior-life` | FAIL (1) | Zeelich terminal's Velo faces 1.48 rad at a dwell in chapter 9: **the same single failure on the build before this change** (run against it: `362de899` with this work's two hooks taken out), outside this work; Zoé's household round at home (no wall, no furniture, a talk stops her, a scene wins) passes |
| `place-scan` | PASS | the house area: 75 pieces, the one finding is the bathroom's towel rail (by design) |
| `save-migration` | PASS | the first run failed on connection refused: the snapshot's web server had stopped (its time limit) mid-run; run again on a restarted server: PASS |

`tests/one-more-place.mjs` covers: chapter 2 by flags up to the taps running (ISO); the table before (three chairs, Zoé's
own line) and after (four chairs, bowls); the chair looked at; Zoé's story and the journal; Zoé not repeating it;
Brix found by walking the lane and asked; he stays while seen; at home he is at the table and the street's Brix is gone;
**Save & quit → Continue** in the middle; the radio's rule; **the sound muted** (master volume 0) and the tuning by the
visible cues only: a wrong station (its caption, Brix's word, counted, nothing lost), E lets go half way (the needle
kept), E again resumes there, the house's tune found (♪ caption, the eye wide open, the room's music 'home'); the meal
(its seven lines, life refilled); afterwards (done, Brix gone home and back on his round, the chair stays, bowls and
radio gone); Brix's lane word once; Arthur's line in chapter 2's radio scene; **chapter 4 and chapter 9** (by flags):
home by input, the table laid, Brix with the radio, the chapter's own conversation, life refilled, no second meal in
and out of the door, one more after walking 45 m out and back (music and food only); chapter 10: no meal (chapters 5–7, 11–12 and the epilogue's meals use the same code and are not run by this suite); the text
scan (77 keys: no night, evening, tonight, sunset, dawn, dusk, dinner or supper; no line over three sentences); **old
saves** from before this change: `base-04` (chapter 2, before the pump thread: the chair out), `new-04` (chapter 2 in
the thread: not yet), `base-12` (chapter 9: the chair out), none with a dx_om_ flag made up.

Captures (`captures/one-more-place/`, play camera unless named, deviceScaleFactor 1, about 0.6 MB): 01 the fourth
chair; 02 Brix on the lane; 03 Brix at the table; 04 the tuning's close-up (the dial, needle, eye; Twinsen's hand on the
wheel); 05 a wrong station; 06 the house's tune found; 07 the first meal's scene; 08 after the meal; 09 chapter 4, the
table laid. Looked at: the close-up was first blocked by Twinsen's arm (the dial was on the set's face, his side): the
dial moved onto the top, read from the room's side, the wheel to the set's other end; the meal's camera stood behind
Twinsen and hid Brix (moved to the south-west); Zoé's LBA2 body cannot bend in the sit pose (she stood a chair's height
up): she stands at her place; Brix's standing-size body circle kept Twinsen off his place at the radio (0.3 m while he
sits).

## Not paired with another proposal

The remaining first-wave proposals (UND-1, ISL-3, ZEE-1, DES-1, HAM-2, HAM-3, C11-1, C12-1) are on other islands, the
underground or the finale's main path; none touches the house or Citadel's lane, so none fits this quest naturally. U-2
is built alone.

## Left for a human to judge

- Whether Zoé's fourth chair is noticed before she is spoken to (it is small from the play camera), and whether "the
  benches along the lane" is enough to find Brix without a marker (he walks a round of six stops).
- Whether the house's tune is recognised by ear on the radio: in this pass it is simply the house's own music coming
  back (`setMood('home')`), not filtered to sound like a radio; the Zeelich station is the `zeelich_b` piece. Nothing was
  listened to here.
- The close-up's framing at other screen shapes; the needle is thin (4 mm) at 960×540.
- The meal scene's camera and pace; Zoé standing while the others sit; the guest is a second body of Brix (`om_brix`,
  his dress and tint), shown only while the street's Brix is off his round.
- The fallback voice for the bulletin (it has none: caption only) and whether the humour lands ("Mine gets what it
  likes. Like me.").
