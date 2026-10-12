# NEXT ACTION

Story: chapters 1–10 are playable with tests; combat overhaul done (docs/COMBAT.md, tests/combat.mjs); the new-game
opening scene is in (docs/CINEMATICS.md, tests/opening.mjs).

1. Visual remaster pass (stages 1–4 done; see docs/VISUAL_REMASTER.md "Remaining"): cliff bases and the
   shoreline, animation polish (idle variations, talk gestures), larger vegetation tiles, merging the
   station/depot/pipeline props.
2. Split chapter 'shell' into 11 The Shell / 12 The Core (five pylons, one per station).
3. Republish the playable artifact after the next milestone. Version 3 (chapters 1–10, combat, remaster stages 1–5) is
   published at https://claude.ai/artifact/EjPMQXPwbmre2kDevMC4tA. The file map is built from the tree (src, css,
   assets/poly, assets/music, bake.bin as assets/bake.wasm, and only the three.js addons the code imports).
4. Offline copy: `python3 tools/offline-build.py dist/LBA3-The-Awakening.html [--no-music]` builds one HTML file that
   opens from disk (all modules in an import map, assets in base64 blocks behind a fetch shim). Verified from
   file:// in headless Chromium: a new game starts and the music decodes. Rebuild it after each milestone.
   (Version 3 of the artifact was missing vendor/three/build/three.core.min.js, so it couldn't load three.js;
   version 4 adds it, verified on a local mirror of the published file set.)
5. Next (agreed with the user): a local desktop build of the game (an installable app around the same code, saves on
   disk, no browser), after the opening.
