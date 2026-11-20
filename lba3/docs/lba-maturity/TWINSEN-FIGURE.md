# TWINSEN-FIGURE · Twinsen brought toward the user's figurine · cloud, 15.11.2026

**A candidate for the user to judge, not an approved look.** Evidence: **Automated runtime only** (headless Chromium on
SwiftShader; no GPU, no frame times). The visual comparison below is the worker's, not the user's.

## The request
The user (15.11) sent a picture of a Twinsen figurine: "Better than what there is now? Can we try to get closer to this?".
Earlier that day (status.md P35), from the play camera behind him, on the knot of hair: "the bulge is weird". The picture
is the user's own photo and is **not in the repo**; it is described here in words and numbers only.

### The figure, as measured from the picture (proportions of his height without the knot unless said)
- **Hair:** a tall topknot from the top of the crown, gathered by a thick orange-brown ring that sits on the scalp; above
  the ring the lock is at once wider than the ring, swells to about 1.4 × the ring's width, its top rounds over and falls
  back to a point that hangs behind the head at about the ring's height. The knot rises ≈ 0.55 of the head's height above
  the crown. A strip of short dark hair runs down the back of the skull behind the ears; forehead, temples and the top
  round the ring are bare skin.
- **Head:** a long egg (taller than the in-game head), big round eyes (white, mid-blue iris, dark pupil) with heavy
  skin-coloured lids, a long round nose, a wide friendly open mouth, small ears. No dark brows.
- **Upper garment:** a wide mid-blue tunic to the hip with a high round stand collar and broad **bell sleeves** to the
  wrists (mouth ≈ the head's width), the hands out of them; the arms are separate from the body (not a cape over them).
- **Medallion:** large, round, gold (≈ half the head's width), an engraved face, on a brown cord round the collar's foot.
- **Waist:** a brown sash just under the tunic's hem.
- **Robe:** long and flared to the ankles, parting over the leading leg as he strides.
- **Shoes:** dark brown, rounded, a thick sole.
- **Build:** slender; the head ≈ 1/5.5–1/6 of the height; the blue a mid, slightly bright blue.

## What changed (tools/blender/twinsen_poly.py, `TW_FIGURE`, default on)
Built with the real Blender script (bpy, below). Every new part is drawn where the game shows it at rest (arms at the
look's armSpread 0.3) and stored un-spread by its own weights, as earlier sleeves were. Fractions are of H = 2.1 m.

| Part | Before (TWINSEN-ORIG) | Now |
|---|---|---|
| Hair | LBA2's three flat-shaded unlit balls behind the crown (a dark lump from behind: P35) | a topknot from the crown: 12 stations, 16 sides, 8 shallow grooves and two browns along it (strands), lit like the head; root on the head bone, top and falling tail on tail0–tail2 (the follow-through bends it); 0.11 H (≈ 0.6 of the head's height) above the crown, top of the model 2.30 m (was 2.10) |
| Ring | none (the user had asked for none on 12.11) | an orange-brown band (#b05622) with rounded edges round the knot's root, on the scalp. **The figure has one, so this follows the figure, against the 12.11 "no band"** |
| Scalp | bare | a strip of short hair down the back of the skull (the back 20 % of each half-section at the nape, widening to 54 % at the ring), 3.5 mm off the skin. `TW_FIG_CAP=0` builds without it |
| Head | LBA2's sections, skull arc 0.082 H above the brow | the same face and width; the skull's arc above the brow 0.092 H (≈ 6 % taller head), `TW_FIG_SKA` |
| Eyes | almond, 0.034 × 0.020 H, pale iris, lid low over the eye | round, 0.034 × 0.028 H, iris 0.016 H bright blue (#3a86d2), the lid just over the iris top, a little farther apart; still flat on the face (no protruding eyeballs); blink unchanged |
| Nose | small ball, 1.6 cm proud | long and round: a bridge from between the eyes to a round tip ≈ 5 cm proud, pointing a little down |
| Mouth | 0.043 H line | 0.052 H, corners turned up a little more; the talking mouth (scale with the voice) unchanged |
| Ears | none | small flattened shells low on the sides (64 tris each) |
| Brows | dark | the same shapes, set higher over the taller eyes, a lighter brown (#5a3a1e). The figure has none: kept for expression in close-ups |
| Upper garment | LBA2's cape whose sides ride the arms (from the play camera "a blue bell" over the arms) | a tunic on the torso to just over the sash (hem ±0.131 H, flared), shoulders sloping into a high round stand collar (0.762–0.798 H) with a dark inside; round each armhole up to a third of the upper arm's weight so a raised arm draws the shoulder |
| Sleeves | part of the cape; a small cuff | separate **bell sleeves**: 7 rings from inside the shoulder (r 0.029) through the elbow (0.048) to a bell mouth (r 0.072) at the wrist, upper arm → forearm weights over the elbow, a rolled hem, a dark inside closed round a skin wrist; the hand (unchanged) comes out of it |
| Medallion | octagon 0.082 × 0.072 H on a gold cord | round, 0.092 H across, gold rim (#c99a34), paler domed face with an engraved ring round a raised boss; brown cord (#6a4022) round the collar's foot in a V down the chest |
| Sash | thin orange belt with a knot | broad brown sash (#7c4a2a), 0.048 H tall, no knot (the figure has none) |
| Robe | to 0.04 H, hem ±0.158 | to 0.042 H, flared to ±0.181 H at the hem; halves on the legs as before; **split at the front and back from the hem to the shin** (each side's copy on its own leg), so a stride parts it over the leading leg. `TW_FIG_SLIT=0` closes it |
| Shoes | orange slippers with a lifted point | dark brown (#4b3224) rounded closed shoes on a thick dark sole |
| Blue | #2a86ad | #2f86c2 (a little brighter, less green); inner shadow #173f63 |

`src/game/characters.js` LOOKS.twinsen: tunic, belt, shoes, cord and hair colours set to the baked ones (the sculpt
fallback and any recoloured dress start from them). Nothing else in the game changed.

### Keeping the old model
`TW_FIGURE=0 python tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly` rebuilds the shipped
TWINSEN-ORIG `twinsen.json` **byte for byte** (checked with `cmp`), and its own flags (`TW_LOOK_38=1`,
`TW_LOOK_OLD=1 TW_LEGS_OLD=1`) still apply under it. The new build is deterministic (two builds identical).

## Numbers
| | Before | After |
|---|---|---|
| Triangles | 4336 | **5296 (+22.1 %)** |
| Vertices (unindexed) | 12636 | 15516 |
| Draw calls / materials | body mesh + eyes + mouth (one LbaMaterial, vertex colours) | the same |
| Textures | none | none |
| Bones / max weights a vertex | 19 / 4 | 19 / 4 (same names; JSON bone order differs, as the loader maps by name) |
| Height (top of hair) | 2.10 m | 2.30 m |
| Half-width (bell mouths) | 0.377 m | 0.425 m |

Triangles by part (after): head 1092, tunic 576 (+ lip 48, collar inside 48), hair 384 + ring 192 + strip 168, hands
2 × 220, neck 208, robe 192 (+ lip 48), sleeves 2 × (168 + hem 84 + inside 70 + wrist 30), shoes 2 × (144 + 12), nose 192,
ears 128, medallion 168, cord 80, sash 96, shins 2 × 40, brows 16, eyes and lids 108, mouth 16.
`art/blender/characters/jobs/floating.py`: ok (no detached piece).

## Install route
No Blender binary in the cloud. `uv python install 3.11`, `uv venv -p 3.11`, `uv pip install bpy` (bpy 5.0.1 wheel,
about 40 s) in the worker's scratch space; the script runs unchanged under it (`python tools/blender/twinsen_poly.py …`),
the same way the desktop runs it. The .blend source was written for inspection but not committed (it is not in the repo
for TWINSEN-ORIG either).

## Skeleton and animation compatibility
The skeleton (`art/characters/skeletons.json` twinsen) is untouched: no bone renamed, moved or added; rest transforms as
before; the eyes (blink) and the talking mouth are the same meshes on the head bone. Clips are procedural (rig.js), so
only deformation changed. Checked in the game's own character page (lookdev.html, three yaws each, frozen frames):
idle, walk (two phases), run (two phases), sneak (Discreet), turn, throw, quick throw, slash 1–3, heavy, punch, kick,
sit, talk, jump, reach high, cheer (both arms up), pickup, hurt, dodge (`captures/twinsen-figure/motion-after-lookdev.jpg`).
- Sleeves follow the arms in every pose; a raised arm (cheer, throw) keeps a closed sleeve to the bell, the shoulder
  of the tunic follows a little; no tear at the elbow (blend over 0.55–1.45 of the sleeve's length).
- The robe's halves follow the legs; the slits open over the leading leg in walk and run (shins show, as before when
  the robe opened); in a deep run frame the trailing half lifts behind the knee as the old robe did.
- Sit: the robe lies over the thighs (the coat-folding code works on skirt bones the poly body does not use: unchanged).
- The game has no climb or swim animation for the hero (rig.js has no such clip), so those could not be checked.

## Tests (snapshot, SwiftShader, one at a time)
`BOOT_TIMEOUT=900000 GAME_URL=http://127.0.0.1:8999/ node tests/X.mjs` on a copy of the branch with the candidate.

| Suite | Candidate | Base (the shipped model, same snapshot) |
|---|---|---|
| solidnpc | FAIL 53/54: "Twinsen walking into each small prop": the spaceport bridge's foot planter box and flower tub have no block collider near −36.0, 36.6 / −33.6, 36.2 | **the same FAIL, 53/54** (a world-layout matter after SPACEPORT-2, not the model) |
| chapter1 | PASS 32/32 | |
| cast-rounds | PASS 221/221 | |
| story-journeys | PASS 30/30 | |
| anim-combat | PASS 35/35 | |
| opening | PASS 41/41 (every character on screen from the poly cast) | |
| opening-tutorial | PASS 40/40 | |
| prologue | PASS 29/29 (the well's mites passed this time) | |
| npc-feet (the hero's feet; the shoes changed) | PASS 25/25 | |
| place-scan | 4 runs: the renderer crashed every time ("Target crashed"); once after all its checks had passed with the base's exact numbers (135 rooms, 7321 pieces, 175 findings, 3/3 PASS), three times inside its one big step (building every region at once); a fifth run lost its server | 2 runs: 1 PASS 3/3; 1 crash after its checks passed |

place-scan: the crashes come from building every region of the game in one page on SwiftShader on a shared machine
(other workers' browsers held 4–5 GB); the base crashed too. A separate run of that same step with the candidate
completed: 249 skinned meshes and 12.2 million triangles in the scene, of which the Twinsen model is two instances
(the hero and the statue), +1920 triangles in all (0.016 %). Not caused by this change as far as can be measured, but the
candidate's crashes came earlier in the run more often (3 of 4 against 0 of 2): **an open risk to re-run on the desktop.**

## Captures (`captures/twinsen-figure/`, in-game unless named lookdev)
- `play-camera-before-after.jpg`: chapter 1, the play camera behind and above, standing (crop, ×2.5).
- `walk-before-after.jpg`: the same camera mid-stride.
- `side-before-after.jpg`: a fixed camera at his side (game.camRig.override).
- `closeup-before-after.jpg`, `closeup-back-before-after.jpg`, `closeup-side-after.jpg`: dialogue-distance close-ups.
- `lookdev-before-turnaround.jpg`, `lookdev-after-turnaround.jpg`: front, ¾, side, back and head views (lookdev.html).
- `motion-after-lookdev.jpg`: the animation set above.

## Still unlike the figure, and why
- **Eyes** are flat painted shapes with a lid, not the figure's domed eyeballs under bulging lids (the project avoids
  protruding generic eyeballs; the blink rig scales flat eyes). They are rounder and bigger than before, but smaller than
  the figure's: the user called bigger eyes "far too big" on 12.11.
- **Brows**: the figure has none (only skin ridges); ours keep thin brown brows for expression.
- **Mouth** rests as a closed line; the figure's is open in a smile. The talking mouth opens it with the voice
  (syllable-driven generic motion, not lip-sync).
- **Bell sleeves are rigid** on the forearm: the figure's sleeves drape down under a raised arm; ours stay a cone.
- **The robe** has no cloth motion beyond the leg weights; at a big stride it stretches between the slit and the knee.
- **Head**: only the skull is a little taller; the figure's head is a much longer egg. TWINSEN-LOOK-38 stretched the head
  25 % and the user called it "distorted" (12.11), so this stays close to the head the user approved.
- **The medallion** has an engraved ring, not the figure's "S".
- **Hair** is geometry with two colours and grooves, no texture.
- Height: the knot adds 0.2 m above the old top of his hair; low ceilings and the camera's framing have not been
  re-checked room by room (the tests below cover the opening, chapter 1 and the place scan).

## Risks
- The user approved TWINSEN-ORIG's head and hair on 12.11 ("leave it like this"); this candidate changes the hair (ring,
  topknot, back strip), the nose and the eyes again because the user now points at the figure. Each part has a way back:
  `TW_FIGURE=0` (everything), `TW_FIG_CAP=0` (no back strip), `TW_FIG_SLIT=0` (closed robe), `TW_FIG_SKA=0.082`
  (the old skull height), `TW_KNOT_KS` / `TW_KNOT_KR` (the knot's height and thickness).
- The statue of Twinsen and Zoé (statue.js) uses the same model and changes with it.
