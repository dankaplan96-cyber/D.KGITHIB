# Fresh Eyes: a first-time reader on LBA3: The Awakening

A newcomer's report on the story and the player-facing English text. I did not open the design documents (`docs/`,
`STORY_BIBLE.md`, `PROJECT_BRIEF.md`, `WORLD_MAP.md`, `.claude/`). I read `src/game/text/*.js` and the English block of
`src/game/i18n.js`, and used `src/game/story/*.js` only to work out the order of lines and who says them. Where a chapter
has a "thread" version (`hometap`, `pumpline`, `zeelift`, `digtest`, `passline`, `laneline`, `cnline`, `netline`,
`answer`), I read it the way a new game plays it: those flags are set for new games, so those versions are what a
newcomer sees.

Chapter numbers below are the ones the game shows (1 The Well … 9 The Council, 10 Borrowed Time, 11 Ballastra,
14 Baldino's Network, 15 The Shell, 16 The Core, then Home). The text files have their own numbering
(`ch1.js` = chapter 2, and so on).

Ratings: **[major]** a first-time player will stumble, lose the thread, or notice a contradiction. **[minor]** polish,
a stiff line, or a small slip most players will let go.

---

## 1. Overall impression

**The first three chapters work, and they are the best part of the game.** The opening film is short and human. A tap
stops, the water comes back warm ("That's warm. It's never warm."), the drill hums, a boy jokes about "digging to the
middle of the world", and the camera goes down the well. Chapter 1 is a cosy small-town errand chain (lid key, a kick,
a rope, a bell) that ends with a goddess speaking from a wall. Chapter 2 brings in a believable antagonist (Vesk), a
moral hook (an evacuation plan with room for 30%), and a well-built small mystery in the plumbing thread (the third
copper pipe, the knock code "twice for water, once for nothing", the gauge strip). Chapter 3 pays that off with Irsa's
bench: "My pump pushes. Your strip is being pushed." That is good detective writing.

**From about chapter 4 the story gets harder to follow, and after chapter 9 I was mostly lost.** Three problems pile up:

1. **The central idea is never made concrete.** I can repeat the words: the shell, the being under it, the vents, "reverse
   the bore", "turn it into a shield", the network code, the knocking that goes 3, then 4, then 2. I could not explain
   them to a friend. What happens if the shell cracks? ("The cold comes in"? Boiling? She wakes up and…?) How does a drill
   become a shield? Why does a knock count of four matter? Each chapter adds a new mechanism before the last one has
   landed.
2. **The story contradicts its own rules.** In chapters 2–3, Vesk and Baldino both say that stopping the bore halfway
   cracks the shell, so it must be reversed. In chapter 9 the council orders it **stopped**, Twinsen throws the stop
   himself, and nobody mentions the danger. In the finale the drill is "grinding on" again with no explanation.
3. **The expanded chapters (10 Borrowed Time, 11 Ballastra) open threads that never close.** Oren, a voice in the pipes
   who counts people by their weight and says he has 304 sleeping children "safe"; Tessa's regulator; the House of
   Balances; someone buying every Balance Works coil. None of these comes up again. The game then jumps from
   "Chapter 11" to "Chapter 14".

**Characters.** Zoé is the strongest: active, funny and brave (she sneaks into the office, broadcasts the warning, gets
the farms out, finds the B-7). Gilbert (the bill, the refund, the kick) and Mira (the water office's report) are
reliable comic regulars. Arthur is lively and gets a lovely payoff with the pipe code at the end. Dallan's arc, from
foreman to carrying water for Tarra, is the best-written side arc. Vesk is the most interesting character in the middle
of the game ("We disagree about numbers, you and I. Not about water.") and the flattest at the end ("Thirty percent was
never a mistake. It's who I chose."). Twinsen is a pleasant blank. He mostly narrates what is on screen in brackets and
summarises the plot to whoever is listening, with a few good dry lines ("I am back for dinner. Just not that one.").
Baldino talks in lectures. Many of the later side characters (Kell, Irsa, Tessa, Oren, Brel, Hobb, Corvin) share the
same clipped, fragment-heavy voice, so they blur together.

**Newcomer context.** The game assumes I know Sendell, FunFrock, the Esmer, Zeelich, Bù and the clones. The opening
caption gives "Citadel Island, Twinsun" and "Twelve years after Twinsen's last adventure", and that is all. I picked up
FunFrock from context ("FunFrock built this fortress to rule the island"). I never learned who or what Sendell is
before she started speaking, and the story's main mystery depends on her.

---

## 2. Who's who, as I understood it from the text alone

- **Twinsen**: the player, a retired local hero with a magic ball. Married to **Zoé**, son **Arthur** (about 12).
- **Gilbert**: an old man who complains about his water bill. Arthur and Zoé later call him "Grandpa Gilbert", but
  nobody else treats him as family (see 4.3).
- **Mira**: clerk at the water office. **Pippa**: potion stall. **Xil**: an Esmer trader from Zeelich. **Doran**: a
  sleepy harbour master who later flies spaceships and sails ferries. **Tim** and **Lulu**: neighbour kids.
- **Vesk**: chief engineer of the "Joint Project" (Twinsun and Zeelich), drilling for the planet's heat under
  FunFrock's old fortress.
- **Sendell**: a voice in the well, apparently a goddess, who says "Someone has reached her."
- **Baldino**: an inventor on Zeelich who opposes the project. **Irsa** (pump maker), **Kell** (lift man), **Nara**
  (flower seller), **Oku** (miller): people on Zeelich.
- **Ilka** (sacked professor), **Dallan** (project foreman, later an ally), **Tarra**, **Hesk** (sand-yacht and glider
  pilot), **Brosk**, **Sani**: Desert Island.
- **Yorna**, **Pim**, **Sefa** (observatory keeper): the Hamalayi.
- **Oren** (a voice in the pipes from Ballastra), **Tessa**, **Halden**, **Corvin** and others: Ballastra.

The goal as I understood it: a drill under Citadel is cracking a "shell" inside the planet, with a sleeping "child of
this world" under it. Vesk plans to evacuate only 30% of people. Twinsen opens vents to relieve the pressure, gets the
council to act, builds a five-station radio network to open the sealed shaft, goes down, and turns the drill into a
"shield".

---

## 3. Opening film and the yard (opening.js, thread.js `prh_`)

**Works well.** The harbour exchange (`op_res_1` "When does the harbour row get the heat?" / `op_wk_1` "Next quarter.
Every home gets it. Vesk promised.") sets up the project, its promise, and the "harbour row" left out, all in two lines.
"It worked yesterday." (`op_zoe_2`) is a real married-couple line. "Not bad for an old hero. Now, the well."
(`t2_zoe_done`) is warm. The tutorial's framing as Zoé's errands, and her calling him back ("Where are you off to? I'm
not finished with you."), is natural.

- `op_tw_2` — "I'll check the well." — **[minor]** Nothing on screen links the house tap to the well in the square, so
  "the well" comes out of nowhere for a newcomer. The link only arrives later, in `prh_lane` ("Everything on this lane
  hangs off the square's well"). *Direction:* half a line from Zoé, e.g. "Is it the square's well again?"
- `op_zoe_3` "That's warm. It's never warm." vs `prh_tap_1` — "(Not a drop. But the pipe is knocking behind the
  tiles…)" — **[minor]** The film shows warm water running. In play, the same kitchen tap gives "not a drop". Not a
  contradiction (it stopped again), but Twinsen could say so ("Stopped again.").
- `t2_ask_pipe` — "And the project's pipe? You used to clear it at a run." — **[minor]** The Joint Project reads as
  newly arrived (the heat is "next quarter", Vesk introduces himself in chapter 2), so a habit of jumping "the
  project's pipe" sounds like years. *Direction:* "the old pipe", or "Bet you can't clear the project's new pipe."
- `t2_ask_tap` — "Is our tap knocking too? Try it." — **[minor]** "Too" points back to next door, but Zoé's report
  about next door was that their tap "ran warm, then stopped", not that it knocked. Also, she is standing at the tap,
  so asking him to try it is a visible tutorial contrivance. "Try it, your hands are better with taps" or similar would
  hide it.
- `pr_zoe_kettle2` — "Mira's at the well telling everyone it's Gilbert's old pipes. Show her these, and she'll have to
  open it." — **[major for clarity]** These are the first mentions of Mira and Gilbert, and they arrive as bare names.
  The player doesn't know who Mira is, that she has a key, or what "open it" refers to (the well has a lid? a lock?).
  *Direction:* "Mira from the water office has the well padlocked. She's telling everyone it's Gilbert's old pipes."
- `pr_locked` — "The neighbours are out. They're in the square, arguing about the well like everyone else." —
  **[major]** Zoé has just come back from next door with the neighbours' news and their kettle crystals
  (`pr_zoe_kettle`). Trying their door a minute later says nobody is home. *Direction:* "Gone to the square with
  everyone else."
- `t2_where_inv` / `t2_goal_inv` — "Look at the Kettle Crystals in your inventory" — **[minor]** Fine as a tutorial
  step, but nothing comes of looking. A one-line item text that hints at something odd would reward it.
- `pr_tw_ballfirst` — "I'd better take the magic ball along. It's in the cupboard." — fine. `pr_cupboard` "Hello
  again, old friend." — good.

## 4. Chapter 1 "The Well" (i18n.js `pr_`, well.js, common.js `pr_j_`)

**Works well.** Gilbert and Mira's quarrel ("the bill covers the connection, not the water" / "So I'm paying for an
empty pipe?") is a good comic opener. `pr_gil_no` "My pipes are fine! I kick them every morning." pays off in the lid
kick and in `pr_mira_kick` "That explains his pipes." `pr_xil_2` "I asked him three times. The third time, he snored."
and `pr_xil_4` "You look like someone who climbs down a lot of holes." are both good. Tim and Lulu's overheard
confession is a charming optional scene.

### 4.1 Logic
- `pr_mira_no` — "It isn't the well, Twinsen. It's the old pipes on his street. I don't unlock the town well for a pipe
  fault." — **[major]** The well in the square is visibly dry (`pr_j_well` "The well in the square has run dry",
  `pr_well_after`, the walkers' "The well's dry again"). Twinsen's house, the neighbours and Gilbert are all dry. A
  dry public well cannot be one man's pipe fault, so Mira's refusal reads as a puzzle gate. *Direction:* give her a
  reason that survives a look at the well, e.g. "The spring's sealed for a reason. I don't open it on a rumour." The
  kettle crystals then become the proof that something is coming up from below.
- `pr_mira_2b` — "Fine. Find the fault and I'll waive his bill this month." — **[minor]** "Fine" right after being
  convinced ("pipes don't grow those") sounds grudging, which suits her, but "his bill" (Gilbert's) is a non-sequitur in
  a conversation with Twinsen alone when Gilbert isn't part of the row.
- `pr_xil_1` → `pr_tw_xil` "I'll talk to him." → later `pr_xil_4` gives a rope ladder — **[major for clarity]**
  Twinsen never asks Xil for a rope, and Xil never offers one in exchange for the stamp. The deal exists only in the
  objective text (`pr_obj_doran` "A rope (Xil needs Doran's stamp)"). A player reading the dialogue does not know why
  they are waking Doran. *Direction:* Twinsen: "I need a rope for the well." Xil: "Rope I have, on that barge. Which
  is stuck until the harbour master stamps my permit."
- Opening film (the project's crates coming up off the barge on the lift) vs `pr_xil_1` "My cargo sits on that barge
  until the harbour master stamps my unloading permit" and `pr_xil_3` "This cargo is for the joint … energy project"
  — **[minor]** The opening shows project cargo being unloaded from a barge; then the project's cargo is stuck on a
  barge waiting for a stamp. A player who notices will wonder why the lift worker didn't need the stamp.
- `pr_tim_2b` — "It scared me, so I threw it in the well. Then the water stopped..." — **[minor]** A nice red
  herring, but it is never explicitly cleared. Twinsen could say in the cave or later, "It wasn't your stone, Tim."
  The epilogue only says he was grounded.
- `prh_tw_cycle` (appended after `pr_sendell_2`) — "(The pump again. Every time it runs, that growth moves. Somebody
  up there is pumping, and I want to know who.)" — **[major for pacing]** A goddess has just spoken to Twinsen for the
  first time in twelve years ("Someone has reached her."), and the chapter's last word is about a pump. It flattens the
  chapter's climax. *Direction:* put the pump thought before Sendell, or drop it there and open chapter 2 with it.

### 4.2 Clarity
- `pr_sendell_1` / `pr_tw_sendell` — "Sendell? I haven't heard your voice in years..." — **[major for newcomers]** No
  text up to here says who Sendell is. The inventory's `itd_medallion` "Sendell's medallion" and the asylum register's
  "dreams of a goddess" are both optional. A newcomer hears a mysterious "she" speak about "her". *Direction:* one line
  of Twinsen's inner voice, e.g. "(Sendell. The goddess who chose me, all those years ago.)", or a cut version of the
  old `pr_intro_1/2` caption.
- `pr_cave_2` — "Maybe it can wake those three dark crystals." — fine. `pr_toast_node` "Crystal awake (1/3)" — fine.
- `pr_obj_done` — "Prologue complete" — **[minor]** The chapter is billed as "Chapter 1: The Well". "Prologue" is an
  internal name leaking out.
- `pr_well_rope` — "Too deep to jump. I need a rope. The harbour might have one." — fine, clear.

### 4.3 Naturalness and consistency
- "Grandpa Gilbert" (`c1_zoe_home3`, `c1_ar_radio1`, `c8_ar_2`, `om_m_council_4`) vs "Gilbert" (`c7_arthur_2`
  "Gilbert's not on it", `ct_zoe_dry1` "Gilbert has water", Zoé's `pr_zoe_kettle2`, Twinsen everywhere) — **[major]**
  Is Gilbert Arthur's grandfather (Zoé's father? Twinsen's?) or a neighbour the kid calls "Grandpa"? In chapter 1
  Twinsen and Gilbert talk like acquaintances, and Zoé calls him by first name in front of Twinsen. Arthur himself
  switches between "Gilbert" and "Grandpa Gilbert". *Direction:* decide. If he's family, he and Twinsen need one warm
  family beat in chapter 1. If not, "old Gilbert".
- `pr_doran_2` — "He's only been waiting three days. Waiting is what harbours are for." — good.
- `pr_mira_wait` — "If you need anything else from the water office, I'm here. Sadly." — good, sets her voice.

## 5. Chapter 2 "The Joint Project" (ch1.js, thread.js `ct_`, depot watch)

**Works well.** Vesk's arrival and Gilbert's heckle ('"Shortly." That's what FunFrock said about the taxes.'). Vesk's
first lines ("The medallion, the ponytail: the legend himself.") give him charm. "FunFrock built this fortress to rule
the island; we use it to heat it." is a good line. Zoé's sneaking segment and her lines ("I raised Arthur. I know how
to sneak.", "Delivery forms. And a very old sandwich.") are a highlight. The plumbing thread (`ct_`) is the most
satisfying puzzle writing in the game: the diagram shows two pipes and the room has three, the copper pipe isn't on
the sheet, and Zoé knocks "twice for water, once for nothing" and later pays it off. `ct_worker_2` "Houses aren't on
my sheet." quietly foreshadows the evacuation list. Vesk's "I calculate capacities. I don't make promises." is a nice
ironic echo of the opening's "Vesk promised".

### 5.1 Logic
- `c1_gil_morning` — "Twinsen! Hours down there, and the well's still dry." + `c1_zoe_home1` "There you are! You
  climbed into the well and vanished." — **[minor]** So he spent the night at the bottom of the well and nobody, Zoé
  included, came looking. Either acknowledge it ("I sat by that well till midnight") or make it the same day.
- `c1_vesk_3` / `c1_vesk_4` — "Open all three and your well fills." / "And mind the depot: drones, a guard and his dog,
  and nobody has told them about you. Stay out of sight." — **[major]** The chief engineer sends a civilian to open
  his project's own valves, and tells him to sneak past his own guards instead of telling them. Later his station
  radios the depot in one line (`dw_radio_1` "Chief says that's Twinsen: let it run."), which proves he could have.
  As written, this is a quest-giver contrivance. *Direction:* make it Vesk's move (he wants Twinsen busy, or wants to
  test him: "My crews are on the bore. You know the island."), and have Twinsen notice the oddity.
- `c1_zoe_go` — "Doran is getting the ship ready at the spaceport." — **[major]** It plays right after the radio
  scene, while the objective says "Talk to Doran at the harbour" and Doran is in fact at the harbour (he only walks to
  the spaceport after `c1_doran_ferry2`). *Direction:* "Go and find Doran at the harbour. Baldino sent him the code."
- `c1_after_tw` — "He's gone to Zeelich." / `c1_beam_dead` "The beam pad is dead. Vesk cut the link from his ship." —
  **[minor]** The "beam pad", a teleport up to "his ship", appears for the first time in the objective ("Confront Vesk
  at the beam pad"). The project ferry earlier is a sea ferry that "glides into the harbour… blue glow beneath the
  hull". So is "his ship" the ferry, a spaceship in orbit, or the "project ship at your spaceport"? Three vehicles,
  never told apart. *Direction:* name them once: the ferry (sea), Vesk's ship (in orbit), the project shuttle (at the
  spaceport).
- `c1_doran_ferry1` — "The passenger flights are grounded, but a project ship still flies." — **[minor]** Grounded
  why? An unexplained aside that raises a question nobody answers.
- `c1_baldino_2` — "I've sent Doran its start code." — **[minor]** Why Doran, a sleepy harbour master who has never
  been shown flying anything? His own line ("Doran can sail anything that floats, and up there everything floats") is
  funny but doesn't explain how Baldino knows him.
- `ct_feel_upper` — "(The upper pipe. Cold, and full. It runs to the square.)" vs `c1_well_hot` — "The water's back,
  but it's steaming." — **[minor]** The square's well is steaming hot while the pipe feeding the square is cold, and
  the lane's tap then runs "Cold. As it should be." The plumbing logic is: the square is hot, its pipe is cold, the
  house line from the same main is cold. *Direction:* either the square is fed from the hot spring direct (say so) or
  the upper pipe is warm.
- `c1_tw_tour1b` → `c1_tw_tour1` — "People like them. Zoé is already planning a hot bath." → "But the crystals in your
  pipes are just like the ones at the bottom of the well." — **[minor]** Two Twinsen lines in a row, and "But" turns
  against a line that wasn't an argument. Also, where does he see crystals "in your pipes"? A quick "(I saw them
  through the inspection glass)" or putting Vesk's line between would help.

### 5.2 Clarity
- `c1_vesk_tour2` / `c1_tw_tour2` — "unusual pressure on the 'shell'" / "The shell? What shell?" — good: Twinsen asks
  the player's question. But the answer ("A layer of very hard rock, nothing more") is the last clear definition the
  shell gets until chapter 3's nut metaphor.
- `c1_valve_depot` — "The depot at the old camp (guarded yard)" — **[minor]** "The old camp" is never explained (an
  LBA1 place?).
- `c1_doran_drones` — "Past the yellow line, go slow. Slow, I can teach." — **[minor]** "Slow, I can teach" is a nice
  idea (the sleepy man), but it lands as a non-sequitur. "Slow is the one thing I can teach you." reads cleaner.
- `c1_zoe_gate1` — "Authorised zones: A only." What's zone A? — good hook. But zones never come up again; the plan
  instead lists pick-up points. **[minor]** Either pay "zone A" off or use the plan's own words.
- `c1_obj_confront` — "Confront Vesk at the beam pad" — **[minor]** First mention of a beam pad, and in an objective.

### 5.3 Naturalness
- `c1_tw_home1` — "Then Sendell spoke to me. She said someone has reached 'her'." — fine, and Zoé's answer "Sendell?
  After twelve years? Then this is no blocked pipe." is good.
- `c1_conf_vesk2` — "Something alive, warm enough to heat both worlds for a thousand years. Yes, there's a risk.
  That's why there's a plan, and everyone on it will live." — strong.
- `c1_ama_form1`, `c1_bern_form`, `c1_gate_form` (the flight form errand) — **[minor]** One more errand at the moment
  the story finally has momentum (Vesk has fled, Baldino is calling). Ama's "tell Doran he still owes me for the last
  one" is a good line, but the errand itself is pure friction. Consider trimming it to one counter exchange.
- `c1_ar_radio2` — "I fixed the radio! Me! That counts as helping, right?" / `c1_zoe_radio` "It counts, Arthur." —
  sweet, keep.

## 6. Chapter 3 "Zeelich" (ch2.js, thread.js `zt_`)

**Works well.** The cistern-lift episode is concrete and grounded (a stuck water cart, a brake, a chain, a bell).
Kell, Brel and Irsa feel like a working neighbourhood. Vesk's radio cameo (`zt_vesk_2` "We disagree about numbers,
you and I. Not about water.") and Irsa's `zt_irsa_6` ("Vesk signs my invoices and keeps this quarter in water. He also
told me not to file what I just showed you.") give him real moral texture. The lighthouse dials riddle ("first what
wakes us, then what the sea does, then what twinkles") is good, and Zoé's broadcast is clear and stirring. Baldino's
entrance gag ("Mind the... ah. Never mind, I have another one.") is good.

- `c2_tw_arrive` — "Baldino said his workshop is on the Esmer street." — **[minor]** He never said that on the radio
  (`c1_baldino_1/2`). Add it there, or "Baldino's on the Esmer street, Doran says."
- `c2_bal_2` — "Twinsun sits inside a shell, like a nut. Beneath the shell sleeps the being Sendell watches over." —
  **[major for clarity]** The image is backwards: the shell is inside Twinsun, and the being sits inside the shell.
  This is the game's key concept, and the metaphor muddles it. Sendell later calls it "her shell" around "a child of
  this world", which is an egg. *Direction:* say egg from the start: "Deep under the ground there's a shell, like an
  egg's. Something sleeps in it. Sendell has watched over it since before any of us."
- `c2_bal_4` — "Stop it halfway and the shell cracks on its own. It has to be reversed… First we need to get past its
  shield." — **[major]** "Reversed" is the plan for the rest of the game, and it is never explained. Does reversing
  mean pulling the drill out? Pumping heat back? `c2_bal_vesk` adds "turn it into a shield", which is just as abstract.
  A player can't picture the goal. *Direction:* one concrete image, e.g. "Run it backwards and it stops drawing heat
  out. It pushes it back into the shell, like a patch."
- `c2_bal_2`…`c2_bal_7` — six Baldino lines in a row of pure exposition (the shell, Vesk's belief, reversing, the
  override key, the two parts, the mills, Zoé at the lighthouse) — **[major for pacing]** Too much in one go, and it
  mixes the cosmic (a sleeping being) with the fiddly (a cog, a cylinder, three brakes). *Direction:* split it: the
  revelation now, the shopping list on the next talk or on a note.
- `c2_bal_7` — "Zoé is waiting at the lighthouse. When the key is ready, she'll broadcast a warning to the whole
  island." — **[minor]** Why does Zoé's warning wait for an override key built on another planet? The two have nothing
  to do with each other. It's a gameplay gate showing through.
- `c2_guard_dock2` / `c2_tw_dock2` — "(The depot. So that is where it will end up.)" — **[minor]** Stiff. "(The
  depot. Good to know.)"
- `c2_ship_bal` → `c2_after_bal` → `c2_ship_bal2` — "To your station, then. The shaft… starts under that derrick." →
  "Take these: the conversion plans." → "Give him a few hours, and we'll know what he's done." — **[major for logic]**
  Vesk has just said "Follow, then. If you can find a way down", and Twinsen said "Then we'll follow you." Baldino first
  points him home, then says wait, and Twinsen waits hours on Zeelich while the villain flies off to finish the job.
  *Direction:* give a reason to wait (no ship until the shield's power cycles, Doran refuelling), or have them leave at
  once and get the sealed-door news on the way.
- `c2_ar_sealed` — "Dad? It's Arthur, on the project's channel." — **[minor]** How is Arthur on the project's
  channel from his kitchen? Convenient. Earlier setup ("Arthur's been tuning Grandpa's radio to the project's
  channel") would make it a payoff.
- `c2_bal_sealed1` — "Those doors only open on the bore's own network code, and every project station has to send it at
  once." — OK as a setup, but it is the third mechanism in this chapter (shield, override key, network code).
- `c2_doran_sealed` — "…two days south on the project's ferry." — **[minor, recurring]** The heroes keep using the
  project's own vehicles (its ship, its ferry, later its ships in chapters 8–9 and its freighter in chapter 11) while
  openly fighting it. Once is a joke; five times is a hole. A line acknowledging it ("Doran's still got the code, and
  nobody's thought to change it") would cover them all.

## 7. Chapter 4 "The Dig" (ch4.js, digtest.js)

**Works well.** Sani the child who hears the pump ("Two gears clack. One grinds.") is a nice listening puzzle. Tarra's
suspicion of anyone off the ferry is earned. The test-stand scene (Dallan mistaking Twinsen for "the new man", the
three kicks after the stop, Vesk on the wire calling it "settling") is tense and well staged.

- `c4_dallan_note` — '"Test bore pressure rising. Keep drilling."' vs `c4_dallan_2` — "The test bore stays capped and
  the pressure stays where it is." — **[major]** Same man, same bore, same chapter: "keep drilling" and "stays
  capped". The digtest scene then has the drill running on the test bore. Pick one.
- `c4_ilka_c1` — "Vents. The shell has vents, so the heat can get out." vs `c4_ilka_end` — "The vent under this
  island is the test bore." — **[major for clarity]** Are vents ancient openings in the shell (the carving, "older than
  FunFrock") or the project's bore holes? Calling the natural vent "the test bore" merges the two. Later Vesk calls them
  "FunFrock's old vents" (`c8_vesk_1`), a third version. *Direction:* "The vent under this island comes up right under
  his test bore. He capped both."
- `c4_ilka_c2` — "The project draws all the heat to one point. Under Citadel. The rest of the shell is sealing up." —
  good, clear stakes. One of the few places the mechanism makes sense.
- `c4_tw_ilka1` — "I'm Twinsen. Baldino sent me." — **[minor]** Ilka doesn't react to either name. A beat ("Baldino?
  He still writes to me. In capitals.") would make the world feel connected.
- `c4_ilka_4` — "The project fenced off Temple-Park and dug down to the Temple of Bù itself." — **[minor]** "Bù" and
  "Temple-Park" mean nothing to a newcomer. Ilka is a professor, so she can explain in five words: "the old god Bù's
  temple".
- `c4_tw_d1` — "Project security took Vesk's evacuation plan off me on Zeelich. You know what it says." — **[minor]**
  He got it back from the depot (`c2_got_plan`). The line reads as if he no longer has it. "You know what Vesk's plan
  says." is enough.
- `dt_tw_hail` — "(He thinks I'm his new technician. With Ilka's notebook in my pocket.)" — good.
- `dt_dallan_dig` — "And you. Citadel's new hand, my foot." — good callback.
- `c4_arrive` — "Doran trades the ship for the project's ferry." — **[minor]** And Doran then claims in chapter 5,
  "That's MY ferry! Well. The project's. But I'm the one who sails it!" When did he become its captain?

## 8. Chapter 5 "Steam and Sand" (ch5.js, digtest.js `dt_w5_`)

**Works well.** `c5_tw_gate2` ("'Thirty percent. I know.' Your words, at the dig.") is a good callback that turns
Dallan. `c5_tw_vent` "It's breathing. And the oasis is still water, not soup." `c5_dallan_k1` ("The ferry left without
me… I am not on the list either, it seems.") / `c5_ilka_k1` ("Welcome to Kesh, Dallan. The water is free.") is a
lovely little turn.

- `c5_trader_1` — "A shovel? Water first. Fill this jar at the oasis, and the shovel's yours." — **[minor]** A fetch
  inside a fetch. Brosk just watched Twinsen fix his water. Charging him for a shovel is in character, but it is filler.
- `c5_zoe_radio1` — "Ilka's map matches Gilbert's old charts." — **[minor]** Why does Gilbert, the man with the water
  bill, have charts of the Hamalayi? Never set up (only an idle line later). Same for `c5_ilka_radio` "I sent her the
  carving": sent a carving by radio?
- `c5_hesk_k1` — "Launch it from the hangar roof into the wind and we'll reach the Hamalayi foothills." — **[minor]**
  From a desert island to a mountain range on a glider off a roof is a stretch even for LBA. A wink from Hesk ("If the
  wind likes us") would help.
- `c5_doran_1` (see above) and Doran vanishing afterwards — **[minor]** After "That's MY ferry!", Doran is gone from
  the story until the epilogue (apart from Ballastra). His sudden exit isn't noted.
- `dt_w5_2` — "Then put the bore's heat line on it. It's spare heat. Let it turn their pump." — good: Vesk buys a
  village's silence with kindness. `dt_brosk_steam` "Steam from the project, after they took our ferry. Make up your
  minds, I say." is great.
- `dt_tw_gate2` duplicates `c5_tw_gate1` almost word for word ("Open the relief slowly, and the steam goes through
  FunFrock's condensers instead of under Kesh"). **[minor]** Fine if only one plays, but check it.

## 9. Chapters 6–7 "The Pass" / "The Observatory" (ch6.js, ch7.js, passline.js)

**Works well.** Pim ("It's my best shiny thing." / "I licked it once."), Yorna's "Bring yourself back.", the villagers'
one-liners (`c6_v3` "Mountains shouldn't be warm."), Sefa ("The stars said one would come with a ball and too many
questions."). Sendell's scene in the dome is the clearest statement of stakes in the game (`c7_sendell_2` "I have been
holding the shell together with my own light… I am fading."). Arthur's frantic call (`c7_arthur_2` "WE'RE not on it!")
is a good turn to bring Twinsen home.

- `c7_sendell_4` — "When you reach the bottom of the world, you will see her. Not before." — **[major, payoff]** This
  sets up a promise. At the bottom, the text never describes Twinsen seeing her: Sendell says "A child of this world"
  and "She is asleep again", and `sh_sendell_held` speaks about her. If there is a visual reveal, no line marks it; if
  there isn't, the promise is broken. *Direction:* one bracketed line of what he sees.
- `c7_tw_s1` — "Sendell. The shell is cracking. The project is closing the vents." — **[minor]** Twinsen briefing a
  goddess on news she already knows ("I know."). Better: "Sendell. Is it true? The shell?"
- `ps_read_2` — "(Three knocks and a rest. The kitchen wall knocked like that. So did the needle at the dig.)" —
  **[minor]** The kitchen wall in chapter 1 just "knocked", with no count of three. The motif is applied backwards.
  If it matters, put the three in `prh_tap_1`.
- `ob_read_2` — "Down and south. Under the project's station, under the dig. It runs under all of them, toward home." —
  good. It's the one moment the "three kicks" motif points somewhere.
- `c6_tree_hint`, `c6_gorge` etc. — clear.
- `c7_arthur_2` — "Gilbert's not on it." — see 4.3 (Arthur elsewhere says "Grandpa Gilbert").

## 10. Chapter 8 "Evacuation" (ch8.js, laneline.js)

**Works well.** The homecoming (`c8_ar_1` "Did you see the snow? Did you bring me snow?"), Gilbert's "Know them? I
dug them! Well, I carried the buckets.", Pippa's "Best business I ever didn't make.", the three farmers' one-liners,
and the lane thread (the cart that turns round at a shut gate, the people on paper but not on the road) are good,
grounded, and on theme. `ev_z_both` "So on paper the lane is picked up every round. On the road nobody stops." is the
game's theme in one line.

- The station yard and control room — **[major]** In chapter 3's end, the station is sealed: "The station gate is shut,
  and there are guards on the wall" (`c2_zoe_sealed`), "Nobody's getting past that fort's gate now anyway"
  (`c2_doran_sealed`). In chapter 8, Twinsen walks into the station yard to pull the shelter lever and into the control
  room to watch Vesk's broadcast, and no line acknowledges the gate, the guards or how he got in. *Direction:* one
  line ("The guards are gone. Every project hand is at the spaceport.").
- `c8_zoe_2` — "Yesterday Vesk switched off the heat posts…" — fine.
- `c8_zoe_lh2` — "The project uses this lighthouse as a relay to Zeelich's council!" — **[minor]** The exclamation
  reads like a plot point announced to the player. Also, Zoé broadcast from this lighthouse in chapter 3. Did she not
  notice then? "So that's why the council heard me" is the real beat. Fine, but it could be quieter.
- `c8_vesk_1` — "Somebody has been opening FunFrock's old vents." — **[minor]** The vents are older than FunFrock
  (`c4_ilka_3` "older than FunFrock"). See 7.
- `c8_tw_c2` — "Baldino's on Zeelich. The project ships fly there all day. I'll get on one." — **[minor]** He's not on
  the list, and the ships carry only the list. How does he board? See 6 (project vehicles).
- `c8_tw_z2` — "The shelters are open, Zoé. Gilbert's leading the town down. Mira's got water to them, Pippa's sending
  supplies." — **[minor]** Pure recap of what the player just did, said to someone who would know most of it.
- `c8_zoe_5` — "Joss, Bryn and Grull won't leave their animals for anyone but me." — good: it gives Zoé her own
  authority.

## 11. Chapter 9 "The Council" (ch9.js, cnline.js)

**Works well.** "This is Zeelich: nothing happens without a form." Nara's "She didn't sound like someone telling
stories." The clerk ("I don't make the rules. I file them."). The archive margin note "Integrity: not assessed." is a
strong, chilling detail. Councillor Brum's turn ("My cousin works on the bore. If it cracks the shell, he's at the
bottom of it.") is human. The cnline thread with Kell's service lift ("You got my cart up when nobody else would.") is
a good payoff of chapter 3.

- `cn_chair_stop` — "the Joint Project's bore is to be stopped. Now, not when it suits him." + `cn_chair_stop2`
  "Throw the stop yourself" — **[major, the biggest logic break]** In chapters 2–3, both sides agree that stopping the
  bore halfway cracks the shell: Vesk ("Stopping now would crack it faster than drilling on") and Baldino ("Stop it
  halfway and the shell cracks on its own. It has to be reversed"). Twinsen came to the council to have it
  **reversed** (`c9_tw_b1`, `c9_tw_c1`). Now the council orders it stopped, Baldino cheerfully watches the needles, and
  Twinsen throws the switch. Nobody, not even Vesk, says "you'll crack it". *Direction:* either (a) the council orders
  it reversed (as `c9_chair_3` in the non-thread text does) and the stop is something else, e.g. a safe "throttle to
  idle", or (b) someone says the danger out loud and decides it is worth it.
- `cn_tw_cab` — "Test 14. That was my hand on the cutoff." — fine if the digtest scene was played. `cn_tw_log` "I ran
  that test." — **[minor]** He pulled a lever for Dallan, he didn't run it. "I pulled the cutoff on that test" is more
  honest.
- `cn_order_1` — '"STANDING ORDER. Twinsen of Citadel is not to be admitted… A stop ordered before the Mill Lane bypass
  exists cuts that quarter's water. I will not have one ordered off a fright. V."' — **[minor]** Vesk writes a public
  notice explaining his reasoning about a bypass that the council would read. It works as a clue for the player but is
  odd as a notice on a door.
- `c9_tw_n1` — "If the bore goes through, the shell cracks. The cold comes in, here first." — **[major for stakes]**
  "The cold comes in"? The whole story is about heat. This is the only concrete consequence of a cracked shell anyone
  states, and it doesn't fit. *Direction:* decide what a crack does (quakes? boiling? the child wakes too early and
  takes the planet's heat?), and say it once, clearly, early.
- `c9_dallan_2` — "Hesk flew me up from Kesh, and nobody checks a foreman on a project ship." — **[minor]** Hesk's
  glider can't leave Twinsun ("Not into space, mind: she's a glider"). Read literally, Hesk flew him to Zeelich.
  "Hesk flew me to Citadel, and nobody checks a foreman on a project ship." is clearer.
- `c9_dallan_2` "foreman" vs `c9_dallan_3` "I was project security. I stood guard over that dig for a year." —
  **[minor]** Foreman or security? Two lines apart.
- `cn_bal_stop1` — "The drill's stopped. The kicks haven't. Twinsen, that isn't the drill any more. Something down
  there keeps the beat on its own." — good. It's the clearest "it's alive" moment in the knock thread.

## 12. Chapter 10 "Borrowed Time" (throttle.js)

**Works well.** Mira's call is urgent and concrete. Oren is genuinely eerie ("Sixty-one people in your two shelters.
Nine are lying down." / "Weight on the floors."), and Mira's "I hate that he's right" is good. Zoé walking back into
the office "by the door, this time", Vesk's tag ("It works… Do not fit. Log as returned. V."), and Vesk's "A station
that can say no will say no, the first day the town is frightened" are the best villain writing in the game.
Gilbert's "Then it's mine. I'll hold it." and Oren's "A hand gets tired. I do not." are a good exchange.

- `og_mira_office2` — "Every three seconds since the stop." — **[major]** This depends entirely on the cnline stop
  in chapter 9 landing as an event. Since the stop already contradicts the earlier rule (11), "the stop" here is
  confusing. Was the drill stopped? Why is the town worse off for it?
- `og_oren_2` / `og_oren_3` — "Oren. I keep water still where I can reach it." / "On Ballastra." — **[major for
  clarity]** Ballastra has never been named before, and neither has Oren. Who or what is he: a person, a machine, a
  spirit like Sendell? Nobody asks the obvious question. Twinsen says "Thank you, Oren. Really." to a voice in a pipe
  that knows how many people are lying down in a shelter, and he isn't even unsettled. *Direction:* let Twinsen or
  Mira react ("What are you?").
- `th_zoe_r2` "By the door, this time." vs `th_guard_1` "You again. Last time you came in by that door too, and I
  never saw you." — **[minor]** The two lines contradict each other ("this time" vs "too"). And in chapter 2 the guard
  could catch her (`c1_guard_spot`). *Direction:* "Last time you came in some other way, and I never saw you."
- Jargon: `th_sub_band`, `th_sub_feed`, flanges, governor, band, B-7, regulator, the "washroom line" — **[minor]**
  Dense plumbing vocabulary with little explanation. The player follows prompts rather than understanding.
- The three-day deadline (`c8_vesk_1` "Full depth in three days", `c9_tw_arrive` "Three days.") — **[major for
  pacing]** It is dropped. If the drill was stopped (11), the clock is gone and nothing replaces it, and Twinsen spends
  two chapters on Citadel's washroom and a harbour lift on another world.

## 13. Chapter 11 "Ballastra" (ballastra.js)

**Works well.** The harbour weighing ("Visitors are weighed. Harbour rule."), Tessa's chalk sign ("NOT IN A GOOD MOOD.
T."), Ferro's fish, the Water Gardens sharing puzzle (Corvin learning his "steady" water was taken from the gardens:
"I never asked where the steady came from"), and Dunn's "Mags, I am home! Bring the kettle!" are well written. As a
standalone episode about who gets water first, it is thematically on target.

- `bl_or_2` / `bl_or_3` — "When the council would not open it, they gave the lower row's young ones to me instead. To
  sleep, until the water settled." / "Safe. Three hundred and four. The water is settled now. They are still safe." —
  **[major]** This is a horror reveal: 304 children handed to a pipe-voice and put to sleep. Twinsen asks "Where are
  they?", gets "Safe", and the scene moves straight on to "Look at that. Dry steps on the lower row." Nobody reacts,
  and it never comes back in the game (I checked every later text file). As it stands this is the most disturbing
  line in the game, and it is left hanging. *Direction:* either pay it off (the next chapter) or cut it until that
  chapter exists.
- `bl_te_end2` / `bl_ba_1` / `bl_te_end4` — the House of Balances, "every Balance Works coil", "I'll draw the box. It
  will take me a while." — **[major]** Three setups with no payoff. The chapter's stated goal (find who makes the B-7,
  get one for every station) is never reached. The player leaves with a promise of "a while", and the next chapter
  (Network) doesn't use the regulators at all.
- Chapter card numbering: Ballastra is "Chapter 11", the next card is "Chapter 14: Baldino's Network" (the two
  unwritten chapters are skipped, story/index.js `NUMBER`) — **[major]** A player sees two chapters missing.
  *Direction:* number the cards from the chapters that actually play.
- `bl_doran_1` — "Vesk's freighter. Idle since the stop, so the council lent it to us." — fine, but "the stop" again.
  Also, how is Doran here? He was last seen losing a ferry on Desert Island.
- "Thirty-four years" (`bl_ma_1`, `bl_du_1`, `bl_du_2`, `bl_ha_steps`, `bl_or_1`) and "four days" (`bl_te_1`, `bl_qu_3`,
  `bl_sign`, `bl_te_done`, `bl_te_met`, `bl_fe_after`) — **[minor]** Every character repeats the same number. Once it's
  characterisation, six times it's a tic.
- `th_tw_exp1` — "One B-7. We'd need one at every station." vs `bl_tw_s3` "Our network needs one at every station.
  Forty, maybe." — **[minor]** Five stations (chapter 14), or forty? The numbers don't line up.
- `th_bal_end1` (in the base path: "The relays are built. All five, and four of them work.") vs chapter 14 starting
  from scratch with Baldino explaining the five stations — **[minor]** Check which line plays where; in the expanded
  path `th_bal_exp1` replaces it, but `c10_narr_exp` then re-explains everything.

## 14. Chapter 14 "Baldino's Network" (ch10.js, netline.js)

**Works well.** It's a rally of every friend made so far, which is the right shape for a penultimate act. Mira's
"You still have my key. Good.", Zoé's "Baldino's network channel is my old warning, with the star moved to the front."
(a puzzle that remembers itself), Pim holding the mirror, Dallan standing down a guard who "was on my roster for a
year", Arthur's "Station ready!". The radio roll call before the signal (`c10_radio_*`) is a good payoff moment.

- `c10_bal_1`–`c10_bal_3` + `c10_bal_pulse1/2` + `c10_bal_4` — **[major for pacing]** Another lecture: five stations,
  relays, power sources, the one-minute limit, then a new weapon. *Direction:* trim to "Five stations, five friends,
  one minute." Details on the journal page.
- `c10_bal_2` — "My relays: the test pair from my table, grown up." — **[minor]** The "test pair" is only known if
  the player poked around his workshop (an optional side thing).
- `c10_ilka_w2` "Vesk's men are coming out of the cabins" vs `c10_tw_stand` "(The clone and the sentry won't listen.
  They're FunFrock's machines, still keeping old orders.)" — **[major for clarity]** Men or machines? And "the clone"
  is introduced in Twinsen's head with a definite article as if we'd met it. Newcomers don't know FunFrock's clones.
- `nw_ar_2` — "Three, and a rest… and now there's four. Four, and a rest." / `nw_tw_ar` "Four? It was always three." —
  **[major for clarity]** The count changes, everyone times things to "the rest after four", and nobody says what the
  change means. Is she waking? Is it worse? Better? A player follows the instruction ("wait for the fourth knock")
  without knowing why it matters.
- `nw_ar_mic` — "This is Arthur, at home on Citadel. I heard the hum go quiet. Station ready!" — **[minor]** Arthur is
  at home, not at a station, so "Station ready" from the kitchen is odd. It's sweet if he's been made an honorary
  station. Have someone say so ("Arthur's our sixth station").
- `c10_hesk_1` — "Take the spaceship to Citadel… Not into space, mind: she's a glider." — good.
- `c10_all_1` — "Five lamps! All five!" — good.

## 15. Chapters 15–16 "The Shell" / "The Core", and the epilogue (ch3.js, answer.js)

**Works well.** Sendell's "She would keep all of you down here, warm, if I let her. Do not let anyone do that,
Twinsen. Not her, and not Vesk." is the best line in the late game: it makes the sleeping child a real character with
a will. The crystal growing shut behind Twinsen is a strong image. The finale's callback to the chapter-2 knock code
(`co_ar_two` "Mum! The kitchen pipe! Two! Twice for water, that's Dad!") is the emotional high point of the whole game
and should be kept whatever else changes. Vesk's "I kept the water running. Write that down too." / "It's written
down. Next to the rest." is an excellent end for him. The epilogue's "You said you'd be back for dinner." / "I am back
for dinner. Just not that one." / "Yes, yes, and no." is warm and earned.

- `c3_arrive` — "The lift stops at the bottom of the shaft. Overhead, the bore grinds on." — **[major]** In a new
  game, Twinsen stopped the drill in chapter 9 (`cn_stop_1` "The drill below Citadel winds down"). Then
  `co_lock_ok` "The drill's winding down" happens again at the core. When did it start again? Vesk restarting it would
  be a big beat, and it isn't shown.
- `co_tw_lane` — "Not the bore yet. Mill Lane still hangs on its line. Stop it now and Kell's cart drops again." —
  **[minor]** But Mill Lane was moved onto the mills by hand in chapter 14 (`nw_irsa_1`). Clear enough if you've
  followed everything, but a fragile thread to hang the final act on.
- `sh_two` / `sh_k3` / `sh_k4` / `sh_four` — "Three... and two. The two come from that damper." / "She answers my three
  the way she answers the shell. Two." / "Four is Arthur's count from up top. Down here she says two." / "Four. Slow.
  She's counting back at me." — **[major for clarity]** The knock language (three, four, two, rests, Arthur's count,
  the damper's count, her answer) is the climax's puzzle and its emotional core, and it is close to unreadable for a
  first-time player. I could not tell who "she" is in each line (the child? the damper? Sendell?), which count is
  "hers", or what knocking two "means". *Direction:* establish once, plainly, early in chapter 15: "Three is the shell
  under strain. Two is her answer. She's knocking back." Then keep every later line to that vocabulary.
- `c3_core_vesk2` — "Thirty percent was never a mistake. It's who I chose. Zeelich's upper districts will never be
  cold again, and the rest will learn to live with less." — **[major, character]** For most of the game Vesk is a hard
  pragmatist who believes the shell will crack anyway and saves "everyone who can be saved" (`c2_vesk_2`). Here he
  becomes a plain elitist after a power grab. The new motive contradicts his own earlier words, and the scenes that
  make him interesting (Irsa, Kell, the B-7 tag, the Mill Lane order) point the other way. *Direction:* keep his logic
  ("I chose the ones I could carry. You chose everyone, and you'll lose them all") rather than greed.
- `c3_vesk_over1` — "You think a sketch beats ten years of my work?" — **[minor]** "Ten years" fits Irsa's "kept us
  in water for ten years", but not Citadel's sense that the project just arrived (opening, chapter 2). The game should
  say once how long the project has existed.
- `c3_pylon_1` / `co_zoe_sig` — "Sun, wave, star. Just like last time!" — **[minor]** The network channel was "Star,
  sun, wave" (`c10_zoe_2`, "my old warning, with the star moved to the front"). The finale goes back to the original
  order. Players who solved that puzzle will notice.
- `c3_sendell_2` — "A child of this world. She is not ready to wake, and the drill has cracked her shell." — **[minor,
  payoff]** After fifteen chapters of "her", the answer is one line. It works because Sendell's later line about
  keeping people "warm" gives the child a personality, but the reveal itself could use a beat: what does Twinsen see?
- `ep_zoe_1` — "You said you'd be back for dinner." — **[minor]** Lovely bookend, but in the new tutorial flow the
  setup line (`pr_zoe_go` "And be back for dinner!") only plays if the player talks to Zoé again after the yard steps.
  Most players will never hear it. *Direction:* put "be back for dinner" in the film (`op_zoe_5`) or in `t2_zoe_done`.
- `ep_end_text` — "The bore still turns under the island, now as a shield run by both worlds." — fine, but "shield"
  still has no picture behind it (see 6).
- Epilogue idle lines (`idle_*_home`, `ep_*`) — **works well**. Dallan carrying water for Tarra ("She hasn't said she
  forgives me, and I haven't asked." / "It will take a great many jars.") is the best two-line exchange in the game.
  `idle_keeper_home` "The stars have gone quiet. That is how I know she sleeps." is good too.
- Missing from the epilogue: Oren, Tessa, Ballastra, the 304 sleepers, Irsa, Kell. **[major in the expanded
  campaign]** The Mill Lane people carried the finale and get no closing line.

## 16. Across the whole game

- **One voice for the side cast.** **[major for naturalness]** Reminder lines across chapters use the same
  telegraphic three-beat pattern: "Rope first. The pier, stranger." / "The oasis, the jar, the water. Then the
  shovel." / "Up the jib. The red latch." / "Corvin. Water Gardens. Glazed float. Go." / "The drill needle. The red
  mark. The lever." / "Up the stair, hook the chain, ring the bell." Kell, Irsa, Tessa, Oren, Hobb, Brel, Dallan and
  Halden all speak in short declaratives with no contractions. Give a few of them looser, chattier speech, and let
  some reminders be in-character asides instead of objective paraphrases.
- **Repeated tics.** Characters keep counting things ("I've counted. Twice." / "Three times." / "It took me a week" ×4
  / "four days" ×6 / "thirty-four years" ×5). Each is fine alone; together they flatten everyone into the same joke.
- **Twinsen narrates the screen.** **[minor]** Many bracketed lines describe what the player can already see ("(A
  pump room. Somebody eats lunch down here. Three pipes come out of the back wall.)", "(The cistern is full. Somebody
  below is filling a kettle.)"). Many are charming, but in later chapters the brackets carry most of the plot (the B-7
  fit, the Ballastra board), which makes him a narrator more than a person. His spoken lines often recap plot to
  someone who knows it (`c8_tw_z2`, `c2_tw_vesk1`).
- **Mira's running gag** ("my report will say the water office solved the crisis", `c1_mira_after`, `c1_mira_water`,
  `c8_mira_after`, `c3_pylon_2`, `ep_mira`) — **works**, and it's the right number of uses. Stop there.
- **Gilbert's refund** (`pr_gil_3`, `pr_gil_wait`, `idle_gilbert_observatory`, `c8_gil_1`, `ep_zoe_2`, `ep_gilbert`) —
  **works**, and the "My refund came. Two months' worth. I almost miss having something to complain about." payoff is
  good.
- **Lore for newcomers.** **[major]** Sendell, FunFrock, the Esmer, Zeelich vs Twinsun, Bù, the clones, Grobos,
  Spheros and Wannies are used without introduction. The ambient NPCs do some of this work (Pom on clones, Madam
  Rondo on the asylum), but only if the player happens to talk to them. A two-line caption at the start (the old
  `pr_intro_1` is a fine basis) and one line from Twinsen at Sendell's first word would cover the main gap.
- **Cast size.** Chapter 1 alone has about 20 named people (family, Gilbert, Mira, Xil, Doran, Pippa, Tim, Lulu, Pico,
  Dot, Oda, Brix, Maro, Tilde, Garrick, Marda, Joe, Bersimon, Hougo, Ker'aooc, Pom, Madam Rondo). The ambient lines are
  well written and give the town life, but the plot-relevant names (Mira, Gilbert, Xil, Doran) need clearer
  introductions to stand out (see 3, 4.1).

---

## 17. Top 15 issues (most important first)

1. **[major] The council orders the bore *stopped*, against the game's own rule.** `cn_chair_stop`, `cn_chair_stop2`,
   `cn_stop_1` vs `c1_conf_vesk4` and `c2_bal_4`. Chapters 2–3 say stopping halfway cracks the shell; chapter 9
   stops it and nobody objects. Then `c3_arrive` has the bore "grinding on" again with no explanation.
2. **[major] The core concepts are never made concrete.** What the shell is (`c2_bal_2`'s backwards "nut" image), what
   "reversing" the bore or "turning it into a shield" means (`c2_bal_4`, `c2_bal_vesk`), and what a crack would do
   (`c9_tw_n1` "The cold comes in"). The player can't picture the goal of the whole game.
3. **[major] The finale's knock language is unreadable for a first-time player.** `sh_two`, `sh_k3`, `sh_k4`, `sh_four`,
   `nw_ar_2`, `co_lock_slam`. Three, four, two, rests, "she": nobody states what the counts mean.
4. **[major] Ballastra's threads are left open.** `bl_or_2`/`bl_or_3` (304 children put "to sleep" by Oren) gets no
   reaction and is never mentioned again; the House of Balances, the coils and Tessa's box (`bl_te_end2`, `bl_ba_1`,
   `bl_te_end4`) go nowhere.
5. **[major] Chapter cards jump from 11 to 14** (Ballastra → Baldino's Network), because two unwritten chapters are
   skipped but keep their numbers.
6. **[major] Vesk's motive flips at the end.** `c3_core_vesk2` "It's who I chose. Zeelich's upper districts will
   never be cold again" contradicts `c2_vesk_2` and the nuanced Vesk of chapters 3, 9 and 10.
7. **[major] Sendell and the LBA lore are never introduced to a newcomer.** `pr_sendell_1`/`pr_tw_sendell`: the story's
   mystery hangs on a character the player has never been told about.
8. **[major] Vesk sends Twinsen to sneak past his own guards to open his own valves.** `c1_vesk_3`/`c1_vesk_4`, and
   `dw_radio_1` shows he could simply have radioed them.
9. **[major] Mira refuses to open a visibly dry public well because of "his pipes".** `pr_mira_no`. The chapter-1 gate
   doesn't survive a look at the well.
10. **[major] Xil's rope trade is never spoken.** `pr_xil_1` → `pr_tw_xil` → `pr_xil_4`: the rope-for-stamp deal
    lives only in the objective text.
11. **[major] Gilbert's relationship to the family is unclear.** "Grandpa Gilbert" (`c1_zoe_home3`, `c8_ar_2`) vs plain
    "Gilbert" from the same Arthur (`c7_arthur_2`) and from Zoé, and no family behaviour in chapter 1.
12. **[major] The heroes walk into the sealed, guarded fortress in chapter 8 without a word.** `c2_zoe_sealed`,
    `c2_doran_sealed` vs the shelter lever and the control room in chapter 8. Related: the heroes ride the project's
    own ships, ferry and freighter throughout without comment.
13. **[major] "Vents" are three different things.** Natural shell vents (`c4_ilka_c1`), the project's test bore
    (`c4_ilka_end`, `c5_ilka_1`), and "FunFrock's old vents" (`c8_vesk_1`). Plus the Dallan memo "Keep drilling" vs
    "stays capped" (`c4_dallan_note` vs `c4_dallan_2`).
14. **[major] Baldino's exposition dumps** (`c2_bal_2`–`c2_bal_7`, `c10_bal_1`–`c10_bal_4`), which mix cosmic
    revelation with shopping lists and lose the player at the two moments the plot most needs to land. Related: the
    side cast all speak in the same clipped three-beat reminders.
15. **[major/minor cluster] Small contradictions a careful player will catch:** `pr_locked` (the neighbours are "out"
    right after Zoé visited them); `c1_zoe_go` (Doran "at the spaceport" while he's at the harbour); `th_zoe_r2` vs
    `th_guard_1` ("this time" vs "too"); `c10_ilka_w2` vs `c10_tw_stand` (Vesk's men or FunFrock's clones?);
    `c3_pylon_1` "Sun, wave, star" after the network moved the star first; `ep_zoe_1`'s "back for dinner" bookend,
    whose setup line most players never hear; `prh_tw_cycle` ending chapter 1 on a pump right after Sendell speaks.

## 18. Lines worth protecting

- `op_zoe_2` "It worked yesterday." / `op_zoe_3` "That's warm. It's never warm."
- `pr_mira_kick` "That explains his pipes."
- `pr_xil_4` "You look like someone who climbs down a lot of holes."
- `c1_vesk_tour1` "FunFrock built this fortress to rule the island; we use it to heat it."
- `c1_zoe_gate3` "Don't worry. I raised Arthur. I know how to sneak."
- `ct_zoe_dry2` "twice for water, once for nothing" and its payoff `co_ar_two`.
- `zt_vesk_2` "We disagree about numbers, you and I. Not about water."
- `zt_irsa_5` "My pump pushes. Your strip is being pushed."
- `c5_ilka_k1` "Welcome to Kesh, Dallan. The water is free."
- `c7_sendell_2` "I have been holding the shell together with my own light. It is not enough any more. I am fading."
- `ev_z_both` "So on paper the lane is picked up every round. On the road nobody stops."
- `th_vesk_2` "A station that can say no will say no, the first day the town is frightened."
- `sh_sendell_keep` "She would keep all of you down here, warm, if I let her. Do not let anyone do that, Twinsen."
- `co_vesk_guard` / `co_guard_2` "I kept the water running. Write that down too." / "It's written down. Next to the rest."
- `ep_tw_1` "I am back for dinner. Just not that one."
- `idle_dallan_home` / `idle_tarra_home` (the water jars).
