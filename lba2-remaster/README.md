# LBA3: The Awakening

An unofficial fan continuation of **Little Big Adventure 2**, playable in the browser and built after
the original engine's architecture and look.

> Non-commercial fan project, not affiliated with Adeline Software or [2.21]. The characters and world
> belong to their owners; the story is an original proposal, not an official plot. No original game
> assets are included: models, textures, sound and music are made for this project (see
> `ASSET_MANIFEST.md`).

## The story

Twelve years after LBA2, the well in Citadel Island's square runs dry.

- **Prologue — The Well.** Twinsen climbs down the well, finds warm water and growing crystals, and
  hears Sendell: *"Someone has reached her."*
- **Chapter 1 — The Joint Project.** Vesk, chief engineer of a Twinsun–Zeelich drilling project,
  brings heat and light to the island. Twinsen restores the town's water; Zoé sneaks into the project
  office and finds an evacuation plan that saves 30% of the people.
- **Chapter 2 — Zeelich.** Baldino's network: the lighthouse signal, the windmills, the valves, and a
  setback at the dock when the plan is confiscated.
- **Chapter 3 — The Shell.** Down the bore shaft to the engine room, the crystal galleries, Sendell
  herself, and the core, where the drill is turned into a shield with everyone's help.
- **Epilogue — Home.** Dinner on Bug Street, a few days late.

`STORY_BIBLE.md` and `WORLD_MAP.md` have the full outline, the cast and the regions.

## Running

ES modules don't load from `file://`, so use any static server:

```bash
cd lba2-remaster
python3 -m http.server 8000
# then open http://localhost:8000
```

There is no build step and three.js is vendored (`vendor/`), so the game runs offline; only the Rubik
font comes from Google Fonts.

**Controls:** arrows/WASD to move, Space for the behaviour action (jump, attack, hide), E to talk,
inspect or pick up, F to throw the magic ball, 1–4, Tab or Ctrl for the behaviours, M for the
holomap, I or J for the inventory and journal, Q to switch the camera, Enter to recentre it, V for the
1997 look, Esc for the menu. Keys can be remapped in Settings; gamepad and touch are supported.

**Saves** are automatic at checkpoints and on room changes (browser local storage). The save format is
versioned: older saves are migrated and a backup of the old copy is kept; an unreadable save is set
aside and a new game starts.

## Code layout

```
src/engine/    engine, no game content
  terrain.js     heightfield; height queries use the same triangles that are drawn
  physics.js     cylinders and boxes, steps, max slope, line of sight
  scripts.js     LBA2-style Track/Life scripts and zones
  rig.js         skeletons and pose-blended animation
  sculpt.js      skinning helpers shared by the characters
  environment.js sky, sea, rain, fog and light
  renderer.js    post-processing and the 1997 look
  camera.js      the LBA2 fixed camera and a free camera
  audio.js       sound effects; music.js: the music controller
  input.js       keyboard, gamepad, touch
src/game/      game content
  world.js, town.js, island.js, cliffs.js, vegetation.js   Citadel Island
  zeelich.js     Zeelich
  interiors.js   isometric rooms (houses, the well cave, the underground installation)
  characters.js  character looks; loads the Blender-built meshes in assets/poly
  actors.js, enemies.js, behmenu.js, hud.js, inventory.js
  story/         one module per chapter (prologue, chapter1–3, epilogue) and the director (index.js)
  text/          all player-facing text, in English
src/main.js    game loop, states, rooms, saving
tools/blender/ Blender (bpy) scripts that build every character: twinsen_poly.py, cast_poly.py
tests/         headless playthrough tests (see tests/README.md)
```

## Characters

Every character is a low-poly model built in Blender from Python (`tools/blender/`), skinned to the
game's skeletons (`art/characters/skeletons.json`, dumped by `tools/dump-skeletons.mjs`), and exported
as JSON to `assets/poly/`. The `.blend` sources are in `art/characters/`. Rebuild with:

```bash
python tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly
python tools/blender/cast_poly.py art/characters/skeletons.json assets/poly
```

## Tests

`window.game.step(seconds)` advances the simulation without rendering, so whole chapters can be played
in a headless browser. The scripts in `tests/` do this for the prologue, chapters 1 and 2 and the save
migration; each checks story flags, objectives and page errors along the way.

## About the original engine

The LBA2 engine source was released under GPLv2 in 2021 (`github.com/2point21/lba2-classic`). The
licence covers the code only; the original art, models and sound are not free. This project read the
source for behaviour and numbers (camera angles and distances, behaviours, ball rules) and copied no
code. If you own the game (GOG/Steam), you can build `lba2-classic-community` and run it with your data.
