# NEXT ACTION

User feedback after installing on Windows (top priority, in order): character proportions as in LBA2
(Twinsen: bigger round head, bell-shaped robe; Zoé: blonde done, body too thin, head too small); animations
closer to the original (walk, run, idle, throw — timing and weight); confirm the start-up and the frame rate
on the user's PC with F3 (GPU name, startup build/shader times).

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
5. Desktop app (desktop/, docs/DESKTOP.md): built and tested on Linux. GitHub Actions builds Windows/macOS/Linux
   installers into a pre-release (first run green on all three: release `desktop-build-1`, installer 141 MB,
   win zip 175 MB, dmg 254 MB, AppImage 159 MB). Confirm the Windows build on a real Windows machine (the user).
