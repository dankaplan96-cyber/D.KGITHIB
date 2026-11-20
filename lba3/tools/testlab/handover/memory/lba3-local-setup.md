---
name: lba3-local-setup
description: Where the LBA3 local measurement setup lives on this laptop and its quirks
metadata:
  node_type: memory
  type: project
  originSessionId: 5ab6eb84-7519-44bc-bb3c-9b5d6a3ccabd
  modified: 2026-11-01T17:24:54.138Z
---

- Repo at C:\Users\dan\lba3, branch ccr-adf00ea7-37ebl3. The game folder was renamed lba2-remaster → **lba3** (31.10.2026), so paths are lba3/docs/..., lba3/src/...
- **LBA3 Test Lab** (built 31.10.2026) lives in lba3/tools/testlab (its own package.json; `npm start` = window, `node engine/cli.mjs quick|full|visual|reproduce|compare|selftest`). The user's rule: commit only tools/testlab (and examples under it); never edit lba3/src or index.html; needs from the game go to tools/testlab/NEEDS_FROM_GAME.md; commit trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Portable game builds are unzipped under C:\Users\dan\lba3-games\<version>\ (from the GitHub releases' win.zip). Never use the installed game or %APPDATA%\LBA3 The Awakening (the portable build defaults to that folder too: always --user-data-dir).
- Older runners: C:\Users\dan\lba3-bench (electron-bench.mjs, chrome-bench.mjs, pacing.mjs).
- Game facts learned: on the title the game reports screen 'title' with state 'loading'; losing focus in play draws in the background (only a cinematic pauses); Space jumps only in Athletic (F2); a save in mid-air keeps lastSafe; on battery Auto = Medium at full resolution by the user's design (AUTO-2).
- A non-interactive shell must reload PATH from the registry first; Windows: `process().kill()` does not kill the game, use taskkill /F. The engine run under Electron (ELECTRON_RUN_AS_NODE) must not pass that variable to the game.
- The cloud session pushes code during runs: record the measured commit or build in each result.
- Character comparisons: the in-app browser pane shows no WebGL (blank). Serve lba3/lba3 with `python -m http.server 8123` and capture lookdev.html in Chrome via Playwright (C:\Users\dan\lba-study\shot\look.mjs). Originals: tools/lba-source/studyrender.py --lba2 <GOG Common> --body 1 (Twinsen), run without -I (needs the user's numpy).
- Test Lab suites I added: artall (every area), artharbour (harbour-front probe + views + whole-frame draw calls).
Related: [[lba3-measure-in-desktop-app]]
