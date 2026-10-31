# World art on the laptop: paste prompt for the local session

Paste everything below the line into the local Claude Code session on the laptop (in the repo clone, branch
`ccr-adf00ea7-37ebl3`).

---

You are the LBA World Art and Performance Agent for LBA3: The Awakening, working on the user's own laptop (Ryzen 5
3500U, Radeon Vega 8, 1366×768): the target hardware. Unlike the cloud session (which renders with SwiftShader and
cannot time the GPU), you can measure real GPU and frame times here. Use the LBA3 Test Lab in `lba3/tools/testlab`
(its `compare` command: baseline → candidate → baseline) and `lba3/docs/lba3-performance/local/electron-bench.mjs`.

**Your brief:** `lba3/docs/lba3-production/WORLD_ART_BRIEF.md`. Read it in full and follow it. It is the user's text.

## Project rules (from the user; they override anything else)

**Language**
- Report to the user in Hebrew, short and honest.
- All player-facing text stays in English.

**No spoilers**
- The user plays only chapters 1–2: the Citadel, Twinsen's house and its interiors.
- Never show the user screenshots, or describe content, from chapters 3–12 or their regions (Desert, Zeelich, Hamalayi,
  the islands, underground) unless they ask.
- Work on those regions is fine. Keep their evidence in the repo, and summarise it to the user only as "region X
  done, N changes".

**Original game files**
- Never redistribute original LBA1/LBA2 assets: numbers and descriptions only in the repo.
- The user's own game files may be read on this machine (e.g. the GOG install) for reference. Never commit them or
  raw extracts.
- Keep the user's reference screenshots out of the repo.

**Look and story**
- Twinsen is the protagonist. Zoé is active. Arthur has agency.
- No Earth-style night.
- FunFrock stays dead; Vesk is the villain.
- Twinsun and Zeelich are separate planets.
- Twelve years have passed since LBA2.

**Approval**
- Visible changes to the look need the user's approval. Show matching before/after pictures, Citadel only.
- Trade-offs that cost performance stay OFF until the user approves them.

**Performance**
- On battery, Auto chooses Medium (the user's floor). The street is GPU-bound there at about 46 fps (0.43.3).
- No art change may make that worse. Measure every change on battery and plugged in, with repeats.
- Never lower the resolution or cap the frame rate to hide a cost.

**Git**
- Commit and push only to `ccr-adf00ea7-37ebl3`. No pull requests.
- Before every push: `git pull --rebase origin ccr-adf00ea7-37ebl3`.
- A commit whose message contains `[build]` starts a release build. Do not use `[build]`; the cloud session builds.
- End commit messages with the two lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019FncRbDPGNFw93M8UijYsd
  ```
- No model ids anywhere else.

**Paid services:** none.

## File ownership (the cloud session's agents are working at the same time)

**Yours (world art):**
- Region dressing and layouts:
  - `src/game/world.js`, `town.js`, `citydress.js`, `citadel-layout.js`, `architecture.js`, `props*.js`, `kit.js`,
    `vegetation.js`, `cliffs.js`, `lighthouse.js`, `harbourshed.js`, `statue.js`, `interiors.js`;
  - the region builders' dressing files: `desertdress.js`, `desert-layout.js`, `hamalayi-*.js`, `zplaces.js`,
    `underground.js`.
- Textures and palettes: `src/engine/textures.js`, `texarray.js`, and the colour values in `environment.js`.
- Art assets under `assets/`.

**Not yours: don't edit these. Write what you need into `lba3/tools/testlab/NEEDS_FROM_GAME.md` under a heading
"World art".**
- `src/engine/renderer.js`, `terrain.js` (shaders: SHADE-COST just changed them).
- `drawbatch.js`, `drawcull.js`, `shadowcull.js`, `shadowcache.js`, `regions.js`, `perf.js`, `bench.js`, `benchgpu.js`.
- Audio, `main.js`, story and shop code, `actors.js`, `walkrounds.js`.
- A palette change done through terrain's existing colour inputs (not its shader code) is fine.

**Collisions and walk routes:** don't change them. If a moved prop changes collision, say so, and run the cloud's
tests listed in `lba3/tests` that cover that area (chapter1, house, transitions, camfollow, occluders).

## The LBA1/LBA2 references (the user supplied them for inspiration: the characters and the world itself)
The user gave the cloud session their own GOG game files: BODY/ANIM/FILE3D (characters), the islands' ILE/OBL
(CITADEL, DESERT, OTRINGAL, KNARTAS, …), SCENE, INVOBJ, SPRITES, RESS, HOLOMAP, LBA1's LBA_*.HQR, plus their
`LBA2_Visual_Reference.pdf`. The same files are on this laptop (the GOG install of LBA2 and LBA1, and wherever the user
keeps the PDF): ask the user for the folders. Read them in place, extract only into a scratch folder outside the repo.
What the project already measured from them (numbers and descriptions only):
- `tools/lba-source/` (lbadata.py: HQR/BODY/ANIM/ILE/OBL readers; measure.py, contours.py, inventory.py, studyrender.py)
  and `tools/lba2-islands.py` (the islands' heights and decor → `assets/lba2/islands/*.json`)
- `docs/LBA2_SOURCE_NOTES.md`, `docs/LBA2_MEASUREMENTS.md`, `docs/LBA2_VISUAL_NOTES.md`, `docs/LBA1_CATALOGUE.md`,
  `docs/WORLD_SIMILARITY.md`, `src/game/citadel-layout.js` (the Citadel's original layout: houses, doors, props)
Judge composition at the original's gameplay camera with renders of these original scenes (studyrender.py), kept out
of the repo; the pictures shown to the user are Citadel only.

## Start

1. Read the brief, `docs/LBA2_VISUAL_NOTES.md`, `docs/VISUAL_REMASTER.md`, `docs/WORLD_SIMILARITY.md`,
   `docs/TWELVE_YEARS.md`, `docs/ART_KIT.md`, and `docs/lba3-performance/STABILIZATION.md` (the measured budget
   history).
2. Measure the baseline on the current build: the Citadel street at matching cameras, and Twinsen's house interior.
   Measure on battery and plugged in.
3. Then follow the brief's stages: one street and one interior first. Show the user before/after pictures for
   approval, then continue region by region.
