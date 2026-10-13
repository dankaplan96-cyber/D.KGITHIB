# STORY BIBLE — LBA3: The Awakening

Unofficial fan continuation of Little Big Adventure 1–2. English only. Twelve years after LBA2.
Twinsen lives on Citadel Island with Zoé and their son Arthur. Twinsun and Zeelich trade and share research;
trust is still fragile. FunFrock is dead (his old fortress and pipeline remain). Sendell is good. Two suns:
no Earth-style night.

**The core conflict.** The Joint Project drills into Twinsun for heat. It really helps people (warm water,
light, a ferry that runs on light, jobs on Zeelich). It is also cracking the shell around a being Sendell
protects ("her"), which is waking too early. Vesk, the project's chief engineer, learns the danger, hides it,
and plans a selective evacuation instead of stopping. Stopping the drill now would crack the shell anyway.
The solution: turn the project's own installations into a stabilising shield, using parts and people the
player already knows.

Tension curve: familiar routine → strange fault → contradiction in the official explanation → personal
discovery → wider danger → confrontation → coordinated rescue → home.

## Chapters (12, about 10 hours)

Target: about 10 hours for a first-time player who talks to people and does some optional things (about
50 minutes per chapter; the epilogue is a short coda after chapter 12). Each chapter: what Twinsen wants ·
what the player knows / doesn't know · the turn · what the player does · the result. Status: ✅ playable ·
🔧 partial · ⬜ to build. Budget = target minutes for a first-time player.

| # | Chapter | Region | Budget | Status |
|---|---|---|---|---|
| 1 | The Well | Citadel Island | 35 | ✅ (was the prologue) |
| 2 | The Joint Project | Citadel Island | 55 | ✅ |
| 3 | Zeelich | Zeelich | 55 | ✅ (new ending: the shaft is sealed) |
| 4 | The Dig | Desert Island | 55 | ✅ (first version; tests/chapter4.mjs) |
| 5 | Steam and Sand | Desert Island | 50 | ✅ (first version; tests/chapter5.mjs) |
| 6 | The Pass | Hamalayi | 55 | ✅ (first version; tests/chapter6.mjs) |
| 7 | The Observatory | Hamalayi | 50 | ✅ (first version; tests/chapter7.mjs) |
| 8 | Evacuation | Citadel Island (changed) | 55 | ✅ (first version; tests/chapter8.mjs) |
| 9 | The Council | Zeelich upper districts | 50 | ⬜ |
| 10 | Baldino's Network | all regions | 55 | ⬜ |
| 11 | The Shell | the shaft, deep installation, galleries | 45 | 🔧 (rooms built) |
| 12 | The Core | Sendell's chamber, the core | 40 | 🔧 (core built) |
| — | Epilogue: Home | Citadel Island | 10 | ✅ |

Tension curve: familiar routine (1–2) → contradiction and a new world (3) → the danger is everywhere (4–7) →
the plan becomes real at home (8) → the other world's choice (9) → building the answer from everything learned
(10) → descent and resolution (11–12) → home.

### 1 — The Well ✅
- **Opening (in-engine scene, ~85 s, skippable):** the harbour in the morning: water against the pier, Doran's
  bow line pulling tight, the Joint Project's cargo lift unloading a crate from the project barge while a
  resident walks on to the ferry; one faint vibration ripples a puddle and shakes the lift's lantern — the lift
  keeps working. Home: Twinsen mends the reading lamp, Arthur fits the mast of his model boat, Zoé pots
  seedlings. Zoé's tap coughs and stops ("I fixed that yesterday." / "It worked yesterday."); Arthur: "Try the
  well. My boat needs water." The second try is a warm trickle. Twinsen: "I'll check the well." Zoé: "I'll ask
  next door." — she goes to the water office herself. Title, then control in the house. No exposition card, no
  Sendell, no Vesk; the warmth is the only hint.
- **Wants:** fix the well and be home for dinner. **Knows:** the tap stopped and ran warm; nothing about the
  project.
- **Does:** magic ball from the cupboard; settles Gilbert and Mira's row for the lid key; Doran stamps Xil's
  permit for a rope ladder; (optional) overhears Tim and Lulu about the warm stone; wakes three crystals.
- **Turn / result:** warm water, crystals, crystal mites, then Sendell: "Someone has reached her."

### 2 — The Joint Project ✅
- **Wants:** the town's water back. **Vesk is useful first:** the three bypass valves bring the water back
  (hot); the project's heat posts light every door. **Contradiction:** crystals in the station's pipes, "shell"
  readings called noise. **Zoé (playable):** finds the evacuation plan (30%). **Result:** Vesk leaves through
  the beam; Arthur's radio reaches Baldino; Doran sails the ferry to Zeelich.

### 3 — Zeelich ✅ (ending changes)
- **Wants:** reach Baldino, stop Vesk. **The other side:** Zeelich lives on the project. **Setback:** the plan
  is confiscated at the dock, recovered in the depot. **Revelation (Baldino):** the shell; stopping halfway
  cracks it. **Does:** mill cog, code cylinder, three mill brakes; Zoé tunes the lighthouse.
- **New ending:** the shield drops, Vesk descends and **seals the shaft** behind him (blast doors, a code only
  the bore's own network can open). Baldino: "We can't follow him, and we don't know enough to reverse a bore
  through a shell nobody has seen. The first crystals were dug up on Desert Island. Start there."

### 4 — The Dig ✅ (Desert Island)
- **Wants:** learn what the shell is. **Knows:** crystals came from a dig. **Doesn't know:** that the heat
  is leaking out of the whole planet, not only under Citadel.
- **Place:** a dry island of mesas and wind; a village around a dying oasis; the project's research post at an
  old excavation; FunFrock-era ruins half buried in sand.
- **People:** Professor Ilka (Rabbibunny geologist, found the first crystals, sacked by the project for asking
  questions); Hesk (Grobo caravan driver, sand-yacht); Mother Tarra (village elder); project foreman Dallan (the
  guard who confiscated the plan on Zeelich, now running the post: follows rules, hard but not cruel).
- **Does:** gets the oasis pump running again with Hesk (ball switches on the wind-pump, a sand-yacht ride);
  sneaks into the fenced dig at the time of the sandstorm (cover moves with the wind); in the dig's lowest
  trench finds carvings older than FunFrock: a map of the shell with **vents**, places where the planet
  breathes out heat.
- **Turn:** Ilka reads the carvings: the vents are closing because the project draws the heat to one point.
- **Result:** the shell needs its vents open. One is under this island, blocked by the project's test bore.

### 5 — Steam and Sand ✅ (Desert Island)
- **Wants:** open the desert vent. **Setback:** the test bore is pressurised; opening it badly would boil the
  oasis. Dallan seizes the ferry and orders everyone onto the project's evacuation list — the village is not on
  it.
- **Does:** reroutes steam through the old FunFrock condensers (a valve-and-pressure puzzle that grows from
  chapter 2's valves); a fight with project drones in the steam halls; the vent opens in a set piece (geysers,
  sand-yacht escape). Zoé (radio) reads the shell map Ilka sent to Citadel and finds the second vent: in the
  Hamalayi ice.
- **Result:** the oasis is saved and the village owes Twinsen; Dallan, stranded with them, starts to doubt.
  Hesk flies Twinsen north in an old FunFrock cargo glider (Baldino's spare parts; it can glide, not climb).

### 6 — The Pass ✅ (Hamalayi)
- **Wants:** reach the ice vent. **The world changes:** the ice is melting from below; villages are cut off
  by slides; meltwater floods the lower paths.
- **People:** Yorna (old Grobo mountain guide), Pim (her grandson, Arthur's age, wants to be useful); the
  village of Lhar.
- **Does:** the evacuation the plan ignores, made playable: guides villagers across the pass (escort, ice
  bridges raised with the ball, a rope-and-pulley lift); thaws a frozen winch with the project's own heat post;
  defends the column from ice mites.
- **Result:** Lhar is safe in the old monastery; Yorna knows the way to the vent, past the Observatory.

### 7 — The Observatory ✅ (Hamalayi)
- **Wants:** open the ice vent. **Revelation part 1:** the Observatory is an old Sendell shrine; Sendell speaks
  plainly for the first time — she has been holding the shell with her own light and is fading. "I cannot do
  this alone any more."
- **Does:** restores the Observatory's mirror array (light puzzle with the ball and rotating mirrors, sun
  positions — two suns); opens the ice vent in a race against the melt; a duel with a project heavy drone.
- **Result:** two vents open; the quakes ease for a while. Arthur's radio: Citadel is evacuating — the
  project's way.

### 8 — Evacuation ✅ (Citadel Island, changed)
- **Wants:** get everyone out, not 30%. **The familiar island changed:** queues at the harbour, the heat posts
  dark, the square fenced, the well steaming, people packing.
- **Does:** Zoé (playable) and Twinsen split up: Zoé gets the hill families to the lighthouse cliffs with Doran's
  fishing boats; Twinsen opens the old FunFrock tunnels as shelters (the fortress, the depot), deals with the
  project's crowd-control drones, and convinces Gilbert, Mira and Pippa to help (each one's local problem pays
  off). Vesk's message from below: he will finish the bore in three days.
- **Result:** the island is safe without the project's list. Mira finds the old valve-control room; Zoé finds
  that the lighthouse signal reaches Zeelich's council chamber.

### 9 — The Council ⬜ (Zeelich upper districts)
- **Wants:** Zeelich's council to order the bore reversed. **The other world's choice:** the council fears
  the cold if the project stops; Nara and Oku speak for Twinsen; Dallan arrives with Ilka's proof.
- **Does:** reaches the upper districts (cloud lifts, Esmer bureaucracy as comedy and puzzle); gets into the
  project HQ archive for the bore's master plans (stealth, disguise as a technician); presents the proof.
- **Turn:** the council agrees, but only Vesk's console in the core can switch the bore; and the shaft code
  must come from all the project's stations at once — Baldino's network.
- **Result:** permission and the plans; Baldino starts building.

### 10 — Baldino's Network ⬜ (all regions)
- **Wants:** build the network from parts and people the player knows. **Does:** a chapter of five tasks in
  any order, each in a region already visited and each using a mechanic learned there: Citadel (Mira's valves,
  water to cool the emitter), Zeelich (Oku's mills released), the lighthouse (Zoé's sun–wave–star signal),
  Desert Island (Ilka and Dallan hold the vent open), Hamalayi (Yorna and Pim keep the mirror array aimed).
  Baldino's inventions have limits: the relay radio needs line of sight, the coupler overheats.
- **Result:** all stations online; the shaft code opens the blast doors.

### 11 — The Shell 🔧 (rooms built)
- **Wants:** reach the core. **Does:** the shaft, the deep installation (cooling valves, ladder, drone), the
  crystal galleries (pillars, stones). **Result:** Sendell's chamber.

### 12 — The Core 🔧
- **Revelation part 2 (Sendell):** "She" is young and not ready; turning off is not enough; push the other way.
- **Does:** the core: five pylons (one per station) by bank shots while the guardian fights; the allies answer by
  radio in turn. **Vesk's turn:** he sees the field work, makes the final switch himself and stays to run it.
- **Result:** the shell holds. → Epilogue: dinner at home, free roam.

## Cast (for writing; not shown to the player)

| Character | Wants | Fears / avoids | Knows | Helps / obstructs | Changes |
|---|---|---|---|---|---|
| **Twinsen** | a quiet life; to help | being a legend people wait for | the world's history; not the science | the player | from fixing a well to saving two worlds, still practical |
| **Zoé** | the truth; family safe | being told to stay home | town gossip, how to sneak | finds the plan, broadcasts the warning, playable twice | from worried to the one who moves the island |
| **Arthur** | to be included | being treated as a baby | radios, kids' secrets | fixes the radio, relays in the finale | gets his real job, not a chosen-one moment |
| **Baldino** | to build the thing that works | being ignored | the shell, machines | inventions with limits (override key; the network) | proves the reversal works |
| **Vesk** | to save both worlds his way | chaos, being wrong | the readings | useful (valves, water, ferry), then obstructs (link cut, guards, evacuation) | sees the field work, makes the final switch, accepts consequences |
| **Sendell** | to protect "her" | waking her too soon | everything below | warnings, then the plain truth | asks for help instead of saving everyone |
| **Doran** | to sleep, to sail | fuss | the sea, the ferry | stamp, the ferry to Zeelich | sails into the unknown |
| **Mira** | rules followed, credit for the office | blame | every pipe on the island | lid key, valve map, opens the valves in the finale | from bureaucrat to hero of the report |
| **Gilbert** | his water and his refund | being cheated | old FunFrock days | grumbles, local history | gets his water (and refund) |
| **Xil** | his cargo moved | missing business | the project's cargo | rope ladder, gossip about Vesk | — |
| **Pippa** | to sell | running out of stock | what people are buying | shop; stock changes with events (clovers before the evacuation) | — |
| **Tim / Lulu** | adventure without trouble | Tim's mum | the glowing stones on the beach | the crystal clue | — |
| **Nara** | business is good | the project leaving | street gossip | directions; changes her mind when she sees the plan | — |
| **Oku** | the old wind back | forgetting | mills and old Zeelich | mill brakes; releases them in the finale | — |

## Writing rules
Natural English, one or two sentences per turn, longer only for big moments. Concrete details, requests and
reactions; humour from character, bureaucracy and everyday trouble. No "your destiny awaits", "an ancient
darkness awakens", "the journey has only begun". Mystery is not vagueness: the player always knows the current
goal. Important scenes are played, not narrated.

## Established facts (do not contradict)
- The well dried up because the project diverted the groundwater; three FunFrock-era bypass valves restore it.
- The ferry runs on light; Doran can sail it; Baldino sent the start code.
- The evacuation plan: Citadel town centre and Zeelich upper districts; ferry capacity 30%.
- Zoé's lighthouse dials: sun, wave, star.
- The platform shield is fed by Zeelich's three mills; the override key = old mill cog + project code cylinder.
- Vesk crossed to Zeelich through the beam pad at the station and cut the link.

## Open questions
- The being's name (Sendell only says "her"). Keep it unnamed unless a scene needs a name.
- Desert Island and the Hamalayi carry chapters 4–7 (decided for the 12-chapter version).

### The Dino-Fly
Twinsen's friend from LBA2, twelve years older. Too old now to carry the family over the sea (so they take the
ferry), he naps in the garden north of Twinsen's house, follows Twinsen with his eyes, stretches his wings now
and then, and rumbles when Twinsen talks to him. No flying in this game.
