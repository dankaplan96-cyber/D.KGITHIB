# ZOE-LOOK-38 · Zoé toward a softer, more expressive animated look (a candidate) · the laptop, 9.11.2026

Order 38. Worktree `lba3-pk19`, detached at origin `568a05ed`; nothing committed or pushed. **A candidate: the user
decides.** Made from the order's words only; the fan picture was never seen, searched for, traced or stored.

- Code: `requests/ZOE-LOOK-38.diff` (`tools/blender/zoe_poly.py`, `src/game/characters.js`), `git apply --check` clean on
  `568a05ed`'s tree (scratch index).
- Model: `requests/ZOE-LOOK-38/zoe.json` → `assets/poly/zoe.json` (it is already in `index.json`; `skeletons.json`
  unchanged, so no `.add.json`).
- Pictures (chapter 1, may go to the user): `docs/future/characters/zoe/look-38/`, every one before | after.

## What changed (`zoe_poly.py`, flag `LOOK38`; `ZOE_LOOK_OLD=1` rebuilds the shipped file exactly)
- **Face:** eyes 1.2× as wide and 1.45× as tall: white, a larger blue iris, pupil, a catch-light, a heavy upper lid (the
  skin × 0.9), a lash line that ends in a flick, three short lashes. All of it is in the eye group, so the blink closes
  lid and lashes too. A thin crease above each eye, thin arched brows (darker), a smaller nose (ridge × 0.72, width × 0.85),
  fuller lips (taller, a small bow, the lower one further out). The talking mouth is the same mesh at the same pivot.
- **Hair:** the bald skull with a three-ball bun is gone. The head's own sections are split along a hairline (forehead,
  temples, behind the ears, the nape) into skin and hair. The hair is raised 3.5–5.5 mm and swept up to a tall ponytail
  tied at the crown in a green band. The tail rises, arcs back, drifts a little to her left (so it reads as a curve from
  the front, not a pin), and curls at the tip. It is weighted along the skeleton's existing `tail0–2`, which rig.js
  already swings with lag. Its base rides the head.
- **Outfit:**
  - green trims (the shoes' hex) cut into the top's edges: the neck V, the straps, the open back, and a band over each
    shoulder cap (the armholes);
  - a black belt with real lips and a square silver buckle;
  - the necklace as a green cord with a round dark pendant on a small bail;
  - green bangles;
  - round gold hoops in place of the blue teardrops.
- **Smoother:** head 28 sides (was 24), arms 14 (was 12), the hair and ponytail with smooth normals (the bun was drawn
  flat).
- **Kept:** her body's sections (ZOE_BODY: an adult woman's, modest), the skeleton and bone names, the eye and mouth
  entries' kind, and the tunic, trouser, shoe and skin hexes. Hair is now baked in LOOKS' exact `#e3af53`.
- **`characters.js`:** `LOOKS.zoe.belt` = `#2a2426` (the black now baked, per the role rule; Zoé is not dress-varied), and
  the comment.
- **Not done: shading.** No rim term and no skin-warming change in `LbaMaterial`. It is one shader for the whole cast, a
  change beyond Zoé, and I did not measure its cost. The softer look here comes from the shapes and the normals only.

## Evidence
| label | result |
|---|---|
| exported | ✓ Blender 5.2.3 via the bridge (`art/blender/characters/jobs/zoe38-*.json`); validate 77 pass, 0 fail, 1 warn (4 loose vertices, the same as the baseline) |
| triangles | body **5616 → 7004 (+24.7 %)**; with eyes and mouth 5704 → 7190; eyes 28 → 77 each; mouth 32 = 32 |
| draw calls | the hero rig: meshes 4 = 4, materials 4 = 4 (body, silhouette, both eyes in one, mouth). Game frame at the Follow/Medium spot (GPU): **166 = 166** calls, 914 350 → 920 196 triangles |
| rig contract | bones by name, all in `skeletons.json.zoe` (16 → 19 used: `tail0–2` now weighted); ≤ 4 weights, sums 1; feet at y 0.004 as before |
| loaded in game | ✓ the candidate served in place of `assets/poly/zoe.json` (Playwright route / a scratch server override), Citadel's square, chapter 1 |
| talks / blinks | ✓ mouth scale 0.17 (rest) → 1.0 open → 0.17; eyes blink to 0.12 (25 frames in 12 s idle); `rig.j.tail` has 3 segments |
| ponytail clearance | ✓ the hanging part's nearest approach to the rest of her body over 13 poses (idle, walk, run, turnL, jump, fall, throwQuick, heavy, talk, pickup, use, hurt, doze): 3.6–3.7 cm (sampled every 6th frame + the last 60, every 3rd tail vertex vs every 2nd body vertex) |
| detached parts | ✓ none seen in the 13 poses × 2 views (`poses.jpg`): the trims, belt, buckle, pendant, bangles, hoops and band stay on |
| visually inspected | ✓ Blender turnaround (neutral + colour), game Follow/Medium, close-ups (front, ¾, back), dialogue, lookdev face front/¾/side, the talk pose |
| performance | Vega 8 light check (`gpuperf.mjs`: the installed Chrome, the real loop, the square at the gamecap spot, 20 s per look; two pairs, the second in reverse order). Zoé standing: median 16.7 ms in all four runs (before 16.7/16.7, after 16.7/16.7); means 16.85/22.92 before, 21.55/21.69 after; Twinsen's unchanged scene drifted the same way (16.65 → 23.9 ms mean). The machine's noise swamps any difference: **no measurable regression, and no claim of zero cost**. Draw calls in that view 134–136 both ways. |
| integrated | no: the user decides first |

## Tests (SwiftShader, scratch copy of tests/ with the testlab Playwright import, candidate served by a scratch server)
| test | result (candidate) |
|---|---|
| solidnpc | 54 passed, 0 failed: PASS |
| chapter1 | 23 passed, 0 failed: PASS |
| zoe-resume (Zoé's own segment: she is the hero, sneaks, searches, saves, Continue) | 5 passed, 0 failed: PASS |
| cast-rounds | 209 passed, 0 failed: PASS |
| story-journeys | 30 passed, 0 failed: PASS |

The repo's tests were not edited. Only the scratch copy's `lib/boot.mjs` import line points at `tools/testlab/node_modules`.

## Pictures (`docs/future/characters/zoe/look-38/`)
- `turnaround-blender.jpg`: Blender front, side, back, ¾, neutral and colour; before above, after below.
- `game-follow-medium.jpg` (+ `-crop`): the Follow camera at Medium, GPU.
- `game-closeup.jpg`, `game-closeup-34.jpg`, `game-closeup-back.jpg`: a fixed 1.9 m view, GPU.
- `game-dialogue.jpg`: the outdoor two-shot with Dot, GPU.
- `lookdev-face-front.jpg`, `lookdev-face-34.jpg`, `lookdev-face-side.jpg`, `lookdev-turnaround.jpg`, `lookdev-talk.jpg`: the
  game's renderer in lookdev (SwiftShader).
- `poses.jpg`: 13 poses × 2 views.
- `game-statue.jpg`: the side effect below.

**Best three for the user:** `game-closeup-34.jpg`, `lookdev-face-front.jpg`, `game-follow-medium-crop.jpg`.

## Side effects
- The square's statue of Twinsen and Zoé (`statue.js`) bakes her model, so its bronze Zoé now has the ponytail too
  (`game-statue.jpg`). It is still one draw, plus about 1.4 k triangles.
- Her model is about 11 cm taller at the ponytail's top (2.02 → 2.12 m above her feet). It has no collider; the camera and
  doors are unchanged.
- `docs/BLENDER_ASSET_WORKFLOW.md` still says Zoé reads by "her bun". If the user takes this, that line should say ponytail.

## Not verified / left
- **Shading:** the rim term and warmer skin were not tried (see above).
- **Frame time:** no frame-rate claim; the light check is in the table. The stepped captures make no timing claim.
- **The ponytail in real play:** the swing was checked in lookdev's poses and in still game frames, not in a long run or
  jump sequence by input on the GPU. The clearance number is sampled, not exhaustive.
- **Cinematics:** the opening film and other cutscenes with Zoé, and her model in rooms with low ceilings or doorways,
  were not watched. The ponytail is about 11 cm taller there.
- **Brows:** they are thin and still light at the Follow distance; they read only in close-ups.
- **The trims:** they are colour cut into the top's surface, with no raised edge of their own. The back's halter edges
  make a busy pattern of green, red and skin.
- **Hands, legs and feet:** unchanged. The trouser legs' strong bend in run and pickup was already there.
- **Twinsen:** untouched. The order says to do him only if the user likes this one.
- `art/blender/characters/zoe38/` holds working files (`.blend`, `.png` previews) for the laptop only. Do not commit them;
  the request carries the JSON and the jpg pictures.
