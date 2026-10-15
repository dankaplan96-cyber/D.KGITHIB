# NEXT ACTION

0.28.0: weapons and gadgets (WPN-1; the user: "I want weapons and items/gadgets"). The blowgun and its Blowtron
upgrade, the Esmer laser pistol, the Wannie glove, the lightning spell; the meca-penguin, the protection ward, Arthur's
conch and a lantern, each earned in the world (Pippa's stall, Nara's case on Zeelich, Arthur, the School of Magic and
Bersimon, the old Wannie mine on Under Celebration, the dark gap and the boarded coal chute in the house cellar) and
used by input (the weapon wheel's diagonals, the attack key, E in the inventory). docs/COMBAT.md "The arsenal";
tests/arsenal.mjs. No jetpack (the story bible keeps flight out). Next: an independent review of WPN-1 (feel of the
shots by a human, the stalls' prices against what a first-time player has by then); ask the user how the new gear
plays.
ZL-ALL + CONNECT (after SD-1/SD-2): all of Zeelich and the travel network. The original's remaining Zeelich island
files identified from numbers (tools/lba2-islands.py): ASCENCE → the Lift Dock (new region), CELEBRA2 → Celebration's
later state (its risen figure added to Celebration), CITABAU = Citadel again, EMERAUDE/MOON = the Emerald Moon (not
wanted). Three places of our own (src/game/zplaces.js): Tralu Rock, the Nectar Orchard, the Old Watch. Zeelich is a
separate planet: Citadel Spaceport ⇄ Zeelich Spaceport by spaceship only; Esmer shuttles between Zeelich's places only;
on Twinsun the ferry (harbour ⇄ Desert Island's pier) and gliders (Citadel's plateau, Desert Island's beach, the
Hamalayi foothills), each open with its chapter (src/game/travel.js). The Holomap shows the planet he is on (VP-9).
Next: an independent review of ZL-ALL/CONNECT; follow-ups for the owners of other files: the harbour's ferry
timetable board (props.js/citydress.js) still lists ZEELICH sailings; chapter 10's glider menu (network.js) still
flies Hesk to Zeelich — both story-era crossings, the user may want them to read as spaceship/project-only.

0.27.0: twelve years on, fourth set: Zeelich's street (docs/TWELVE_YEARS.md; tests/zeelich-life.mjs). The old watch
house as Mother Snuff's bakery on the project's heat and The Second Bake side story, heat posts lit and promised,
the moles' burrow hatch, Mr Pelleck's re-tiled dome, Nara's held flowers. Next: an independent review of TY-4, then
the Hamalayi's twelve-year changes. A small chapter-10 hook (a line recalling the bakery's heat box) is left to the
owner of network.js/ch10.js. Ask the user how the street reads in their game.

0.26.0: twelve years on, third set: Desert Island (docs/TWELVE_YEARS.md; tests/desert-life.mjs). Kesh's cool room in
FunFrock's old blockhouse with its wind-catcher and The Wind-Catcher side story, Lumi's loom and sail, the sand
screens, Hesk's flag poles and yacht stop. Next: an independent review of TY-3, then the Hamalayi's and Zeelich's own
twelve-year changes (the brief's order). Ask the user how Kesh reads in their game.

0.25.1: the independent reviews' defects in both twelve-years-on sets fixed (REV-TY-1, REV-TY-2; QA.md "REV-TY-1/
REV-TY-2 fixes"): Nell's shop moved off the harbour path and open toward it, the garden's beds off the lane, Arthur's
bench in view, solid pipe/posts/trough, the pump's handle where his hands are, the board and meter follow the story,
rewards kept across a save, the boat box waits for chapter 2, the coupler's owner made plain; the Test Pair's races and
rules fixed and chapter 10's lines agree with it. Next: an independent re-review of these fixes, then Desert Island,
the Hamalayi and Zeelich's own twelve-year changes.

0.25.0: twelve years on, second set: Baldino's workshop (docs/TWELVE_YEARS.md; tests/workshop.mjs). The room shows
his years (the relay table, the old hoist, the mended fan, the tea experiment, the thunder box, Ilo's perch) and The
Test Pair teaches the network's limits in chapter 3 (relays by sight, couplers overheat). Next in the brief's order:
Desert Island, the Hamalayi and Zeelich's own twelve-year changes. Worth doing soon: make one chapter-10 station use
a rule the pair taught (e.g. the mill relay needs a clear line to the platform, or the bore relay's coupler needs
the vent's water). Ask the user how the workshop reads in their game.

0.24.0: twelve years on, first set (docs/TWELVE_YEARS.md): the family's house, The Old Pump, the harbour's trade and
The Mislabelled Shipment (tests/townlife.mjs). Next in the brief's order: Baldino's workshop (years of inventions,
the Zeelich engineers, an early practical task with the network's technology and its limits), then Desert Island,
the Hamalayi and Zeelich. Ask the user how the house and the harbour read in their game.

0.23.0: Zeelich's seven islands (src/game/zislands.js) and Citadel Spaceport (src/game/spaceport.js), flights from
chapter 4 (src/game/story/islands.js; tests/zislands.mjs, tests/spaceport.mjs). Next: ask the user how the islands
and the spaceport read in their game; then (their choice) people on the islands (Esmers, Mosquibees), ramps or
lifts between Mosquibee's ledges, and whether the story's chapter-2 crossing should leave from the spaceport.

Stabilization pass done (0.22.1; docs/lba3-production/QA.md, STATE.md). The whole main story plays by input from a
new game to Keep Exploring; 17 defects fixed (10 of them progression or save blockers the LOGIC tests missed).
Next: (1) ask the user to play 0.22.1 (the desktop build from the workflow) and to run pause → Benchmark on their PC;
(2) a human feel for the fights the bot needed help with (QA.md "Human-playtest items"); (3) then back to the engine
pass below (rooms, animation), and the contract's milestone 2 (one route at the quality standard).

Engine pass (the user, after 0.21.0: "enough LBA1; on with the engine, the animations, the transitions, the
rooms"). 0.22.0 did the door transitions (walk through, compile behind the black screen), the room camera's height
and the action/stop blends. Next: (1) rooms: hide what stands between the iso camera and the hero in the rooms
that aren't cut away (props, upper floors), the big rooms' camera framing; (2) animation: landings, turning on the
spot, NPC starts and stops, the kick in a robe; (3) the hitch on a region's first visit (Desert Island, the
Hamalayi): upload its geometry while the title is up.

LBA1 (the user's files, scratch only; docs/LBA1_CATALOGUE.md): the Spheros, the fat troopers and three rooms
(the asylum, the Temple of Bù's maze and halls) are in (0.19.0–0.21.0). Ask the user which LBA1 room or people come
next (Twinsen's LBA1 house, the Maritime Museum, the clone factories, the painted clones, Rabbibunny soldiers, the
tanks, the band, the elves), and how the rebuilt rooms read in their game. The converter is
$SCRATCH/lba1tools/extract.py (scratch, not committed); rerun it for a new room and add it to LBA1_AT.

Ask the user how the 0.14.0 characters read (also Zeelich's Esmers, Mosquibees and burrowers) in their game (Twinsen, Zoé, the Grobos and Rabbibunnies were rebuilt
after the original, docs/character-review.md §12), and to run the benchmark again (pause → Benchmark; it has a
per-feature breakdown at Medium) so the graphics can be tuned from it.
User (0.10.0 on Windows): combat animations not good, frame rate poor. 0.11.0 adds an in-game benchmark
(pause → Benchmark): ask the user for its report from their PC before further graphics work, then tune what it
shows (fill rate vs. geometry vs. CPU). Still open from the review: melee contact timing, starts/stops/landings,
character lighting (modern path), a cinematic skip/pause test; the Dino-Fly at Twinsen's home (asked for).
Earlier feedback (in order): character proportions as in LBA2
(Twinsen: bigger round head, bell-shaped robe; Zoé: blonde done, body too thin, head too small); animations
closer to the original (walk, run, idle, throw — timing and weight); confirm the start-up and the frame rate
on the user's PC with F9 (GPU name, startup build/shader times).

Story: chapters 1–10 are playable with tests; combat overhaul done (docs/COMBAT.md, tests/combat.mjs); the new-game
opening scene is in (docs/CINEMATICS.md, tests/opening.mjs).

0. Citadel on the original map: terrain, sites, Twinsen's house (outside and in), the lighthouse on the headland,
   the village houses, the street furniture, the trees and palms and the harbour (west end of the original's
   pier) are at the original's places (WORLD_MAP.md); the magic ball follows the original. Next: the Weather
   Wizard's tent on Wizard's lane (S21), the old citadel ruins and the Woodbridge cliffs (east). Then Zeelich on
   the original islands (Otringal, Knartas, Mosquibee, Celebration, Under-gas, the platform).
1. Visual remaster pass (stages 1–4 done; see docs/VISUAL_REMASTER.md "Remaining"): cliff bases and the
   shoreline, animation polish (idle variations, talk gestures), larger vegetation tiles, merging the
   station/depot/pipeline props.
2. Split chapter 'shell' into 11 The Shell / 12 The Core (five pylons, one per station).
3. Republish the playable artifact after the next milestone. Version 3 (chapters 1–10, combat, remaster stages 1–5) is
   published at https://claude.ai/artifact/EjPMQXPwbmre2kDevMC4tA. The file map is built from the tree (src, css,
   assets/poly, assets/music, bake.bin as assets/bake.wasm, and only the three.js addons the code imports).
4. Offline copy: `python3 tools/offline-build.py dist/LBA3-The-Awakening.html [--no-music]` builds one HTML file that
   opens from disk (all modules in an import map, assets in base64 blocks behind a fetch shim). Verified from
   file:// in headless Chromium: a new game starts and the music decodes. Rebuild it after each milestone.
   (Version 3 of the artifact was missing vendor/three/build/three.core.min.js, so it couldn't load three.js;
   version 4 adds it, verified on a local mirror of the published file set.)
5. Desktop app (desktop/, docs/DESKTOP.md): built and tested on Linux. GitHub Actions builds Windows/macOS/Linux
   installers into a pre-release (first run green on all three: release `desktop-build-1`, installer 141 MB,
   win zip 175 MB, dmg 254 MB, AppImage 159 MB). Confirm the Windows build on a real Windows machine (the user).
