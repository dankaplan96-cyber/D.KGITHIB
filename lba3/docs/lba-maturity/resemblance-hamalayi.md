# World comparison: the Hamalayi against LBA1

Order 27a (reference curator), CLOUD_ORDERS 40 item 6. The desktop, 12.11.2026. **Provisional, low confidence.**
The user's direction (`docs/WORLD_SIMILARITY.md`): the Hamalayi is **our own larger region** with a few recognisable LBA1
spots, not a copy; its similarity is not a target. Scored here for charm and fit, as the pack asks.

## Evidence
- **Our build** `501714ce`, Chrome on the GTX 1050, the play camera; the region entered as `tests/hamalayi-life.mjs` does
  (`regions.ensure('hamalayi')`). Eight places: the landing and the glider, the hut, Lhar's square and houses, the
  observatory's plateau, the vent basin, the slide, the heat post. Pictures stay on the desktop (chapter 6):
  `lba3-bench\curator\hamalayi\`. **Automated runtime only.**
- **R-WS** `tools/worldscore.mjs` (12.11): 27.4, partial. Walkable 31,825 m² against LBA1's eight 55 m ledge scenes
  (11,860 m²); 90 % of ours within 25.5 m of our lowest level against 6.4 m. These numbers say what was intended: a
  bigger, taller valley.
- **No LBA1 visual reference on the desktop:** LBA1's Hamalayi is brick-grid scenes, and the laptop's grid renderer was
  not handed over. Nothing below is matched against a picture of the original: every score is **L**.

## The place, by the rubric (charm and fit, not likeness)
| Category | Max | Score | Reason | Conf. |
|---|---|---|---|---|
| Geography/topology | 25 | 15 | a snowy valley under rock walls, the village on a shelf, the observatory on its plateau, the vent basin: reads as mountains, as LBA1's did; far larger (by design) | L |
| Landmarks/relationships | 20 | 12 | Lhar's square with its prayer flags and pole, the hut by the landing, the observatory; LBA1's recognisable spots are not verified here | L |
| Architecture/silhouettes | 20 | 15 | stone-and-timber houses, snow on the roofs, coloured shutters and doors (`h3`, `h4`); a coherent mountain style | L |
| Palette/materials | 15 | 11 | snow white, rock violet-brown, warm windows, the flags' primaries: clear and readable | L |
| Environment | 10 | 8 | firs, snow drifts, the ice crystals of the vent (`h6`) | L |
| Inhabitants | 10 | 8 | Lhar's people, the moving day, chimneys that smoke (hamalayi-life) | L |
| **Total** | 100 | **69** | | |

**What would raise it most** (for the cloud, not proposed as a request yet): the open snowfields between places are
large and plain from the play camera (`h5`, `h7`, `h8`: wide white with a lone fir); a few more LBA1-like landmarks
where the story allows, named from LBA1's own scenes once their reference side can be drawn here. The campaign's wave 3 is changing Lhar,
the Pass and the Observatory now (the cloud's): **re-score after it lands**, with an LBA1 grid renderer rebuilt on the
desktop for the reference side.

## Re-score after wave 3 and PLACE-3 (order 41.4) · the desktop, 15.11.2026 · **Provisional, low confidence**
Build `42313c97` (wave 3's Lhar, the Pass and the Observatory, PLACE-3, HAMALAYI-LIFE merged). Chrome on the GTX 1050,
Follow, chapter 7 by flags; the landing, the monastery's gate, the observatory's door, the vent, the heat post, and
each of Lhar's five houses and the hut from 4–7 m before its door. Pictures stay on the desktop (chapter 6+):
`lba3-bench\curator\hamalayi-15-11\`. R-WS unchanged (27.4, partial; 31,825 m² walkable against LBA1's 11,860).
Still **no LBA1 picture** on the desktop: the reference side is LBA1's scene list and a walkthrough (LANDMARKS-KEEP), so
every score stays **L**.

| Category | Max | 12.11 | Now | What changed |
|---|---|---|---|---|
| Geography/topology | 25 | 15 | 15 | unchanged: the valley, the shelf, the plateau, the basin |
| Landmarks/relationships | 20 | 12 | 13 | the monastery's red door and Lhar's houses lead in now (wave 3); every house reads as its owner's from its door (shutters, lit windows, the board) |
| Architecture/silhouettes | 20 | 15 | 15 | unchanged |
| Palette/materials | 15 | 11 | 11 | unchanged |
| Environment | 10 | 8 | 8 | the open snowfields between places still wide and plain (`h1`, the vent's surroundings) |
| Inhabitants | 10 | 8 | 9 | the phases (pack, camp, mend, home), owners at home, chimneys by phase |
| **Total** | 100 | **69** | **71** | |

LBA1's own main places on the Hamalayi (its guarded factory compound, the village's way in under the Sacred Carrot, the
quay) are not in ours by design (`docs/WORLD_SIMILARITY.md`: our own larger region); listed in LANDMARKS-KEEP for the
user and the cloud. **What would raise it most** is unchanged: the plain snowfields, and one LBA1 landmark where the story
can use it.
