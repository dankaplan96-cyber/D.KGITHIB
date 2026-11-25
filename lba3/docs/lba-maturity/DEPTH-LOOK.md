# DEPTH-LOOK (P132, the user 25.11: "I look at the game and don't see the work on the walls and the depth of the look; everything looks very flat")

All results here are **Automated runtime only (SwiftShader, headless Chromium)**: pictures and pixel measurements of
rendered frames. No GPU, no frame times, nobody playing. Costs are stated by what each candidate adds.

**Every candidate is OFF by default.** With no `?depth=` switch, nothing changes: no shader text, no uniform, no
render, no texture (the module returns before touching anything; the texture painting runs only under its switch).

## 1. What flattens the picture (measured)

Method: the play camera as shipped (Follow, Far: 11.5 m from Twinsen, 6.6 m above him; an interior's room camera),
a new game at noon (the light cycle's start, the weather off: the look every new game opens with), the two PC presets
the auto quality uses (High: 4096 shadow map, soft filter; Medium: 1024 map over ±36 m, plain filter, Medium's small
casters), 1366×768 (and 1920×1080 frames for the pictures), at eight places: the user's spot (the fort wall by the
promenade's flight, Twinsen close to it), Citadel's square, the harbour, Twinsen's house (interior), Zeelich's dock
gate, Desert Island's landing, Lhar (the Hamalayi), the Celebration isle. Each frame was drawn five times without a
step between: as is, without the sun, without the sun's cast shadows (`shadow.intensity` 0), without fog, without the
wall normal maps (normalScale 0, aoMap 0); the differences give, per pixel, the sun's share of its light, whether it is
in a cast shadow, what the fog and the normal maps do. Probe and analysis: scratchpad `depth-look/probe.mjs`,
`measure.py`, `wall.py` (not in the repo).

| Place (High, 1366) | in shade | cast shadow | a cast shadow keeps | lit : shade (linear) | normal maps touch | fog changes |
|---|---|---|---|---|---|---|
| fort wall (user's spot) | 35 % | 23 % | 35 % | 2.0 | 9 % of pixels, ±1.0 level | 0.03 level |
| square | 18 % | 16 % | 33 % | 3.1 | 1 %, ±0.3 | 0.3 |
| harbour | 14 %* | 0 % | — | — | 2 %, ±0.4 | 0 |
| house (interior) | 13 % | 0 % | — | 2.2 | 1 %, ±0.7 | 0.7 |
| Zeelich dock gate | 9 % | 9 % | 47 % | 1.8 | 0 | 0 |
| Desert landing | 3 % | 4 % | 52 % | 2.1 | 0 | 0 |
| Lhar | 6 % | 9 % | 60 % | 1.8 | 0 | 0 |
| Celebration isle | 57 % | 54 % | 38 % | 1.2 | 0 | 0.02 |

(*the harbour's and the desert's "shade" also counts sea pixels, which the sun does not light: read those two rows as
upper bounds.) Medium: the fort wall's cast shadows 23 % → 13 %, the square's 16 % → 7 % (Medium's small casters drop
out first); the rest alike.

What this says:
1. **No ambient occlusion at all at the play camera**, and no contact shadow anywhere but under people (their blob).
   Whatever is out of the sun — 35 % of the user's frame, 57 % of the isle's — is lit by one uniform sky fill
   (three's hemisphere light: only up versus down), so a wall in shade is one flat plane of its texture, and nothing
   darkens where a wall meets the ground, under an eave, a bench, a crate. The user's wall: its face averages 52 of 255,
   its foot course 95 % of its upper courses, the ground at its foot 104 % of the ground 2 m out (no darkening).
2. **The relief exists on three textures only** (fortStone, rubbleHouse, rubble) and, from the play camera, changes
   0–10 % of a frame's pixels by about one level of 255 on average. On the user's wall it does raise the face's
   fine detail (mean |L − 9×9 mean| 4.4 → 5.7, +30 %), but only as thin bevel lines: the height map is a flat plateau
   with a 3-texel bevel, and in shade the normal map can only move the sky's up/down light. Zeelich, the desert, the
   Hamalayi, the isles and the rooms have none.
3. **The sun is high and mostly behind or beside the camera.** One sun direction for every region (53° up). At
   Zeelich's dock and the desert's landing the camera looks with the sun at its back (view·sun 0.82): every face it
   sees is sunlit (shade 3–9 %), shadows fall behind what casts them — front light, the flattest light there is.
   Citadel's direction (GFX-LOOK-2) was turned for exactly this reason on the walks; elsewhere it is not.
4. **The fill is strong where the ground is bright**: the Hamalayi's sky/bounce ratio is 1.7 (snow), Citadel's 4.1,
   the desert's 3.1; a shaded wall in Lhar is only 2.3× darker than a sunlit one (Citadel 3.2×) — and in the frame,
   only 6 % of Lhar is in shade.
5. **Not the cause**: fog (its start is 45–80 m, the camera 11.5 m from Twinsen: it changes the frames by 0–1.2
   levels of 255), shadows being off (on in High and Medium), the shadow darkness (a cast shadow keeps 33–60 % of the
   light, a normal key:fill), texture contrast (the painted textures have it; mean local contrast 5–11 levels).
6. The picture's chroma is scaled by 0.72 after tone mapping (WA-13, LBA2's muted palette) and Neutral tone mapping
   compresses the highlights: this mutes colour, not shape; left as it is (a palette decision, not depth).

## 2. Candidates (each a URL switch, default OFF; `?depth=a,b` combines)

| Switch | What | Cost (what it adds) |
|---|---|---|
| `?depth=relief` (a) | Relief on **every painted world texture** in every region and room (not only the three): a bump read from the texture's own light and dark (three's screen-space `perturbNormalArb` on the texel luminance; bright stones high, dark joints low), plus a cavity term (a texel darker than its neighbourhood gets less sky light). Per texture a weight: walls, roofs, stone, brick, cliff 1; planks, wood 0.8; paving 0.8; sand, dirt 0.35–0.45; grass 0.15; sea, cloud, chain 0. The three normal-mapped textures keep their maps. Lives in the texture-array batch shader (texarray.js) and the single painted pieces (a prototype hook), so **no draw call is added** (Source only; a normal map would have taken every piece out of its batch) | 4 more reads of the colour map per textured world pixel (2 for the bump, 1 coarse mip for the cavity, the 3rd re-reads the centre), a few dozen instructions; no new texture; one more program variant per material kind |
| `?depth=light` (b) | A stronger key against the fill, in every region and room: the sun ×1.15, the sky fill ×0.88, its ground bounce ×0.6 (faces turned up and down differ more, so any relief reads in the shade too) | none: three uniform values |
| `?depth=contact` (c) | **Contact darkening**: the ground beside a wall, a wall's foot (by how tall the wall stands: a step's riser hardly), under eaves, canopies, benches. A top-down height map of the static world round Twinsen: one orthographic render (people, sea, sky, grass, see-through things left out) into a 512² RGBA8 target over 112 m (0.22 m a texel), re-made when he has moved 20 m or the area changes; every lit surface reads it 5 times and darkens its sky light (and a quarter of its sun light) | 1 MB of render target; one extra render of the world from above per 20 m walked / per area (its draw calls = the world's in the box; see the numbers below); 5 texture reads per lit pixel |
| `?depth=rim` (d) | Corner shading: a vertical face seen at a grazing angle drawn up to 22 % (sun) / 30 % (sky) darker, so a building's sides turning away separate from its front and corners read | a few instructions per lit pixel; no read |
| `?depth=paint` (e) | **LBA2's way: the relief painted into the colour** at load — each stone's or block's upper-left rim lighter, its lower-right rim darker, a soft shadow cast into the joint below — from the WALL-NORMALS layouts (the fort's blocks, the rubbles) or the texture's own light and dark. It reads the same in shade and in sun (what the user asked of the wall in shade). Walls, roofs, cliffs, planks, metals; the rubbles at half (already painted lit), paving at half | no runtime cost: the same textures, repainted once at load (CPU, once, before the first upload) |
| `?wallnormals=all` (f) | The local agent's WALL-NORMALS step (order 70.2, merged here from `wall-normals` 59bdfca4 and its two parents): normal maps + the shade's occlusion also on the dressed stone `stone` (Zeelich's and the islands' trims, Citadel's kerbs, sills, the well, stair bases) and Zeelich's corrugated sheet `zrib`, drawn in code like the first three. Off by default (the three Citadel walls stay on as the user picked) | two more 256 px normal + AO textures; the pieces with a normal map leave the texture-array batches (the local agent counted Zeelich 103 → 106 and Citadel 409 → 429 draws for all wall types) |
| `?depth=preset` | (a)–(e) together, the relief at 0.7 (the paint carries part of it) and the light at 0.8. (f) is a separate switch: `?depth=preset&wallnormals=all` combines all six | the sum of the above |

Weights for trying: `?dlrel=` (relief), `?dlao=` (contact), `?dlrim=`, `?dlkey=` (light), `?dlpaint=` (paint); 1 =
the chosen weight. Code: `src/engine/depthlook.js` (the switches, the shader text, the height map), `textures.js`
(`paintDepth`, the textures' names for the weights), one call each in texarray.js / merge.js / terrain.js (the batch
and terrain shaders), environment.js (the light), renderer.js (the height map before the frame), main.js (the focus).

## 3. Results (Automated runtime only, SwiftShader; pictures in `captures/depth-look/`)

Pictures (P107, for the user's pick):
- `sheet.png`: the eight places from the play camera (Follow, Far), High, 1366×768: today | a | b | c | d | e | f | preset.
  `sheet-medium.png`: Medium, today | a | preset. (1920×1080 frames of today and the preset were taken too: the same
  look at a finer pixel; not in the sheet.)
- `fortwall-candidates.jpg`: **the user's spot first** — the fort wall in shade, cropped from the play camera, every
  candidate. `fortwall-portrait-today-preset.jpg`: the same spot as the user looks at it (portrait 412×892 at 2.625 =
  1081×2341, High), today | preset.
- `closeups.jpg`: one close-up per region (Follow, Near), today | preset.
- Scripts and numbers: `depthshots.mjs` (the captures), `measure.py` / `wall.py` / `table.py` / `sheet.py`,
  `measure-today.json` (§1's table), `lights-today.json` (each place's lights, fog, camera).

The user's spot (High, 1366; the wall's face in shade; "detail" = mean |L − its 9×9 mean|, the fine light-and-dark
that reads as relief; the foot = the wall's lowest course against its upper courses, the ground at the foot against the
ground 2 m out):

| | face mean | face detail | wall foot / upper | ground at foot / out |
|---|---|---|---|---|
| today | 51.9 | 5.69 | 0.95 | 1.04 |
| a relief | 51.9 | 5.72 (+1 %: the fort stone keeps its own normal map) | 0.95 | 1.04 |
| b light | 48.1 | 5.60 | 0.98 | 1.04 |
| c contact | 49.4 | 5.41 | **0.89** | **0.98** |
| d rim | 51.8 | 5.67 | 0.95 | 1.04 |
| e paint | 50.3 | **7.07 (+24 %)** | **0.84** | 1.04 |
| preset (a–e) | 45.0 | 6.45 (+13 %) | **0.79** | **0.98** |

Every place (High, 1366; mean brightness change in levels of 255 / change of the frame's fine detail):

| candidate | fort wall | square | harbour | house | Zeelich | desert | Lhar | isle | mean |
|---|---|---|---|---|---|---|---|---|---|
| a relief | −0.4 / +5 % | −0.2 / +5 % | −0.2 / +1 % | −0.3 / +4 % | −0.4 / +7 %* | −0.1 / +1 % | −0.2 / +1 % | −0.2 / +4 % | +4 % |
| b light | −0.9 / +4 % | +1.0 / +4 % | +1.2 / +2 % | +1.2 / +2 % | +0.2 / +4 % | +2.7 / +1 % | +2.2 / −1 % | −2.8 / 0 % | +2 % |
| c contact | −2.2 / −2 % | −3.2 / −1 % | −1.0 / −1 % | −1.1 / −1 % | −1.8 / +1 % | −0.5 / −1 % | −2.2 / 0 % | −2.9 / 0 % | −1 % |
| d rim | −0.2 / 0 % | −0.2 / 0 % | −0.2 / 0 % | −0.1 / −1 % | −0.2 / +1 % | −0.1 / 0 % | −0.1 / 0 % | −0.1 / +1 % | 0 % |
| e paint | −1.6 / +21 % | −1.2 / +27 % | −0.9 / +16 % | 0 / +2 % | −0.2 / +18 % | 0 / +13 % | −0.5 / +13 % | −0.4 / +16 % | **+16 %** |
| f wallnormals=all | −1.3 / +10 % | −0.5 / +7 % | −0.2 / +1 % | 0 / −1 % | 0 / +2 % | 0 / 0 % | 0 / 0 % | 0 / +1 % | +3 % |
| preset a–e | −3.9 / +23 % | −3.3 / +27 % | −1.5 / +18 % | −0.1 / +4 % | −2.2 / +28 %* | +1.2 / +14 % | −0.7 / +13 % | −5.3 / +16 % | **+18 %** |

(*Zeelich's relief and preset frames were re-taken after a fix — see "Found and fixed" — with Twinsen entering
Zeelich directly, so the camera framing differs a little from the sequence's: those two are measured against a today
frame taken the same way.)

What the pictures show (looked at here, from the automated frames):
- **e paint** is the one that answers the user's wall: the fort's blocks get a lit upper-left arris and a shadowed
  lower edge, so they stand out of the joints in the shade, where the normal map does almost nothing. It reads on every
  stone and brick, the roofs, the planks and Zeelich's stucco; no runtime cost. Watch: the coping and the steps of the
  flight get busier (their `stone` at 0.7); the rubbles at 0.5 since they were already painted lit.
- **c contact** darkens the wall's foot (0.95 → 0.89) and the ground at it (1.04 → 0.98) and the corners round the
  well, benches, crates and room furniture — real but quiet from the Far camera; `?dlao=1.5` is stronger.
- **a relief** adds fine light/dark to the painted textures from Zeelich to the rooms (+1 to +7 % detail), most where the
  light grazes (paving, plaster, planks); subtle from the Far camera, clear close up (`closeups.jpg`).
- **b light**: a little more sun/shade contrast but the shaded wall goes darker (52 → 48): on its own it does not help
  the user's complaint. **d rim**: no measurable change at the play camera (the walls are seldom seen grazing from
  above). Neither is in the recommendation; both stay as switches.
- **f** (the local agent's `stone`/`zrib` maps): +10 % detail at the fort wall (its coping and stair stone), +7 % at the
  square (kerbs, the well); Zeelich's stone and sheet show up close.
- Clean, not gritty: the paint and the relief stay inside each texture's own colours; nothing turns black (the
  darkest change is the preset's −5 levels on the isle, in shade). Paths, enemies and projectiles: no change to their
  materials' brightness beyond the shared light; people are left out of the height map and get only the contact term
  at their feet.

Costs measured here (Automated runtime only; counts, no times):
- The height map (c): one orthographic render per bake, **46–519 draw calls** (house 46, Citadel 135–157, Lhar 166,
  Zeelich 519), re-made only when Twinsen has moved 20 m or changed area (3 bakes for the first place of a session,
  then one per teleport here); 1 MB render target. Its CPU time on SwiftShader (2–183 ms, mostly under 60) is not a
  hardware number.
- (a)(c)(d) add shader text to every lit world material: one more program variant per kind; their pixel cost on a
  real GPU is not measured here (no GPU). (b) and (e) add none.
- With every switch off nothing changes: the module does nothing (no prototype hook, no uniform, no bake) unless a
  switch is in the URL. `worldfit` run once on this branch (the switches off, after the WALL-NORMALS merge): **PASS**, every check (the shop sill of FULL-TEST-23-11 no longer fails).

Found and fixed on the way: at Zeelich on High the relief left a few pixels NaN (the screen-space bump on a degenerate
pixel), and High's bloom spread them into a white wash over the frame; the bump is now guarded (a degenerate pixel keeps
its normal, `isnan` checked) and the re-take is clean. Medium has no bloom and never showed it.

## 4. Recommendation (for the user's pick; nothing is on by default)
1. **`?depth=paint` (e)** — the biggest change for the least: +16 % fine detail over the eight places, +24 % on the
   user's wall in shade, and the blocks stand out of their joints in the sky's light as in the sun; no runtime cost.
2. **With `?depth=contact` (c)** — the wall's foot and the ground at it darken, the props sit on the ground; one bake per
   20 m and 5 reads a pixel.
3. **And `?depth=relief` (a)** — relief on every painted texture of every region and room; no draw call added (Source only: it lives in the batch shader, no material leaves its batch — not counted here).
4. Leave **b** (light) and **d** (rim) off: b darkens the shade the user already finds flat; d does not show at the
   play camera. **f** (Zeelich's stone and sheet) as the local agent proposed: worth it where the trims are seen close.
   So: `?depth=paint,contact,relief&wallnormals=all` for the user to try; if kept, make it the default and drop the
   switches (one more full look on the GTX 1050 / UHD machines for the cost of a, c on a real GPU before it ships).

## 5. Gaps
- No real GPU: the pixel cost of (a), (c), (d) and the bake's time are not measured; the local agent's GTX 1050 or the
  user's UHD machines should look at `?depth=preset` with F9.
- The relief's weights by texture cover the textures made in textures.js; textures drawn in other modules (desert,
  Hamalayi, Zeelich's own) get the default weight 0.7 for (a) and are not painted by (e).
- The terrain's own splat shader (grass, sand, dirt, cliff on the ground) gets (c) and (d) but not (a).
- (c) sees only what stands in the top-down view: thin single-faced walls (a plane seen edge-on from above) cast no
  contact; a room's ceiling, if drawn, would darken its floor (none seen in the rooms looked at).
- The sun is one direction for every region (53° up); at Zeelich's dock and the desert's landing the camera looks with
  the sun behind it (front light). A per-region sun direction (as Citadel's GFX-LOOK-2) would add shade and shadow
  to those views: not done here (a composition change per region, for the user's pick).
- The light cycle's morning and golden hour were not captured (noon only, the new-game look).
- The preset's close-up at Lhar was re-taken after the NaN fix (a bright spot at the first take's top right was that fault); Twinsen entered directly, so its framing differs a little from today's.

## סיכום בעברית
המשתמש אמר שהכול נראה שטוח. מדדתי במצלמת המשחק (Follow, Far) בשמונה מקומות, ב-High וב-Medium. הסיבות העיקריות:
אין שום הצללה סביבתית (AO) ושום צל מגע — מה שלא בשמש (35% מהתמונה ליד חומת המבצר, 57% באי) מואר באור שמיים אחיד,
ולכן קיר בצל הוא משטח אחד; מפות הנורמל קיימות רק בשלושה טקסטורות ומשנות 0–10% מהפיקסלים, בממוצע בדרגת בהירות אחת מתוך 255;
השמש גבוהה (53°) ובציליך ובמדבר המצלמה מסתכלת עם השמש בגב (תאורה חזיתית); בהימלאיה השלג מחזיר אור והצל כמעט כבהיר.
הערפל, הצללים (פועלים ב-High וב-Medium) ועוצמתם אינם הסיבה.
הכנתי שש אפשרויות, כולן כבויות כברירת מחדל, כל אחת במתג בכתובת: (a) תבליט מכל טקסטורה צבועה בכל העולם, (b) אור
שמש חזק יותר מול אור השמיים, (c) הכהיה במגע — רגל הקיר, הקרקע לידו, מתחת לגגונים ולחפצים, (d) הכהיית פינות,
(e) תבליט מצויר בתוך הטקסטורה עצמה (כמו ב-LBA2: שפה מוארת למעלה-שמאל, צל למטה) — נראה גם בצל, בלי עלות בזמן ריצה,
(f) מפות הנורמל של הסוכן המקומי לאבן של ציליך ולפח הגלי. בתמונות: sheet.png, ובמיוחד fortwall-candidates.jpg
ו-fortwall-portrait-today-preset.jpg — החומה שהמשתמש צילם.
ההמלצה: paint + contact + relief (ואפשר גם f): הבלוקים בחומה בולטים מהמישקים גם בצל (+24% פרטים בקיר), רגל הקיר
והקרקע לידה מתכהות, ושום דבר לא נהיה כהה או "מלוכלך". האור החזק (b) והפינות (d) — לא, כי b מכהה את הצל ו-d לא נראה.
הכול נבדק אוטומטית בלבד (SwiftShader), בלי GPU אמיתי; את העלות על המחשבים של המשתמש צריך לבדוק שם.
