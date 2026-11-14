# World comparison: Desert Island against LBA2, per district

Order 27a (reference curator), CLOUD_ORDERS 40 item 6. The desktop, 12.11.2026. Template:
`WORLD_RESEMBLANCE_TEMPLATE.md`; method as `resemblance-citadel.md`. Reviewer: the desktop's reference curator (Claude).
**Provisional editorial scores, not reviewed by the user, not a pixel match.** The user's rubric: geography 25,
landmarks 20, architecture 20, palette 15, environment 10, inhabitants 10; target 85 per revisited place. Twelve years
have passed (`docs/TWELVE_YEARS.md`): a difference is not a fault in itself.

## Evidence and labels
- **Our build:** `501714ce` (v82 plus the desktop's requests), served locally; Chrome on the GTX 1050 (ANGLE D3D11),
  1536×819, the play camera (Follow, Medium). Chapter 4 reached as `tests/chapter4.mjs` does. **Automated runtime
  only** (pictures looked at; nobody played). Our pictures stay on the desktop (chapter 4): `lba3-bench\curator\desert\`.
- **R-WS** `tools/worldscore.mjs` on this build (12.11): **Desert Island 83.1** (coast 97.6, height 78.2, landmarks 83.8,
  objects 65.2; IoU 0.976, MAE 0.40 m). It was 85.0 after WORLD-80 step 3. The landmark list and its distances are below.
- **R-OBL** the island's 106 objects (`DESERT.OBL`), drawn from the user's GOG files with the repo's
  `tools/lba-source/studyrender.py` rasteriser at the game's angle, flat palette colours (textured faces show as a guessed
  purple). **Source only**: a study sheet in the session's scratch, not committed.
- **Not available on the desktop:** the laptop's ground-texture renders (R-TEX) and its iso scene renders (`refscene.py`
  lived in the laptop's scratch). So the ground's palette and the original framing are not verified here: palette
  confidence is L.
- **Twelve-years additions, judged for fit only:** the Joint Project's research post and test bore, the dig, Ilka's camp,
  FunFrock's condenser hall, Kesh's wind-pump and oasis, the School of Magic in the great hall (the user's decision).

## Summary
| District | Score /100 | Critical failure | Biggest gaps |
|---|---|---|---|
| Kesh, the village (S35–S40) | **72** | no | LBA2's village houses are flat peach boxes with **small round domes on their parapets** (bodies 94–97) and a domed, teal-trimmed tower house (19); ours are ochre Pueblo boxes with roof beams and striped awnings, and stand 12–32 m south of the originals |
| The standing figures and the gateway (bodies 0, 33, 64, 80, 81) | **64** | **yes (landmark)** | bodies 0/33 are **peach columns with a red band and a teal dome cap** (5.2 m); ours are dark hooded stone figures. The gateway's 9 m beam is **black-and-white chequered** (64); ours is plain. 80/81 are peach pillars with a ball on top; ours are horned |
| The great hall and the high face (bodies 48, 52) | **74** | no (the user's decision) | 52, the tall S28 building, is a **giant grey stone face**; ours has the School's stone mask with red eyes in the pool (close in idea) and a separate S28 tower |
| The coast, the dock and the beach | **84** | no | coast IoU 0.98; the ground round the village 2–3 m too high (R-WS) |
| The research post, the dig, the camp (additions) | fit | — | teal paint, chain-link and the bore read as the project's; fits the twelve years |

**Not averaged into one score** (the pack's rule). Desert Island's best district is the coast (84); the village and the
figures are under the 85 target.

## 1. Kesh, the village
| Category | Max | Score | Reference + capture | Reason and gaps | Conf. |
|---|---|---|---|---|---|
| Geography/topology | 25 | 19 | R-WS / `d01`, `d02` | the village sits 15 m south of the original's centre; its ground 2.3–3.0 m too high over ~1,500 m² | H |
| Landmarks/relationships | 20 | 14 | R-WS landmarks | the five village houses and S40 all present; S36 32 m off (our oasis basin stands where it was), S38 22 m, the west house 12 m | H |
| Architecture/silhouettes | 20 | 12 | R-OBL 19, 21, 22, 24, 27, 94–97 / `d01`, `d02` | LBA2: soft-cornered flat-roofed peach boxes, **rows of small round domes on the parapets**, a domed tower house with a teal band. Ours: crisp ochre boxes, roof beams, stepped parapets, striped market awnings. Same massing, a different detail language | M |
| Palette/materials | 15 | 10 | R-OBL / `d01` | LBA2's walls a peach-pink, teal trims; ours tan-ochre, no teal on the houses | L |
| Environment | 10 | 9 | R-OBL 1, 3, 12, 13 / `d01`, `d03` | palms, cacti, the oasis; LBA2's parasols (41) and flowering bushes (12) less | M |
| Inhabitants | 10 | 8 | desertlife / `d01` | villagers, the market, the trader; the twelve-years Kesh | L |
| **Total** | 100 | **72** | | | |
**Proposed correction (one batch, art only):** the parapets' round domes and soft corners on Kesh's houses, the peach
wall colour, a teal band on the tallest house (≈ +8: architecture 12 → 17, palette 10 → 13). Moving the village 15 m
north is a story/layout call for the cloud (the oasis and the pump stand there now): not proposed.

## 2. The standing figures and the gateway
| Category | Max | Score | Reference + capture | Reason and gaps | Conf. |
|---|---|---|---|---|---|
| Geography/topology | 25 | 21 | R-WS | the figures and the gateway at their places (WORLD-80 step 3) | H |
| Landmarks/relationships | 20 | 14 | R-WS, R-OBL 0, 33, 64, 80, 81 / `d06`, `d07` | all five present and placed; read as different things | M |
| Architecture/silhouettes | 20 | 8 | R-OBL / `d06`, `d07` | **0/33: a peach column with a red band and a teal dome cap; ours a dark hooded figure. 64: a chequered beam over two posts; ours plain. 80/81: peach pillars with a ball; ours horned** | M |
| Palette/materials | 15 | 7 | R-OBL | the originals are the island's peach with teal and red; ours dark stone | M |
| Environment | 10 | 8 | `d06` | knolls and promontory as LBA2 | M |
| Inhabitants | 10 | 6 | — | no use either side | L |
| **Total** | 100 | **64** | | | |
**Proposed correction:** rebuild the three kinds in LBA2's language (peach column, red band, teal dome; the chequer on
the gateway's beam; ball-topped pillars): ≈ +16 (a critical-landmark fix). If the hooded figures carry a story purpose
now, the cloud says so first.

## 3. The great hall and the high face
| Category | Max | Score | Reason | Conf. |
|---|---|---|---|---|
| Geography/topology | 25 | 20 | the School in the pool at the hall's place; the S28 tower in its hollow | M |
| Landmarks/relationships | 20 | 15 | the face reads as a face (ours: the School's mask, red eyes); the S28 building is a tower, not a face | M |
| Architecture/silhouettes | 20 | 14 | `d04`: a crenellated brick block and the mask; LBA2's 52 is a grey stone face 8.4 m tall | M |
| Palette/materials | 15 | 10 | grey stone both | L |
| Environment | 10 | 8 | palms, the pool | M |
| Inhabitants | 10 | 7 | the School's people (twelve years) | L |
| **Total** | 100 | **74** | | |

## 4. The coast, the dock and the beach
Geography 24 (IoU 0.976; the height part 78: two high patches round Kesh), landmarks 17, architecture 16 (the dock), palette 11
(L: no ground-texture reference here), environment 9, inhabitants 7: **84**.

## Unverified
- The ground's palette against LBA2 (needs the laptop's texture renders, `refscene.py`, or a rebuilt one).
- LBA2's lighting, sky and the original framing (no original gameplay pictures used).
- The textured faces of the objects (shown as purple in R-OBL): their true colours.
