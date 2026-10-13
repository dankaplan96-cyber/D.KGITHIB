# NEXT ACTION

When the user uploads LBA1's files: read its body format (it differs from LBA2's), measure its characters
(numbers only) and bring the ones the user wants back in our design language.

Ask the user how the 0.14.0 characters read (also Zeelich's Esmers, Mosquibees and burrowers) in their game (Twinsen, Zoé, the Grobos and Rabbibunnies were rebuilt
after the original, docs/character-review.md §12), and to run the benchmark again (pause → Benchmark; it has a
per-feature breakdown at Medium) so the graphics can be tuned from it.
User (0.10.0 on Windows): combat animations not good, frame rate poor. 0.11.0 adds an in-game benchmark
(pause → Benchmark): ask the user for its report from their PC before further graphics work, then tune what it
shows (fill rate vs. geometry vs. CPU). Still open from the review: melee contact timing, starts/stops/landings,
character lighting (modern path), a cinematic skip/pause test; the Dino-Fly at Twinsen's home (asked for).
Earlier feedback (in order): character proportions as in LBA2
(Twinsen: bigger round head, bell-shaped robe; Zoé: blonde done, body too thin, head too small); animations
closer to the original (walk, run, idle, throw — timing and weight); confirm the start-up and the frame rate
on the user's PC with F9 (GPU name, startup build/shader times).

Story: chapters 1–10 are playable with tests; combat overhaul done (docs/COMBAT.md, tests/combat.mjs); the new-game
opening scene is in (docs/CINEMATICS.md, tests/opening.mjs).

0. Citadel on the original map: terrain, sites, Twinsen's house (outside and in), the lighthouse on the headland,
   the village houses, the street furniture, the trees and palms and the harbour (west end of the original's
   pier) are at the original's places (WORLD_MAP.md); the magic ball follows the original. Next: the Weather
   Wizard's tent on Wizard's lane (S21), the old citadel ruins and the Woodbridge cliffs (east). Then Zeelich on
   the original islands (Otringal, Knartas, Mosquibee, Celebration, Under-gas, the platform).
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
