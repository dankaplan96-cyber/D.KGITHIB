# AUDIT-FIX: the open findings of RELEASE-AUDIT-v96

17.11.2026, branch `worktree-agent-afca2a163fb271a41` from `20b5da55` (the coordinator's `ccr-c1c2c4b9-dep6ed`, with
A-1, A-2 and A-12 already fixed there). **Automated runtime only**: headless Chromium on SwiftShader (Playwright,
`--use-gl=angle --use-angle=swiftshader`), served from the snapshot `/dev/shm/t983` (lba3 without tools/music/soundfonts,
node_modules, captures; `python3 -m http.server 8983`), one browser at a time on a machine shared with another worker.
Nobody played, nobody listened; no frame rate is claimed. Pictures: SwiftShader frames, looked at by the worker.

## Findings

| Finding | Status | What was done | Files |
|---|---|---|---|
| **A-3** the playthrough chain stopped three times on harness faults | **fixed** | See "A-3" below. The chain 01 → 14 ran from a new game to the end with the harness as committed, no override file: see "The chain" | `tests/lib/player.js`, `tests/playthrough/05-project-b.mjs`, `tests/playthrough/11-evacuation.mjs`, `src/game/story/pumpline.js` |
| **A-9** Hedda and Tobin's spot by the neighbours' door | **fixed** (the game's) | Their home spot 2.3 m out from the door and north of it (the landing's side), off its approach (the door-clear rule: the trigger's 0.9 m and 1 m); it was 1.7 m out, one either side of the door. In the chain Zoé talked to them from 2.4 m off the door and walked on to the landing without going in | `src/game/story/laneline.js` |
| **A-7** worldfit worse than v75 | **fixed** (z-fighting, floating); openings **left** | worldfit's z-fighting patches ≥ 0.15 m² **38 → 0** (v75: 20); floating buildings **1 → 0**. Openings 5 (as on v96): see "A-7" | `src/game/island.js`, `world.js`, `zeelich.js`, `zeelife.js`, `skyferry.js` |
| **A-11** the lone stone post in the water west of the L pier | **fixed** | It was one of ten spurious posts the harbour's railed runs made (see "A-7"); the harbour's posts now stand only along their runs | `src/game/island.js` |
| The Desert dig rod's hollow (cosmetic) | **fixed** (Source and a height probe; no picture) | See "The desert hollow" | `src/game/desert.js` |
| **P49** (the user's report, 17.11): grass and a dirt path on the new quay's paving by the PIER signpost and the FERRY board | **fixed** | The quay's paving stopped a metre short of its east face and the harbour yard's began 3.5 m further east: between them the old harbour path's dirt and the grass beside it showed, cut straight. Both now meet at the quay's face. The signpost's PIER arm points west, along the stone pier's arm (it runs west from the quay at z 41.4–44.6; the post stands at z 41.6): left as it is | `src/game/world.js` |
| **P52** (the user's report, 17.11, "it's hollow": a round drum with a bronze hub inside a teal X-braced frame on a hazard-bordered plate floor, open to the camera) | **fixed** | The project station's bore on Citadel (`island.js`, the station: the shaft collar under the derrick, the rotary table's brass hub over it, the core's cyan glow inside): a ring 2.0 m round open at the top, so from the play camera inside or beside the derrick one looked into it. Now a dark steel grating over the shaft at the collar's lip (a ring, bars every 0.3 m, a hole for the drill string); the glow shows between the bars. The collar's collider (2.85 m round, 1.4 m high) was always whole: he could not walk in. The user's picture did not reach this worker; the place was found from the coordinator's description and matched by the play camera's pictures (`ch1-2-p52-station-bore-{west,south}-{before,after}.jpg`) | `src/game/island.js` |
| **P57** (the user's report, 17.11, "Twinsen is hidden": the Follow camera right behind a teal riveted hut wall with a porthole, he only as his outline, the derrick and the beam pad beyond) | **not reproduced; left** | The place is the project station's yard in the fort (the office and control huts, `island.js` `techBuilding`, which already give the camera their shape: `addOccluder`). Searched by the play camera, Follow, the tests' setup: out of both huts' doors (as a scene change places him, 0.3 s and 3 s), six walks round and between the huts (`hutwalk.mjs`: his sight lost for more than 0.5 s only at the fort wall's west corner, the wall's pier between, not a hut), and 87 of 351 grid spots (1.5 m, three northward headings, 2.5 s standing; `hutscan.mjs`) where a hut stands under the line or the camera reads him hidden: at every one the camera stood over the hut's roof (y 20.5–24, the roof's top 20.2) and saw him, or read him hidden by the fort wall. A camera standing low behind a hut's wall was not met. Without the user's position (or a save there) no fix was made: a blind change to the Follow camera's rules round these huts would risk the framing camsteady and camcitadel pass. Needed: the spot or a save | — |
| **A-6 / F-8** the camera inside round crowns | **fixed for the round and fruit crowns**; awnings and sails **left** | See "A-6" | `src/engine/camera.js`, `src/game/world.js` |
| **A-4** the Hebrew minors | **fixed** | `c4_kid_pump`, `c4_kid_pump2`, `c4_j_sani`: "מקלקלים" (breaking) → "מקישים" (clacking), "לא אחד מאלה שמקישים!"; `c3_toast_coil`: "לפגוע עם הכדור בסליל הזוהר שמעל הקונסולה של וסק"; `pr_barrel_hit_ar`: "(עוד לא שכחתי. שמישהו יספר לטים.)"; `c4_ilka_down`: "טיפסו ברמפות"; `pr_j_deep`: "עמוקה מכדי לקפוץ"; `t2_zoe_close`: "מספיק טוב. קדימה, לבאר." `he-text.js` rebuilt (`node tools/he-bundle.mjs`); `dialogue-check` PASS (Static) | `src/game/text/he/{ch3,ch4,opening,well}.js`, `src/game/he-text.js` |
| **A-13** KNOWN-FAILING.md stale | **fixed** | Rewritten from the audit's table and these runs, each with its cause where known | `docs/lba-maturity/KNOWN-FAILING.md` |

## A-3: the harness

1. **05 "behind the pier"**: the walk to the upper cock's front now ends within 0.2 m (was 0.5 m; the game's alcove line
   is 0.39 m before that front, and the bot stopped 5 cm short every run). In the chain: `seen: true` at x 9703.70. Game
   side, for a player who turns the wrong cock from short of the line: that cock now also marks the bypass seen, so the
   objective moves on (`pumpline.js`).
2. **05 "Zoé: out"**: the office's exit is walked to only while she is in the office (reaching it ends her part and the
   scene puts Twinsen outdoors). And `P.through` (player.js) now refuses a point inside a room he is not in (rooms are
   built 1 km and more from the island: such a walk crossed Citadel and went off the east cliff by the beam pad).
3. **05's Retry path**: "Zoé at the gate" and "the lockers" return `skip` once her part is over, so a Retry from the
   autosave at its end no longer replays them into `G.room.exits` of null.
4. **11 "to the landing"**: the walk goes out again through the room's exit if a door took Zoé in (three tries; it did not
   happen in the chain, since A-9 moved the givers).

## A-7: worldfit

Before (this branch's base, `/dev/shm/t983-logs/worldfit-before.txt`): 3 visual fails: floating 1 (Doran's shed 0.21 m),
openings 5, z-fighting 38 (Citadel 12, Zeelich 26). After (`after-worldfit.txt`, the final run below): floating 0,
z-fighting 0 (114 smaller ones listed, not judged), openings 5.

- **The harbour's walls** (`island.js` `wallRun`): at each convex corner (the arm's west end, the leg's tip, the quay's
  south-east corner, the platform's south-east corner) both runs' copings and wall tops covered the same 0.6 m square and
  flickered (the largest patches, "harbour:merged", 0.25–0.65 m²). A run that starts at such a corner now starts its
  coping past the other's, its wall top 6 mm lower; the corner's post is shared, 0.45 m in from both faces (each run's end
  post stood on the other run's face line, half over the water). And a railless run's gap `[-1, 99]` made posts at
  u = −1 and u = 99: ten posts a metre before a run's start or 99 m along it — in the water by the leg's tip and south of
  the quay (**A-11**'s post), on the pier's deck at the elbow, and further off. Gap ends now make posts only inside the run.
  The arm's and the leg's paving end 0.2 m in from the end walls' faces.
- **Doran's shed** 0.45 m north: CITADEL-ORIG-2's straight cut before the quay's south face drops the ground from 0.6 m
  behind the shed's back wall (the terrain's 0.93 m grid between the quay and the water).
- **The practice target**'s painted faces 7 mm off the straw butt (2 mm: they flickered).
- **Zeelich**: the street's kerb stones 1 cm outside the street's edge (the two edges' faces coincided along the whole
  street: 16 patches); the fresh cobbles across the street 5 mm over the kerbs; the sky-ferry's winch hut's front walls
  between its side walls (they doubled the corners); the Mill Lane stage 1 cm over the shore's paving.
- **Left**: the five opening findings (the neighbours' door over a window, v75's; Zeelich house 3's window into its corner,
  v75's; Zeelich house 1's, house 4's and Baldino's workshop's doors, whose TECH-ART-1 surround overlaps the wall lantern by 5 cm — there is no room for the
  lantern's 26 cm between the surround and the window: moved 6 cm it overlapped the window by 4 cm, so it was put back).
  Owner: world-art.

## A-6: the crowns

The round and fruit trees' crowns counted for the camera's sight lines as a cylinder 1.5 m round from 1.95 m to 3.85 m.
Measured on the crowns' meshes (every variant, both LODs, `vegetation.js`): 1.75–1.9 m round from 2.3 to 3.5 m, 1.4 m
at 2.0 and 3.9 m, from 1.8 to 4.1 m: the leaves stood 0.3–0.4 m outside the cylinder, so a camera with its arm's end in
them read him as seen (camcover's crown spot). Now their shape for the camera is that leaf mass, a round flattened at top
and foot, `(d / r)² + (h / half)⁴ < 1` (`world.js` SIGHT `bulb`, `camera.js` `_line`). Crowns still count only once he has
stood still (CAM-COVER's `soft`), now after 1.0 s instead of 0.6 s: with the larger shape, at camsteady's start beside a
tree by the house walls the arm lifted over the crown after 0.6 s and dropped back as he walked on (height jitter 3 → 7,
a new failure); at 1.0 s that route measures as before.

| Suite | Before (base) | After |
|---|---|---|
| `camcover` | 11/12 (the seeded crown spot (−158.4, 9.8, −24.5): read as seen while the crown hid him) | **12/12** (13 of 16 seeded spots under a crown's edge, each read as hidden, his outline drawn) |
| `camsteady` | 105/110 | **105/110**, the same five checks (KNOWN-FAILING.md) |

The default framing: unchanged (the arm, the distance, the pitch; the crowns count only when he stands). Pictures,
chapter 2's Continue on the cliff plateau: 0.5 s and 6 s after it, before and after — the camera settles to the same
place (within 2 cm) both times; at 0.5 s it is mid-swing.

**Left**: Kesh's door awnings (2.4 × 1.4 m cloth), the old mill's sail and Ilka's yacht sail have no shape for the camera
at all (the desert stall's and the research post's awnings have one, and it matches the drawn cloth: 1.65 × 0.85 against
1.6 × 0.8, 1.3 × 0.78 against 1.25 × 0.73). Giving them one is new camera behaviour, not a matching radius: the camera
owner's.

## The desert hollow

Desert Island's ground grid (`desert.js` `groundGrid`) let a hollow below the water line stand inland, so the sea's flat
sheet showed in the sand with the grid's straight edges (east of the survey's dune, (79, 7) on the island, 21 points
under the water). Now a hollow of up to 80 points (with its wet rim) that no ground under 0.3 m joins to the map's edge,
outside the dig's and the oasis's ground, is lifted to damp sand (0.05 m). The island's 16 inland hollows were listed by
a probe before the change; which of them are lifted was not listed after it, and no picture was taken. **Source and a
height probe only.**

## The chain (tests/playthrough 01–14)

From a new game (`?nocine`, `ASSIST=1`), each segment ending in the game's Save & quit and the next starting from the
title's Continue (`/dev/shm/t983-tools/chain.sh`, from the audit's runner; **no override file**). Logs, saves, traces,
shots: `/dev/shm/t983-chain/` (tmpfs).

**Result: the end was reached by input with the harness as committed** (segment 14: The End, Keep Exploring), through 15
Save & quits and 14 Continues, 11:28–13:09 UTC, in three runs of the runner (01–05, 06–10, 11–14). 0 Game Overs, 0 page
errors, 0 text overflows; one ISO assist (segment 06, the Zeelich depot, as in the audit). 01–11 and 12 ran first time.

| Seg | Chapter | Result | Free play (s) | Dialogue / scenes (s) | Life lost | ISO assists | "stuck: replan" |
|---|---|---|---|---|---|---|---|
| 01 | 1 The Well (surface, the yard) | PASS | 285 | 24 / 21 | 0 | 0 | 12 |
| 02 | 1 (the cave) | PASS | 74 | 4 / 6 | 0 | 0 | 6 |
| 03 | 2 The Joint Project (the ferry) | PASS | 81 | 5 / 20 | 0 | 0 | 0 |
| 04 | 2 (the valves, the depot) | PASS | 284 | 2 / 3 | 7 | 0 | 23 (the stepping stones and the cliff path, (−64, −33): recovered) |
| 05 | 2 (pump room, Zoé, Vesk, the ship) | **PASS** (the audit: FAIL ×3) | 380 | 31 / 15 | 2 | 0 | 7 |
| 06 | 3 Zeelich | PASS | 345 | 25 / 29 | 12 | 1 (the depot) | 2 |
| 07 | 4 The Dig | PASS | 220 | 23 / 31 | 2 | 0 | 1 |
| 08 | 5 Steam and Sand | PASS | 278 | 15 / 11 | 0 | 0 | 7 |
| 09 | 6 The Pass | PASS | 243 | 14 / 48 | 0 | 0 | 7 |
| 10 | 7 The Observatory | PASS | 196 | 18 / 19 | 0 | 0 | 7 |
| 11 | 8 Evacuation | **PASS** (the audit: FAIL ×2) | 518 | 20 / 29 | 5 | 0 | 3 |
| 12 | 9 The Council | PASS | 336 | 31 / 19 | 0 | 0 | 4 |
| 12b | 10 Borrowed Time (EXP-1, new since v96) | **PASS** after a harness fix (first: "TH is not defined") | 149 | 23 / 7 | 0 | 0 | 3 |
| 13 | 11 Baldino's Network | **PASS** after a harness fix (first: "band is not defined" on import) | 694 | 28 / 11 | 8 | 0 | 17 |
| 14 | 12 The Shell → 13 The Core → epilogue | PASS | 353 | 35 / 8 | 15 | 0 | 12 |

Free play 4,435 s (74 min; the audit's v96 run: 4,578 s without 12b). Two faults in the chain after EXP-1's merge, both
harness, both fixed (`9363730e`): `12b-throttle.mjs`'s helpers were module constants the page never saw; `13-network.mjs`
came out of the merge with the expansion branch's OG-6/NW-1 steps for features this game does not have (and a `band`
helper the merge dropped): it is back to its version before the merge. **For the coordinator**: whoever merges the
expansion's network chapter later must bring those steps with it.

## Tests run (Automated runtime only unless named)

| Test | Before | After | Notes |
|---|---|---|---|
| the chain 01–14 (+12b) | 3 segments stopped (the audit) | **15/15 PASS** by input, no override | above |
| `worldfit` | FAIL 3 visual (z-fighting 38, floating 1, openings 5) | **FAIL 1 visual** (z-fighting 0, floating 0, openings 5) | the openings: KNOWN-FAILING.md |
| `camcover` | FAIL 11/12 | **PASS 12/12** | |
| `camsteady` | FAIL 105/110 | **FAIL 105/110**, the same five | an intermediate version (crowns counting after 0.6 s) failed a sixth: not kept |
| `camcitadel` | — | **PASS 61/61** | |
| `camfollow` | FAIL 30/31 (this branch's base, run for the comparison) | **FAIL 30/31**, the same check and numbers | pre-existing: KNOWN-FAILING.md |
| `chapter1` | — | **PASS 32/32** | |
| `chapter4` | — | **PASS 59/59** | two earlier runs ended without a verdict (a navigation aborted; the page crashed, the machine out of memory with another worker's browsers): no check failed in them |
| `hebrew` | — | **PASS 17/17** | |
| `dialogue-check` (Static) | — | **PASS** (4,866 of 4,866 Hebrew keys) | |
| `opening-tutorial` | — | **Blocked** (no verdict in 3 runs: "Target crashed") | every check reached passed (13 of 45 in the longest run); the audit's v96 run: 45/45 |
| `townlife` | — | **Blocked** (no verdict in 2 runs: the page crashed both times at the same reload, a Continue) | 28 of 64 passed before it, none failed; the audit's v96 run: 64/64 |
| `place-scan` | — | **Blocked** (no verdict in 3 runs) | 3 checks passed in the longest run, none failed |

Not run: `camclear` (asked for after a P57 change; none was made), the rest of the suite. Crashes: the machine ran
three to four other browsers at once from about 13:00 UTC; several of this branch's runs ended with "Target crashed"
before a verdict and were run again.

## Pictures (`lba3/captures/audit-fix/`)

`ch1-2-*` (chapters 1–2, may be shown to the user): `p49-quay-by-the-pier-signpost-before/after` (the same spot, Follow,
the tests' setup); `a11-harbour-the-ferry-docks-before` (the audit's) / `-after` (this chain's segment 03); `a6-Tim-and-Lulu-before`
(the audit's: a leaf across the frame) / `-after` (this chain; the camera stood on another side this run, so it says
little about A-6); `a6-chapter2-continue-cliff-plateau-before/after-0.5s/6s`. `team-only-a9-11-Hedda-and-Tobin-before/after`
(chapter 8).

Seen in the pictures and not fixed: at the square by Tim and Lulu a soft-edged smear of grass over the paving's rim
(`ch1-2-a6-Tim-and-Lulu-after.jpg`, lower left); by Hedda and Tobin Zoé stands in the flower bed under the neighbours'
window while they talk.
