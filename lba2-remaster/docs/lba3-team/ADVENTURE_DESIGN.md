# Adventure design: what LBA1/LBA2 do, and what we changed (ADV-1)

Task ADV-1 (adventure-design researcher). A short evidence pass that leads to one implemented sequence:
chapter 4's dig (Desert Island). This note is the record; QA evidence is in tests/chapter4.mjs.

## Sources used, and gaps

- **LBA2 text** (the user's TEXT.HQR, English banks, read with the scratchpad parser `lba2data/text.py`):
  bank 6 = Citadel Island, bank 10 = Desert Island. Cited below as `L2 b<bank> #<line> (id <text id>)`.
- **LBA1 text** (the user's LBA1 TEXT.HQR, `lba1data/TEXT_a.HQR`, same layout without LBA2's leading byte):
  bank 4 = inventory, 6 = Citadel, 8 = Principal Island, 10 = White Leaf Desert. Cited `L1 b<bank> #<line>`.
- Earlier project notes: docs/LBA1_CATALOGUE.md, docs/LBA2_SOURCE_NOTES.md (engine source, behaviour only).
- **Not used, so not claimed:** the scene life/track scripts (SCENE.HQR in both games) were not decoded: we have
  no decompiler for the life-script opcodes here. Every dependency below comes from what characters *say*, not
  from script conditions. No gameplay footage, manual or interview was consulted. No playable original was run.
  So: what a line says is **observed** (O); how it shapes play is **interpretation** (I). Nothing here measures
  whether players enjoyed it.

## Sample (both games)

| # | Kind | Evidence (O) | Interpretation (I) and confidence |
|---|---|---|---|
| 1 | LBA1 early local exploration | Escape: "what if I try to get the guard's attention?" (L1 b6 #8). Two people teach that posters can be read by walking up to them (#14, #32). The ferry wants a ticket (#35); the warehouse keeper: "4 crates … cannot seem to arrange on the 4 crosses painted on the ground. I would gladly give a ferry ticket" (#37); failure "The 4 crates are not on the 4 crosses, try again!" (#67); reward (#44). | An ordinary blocker (a ticket) is solved by an ordinary favour. The goal state is visible in the room (painted crosses), failure is stated, retry is free. Rules are taught by townsfolk, not a tutorial. High. |
| 2 | LBA1 character-driven | The drunk: "I'll help you if you buy me a drink. Ask the waiter" (b6 #16; price #50–51). The tavern saved: "help yourself" to the cellar (#182). | Information is traded for small, human wants; help changes what a place offers later. Medium. |
| 3 | LBA1 environmental | "FunFrock installed busts … The ones that don't have a pedestal are placed on ancient seals" (b8 #218); Gawley's Horn "For use on the Seals of Sendell" (b4 #30); an architect complains that "a mad man is attacking different sites also marked with this same symbol" (b6 #47). LBA2 recalls it: "This bust makes an excellent target" (L2 b6 #19). | **A rule the player learns by observation and then applies anywhere**: a visible feature (a bust without a pedestal) marks the solution. The world reacts with humour to the player's acts. High. |
| 4 | LBA1 multi-step regional | The desert's old man wants to "grow flowers in the desert", and trades the Legend for the Book of Bù in the sand-buried temple, "through one of the ventilation shafts still visible just behind me" (b10 #3). The book then lets Twinsen "read runes and talk to animals" (b4 #32); animals answer ("Good day, horse." / "Hii, hi! Bbbrrrff!", b10 #24, #26). The flute "can … make flowers grow in the desert" (b4 #46). | The clue points at a visible landmark. The reward is a new verb that changes later play. Whether the flute is ever used for the old man's wish isn't confirmed from text alone. Medium. |
| 5 | LBA2 ordinary problem → adventure | The Dino-Fly is hurt in the storm (L2 b6 #2, #4); "go see the healing wizard on Desert Island" (#88); the healer is away, "try the School of Magic" (L2 b10 #121); then the missing wizards (#565), the Esmers. | A small domestic problem drives the first hours and leads naturally into the larger plot. High. |
| 6 | LBA2 discovery through conversation | The School's whereabouts come in fragments from many people: "in the desert", "The entrance is in a cemetery to scare off strangers" (#123), "when I was young, it was said to be in the cemetery" (#209), "a forlorn garden on the rocky hillside" (#222, #258), drunk and joking voices among them (#183). Three tests "in any order you wish" (#144). The balsam "only grows in rocky, hard to reach areas" (#176), from someone else than the one who asks for it (#160). | Hints are spread across people, partly unreliable, often funny; the player triangulates. Local freedom (any order) inside a fixed goal. High for the structure, medium for its clarity to a newcomer. |
| 7 | LBA2 character quest with consequence | The bowler's back (#202) → treated (#261) → "all you had to do was treat my back for me to win all the games" (#270), and his opponent: "I keep losing since you helped my little friend … Nice move Sherlock!" (#197). The balsam slope: "you've enabled new plants to grow" (#168). | A small kindness has a visible, slightly comic consequence for someone else. High. |
| 8 | LBA2 familiar place with new meaning; tone turn | The Temple of Bù is now "Temple-Park", a tourist site with tickets (#10, #270), families sneaking in (#254, #266), "that Temple of B really packs 'em in!" (#55). "The Esmers have volunteered to do the work in the lowest basement" (#262, #251). The Esmers buy everyone drinks (#90, #99) … then "The aliens have finally shown their true faces" (#130, #225). The museum holds LBA1's tunic and the clerk "never recognizes me … he always charges me admission" (L2 b6 #103). | The first game's sacred place returns as a mundane, funny place, and that is where the danger hides. Friendly visitors show real benefits before the turn, and people's lines change after it. High. |

**Principles we take from this (interpretations):**
P1 teach a rule by showing it, then let the player apply it (busts on seals, painted crosses). P2 failure says what
happened and costs only a retry. P3 a recurring person helps more when asked again, in character. P4 a puzzle's
oddity can be the story's evidence (the turn is found, not told). P5 humour and small wants sit next to danger.

## The current sequel: chapter 4, measured route (before)

Route from tests/chapter4.mjs (baseline run, c0264c8): Tarra → three seized gears (ball) → Tarra → Hesk → rope →
yacht → Ilka → wait for a storm → notebook → gate code (auto-entered) → down → three discs (ball) → temple →
the carving read out by Ilka → Dallan → chapter 5.

| Gap (O = in code/text) | Type |
|---|---|
| Two "hit three things with the ball" sets in one chapter (gears, seals), each told outright: "(…A good hit with the ball should knock the sand out of them.)", "(Three stone discs … The ball, then.)" (text/ch4.js) | design defect: nothing to observe or infer |
| The chapter's turn (vents closing) is only *told* in the temple; nothing the player did bears on it | design defect |
| Ilka gives the rule "crystals grow where heat leaks from deep down", then it is never used | missed setup |
| Ilka vanishes from the route between her camp and the temple | missing implementation |
| Opening the first disc lit all three: their glow shared one cached material (desert.js, `pm` cache) | bug (code reading) |
| The storm wait (up to ~45 s) and the auto-entered gate code | friction; left for later |

## The change (implemented)

**Original evidence → principle → gap → adaptation → acceptance**

- Sample 3 (busts on seals), 1 (painted crosses) → P1, P2 → the seals are told, not learned → **five discs** round
  the temple door, like the five vents in the carving over it. Only the three with heat behind them open the
  door: pale crystals crust them and dust drifts up off them. Two are cold and bare. A cold disc gives a dull thud
  and grinds every open disc shut again (first time a line, after that a toast). → by input: warm opens, cold resets,
  objective adds "A cold disc shuts the others".
- Sample 4 (clue at a visible landmark), Ilka's own line → P1 → the rule is safe to see first: **a crack beside the
  last ramp**, crusted with the same crystals and breathing warm air; Twinsen remarks on it on the way down
  ("Just as Ilka said: they grow where the heat gets out"), then sees the discs ("Pick marks on every one: the
  diggers struck them all, and the door never moved" — why brute force failed the project). The carving over the
  door can be inspected (five vents puffing like a kettle). → by input: crack line before the discs line.
- Sample 6/7 (useful recurring people) → P3 → **Ilka waits at the dig rim** once she has her notebook back. Asked:
  before going down "go on down"; at the discs "Bù's builders never did anything without a reason … crystals grow
  where the heat gets out"; after a cold disc "Strike the ones the crystals cover. Leave the bare ones." The hint grows
  only after a mistake. → by input after a cold disc.
- Sample 8 (the turn found in the world) → P4 → in the temple, after Ilka says the vents are closing, Twinsen:
  "That's why two of the discs out there were cold." The puzzle's oddity is the first evidence of Vesk's project's
  cost. → line checked.
- Journal: Ilka's rule, the crack, the discs, what a cold disc does (facts he has seen, never "hit 1, 3, 5").
- The discs answer the ball only once he has reached the bottom and seen them (the first test run showed a ball
  thrown at a crystal mite on the terraces striking a cold disc before Twinsen had met any: a line about a "cold
  disc" out of nowhere).
  A disc counts only when struck on its face (from the floor's side), so a ball grazing past from behind does not
  reset anything. The HUD count now follows each disc (before, it stayed at 0/3 until the door opened).
- Recovery: every disc and the cold count are saved; a reset saves; Save & quit → Continue and death → Retry restore
  open discs, glow and ball targets. Old saves keep working (warm discs keep the ids `c4_seal0–2`; the cold ones are
  separate targets, so tests/playthrough/07 still plays). The glow material is now per disc.

Files: src/game/story/dig.js, src/game/text/ch4.js, src/game/desert.js (the dig's bottom only: five discs, crystal
batch, one point cloud of dust motes, the crack), tests/chapter4.mjs, tests/playthrough/07-dig.mjs (its seals step:
warm targets from the face side, passes repeat after a stray cold hit).

## Tested vs judged

- Tested: tests/chapter4.mjs, 18 checks, by input with the player harness from the open gate (Ilka at the rim, the
  crack line before the discs line, the carving over the door, warm opens, cold resets with line then toast, Ilka's
  stronger hint, Save & quit → Continue with two open, death → Retry with one open, door, journal, the temple line,
  chapter 5). The steps before the gate still use the older teleport helpers (ISO). Also chapter5, desert-life,
  stability, and playthrough segment 07 from the chapter-4 start save (REV-TY-4/save-06.json, origin rewritten).
- **Not tested:** a first-time player. The test is played by an agent who knows the solution, so whether the
  crystals read as "warm" and whether the crack → discs link is noticed are design judgments awaiting a fresh
  player. GPU look (software rendering only), sound by ear.

## Next useful adaptation

Chapter 4's opening half: the wind-pump's three gears repeat the ball-on-three-targets pattern and are told outright.
Following sample 1/6: let the pump's fault be found (Brosk: the test bore's tremors; Sani on the roof hears which
gear grinds), so the player observes which part is jammed instead of being told "hit the gears". And give the gate
code a use (the notebook's survey sketch matched to the keypad's worn keys) rather than auto-entry.
