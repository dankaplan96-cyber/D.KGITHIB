# STORY MAP (implemented quest paths)

The story itself (characters, themes, the twelve-chapter plan) is in ../../STORY_BIBLE.md; the places are in
../../WORLD_MAP.md. This file lists the main path as it is implemented in the current build, step by step, with
the chapter module and the player-input test segment that plays it. Results of the latest player-input run are
in QA.md ("Story and progression").

Chapter order (src/game/story/index.js ORDER, saved as flags.chapterKey; the number is the one shown to the
player): well 1 → project 2 → zeelich 3 → dig 4 → steam 5 → pass 6 → observatory 7 → evacuation 8 → council 9 →
network 10 → shell 11 (with the Core, 12, inside it for now) → home (epilogue, then Keep Exploring).

| Chapter (module) | Main path as implemented | Segment |
|---|---|---|
| 1 The Well (`well`, prologue.js) | Home, the ball from the cupboard; the well is dry; Gilbert's key; Xil's rope (Doran's stamp); overhear the kids in Discreet mode; Tim confesses; down the well. In the cave: mites, the three crystals woken with the ball, the barrier, Sendell. | 01, 02 |
| 2 The Joint Project (`project`, chapter1.js) | Zoé at home; the ferry and Vesk at the harbour; the Water Office's pipe map; three bypass valves: the depot (guards, drones, a dog), the caged orchard valve (a lob from the east), the Whispering Cliffs (target → stones rise → hop up); the water returns; Vesk's station tour; Zoé's office segment (stealth past the guard, the evacuation plan); the confrontation at the beam pad; Arthur's radio; Doran's ferry to Zeelich. | 03, 04, 05 |
| 3 Zeelich (`zeelich`, chapter2.js) | The plan confiscated at the dock; Baldino's workshop; the depot locker (code cylinder, the plan back); Oku agrees; the cog atop the old mill; the three mills braked with the ball; the override key; Zoé at the lighthouse (dials sun, wave, star); the platform shield; Vesk goes down the shaft. | 06 |
| 4 The Dig (`dig`) | Mother Tarra and the wind-pump's three gears (ball); Hesk and the rope; the sand-yacht to Ilka's camp; the notebook from the research post in a sandstorm; the dig's gate; the terraces; three seals (ball); the Temple of Bù; the great carving. | 07 |
| 5 Steam and Sand (`steam`) | Brosk's jar; oasis water; the shovel; dig out FunFrock's condenser hall; the diagram; the old trooper; valves 1, 3, 4; the hangar (glider, hatch by ball); Dallan; the relief valve; out before the vent blows; Tarra; Hesk's glider north. | 08 |
| 6 The Pass (`pass`) | Fell the frozen tree over the gorge (ball); Lhar; Yorna; the heating station needs a fuse; Pim's kite (ball) → the fuse; heat on; the frozen mooring rope (sword); two winch trips (ice mites between); ride up; the monastery. | 09 |
| 7 The Observatory (`observatory`) | Up to the observatory; the keeper; three mirrors carry the light; the telescope; the heavy drone at the vent (ball); the vent opened; back to the monastery gate. | 10 |
| 8 Evacuation (`evacuation`) | Home to Zoé; Gilbert's tunnels; the fortress shelter's lever; the depot bunker's wheel (ball); Mira's water; Pippa's supplies; Zoé's run to the hill farms; the lighthouse relay; the control room; a project ship to Zeelich. | 11 |
| 9 The Council (`council`) | Street folk; Baldino's petition; Nara's stamp; Oku's stamp (free three mills: ball); the council house; the clerk; the hearing; the archive in a borrowed coat (the BORE cabinet); back to the council. | 12 |
| 10 Baldino's Network (`network`) | Five relays: the old mill (Zeelich), the valve room and the lighthouse (Citadel, by Hesk's glider), the bore (Desert Island, drones), the dome (Hamalayi, telescope); back to Zeelich. | 13 |
| 11–12 The Shell + Core (`shell`, chapter3.js) | The bore's machinery (cooling diagram, valves A and C, ball switch for the ladder); crystal galleries (three pillars: ball); Sendell; the core: the guardian, three pylons from their plates, Vesk's overload coil. | 14 |
| Epilogue (`home`, epilogue.js) | Dinner at home; the end screen; Keep Exploring (free roam, new lines everywhere). | 14 |

Continuity notes kept by the story code: FunFrock stays dead (his old machines and troopers are reactivated by
Vesk's project); Vesk is the villain; no Earth-style night; no sequel promise in the epilogue. Saves keep the
chapter key, so a save made inside any chapter resumes in that chapter (save-migration test, tests/zoe-resume.mjs
for Zoé's segment).
