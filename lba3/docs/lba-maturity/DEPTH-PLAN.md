# Depth plan: optional content, real puzzles and the thin last chapters (wave E, item 9)

Written 10.11.2026 on `ccr-c1c2c4b9-dep6ed` at `2f1d3890` (artifact v76). **Design on paper only: nothing here is built,
nothing was played, no browser was run for it.** It is the "written list per region for the user to approve"
(`WORKPLAN-2026-11-09.md`, wave E item 9). Every minute below is an **estimate**, not a measurement.

The user's worry (10.11): the main path is estimated at 4–5 h for a first play (the bot plays it in about 1 h 15 min);
LBA1/LBA2 last several times longer for a newcomer, mostly through optional errands, reasons to go back, secrets and
puzzles that make the player stop and think. The user's rules for this plan: long chapters are **not** shortened
(8.11), nothing is padded or stretched, the expansion (4 chapters) is out of scope.

**In short.** 27 proposals: 16 optional quests, puzzles and secrets across the six regions, 6 returns with a tool the
player gets later, 4 main-path beats for chapters 11–12, and one collectible layer (the singing crystals, from 6 to 12).
A first wave of 12 is recommended (section e): about **1.4 h of extra first play if a player finds all of it, about
0.8–1.2 h for a typical player** (estimate), plus about 9 min on the main path of chapters 11–12 (12 goes from 0.36 T to
about 0.55 T, 11 from 0.69 T to about 0.9 T; the two second-wave beats bring 12 to about 0.9 T). All 27 together: about
3.2 h if everything is found, about 16 min of it on the main path (estimate).

---

## 1. Evidence used, and what it can and cannot say

| Source | What it gives | Label |
|---|---|---|
| `docs/lba3-team/ADVENTURE_DESIGN.md` samples 1–15 (the user's LBA1/LBA2 TEXT.HQR, cited by bank and line) | how the originals hand out errands, clues and consequences in what characters say | observed text (O); how it played is interpretation (I) |
| `docs/future/ZEELICH_GAP.md` (the user's LBA2 banks and SCENE.HQR counts) | LBA2's Zeelich systems: cab drivers, Zlitos, coin machines, a casino, changing newspapers, wanted posters | documented (D) |
| `src/game/story/magic.js` (its note on LBA2's GPL source, GERELIFE.CPP) | LBA2 raises the magic level only at the end of a quest that hands over a named thing | documented (D) |
| `docs/future/EQUIP2_CONCEPTS.md` "Later uses (notes only; not built)" | this game's own unbuilt returns for its five tools | ours (O) |
| The region inventories, `chapter-balance.md/.csv`, `CLUTTER_AUDIT.md` "Cards for later", the story modules | what optional content exists, when, and what each chapter's main path asks | source-reviewed |
| General knowledge of LBA1/LBA2's structure: clover boxes hidden off the paths that raise how many clovers he carries, magic flasks, rooms found by trying a behaviour, places that open once a later item is held | the shape of optional content | **recollection, not verified in this session** (no original was run, no footage watched) |

No playable original, manual, footage or interview was used. Nothing here proves that a player will enjoy any of it.

**Principles carried over** (P1–P5 are `ADVENTURE_DESIGN.md`'s; P6–P8 are added here):
- P1 teach a rule by showing it safely, then let the player apply it elsewhere (sample 3: busts on seals; sample 1: painted crosses).
- P2 failure says what happened and costs only a retry.
- P3 a recurring person helps more when asked again, in character.
- P4 a puzzle's oddity can be the story's evidence.
- P5 humour and small wants sit beside danger.
- P6 a new verb changes later play and reopens old places (sample 4: the Book of Bù lets him read runes and talk to animals; Gawley's Horn "for use on the Seals of Sendell", L1 b4 #30).
- P7 the rewards that matter grow the hero or the map (life, a verb, a shortcut, lore that pays off), not only currency (D: LBA2's magic level comes at quest ends).
- P8 a small kindness has a visible, slightly comic consequence for someone else (sample 7: the bowler's back).

---

## 2. Diagnosis: what the game has, and where depth is missing

### (a) The optional content that exists today, per region

Counted from the source and the inventories (source-reviewed). Minutes are a rough estimate for a first play that
finds and does everything optional in that region, by the same formula as `chapter-balance.md` (1.8 × the walk, 60 s
per deduction, reading at 200 words a minute).

| Region | Side stories (people, a goal, a result) | Tool lessons and item-gated finds | Shops and services | Secrets, collectibles, finds | Mini-games | Est. min |
|---|---|---|---|---|---|---|
| **Citadel** (ch 1–2, 8, 10, epilogue; visits 4–7, 9, 11) | The Old Pump (Bram), The Mislabelled Shipment (Odile, Nell, Xil), Under the Street (the sewers: hatch, valve, treasure room, Fosse, Bersimon's trapdoor, Luc's cellar hole), the hostel's finds (the humming crate, Vesk's office, notebook, strongbox), Sefa's parcel (Osk), Bersimon's pearl → lightning | pocket set (cellar tile), pump lance (stop-cock; Nell's coupler), lantern (cellar nook), glove (coal chute), conch | Mr Bazoo, the pharmacy, the ticket office, Pippa, Tibbo, the Esmer trading house, Corla | 5 singing crystals, the cliffs' clover, the bay rocks' warm stones, FunFrock's chest in the depot yard (Discreet), the asylum register and cell, Tralu's cave cache and Raph's guitar case, containers, fountains | none | 70–90 |
| **Zeelich street** (ch 3, 9, 10; visits 4–8) | The Second Bake, The Test Pair, the long call (Marl) | Esmer line (the cloud canal's crate), hop-pack test step (ch 10+) | Nara's case (laser, line, Blowtron) | 1 singing crystal (the old mill's top) | none | 20–25 |
| **Zeelich's isles** (ch 4+) | Knartas's quay light (+ the manifest), Mosquibee's beacon, the Platform's bell clapper, the Old Watch's telescope crate | Wannie mine (lantern → glove) | the hotel's coin machines, Pello's cordial, Zella's lantern, Sister Ione | 55 rooms (18 with people), 72 reads | none | 40–50 |
| **Desert Island** (ch 4–5; visits) | The Wind-Catcher, the pupils' lamp, S28's sketch (a ch 5 clue) | singing fork (Ilka's niche), the corral's trough | the School (pearl, ward, Ker'aooc), the oasis | the Temple of Bù's lower halls (LBA1's maze) | none | 25–30 |
| **The Hamalayi** (ch 6–7; visits 8+) | (none of its own) | heat flask (the winch, the frozen chest) | Brother Tenpa's tea stove | the frozen chest; the waystone niche is a card, **not built** | none | 6–10 |
| **The underground** (ch 11–12, epilogue) | (none) | fork (the crystal wheel), lantern (the hollow boulder) | — | two supply crates, reads | none | 4–6 |

What this shows:
1. **Distribution.** Citadel and the isles hold most of it. The Hamalayi and the underground have almost nothing, and
   they carry chapters 6, 7, 11 and 12: exactly the chapters under the band.
2. **Rewards.** Most rewards are "a clover and N kashes". Clovers stop at 9, so many turn into kashes; little worth
   buying is left after chapter 6 (the most expensive thing is 35). Max life only grows on Citadel and Zeelich's
   street (the six crystals). P7 is weak.
3. **Returns.** Five tools arrive (fork 4, flask 6, line 3/9, pulse tool 10, hop-pack 10) with one or two uses each;
   `EQUIP2_CONCEPTS.md` lists a dozen later uses that were never built. Desert Island and the Hamalayi have nothing
   that opens on a later visit with something new in hand (their places change with the story, which is good, but no
   tool reopens anything).
4. **Thinking.** The puzzles that make a player stop (the gears, the keypad, the discs, the valves, the mirrors, the
   seal, the archive) are on the main path. The optional ones are mostly "find it and bring it" or "hit it with the
   ball" (the beacon, the crate, the clapper). Few optional deductions.
5. **Behaviours.** After chapter 2 the four behaviours are rarely the answer to anything optional.
6. **No skill game** with a reason to try again.

### Rules every proposal keeps
English player text, concise; no night, evening or tonight wording (two suns); FunFrock is dead (his old places and
clones remain); Vesk is the villain, Sendell is not; Twinsun and Zeelich only by spaceship; every place has a meaning
for the journey (no new buildings to fill space; scenery gains a use or stays scenery); **no actions in the air**
(each hand action below names the real object it touches); nothing optional becomes required; new state under new
flags only (prefix `dx_` here, unused today), save format 5 kept, old saves load; Retry keeps the user's full-life rule.

---

## 3. The proposals, region by region

Legend. **Window**: the chapters it can be done in (it never closes unless stated; a closing window always ends
gracefully). **Cost**: S = text, reads, flags, a kit prop, one test (about a day); M = puzzle logic, a small geometry or
prop change, a new suite (2–4 days); L = a new landing, room, body switch or art request (a week or more). **Est.** =
estimated first-play minutes for a player who does it (estimate). **Test**: every suite is a new `tests/depth-<id>.mjs`
on the player-input harness (`tests/lib/player.js`), with the shared checks in section 9 plus the ones named.

### Citadel (already the richest: the proposals here give kashes a use and send the player off the island)

#### CIT-1 · Nell's bench: three tool tune-ups
| | |
|---|---|
| Where | Nell's stall and bench outside her home (life.js), Citadel lane |
| Window | from the end of The Mislabelled Shipment (her coupler running), any chapter after |
| Hook | Nell, her engine running again: "Bring me the right part and I'll tune any of your gadgets. I charge, but I charge fair." Her bench gets a chalk list of the three parts she would need. |
| Steps and clues | Each tune-up = one part found in the world + kashes. (1) **Pump lance, 8 → 12 jets**: an Esmer pressure bulb; Pello's press house on the Orchard has a spare on its shelf (a Look there names it: "a pressure bulb, Esmer-made; Pello says take it, it never fitted"). (2) **Heat flask, keeps heat 90 → 150 s**: a copper sleeve; Tashi in Lhar has an offcut by his tools ("for whoever asks nicely"). (3) **Hop-pack, thrust 2.2 → 3.0 s (height cap unchanged, 2.5 m)**: the three prototype tins (R-1). The chalk list on the bench says what and where in a few words; the journal keeps the list once read. |
| Mechanic | dialogue + a part item + the shop's existing menu (main.js openShop); Twinsen hands the part over the bench, Nell works at the vice (hands on the tool) |
| Reward | stronger tools; a sink for kashes (15 / 20 / 25) |
| Est. | 6 min at the bench and the two pick-ups (plus R-1's 10) |
| Cost | M (tools.js numbers, three parts, menu entries, lines) |
| Risks | balance: the lance and flask limits shape two puzzles (the stop-cock's 25 s, the winch); a longer thrust must not let the hop-pack clear a fence built against a jump (locomotion engineer checks `jetpack.mjs`'s gates). Flags `dx_nell_lance/flask/pack`; old saves: no tune-up |
| Test | each tune-up by input; the jet count, the heat time and the thrust read after; `jetpack.mjs` gates still hold with the tuned pack; `equip2`/`equip2b` still pass |
| Evidence → principle | P7 (a reward that grows the hero), D: LBA2's upgrades (the Blowtron) |

#### CIT-2 · Arthur's boat against Lulu's
| | |
|---|---|
| Where | Twinsen's house (Arthur's model boat, his boat box by the garden pond), the harbour's basin edge, Lulu |
| Window | chapters 2–7 (after the water is back), and again in the epilogue's free play; not in chapter 8 (the children are packing) |
| Hook | Arthur, at home: "Lulu's boat beats mine every single time. Hers doesn't even have a proper mast." |
| Steps and clues | (1) Watch a race at the basin edge: Lulu's boat runs straight; Arthur's heels over in each gust and turns into the wind (seen, and Twinsen says so). (2) Look at Lulu's boat on the quay: a lump of lead under its hull ("A keel weight. Clever."). (3) The harbour's flags show the wind across the basin. (4) Fix Arthur's boat on the quay: a stone from the boat box screwed under the hull (hands on the boat and the screwdriver), and its sail set across the wind the flags show (three settings on the boom: a wrong one sends the boat round in circles, with Arthur's comment). (5) The race, played out by those two choices. |
| Mechanic | observation and a two-part setting; the race itself is a short scripted run whose result follows the settings |
| Reward | Arthur's win and his changed lines (chapter 8: "My boat's in the bag. I'm not leaving it"; chapter 12's radio: one line about it); Lulu pays her bet: 10 kashes and her "secret" (where the warm stones come from: a pointer to the bay rocks if not found) |
| Est. | 8 min |
| Cost | M (the boat on the water, its two settings, a short scripted race; a few lines) |
| Risks | the user plays chapter 2: it must not crowd its long route (it is optional and at home). "No actions in the air": Arthur and Twinsen hold the boat when they set it. Flags `dx_boat_seen/keel/sail/won` |
| Test | the watch, the two looks, a wrong sail (the circling line), the win by input; save between the keel and the sail → Continue keeps the keel |
| Evidence → principle | P5 (a domestic want beside danger), sample 13 (the family takes part), P1 |

#### CIT-3 · Raph's guitar (a person to find on another world)
| | |
|---|---|
| Where | Tralu's cave (the case, "RAPH" burned in the lid: exists), the tavern (Luc's and Old Fenn's lines), Kingo's harbour bar on Otringal (Sim, Madam Orla) |
| Window | chapter 4 on (the spaceship and the shuttles) |
| Hook | Luc already says Raph left his guitar in the cave. New: Old Fenn, asked about Raph: "Kept the lighthouse until the project put up its own beacons. Went off-world. Sends a postcard now and then. Pinned behind my bar." |
| Steps and clues | (1) the postcard behind the tavern's bar (a read: Otringal's harbour on the front, "playing for tourists, four strings too many"); (2) carry the case (an item) by spaceship and shuttle; (3) Sim at Kingo's bar knows "the Twinsunian who sings at the back"; (4) Raph, a new person, on the bar's little stage with a borrowed Esmer instrument. |
| Mechanic | dialogue, an item carried between planets (by spaceship only), a person found from two clues |
| Reward | 20 kashes from his tip jar; he goes home after chapter 10 and plays in the lighthouse in the epilogue (a payoff the player sees); he puts in a word with Madam Orla (the Knartas lens costs 8 from 20 even without the manifest) |
| Est. | 10 min (two journeys with their films) |
| Cost | M (one new person with a voice and dress, a bar stage spot, the case as an item, lines) |
| Risks | a new person: narrative developer approves. The lighthouse's lamp room is used by Zoé in chapters 3 and 10: Raph stands there only in the epilogue. Flags `dx_raph_card/case/found` |
| Test | the postcard read, the case taken, the journey, Raph's talk, the lens price; the epilogue shows Raph at the lighthouse |
| Evidence → principle | sample 12 (an ordinary problem passed from person to person), P3 |

### Zeelich's street

#### ZEE-1 · "Somebody's got it wrong": the misrouted heat
| | |
|---|---|
| Where | Zeelich's street: Fennick (the project's heat fitter), Old Grumm (the Wannies' burrow), the dark heat posts at the west end and over the burrow, Oma (the posts' tags) |
| Window | chapter 3 on; from chapter 10 the network's heat changes everything, so it closes then: the council has the west end connected anyway and Grumm says so (nothing lost) |
| Hook | Grumm already says it: "Up top they wait for heat. Down below we open the vents. Somebody's got it wrong." |
| Steps and clues | (1) A dark post's tag (Oma reads them: CAPPED · NEXT QUARTER). (2) Its pipe, touched at its foot: warm ("A capped post shouldn't be warm."). (3) The burrow's grate in the street, hand held over it: hot air. (4) Fennick, asked with both seen: the feed under the street is laid to the west end but capped there, so its heat backs up and leaks into the burrow ("If it's going into the ground anyway, nobody can say I wasted it."). He lends his valve spanner. (5) The cap at the west post's foot, opened with the spanner (kneeling, hands on the valve): the post lights, the grate cools. The pocket set, held, hums along the buried feed (an optional confirmation, not needed). |
| Mechanic | observation (two contradictions), dialogue, one valve; Fennick refuses without the evidence and says what he would need ("Show me where it's going") |
| Reward | the west end's post lit and its houses' windows warm (visible); Grumm's and the west end's lines change; 12 kashes the west end chipped in; Fennick's spare heat cell (the heat flask full once, anywhere on Twinsun; without the flask, 10 kashes) |
| Est. | 9 min |
| Cost | S–M (one post's state, the grate's look, lines, a valve prompt) |
| Risks | story: shows the project's cost in miniature after its benefit is seen (the bible's rule), Vesk not named as the cause, only "the drawing". Flags `dx_heat_tag/pipe/grate/spanner/open` |
| Test | Fennick refuses before both clues; each clue by input; the valve; the lit post and the cool grate after Continue; chapter 10 closes it with Grumm's line |
| Evidence → principle | P4 (the oddity is the story's evidence), P8, the bible's "show a working system, then let the player investigate its cost" |

#### ZEE-2 · The project stores, after the pulse tool (a return)
| | |
|---|---|
| Where | the fenced project depot on Zeelich's street: its shed (PROJECT STORES. STAFF ONLY, visibly closed today) |
| Window | chapter 10 on (the pulse tool), and the epilogue |
| Hook | the shed's motorised shutter hums on its rail; Baldino, showing the pulse tool, already says it stalls machinery |
| Steps and clues | (1) the pulse at the shutter's motor stalls it half open (a Look first: "A motor holds it. The project's kind."); (2) inside: Vesk's requisition ledger on a crate (a read: heat cells and connection kits RESERVED: UPPER DISTRICTS, the thirty percent's supplies held back); Mr Pelleck's radiator kit among them; (3) the kit taken to Pelleck. |
| Mechanic | an existing tool on a new kind of target; a read; a hand-over |
| Reward | Pelleck's radiator connected at last (his house warm, his line), 15 kashes with a receipt (his joke: "Form 7-B, signed, in triplicate"); the ledger as lore in the journal (what the thirty percent meant in goods) |
| Est. | 5 min |
| Cost | S (the shutter's two states, the room as a look-in shed or a 3 × 3 m store from the kit, lines) |
| Risks | the shed must stay shut before chapter 10 with its current reason. Flags `dx_store_open/ledger/kit` |
| Test | the pulse by input; before chapter 10 still shut; the ledger read; Pelleck after Continue |
| Evidence → principle | P6 (a later verb reopens an old door) |

### Zeelich's isles

#### ISL-1 · Old Jaspa's warm gems
| | |
|---|---|
| Where | Knartas, the gem-sorting room (Old Jaspa, keeper) |
| Window | chapter 4 on |
| Hook | Jaspa: "The project only takes cold stones. A warm one cracks in their machines and they fine me. My eyes can't tell them apart any more." |
| Steps and clues | A tray of six gems on her bench and two bins (PROJECT · KEEP). The rule is the dig's (chapter 4): warm crystals wear a pale crust and give off a thread of dust; Jaspa also says "My mother said warm ones sweat" (so a player who comes before the dig has it too). Twinsen picks each gem up and sets it in a bin (hands on the gem and the bin). The singing fork, if he has it, makes the warm ones ring (an alternate way). |
| Mechanic | observation applying a learned rule in a new place (P1's "vary"); failure: the project bin's lamp flashes and Jaspa: "That one sweats. They'll fine me." The tray is reset, nothing lost |
| Reward | **a singing crystal** (the one that "hums louder than the rest; they never wanted it"): +1 max life (COL-1) |
| Est. | 6 min |
| Cost | S (six gem props, two bins, a tray state, lines) |
| Risks | none to the story. Flags `dx_jaspa_ask/sorted`; the crystal `sc-jaspa` (COL-1) |
| Test | a wrong sort (lamp, line, reset), the right sort by input, the crystal and +1 max life; the fork's ring as the alternate |
| Evidence → principle | sample 3 (a visible feature marks the answer), P1, P2 |

#### ISL-2 · Tellem's letters (a chain across both planets)
| | |
|---|---|
| Where | the hostel on Citadel (Tellem, one of Foreman Ordo's Esmer workers), Officer Odile's customs booth on the quay, Knartas (Mila and Tem) |
| Window | chapter 4 on (the spaceship); best in 4–9, while Mila waits by the radio (chapters 8–9 she is at home) |
| Hook | Tellem in the hostel: "I write home every week. Nothing arrives. Mila thinks I've forgotten her." Mila on Knartas (or Tem): "Not one letter since the project came." |
| Steps and clues | (1) Tellem: the project's post goes out with its cargo. (2) Odile holds a sack on the quay filed as CARGO, UNDECLARED. (3) Odile: "Letters are not cargo. Letters are correspondence. That is a different form." The form is on her own board; Twinsen fills it at her counter (a short choice: what the sack is, who sends it, where to). (4) The sack's Knartas letters by spaceship and shuttle to Mila. |
| Mechanic | dialogue, a form as a small choice (Odile's comedy, P5), an item carried between planets |
| Reward | Mila's reply carried back is optional (a second trip); Tem shows where "the light's counted from" (a read of the quay light's lens seat: the lens quest's step if not done); a clover and 15 kashes from Mila; Tellem goes home in the epilogue (seen on Knartas with his family) |
| Est. | 12 min |
| Cost | M (a sack item, a form choice, lines for four people, Tellem's epilogue spot) |
| Risks | text heavy: the clarity editor keeps it short. Not the council's stamp chain again (a single form, one choice). Flags `dx_post_ask/sack/form/given/reply` |
| Test | the wrong form answer (Odile's line, retry), the right one, the hand-over on Knartas; the epilogue's Tellem |
| Evidence → principle | sample 12, sample 1 (an ordinary blocker solved by an ordinary favour), P5 |

#### ISL-3 · The three rooms across the clouds (a return with the Esmer line)
| | |
|---|---|
| Where | Otringal's barges' yard (the quay's cargo store) and west quay (the dock worker's house); Mosquibee's west islet (the honey room). Today they are distant scenery with an honest "no way over on foot" look (world-polish 4). |
| Window | from the Esmer line (chapter 3 bought, chapter 9 given) |
| Hook | the near shore's existing looks change once he has the line: "A cord ring on the crane over there. Within reach of the line." |
| Steps and clues | a cord ring on a crane, a davit and a hive post on each far patch (rings are the line's rule since its lesson on the cloud canal); reel across; the line's existing clearance check and recovery |
| Mechanic | existing tool, existing ring targets (`kit2b.lineTargets()`) |
| Reward | the cargo store: the project's leftover stores (where Madam Orla's lens came from: a read) and 15 kashes; the dock worker's house: a person with a line and a clover; the honey room: a jar of royal honey (a full heal, carried) |
| Est. | 6 min |
| Cost | S–M (three rings, three routes checked for clearance, the rooms exist) |
| Risks | a way back is needed from each patch (a ring on the near shore). Flags `dx_far_yard/quay/honey` |
| Test | each crossing and back by input; without the line the looks stay "no way over"; `island-doors` reaches the three rooms |
| Evidence → principle | P6 |

### Desert Island

#### DES-1 · Where the figures look (a buried survey cache)
| | |
|---|---|
| Where | the two standing figures and the twin pillars (desertold.js: scenery today, "candidates to cut"), S28's board (Surveyor Anko's sketch), Brosk (his shovel) |
| Window | chapter 5 after the condenser hall is dug (`c5_dug`), any later chapter |
| Hook | Anko's sketch (exists) gains one more mark: a dotted line from the old pipes to "?" between two drawn figures. A Look at the figures: "They all look the same way. At nothing." |
| Steps and clues | (1) the sketch's "?"; (2) the figures' gaze crosses at a low drift between the twin pillars (seen when standing there: the drift is the only thing they look at); (3) the pocket set, held, hums at the drift (optional confirmation; the clue chain works without it); (4) Brosk lends the shovel again ("It came back with sand in places sand shouldn't go."); (5) dig the drift (the existing `p_dig` verb, hands on the shovel); a FunFrock-era survey hatch with a cache. |
| Mechanic | observation of a landmark's alignment (sample 3, sample 4's "clue points at a visible landmark"), an old tool reused, an optional confirming instrument |
| Reward | **a singing crystal** (FunFrock's surveyors dug one up and buried it again; their note says they "stopped drilling here, the ground sang"), lore that matches Vesk's mistake without reviving FunFrock |
| Est. | 10 min |
| Cost | M (the sketch's mark, the figures' look, the drift and hatch on the existing ground, the cache, lines) |
| Risks | the drift must not sit on a main-path route or a slide spot (`slidetraps`, `overlaps`); FunFrock stays dead (an old note only). Flags `dx_gaze_sketch/seen/shovel/dug` |
| Test | the clues by input; dig refused without the shovel (the line says why); the crystal; the pocket set's hum at the drift |
| Evidence → principle | sample 3, sample 4, P1, gives two scenery pieces a meaning (R11) |

#### DES-2 · Rector Hougo's rebound trials (a skill game that teaches the finale)
| | |
|---|---|
| Where | the School of Magic's forecourt (Rector Hougo), the stone face's buttresses |
| Window | chapter 4 on |
| Hook | Hougo, proud: "Twinsen of the honour roll. Can you still bank a ball? My pupils can't." Three bronze bells hang behind pillars in the forecourt, none in a straight line from the marked flagstones. |
| Steps and clues | three trials of growing difficulty: (1) one rebound off a buttress into the first bell; (2) two rebounds; (3) the third bell swings slowly on its bracket (wide, slow: no tight timing). Each flagstone has a chalk arrow showing the first wall to aim at. A miss is free; Hougo's comment grows more useful after three misses. |
| Mechanic | the magic ball's existing rebounds (the core's plates use them: `chapter3.js` PLATE), throw directions from a marked spot |
| Reward | trial 1: 10 kashes; trial 2: Ker'aooc's ward refill on the house; trial 3: **a singing crystal** ("on my desk for twenty years; it hums louder near you") and Twinsen's name chalked on the honour roll again. The skill is the one chapter 12's pylons ask for: practised here, safe. |
| Est. | 12 min (estimate; skill games vary most between players) |
| Cost | M (three bells as ball targets with rebound paths measured as the core's were, lines, the honour roll) |
| Risks | the bot's measured throw directions decide where the flagstones go (as `tests/chapter3.mjs` does for the plates); no precise timing. Flags `dx_trial1/2/3` |
| Test | each trial by real throws from the flagstones (first-throw success from the centre, as the plates' test); misses counted; the crystal |
| Evidence → principle | P1 (demonstrate safely, then the finale combines), recollection: LBA1/LBA2 give their ball its own play outside fights |

#### DES-3 · Ilka's breathing ground (proof for the council, and a map of warm ground)
| | |
|---|---|
| Where | Ilka's survey board (exists: "warm ground" by each crystal find), three warm-ground stakes round the island (the oasis, the dig's rim, Hesk's flags) |
| Window | chapter 5 after the vent is open, until chapter 9's hearing for the proof; the map reward any time |
| Hook | Ilka: "The vent breathes. I need it in numbers, or the council will call it a feeling." |
| Steps and clues | (1) her board marks three stakes; (2) at each stake, a reading: strike the singing fork by the stake (it rings warm or cold) **or** watch the stake's little tell-tale flag for the warm air (no fork needed: slower, both work); (3) the readings to Ilka. |
| Mechanic | applying the warm-ground rule in a new form; an alternate approach with or without the optional tool |
| Reward | in chapter 9, Dallan's proof scene gets Ilka's numbers (one line more and Councillor Brum's vote said out loud: earlier help seen later, main path unchanged); Ilka's survey map: **the holomap marks where something still hums on Twinsun** (the regions of the singing crystals not yet found; COL-1's helper) |
| Est. | 10 min |
| Cost | M (three stakes and flags, readings, a holomap layer, one chapter-9 line) |
| Risks | the chapter-9 line must read the flag without changing the vote's logic (narrative developer). Flags `dx_breath_1/2/3/done` |
| Test | each reading by fork and by watching; chapter 9's line with and without; the map's marks drop as crystals are found |
| Evidence → principle | P3, P8, sample 6 (clues gathered across places), P7 (a map that helps the collectible layer) |

### The Hamalayi (the thinnest region: three proposals in the first wave)

#### HAM-1 · The pilgrims' waystone
| | |
|---|---|
| Where | the waystone on the monastery terrace (LBA1's prop, `props-lba1hamalayi.js`; the niche card in `CLUTTER_AUDIT.md`, not built), Brother Tenpa |
| Window | chapter 6 on (once the terrace is reached) |
| Hook | Tenpa: "Pilgrims turned the waystone to face the shrine before they climbed. Nobody climbs now." |
| Steps and clues | the top stone turns on the cell (hands on its grips: a quarter at a time, as the wind-catcher's crank); its four faces are carved: a dome, a roof, houses, ice. The shrine is the observatory (Sefa's dome on the ridge above, in view from the terrace; Tenpa's "the shrine" and the dome carving meet there). Faced right, the niche below slides open. Wrong faces give their own line ("The houses face the houses." "The roof faces its own roof."). |
| Mechanic | landmark alignment (P1: the clue is a visible place), a physical turn |
| Reward | **a singing crystal** in the niche (and a line: the pilgrims left one each, "this one was never taken"). Before chapter 7 it also plants the idea that the dome is Sendell's shrine, which chapter 7 confirms. |
| Est. | 7 min |
| Cost | S–M (a turning top, the niche, four lines) |
| Risks | the dome must be in view from the waystone (the art pass checks the shot; if not, the clue moves to Tenpa's lines). Flags `dx_way_ask/face/open` |
| Test | each wrong face's line, the right face by input, the crystal; Continue keeps the turned face |
| Evidence → principle | sample 4 (the clue points at a visible landmark), P1 |

#### HAM-2 · Pim's kite and the goat path (a shortcut earned)
| | |
|---|---|
| Where | Lhar (Pim), Kesh on Desert Island (Lumi, the weaver), the observatory ridge |
| Window | chapter 6 after the fuse (`c6_kite`); the path itself opens after chapter 7 (Pim: "Not while that drone's up there"), so it never skips chapter 7's climb |
| Hook | new state: the kite came down hard from the icefall; Pim holds it with a split sail and a cracked spar ("It was worth the fuse. It's just... it was my kite.") |
| Steps and clues | (1) Pim: only a proper weaver can mend sailcloth; Hesk's glider flies to Desert Island. (2) Lumi in Kesh: if The Wind-Catcher is done she mends it at once ("You fixed my screen. I fix your friend's kite."); if not, she points to it first (earlier help matters later). (3) Back to Pim. (4) Pim flies it from Lhar's rim and shows the goats' way up: a line of ledges from Lhar's falls to the ridge's upper switchback; Athletic jumps, and a rope he ties at the top while Twinsen ties the bottom to an iron ring (hands on the rope and the ring). |
| Mechanic | a two-region errand with play at both ends; Athletic jumps; a new route |
| Reward | **a shortcut**: from Lhar to the ridge's upper switchback, past the stretch where the crystal crawler slams (chapter 10's dome relay, where the bot died twice); Pim's and Arthur's radio lines mention each other in chapter 10 |
| Est. | 12 min (the path saves a few minutes on every later climb) |
| Cost | M (the torn kite's state, the ledges on existing rock, the rope, a few lines) |
| Risks | traversal: the path must not open the observatory before chapter 7 nor bypass any gate (locomotion engineer; `jumpreach`, `slidetraps`); its top lands where chapter 10 still meets the ridge's mites. Flags `dx_kite_torn/mended/given`, `dx_goatpath` |
| Test | the torn kite in chapter 6; Lumi with and without the Wind-Catcher; the ledges by input (Athletic); the path refused before chapter 7; chapter 10's segment with the path (time saved, recorded as an automated measure only) |
| Evidence → principle | P3, P8, P7 (a shortcut as a reward), sample 2 (help changes what a place offers later) |

#### HAM-3 · Yorna's brother's pack (two ways to melt the ice)
| | |
|---|---|
| Where | Yorna (she gave Twinsen her brother's blade in chapter 6), the glacier by the vent (≈ 4258, −44) |
| Window | chapter 7 after the vent is open (`c7` done), any later chapter |
| Hook | Yorna, once the vent breathes: "My brother crossed that glacier every season. The last time he left his pack in a crevasse and came back without it. He laughed about it. I didn't." |
| Steps and clues | (1) the pack, seen through clear blue ice in a crevasse wall near the vent (a Look: "Too hard for the ball. It wants warmth."); (2a) the heat flask filled at the open vent and let out at the ice, **or** (2b) a small brass mirror left on a post by the observatory's crew (the same kind as chapter 7's floor mirrors) turned to send light onto the ice (chapter 7's rule: light melts ice); (3) the pack. |
| Mechanic | two valid approaches (an optional tool or a learned rule), P1's "vary" |
| Reward | **a singing crystal** in the pack, and his notebook (lore: the glacier's warm patches, years before the project; Yorna's quiet line about him); Yorna's broth in chapter 10 is already hers: her line then mentions the pack |
| Est. | 10 min |
| Cost | M (the ice wall's two states, a turnable mirror on a post, the flask's new target via `heatHit`, lines) |
| Risks | the brother is a new name (narrative developer chooses it). Flags `dx_pack_seen/thawed/given` |
| Test | the ball refused (line); the flask by input; the mirror by input (separately, from a fresh save); the crystal |
| Evidence → principle | P1, P6, P3 |

#### HAM-4 · The gorge's ice arch (a short return with the line)
| | |
|---|---|
| Where | the gorge below the old gate (LBA1's gate), its north bank |
| Window | from the Esmer line, chapter 6 on (the line's "pass's ice bridges" note) |
| Hook | a Look from the felled tree's bridge: "A cord ring frozen into that ice arch. Somebody crossed here once." |
| Steps and clues | reel to the arch; a ledge under the old gate's far pier with a crew's lost tool chest |
| Mechanic | existing tool and ring target |
| Reward | a clover and 12 kashes; a read on the chest (the road crew who built the old gate) |
| Est. | 4 min |
| Cost | S |
| Risks | a way back (a second ring). Flag `dx_arch` |
| Test | the crossing and back by input; the chest |
| Evidence → principle | P6 |

### The underground

#### UND-1 · The source (the last singing crystal)
| | |
|---|---|
| Where | the crystal galleries (`c3gallery`), beside the arsenal's hollow boulder |
| Window | chapter 11, and the epilogue (the collar leads down again after dinner) |
| Hook | the crystals here are the well's grown huge (chapter 11's own words); with any singing crystal found, a faint hum comes from a crusted wall (Twinsen: "That's the same note. Louder.") |
| Steps and clues | (1) the crusted wall hums; (2) the singing fork cracks its crust (the fork's rule from Ilka's niche), **or** the lantern shows a crack low in it that the ball breaks open (two ways); (3) a small cell with a crystal cluster. |
| Mechanic | an optional tool or a lit look; P1 applied a third time in a new form |
| Reward | **a singing crystal**; if it is the twelfth, COL-1's payoff |
| Est. | 5 min |
| Cost | S |
| Risks | chapter 11 is meant to be empty of people: this is a find, not a person. Flag `dx_source` |
| Test | the hum line only with a crystal held; the fork and the lantern+ball ways from fresh saves; the epilogue's visit |
| Evidence → principle | P1, COL-1 |

---

## 4. (b) Returns: places that change or open on a later visit

The game already changes places with the story (Lhar's four phases, Kesh's oasis states, the hostel's phases, the
isles' three states, the underground's epilogue crew). What is missing is a **new tool reopening an old place**. The
table puts the existing and the proposed returns side by side.

| Tool or change | Arrives | Existing returns | Proposed returns |
|---|---|---|---|
| Pocket set | ch 2 | cellar tile, the hostel's humming crate (ch 1–2 only) | DES-1's drift (confirmation), ZEE-1's buried feed (confirmation), R-3's deep seam |
| Pump lance | ch 2 | Bram's stop-cock, Nell's coupler | **R-2** the monastery cistern |
| Esmer line | ch 3 / 9 | the cloud canal's crate, the old mill's davit | ISL-3 (three far rooms), HAM-4 (the ice arch) |
| Singing fork | ch 4 | the pupils' lamp, the galleries' wheel | ISL-1 (alternate), DES-3 (readings), UND-1 (the crust) |
| Glove | ch 4+ (Wannie mine) | the coal chute | — (enough) |
| Heat flask | ch 6 | the winch (alternate), the frozen chest | HAM-3 (the pack), CIT-1's tune-up |
| Pulse tool | ch 10 | the network's machines | ZEE-2 (the project stores) |
| Hop-pack | ch 10 | the test step, the old mill's stones | **R-1** Baldino's prototype tins |
| The story's own changes | — | many (above) | X-1 the newsstand and boards notice optional deeds; EP-1 the epilogue's thanks round |

#### R-1 · Baldino's prototype tins (the hop-pack's return across Twinsun)
| | |
|---|---|
| Where | three one-storey ledges, one per Twinsun region, each with a tin of parts: Citadel (a ledge on the Whispering Cliffs' upper wall, above the stones), Desert Island (the School's stone face, a ledge by its brow), the Hamalayi (above Lhar's falls, by the steam crack) |
| Window | chapter 10 on |
| Hook | Baldino, after the test step: "My first prototype went up nicely and came down wherever it liked. I left three tins of parts on ledges all over Twinsun. Bring them back, they're expensive." A tin on each ledge shows his lilac paint (seen from below). |
| Steps and clues | the ledges are 2.3–2.5 m up with ground below (the pack's own rule), each seen from a path; the tins are in plain sight from below; Twinsen lifts each into his pack (hands on the tin) |
| Mechanic | the hop-pack's one rule, applied in three different settings (one beside a drop, one beside water, one in a narrow gap) |
| Reward | the three tins = CIT-1's hop-pack tune-up; each tin also holds 8 kashes |
| Est. | 10 min (with the glider hops between regions) |
| Cost | M (three ledges on existing geometry, three tins, lines; the locomotion engineer places the ledges) |
| Risks | no ledge may give a route over a fence or a gate (the pack's "gates" list in the bible); flags `dx_tin1/2/3` |
| Test | each tin by input in Athletic with the pack; without the pack the ledge is out of a jump's reach (measured); `jetpack.mjs` |

#### R-2 · The monastery cistern (the pump lance in the cold)
| | |
|---|---|
| Where | the monastery yard's old cistern gate (a counterweight basin on a chain beside a low stone door to the cellar under the yard) |
| Window | chapter 7 on (after the yard is reached; the gate stays shut before with Tenpa's reason) |
| Hook | Tenpa: "The cistern door opens when the basin is full. The spring froze years ago." The basin hangs empty on its chain (a Look). |
| Steps and clues | water from the monks' trough (near the brazier: it doesn't freeze) carried in the lance's tank; jets into the basin (each jet shows the level); the weight pulls the door up. Without the lance: a bucket by the trough fills the basin in six trips, slower, both valid. |
| Mechanic | the lance's own puzzle note ("fills a basin that weighs a gate open"), with an alternate by hand |
| Reward | the monks' old seed store: a jar of the monks' tea (refills magic, carried), Tenpa's lore about the shrine's first keepers, a clover |
| Est. | 6 min |
| Cost | S–M |
| Risks | the bucket trips must not feel like padding: six is the most; the lance takes two jets per trip. Flags `dx_cistern_level` (0–6), `dx_cistern_open` |
| Test | the basin by jets and by bucket (fresh saves); the level kept over Continue |

#### R-3 · The Wannie mine's deep seam
| | |
|---|---|
| Where | the old Wannie mine on Under Celebration (the deep seam "roped off in the crisis", isleslife.js) |
| Window | after chapter 10 (the crisis over: the rope comes down) |
| Hook | Foreman Grob: "The rope's down. Nobody's gone back in. Something in there whistles when you walk past." |
| Steps and clues | dark (the lantern), and the pocket set's needle leads to a seam behind loose rock that the glove breaks; without the pocket set, the lantern shows a crack's glint |
| Mechanic | three tools the player already holds, combined (P1's "combine") |
| Reward | a rough gem: Old Jaspa (ISL-1) buys it for 25 kashes, or, if ISL-1 is not done, it is the one that teaches her problem |
| Est. | 6 min |
| Cost | S |
| Risks | the mine's existing glove find must stay as it is. Flag `dx_seam` |
| Test | the seam by input with each combination; Jaspa's price |

#### X-1 · The world notices (newsstand and boards)
| | |
|---|---|
| Where | Otringal (a news stand by the fountain: LBA2's changing newspapers, D), Citadel's two street notice boards (exist), the isles' shuttle boards (exist) |
| Window | chapter 4 on |
| What | a headline or a notice for each optional deed done: QUAY LIGHT BLINKS AGAIN, WEST END WARM, LETTERS FROM TWINSUN, A TWINSUNIAN ON THE HONOUR ROLL; the existing chapter headlines in between |
| Reward | recognition only (P8), and a hint for an open favour ("Knartas still dark") |
| Est. | 3 min of reading over the game |
| Cost | S (a stand from the kit, lines keyed by flags) |
| Test | each headline after its flag; none before |

---

## 5. (c) Chapters 11 and 12 (and 6, 7): real play, not padding

Estimates from `chapter-balance.md`, 9.11 run 3: chapter 11 13.8 min (0.69 T), chapter 12 7.3 min (0.36 T), chapter 6
14.0 (0.70), chapter 7 13.3 (0.66). The fixes for 6 and 7 are optional content in their window (HAM-1, HAM-2's start,
HAM-3, R-2); their main routes stay as they are. The fixes for 11 and 12 are on the main path, because a final
chapter of one arena is a gap a player meets whatever they do. The core fight's tuning belongs to animation-combat;
these proposals change what happens between the fight's phases, so they go to that worker together.

#### C11-1 · Baldino's relays down the shaft (main path, chapter 11)
| | |
|---|---|
| Where | the collar (Baldino), the deep installation (`c3deep`), the crystal galleries (`c3gallery`) |
| Hook | Baldino at the collar: "Down there my radio goes blind. Relays talk by sight, you know that." He hands Twinsen two relay beacons (into his hands: they are carried items). The Test Pair (chapter 3) and chapter 10 taught the rule. |
| Steps and clues | in each of the two rooms, two or three brackets; a relay set on a bracket (hands on the bracket's clamp) shows two lamps: one for the way he came in, one for the way on; green when it sees that doorway. Only one bracket per room sees both (the deep installation: the catwalk's post sees the tunnel mouth and the shutter; the console's bracket sees only the tunnel). A relay can be lifted and moved. Past the galleries Sendell's light carries the signal (her chamber is hers: a line says so). |
| Mechanic | sight lines in a room the player already walks; physical placement; clear lamp feedback (P2) |
| Why it is not padding | it is the network's rule applied to the descent, and it is what makes the allies audible in the core (C12-1): set-up before payoff |
| Est. | +5 min on the main path (chapter 11 to about 18.5 min, about 0.9 T) |
| Cost | M (two relay items and models, five brackets, a sight test with the camera's own `sight` rule, lines) |
| Risks | a save in chapter 11 past a room, or in chapter 12, from before this: the relays count as placed (catch-up, as magic.js does); a relay can never be lost (dropped relays return to Baldino's hands at the collar with a line). Flags `dx_relay_deep`, `dx_relay_gal` |
| Test | `chapter3` and segment 14 updated (the bot places both); a blind bracket (red lamp, line); moving a relay; save between the two → Continue; old chapter-11 save loads with both counted |

#### C12-1 · The allies' feeds at the deck ring (main path, chapter 12)
| | |
|---|---|
| Where | the core (`c3core`): three junction boxes on the deck ring, one per pylon, each labelled with its station (LIGHTHOUSE, MAINS, MILLS) |
| Hook | today each pylon turns by a bank shot while the allies' part is only heard (`chapter-balance.md`: "the allies' part in the overload was only heard"). Now each ally's voice comes through the relays (C11-1) and asks for one thing on his side before the bank shot holds. |
| Steps and clues | with the guardian stunned (as for the plates): **MAINS** (Mira): a needle between two marks (her chapter-10 rule "two marks on every gauge"): he turns the junction's wheel and watches the needle, past the second mark it trips and he starts again; **LIGHTHOUSE** (Zoé): three dials on the box, sun, wave, star (chapter 3 and 10's fact: Zoé says "the same as always", nothing new to learn); **MILLS** (Oku): the coupling's flywheel spins with a painted mark; the ball brakes it with the mark at the top (chapter 3's brakes; a wide window, no tight timing). Each 20–40 s. |
| Mechanic | three short physical callbacks, each with its ally speaking, inside the existing fight's stun windows |
| Why it is not padding | the finale combines what the whole game taught (P1's last step) and makes the allies act, as the bible's finale promises |
| Est. | +4 min (chapter 12 to about 11 min) |
| Cost | M (three boxes, their states, lines; the fight's phase order with animation-combat) |
| Risks | difficulty: a step during a hunt; the stun window may need lengthening (animation-combat decides). Saves: a pylon already turned counts its feed done. Flags `dx_feed_mains/light/mills` |
| Test | `chapter3` (each feed by input before its plate holds; a tripped needle; a wrong dial order buzzes), `resume` D16 (a reload in each phase), segment 14 |

#### C12-2 · Zoé in the lamp room, under the quakes (main path, chapter 12, second wave)
| | |
|---|---|
| Where | Citadel's lighthouse lamp room (`lighttop`'s twin on Citadel, used in chapters 3 and 10), Zoé (playable in chapters 2 and 8) |
| Hook | when Vesk overloads the guardian, the surge shakes Citadel; Zoé's line goes dead mid-word |
| Steps | control passes to Zoé: the quake has knocked the lens off its stops and Arthur's needle swings; she resets the lens (hands on its brass handles: three positions, Arthur calls which way the needle moves) and holds the frequency while a second shake rattles the room; back to Twinsen at the bleed valve |
| Why it is not padding | Zoé acts at the climax rather than being a voice (the bible: Zoé acts meaningfully); a quiet, tense break in the fight |
| Est. | +4 min (chapter 12 to about 15 min with C12-1) |
| Cost | L (a mid-fight body switch and back, the fight frozen meanwhile, a save rule: a save in Zoé's part resumes at its start) |
| Risks | the fight's state must freeze and restore exactly; the cinematic and the music hand-over. Flags `dx_zoe_core` |
| Test | `chapter3`, `resume` (a reload during Zoé's part), Zoé's behaviour hold kept (the playtest inbox's P7 fix) |

#### C12-3 · The hoist up, with Vesk (main path, chapter 12, second wave)
| | |
|---|---|
| Where | the service hoist (chapter 11's caged well in the deep installation's back wall: "the cage is down at the core and the call locked from below"); its foot in the core (new) |
| Hook | after shield mode, the council's guards radio from above: the cage is down with him, locked from his side |
| Steps | the hoist's foot on the core's deck; its lock needs the key on Vesk's console ring (taken from the burnt console, or handed over by Vesk, by VESK-CHOICE); the ride up together (a short, quiet two-shot) to the guards in the deep installation; then the epilogue |
| Why it is not padding | it pays off the hoist the player read in chapter 11 and gives the villain's end a human moment instead of a cut |
| Est. | +2 min active (+1 min scene) |
| Cost | M–L (a landing in the core, the cage ride, the guards' spot; `underground-inventory.md` lists "a ride would need a landing in the core") |
| Risks | the end card's timing; a save after shield mode before the ride resumes at the hoist's foot. Flags `dx_hoist_key`, `dx_hoist_up` |
| Test | `chapter3` to the epilogue by input; `epilogue-home`; `under-bar` (the epilogue's hoist green) |

With C11-1 and C12-1 (first wave): chapter 11 about 18.5 min (0.9 T), chapter 12 about 11 min (0.55 T); with C12-2
and C12-3 too: chapter 12 about 18 min (0.9 T). All estimates by the balance formula, uncalibrated.

---

## 6. (d) The collectible layer: the singing crystals, from 6 to 12

#### COL-1 · Twelve singing crystals
| | |
|---|---|
| Today | 6 crystals (main.js `crystalSpots`): 5 on Citadel, 1 on the old mill's top on Zeelich; each +1 max life (10 → 16); all six: Twinsen's line and Sendell's word in chapter 11 (`crystalsAll`) |
| Proposed | 6 more, each earned by a puzzle, none lying on a path: Desert Island 2 (DES-1 the figures' cache, DES-2 the third trial), the Hamalayi 2 (HAM-1 the waystone, HAM-3 the pack), the isles 1 (ISL-1 Jaspa), the underground 1 (UND-1 the source). Every region then has at least one. |
| What they give | +1 max life each (to 22 at most); the toast counts "n of 12"; the holomap helper from DES-3 shows the regions that still hum. **All twelve:** in chapter 12 Sendell's light catches him once when his life would reach zero (a full heal, once; she says so), and an epilogue line. Nobody needs it to win. |
| Est. | the minutes are inside the quests; about 5 min more of hunting the last ones with the map |
| Cost | S (the framework: pending spots for the quest-given crystals so the total is 12 from the start, the toast, the flag, the chapter-12 save) |
| Risks | **balance**: max life 22 makes chapters 10–12 easier for a thorough player; animation-combat rechecks the ridge, the bore and the core with 16 and 22. **Saves**: `crystalsAll` keeps its meaning (the first six, Sendell's chapter-11 line); the new set is `dx_crystals12`; an old save with six keeps +6 and its line; the quest crystals are owed rewards (`ChapterBase.reward`) so a save before pick-up does not lose one. |
| Test | the count and max life after each; an old six-crystal save loads with 16 max life and `crystalsAll`; the twelfth triggers the line; chapter 12's catch happens once (death avoided once, then Retry rules as now) |
| Evidence → principle | recollection: LBA1/LBA2's clover boxes hidden off the paths that let him carry more; P7 |

Not proposed: raising the clover cap (9) or new clover boxes (the economy around 9 works, `chapter-balance.md` "Depot
economy"); a second currency (Zlitos) or a casino (`ZEELICH_GAP.md` items 7 and 9: a system decision, larger than
this plan). Fewer new rewards are clovers: most are crystals, tools, shortcuts, lore and people's changes.

Also proposed for later (story risk, narrative developer first):
- **VENT-1 · The other three vents** (lore, 8 min, S–M): the carving in the Temple of Bù shows five vents, two of
  which the story opens. Three faint marks on Twinsun (the well cave's crystal wall, the bay rocks' warm stones, a
  crack below the Whispering Cliffs) read with Ilka's rule show where the others breathe; in the end card, the
  shield's five lines light. Risk: it adds story meaning to the vents; needs approval before anything is built.
- **EP-1 · The thanks round** (epilogue, 5 min, S): after dinner, each person the player helped has one closing line
  and a small gift where it fits (Bram's pump water, Snuff's roll, Pim's kite on the wind over Lhar, Raph's song);
  and the journal lists the favours still open, so Keep Exploring has a direction.

---

## 7. (e) First wave: the best play-minutes per build cost

Chosen for minutes per cost, with the thin regions and chapters first; Citadel, already rich, waits for the second
wave. Estimated minutes are for a player who does each item (estimate).

| # | Id | One line | Region · window | Est. min | Cost |
|---|---|---|---|---|---|
| 1 | COL-1 | twelve singing crystals: +1 max life each, the twelfth's catch in the core | all | (in the quests) +5 | S |
| 2 | HAM-1 | turn the pilgrims' waystone to face the shrine; a crystal in its niche | Hamalayi · 6+ | 7 | S–M |
| 3 | ISL-1 | sort Old Jaspa's warm gems by the dig's rule; a crystal | Knartas · 4+ | 6 | S |
| 4 | UND-1 | the humming crust in the galleries (fork, or lantern and ball); the last crystal | underground · 11, epilogue | 5 | S |
| 5 | ISL-3 | the Esmer line to the three rooms across the clouds | Otringal, Mosquibee · line | 6 | S–M |
| 6 | ZEE-1 | find where the capped heat goes and give it to the west end | Zeelich street · 3–9 | 9 | S–M |
| 7 | DES-1 | follow the standing figures' gaze to a buried survey cache; a crystal | Desert · 5+ | 10 | M |
| 8 | DES-2 | Rector Hougo's three rebound trials; practice for the core's plates; a crystal | Desert · 4+ | 12 | M |
| 9 | HAM-2 | mend Pim's kite with Lumi; he shows the goat path (a shortcut for chapter 10's ridge) | Hamalayi, Kesh · 6–7+ | 12 | M |
| 10 | HAM-3 | melt Yorna's brother's pack out of the glacier (flask or mirror); a crystal | Hamalayi · 7+ | 10 | M |
| 11 | C11-1 | place Baldino's two relays where they see both ways (main path) | underground · 11 | +5 main | M |
| 12 | C12-1 | the three allies' feeds at the deck ring between the bank shots (main path) | core · 12 | +4 main | M |

**Totals (estimates):** optional 77 min + about 5 min of crystal hunting = **about 1.4 h if a player finds and does
all of it**; a typical first player finds part of what is optional (how much is not known; section 8), so **about
0.8–1.2 h**. Main path: **+9 min** (chapters 11 and 12). Build: 4 S/S–M and 8 M (no L), roughly 4–6 weeks of
developer work in pairs of items, one region per worker so no two edit the same files (the Hamalayi items share
`hamalayi.js`: one worker).

Suggested second wave: CIT-1 + R-1 (the tune-ups and the tins: a kash sink and the hop-pack's return), ISL-2, CIT-3,
DES-3, ZEE-2, R-2, R-3, HAM-4, CIT-2, X-1, EP-1, then C12-2 and C12-3 (L), then VENT-1 if approved. All 27 together:
about 3.2 h if everything is found, 16 min of it on the main path (estimate).

Owners to involve (per the pack): narrative developer (flags, Yorna's brother, Raph, VENT-1, chapter 9's line),
clarity editor (every clue line and Look), UI/UX (the journal's lines, the holomap layer, the "n of 12" toast),
equipment designer (CIT-1, the tool targets), locomotion engineer (HAM-2, R-1), animation-combat (C12-1, COL-1's
balance), the laptop's art (the waystone's top, the drift and hatch, the hoist's foot), action-sound (new cues: the
waystone's grind, the relays' lamps, the bells).

---

## 8. (f) What cannot be known without a person playing

- **Whether the clues are noticed.** The figures' gaze, the dome seen from the waystone, the warm pipe at a post's foot,
  the gems' crust: each is a design judgment. The test bot knows every answer; a passing suite proves the steps work,
  not that a newcomer finds them.
- **How much optional content a player finds at all.** The added minutes apply only to what is found. Nothing here
  measures a discovery rate; the 0.8–1.2 h range is a guess around it.
- **The real minutes.** The formula (1.8 × the walk, 60 s a deduction, 200 words a minute) is uncalibrated against any
  person; the 4–5 h main-path figure itself is an estimate. Skill items (DES-2) vary the most.
- **Whether a reward feels worth the trip.** Especially the cross-planet errands (CIT-3, ISL-2): journey films on every
  crossing may make them feel long. Only play shows it.
- **Difficulty.** Max life 22 and the feeds inside the core fight change the finale's feel; the bot cannot dodge melee,
  so its numbers mislead in both directions.
- **Enjoyment and tone.** Humour, warmth and the moment with Vesk in the hoist can only be judged by a person.
- When the user plays any of these, their times and where they got stuck would calibrate the formula and this plan.

---

## 9. Shared tests and save rules for every proposal

Each `tests/depth-<id>.mjs` (player-input harness, one suite at a time, SwiftShader; Automated runtime only):
1. not offered before its window (the chapter set by its key and flags), offered in it, and its closing (where it
   closes) ends with its line;
2. every clue reached and read **by input** (walk to it, E, the line's key), in at least two orders where the design
   allows;
3. a failure: its line, nothing lost, a retry works;
4. the solution by input (and each alternate way from a fresh save);
5. the reward once (asking again gives no second reward), owed rewards survive a save before pick-up;
6. Save & quit mid-state → Continue restores it; death → Retry (full life, the user's rule) keeps it;
7. an old save (format 5 without the `dx_` flags) loads (`save-migration`), and a save from a later chapter catches up
   where a main-path step was added (C11-1, C12-1);
8. where geometry changed: `overlaps`, `slidetraps`, `jumpreach`, `door-sweep`, the region's camera walk;
9. the chapter suites and the playthrough segment of that chapter still pass (for C11-1 and C12-1: updated);
10. text: English only, and no night, evening or tonight in any new line (a grep over the new text keys).

Status of this document: **Not implemented** (design only). Next step: the user approves, cuts or reorders the list;
the coordinator gives the first wave to workers in pairs.
