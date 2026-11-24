# TALK-ORDER (24.11.2026): the chapter's talk before gifts, the opening's title, the rebake

The user approved three bounded fixes on 24.11. Baseline: branch `ccr-c1c2c4b9-dep6ed` at `93a99d19` (v158 and the
PC-only rule). All results are **automated runtime only** (headless Chromium, SwiftShader). No person played any of it.

## 1. The chapter's own talk comes before a gift or a thank-you (game-wide)

**Issue (maturity.md §0.3, FINAL.md):** in chapter 14 on Desert Island, Ilka's first line was "You got my notebook
back. Then you can have this too." The chapter's urgent greeting, "Twinsen! Dallan said you'd come.", came only after
the fork lines.

**Cause:** `Story.talkRest` (story/index.js) runs the side stories' `talkFirst` hooks before the chapter's `talk()`.
A hook whose gift was due played straight away, whatever the chapter still had to say. `kit2b.js` gives three gifts
"at or after" a chapter: Ilka's fork, Tashi's heat flask and Nara's Esmer line. The same pattern appears in every other
hook that gives something.

**Change:**
- `ChapterBase.pendingTalk(id)` (base.js). It is true when this chapter has a talk with that person that moves the
  chapter on and has not been had yet. A repeat or idle line does not count, so a gift is never held back by one.
- `Story.ownTalkFirst(npc)` (index.js). When the current chapter has such a talk, it plays that talk and returns true.
  The gift then waits, unchanged, for the next talk. Nothing new is saved: the gift's own condition still holds. Old
  saves need nothing new.
- Every gift, thank-you and payment hook calls `this.ownFirst(npc)` before it plays (list below).
- Chapters that declare a pending talk for a giver:
  - `network.js`: Ilka, until her bore greeting (`!c10_ilka`, unless the thread already holds her at the relay); and
    Arthur, who hands the talk to Zoé until she has asked (`!c10_zoeAsk`). Arthur does not count in the house while
    the thread has him at home, because his line there is a repeat.
  - `steam.js`: Ilka, once the vent is open and before the radio call (`c5_vent && !c5_radio`).
- No line's text changed and no English line was added, so no Hebrew is needed. After a gift the hooks behave as
  before; for example, Ilka's fork still ends with what the chapter has her say.

**The sweep** (`grep -rn talkFirst src`, every hook read; each gift's giver checked against every chapter's `talk()`
for that id, `case '<id>'` / `id === '<id>'`, threads included):

| Hook | Gift, thanks or payment (gated with ownFirst) | The giver's story talk in a chapter |
|---|---|---|
| kit2b.js | Ilka's singing fork (from ch 4); Tashi's heat flask (from ch 6); Nara's Esmer line (from ch 9) | Ilka: network (declared), steam (declared); dig's comes before her notebook (the gift's own condition). Tashi: pass, observatory and epilogue lines are idle. Nara: council's stamp sets the gift's own condition (c9_nara); the epilogue line is idle |
| kit2.js | Arthur's Pocket Set; Bram's pump lance (thanks); Bram's 5 kashes for the valve | Arthur: network (declared). Chapter 1's radio sets the set's own condition (c1_radio). pumpline, evacuation, throttle, ballastra and netline lines are idle. Bram: the evacuation's lane is the chapter's own talkFirst, which already runs first |
| arsenal.js | Hougo's pearl; Bersimon's lightning | none (Bersimon: baseTalk only) |
| kesh.js | Brosk's payment | dig folds its own Kesh lines in first (pump()); steam: Kesh stands back until the shovel (already) |
| zeelife.js | Mother Snuff's payment; Bzizz's thanks | none |
| islandpeople.js | Bzzra's reward; the chaplain's clover | none |
| shops.js | Tibbo's gift; Sefa's thanks for the parcel | none |
| purposes.js | Ker'aooc's thanks (life and magic) | none |
| workshop.js | Baldino's payment for the pair | chapter 2's story states are excluded by the hook's own condition (already) |
| sewers.js | Bersimon's sewer key | none |

These interceptors were reviewed and left as they are. They are not gifts, or they already wait:
- Services and sales: Oshra's tea (ferry), Ker'aooc's ward, Pell's cordial, Bzzra's honey, the lantern stall, Ione's
  and the hostel cook's heals, the wizards' top-ups in baseTalk.
- Errands and asks:
  - Arthur's pliers (life; Twinsen asks).
  - Fosse and Arthur's map talk (sewers).
  - Oni and Marl (purposes).
  - Quill, Crane and the boss (islandpeople).
  - Hougo's remark (magic).
  - Zoé's meal offer and Brix (oneplace). Its chapters (project, dig, steam, pass, observatory, council, shell, core,
    home) give Zoé no story talk at home. Chapter 1 already holds the offer back during the radio.
- Residents' and other people's own lines: citizens, ihomes, hamlife, deeplife, isleslife, hostel, stands, offwall,
  yearslate, quietchannel, cnline, laneline, netline.
- depth.js (Jaspa, Tenpa): adds its lines after the person's own talk (Depth.after).
- Talks that run after the chapter's talk: life.talk, survey.talkLater, baseTalk.

**Evidence:** `SERVE=1 node tests/talk-order.mjs` (new, by input, from the old save `new-13-desert`): **5/5 PASS**.
- Talk 1: the canteen, "Twinsen! Dallan said you'd come.", the relay line; no fork.
- Talk 2: "You got my notebook back. Then you can have this too." and the fork's lines, unchanged and first. Then the
  chapter's relay line, as the fork's hook has always done.
- The fork and the greeting are kept in the save.
- Nothing is pending after the greeting. Dallan (repeat line) and Nara (no talk here) never were.

Log: scratchpad `talk-order/talk-order.log`.

**Example of what the player sees (chapter 14, Ilka at the bore):**
- Before: the notebook's thanks and the fork (6 lines), then "Dallan said you'd come", then the relay.
- After:
  - First talk: "Dallan said you'd come", then the relay.
  - Second talk: the notebook's thanks and the fork, then the relay line again (a reminder).

**Risks:**
- A player who talks to a giver only once in that chapter gets the gift on a later talk. The gift is never lost, but
  nothing prompts that later talk.
- A future chapter that gives a giver a story talk must declare it in `pendingTalk`. The base.js comment says so.
- Steam's Ilka case is code-only: no steam fixture was run.

## 2. The opening's title and the subtitles never overlap

**Issue (maturity.md §2, §6 row 6):** in the notebook cut, at about 25 s, "LBA3 · THE AWAKENING" was still up when the
first spoken line ("When does the harbour row get the heat?") came on (`captures/maturity/00-opening-notebook-cut.jpg`,
frame 7).

**Cause:** the title fades in and out with the stylesheet's 1.4 s transition, which runs on the wall clock. The
subtitles run on the scene's clock. On the scene's clock the title is up 18.2–21.2 s and gone at 22.6 s; the first line
starts at 24.2 s. Whenever the scene ran ahead of the wall clock, the CSS fade lagged behind it and the two were on
screen together. That happens in the stepped automated captures, and when a stalled frame is caught up (the arrival at
the harbour is at 17.6 s).

**Change (opening.js):** the title's opacity is driven by the scene's own clock (`titleUp`, a track with the same 1.4 s
ease). Inline styles are cleared at the end and on a skip. The timings are the same in both cuts:
- Notebook cut: 18.2–21.2 s, gone at 22.6 s.
- Classic cut (`?opening=classic`): 76.4–81.0 s. Its last spoken line ends at 74.85 s, so it could not overlap there
  either way.

**Visible change for the user:** none at normal speed. The title appears and fades exactly as before. What changed: on a
slow or stalling machine, the title can no longer still be on screen when the harbour's first line starts.

**Evidence:** `tests/opening.mjs` has a new check: "the title is shown, and never while a subtitle is up". `SERVE=1 node tests/opening.mjs` (the notebook cut, once): **50/50 PASS**, no errors.
- The new check: the title reaches full opacity (top 1), and while a subtitle is up the title reads 0.0017.
- That 0.0017 is the stylesheet's transition re-arming for one frame when the track's inline style was cleared. While
  the run was going, the track was changed to hold the title at 0 until finish(), so the residue is now 0.
- That one-line change was not re-run; the remaining skip checks ran with it loaded (served from disk).
- The classic cut was checked from the code only (its timings above); it was not run, per FEWER TESTS.

## 3. The character bake

**Issue:** the bake-vs-runtime fingerprint check read 81 hits / 43 misses (NEXT-SESSION 24.11). Each miss is a design
changed after the last bake, sculpted again at every start: slower, never wrong.

**Cause:**
- 42 models were missing from the bake altogether:
  - Tessa and the three dockers, with their arms.
  - Interior soft furnishings: curtains, cushions, quilts and chair seats.
  - The sewer gargoyle, two rocks, and the canal characters' hands and shoes.
- One more missed even right after a bake: the sculpted bodies' arms (Twinsen's sculpt, then also Tessa's and the
  dockers'). `makeSDF` writes scratch bounds (`p._c`, `p._r`) onto the primitives. The arms share the sleeves'
  sub-primitives with the body (`characters.js splitArms`). So the arms' fingerprint included those fields when the
  body had been sculpted first, which is the case at bake time but not at a load from the bake. Those arms were sculpted
  again at every start, whatever the bake held.

**Change:**
- `sculpt.js fingerprint` leaves out `_` fields. They are the sculptor's scratch, never design. No other fingerprint
  changes: no design key starts with `_`, and all 82 old entries kept the same fingerprint.
- `node tools/bake.mjs <port>` regenerated `assets/bake.bin`. The new `tools/bake-check.mjs` is the check
itself. It builds every area (`?allregions`), creates every character design (as the bake does), and prints hits and
misses.

**Evidence:** `node tools/bake-check.mjs 8437` (python http.server from lba3):
- After the first rebake, without the fingerprint fix: 119 hits / 5 misses (the five `#arms`).
- After the fix and a second rebake: **124 hits / 0 misses**. 124 = 81 + 43, the same set the earlier check counted.

**Size for the coordinator:**
- The bake grows from 5.2 MB to 9.9 MB (gzip -9: 3.6 MB to 6.7 MB), because it now holds the 42 models that were
  missing.
- On the artifact it is `assets/bake.wasm`: a larger first download. In return, those models (Ballastra's people, the
  rooms' cloth, the canal people) are no longer sculpted on the CPU at area builds.
- If the download matters more, the alternative is to keep the old bake and only take the fingerprint fix. Whether to
  ship it is the coordinator's and the user's call.

Visible change: none. The same geometry is loaded instead of sculpted; a baked mesh is quantised to 16 bits, as every
baked model already is.

## Resume point
- Commits on the worktree branch (base `93a99d19`):
  - `a019fa6a` talk order.
  - `38c2246f` opening title.
  - The bake commit (bake.bin, sculpt.js, tools/bake-check.mjs, this doc).
- Not pushed, not published.
- Open for the coordinator:
  - Publishing the larger bake (size note above).
  - A steam-chapter fixture run of Ilka's radio-before-fork, if wanted.
  - The classic cut's run, if wanted.
  - status.md row(s), which this doc does not add.
