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

Nothing new claims anything about the originals' characters beyond what the originals show. The house's old
travel trunk only says it has stickers from Desert Island and Zeelich (places Twinsen visited in LBA2). No
statement about Twinsen's parents, Zoé's past, or LBA2's ending is made.

## What changed, and what the player can do (first set: home → neighbourhood → harbour)

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
- **The heat meter** where the project's line comes in: before the connection it waits on Zoé's list; after it,
  Zoé's note says the needle jumps when the ground hums (she noticed first).
- A chair mended with a paler new leg; an Esmer brass lamp from the trade on the hall table.

### The neighbourhood: The Old Pump (src/game/townlife.js, story/life.js)
- Changed: the project's new copper heat pipe runs along the lane past the old hand pump, and the pump seized
  when they dug. Why: the pipe is the future; the pump looks like the past. Bram (an old Grobo, new) wants it
  kept; Mira's figures say it is pointless.
- Sees: the pump on a stone plinth with a dry trough, the new pipe on low stands right beside it, Bram's sign.
- Does: talks to Bram; the valve pin needs pliers (Arthur has them); takes them from Arthur's boat box; frees the
  pin; works the handle (three strokes). Either order works (pliers first, Bram later).
- After: water runs into the trough; a drink there restores life; Bram gives a clover. In the evacuation, with
  the project's posts dark, the pump is the lane's water and Bram's lines say so.

### The harbour: trade between two worlds and The Mislabelled Shipment
- Changed: Esmer shuttle traffic and the ferry made the harbour a trading quay. New: a modest customs booth
  (Officer Odile, a Rabbibunny, new), cargo from both worlds (Esmer crates, Mosquibee honey jars beside the
  project's crates and Twinsun barrels), and Nell's repair shop for imported machines (Nell, a young Quetch,
  new): Esmer engines are wonderful, spare parts take three weeks by shuttle.
- The situation: Xil's crate is held because Zeelich's form calls it "SOUP POT (1)", and soup pots don't hum.
- Does: Odile asks what it really is; Twinsen opens it (a heat coupler); Nell's engine has waited a month for one;
  on the bench it runs and heats; when it glows it has to be taken off and cooled in the water barrel before
  it trips; set back, it settles. Odile files it as machinery and clears it.
- After: Nell's engine runs (fan turning, lamp lit), the crate's tag reads CLEARED and its rope comes down, Nell
  pays Xil's finder's fee. The mechanic it teaches — couplers overheat and need water — is the limit Baldino's
  network has in chapter 10.
- Fame, varied: Odile pictured him taller, with a cape; Nell knows him as "Arthur's dad" (who owes her a
  sprocket); Bram is fond of him and asks for help at an inconvenient moment.
- The project, before its dangers: Nell says the harbour row's heat posts trip when the ground hums and the
  project blames the salt air; Bram says Mira trusts the figures.

## Not yet done (next, in the brief's order)
1. Baldino's workshop (Zeelich): years of inventions, a collaboration with Zeelich's engineers, a practical
   early task with the network's technology (a coupler on a limited supply, two devices to synchronise).
2. Desert Island, the Hamalayi and Zeelich's own twelve-year changes (see WORLD_MAP.md: what exists there now).
3. More Citadel: the Workshop Successor or the Familiar Shortcut, only where they fit.

## Rules kept
English only, short lines. No Earth-style night (routines follow shifts and story events). FunFrock stays
dead; Sendell is not responsible for everything; Vesk's project is useful before it is dangerous. No new
currencies, no collectible trails, no labels on every prop.
