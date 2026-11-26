# STORY MAP (implemented quest paths)

The story itself (characters, themes, the twelve-chapter plan) is in ../../STORY_BIBLE.md; the places are in
../../WORLD_MAP.md. This file lists the main path as it is implemented in the current build, step by step, with
the chapter module and the player-input test segment that plays it. Results of the latest player-input run are
in QA.md ("Story and progression").

Chapter order (src/game/story/index.js ORDER, saved as flags.chapterKey; the number is the one shown to the
player): well 1 → project 2 → zeelich 3 → dig 4 → steam 5 → pass 6 → observatory 7 → evacuation 8 → council 9 →
network 10 → shell 11 → core 12 (two chapters since save format 5, both in chapter3.js: `Chapter3` and `ChapterCore`) → home
(epilogue, then Keep Exploring).

| Chapter (module) | Main path as implemented | Segment |
|---|---|---|
| 1 The Well (`well`, prologue.js) | Home, the ball from the cupboard; the well is dry; Gilbert's key; Xil's rope (Doran's stamp); overhear the kids in Discreet mode; Tim confesses; down the well. In the cave: mites, the three crystals woken with the ball, the barrier, Sendell. | 01, 02 |
| 2 The Joint Project (`project`, chapter1.js) | Zoé at home; the ferry and Vesk at the harbour; the Water Office's pipe map; three bypass valves: the depot (guards, drones, a dog), the caged orchard valve (a lob from the east), the Whispering Cliffs (target → stones rise → hop up); the water returns; Vesk's station tour; Zoé's office segment (stealth past the guard, the evacuation plan); the confrontation at the beam pad; Arthur's radio; Doran's ferry to Zeelich. | 03, 04, 05 |
| 3 Zeelich (`zeelich`, chapter2.js) | The plan confiscated at the dock; Baldino's workshop; the depot locker (code cylinder, the plan back); Oku agrees; the cog atop the old mill; the three mills braked with the ball; the override key; Zoé at the lighthouse (dials sun, wave, star); the platform shield; Vesk takes the lift to his ship's berth and flies home to Twinsun (his ship seen leaving); the platform console: hours later the shaft at Citadel's station reads SEALED FROM BELOW (Arthur on the project's channel, Zoé from the lighthouse saw the ship land in the old fort). | 06 |
| 4 The Dig (`dig`) | Mother Tarra and the wind-pump (Brosk's tremors, Sani's clack-clack-grrrk, a gust at the tower, the jammed gear by ball, the shaken pipe joint); Hesk and the rope; the sand-yacht to Ilka's camp; the notebook from the research post in a sandstorm; the dig's keypad (the notebook's order of the worn keys); the terraces; three warm discs of five (ball); the Temple of Bù; the great carving. | 07 |
| 5 Steam and Sand (`steam`) | Brosk's jar; oasis water; the shovel; dig out FunFrock's condenser hall; the diagram; the old trooper; valves 1, 3, 4; the hangar (glider, hatch by ball); Dallan; the relief valve; out before the vent blows; Tarra; Hesk's glider north. | 08 |
| 6 The Pass (`pass`) | Fell the frozen tree over the gorge (ball); Lhar; Yorna; the heating station needs a fuse; Pim's kite (ball) → the fuse; heat on; the frozen mooring rope (sword); two winch trips (ice mites between); ride up; the monastery. | 09 |
| 7 The Observatory (`observatory`) | Up to the observatory; the keeper; three mirrors carry the light; the telescope; the heavy drone at the vent (ball); the vent opened; back to the monastery gate. | 10 |
| 8 Evacuation (`evacuation`) | Home to Zoé; Gilbert's tunnels; the fortress shelter's lever; the depot bunker's wheel (ball); Mira's water; Pippa's supplies; Zoé's run to the hill farms and down to the lighthouse; the relay; the control room; a project ship to Zeelich. | 11 |
| 9 The Council (`council`) | Street folk; Baldino's petition; Nara's stamp; Oku's stamp (free three mills: ball); the council house; the clerk; the hearing; the archive in a borrowed coat (the BORE cabinet); back to the council. | 12 |
| (expanded campaign, `expansion/ballastra` only) 10 Borrowed Time (`throttle`, story/throttle.js) | OREN-GUARDIAN OG-1 "A Steady Hand" (BR-1…4 not built yet): after the vote Mira calls the council chamber on the lighthouse relay, the ship home; the Water Office, Mira takes him down to FunFrock's valve room; the hammer: a wheel opened while it kicks bleeds the kick (three times; between kicks it kicks back); the Balance Works governor rings and Oren holds the mains on green; the fortress shelter: Gilbert, Tim and Lulu thank him and Oren; Baldino calls; the ship to Zeelich → the network (now chapter 14; chapters 11-13 are still empty shells). | tests/oren-first.mjs |
| 10 Baldino's Network (`network`) | Five relays: the old mill (Zeelich), the valve room and the lighthouse (Citadel, by Hesk's glider), the bore (Desert Island: drones, then Dallan stands Vesk's guard down and FunFrock's clone and sentry are fought), the dome (Hamalayi, telescope); Hesk's glider to Citadel, on foot into the station's yard: Baldino's code box at the bore's collar sends the code, the blast doors open. | 13 |
| 11 The Shell (`shell`, chapter3.js) | Down the shaft from Citadel's station (its lift comes back up beside the collar); the bore's machinery (cooling diagram, valves A and C, ball switch for the ladder); crystal galleries (three pillars: ball); Sendell. Ends at the door from her chamber to the core. | 14 |
| 12 The Core (`core`, chapter3.js `ChapterCore`) | Chapter 12's card, Vesk, the guardian, three pylons from their plates (Zoé, Mira, Oku by radio), Vesk's overload (Ilka and Dallan bleed it through the desert vent, Pim and Sefa hold the dome's relay, by radio), his coil; Twinsen pulls Vesk clear of the sparks or leaves him for the guards (the end card and Baldino remember it); shield mode. Saves before format 5 (one chapter 'shell') go to `core` when saved in the core room or with the fight begun. | 14 |
| Epilogue (`home`, epilogue.js) | Dinner at home; the end screen; Keep Exploring: everyone back where they live with a line about it (Citadel, Zeelich, Kesh, Lhar), Baldino's workshop, Sefa's dome and the lighthouse's lamp room open. | 14 |

Optional side trip (any chapter from 1, story/sewers.js, flags `sw_`): Under the Street. A knocking under the grate north of
Twinsen's house and Arthur's chalk on its frame; lifted, the old lift under it ("Go down" on its deck: it lowers him down
the shaft, and brings him back up the last stretch on the way out; SEWER-LIFT); the old sewer hall (the project's valve jams the gate winch; easing it
raises the gate); the treasure room (star chest, Arthur's map, one clover); back home, Arthur asks to come next time.
Test: tests/sewers.mjs.

Continuity notes kept by the story code: FunFrock stays dead (his old machines and troopers are reactivated by
Vesk's project); Vesk is the villain; no Earth-style night; no sequel promise in the epilogue. Saves keep the
chapter key, so a save made inside any chapter resumes in that chapter (save-migration test, tests/zoe-resume.mjs
for Zoé's segment).
