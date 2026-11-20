# EXP-3 · Ballastra → the network: chapters 12 `balances` and 13 `survey` (task 2 of REVIEW-TASKS-19-11, P74)

**Team-only. Spoilers.** Branch `worktree-agent-a8706d79953d4ff8b` (from `ccr-c1c2c4b9-dep6ed` @ 92911d5c, v103).
Labels: Played (a person) / Automated runtime (a test drove it) / Source only.

## Resume point (exact)
Done and committed: both chapters, the network payoff, the cutaway before the end card, English and Hebrew (100 %),
voice intentions, `tests/exp-balances.mjs` (one focused test), `tests/exp-ballastra.mjs`'s last checks moved to the
new chapter-11 end. Nothing open in the code. Next (not this task): the coordinator's full test round (it should include
`exp-ballastra`, `save-migration`, `playthrough/13-network`, `chapter10`, `epilogue-home`, which were **not** run here
by the user's "keep tests to a minimum"); a person's play of chapters 12–13 (Played: none).

## What changed in the story (decisions)
- **Chapter 13 is the sleepers, on Ballastra, "The Cradles"** (key `survey` kept; title changed in `text/common.js`
  and `he/common.js`). This replaces EXP-PLAN-2 §3.4 ("Under the Well": OG-2 on Citadel + Sendell's well): the user's
  row 2 asks for the sleepers and not for OG-2; OG-2 (`tools/expansion-parked/story/survey.js`) stays parked. EXP-PLAN-2
  §3.3 put the sleepers (WK-1) in chapter 12 "in either order" with the House; here they follow it, so chapter 12
  answers "who builds the regulators" and chapter 13 "what happens to the 304". **For the campaign director to confirm.**
- **The Cradle Hall is under the keepers' house on the Arch District's upper terrace, beside the flood bell** (the
  empty third house on the south plaza; its door faces the bell). R1.5 had the Cradles on a "Low Terrace" (W-9, never
  built). The notice board line (`bl_board_read`) now says the Cradle Hall is closed and the bell silent, by the
  keepers' order (the old "Low Terrace lift" mention is gone). The bell (OP-5's built, unused prop) is tied because of
  the sleepers; ringing it is how the community comes.
- **Oren's resolution on Ballastra happens here, not in a finale**: he refuses, says what he fears (Bay 2, the water),
  does not push against a hand, and accepts the families' rule ("Then ask. I will keep the others warm until you
  do."). Sendell, the being under Twinsun's shell and Oren stay separate (Oren never mentions either). No new planet,
  no new villain. Vesk is never on Ballastra; his standing order and his tag are the evidence.
- **The B-8** (Tessa's chapter-11 drawing "B-8: no glaze in the lever" pays off): glazed parts carry Oren (R1.4 rule
  2), so a glazed lever lets him hold a regulator "steady" at the wrong level; the brass lever only feels the water and
  needs a person to set it. In the network the B-8's brass lever does not move for him.
- New people (4, on the existing on-demand bodies, dresses by DRESS-1, appended to Ballastra's cast so the others keep
  theirs): **Fennick** (the House's broker), **Garrow** (keepers' foreman), **Nan Odra** (elder keeper), **Jory Mell**.
- Files: `story/balances.js` is the only new shipped file (509 of 512). Rooms packed into existing modules
  (`gardenrooms.js` bl_house, `archrooms.js` bl_cradles); text into `text/ballastra.js` / `he/ballastra.js`.
- Touched outside Ballastra, for the payoff only (for task 3's worker): `story/network.js` (`get b8`, Baldino's
  briefing line `nwb_bal` when the rig test passed, the valve room's all-green branch moved into `valvesGreen()` with
  the B-8 step before it, interactables/interact/objective/applyFlags hooks), `story/epilogue.js` (`sleepersScene`
  before `showEnd`), `story/index.js` (the two chapters registered; Ballastra's people answer on a return visit through
  `Cradles.talkLater`), `main.js` (`EXP_START_DROP` gains `bh_`, `nwb_`; nothing in the loop/startup), `regions.js`
  (two rooms in their groups, `CHAPTER_AREAS.balances/survey`). answer.js untouched.

## The playable path
**11 → 12.** At the Speaking Steps, Baldino (Doran's set): every coil, no regulators; *"without regulators they only
shout. Find who's been selling, and get the numbers."* Tessa: *"Then it's the House of Balances. Fennick will say it's
all in order."* The chapter ends there (no walk back to the freighter): card "Chapter 12 · The House of Balances".
**12, the House** (over the gardens' causeway, the room `bl_house`): Fennick refuses (sold with every copy; "the order
book is on its stand, if you can read upside down"). The order book: Vesk's standing order and the B-7 "failed buyer's
test". The test bench, played (the knock lever): the needle settles as if a hand held it; the card on the empty saddle
says PASSED; a second knock, Oren: "I am holding it." Fennick's defence after the book: forty kiln families paid a year
ahead; Halden's regulators' levers were once used to shut the lower row out; "a lever is only as fair as the hand on
it". With both found, the House's own records against each other plus Vesk's tag: "...He told us it failed." He gives
the House's test copy (item `bh_figures`) and holds the next shipment (the crates chalked HELD, the SOLD cabinet open,
on every later visit).
**12, the rig** (gardens): run 1, the figures as written, glazed levers: three green lamps at a middle level; Wenna:
"at that level my rafts would be sitting on mud"; Oren: "Steady. I keep them steady."; Tessa fits brass levers. The
three neighbours say what their water needs (A rafts high, B wheel middle, C row low); the player sets each band dial;
Tessa opens the storm sluice; a wrong band lights amber or red and spills, its neighbour says which way, the rig drains
and resets (no limit); right twice ("Again. Once is luck." … "It repeats. Then we can talk."): Tessa will build five.
**12 → 13** at once: card "Chapter 13 · The Cradles". Wenna: "One of them is my brother." Jory went in at nineteen
when she was nine; his card: wake me in ten years, or when my sister asks; she has asked 24 times.
**13, the hall**: Garrow at the door (no visitors), Oren: "Visitors may look." The card (J-17), the ledger (DEFERRED:
CONDITIONS ×24), the Bay 2 plaque (a waking with the floor ring open chilled two neighbours). At the Rings Wenna asks;
Oren: "Not ready." … "You kept him safe for thirty-four years. Now you are keeping him from me." … "A cradle wakes in an
hour. My hush never tires. Your hands do." The ring stop shut; Twinsen alone at the lever: warmth rises while he
stands there, his hand gives out, the cradle fails safe ("A hand gets tired. I do not. He is asleep, and safe.").
The flood bell (tied KEEP SILENT · THE CRADLES SLEEP): untie, ring; Mags: "That bell meant run. What does it mean
today?" — "Hands." The row comes up. Hand to hand at J-17's lever (the prompt "Next Hand" at the lever): each holder
tires; a handover on Oren's stroke slips the lever back, between strokes it is clean; walking off lets go; warmth only
pauses, never fails. Jory wakes: "Wen? You got old." "You got lazy." Oren: "Then the next one is yours to answer for."
Who decides, said by the people: the family asks, the keepers shut the ring, Oren warms, hands hold. Nan Odra keeps her
mother asleep, her choice. Tessa: five B-8s crated; the ship's film Ballastra → Zeelich; card "Chapter 14".
**14, the payoff**: Baldino's briefing adds Tessa's boxes; in the valve room, when the three gauges are green, Oren
trims the relay's share on a stroke ("Your box drinks. The shelters drink first."), the relay dims; Twinsen fits the
B-8 on the relay and sets its band from Mira's needles (HIGH: the shelters' needle sags; LOW: the relay starves; MID);
on the next stroke the brass lever does not move ("That one has no clay in it."); Mira: "So I set it, and nobody else
can." Then the station goes on exactly as before (Mira takes the wheel, CAMPAIGN-8).
**Before the credits**: after the dinner, the Cradle Hall four days on (three lids open, the requests board full):
Jory "Eleven of us awake now", Wenna (the row takes turns at the lever), Nan Odra ("Some of us said not yet … That was
ours to say."), Oren ("They ask. I warm."); back to the kitchen, the end card.
**Return visits** (network on): Fennick at his counter, Garrow and Nan Odra in the hall, Jory with Wenna at the rafts,
Tessa: each has a line of its own (`*_later`); the rest of Ballastra's people say their chapter-11 after-lines.

## Saves
Flags `bh_*`, `wk_*`, `nwb_*`, `ep_bl` (listed in `story/balances.js`'s head); every step saves; a load sets the House
(HELD, the cabinet), the rig (parts, bands, the passed state), the bell, the ring stop, the lid and the warmth from the
flags. No save inside the rig's run or the hand-to-hand: a load restarts that run with the bands / the ring kept. A
save from before this build standing at the Steps' end (`bl_endTalk`, no `bl_done`) ends chapter 11 on its first frame.
A base-campaign save (`exp_base`) never has these chapters, the B-8 or the cutaway.

## Verification (Automated runtime only; SwiftShader, shared container)
`tests/exp-balances.mjs` — chapter 11's last talk → 12 → 13 → 14, with **Save & quit / Continue at each handoff**
(12's start, 13's start, 14's start), the valve room's B-8, the epilogue's cutaway, and a legacy `exp_base` save:
first run 29 PASS / 3 FAIL, all three the test's own timing (a capture taken before its lines were said; the briefing
read after the reload cleared the log; the epilogue's scene waits on a promise the synchronous loop never let run):
fixed in the test. Second run: see the result line below. `node tests/dialogue-check.mjs`: PASS, Hebrew 5458/5458
(100 %); new warnings are only sentence counts on documents (book, card, plaque, ledger) and four spoken lines of 4
sentences under 140 characters. Shipped files 509.
Bot game time, chapter 11's last talk to the network's valve station done: **704 s (11.7 min)** — a floor (A* routes,
every line read at once, the bot knows every answer), not a first-play time. First-play estimate (estimate, not
measured): chapter 12 about 20 min, chapter 13 about 22 min, the B-8 step about 2 min.
Not run (by the user's instruction): `exp-ballastra` (its end check was edited to the new ending, unverified),
`save-migration`, `playthrough/13-network`, `chapter10`, `epilogue-home`, the perf budget for the two rooms.

## What remains
- A person's play: whether the House's contradiction is noticed without the nudge (`bh_nudge_turn` after 50 s), whether
  the handover rhythm reads (the Rings attend on each stroke and the tone sounds; the hint says "between strokes").
- Visual review of the two new rooms (team-only pictures; none taken here): the House's hall and the Cradle Hall are
  built from the room kit and simple shapes (cradles as boxes with hinged lids); the art pass can replace them.
- The base finale is unchanged; Oren does not appear after chapter 14's valve room in the expanded campaign.
- OG-2, NW-1 at the other four stations and OG-6 stay parked (`tools/expansion-parked/`).
