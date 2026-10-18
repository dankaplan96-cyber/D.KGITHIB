# Source inventory: the original character data we have (SRC-1)

What the user supplied, where it is, what it holds for our cast, and how close each of our models is to its
original. Written by the source-character integrator (docs/lba3-team/COORDINATION.md), 2026-10-17, on c0264c8.

**The rule.** The user's original game files stay in the session's scratch space. The repository gets numbers
(measurements) and our own rebuilt models only. No original mesh, texture, palette, animation, text or sound is
committed. Images that show an original model stay in the scratch space too. The tools in `tools/lba-source/` read
the user's files from a folder named on the command line. They print numbers, or write study renders to a folder the
caller names.

## 1. What was found

Scratch space: `/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/`
(written `$S` below). The uploads folder, `/root/.claude/uploads/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/`, holds the same
files with an id prefix. Several were uploaded more than once, and the hashes are identical. The `lba2data` and
`lba1data` copies are the working copies.

### Original game data: LBA2 (the user's GOG copy), `$S/lba2data/`

| File | Bytes | SHA-256 | Entries | What it holds for characters |
|---|---|---|---|---|
| BODY.HQR | 2,197,406 | 73efe61b51506e2b64ab88cf9c4846549056bb6435e40e5876587907afad2b77 | 470 (469 used) | Every 3D body: groups (bones), points, polygons with palette colours, spheres, lines. None of the characters checked carries a texture. |
| ANIM.HQR | 1,197,090 | 8ca1872f72b15edb838e4c04f643e4097c0235171c8604b1993762ce2b9a2fbf | 2,084 (2,083) | Keyframed clips: per-key time in ms, root step, and per-group rotations. |
| RESS.HQR | 582,473 | 09d18f76383461c480dbe7a93fff204ecebfc009ab7d9c1d8bfc3c66dc7a9f21 | 50 | Entry 44 holds the 346 File3D records. Each record maps an actor's generic bodies and animations (idle, walk, talk…) to BODY/ANIM indices, plus collision boxes. |
| SCENE.HQR | 543,251 | d5ac27280c284f5b403287a6f58621bd82636176310e6d23698c26e92ae01c22 | 224 (223 scenes) | Actors per scene: File3D, generic body, position, talk colour, life script. |
| TEXT.HQR | 442,979 | a66785c5811e7f43f1a13dd7d1954968c516b09ce91d31ab10a2138f5ae45bdd | 181 | The dialogue. Used only to identify who an actor is. |
| SCREEN.HQR | 3,453,594 | 789d46b2918d9bf9cd058d13dd76f635945e48f1bebae58d702cf32da860cfd4 | 79 | Entry 5 is the 3D models' palette: 16 ramps of 16 shades. |
| ANIM3DS.HQR, OBJFIX.HQR, SPRITES/SPRIRAW.HQR, LBA2.HQR, HOLOMAP.HQR, SAMPLES.HQR, LBA_BKG.HQR | — | (in `inventory.json`) | — | Not character data: sprite animations, fixed objects, sprites, holomap, sounds and interior backgrounds. |
| *.ILE / *.OBL (14 islands) | — | — | — | Island grounds and objects. Already reduced to numbers by `tools/lba2-islands.py`. |

### Original game data: LBA1, `$S/lba1data/` (uploaded 2026-10-13 16:30)

| File | Bytes | SHA-256 | Entries | What it holds |
|---|---|---|---|---|
| BODY.HQR | 396,854 | 3100636a705aadf5d2650759111504fb0d923b3855ccccf027b94d211336bd49 | 133 (132) | Bodies. All parse to their end; each entry has one trailing word. |
| ANIM.HQR | 128,603 | dfb2178ad4dde977b4cf9e08c8ab5ed8eef85c55c47564cc6cc19b5329a8cc23 | 517 | Clips. |
| FILE3D.HQR | 11,851 | 74abc1a90f1543dc0c2d8141ba7b0c6f773c29b71ab8e782910bd31103617d2d | 83 | File3D records (body and anim maps). |
| SCENE.HQR | 179,725 | a320c359fd41ef2b1be93f885a840615c316c83be50e5e81e90f93dbb647c859 | 121 | Scenes and their actors. |
| RESS.HQR | 954,369 | 48411592708e60abf0a8599404afcf88da65e5f08e5a92c4884348d08ba2ce8d | 55 | Entry 0 is the palette. |
| LBA_GRI/BLL/BRK, SPRITES, INVOBJ, SAMPLES, TEXT (`TEXT_a`/`TEXT_b`) | — | (in `inventory.json`) | — | Rooms, sprites and sound. Rooms already reduced to `assets/lba1/*.json`. |

### Engine source (GPL-2.0): read for the formats, never copied

| Source | Where | Revision | Used for |
|---|---|---|---|
| 2point21/lba2-classic | `/tmp/lba2-classic` (also `/tmp/claude-0/lba2src`) | a256b0c0117ec59fa6b4655d9ad6e19348573109 (2021-12-22) | Formats and identification: LIB386/H/AFF_OBJ.INC (bodies), ANIM.ASM, HQFILE.CPP/LZ.ASM, FICHE.CPP SearchBody/SearchAnim, DISKFUNC.CPP LoadScene, COMMON.H (F_*, LM_MESSAGE_ZOE 78, COUL_ZOE 4), DEFINES.H GEN_ANIM_* |
| 2point21/lba1-classic | `$S/lba1src/repo` | f73f457317f0b75975e6009f2d0bd89c18c9e3ce (2021-12-22) | LBA1 body, scene and File3D layouts |

The engine source holds no character assets: every model and clip comes from the data files above.

### Earlier extractions and studies (scratch only, derived from the originals)

- `$S/lba2orig/`: Twinsen bodies 0/1/12 converted to GLB (`twinsen_normal*.glb`, `twinsen_athletic*.glb`), his clips
  as raw JSON, a raw palette dump and measurement notes. These are conversions of original data, so they stay out of
  the repository.
- `$S/chdf/`: the Dino-Fly study (CH-DF), with its parser copies, sheets and renders.
- `$S/lba2data/*.py`, `$S/lba1tools/*.py`: earlier one-off study readers. The committed `tools/lba-source/lbadata.py`
  replaces them. It fixes a scene-reader bug: `o += rd('h')` lost the read's own advance.
- `$S/lba2data/bodies-*.png`: contact sheets of every body.

### Other uploads

- `LBA2_Visual_Reference.pdf` (twice), and screenshots and renders (`*image.jpg`, `*image.webp`). These are visual
  reference only and are not shipped.
- `Twinsen_template.3ds` (SHA-256 29b84b6f…f75e6c2). A 3ds Max export of spheres and "Default" materials. Its origin
  is **unknown**: it is not in the game files and may be a fan or template model. It is not used.
- `DE_00x.VOX`, `EN_*.ogg`, `TEMPLEBU.FLA`, `SAMPLES.HQR`: voices, music and video. These are not character data.

### Use and distribution terms

No licence file came with the user's game data. LBA1 and LBA2 are commercial games (Adeline, today [2.21]), and their
data is copyrighted. The GPL covers only the engine source code, not the game data. The project therefore uses the
data only as the user's private reference. The game ships numbers and models we built ourselves (ASSET_MANIFEST.md).

### Missing or not available

- **LBA1 dialogue for identification:** LBA1 life scripts were not parsed. LBA1 identities below rest on scenes and
  looks only.
- **Texture maps:** the characters checked have none (LBA2 colours are palette ramps), so none are missing.
- **The opening's version of Zoé, other sessions' files:** the opening uses the same `createCharacter('zoe')`. Nothing
  from other sessions was found beyond the folders listed above.
- **Original gameplay video for timing:** none. Clip timing comes from ANIM.HQR's key times.

## 2. Identification (metadata first, then a rendered look)

`tools/lba-source/inventory.py` lists, for each body, the File3D records that hold it and the scenes that place it.
For each placement it gives the actor's talk colour and the message ids in its life script, read through a byte scan
for LM_MESSAGE / LM_MESSAGE_ZOE. The output JSON is `$S/src1/inventory.json`. It quotes text, so it stays in scratch.
324 LBA2 bodies and 110 LBA1 bodies appear in scenes.

| Who | Original | Evidence | Confidence |
|---|---|---|---|
| **Zoé (LBA2)** | **body 26** (File3D 15, generic body 0); **body 27** = the same File3D, generic body 18 (she holds something, 2 extra groups) | Scene 0 (Citadel, Twinsen's house, the game's start) object 4: its life script uses **LM_MESSAGE_ZOE** and the engine's **COUL_ZOE = 4** talk colour. It speaks the game's first line, about the Dino-Fly and the pharmacy (TEXT bank 6, id 0). Body 26 is also in scenes 2, 65, 193, 196 and 199, and body 27 in 49 and 195, all with talk colour 4. Render: a blonde bun of three balls and a red outfit. | certain |
| Zoé (LBA1) | body 48 | In scene 5, Twinsen and Zoé's house, and in the end scenes (111–117). Render: a blonde woman in a pink gown. The LBA1 catalogue listed her only as "a blonde Quetch woman". | probable (no text check) |
| Twinsen (LBA2) | bodies 0–21: 0 plain, 1 tunic, 2–3 and 12 variants (wizard robe…), 17 with Zoé | Hero File3D 0–3 (one per behaviour), generic bodies 0–12 (GEN_BODY_*). Collision box ±250 × 1240. | certain |
| Twinsen (LBA1) | bodies 0–8 | catalogue | certain |
| **Baldino** | **body 139** (File3D 93) | Talk colour 13 in all three scenes (38 Desert Island, 48 Citadel, 138 Celebration). He asks Twinsen for gazogem "to repair our vessel", which is Baldino's role. Render: **a Grobo** (trunk, great ears) with goggles on his brow, a green smock and brown trousers. docs/TWELVE_YEARS.md also calls him "an old Grobo inventor". | probable (strong) |
| Bersimon, the weather wizard | body 111 (File3D 67) | Scene 21: the storm line about the lighthouse being closed, talk colour 10. Render: a Rabbibunny in a teal robe. | probable |
| School of Magic master | body 123 (File3D 76) | Scene 27: "You are now a member of our school"; scene 44: the reward for the test | probable |
| Joe the Elf | body 110 (File3D 66)? | An elf (droopy green hat with a pompom, great ears) in Otringal scenes 84/86. The text hint failed: its ids fall in a menu bank. | **not verified** |
| Ker'aooc | body 188? | Scene 185 only, no lines found | **guess** (as before) |
| Dino-Fly | 167 (166/168 ridden) | File3D 109; CH-DF | certain |
| Races | Esmers 80–83/86/186, Mosquibees 192/196, moles 194/323/…, triangle heads 84/430, Grobo 99, Rabbibunny 117, dogs 51–53, poodle 371 | LBA2_MEASUREMENTS.md | race level |
| LBA1 Spheros, troopers, FunFrock | 68–70, 18–20, 131 | LBA1_CATALOGUE.md | as catalogued |

## 3. Our cast against the originals (assets/poly/*.json, LOOKS in src/game/characters.js)

The gap was judged on `tools/lba-source/studyrender.py` sheets. Each sheet shows the original and ours with the same
renderer, cameras, scale and light. The sheets are in `$S/src1/cmp/` and are not committed.

| Our look | Original | Model basis | Gap now |
|---|---|---|---|
| twinsen | LBA2 1 | measured rebuild (character-review §11–12, hair VP-1b §14) | small: medallion, hand size, the robe's halves |
| **zoe** | LBA2 26 | before: the body's sections with **Twinsen's head narrowed**; pale cream hair and skin, no lips or necklace, and a deep heart-shaped neckline front and back. In the opening she read as an old woman (white bun, chalky face). **Now: her own measured head and outfit (SRC-1, §15).** | before: **large** (head, hair colour, outfit layout); now: small (see §15) |
| **baldino** | LBA2 139 (probable) | a Quetch old man (bald, moustache, apron) | **very large: a different race**. This is the next candidate. |
| bersimon | LBA2 111 | built after the body | moderate: hat and ears shape, robe colour |
| magus | LBA2 123 | built after the body | moderate |
| joe | 110? (unverified) | built from a description | unknown until identified; if 110 is Joe, large (hat, face, proportions) |
| keraooc | 188? | after 188 | unverified |
| dinofly | LBA2 167 | measured rebuild (CH-DF §13) | small |
| sphero1/2, fclone | LBA1 69/70, 18–20 | measured | small–moderate |
| nara, oku, xil, zbee*, zmole*, ztri*, esmer folk | LBA2 races | race measurements | race level (not individuals) |
| arthur, vesk, gilbert, mira, pippa, doran, tim, lulu, worker, guard, bram, odile, nell, ilka, the desert, Hamalayi and council cast… | — (sequel inventions) | LBA2 race language | no original exists |

## 4. The conversion path (why rebuild, not import)

The runtime (`src/game/characters.js` polyCharacter) loads our JSON format: unindexed triangles, normals, vertex
colours and four skin weights by bone name, on the game's own skeletons. It shades them with LbaMaterial, a palette-ramp
look. A direct import of an original body (a GLB as in `$S/lba2orig/`) does not fit, for three reasons:

- it would put original geometry into the repository;
- LBA2's groups are not our skeleton (23–30 groups with their own pivots against our 25 bones), so every rig.js clip
  would need retargeting;
- its colours are palette indices.

The reproducible path is: **identify** (inventory.py) → **measure** (measure.py: groups, colours, sections, clips;
contours.py: section outlines) → **rebuild** in Blender from those numbers on our skeleton (`tools/blender/<name>_poly.py`)
→ **compare** (studyrender.py, scratch) → **check in the game** (the lookdev page and in-game shots). Commands for Zoé
are in docs/character-review.md §15.

## 5. Manifest: Zoé (SRC-1)

| Source (user's files) | Output | Notes |
|---|---|---|
| LBA2 BODY.HQR 26 (sections of groups 2/3/12, colour bytes 32/64/128/30/181/197, spheres on groups 13–15, lines on groups 16–18) | `assets/poly/zoe.json` (4,436 triangles: 4,432 skinned + 4 in the two eye meshes; the earlier model had 2,908), `art/characters/zoe/zoe_poly.blend` | Our mesh, built from the numbers in `tools/blender/zoe_poly.py` |
| Scale | 1 H (1238 units to the skull top) = 1.95 m on the game's Zoé skeleton | Twinsen: 1 H = 2.006 m to the skull; the original's two are equally tall |
| Coordinates | the same as the game's: +y up, +z front, +x her left | no flip needed |
| Pivots / skeleton | the game's Zoé skeleton, unchanged | differences listed in §15 for the animator |
| Materials | palette ramp shade ≈ 9 as the vertex colour (skin #d9a679, a little warmer than Twinsen's #e2bc90 — documented artistic change; red #b32b27, shoes #3f7b47, lids #8f634b, eyes #2f474b, jewellery #1b4b67); hair palette 106 → base #cc8f00 with straight-up normals, shown as #e3af6b | LbaMaterial, one material |
| Animations | none imported. Her clips (ANIM 207 idle, 208 walk, 209 hit, 212 fall, 213 land, 210/211/214–219 scripted gestures) are measured in §15 for the animator | rig.js drives her as before |
| Twelve-years-later changes | none | STORY_BIBLE names none for her look |
| Artistic changes (not faithful) | warmer skin; short round mittens for the original's pointed hands; flatter lids that stop at the eye; no brown under the nose; the full front kept softened (0.110–0.131 against 0.144); lips with one even normal and face normals bent up | each for our renderer's ramp or close-ups (character-review §15) |
| Rollback | `git checkout c0264c8 -- lba2-remaster/assets/poly/zoe.json`, or `cast_poly.py <skel> <out> zoe` (the earlier build_zoe, kept) | |

## 6. Commands

```bash
S=/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad
python3 -I tools/lba-source/inventory.py --lba2 $S/lba2data --lba1 $S/lba1data --out $S/src1/inventory.json
python3 -I tools/lba-source/measure.py --lba2 $S/lba2data --body 26 --sections 0.024 --clips 207,208
python3 -I tools/lba-source/contours.py --lba2 $S/lba2data --body 26 --groups 12 --y 0.862:0.982:0.01
python3 -I tools/lba-source/studyrender.py --lba2 $S/lba2data --body 26 --poly assets/poly/zoe.json --polyH 1.95 \
    --views front,34,side,back,game --out $S/src1/cmp/zoe.png          # study image: keep it in scratch
python tools/blender/zoe_poly.py art/characters/skeletons.json assets/poly art/characters/zoe/zoe_poly.blend   # (bpy 5.2.2)
```
