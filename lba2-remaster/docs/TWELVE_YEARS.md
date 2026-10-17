# Twelve years on — how the world shows the time since LBA2

Goal: a familiar world that kept living. People grew older, families changed, buildings found new uses, and the
earlier adventures left visible traces. This file records what each addition is based on, so invented details
are never presented as the originals' canon.

## Sources: what is history, what is ours

| Kind | Examples | Where it is recorded |
|---|---|---|
| **Established by LBA1/LBA2** (checked against the originals and the reference notes) | Twinsen; Zoé; Citadel Island with its town, harbour and lighthouse; Desert Island; the Hamalayi; Zeelich and the Esmers; Grobos, Rabbibunnies, Quetches, Spheros; the Dino-Fly; Joe the Elf; the Weather Wizard; the School of Magic; the Temple of Bù; the magic ball; Sendell; FunFrock (dead) and his fortress; the Esmers' round shuttles | docs/LBA2_SOURCE_NOTES.md, docs/LBA1_CATALOGUE.md, WORLD_MAP.md (the "In the original" column) |
| **Approved for this sequel** (STORY_BIBLE.md, before this pass) | Arthur, their son; the Joint Project, its heat posts, its ferry and Vesk; Mira and Gilbert's water office; Doran, Xil, Pippa, Tim, Lulu; Baldino's network; the 30% evacuation plan; Zoé finds the plan; Citadel Spaceport and Zeelich's islands | STORY_BIBLE.md |
| **New in this pass** (proposed developments for the twelve-year gap) | Zoé keeps the Water Office's connection register; Bram and the lane's old pump; Officer Odile and the harbour's customs booth; Nell's repair shop for imported machines; Xil's mislabelled crate; the family's corners in the house | this file, src/game/story/life.js |
| **New in the second set** (Baldino's workshop) | Ilo, an Esmer engineer at the shuttle yard (named, not seen); Baldino's test pair of bench relays; his old hoist; the stove fan with three odd blades; the tea-by-coupler experiment; the thunder box (the pulse tool of chapter 10 before it was ready) | this file, src/game/workshoplife.js, src/game/story/workshop.js |
| **New in the third set** (Desert Island: Kesh) | Kesh's cool room in one of FunFrock's concrete blockhouses, with a wind-catcher Kesh built on it; Lumi's loom, her shade sail, the cool room's curtain and sand screen (her work); the reed sand screens on the village's windward side; Hesk's flag poles along the sand-yacht routes and his yacht stop; the drift over the track to the dig | this file, src/game/keshlife.js, src/game/story/kesh.js |
| **ZL-ALL / CONNECT** (all of Zeelich, the travel network) | From the user's LBA2 files, numbers only: the Lift Dock (ASCENCE, a cargo lift dock at Zeelich's cloud line) and Celebration's later state (CELEBRA2: the great figure risen from its pit). **New invention** (ours, not LBA2): Tralu Rock, an Esmer trading post; the Nectar Orchard and its cloud-catcher; the Old Watch, a ruined watchtower with a telescope; Zeelich Spaceport (the terminal island's deck for the spaceship to Citadel); the glider fields on Citadel's plateau and Desert Island's beach; the ferry stops' boards | this file ("Zeelich, all of it"), WORLD_MAP.md, src/game/zplaces.js, src/game/travel.js |
| **New in the fourth set** (Zeelich's street) | the old watch house (older than the council, its crest chiselled off) as Mother Snuff's bakery; her oven on the project's heat, its heat box and safety cut-out; the heat posts lit at the bakery, the council house and the depot, dark with CONNECTION NEXT QUARTER at the west end; the moles' burrow hatch and its warm vent; Mr Pelleck's dome re-tiled with his wages from the depot's books; Bzizz landing his nectar crates on the watch house roof; Nara's flowers crated for Citadel; Tavo carrying rolls to the depot | this file, src/game/zeelife.js, src/game/story/zeelife.js |

Nothing new claims anything about the originals' characters beyond what the originals show. Baldino himself is
LBA2's (an old Grobo inventor with a workshop; docs/LBA2_VISUAL_NOTES.md). That his workshop is now on Zeelich is
this sequel's (STORY_BIBLE.md); no line says when he moved or which LBA2 machines he built, and every invention in
the room is ours. The house's old
travel trunk only says it has stickers from Desert Island and Zeelich (places Twinsen visited in LBA2). No
statement about Twinsen's parents, Zoé's past, or LBA2's ending is made.

## What changed, and what the player can do (first set: home → neighbourhood → harbour; second set: Baldino's workshop)

Each entry: what changed over the twelve years · why · who gains or loses · what the player sees · what the
player can do · what stays different afterwards.

### Twinsen and Zoé's house (src/game/homelife.js)
- **Zoé's work corner** (reading room). She keeps the Water Office's connection register: which houses get
  the project's heat next. Why: the project arrived, and somebody had to decide the order. Bug Street gains;
  the harbour row waits. Sees: a desk with ledgers and a board of the island with green and red pins. Does:
  looks (one short line). After: the board reads differently once the heat is on, and again after Zoé finds
  Vesk's plan (the red pins are exactly the houses the plan leaves out). This is how her everyday work gives her
  the knowledge, and the reason to look, before the reveal.
- **Arthur's workbench** (his room). His own interest: boats (he already builds a model boat in the opening).
  A paddle boat "to beat Lulu's", a note "rudder needs pin (pliers?)". His mistake: he borrowed Twinsen's pliers
  and left them in his boat box. Limited consequence: Twinsen can't free the pump's valve pin until he finds
  them. Arthur admits it when asked.
- **The old travel trunk** (hall): stickers from Desert Island and Zeelich; it holds seed packets now.
- **The mend box** by the door: a neighbour's kettle and the baker's scales, mended, waiting to go back.
  Twinsen still fixes ordinary things for the street.
- **The heat meter** where the project's line comes in: before the connection it waits on Zoé's list (needle at
  rest, no note); after it, the needle is up and Zoé's note says it jumps when the ground hums (she noticed first).
  Zoé's board changes with it: every pin red before the heat; Bug Street green and the harbour row red after; once
  she has seen Vesk's plan, the harbour row ringed in her chalk with a question mark.
- A chair mended with a paler new leg; an Esmer brass lamp from the trade on the hall table.

### The neighbourhood: The Old Pump (src/game/townlife.js, story/life.js)
- Changed: the project's new copper heat pipe runs along the lane past the old hand pump, and the pump seized
  when they dug. Why: the pipe is the future; the pump looks like the past. Bram (an old Grobo, new) wants it
  kept; Mira's figures say it is pointless.
- Sees: the pump on a stone plinth with a dry trough, the new pipe on low stands right beside it (it dives under the
  ground where the pump's footpath crosses it: fresh earth there), Bram's sign across the footpath. The handle points
  to the lane: Twinsen works it side-on to anyone coming along the lane, both hands on its crossbar. Asked from any
  side of the pump, he walks round to the handle (0.26.1).
- Does: talks to Bram; the valve pin needs pliers (Arthur has them); takes them from Arthur's boat box (from chapter
  2: in the prologue the box is only looked at); frees the pin; works the handle (three strokes). Either order works
  (pliers first, Bram later).
- After: water runs into the trough; a drink there restores life; Bram gives a clover. In the evacuation, with
  the project's posts dark, the pump is the lane's water and Bram's lines say so.

### The harbour: trade between two worlds and The Mislabelled Shipment
- Changed: Esmer shuttle traffic and the ferry made the harbour a trading quay. New: a modest customs booth
  (Officer Odile, a Rabbibunny, new), cargo from both worlds (Esmer crates, Mosquibee honey jars beside the
  project's crates and Twinsun barrels), and Nell's repair shop for imported machines (Nell, a young Quetch,
  new): Esmer engines are wonderful, spare parts take three weeks by shuttle.
- The situation: Xil shipped a crate from Zeelich for Nell (she had asked him to find her a coupler; it's a deal
  between them). Customs holds it because Zeelich's form calls it "SOUP POT (1)", and soup pots don't hum.
- Does: Odile asks what it really is; Twinsen opens it (a heat coupler); Nell knows it at once (Xil was getting her
  one; her engine has waited a month); on the bench it runs and heats; when it glows it has to be taken off and
  cooled in the water barrel before it trips; set back, it settles. Odile files it as machinery for Nell's Repairs
  and clears its papers.
- After: Nell's engine runs (fan turning, lamp lit), the crate's tag reads CLEARED and its rope comes down; with the
  papers cleared the coupler is properly hers, and Nell gives Twinsen part of what she owes Xil for it ("he'd want
  you to have it"). Her shop stands on the grass where the harbour path reaches the quay, open toward the path. The mechanic it teaches — couplers overheat and need water — is why Baldino's
  network in chapter 10 runs without them.
- Fame, varied: Odile pictured him taller, with a cape; Nell knows him as "Arthur's dad" (who owes her a
  sprocket); Bram is fond of him and asks for help at an inconvenient moment.
- The project, before its dangers: Nell says the harbour row's heat posts trip when the ground hums and the
  project blames the salt air; Bram says Mira trusts the figures.

### Baldino's workshop (second set; src/game/workshoplife.js, story/workshop.js)
- **What changed:** the room shows years of work, not one project. His **relay table** (the active project, laid
  out in order): two bench relays of the kind he builds for the network in chapter 10, one heat coupler under a
  drip can, a lever, a SYNC strip of five lamps, trays of masts, coils and lamps, a drawing of the relay housing in
  two hands. His **old hoist** (an A-frame by the flying machine's nose; "older than Arthur", it still lifts every
  engine). The **stove fan**, mended so often its three blades are brass, wood and tin. The **failed experiment**: a
  kettle wired to a coupler boiled dry; the lid is stuck in the vault, tea is up the wall, a note says "TEA: BY
  HAND". The **thunder box** on top of the curio shelf, stopping a toy mill for three seconds, then needing ten to
  recover. **Ilo's perch** (an Esmer seat) at the drafting board and a crate of parts stencilled "SHUTTLE YARD,
  return to Ilo".
- **Why:** Zeelich's trade (the harbour's story) means Esmer engineers and spare parts; Baldino builds with them.
  The network in chapter 10 should be technology the player has met, with limits learned early, not a gadget that
  appears when needed: the relays and couplers are on his table in chapter 3, the pulse tool is on his shelf.
- **Who gains or loses:** Baldino gets help and parts (and owes Ilo's patience); Ilo gets his opinions; his tea
  lost. Twinsen gets half the shuttle yard's test fee.
- **What the player sees:** the things above, each where it is used; Baldino's lines when he has nothing pressing,
  one at a time and different each time (the hoist, Ilo, the fan's blades, the radio's seven repairs, Esmers who
  knock and wait, "never trust a quiet coupler"). Short looks at the fan, the thunder box, the tea experiment and
  the crate, with a word from Baldino when he's there.
- **What the player can do — The Test Pair (optional, chapter 3 "Zeelich"):** Baldino mentions it the first time
  Twinsen talks to him with nothing to collect (or Twinsen reads the lever's tag). The lever starts the pair; the
  second relay hangs low from the hoist behind the flying machine's nose, can't see the first, and blinks (relays
  talk by sight). Cranking the hoist raises it clear. With the drip tap shut the coupler glows and trips after a
  few seconds (couplers overheat; switch on again to retry). With the tap open it runs cool, the pair holds for ten
  seconds, the five lamps fill, and Baldino tosses Twinsen a coin worth five kashes (half the yard's fee; from his
  fee tin when he isn't there). Any order works; nothing on the main path needs it; a save made with the pair
  running comes back with it off (hoist and tap as they were).
- **What stays different afterwards:** the pair keeps talking (both lamps, a beam between them over the flying
  machine, the SYNC lamps lit, the relay up, the drip running); the journal keeps the two rules. In chapter 10
  Baldino calls the network's relays the test pair grown up: each hooks into a station's old machine and talks
  through it (so no sight lines: the Citadel relay sits on the manifold in the valve room underground, the dome's
  beside the telescope), each runs on local power with a friend standing by, and there are no couplers to trip: the
  friend at each station keeps the power steady instead (0.26.1, REV-TY-3 N1). Once Twinsen carries the pulse tool, the thunder
  box's place on the shelf is empty.
- **Rules of the pair (0.25.1):** it can only be started after Baldino's "At last!"; it only syncs with the drip
  open (shut mid-sync, the sync starts over and the coupler trips); a press at the lever, tap or crank in its last
  moment does nothing once it has succeeded.
- **Limits, honestly:** chapter 10's stations don't yet make line of sight playable (they need power from where
  they stand and a friend standing by); the rule is taught and remembered, not yet tested there.

### Desert Island: Kesh (third set; src/game/keshlife.js, story/kesh.js)
History vs ours: Desert Island and the School of Magic are LBA2's; Kesh, its people (Mother Tarra, Brosk, Lumi, Sani,
Hesk), the research post, the dig and FunFrock's buried condenser hall are this sequel's (STORY_BIBLE.md, chapters 4–5).
Everything below is a proposed development of this pass. That FunFrock built blockhouses on the island follows from
the sequel's own condenser hall, not from LBA2. Nothing establishes when or why he built them; Brosk's "FunFrock
built that blockhouse to keep us out" is a character's opinion (a villager's grudge), not established history.

- **Reused building — the cool room.** One of FunFrock's concrete blockhouses at the village's west edge, by the shore,
  half under a dune (stencil "F-17", a rusted shutter over a slit window). Kesh dug its door out of the sand (spoil
  heaps, a shovel, planks still there), plastered a parapet on it, hung a curtain in the door and built a
  **wind-catcher** on the roof: an adobe tower with a timber cowl on a turning ring, a crank at its foot, the breeze
  sent down through the thick walls. Why: concrete half under sand is the coolest room on the island. Owner and use:
  the village's — water jars on the shelf by the door, under the porch awning, in the door's draught (Mother Tarra's
  rule); Lumi's dyed wool inside; Brosk's date baskets join the jars under the shelf once it draws. The lines say
  "on the shelf" for the jars and "inside" only for what is not shown. An outside stair up the east wall to the roof. Who gains: everyone in a heat that never sets (no Earth-style night).
- **Practical adaptations.** Reed **sand screens** on the village's windward (west) side with the sand banked on
  them; Lumi's **loom under a striped shade sail** (she works there; she wove the sails, the screens, the curtain);
  lidded jars in the shade. The wind is readable everywhere: the dunes' crests, the wind-pump's wheel facing it,
  the rags on Hesk's poles streaming away from it, and at the cool room itself a striped windsock on the roof's
  north-west corner (wide mouth into the wind) and a rag on the porch's east pole.
- **Altered transport.** Hesk's **flag poles** along the sand-yacht's routes to Ilka's camp (west of the track) and
  the dig (north of it), clear of every line the yacht rides out and back (every storm buries the track: a drift lies
  across the dig route and the poles carry on over it), and his **yacht stop** by the berth (YACHT STOP · CAMP · DIG ·
  KESH · FERRY: AT THE PIER). Once the project takes the ferry (chapter 5) the ferry line is chalked out and a slate
  hangs under the board: NO FERRY, ask Hesk. The Esmers' shuttles still circle Bald Mountain (as before).
- **Excavation.** The project's dig (chapter 4) beside Kesh's own: the village dug its cool room out of the dune.

**The Wind-Catcher** (optional; from chapter 4 on, whenever Twinsen is on the island; nothing on the main path needs
it). The last storm turned the cowl away from the wind and tore its screen: the room is stuffy and the water warm.
- Learned from Brosk (minding the stall; he says the storm tore Lumi's screen off it), a look at the door, or Lumi.
  Sani says how to read the wind; the windsock on the roof shows it too. The door's hint and Brosk follow how the
  cowl stands: the wrong way, into the wind with no screen (the screen is missing), or the screen on but the wrong way.
- Lumi wove a new screen. Before the pump runs (chapter 4) she won't hand her work to someone off the project's ferry
  (Kesh's distrust, as in chapter 4); after it she does — the relationship changes with the main story.
- On the roof the crank turns the cowl a quarter at a time (it starts facing east). Mouth into the wind (west) with
  the screen: the room draws. Into the wind without it: sand pours down into the room (Brosk: "In my dates!") —
  fitting the screen then finishes it. Screen first or turn first both work.
- Readable from the roof whichever way the camera looks: Lumi's screen shows as a striped hem over the lid and two
  tails down the cowl's back; with sand, sand streams into the mouth over the lid and blows out of the door past the
  awning (a heap and a tongue of sand by the door); once it draws, pale motes drift out of the door.
- After: the curtain lifts, the streamer at the mouth streams in, Brosk's dates move under the shelf, Sani plays in
  the doorway, a drink from the jars restores life, Brosk pays five kashes (one coin, owed until picked up). The
  cowl is tied off; the journal keeps it.
- Lines follow the main story: two jars left before the pump, five after; in chapter 5 the steam could boil the
  oasis (the jars would be all Kesh has); after the vent the ground is quiet and Dallan buys a cold drink.
- Chapter 5's errand with Brosk (the jar and the shovel) always comes first; Mother Tarra and Hesk keep their chapter
  lines. Save/Continue in any state (cowl direction, sand, screen carried or fitted, the coin owed).

### Zeelich's street (fourth set; src/game/zeelife.js, story/zeelife.js)
History vs ours: Zeelich, its Esmers, Mosquibees, moles and triangle-headed townsfolk are LBA2's (docs/LBA2_MEASUREMENTS.md,
STORY_BIBLE.md "Peoples of Zeelich"); the street's people by name (Nara, Oku, Bzizz, Madam Zuzzara, Old Grumm, Mother
Snuff, Mr Pelleck, Tavo), the council and the Joint Project are this sequel's. The reference notes show that LBA2's
Zeelich had a palace (docs/LBA2_VISUAL_NOTES.md, #19) but name no rulers and give no history of them, so nothing here
names a ruler, a date or what happened to them: the watch house is only "older than the council", and somebody
chiselled its crest off. Everything below is a proposed development of this pass.

- **Reused building — the old watch house** (north side of the street's east end): a squat tower of dark lilac
  ashlar, battered plinth, corbels and merlons, slit windows, a heavy door, the crest above it chiselled to a blank
  shield. Owner and use: **Mother Snuff** (a mole) bakes the street's bread in it. The guards' window is her bread
  hatch (a counter, a teal-striped awning, SNUFF'S BREAD painted above, a slate: OVEN COLD / FRESH BREAD). Its flat
  roof, the old lookout, is **Bzizz's** landing stage for nectar crates; the guards' stair still climbs the west wall.
- **The project's real benefits, unequally shared.** Snuff's oven runs on the project's heat (a copper feed from the
  depot, under the street through fresh cobbles, to a teal heat box with a lamp): she sold her charcoal cart and her
  bread is a third cheaper. Heat posts after Citadel's: lit at the bakery, the council house (the upper district's door)
  and the depot gate; dark at the west end — Mr Pelleck's house, the south-west house and the moles' burrow — each with
  a tag, CONNECTION NEXT QUARTER. Jobs: Mr Pelleck keeps the depot's books, Tavo carries rolls to the depot, his cousin
  works on the platform. Traffic: the project's heat makes the flowers bloom twice (Bzizz flies twice as much); in
  chapter 3 Nara's cloud flowers wait by the shuttle pad, crated for Citadel and HELD (the project grounds the shuttles
  and its ferry takes project cargo first); from chapter 4 they are gone, and Xil sells them on at Citadel's harbour.
- **Rebuilding.** Mr Pelleck's dome is being re-tiled from the bottom up: scaffold, a pulley and a bucket, a ladder,
  tile stacks, the lower half in new blue tiles ("they don't make the old violet any more"), a band of bare mortar,
  the old violet above.
- **The moles' burrow hatch** by the market: a round plank lid in a stone collar and a vent pot breathing warm air.
  Old Grumm stands by it. Up top they wait for heat; down below they open the vents (the bore's heat, chapter 3's
  danger, seen as a neighbour's complaint).
- **Opinions, not one:** Snuff (for it: cheaper bread, but "if the council stops the bore, I'll want my cart back"),
  Bzizz (for it: twice the flowers), Mr Pelleck (for it: wages, tiles, forms filed twice), Tavo (a job), Nara (for it:
  customers), Old Grumm (against: the burrows sweat), Oku (against: new sails on his mills, but they turn for a drill),
  Madam Zuzzara (the ground is wrong; her old lines).

**The Second Bake** (optional; from chapter 3 on, whenever Twinsen is on Zeelich; nothing on the main path needs it).
Snuff's oven is cold: the heat box has shut itself off because the flue can't breathe — Bzizz left a crate on it (the
depot hasn't signed for it, and unsigned crates stay on the stage).
- Learned from Snuff, the heat box's red lamp (SAFETY CUT-OUT. RESETS WHEN THE FLUE DRAWS) or the hatch; Bzizz says the
  crate stays put.
- Two ways: up the guards' stair, a **shove** moves the crate off the flue onto the stage (Bzizz: "That was a flue?");
  or the **magic ball** from the street knocks it off the roof — it breaks on the grass, nectar everywhere ("The depot
  can sign for a puddle"). Any order: talking first or not at all.
- After: the heat box clicks green, the hatch glows, loaves on the counter, the slate says FRESH BREAD, the flue
  breathes, Tavo comes for the rolls. Snuff pays five kashes (one coin, owed until picked up); a roll at the hatch
  restores life.
- Lines follow the main story: chapter 3 before and after the shield drops, chapters 4–8, the council (who buys the
  bread, who pays the tilers if the bore stops; the moles say stop), the network (do shields bake bread?). Chapters 3,
  9 and 10 keep their own lines for Nara and Oku; theirs here are for chapters 4–8 and after. Asked again before the
  bake is done, Snuff and Bzizz give that phase's news first, then the crate (0.28.1, REV-TY-5 D3).
- Each way keeps its own words (0.28.1, REV-TY-5 D1): on the roof the heat box clicks "somewhere below"; from the
  street Twinsen sees its lamp turn green, and Snuff, never asked, asks about his ball, not her roof (also after a
  Continue from a save made while the crate fell). Snuff is talked to from the street only: nobody offers Talk to a
  person well below Twinsen (a roof, a ledge; src/main.js TALK_ABOVE), so her first talk, which points to the
  stair, never plays on her roof (D2).
- Save/Continue in any state (crate on the flue, on the stage, broken; the coin owed).
- **Chapter 10, not done here** (another developer owns network.js/ch10.js): Oku's or Baldino's network lines could
  recall the bakery's heat box (a safety cut-out that resets when the air flows) — suggested, not implemented.

### Zeelich, all of it, and the way between the worlds (ZL-ALL, CONNECT; src/game/zislands.js, zplaces.js, travel.js)
- **From the original (numbers only, tools/lba2-islands.py).** The original's island files were identified from their
  numbers (SCENE.HQR's scenes name an island and a start point; each start fits one file's ground or decks): CITABAU
  is Citadel again (same ground, more objects; Twinsun, not used), EMERAUDE and MOON are the Emerald Moon twice (not
  wanted), CELEBRA2 is Celebration Island later, ASCENCE is a Zeelich place of its own.
  - **The Lift Dock** (ASCENCE): decks on stilts at the cloud line, an 11 m lift tower, a crane over the east deck,
    crates stacked, a big hull moored alongside. Ours on it: the shuttle's landing deck, two stairs up to the upper
    deck, rails along every open edge, the tower's working cage going up and down with cargo, cloud skiffs.
  - **Celebration Island** keeps the original's ground (the later state's pit leaves only a rim to walk on) and gains
    the later state's great figure: twelve years on it still stands, the pit round its feet filled and paved; the
    island holds its festival there, masts round it, garlands and lanterns hung up to it. The figure itself is ours
    (a robed, hooded stone figure with a glowing face), standing where the original's numbers put it.
- **New invention (ours, not LBA2)** — each with a landmark, a reason to visit and a find (a giver):
  - **Tralu Rock**, an Esmer trading post: a market round a great brass weigh-beam on the rock's crown, a crane over
    the cliff lowering goods to the quay shelf below, cloud skiffs tied up there, a ramp curving round the south face
    between them. The traders' crates hide a few kashes.
  - **The Nectar Orchard**: a broad round hill of blossom trees in rows along its contours, hives among them, a press
    house and its nectar press at the foot, and on the crown a cloud-catcher — nets on poles combing water out of the
    passing cloud into a cistern for the trees. The press gives a heart.
  - **The Old Watch**: a crescent ridge over the clouds with the broken watchtower of the old guard (older than the
    council; its dome lies fallen beside it), toppled columns and wall blocks along the crest, and an old telescope on
    the south horn looking out. A bit of magic lies by the telescope.
- **Zeelich is another planet.** Twelve years on the Esmers' shuttles are local traffic between Zeelich's islands;
  the crossing to Twinsun is a spaceship between Citadel Spaceport and **Zeelich Spaceport** (ours: a deck off the
  terminal island's south shore, a footbridge, the larger craft on its pad, a board). On Twinsun the ferry runs from
  Citadel's harbour to Desert Island's pier (not while the project holds the ferry in chapter 5), and gliders fly
  between the fields on Citadel's plateau, Desert Island's beach and the Hamalayi foothills (ours: the fields, their
  windsocks, rings and boards). Each route opens with the chapter that first goes there.

## Not yet done (next, in the brief's order)
1. The Hamalayi's own twelve-year changes (see WORLD_MAP.md: what exists there now).
2. More Citadel: the Workshop Successor or the Familiar Shortcut, only where they fit.

## Rules kept
English only, short lines. No Earth-style night (routines follow shifts and story events). FunFrock stays
dead; Sendell is not responsible for everything; Vesk's project is useful before it is dangerous. No new
currencies, no collectible trails, no labels on every prop.
