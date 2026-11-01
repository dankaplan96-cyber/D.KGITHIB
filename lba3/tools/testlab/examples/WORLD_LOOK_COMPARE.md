# The whole game's look against LBA1 and LBA2 (colours and textures, 1.11.2026)

Every area of LBA3 0.46.0 (portable build, the laptop) was set beside the original place it follows and measured
the same way on both sides. The results are numbers only: no original images are in this repository.

## How it was measured

- **Ours.** Test Lab suite `artall` (`node engine/cli.mjs artall --game <exe>`; `LBA3_AREAS=a,b` limits it). It
  shoots all 42 areas. Each area gets the player's camera at its centre (two headings), an isometric view and, for
  outdoor areas, a view straight down over the whole area. While these views are taken, the fog is held off, the hero
  hidden and the camera rig paused; all three are restored afterwards. It writes `evidence/all/<area>-<view>.jpg` and
  `areas.json`.
- **The originals.** These are read in place from the user's GOG install and rendered on the laptop only:
  - LBA2 islands from above: the ground with its own texture atlas and colour ramps, and the objects drawn over it.
  - LBA2 interiors and LBA1 scenes: their bricks drawn isometrically as the game draws them. Only bricks are drawn: no
    actors and no light effects.
- **The same measure on both sides.** The land or room is cut from the sea, clouds or black around it and scaled to
  420 px across. Then:
  - Colour family shares: grass, soil, sand, grey (rock, paving, stone, metal), snow, water, warm and cool.
  - Mean lightness L* and mean chroma C* (CIE Lab).
  - "Busy": the mean local deviation of lightness, which says how much painted detail the texture carries.
- **Limits.**
  - The original island renders have no sun shading, so read lightness with care. Chroma and family shares are the
    reliable part.
  - The original interiors are bricks only. Ours include characters and lights.
  - "kind" rows below compare against the nearest original of the same kind, because that area of ours follows no
    original exactly.

## Outdoor areas (LBA2 / LBA3)

| Area | Original | L* | Chroma | Busy | Grass % | Grey % |
|---|---|---|---|---|---|---|
| citadel | CITADEL | 44.5 / 41.2 | 17.0 / 33.8 | 6.46 / 3.63 | 17 / 53 | 41 / 18 |
| desert | DESERT | 64.8 / 64.4 | 21.5 / 51.1 | 5.71 / 4.52 | 4 / 1 | 24 / 1 |
| isle_otringal | OTRINGAL | 62.3 / 45.7 | 9.1 / 21.5 | 7.69 / 4.10 | 11 / 15 | 64 / 4 |
| isle_knartas | KNARTAS | 62.4 / 45.3 | 15.7 / 24.5 | 6.96 / 5.21 | 7 / 24 | 47 / 6 |
| isle_mosquibee | MOSQUIBE | 39.4 / 39.9 | 15.1 / 35.0 | 4.36 / 3.44 | 4 / 51 | 39 / 2 |
| isle_celebration | CELEBRA2 | 38.3 / 37.3 | 13.5 / 29.8 | 4.44 / 3.25 | 1 / 40 | 71 / 11 |
| isle_undergas | SOUSCELB | 26.3 / 27.9 | 15.8 / 30.0 | 3.27 / 2.16 | 0 / 60 | 56 / 3 |
| isle_cxislet | ILOTCX | 61.8 / 40.1 | 11.0 / 32.7 | 5.13 / 2.66 | 10 / 54 | 56 / 3 |
| isle_platform | PLATFORM | 28.5 / 41.8 | 9.2 / 19.9 | 4.53 / 4.29 | 1 / 7 | 74 / 11 |
| isle_liftdock | ASCENCE | 45.1 / 42.2 | 14.0 / 21.2 | 3.53 / 6.17 | 1 / 0 | 59 / 6 |
| hamalayi | LBA1 scenes 9, 62, 63, 65, 69, 71, 72, 82 | 74.2 / 70.9 | 14.4 / 8.8 | 5.82 / 7.01 | 0 / 2 | 22 / 51 |

Not compared, because there is no original to compare with: zeelich (the spaceport), isle_tralu, isle_orchard,
isle_oldwatch and arena.

Median colours from above (LBA2 → LBA3):
- Citadel grass: #74885c, a soft sage, against #497219, a deep saturated green.
- Citadel soil: #5b4025 against #75562e.
- Desert sand: #d0aa83, a pale pinkish beige, against #e0a646, a saturated orange-yellow.

## Interiors (original / LBA3)

| Area | Original | L* | Chroma | Busy |
|---|---|---|---|---|
| house | LBA2 scene 0 | 36.0 / 41.2 | 14.6 / 34.1 | 4.55 / 4.95 |
| cellar | LBA2 scene 1 | 37.2 / 35.3 | 13.0 / 27.7 | 4.26 / 4.16 |
| wtent | LBA2 scene 21 | 32.1 / 25.4 | 5.7 / 19.4 | 4.70 / 3.37 |
| school | LBA2 scenes 28, 27 | 32.0 / 24.0 | 5.5 / 10.4 | 4.77 / 4.65 |
| workshop | LBA2 scene 38 | 40.1 / 40.5 | 14.8 / 25.9 | 4.72 / 5.57 |
| asylum | LBA1 scene 0 | 37.5 / 41.6 | 5.7 / 18.8 | 4.46 / 4.55 |
| buhalls | LBA1 scene 40 | 20.2 / 20.1 | 4.9 / 16.0 | 3.41 / 4.42 |
| bumaze | LBA1 scene 57 | 25.2 / 26.8 | 3.9 / 15.0 | 5.92 / 5.20 |
| well (kind) | LBA2 scene 17 | 40.1 / 30.2 | 7.1 / 14.1 | 4.28 / 4.31 |
| office (kind) | LBA2 scene 8 | 46.2 / 36.5 | 6.4 / 23.7 | 5.89 / 5.00 |
| c3shaft (kind) | LBA2 scenes 100, 111 | 19.7 / 29.7 | 15.3 / 11.5 | 5.03 / 5.21 |
| c3deep (kind) | LBA2 scene 117 | 19.8 / 28.3 | 4.6 / 10.1 | 4.32 / 4.14 |
| c3gallery (kind) | LBA2 scene 111 | 19.4 / 26.8 | 7.4 / 19.8 | 5.94 / 4.63 |
| c3core (kind) | LBA2 scene 129 | 19.3 / 34.5 | 15.8 / 18.6 | 5.43 / 4.00 |
| upper (kind) | LBA2 scene 154 | 37.2 / 41.7 | 25.9 / 15.9 | 4.32 / 5.08 |
| council (kind) | LBA2 scene 154 | 37.2 / 44.9 | 25.9 / 18.2 | 4.32 / 5.93 |
| archive (kind) | LBA2 scene 15 | 36.9 / 33.8 | 14.4 / 21.4 | 4.35 / 3.00 |
| condA (kind) | LBA2 scene 140 | 25.8 / 29.0 | 10.0 / 16.1 | 5.11 / 4.75 |
| condB (kind) | LBA2 scene 140 | 25.8 / 26.7 | 10.0 / 14.9 | 5.11 / 3.99 |
| valves (kind) | LBA2 scene 140 | 25.8 / 28.9 | 10.0 / 12.3 | 5.11 / 3.38 |

Not compared, because there is no original to compare with: control, projoffice, lighttop, c3sendell, butemple,
obsv and arena. LBA2 has no brick room for the lighthouse inside or for a post/water office.

## What the numbers say

1. **Ours is about twice as saturated as the originals almost everywhere.**
   - Outdoors: chroma ×1.5–2.8.
   - Interiors that follow an original exactly: chroma ×1.9–4.
   - The originals' own colours are muted: sage grass, pale beige sand, grey stone and brown soil. Their colour comes
     from small accents (red stools, tulips, lava).
2. **The originals carry more painted detail.** Their textures are 1.2–2× busier outdoors: rock strata, setts and
   speckled sand at texel scale. Ours are smoother.
3. **Zeelich's islands are the largest gap.**
   - In the originals, each island has a ground of its own:
     - Otringal and the CX islet: pale lavender-grey paving and stone.
     - Knartas: grey rock, an orange-tiled terrace and domed huts.
     - Celebration and Under Celebration: dark rock with red lava.
     - The Platform: dark rock and paving.
     - The Lift Dock: metal decks with hazard stripes.
   - Ours are almost all one look: green lawn (40–60 % of the land) with purple cliffs.
   - The originals' grey share is 39–74 %; ours is 2–11 %.
4. **The Citadel is greener and less stony than LBA2's.**
   - The original is 17 % grass, 36 % soil and 41 % grey (cliffs, rock and paving across the whole island, not only
     on the rim).
   - Ours is 53 % grass, 18 % soil and 18 % grey.
5. **The desert is too orange.** The cause is its light, not its sand: desert.js `env` has a warm sun and an orange
   sky light over a pale sand colour. The original has 24 % grey rock outcrops; ours has almost none.
6. **The LBA1 Hamalayi** is close in lightness. The original is icy cyan (frozen water, pale ice blue); ours is white
   snow and grey rock.
7. **Interiors.**
   - Twinsen's house differs most in material. The original has terracotta tile floors, teal patterned wallpaper,
     and thick walls with rounded wooden tops. Ours has light wood planks and cream walls. WA-8 below fixes this.
   - WA-7 (approved 31.10) moved the LBA1 rooms (asylum, the temple's halls and maze) further from the originals.
     Those are grey-cool in LBA1: chroma 4–6 against our 15–19.
   - The School, the wizard's tent and the condenser halls are darker than their originals.

## Requests and proposals

The approved requests are WA-8 to WA-10 in `tools/testlab/WORLD_ART_REQUESTS.md`. WA-11 and WA-12 are design requests
for the cloud. The global saturation is left to the user: it changes the whole game's mood.

## After the prototypes WA-11..13 (1.11.2026, the user: "more like LBA2")

The same measure was taken on the laptop's proto worktree: 0aed5b2 with WA-8..13, run 2026-11-01T06-26-21-artall.
The full numbers are in `WORLD_ART_REQUESTS.md` under WA-13.
- **Outdoors:** chroma is now within ×0.9–1.8 of LBA2. It was ×1.5–2.8.
  - Citadel: 15.0 against 17.0. Grass 26 %, grey 39 %; LBA2 has 17 % and 41 %.
  - Desert: 22.4 against 21.5.
- **Zeelich isles:** grey is now 26–52 % of the land; LBA2 has 39–74 % and ours had 2–11 %.
- **Interiors that follow an original:** chroma is now ×1.0–2.6 of it; it was ×1.9–4.
  - The largest gaps left are the LBA1 rooms (WA-7) and the Hamalayi, which now comes out too grey.
- **The sewers (LBA2 scene 17):** our game has none, so they were added as a design request (WA-14).

## Scoreboard on e999cd7 (1.11.2026: WA-8 … WA-15b in the game)

The same measure on the dev build e999cd7. Chroma C* is shown as LBA1/LBA2 / 0.46.0 / e999cd7; grass and grey shares
from above as LBA2 / e999cd7.

| Outdoor area | Chroma | Busy (LBA2 / now) | Grass % | Grey % |
|---|---|---|---|---|
| citadel | 17.0 / 33.8 / 14.9 | 6.46 / 4.22 | 17 / 26 | 41 / 40 |
| desert | 21.5 / 51.1 / 22.3 | 5.71 / 7.01 | 4 / 0 | 24 / 12 |
| isle_otringal | 9.1 / 21.5 / 15.3 | 7.69 / 4.41 | 11 / 29 | 64 / 42 |
| isle_knartas | 15.7 / 24.5 / 13.9 | 6.96 / 4.83 | 7 / 21 | 47 / 50 |
| isle_mosquibee | 15.1 / 35.0 / 14.3 | 4.36 / 4.39 | 4 / 14 | 39 / 42 |
| isle_celebration | 13.5 / 29.8 / 16.3 | 4.44 / 3.61 | 1 / 24 | 71 / 36 |
| isle_undergas | 15.8 / 30.0 / 13.4 | 3.27 / 3.55 | 0 / 31 | 56 / 44 |
| isle_cxislet | 11.0 / 32.7 / 13.8 | 5.13 / 3.38 | 10 / 23 | 56 / 40 |
| isle_platform | 9.2 / 19.9 / 13.1 | 4.53 / 4.67 | 1 / 11 | 74 / 49 |
| isle_liftdock | 14.0 / 21.2 / 15.2 | 3.53 / 6.47 | 1 / 0 | 59 / 25 |

| Interior | Chroma (original / 0.46.0 / now) |
|---|---|
| house | 14.6 / 34.1 / 18.0 |
| cellar | 13.0 / 27.7 / 21.7 |
| wtent | 5.7 / 19.4 / 12.1 |
| school | 5.5 / 10.4 / 7.1 |
| workshop | 14.8 / 25.9 / 17.4 |
| asylum | 5.7 / 18.8 / 5.4 |
| buhalls | 4.9 / 16.0 / 5.9 |
| bumaze | 3.9 / 15.0 / 4.2 |
| sewer | 7.1 / – / 12.7 |
| sewervault | 5.4 / – / 5.7 |
| archive | 14.4 / 21.4 / 13.9 |

- **Colour:** outdoors the chroma is now ×0.9–1.7 of LBA2's (it was ×1.5–2.8). Interiors that follow an original are
  now ×0.95–2.1 (they were ×1.9–4); the LBA1 rooms are on the original.
- **Ground make-up:** the Citadel and the Zeelich isles are close to LBA2 in grey share.
  - Celebration and Under Celebration still have about 24–31 % grass, where LBA2 has 0–1 %.
- **What remains:**
  - Painted texture detail: the originals are 1.2–2× busier on the Citadel and the paved isles.
  - The wizard's tent and the cellar are still about twice the original's chroma.
  - The sewer hall has more water in view than scene 17.
