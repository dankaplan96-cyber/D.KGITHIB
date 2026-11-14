---
name: lba3-world-art-role
description: "From 31.10.2026 this local session is also the LBA3 World Art and Performance Agent; its file ownership, approval and commit rules"
metadata:
  node_type: memory
  type: project
  originSessionId: 5ab6eb84-7519-44bc-bb3c-9b5d6a3ccabd
  modified: 2026-10-31T17:12:48.241Z
---

The user handed this session the World Art role (31.10.2026): the paste prompt LOCAL_WORLD_ART.md and the brief, verbatim in the repo at lba3/docs/lba3-production/WORLD_ART_BRIEF.md. Improve the existing world's look through art decisions (palette, composition, prop placement and orientation, existing textures at the same resolution, vertex colour, light direction and balance) within the measured CPU/GPU/memory/loading budget. No map expansion, no new systems.

**Why:** the cloud session can't time the GPU; this laptop (Vega 8) is the target hardware.

**How to apply:**
- **Mine to edit:** src/game/world.js, town.js, citydress.js, citadel-layout.js, architecture.js, props*.js, kit.js, vegetation.js, cliffs.js, lighthouse.js, harbourshed.js, statue.js, interiors.js; the region dressing files (desertdress.js, desert-layout.js, hamalayi-*.js, zplaces.js, underground.js); src/engine/textures.js, texarray.js, environment.js colour values; assets/.
- **NOT mine:** renderer.js, terrain.js shaders, drawbatch/drawcull/shadowcull/shadowcache/regions/perf/bench/benchgpu, audio, main.js, story/shop, actors.js, walkrounds.js. Needs go to tools/testlab/NEEDS_FROM_GAME.md under "World art".
- Don't change collisions or walk routes. If a moved prop changes collision, run lba3/tests chapter1, house, transitions, camfollow, occluders.
- **Approval:** visible look changes need the user's OK, shown as matching before/after pictures, Citadel only. Performance-costing trade-offs stay OFF until approved.
- **Performance:** never make the battery street (~46 fps, Auto Medium) worse. Measure every change on battery and plugged in, with repeats (Test Lab compare). Never lower resolution or cap fps to hide a cost.
- **Spoilers:** other regions may be worked on, but report them to the user only as "region X done, N changes".
- **Git:** only branch ccr-adf00ea7-37ebl3. `git pull --rebase origin ccr-adf00ea7-37ebl3` before every push. Never `[build]` in a commit message. Commits for this role end with two lines:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_019FncRbDPGNFw93M8UijYsd`.
- Never commit original LBA files or the user's reference screenshots.

Related: [[lba3-local-setup]]

**References on this laptop (installed 31.10.2026):** LBA2 GOG data in `C:\Program Files\GOG Galaxy\Games\tlba2-classic\Common\` (BODY/ANIM.HQR, CITADEL/DESERT/… .ILE/.OBL); LBA1 in `C:\Program Files\GOG Galaxy\Games\tlba-classic\`. Read in place; extract only into a scratch folder outside the repo. `LBA2_Visual_Reference.pdf` not on this laptop yet (the user may copy it).

**UPDATE 31.10.2026 (the user's decision, overrides the editing rights above):** this session does NOT edit game code, the art files included. It prototypes in a separate worktree `C:\Users\dan\lba3-proto` (never pushed; the baseline copy is `C:\Users\dan\lba3-base`), measures (Test Lab compare, battery and plugged), shows the user before/after, and writes each approved change exactly into `lba3/tools/testlab/WORLD_ART_REQUESTS.md` for the cloud session to apply. Then it verifies on the cloud's next build. Commits stay inside tools/testlab.

**Standing approval (the user, 31.10.2026 night):** "I approve everything, always." World-art changes no longer wait for a per-change OK.
- Mark each request Approved when it is written.
- Still prototype first, still make the before/after pictures (Citadel only), and still send them, so the user can object afterwards.
- Spoiler rules are unchanged: later regions are reported as "region X done, N changes".
