# The desktop app

`desktop/` packages the game as an installable app for Windows, macOS and Linux (Electron). It runs the same
game code as the web version, in a window of its own: no browser, no address bar, works offline.

## What it adds
- Its own window (1280×720, resizable), the game's icon; **F11** or **Alt+Enter** toggles fullscreen.
- The game is served from inside the app on a private origin (`app://game/…`), so ES modules, `fetch()` and
  storage behave exactly as on the web; nothing is downloaded at run time (the Rubik font is bundled, OFL).
- **Saves on disk** (the game's local storage, kept by the app):
  - Windows `%APPDATA%\LBA3 The Awakening`
  - macOS `~/Library/Application Support/LBA3 The Awakening`
  - Linux `~/.config/LBA3 The Awakening`

  Uninstalling the app keeps them.
- **Quit Game** on the title screen (desktop only); sound starts without waiting for a click.

## Building
```sh
cd desktop
npm ci
npm start            # run from source (copies the game into desktop/game first)
npm run dist:win     # installer (NSIS .exe) + zip in desktop/release: on Windows
npm run dist:mac     # .dmg (on a Mac)
npm run dist:linux   # .AppImage
```
On Linux without wine only the Windows **zip** can be built: `node copy-game.mjs && npx electron-builder --win zip
--publish never` (electron-builder 26 still writes the exe's icon and version there; with
`-c.win.signAndEditExecutable=false` it skips them). The **installer** (`LBA3-The-Awakening-Setup-<version>.exe`)
needs wine on Linux (`spawn wine ENOENT` without it), or a Windows machine.

The version shown on the title screen is `VERSION` in `src/main.js`; keep it equal to `version` in
`desktop/package.json` (it names the files in `release/`). The "Updated …" date next to it is `src/build-stamp.js`,
written by `tools/stamp-build.sh` when the web version is published; set `BUILD_NUMBER` before a build to add
"(build N)". The package carries no repository address and no auto-update (`"publish": null`: no
`resources/app-update.yml`). Ctrl+Shift+I opens the developer tools only when run from source (`npm start`) or with
`LBA3_DEVTOOLS=1` set; the installed build has none.

`copy-game.mjs` copies exactly the files the game loads (`tools/game-files.mjs` follows every import), and
swaps the page's Google Fonts link for the bundled font.

## Releases (GitHub Actions)
`.github/workflows/desktop.yml` builds all three on their own runners for every push to the working branch (or by
hand: Actions → Desktop builds → Run workflow). It publishes a **pre-release** on the repository's Releases page
with the installers, and keeps them as run artifacts for 30 days. The newest build is the top entry on
https://github.com/dankaplan96-cyber/geriatrics-course/releases (the first was `desktop-build-1`).

The builds are **not code-signed** (that needs paid certificates):
- Windows SmartScreen may say "Windows protected your PC": More info → Run anyway.
- On macOS, the first time: right-click the app → Open.

## Verification
`desktop/test-desktop.mjs` (Linux, under xvfb, software GL), run against the packaged executable, checks:
- the window loads the game from `app://`;
- Quit Game shows and the font is the bundled one;
- a new game plays the opening and saves;
- after a restart Continue is there and resumes without replaying the opening;
- Quit Game closes the app.

All pass on the Linux build. The Windows zip was also built on Linux (without the exe icon) to check the
configuration.

Not verified: running the Windows and macOS builds (no such machines here); real-GPU performance.

## Measuring performance on your machine

Pause → **Benchmark** runs four fixed routes (a populated street with the camera turning, Twinsen's house, a
fight with throws, a door in and out) at Medium and High and shows a report you can copy: GPU as the browser
reports it, window size, devicePixelRatio, render pixel ratio, MSAA, shadows and bloom, and per route the
average fps, frame time p50/p95/p99/max, stalls over 50 ms, simulation CPU time, render-submission CPU time
(CPU only; the GPU's work shows in the frame time), draw calls and triangles. It runs ~1 minute, turns the
automatic resolution off while it measures, and never touches the save. F9 shows a live frame-time overlay.

Settings → Resolution **Auto** (default) lowers the internal resolution (down to 0.6×) while frames run long
and raises it again once they keep up; **Full** keeps it fixed.
