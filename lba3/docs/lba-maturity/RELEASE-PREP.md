# RELEASE-PREP: the private-tester desktop build (24.11.2026)

The user, 24.11: the Electron exe is for **private testers only**, on a desktop PC. Approved findings from
`docs/lba3-audit/release.md` §7 applied: PK-1, PK-2, PK-3, PK-4, D-3. Nothing uploaded, signed, published or tagged;
no build output committed. Runtime results are **Automated runtime only (SwiftShader, xvfb)** on the Linux build of the
same `app.asar`; nothing was run on Windows.

Base: `93a99d19` (origin `ccr-c1c2c4b9-dep6ed`). Code commit `775efe62`; the build came from `git archive 775efe62 lba3`
(no untracked files can enter it).

## What changed

| # | Change | Files |
|---|---|---|
| PK-1 | Version 0.49.0 → **0.50.0**: the app's version, the title-screen `VERSION`, the lockfile's root entry (was a stale 0.10.0). The build stamp (`src/build-stamp.js`, `tools/stamp-build.sh`) is untouched; the script still works (run on a copy) | `desktop/package.json`, `desktop/package-lock.json`, `src/main.js` |
| PK-2 | `repository` removed; `"publish": null` in `build`. No auto-update existed or exists (no electron-updater / autoUpdater; the in-game "newer version" check only reads `build-stamp.js` from the app itself, offline, no dialog). The CI workflow builds with `--publish never` and releases with its own action, so it does not need `repository` | `desktop/package.json` |
| PK-3 | Ctrl+Shift+I opens DevTools only when `!app.isPackaged` (`npm start`) or `LBA3_DEVTOOLS` is set. F11 / Alt+Enter unchanged; F9 and the game's other keys are page keys and never pass through this handler | `desktop/main.js` |
| PK-4 | DESKTOP.md: on Linux without wine only the Windows zip builds (and electron-builder 26 still writes the exe's icon and version there unless `signAndEditExecutable=false`); the NSIS installer needs wine or Windows. Also notes the version, the stamp, no updater, the DevTools gate | `docs/DESKTOP.md` |
| D-3 | ASSET_MANIFEST: rows for music (soundfonts and their licences), character voices (Piper + LibriTTS-R, CC BY 4.0), loading pictures, MEA Studio splash, app icon, bundled Rubik (OFL) | `ASSET_MANIFEST.md` |

No visible world or character change. No player text changed (no Hebrew needed).

## Build (local, unpublished)

| | |
|---|---|
| Tooling | Node 22.23.4, npm 10.9.9, `npm ci` 283 packages from the lockfile, electron 43.7.9, electron-builder 26.16.1 |
| `copy-game.mjs` | `desktop/game: 515 files` |
| Windows zip | `LBA3-The-Awakening-0.50.0-win.zip`, 204 218 619 B, sha256 `748217eb777ed8af3eff5eae07a36036d8d7741a4d71103ce99b06f49cd5db1c` (zip timestamps change it per build) |
| `LBA3 The Awakening.exe` | sha256 `46f867432460ca9762b67e2ade5fb56aaa17f02408f48c7d1584949adbae1f9e`; version resource 0.50.0 / 0.50.0.0, product "LBA3 The Awakening"; unsigned |
| `app.asar` | sha256 `32a7932816f474eba17175601fcd2a92c897c873cbfea6a0b8afca6e4902d15f`, identical in `win-unpacked` and `linux-unpacked` |
| NSIS installer | not built (needs wine; not installed here) |

A first zip was built with `-c.win.signAndEditExecutable=false`; its log says that skips the exe's icon and metadata, so it
was deleted and the zip rebuilt without the flag (the hashes above).

## Checks

| Check | Result | Evidence |
|---|---|---|
| No `resources/app-update.yml` | **inspected** PASS: absent in `win-unpacked`, `linux-unpacked` and the zip's listing (only `resources/app.asar`) | `verify.log` |
| Owner / repo names in the package | **inspected** PASS: 0 files in either asar or either unpacked build contain the GitHub owner or a repo name; the asar's `package.json` has no `repository` | `verify.log` |
| Version | **inspected**: asar `package.json` 0.50.0, packaged `game/src/main.js` `VERSION = '0.50.0'`. **automated**: `app.getVersion()` 0.50.0, title corner `v0.50.0 · Updated 24.11.2026 12:38` | `verify.log`, `run-check.log`, `shots/A-title.png` |
| DevTools gate | **inspected**: packaged `main.js` lines 71/75. **automated** (keys sent with `webContents.sendInputEvent`): default env, Ctrl+Shift+I reaches `before-input-event`, DevTools stays closed after 8 s while a direct `openDevTools()` works in the same session; `LBA3_DEVTOOLS=1`, the same key opens DevTools | `keys-check.log` |
| F9 overlay, quit | **automated** PASS: F9 shows `#perf`, F9 again removes it; Quit Game exits with code 0; 0 page errors | `run-check.log`, `shots/A-f9.png` |

Note: Playwright's own key presses (CDP) did not reach `before-input-event`, so run-check's A/B DevTools lines are not
evidence; the first `keys-check` run waited 3 s and was inconclusive (DevTools had not opened even by a direct call); the
8 s run above is the result.

Evidence folder (not committed): `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/release-prep/`
(`verify.log`, `run-check.log`, `keys-check.log`, `shots/`, `rc/lba3/desktop/release/`, scripts `build.sh`, `verify.sh`,
`run-check.mjs`, `keys-check.mjs`).

## Soundfont licence (D-3)

- **MuseScore_General.sf2 v0.2** (19 tracks, per `docs/MUSIC.md` and `music-by-place.md`): MIT, verified from the licence
  text kept in the repo, `tools/music/soundfonts/MuseScore_General_License.md`. It says "The acknowledgements and
  copyright notices above must be included in any derivative work." The package carries no such notice today. Whether
  rendered music counts as a derivative work is the user's call; shipping the notice file is the cautious option.
- **MuseScore_General_Full.sf2, HQ "lossless" 0.2.1** (`village_b`, `island_b`, `zeelich_b`): **unconfirmed — the user
  to check.** Known: MUSIC.md says MIT with public-domain / CC0 parts per the Ubuntu package's `copyright` file
  (`musescore-general-soundfont-lossless` 0.2.1-1); that file is not in the repo. The mp3s carry no soundfont metadata.

## Still open

- **P-1 (the user's Windows machine):** build the installer (`cd lba3\desktop && npm ci && npm run dist:win` from a clean
  checkout), record its sha256, install on a fresh account, first launch (title shows `v0.50.0`, fullscreen, SmartScreen),
  Ctrl+Shift+I does nothing, F9 works, New Game → save → quit → Continue, Hebrew setting survives a restart, offline,
  uninstall (saves in `%APPDATA%\LBA3 The Awakening` kept), and the upgrade over an old 0.49.0 install.
- The "Updated …" date on the title is the last web publish stamp, not the desktop build time; testers tell builds apart
  by the version (and "(build N)" for CI builds).
- `.github/workflows/desktop.yml` publishes every `[build]` push as a GitHub pre-release on the repository; for
  private testers, the user may want to keep that repository private or hand out the zip/installer directly.
- D-1 / D-2 (franchise names, shipped layout data) are the user's distribution decision and were not touched here.
