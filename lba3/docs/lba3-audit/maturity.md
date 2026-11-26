# LBA3-RUN wave 5 · lba3-maturity: does the adventure feel finished? (24.11.2026)

Agent lba3-maturity (final reviewer, paired with lba3-release). **Read-only on the game**: this file and the pictures in
`captures/maturity/` are the only things written.

- **Build under review:** the frozen candidate **1bc16b5e8db3114d7729e912b8b7f6f507278d57**. Worked on `a5ee9be4`
  (origin/ccr-c1c2c4b9-dep6ed at the start of this wave). Its only change after the candidate is one line in
  CHECKPOINTS.md (`git diff --stat 1bc16b5e HEAD`), so every game file is byte-identical to the candidate.
- **Words used.** **Automated** means the input bot (`tests/lib/player.js`: keys held and tapped, the game's own time
  step, A* over its collision) played it on headless Chromium with SwiftShader. **Staged** means a suite set its starting
  flags before play. **Inspected** means read in source or an earlier report, or seen in a picture. **Untested** means
  none of these. **Played by a person: nothing.** Nobody has played this build with hands, eyes or ears, and the bot
  knows every answer. Every judgement about feel below is mine, drawn from the bot's run, the lines in the order they
  were shown, and the pictures. None of it is a player's experience.
- **Isolation.** I used my own server (port 8411) and a fresh browser profile for every run. Saves lived only in that
  profile and in my scratchpad (`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-maturity/`).
  No user save or shared storage was touched. I ran one browser at a time and waited for any other headless browser to
  finish first. Nothing was published or pushed.

## Verdict: **NEEDS POLISH**

The adventure is complete in content. It runs from the opening film to the end card and into free play, every chapter's
arc closes, and its threads pay off: the well, the 30 % list, Vesk, Sendell, Mill Lane, Kesh, Lhar and Ballastra. In this
wave the bot played all of it by input on the frozen candidate in one continuous chain (§1). The writing is strongest in
the late chapters, not weakest. So this is not NEEDS CONTENT.

It is not MATURE for two reasons. First, the places where a first-time player is most likely to feel the game is
unfinished are concrete and still open: the first fights' damage, the ending's staging, and a seam where one
conversation stacks on another. Second, nobody has yet played it as a person. The fairness and clarity judgements below
are the bot's floor plus my reading. Under the run's rule, a technical pass does not overrule this.

### Three prioritized actions

1. **Make the first fights fair, then have a person play them.** Affected: chapters 2–3, then 16.
   - The project depot in chapter 2 left the bot at **3/10** health. Nothing between the chapters restores it, so it
     reached Zeelich at **4/10**.
   - The Zeelich depot (two drones, a guard and a dog) then needed an **ISO assist**: the bot was down to 2 HP, and 4
     enemies were beaten by the assist (§1, seg 06). lba3-progression's earlier run won the same fight with 3 HP left,
     so this fight is on a knife-edge.
   - In the Core, the third pylon took the bot **335 s** of game time and one ISO assist (seg 14). Pylons one and two took
     about 20 s together.
   - The smallest fixes for the user to pick from: a heal at a chapter's start or card (game-wide, at every
     `nextChapter`), a heart or flask placed before the Zeelich depot, or a lighter first wave there. Then one person
     plays the chapter 2 depot, the Zeelich depot and the Core with real keys. No automated run can say whether these
     are fair.
2. **Stage the ending as the payoff it already earns in words.** Affected: epilogue, both campaigns.
   - The game opens with an 88 s directed film (the notebook cut, §2).
   - It ends with seven lines played in the overhead house view. In that view the dinner table is empty, Zoé is at the
     counter on the frame's top edge, Arthur is on the rug, and Twinsen stands at the door
     (`captures/maturity/epilogue-dinner.jpg`, `epilogue.js` `begin()`). The expanded campaign then cuts to the Cradle
     Hall, and the text card follows.
   - The lines themselves land: "I am back for dinner. Just not that one." Their picture does not.
   - Proposal: a short closing scene on the same cinematic engine. The family seated at that table. The well running
     cool. The heat posts glowing at half heat. The opening's harbour shot answered.
   - This restages a key scene, so it is **a decision for the user** (the rule of 23.11), not something to build unasked.
3. **Fix the late-chapter seams where one talk stacks on another, game-wide.** Affected: chapters 5–16.
   - In chapter 14 on Desert Island, Ilka's first line was "You got my notebook back. Then you can have this too." (the
     singing fork, a gift ten chapters late). Then came her canteen line. Only then came the chapter's own urgent
     greeting: "Twinsen! Dallan said you'd come." (seg 13 log, game time 311–316 s).
   - Cause (inspected): `story/kit2b.js` `talkFirst` gives three gifts on the first talk **at or after** their chapter.
     These are Ilka's fork (`at('dig')`), Tashi's heat flask (`at('pass')`) and Nara's line (`at('council')`). Each plays
     before that person's chapter talk, whatever that talk is.
   - The game-wide fix: when the person has a story talk pending in the current chapter, play it first and the gift
     after it. Or word the gift for a late arrival.
   - Same pass, lower priority:
     - Chapter 10 is the most talk-heavy chapter: about 813 words against about 3 minutes of the bot's play.
     - Chapter 14's route repeats chapter 3's old-mill climb hop for hop: the same eight ledges, 7.09 → 14.75 m. Oku does
       offer Baldino's hop-pack instead ("if your knees would rather fly"), so the repeat is optional.
     - Chapter 7's vent seal repeats chapter 4's disc puzzle (world.md §7, **V**).

## 1. What was played, and how (automated, by input, on the candidate)

The 16 playthrough segments ran one after another, each continuing from the previous one's Save & quit (KEEP → Continue).
The runner was `tests/lib/seg.mjs`, copied to my scratchpad as `mseg.mjs`, with one addition: a watch-only log of every
line, objective, card and toast, and a picture after every step. Settings were `ASSIST=1` as in FULL-TEST-23-11 and
`?nocine`. The opening was watched separately (§2).

| Seg | Chapter(s) | Entry | Result | Bot game time | Deaths | ISO assists | Kept save |
|---|---|---|---|---|---|---|---|
| 01–02 | 1 The Well (prologue, cave) | New Game | PASS | 286 + 98 s | 0 | 0 | m-01, m-02 |
| 03–05 | 2 The Joint Project | my 02 | PASS ×3 | 101 + 267 + 449 s | 0 | 0 | m-03…05 |
| 06 | 3 Zeelich (incl. Kell's lunch) | my 05 | PASS | 448 s | 0 | **1** (Zeelich depot, 4 enemies) | m-06 |
| 07 | 4 The Dig | my 06 | PASS | 278 s | 0 | 0 | m-07 |
| 08 | 5 Steam and Sand | my 07 | PASS | 314 s | 0 | 0 | m-08 |
| 09 | 6 The Pass | my 08 | PASS | 311 s | 0 | 0 | m-09 |
| 10 | 7 The Observatory (incl. the wrong roof) | my 09 | PASS | 235 s | 0 | 0 | m-10 |
| 11 | 8 Evacuation | my 10 | PASS | 697 s | 0 | 0 | m-11 |
| 12 | 9 The Council (incl. Brum's lesson) | my 11 | PASS | 438 s | 0 | 0 | m-12 |
| 12b | 10 Borrowed Time | my 12 | PASS | 179 s | 0 | 0 | m-12b |
| probe | 11 Ballastra, its entry: Doran's freighter, Float Harbor, the harbour master, Tessa | **my 12b** | PASS | 23 s | 0 | 0 | — |
| exp-ballastra | 11 Ballastra, whole chapter | **staged** (its own flags) | **33/33 PASS** | — | 0 | 0 | — |
| exp-balances | 12 House of Balances, 13 The Cradles, into 14, the end card both campaigns | **staged** | **37/37 PASS** (bot 611 s from 11's last talk to 14's first station) | — | 0 | 0 | — |
| 13 | 14 Baldino's Network | **staged** (progression's `base13-exp-staged`: no chain segments exist for 11–13) | PASS | 651 s | 0 | 0 | m-13 |
| 14 | 15 The Shell → 16 The Core → epilogue → Keep Exploring | my 13 | PASS ("Pull him clear") | 669 s | 0 | **1** (one pylon) | m-14 |
| 15 | free play | my 14 | PASS (Brum at the handle, Kell 3.65 m off by the cart) | 47 s | 0 | 0 | m-15 |

Every segment's verdict block was PASS. There were no page errors, no missing files and no text overflow
(`P.fits`, the census of text boxes, recorded 0). The ball-thrown steps that ARM-NAN broke on the pre-freeze build all
worked on the candidate: the harbour bell, the mills, the temple discs, the Ballastra latches and pawl, and the Core's
plates. That is new evidence for the candidate; lba3-progression's chain ran on the revisions before the freeze.

Not covered this way. Chapters 11–13 were played by input but from staged flags, plus the chain's own entry into
chapter 11. "A chair by the cradle" (Second Shift, chapter 13) is **untested** on this build; second-shift J on the
part-2 branch was not rerun. Retry after a death was not exercised: there were no deaths. Pause, Settings and the
gamepad were not used. No sound was listened to.

Logs and pictures (not committed): the scratchpad's `logs/<seg>.txt|.mlog|.trace`, `shots/<seg>/NN-<step>.png`,
`saves/m-*.json` (storage states for port 8411).

## 2. The opening (automated, watched on its own clock)

New Game with no query is the **notebook cut** (`story/opening.js` defaults to it). It runs 88 s. I took a picture every
4 s and recorded the captions and subtitles (`captures/maturity/00-opening-notebook-cut.jpg`). Control arrives in the
house with "Check the well" and the tip "Take your magic ball from the cupboard". The page logged no errors.

- **Followable without LBA.** Four captions over a hand-drawn notebook carry the history in about 16 s:
  1. "FunFrock ruled Twinsun with clones and teleporters."
  2. "Twinsen stood up to him and set Twinsun free. FunFrock is dead. His clones never got the message."
  3. "Later, lightning struck his Dino-Fly."
  4. "He rescued Twinsun's children from Zeelich."

  The drawing then turns into the island. Sendell is named the first time she speaks ("Sendell. Twinsun's goddess.
  Twelve years, and not a word from her until now.", seg 02).
- **First moment of curiosity:** the tap that "worked yesterday", the vein glowing under the well (about 70 s), and
  Arthur's "Lulu says they're drilling to the middle of the world."
- Minor, for the opening's owner. At about 25 s the "LBA3 · THE AWAKENING" title lands over the pier together with the
  first spoken line, so the two compete. The place card's sub-line ("Twelve years after Twinsen's last adventure") is
  pale on pale paper. Its timing is lba3-dialogue's open decision 4.

## 3. Chapter by chapter (all automated as §1 unless marked)

Each chapter lists four things: what first makes the player curious, a meaningful decision, a memorable resident or
place, and any stretch that turns into waiting, confusion or repeated errands.

**1 · The Well** (the prologue)
- **Curiosity:** the tap stops and knocks "three times, then nothing". Arthur: "Like someone wants to come in."
- **Decision:** how to get the lid open. Show Mira the kettle crystals to get her key, then kick the rusted lid (the
  first Aggressive lesson). Overhearing Tim and Lulu in Discreet is optional.
- **Resident or place:** Gilbert and Mira's water-bill quarrel ("So I'm paying for an empty pipe?"); Doran asleep under
  the harbour bell.
- **Waiting or errands:** the lid key and the rope (Xil needs Doran's stamp, which needs the bell) is a classic fetch
  chain. Each link carries its own joke and its own action, so it reads as play, not errands.

**2 · The Joint Project**
- **Curiosity:** "The square is steaming full and our tap gives nothing."
- **Decision:** the pump room. The wall diagram shows two pipes but the room has three. A wrong cock gets one knock from
  Zoé, the right one gets two. This is the best deduction in the early game.
- **Resident or place:** Vesk's arrival speech; Zoé's sneak ("I raised Arthur. I know how to sneak."); Arthur's radio
  bringing in Baldino.
- **Waiting or errands:** the three bypass valves are the chapter's errand stretch. Each valve opens with a toast only
  (`lines: 0` at all three), and the depot fight costs 7 of 10 health. In the cliffs step the camera sits inside the rock
  face (`02-citadel-ch2.jpg`, picture 10).

**3 · Zeelich**
- **Curiosity:** "A freight lift, stopped half way up. With a water cart on it."
- **Decision:** braking the three mills has a cost: Oku's fountain and terrace pumps stop, and Oku names it. Kell's
  lunch is optional (the Second Shift): the bot held the handle until the cloth sat at the nail and got it on the first
  try.
- **Resident or place:** Irsa's bench: "My pump pushes. Your strip is being pushed." Kell and Brel; Oku's "Tell the cog I
  said goodbye."
- **Waiting or errands:** none felt. The ISO assist at the depot is covered in action 1.

**4 · The Dig**
- **Curiosity:** Mother Tarra: "Sani says the pump talks."
- **Decision:** the bore test. Pull the cutoff at the red and watch the ground needle kick after the stop. Twinsen keeps
  the carbon copy.
- **Resident or place:** Dallan takes Twinsen for his new technician, with Ilka's notebook in his pocket.
- **Waiting or errands:** the sandstorm wait to enter the post. The bot found the storm already blowing, so it waited 0 s.

**5 · Steam and Sand**
- **Curiosity:** FunFrock's condenser hall and its "something big under a tarp".
- **Decision:** confronting Dallan ("Your orders say sixty people stay behind"), and Vesk giving Kesh steam while he cuts
  the trace from the log.
- **Resident or place:** Brosk's "Business is business"; Hesk's "I said it glides. I didn't say it lands."
- **Waiting or errands:** none.

**6 · The Pass**
- **Curiosity:** the tree leaning over the gorge.
- **Decision:** start the winch on the gauge's rest.
- **Resident or place:** Lhar, with Yorna, Pim and his kite.
- **Waiting or errands:** none. The chapter is short and reads as a crossing.

**7 · The Observatory**
- **Curiosity:** the wrong roof (Second Shift). Sefa signals a house where "we keep the goats now", and the flash comes
  back from Tashi's belt buckle on the lift's landing.
- **Decision:** carry both suns' light to the crystal.
- **Resident or place:** Sendell, open for the first time: "I am fading."
- **Waiting or errands:** the vent seal repeats chapter 4's discs. The chapter is the thinnest in the middle of the game
  (bot 235 s; estimated 15 min).

**8 · Evacuation**
- **Curiosity:** from the hill, the empty list cart turns away from the lane's shut gate.
- **Decision:** as Zoé, compare the schedule board with the driver's route. The lane is picked up every round on paper
  and never on the road. Then open the culvert in a rest so the cart can get through.
- **Resident or place:** Lulu ("I'm the small one"); Bram, Hedda and Tobin; Pippa ("I'm not on any list. I'm on the
  cart.").
- **Waiting or errands:** none. This is the chapter with the most people in it.

**9 · The Council**
- **Curiosity:** a standing order on the archive door names Twinsen, and under it a brass plate says "RING FOR KELL".
- **Decision:** bring proof, not a story. The carbon from chapter 4 is laid over the cut log. Then the stop's cost: Mill
  Lane goes dry, as Vesk wrote it would.
- **Resident or place:** Councillor Brum takes the handle ("This coat has sat through eleven budgets.").
- **Waiting or errands:** none. This is the most callback-rich chapter.

**10 · Borrowed Time**
- **Curiosity:** a voice in the pipes: "Sixty-one people in your two shelters. Nine are lying down."
- **Decision:** each bleed is water the shelters won't get.
- **Resident or place:** Oren.
- **Waiting or errands:** the most talk per minute of play (action 3). Much of the action is narrated in brackets.

**11 · Ballastra** (staged, plus the entry from the chain's own save)
- **Curiosity:** "Visitors are weighed. Harbour rule."
- **Decision:** the water. Shutting the copper tap with the bypass seized sends everything to the sea, so the kiln
  stops and Corvin comes running. Shared out, every channel gets some.
- **Resident or place:** Dunn: "Mags, I am home!"
- **Waiting or errands:** none.

**12 · The House of Balances** (staged)
- **Curiosity:** a bench needle that settles "as if a hand held it".
- **Decision:** Fennick's forty kiln families against the lower row.
- **Resident or place:** the rig, with each neighbour's own band.
- **Waiting or errands:** none seen.

**13 · The Cradles** (staged)
- **Curiosity:** Jory's card ("wake me … when my sister asks").
- **Decision:** Oren refuses to wake him, the hall rings the flood bell, and the lever is passed hand to hand. Nan Odra
  keeps her mother asleep by her own choice.
- **Resident or place:** Wenna and Jory ("You got old." "You got lazy.").
- **Waiting or errands:** none seen. The chair scene is untested.

**14 · Baldino's Network**
- **Curiosity:** Arthur counts a fourth knock.
- **Decision:** the B-8's band. Mira says when it is too high or too low; the bot set it against her needles.
- **Resident or place:** a friend holds every station.
- **Waiting or errands:** the most travel-heavy chapter: the mill, Mill Lane, a ship, the valve room, the lighthouse, a
  flight to Desert Island, the Hamalayi, then Citadel (bot 651 s). Also Ilka's stacked gift (action 3) and the mill
  climb repeated from chapter 3.

**15 · The Shell**
- **Curiosity:** the knock answered from below.
- **Decision:** the drive starving until drain B is found open and shut.
- **Resident or place:** Sendell: the child.
- **Waiting or errands:** none.

**16 · The Core**
- **Curiosity:** Vesk: "Thirty percent was never a mistake."
- **Decision:** "Pull him clear" or "Leave him for the council's guards"; then Mill Lane's branch before the lock.
- **Resident or place:** Brum on the radio: "Cloth to the nail. I know."
- **Waiting or errands:** the third pylon (action 1).

**Epilogue**
- **Curiosity:** "Four days later."
- **Decision:** none, by design.
- **Resident or place:** the Cradle Hall, four days on.
- **Waiting or errands:** none. The staging is covered in action 2.

**Free play** (seg 15): the ending does not come back. Brum is at the handle.

## 4. Early Citadel against late Zeelich

- **Writing and design: late Zeelich is better.** Early Citadel teaches well: the knocking tap, Zoé's knock code, the
  pump room's pipes. Chapter 9 ties threads from four chapters together, and every one of them is played:
  - Kell's freight lift from chapter 3 becomes the way into the archive.
  - Dallan's carbon from chapter 4 is the proof.
  - The mills Twinsen braked in chapter 3 left Oku's terraces dry for a week, and he must free them first.
  - The stop's cost falls on the lane Vesk warned about.
  - Brum learns the cloth-to-the-nail.

  Chapter 14's stations each put a friend from an earlier chapter at a relay.
- **Look: early Citadel is better.**
  - Citadel has had the user's eye change by change (P103, P105, P107, P112, P113). In `01-citadel-prologue.jpg` and
    `02-citadel-ch2.jpg` it has greens, coloured roofs, gardens and a busy square.
  - Zeelich's street in chapter 3 and again in chapter 9 is the same set: pale grey paving under a white cloud-sea
    (`03-zeelich-ch3.jpg`, `09-zeelich-council.jpg`). The narration says "The sky here is pink", but the pink barely
    shows from the Far camera.
  - The council and archive interiors are plain tiled boxes beside Citadel's furnished homes.
  - world.md §5 lists the isles' gaps against LBA2 (Knartas, Mosquibee, Otringal, Celebration, terminal island: 56–68)
    as decisions for the user. None has been built.
  - Ballastra, the newest region, looks warmer and more varied than Zeelich (`11-ballastra-entry.jpg`).
- **Conclusion:** the gap between early and late is visual, not narrative. That is a polish item for the user's picks,
  not missing content.

## 5. Fair challenge, story payoff, visual and audio consistency, a newcomer

- **Fair challenge** (automated floor; untested by a person). Puzzles give a clue, answer a wrong attempt and let the
  player recover in every case the bot met:
  - the pump room's one knock for the wrong cock;
  - the temple's cold disc that shuts the open ones;
  - the Ballastra crank's "High weight, low deck. It's backwards.";
  - the rig's wrong band.

  This agrees with world.md §7. Fights are the risk (action 1). Health carries from chapter to chapter: the bot played
  chapter 3's opening at 4/10 with the screen's red edge on. Whether a person buys potions from Pippa, finds hearts or
  feels stuck is untested.
- **Story payoff** (inspected + automated). Every set-up in story.md §3 pays off on this build. The two fixes from
  wave 1 are present in play:
  - Baldino: "my bore needle just moved. He's started the drill again" (seg 13).
  - The shell's opening line about the bore turning again (seg 14).

  The Second Shift's payoff lands in the Core exactly as briefed, ending on Irsa's "Kell's cart is still climbing". Free
  play has Brum at the handle and Kell not also there. The one weak payoff is the ending's staging (action 2).
- **Visual and audio consistency.** I saw no broken frame in about 260 step pictures (looked at as contact sheets).
  - Seen, all minor:
    - the camera inside the rock at the cliffs valve (chapter 2);
    - a roof filling the foreground at the yard tap (prologue);
    - the camera behind the old mill's sails while climbing (chapter 3).
  - Interiors keep the black void round LBA-style cut-away rooms throughout.
  - Sound is sound.md's automated measurement: no clipping, no bad seam, the story-scene resume click fixed, eight
    characters given their own voices. **Nobody has listened.** On sound, untested is the honest word.
- **Someone new to LBA.**
  - Followable start to end on the evidence above: the notebook captions, Sendell named in-line, each behaviour mode
    taught by a toast at the moment it is needed ("Aggressive (F3), then W by the lid", "Athletic (F2), then Space to
    jump"), and objectives that list their steps.
  - Two risks, both for a person to confirm:
    - the late chapters' machine vocabulary: B-7, B-8, band, governor, isolator, relay, feed box, bleed;
    - "three and a rest" serving as the timing rule for six or more puzzles (chapters 2, 6, 8, 10, 14 and 16). It reads
      as the game's grammar and, by the Core, pays off as Sendell's knock. It may also read as one trick used many times.

## 6. Handed to the coordinator (no change made here)

| # | Priority | Chapters | What | Evidence |
|---|---|---|---|---|
| 1 | High | 2–3, 16 | First-fight damage spike: no heal between chapters 2 and 3; the Zeelich depot and the third Core pylon needed ISO assists; a person's play is needed | seg 04 (hp 3), seg 06 (assist), seg 14 (335 s, assist); automated |
| 2 | High (user decision) | epilogue | The ending as overhead play view plus a text card; propose a directed closing scene | `epilogue.js begin()`, `captures/maturity/epilogue-dinner.jpg`; inspected + automated |
| 3 | Medium | 5–16 | `kit2b.js talkFirst` gifts play before that person's chapter talk (Ilka's fork in ch 14 seen; Tashi's flask and Nara's line have the same gate) | seg 13 mlog 311–316 s; source |
| 4 | Low | 10 | Talk-dense chapter (about 813 words to about 3 min of play) | seg 12b |
| 5 | Low | 2, 3 | Camera inside the cliff (ch 2 cliffs valve) and the mill's sails (ch 3 climb) | pictures `02-…` #10, `03-…` #15 |
| 6 | Low (opening owner) | opening | Title and first subtitle overlap at about 25 s; pale sub-line on the place card | `00-opening-notebook-cut.jpg` |

## 7. Remaining uncertainty

- **No person has played any of it.** That leaves open: fair challenge, getting stuck, the camera under real hands, the
  sound, Hebrew on screen, real-GPU frame pacing, and how long a first play takes. CONTENT-15H's ~6.2 h main route and
  ~10–11 h with all optional content are estimates, not measurements.
- Chapters 11–13 were played from staged flags. The continuous chain stops at 11's entry and resumes at 14 from a staged
  save. "A chair by the cradle" is untested on this build.
- The ISO assists show the bot losing, not a person. Two runs of the same fight (progression's and mine) ended at 3 HP
  and at 2 HP with an assist: the margin is thin, and the verdict on fairness is still open.
- The pictures in the expansion suites' run caught mostly loading screens (my watch-only picture hook raced the page),
  so Ballastra's look rests on the entry probe's four pictures and lba3-world's reports.

## 8. Files

- This file; pictures `captures/maturity/` (contact sheets of the step pictures, JPEG, about 1.7 MB in all):
  `00-opening-notebook-cut.jpg`, `01-citadel-prologue.jpg`, `02-citadel-ch2.jpg`, `03-zeelich-ch3.jpg`,
  `09-zeelich-council.jpg`, `11-ballastra-entry.jpg`, `15-16-shell-core-ending.jpg`, `epilogue-dinner.jpg`.
- No game source or test changed. The scratch runners (`mseg.mjs`, `mexp-*.mjs`, `seg-ballastra-entry.mjs`, `run.sh`)
  stay in the scratchpad.
