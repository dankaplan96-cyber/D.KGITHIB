# Zeelich: what ours is missing compared with LBA2's

A gap list for the user to choose from. It describes places and life, not our chapter story. **Out of scope:** the
spacecraft, its flight and its interior (handled by the laptop).

**Evidence marks.** **(D)** the user's LBA2 files, read in scratch space only: `SCENE.HQR` (island, cube and actors of
each scene), `TEXT.HQR` (English banks 7 to 14, which belong to Zeelich's islands), `RESS.HQR` entry 44 (which body each
actor wears) and study renders of those bodies. The renders, extracts and screenshots stayed in `/dev/shm`. Nothing
original is quoted here. **(S)** the GPL engine source (`HOLOPLAN.CPP`, `EXTFUNC.CPP`, `COMMON.H`, `DEFINES.H`).
**(R)** `docs/LBA2_VISUAL_NOTES.md`, from the user's reference PDF. **(M)** memory of playing LBA2, not checked against
the data; treat it as a lead. **(O)** our code at HEAD and screenshots of the current build: the hub street and all eight
original islands, taken through the game's own `enterRoom`. **Web:** not available in this session, because the
walkthrough and encyclopedia hosts did not resolve. No claim below rests on the web.

## Summary: the biggest differences

1. **Zeelich has no lower world.** In LBA2 the planet has two layers. Otringal, Celebration's volcano, the Francos'
   island, the CX islet and the Francos' lift platform sit above the gas. The Wannies' island, the Mosquibees' village
   and the island under Celebration's volcano sit below it. The lower world is crossed by a ferryman over a sea of
   fire (D: banks 9, 10 and 14; scenes 96–106 and 129–132). In ours all eight original islands float in the same pink
   cloud sea under the same sky (O).
2. **The islands are empty.** Ours have no residents, guards, vendors or animals on any of the eight original islands
   or our three new ones. Only the hub street has people (O: zislands.js places no actors). In LBA2 these places hold
   about 23 outdoor scenes and about 80 indoor ones, full of people (D).
3. **No building can be entered on the islands.** LBA2's Zeelich has about 80 interior scenes: 38 on Otringal, 14 on
   the Wannies' island, 12 on the Francos' island, 7 at Celebration, 6 at CX, 5 at the Mosquibees' and 1 cave (D,
   counted from `SCENE.HQR`, without the later-state copies). Ours has 4 Zeelich interiors, and all of them are on our
   own hub: Baldino's workshop and the council's antechamber, chamber and archive (O).
4. **Three islands are misnamed or mis-cast.**
   - `PLATFORM.ILE` is the **Wannies' island**: a gem mine, the Building Company and the Wannie village, under the gas
     (D: scenes 96–101 and 111–126; S: the island list says "Blafards/Plateforme"). Ours dresses it as "the High
     Platform", an industrial deck.
   - `ASCENCE` is **the Francos' platform** with the lift down to the lower world (D: scene 120 links the Francos'
     island, scene 107, with the Wannies' island, scenes 98 and 123). Ours calls it "the Lift Dock", which is close,
     but its lift goes nowhere.
   - `KNARTAS` is **the Francos' island**: their village, the gazogem refinery and their harbour (D: bank 11). Ours keeps
     the harbour but none of the rest.
5. **Each island lacks its identity.** All of ours are built from the same Esmer house kit. The original pairs each
   island with one strong idea:
   - Otringal: a police-state capital on several levels, with lifts to an upper city;
   - Celebration: a volcano with a temple and a crater trail;
   - the Francos' island: a whole village digging for a lost relic;
   - the Wannies' island: a mine and a company town;
   - the Mosquibees: a great cocoon village anchored on the rock under CX;
   - CX: a forbidden fortress that nobody will take you to.
6. **Travel is impersonal.** Ours links every island by the same automatic shuttle menu. In LBA2:
   - talking cab drivers fly between the upper islands for a fare in Zlitos, and refuse to go to CX;
   - one lift joins the two layers;
   - in the lower world you sing a set verse at the end of a pier to call the ferryman, then pay him in gems.

   (D: banks 7, 8, 9, 11 and 14.)
7. **No Zeelich economy or signature mechanics.** LBA2 has its own money (Zlitos), gems as currency below the gas, coin
   machines that sell life and magic, a casino with slots, betting markers and a jackpot wheel, newspapers whose
   headlines change, and wanted posters (D, bank 7). Ours uses kashes and has none of these (O).
8. **Mood and music are uniform.** Ours plays the same two-piece Zeelich playlist everywhere, under the same pink sky
   (O: music.js; every island has `music: 'zeelich'`). The original gives the Zeelich scenes about 20 different music
   tracks (D: the scene headers' music field takes many values across islands 4–11). It also has a sky and palette per
   island (S: `RESS_SKYSEA4`–`10` and `RESS_XPL4`–`10`), and Otringal is overcast, misty and pale grey (R).
9. **Life is thin even on the hub.** The original's crowd includes: soldiers and police everywhere, tourists waiting
   for shuttles, bouncers, croupiers, a newspaper seller, miners, a choir, a nanny with babies, villagers digging with
   shovels and detectors, a mechanical owl, a poodle, guard dogs, fireflies and gas monsters (D). Ours has about 10
   named street people, a few guard dogs and the shuttles (O).

## Upper world (above the gas)

Sizes: S is days, M is about a week, L is several weeks.

| Original area | What's in the original | What we have | Missing or different | Size | Why it matters for "feels like LBA2" |
|---|---|---|---|---|---|
| **Otringal: harbour** (D: scene 87; ext. cube 6,8) | a pier with an old captain at its far end; cab ranks with talking drivers (fares of 5 or 10 Zlitos); Dark Monk revival posters and wanted posters; a rough bar by the harbour (see Interiors) | Otringal's ground and building footprints are the original's numbers; the shuttle lands near a plaza (O) | no pier life, no cab rank, no captain, no posters; the harbour reads as plain edge | M | the first stop in LBA2's Otringal; cabs and posters set the tone (a lively but watched city) |
| **Otringal: downtown and lower city** (D: scenes 88–90; cubes 7,7 / 7,8 / 7,9) | a service station (gazogem pump, empty when tankers are late); a casino tout at the door; a newspaper seller; police who stop you for running; carts and wheeled vehicles; guard dogs; a visitor from the lower world (D: wheeled-vehicle and dog bodies are in these scenes; their exact role is not confirmed) | **ours:** a paved plaza with a fountain, four market stalls, banners and a "Grand Hall" portico; benches and lamps; no people (O) | no service station, no casino front, no police, no traffic, no dogs; the market and the Grand Hall are ours | M | the original's Otringal is busy, bureaucratic and slightly sinister; ours is a quiet fair |
| **Otringal: upper city** (D: bank 7 names a lower and an upper city; its lifts are out of order at first; the Sups live there) | the elite district, reached by public lifts | the island is 164 m across and its ground reaches 33 m (D, our layout JSON), but our walkable area is the lower plaza; WORLD_MAP notes that the high ledges the original reached by its own means are left out (O) | **no lifts and no upper city**; the vertical city reads as cliffs | M–L | a city on stacked levels joined by lifts is a strong Zeelich image, and it rewards a return visit |
| **Otringal: astroport** (D: scenes 92 and 138; cube 8,9) | a landing field with shuttles, a control tower, a mechanic grumbling about a shuttle, guides who meet arrivals, Baldino's damaged vessel parked nearby (cube 6,9) | none on Otringal; our spaceport is on the hub (O) | the terminal **building** and its two halls (see Interiors). The craft itself is handled by the laptop | M | arrival on Zeelich happens here in LBA2 |
| **Otringal: Emperor's palace** (D: the tourist film mentions palace doors and a daily changing of the guard; M: not enterable) | the guard parade at the palace gate | — | no palace front and no parade | S–M | spectacle and authority; twelve years on it could be a ceremony of the new government |
| **Celebration Island** (D: scene 95; CELEBRAT, with CELEBRA2 as its later state, S: `FLAG_CELEBRATION`) | a volcano with lava; Dark Monk's statue rises from the crater for the ceremony; a temple of Dark Monk (see Interiors); a crystal outcrop on the volcano's side that needs a tool; a crater trail that was closed off; a souvenir seller selling small statues; cab stand | **ours:** the risen figure on a paved plaza, a festival (masts, pennants, a stage, two stalls), dark rock (O) | no crater, no lava, no temple, no crystal ledge, no seller; the festival is ours | M | the volcano and its temple are the planet's sacred centre; a festival alone has no sense of place |
| **The Francos' island** (`KNARTAS`; D: scenes 107–109; bank 11) | the Francos' village, where every villager digs for the lost relic; a gazogem refinery; the Francos' harbour; an owl in a wall niche; a burgermaster's house; a retired colonel's house; a treasure-hunters' bazaar; a cab stand; a poodle (D: body 371 in scene 109) | **ours:** the original's ground and buildings, painted as a harbour village (quay, skiffs, nets, a harbour light, laundry) (O) | no diggers, holes, spades or detectors; no refinery; no owl; no people | M | a village gripped by one obsession is pure LBA humour and gives the island a reason to visit |
| **The Francos' platform and its lift** (`ASCENCE`; D: scene 120) | the top of the lift down to the lower world; a hired assassin waits here once (D, bank 13) | **ours:** "the Lift Dock": decks on stilts, a lift tower with a working cage, a crane and a barge (O) | the lift **goes nowhere**; it is not linked to the Francos' island or to anything below | S (rename) to M (working lift) | the single gate between the two layers; LBA2's descent under the gas starts here |
| **The CX islet** (`ILOTCX`; D: scene 110 and interiors 177–182) | the Emperor's secret fortress; army shuttles fire on anything that comes near; every cab refuses to go; it is reached from below, through a passage behind the Mosquibee village | **ours:** a small outpost with a radio mast, a flag, a water tank and crates; an ordinary shuttle stop (O) | no fortress and no forbidden feel; anyone can fly there | M | the place nobody in the original comes back from; twelve years on, an abandoned fortress would be a strong site to explore |

## Lower world (under the gas): entirely missing as a layer

| Original area | What's in the original | What we have | Missing or different | Size | Why it matters |
|---|---|---|---|---|---|
| **The layer itself** (D: banks 9, 10 and 14) | islands under the gas; a sea of fire and lava between them; fireballs and lava pieces that a Wannie glove can catch and throw; gas monsters (M: a dark sky, red light) | **none:** our three lower islands sit in the pink cloud sea (O) | a separate environment: a gas ceiling, a fiery sea, a darker sky and fog, its own music | L | the strongest "this is Zeelich" contrast in LBA2: a bright official surface over a hot, hard-working underworld |
| **The Wannies' island** (`PLATFORM.ILE`; D: scenes 96–99 and 100–126) | the Building Company's yard at the gem mine; the ferryman's lane and pier; the Wannie village; soldiers at the company (D: about 6 guard bodies in scene 99) | **ours:** "the High Platform": cranes, cargo crates, barriers, warning signs, Otringal-style houses (O) | no mine, no company town, no village, no ferry pier; the wrong identity | L | a mine and company town is the lower world's heart, and the source of the gems behind gazogem |
| **The Mosquibee village** (`MOSQUIBE`; D: scenes 102–106 and 128; bank 8 describes a great cocoon anchored on the rock that carries CX) | the cocoon village on a tor, the Queen's hall, the test arena behind many doors, the passage up to CX | **ours:** a honey meadow above the clouds, with rows of hives, flower beds and a big hive (O) | no cocoon, no tor, no Queen's hall; the island reads as a farm, not a city of insects | M–L | a vertical insect city is one of LBA2's most memorable sights |
| **Under Celebration** (`SOUSCELB`; D: scenes 129–132) | the rocky island under the volcano; a cave by a waterfall where refugees hide; the ferry landing | **ours:** a gas works (a gas holder, a pump engine, pipes, caged lamps) under a slightly dimmer sky, and the old Wannie mine adit where the Wannie glove is found (O) | no waterfall cave and no ferry landing; the gas works is ours (keep or drop) | M | the volcano's underside joins the two layers visually (lava falls from above) (M) |

## Interiors

Scene numbers come from `SCENE.HQR` (D). Each room's identity comes from the dialogue it uses, from its location sign
or from the bodies of its actors. "?" marks a weaker identification.

| Original interior | Exists in ours? | How close |
|---|---|---|
| Otringal astroport: departure hall, with tourists waiting for shuttles to other planets and timetable announcements (78; 82 is an arrival hall) | no (our Zeelich Spaceport is an outdoor deck) | — |
| Otringal astroport: control tower and flight-plan room, with technicians, a restricted area and route tokens (85) | no | — |
| Imperial Hotel: a members-only lobby, a famous explorer in an armchair with his manicurist, and coin machines for life and magic (81); his private room (79) | no | — |
| The harbour bar of the city's underworld boss: a stage show, a weary performer, two bouncers, hostile regulars (136; later state 210); the boss's office (137) | no | — |
| A rough sailors' bar where off-shift workers complain (134 ?) | no (our Citadel tavern is on Twinsun) | — |
| A gambling house: an entrance with a 5-Zlito admission (147 ?); a hall with slot machines and four betting markers (135); a Super Jackpot room with a wheel to spin from a podium (133) | no | — |
| Twinsunian souvenir shop, whose keeper buys Twinsun goods, with a hidden meeting room downstairs (166) | no | — |
| A general shop selling life, magic, wind-up penguins, a wizard's diploma, a ferry ticket, an umbrella and a memory viewer (D: prices in bank 7; which room is not confirmed) | partly: Nara's case on the hub sells darts, penguins, a pistol and cells (O) | a different form: a case on the street, not a shop |
| A gallery or curio shop with fake paintings and an object found drifting in space (148 ?) | no | — |
| Newsroom or café with that day's papers (139, 150 ?) | no | — |
| Police station with cells (84); the jail cell shared with Joe the Elf (86); a chain of about 14 guarded rooms with guard dogs, an escape route (151–166) | no | — |
| Three rooms with pig-faced workers holding tools (154, 163, 217); purpose unknown | no | unidentified |
| Celebration: the Temple of Dark Monk, with prophecy murals, a devout reader and a door sealed by four fragments (93); bank 8 also has plaques on the four races | no | — |
| Celebration: inside the statue (a machine hall, the head's cage, a final arena; 185–192, 218) | no | the LBA2 finale's set; reuse only as a ruin, if at all |
| Wannies' island: the gem mine, with workers, lava and fireballs (100, 111; later state 214) | partly: our Wannie mine adit on Under Celebration is a dark entrance with the glove on a crate (O, story/arsenal.js) | the entrance only; there is no mine to walk |
| Wannies' island: the village interior (117); Wannie homes (112, 119); the firefly-tart cook's house (101); the housemaid's house with her note (116); the village elder's house (121) | no | — |
| Wannies' island: Dark Monk's chapel, with the old man who has its key (118) | no | — |
| Building Company: offices with a guard (124), the hangar or warehouse (122, 123), the jail block (125, holding Mosquibees, dissidents and a guard), and a bank counter where the manager expects deposits (D, bank 9; room not confirmed) | no | — |
| Mosquibee village: the Queen's hall (104; later state 215); a cocoon dwelling (106); the test arena of many doors (128, with about 65 actors); the passage toward CX (176); a small room (149) | no | — |
| Under Celebration: the hideout cave by the waterfall (129) | no | — |
| The Francos' island: the treasure-hunters' bazaar (171); the vineyard owner's place, with a drunk regular (172 ?); the colonel's house, where a potion should locate the relic (173); the nursery full of crying babies (174); the late burgermaster's brother's house, with a locked closet of stuffed gas monsters (175); 7 more rooms (140–146: houses, perhaps the refinery, with dogs in 143) | no | — |
| CX: corridors with guards (177, 178, 221); barracks (179 ?); a hall (180 ?); the Emperor's control room (181); the hangar of his personal shuttle (182) | no | — |
| The Esmer spaceship interior (41) | — | handled by the laptop |
| **Ours, not in LBA2:** Baldino's workshop; the council's antechamber, chamber and archive (upper.js) | yes | ours (LBA2's Baldino parks his vessel on Otringal; he has no workshop there) |

## Life: races, people, vehicles and ambience missing

**Peoples.** The data names four races and calls them all Esmer races (D, bank 8): Mosquibees (in the lower world), Wannies (gem
miners in the lower world), Francos (refiners on their own island) and Sups (the intellectual elite of Otringal's
upper city).

| Original | What the data supports | Ours |
|---|---|---|
| Capsule-bodied people | the most common townsfolk in the data: citizens, staff, police, soldiers on Otringal, and the Francos' diggers (D: bodies in scenes 82–92 and 109) | our "Esmers" (Nara, Oku and others). In LBA2 "Esmer" covers all Zeelich peoples, not one race. Rename them Francos, or keep the name: the user decides |
| Robed, long-snouted folk | they appear in the Wannie mine and village, and one on Otringal says he came up from the lower world, so they are the Wannies (D, medium confidence) | our "moles" (Old Grumm, Mother Snuff), who live in burrows: an easy fit for "Wannies" |
| Tall, triangle-headed folk | they appear only on Otringal and the spaceship; possibly the Sups (D weak, M) | our "triangle-headed townsfolk" (Mr Pelleck, Tavo) |
| Mosquibees | a Queen, soldiers and villagers, about 25 of them in one scene (D) | Bzizz and Madam Zuzzara on the hub; none on Mosquibee Island |

**Notable LBA2 characters tied to places** (D): an underworld boss and his two bouncers; a famous explorer at the
Imperial; a retired colonel who deals in unscientific sciences; the Francos' late burgermaster and his brother; the Wannie
elder ("the Monk") and his choir boy; the firefly-tart cook; the ferryman; the Mosquibee Queen; the Emperor; a woman
with a poodle; cab drivers (one names his cab); a survivor of CX who now sells souvenirs; Joe the Elf (in Otringal's
jail). Twelve years on, several of these could return older and changed: our idea, for the user.

**Vehicles and transport** (D unless marked):
- flying cabs between the upper islands (M: they fly); missing in ours;
- the lift between the layers; ours has a lift that leads nowhere;
- the ferryman over the fire sea, called by a song and paid in gems; missing;
- Esmer shuttles at the astroport; ours are the inter-island shuttles;
- gazogem tankers (only mentioned); missing;
- army shuttles over CX; missing;
- wheeled street vehicles on Otringal and the Wannies' island; missing;
- the Emperor's personal shuttle; missing.

**Ambient life:**
- police and soldiers on patrol, who notice a running hero;
- tourists from other planets;
- guard dogs (D: Otringal scenes 90, 151, 153, 156 and 162; the Francos' island, 143);
- birds and a mechanical owl (D: body 375; the Francos' island);
- fireflies, which the Wannies catch for their tart;
- gas monsters (D: mentioned often; body 460 is a large spiked monster);
- cab and shuttle traffic.

Ours has guard dogs (hub only) and shuttles crossing the sky (O).

**Signature place mechanics:**
- the lifts (Otringal's upper city; the layer lift);
- the ferry song;
- Zlitos, and gems as fare;
- the coin machines for life and magic;
- the casino games;
- newspapers and posters that change with events;
- the Wannie glove catching fireballs (ours has the glove: O, story/arsenal.js);
- a crystal that needs a tool to break off;
- a pick-axe for digging.

## Things we have that the original doesn't (keep or drop: the user decides)

- **The terminal island hub** (zeelich.js): the spaceport deck, the Esmer street with its fountain and market, three
  wind-mills and the old mill, the project depot, the drill platform, the dog-training yard, Snuff's bakery in the old
  watch house, the heat posts, and the council's upper district. The story is set here.
- **Baldino's workshop on Zeelich.** In LBA2 he lands his vessel on Otringal.
- **Our three islands:** Tralu Rock (a trading post), the Nectar Orchard and the Old Watch (zplaces.js).
- **New identities given to original islands:**
  - the Celebration festival around the risen figure;
  - Under Celebration's gas works;
  - Mosquibee Island as a honey meadow;
  - the CX outpost (a mast and a water tank);
  - "the High Platform" industrial deck;
  - the Lift Dock's barge and crane.
- **The shuttle network** linking every island directly (in LBA2: cabs, the lift and the ferry).
- **The pink cloud sea and the pink sky on every island** (LBA2's Otringal is overcast and grey (R); its lower world is
  dark (M)).
- The zone givers on our islands. LBA2 has zone givers too, so these are not new, only placed on our own spots.
- **Open lore question:** does the gas layer still exist twelve years on? LBA2's prophecy links the gas and its
  monsters to the ceremony. The data I read does not say whether the ending cleared them. The answer decides whether
  the lower world returns as it was, half cleared, or as ruins.

## Suggested priority (the most "this is Zeelich" for the least work)

1. **Put people on the islands** (M, cloud). Reuse the hub's four peoples, its walker code and its dogs:
   - Otringal: police, a newspaper seller, tourists and cab drivers;
   - the Francos' island: diggers with spades and detectors, holes in the lawns, the owl;
   - Celebration: a souvenir seller and pilgrims.

   This is the largest felt change at the lowest risk.
2. **Fix the names and boards** (S, cloud). `PLATFORM` becomes the Wannies' island, `ASCENCE` the Francos' platform and
   `KNARTAS` the Francos' island, in `BOARD_NAME`, in WORLD_MAP and in the island menu text. Also decide the "Esmer"
   and "moles" naming.
3. **Give the lower world its own look** (M for the look, laptop; S for the hook-up, cloud). Use a separate environment
   for the Wannies' island, Mosquibee and Under Celebration: a gas ceiling overhead, a fiery sea, a dark warm sky and
   fog. Reach it only through the Francos' lift, and keep the shuttles above the gas.
4. **Characterful transport** (S–M, cloud, with a small model from the laptop):
   - a flying cab with a driver who talks, and refuses CX, between the upper islands;
   - the ferryman below the gas, called by his verse and paid in gems.

   Both can reuse the shuttle menu.
5. **Four landmark interiors** (M each, laptop): the harbour bar with its stage show; the gambling house's jackpot wheel
   room; the Temple of Dark Monk on Celebration; the Wannie chapel or the firefly-tart house. The team already rebuilds
   LBA2 rooms from numbers (tralucave.js, the Citadel interiors), so the same method applies.
6. **Celebration's volcano** (M, laptop): the crater, the lava glow, a crystal ledge and the temple's front, alongside
   or instead of the festival.
7. **Otringal's lifts and upper city** (M–L, laptop for the art, cloud for the doors). Twelve years on the Sups' upper
   city could be where our council sits: a hook only, not plot.
8. **A sound per area** (M, music worker): at least an Otringal, a lower-world and a Mosquibee piece. The engine source
   ties the Mosquibees' theme to the credits.
9. **Systems** (S–M, design decision): Zlitos and gem fares; coin machines; papers and posters that change; a small
   gambling game.
10. **Big sets** (L, laptop): the Mosquibee cocoon village on its tor; the Wannie mine and company town; CX as an
    abandoned fortress.

## Who builds what

| Laptop (world art, new interiors) | Cloud (story hooks, NPC life, systems) |
|---|---|
| the lower-world environment (sky, gas ceiling, fire sea, fog) | NPC placement, routines and lines on every island (the walkers and dogs we already have) |
| Celebration's crater, lava and temple; the Francos' refinery and dig holes; the CX fortress | renaming the islands, boards and menus; the lift and ferry travel logic; cab drivers |
| Otringal's lifts and upper city; the harbour pier and the astroport terminal building | optional local quests in the original's spirit (a lost key and an owl, a firefly tart, a relic hunt), built on our own facts |
| interiors: the bar, the jackpot room, the hotel lobby, the temple, the chapel, Wannie homes, the Queen's hall | Zlitos or gems, coin machines, newspapers and posters that change with game state |
| the Mosquibee cocoon village; the Wannie mine and company town | a twelve-years-on version of each original NPC (who is still there, what changed) |
| the flying cab and the ferry boat models | music cues per area (with the music worker) |
