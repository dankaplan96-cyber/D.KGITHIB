# LBA3-RUN · lba3-release: release readiness of the frozen candidate (24.11.2026)

Agent: lba3-release (wave 5, final reviewer; paired with lba3-maturity). Read-only on game sources; nothing uploaded,
signed, published or tagged; no build output committed. Words used precisely: **automated** = a script drove the
packaged app; **inspected** = read in files, the package or an earlier report; **played** = a person at the keys (none
here); **untested** = neither. Every runtime result here is **Automated runtime only (SwiftShader)**: Electron's own
Chromium with software GL under xvfb in the cloud, on a machine shared with another agent. No GPU, no Windows.

## Verdict: **NO-GO** for a public release of this build

The build itself showed no main-path blocker and no data loss in what was run (§3). It cannot be GO because:
1. **Distribution clearance is unresolved** (§5, D-1/D-2): franchise names and branding throughout, and data derived
   from the user's copies of LBA1/LBA2 shipped in the package (F-7, open since v75), with a title disclaimer that says
   everything shipped is original. Missing permission evidence is the owner's decision, not legal clearance.
2. **No packaging evidence for the release target** (§2, P-1): the Windows installer (NSIS .exe) could not be built here
   and no Windows build was run, installed or uninstalled. This part is **NOT VERIFIED**, not failed.
3. **Performance evidence is not from this build** (§6): the wave-4 numbers were taken on code that differs in 26
   `src/` files. NOT VERIFIED on the identical build. Real-GPU performance is untested.

If the user decides D-1/D-2 (for example, private distribution to known testers only), the remaining items are
NOT VERIFIED rather than NO-GO. Then the next step is the Windows retest in §8.

## 1. Candidate, build, hashes

| | |
|---|---|
| Revision | `1bc16b5e8db3114d7729e912b8b7f6f507278d57` (branch `ccr-c1c2c4b9-dep6ed`; origin has since moved to `a5ee9be4`, a doc-only checkpoint, `CHECKPOINTS.md` +1 line, game tree identical) |
| Game code identity | `lba3/src` tree `5b077760`; `lba3/desktop` tree `f4f281ba`. Game files are identical to `7eceb0e5` (GOAL-DRESS); later commits touch tests and docs only (`git diff 7eceb0e5 1bc16b5e -- src index.html css assets vendor desktop tools/game-files.mjs` is empty) |
| Source of the build | `git archive 1bc16b5e lba3` into the scratchpad. No untracked file can enter the package; the worktree was not used |
| Documented recipe | `docs/DESKTOP.md`: `cd desktop && npm ci && npm run dist:win` (on Windows) |
| Tooling | Node 22.23.4, npm 10.9.9, electron 43.7.9, electron-builder 26.16.1 (both pinned in the committed `package-lock.json`); `npm ci`: 283 packages, nothing outside the lock |
| `copy-game.mjs` | `desktop/game: 512 files` (+ icon = 513), 121 MB. Google Fonts link replaced with the bundled Rubik (OFL.txt shipped) |
| Windows zip (portable) | `LBA3-The-Awakening-0.49.0-win.zip`, 203 997 794 B, **sha256 `7e5ece4532c030f93760398953c4010b77fe429d050d53ecc2262d035db6b57b`** (zip timestamps make it differ per build; the contents below are stable) |
| Windows exe in it | `LBA3 The Awakening.exe` sha256 `96660b55dcb4fe62d2e4f381bb671b823b51e046b714ff0826993dceae08f095` (unsigned; icon and metadata applied) |
| `app.asar` (the game) | sha256 **`790cb26e87659fb7824383197002065dfbe0e4cf77f78b2134af5f8ec694c71c`**. It is byte-identical in the Windows build (built three times) and the Linux build that was tested (§3) |
| Windows installer (NSIS) | **not built**: electron-builder needs `wine` on Linux (`spawn wine ENOENT`), also with the documented `-c.win.signAndEditExecutable=false`. Installing wine here was not permitted. The partial 330 KB `Setup.exe` was deleted |
| Linux dir build (for the run) | `--linux dir`: `linux-unpacked/lba3-the-awakening` sha256 `8ba952ac…7c14` |
| Where | `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-release/` (`rc/lba3/desktop/release/`, logs `build-*.log`, `release-check.log`, shots `shots/`). Not committed |

## 2. What was checked, and how

| Check | Status | Evidence |
|---|---|---|
| Clean install | **automated (Linux dir copy)**; Windows **NOT VERIFIED** | The Linux build was copied to an empty install dir. A new empty profile was used (`XDG_CONFIG_HOME`); the profile was confirmed absent before the first launch. The real `~/.config` has no LBA3 profile and was never touched |
| First launch | **automated** PASS | `app://game/index.html`, desktop bridge present. Loaded in 79 / 67 / 75 s (SwiftShader, shared machine; not a hardware number). Title: Continue and Load disabled on a clean profile; Quit Game shown; bundled font; no Google Fonts |
| New Game | **automated** PASS | New Game button → the opening runs → held E skips it → play in the house; objective "Check the well"; autosave written, `v: 6` |
| Continue | **automated** PASS | After a restart, Continue resumes in the house and the opening does not replay |
| Settings persistence | **automated** PASS | Language Hebrew and Text Size Large, set with the settings buttons' own click handler, are stored and survive a restart (title in Hebrew after the relaunch). Switching back to English works. Other settings were not checked one by one |
| Locales: English, Hebrew (RTL) | **automated** + **inspected (screenshots)** PASS | Hebrew: `lang=he`, page `dir=ltr`, objective "לבדוק את הבאר" with `unicode-bidi: plaintext` (only the text is RTL, P54/P68); the Hebrew title, menu and disclaimer read correctly (`shots/B-title-hebrew.png`, `A-hebrew-play.png`). The wording of the whole game in Hebrew: **untested** here (dialogue-check belongs to the dialogue wave) |
| Offline play | **automated** PASS | Run with `--proxy-server` pointing at a dead port: no request left `app://` in three launches, no 4xx/5xx, 0 page/console errors. Inspected: the packaged code names no external URL. Offline is promised in DESKTOP.md ("works offline") |
| Credits | **automated** + **inspected** PASS (contents: see D-3) | Title: the fan disclaimer, and the voice credit "Piper … LibriTTS-R (CC BY 4.0)", in both languages. End card: "The End … Thanks for playing LBA3: The Awakening." It was reached with a test shortcut (the epilogue's `showEnd()`), **not by play**. There is no credits roll. Licence files in the package: three.js MIT header, `assets/fonts/OFL.txt`, Electron/Chromium licence files |
| Clean shutdown | **automated** PASS | Quit Game → process exit code 0 in 0.12–0.16 s, three times. Afterwards no `lba3-the-awaken` process was left (checked with `ps`). The script's own "no process left" check FAILed 3× as a **false positive**: its `pgrep -f <install dir>` matched the test harness's own command line (the PIDs were `timeout`/`xvfb-run`/`node`) |
| Save compatibility (format 6) | **automated** PASS (one case) + **inspected** | Packaged app: a v5 save (`tests/fixtures/pre-col1-save.json`, Hamalayi, chapter 7 `observatory`) put in storage as an earlier build would leave it → Continue → play in `hamalayi`, chapter kept, `lba3_save_v1_backup_v5` made; saving again writes v 6. Wider: save-migration on this game code, 49/49 by lba3-progression plus END-RESUME's 5, rerun by the coordinator (54/54 per the brief; **inspected**, not rerun) |
| Update over the earlier 0.49.0 desktop build | **NOT VERIFIED** | Same appId, same version 0.49.0 (PK-1). An NSIS upgrade over the old install needs Windows |
| Uninstall | **automated (Linux: remove dir)**; Windows **NOT VERIFIED** | Install dir removed. The profile with its save stayed, as DESKTOP.md documents ("Uninstalling the app keeps them"). The disposable profile was then deleted. The NSIS uninstaller and `%APPDATA%` were not seen |
| Windows run (exe, SmartScreen, real GPU, fullscreen default) | **untested** | No Windows machine here |

## 3. Runtime result (packaged Linux build, same `app.asar`)

`release-check.mjs` was run once: 25 checks. 22 PASS. The 3 FAILs are the false-positive leftover-process check (§2,
clean shutdown). Errors: 0. Offline: 0 requests. Missing files: 0 responses ≥ 400. Played: none.

## 4. Package contents

- **Missing assets**: none found. All 14 literal asset paths in the packaged code resolve, except `assets/bake.wasm`,
  which is the artifact's fallback name; `bake.bin` loads first and is present. All 22 music files and 39 + 35 voice banks
  named in their manifests are present. The run had no 404s. Compared with `src/`, only the 54 Hebrew source files
  (`src/game/text/he/*.js`) are left out, by design: they are bundled into `he-text.js`.
- **Debug menus / dev switches**: no debug menu in the UI. URL switches exist (`?nocine`, `?look=`, `?wall=`, `?opening=`,
  `?failstart=`, `?perf`, `?nobake`, `?voicelab`, `?allregions`, `?noearly`, `?nowarm`, `?nobatch`, `?oldshadow`, `?titlefar`
  and others). In the desktop app they are **unreachable**: there is no address bar, the menu is null, navigation is
  limited to `app://`, and the window loads `index.html` without a query (**inspected**). Pause → Benchmark (three
  buttons) and F9 (frame-time overlay) are player-facing features the user uses, not debug items. **PK-3:** Ctrl+Shift+I
  opens DevTools in the packaged build, and `window.game` is global, so the console can change the game.
- **Dev-only paths**: none packaged. `lookdev.html`, `tests/`, `tools/`, `docs/`, `captures/`, `art/` and `desktop/node_modules` are not in
  the asar (540 entries: `/game/**`, `main.js`, `preload.js`, `package.json`). `voicelab.js` is packaged but only
  imported with `?voicelab`.
- **Untracked dependencies**: none. The build comes from `git archive` and dependencies come from the committed lockfile.
  A build made from a working tree (the user's machine) would copy whatever is on disk at those paths, so build from a clean
  checkout.
- **PK-2:** `resources/app-update.yml` (generated from `package.json`'s `repository`) and the asar's `package.json`
  carry the GitHub owner and repo name. The app has no updater.
- **PK-1:** version 0.49.0, the same as the earlier desktop build. The title shows `v0.49.0 · Updated 23.11.2026 04:47`,
  which is the last artifact publish stamp (`src/build-stamp.js`), not this candidate. A local build has no
  `BUILD_NUMBER`. So the installed game cannot be told apart from the old 0.49.0 or from v148.

## 5. Distribution clearance (owner decisions, not legal clearance)

- **D-1 Franchise names and branding** (packaged files naming each): "Little Big Adventure" (index.html meta,
  subtitle, both i18n), the **"LBA 3" logo** and product/window name "LBA3 The Awakening", LBA (140), Twinsen (186),
  Twinsun (47), Zoé (74), FunFrock/Funfrock (51), Sendell (41), Citadel (170), Zeelich (143), Esmer (74), Baldino (74),
  Desert Island (75), Hamalayi (52), Otringal (31), Mosquibee (31), Knartas (19), Grobo (17), Temple of Bù (11),
  Dino-Fly (9), Holomap (9), Quetch (9), Sphero (7), Rabbibunny (7), Kash (7), Dark Monk (4). Models are "shaped after
  measurements of the original models" (ASSET_MANIFEST). **No permission evidence** from the rights holders is in the
  repository. The title disclaimer (non-commercial, not affiliated with Adeline Software or [2.21], characters and world
  belong to their owners) is present in English and Hebrew. A disclaimer is not permission.
- **D-2 Data derived from the originals is shipped** (F-7, open since v75, "the user's decision before any public
  release"):
  - `assets/lba1/asylum.json` and `bumaze.json`: LBA1 room grids reduced to numbers.
  - `assets/lba2/islands/*.json` (7 files): LBA2 island heights and object boxes.
  - `src/game/desert-layout.js`: DESERT.ILE heights, base64.

  The ASSET_MANIFEST also says the GPL-2.0 LBA2 engine source was read for numeric values, and the package licence is
  `UNLICENSED`. The disclaimer's "Story, models, sound and music are original" does not mention the shipped layout data.
- **D-3 Asset provenance gaps in `ASSET_MANIFEST.md`**:
  - Music row stale. It says "generated with WebAudio … draft", but 22 mp3s ship. `docs/MUSIC.md` says they are original,
    rendered with FluidSynth and the MuseScore_General soundfont; the soundfont licence is not recorded.
  - Character voices (`assets/voice`, `voice2`, 74 ogg) are not listed. Their manifests and the title credit say Piper +
    LibriTTS-R, CC BY 4.0: attribution is present; the manifest row is missing.
  - The loading pictures `assets/ui-loading*.jpg` (5) are not listed. Inspected: they are renders of the game.
  - Also not listed: the icon `build/icon.png`, the "MEA Studio" splash (the user's studio name), and the bundled Rubik
    (listed as "loaded at runtime").

## 6. Cross-check: progression and performance on this build

- **Progression** (`progression.md`). Game code identical to the candidate (`7eceb0e5`/`15a849dc`/`b8a81f74`):
  - chain segments 07–12b PASS;
  - 13→14→15 base 3/3 and expanded 3/3 (STAGED);
  - interact-pick 17/17, including its sweep of every fixture's objective stars.

  Segments 01–06 ran on `e433f42e`, which differs by GOAL-DRESS only (7 lines, `main.js` goal pick). That change is
  covered by interact-pick on the identical code; segments 01–06 were not re-run (**residual risk, low**).

  Gaps carried, all **NOT VERIFIED**:
  - expanded chapters 11–13 (Ballastra, Balances, Survey) were not played continuously;
  - the opening film is skipped in the chain (`?nocine`); here it was started and skipped;
  - no person has played the campaign.

  ARM-NAN, the critical blocker found in wave 4, is fixed in this code (`8b7a623f`); it was reached at one spot, so
  real-GPU play is the remaining check.
- **Performance** (`performance.md`): measured on `4cdf28e3` + ARM-COST (`27a0f24f`). That code differs from the candidate
  in 26 `src/` files: Second Shift part 2, ARM-NAN in `rig.js`, GOAL-DRESS, END-RESUME.
  - Draw stubbed, SwiftShader. arrival-steps 10/12: the two FAILs are the known load-bound row.
  - **NOT VERIFIED on the identical build**: no perf suite was re-run here, under the FEWER TESTS rule; the machine was
    shared with lba3-maturity's browser.
  - Real-GPU numbers (GTX 1050, UHD 620, the work computer): **untested**. They need the user's machines (performance.md §6).

## 7. Blockers and findings: owner, evidence, exact retest

| # | Severity | Owner | Evidence | Exact retest |
|---|---|---|---|---|
| D-1 | **Release blocker (clearance)** | **The user** (decision); then the coordinator for wording | §5 counts (`brand-scan.mjs` on the packaged `game/`); no permission evidence in the repo | Not a test. A written decision by the user in `status.md` / FINAL.md: distribute or not, to whom, under which name and logo. If rights-holder permission is obtained, record where it is kept |
| D-2 | **Release blocker (clearance)** | **The user** (F-7 decision); the coordinator (disclaimer and note) | `assets/lba1/*.json`, `assets/lba2/islands/*.json`, `src/game/desert-layout.js` inside `app.asar` (§4 listing) | After the decision: either the note is written and the disclaimer matches what ships, or the files are removed. Then rebuild (`cd lba3/desktop && npm run dist:win`) and run `node node_modules/@electron/asar/bin/asar.js list release/win-unpacked/resources/app.asar \| grep -E "assets/lba[12]\|desert-layout"`; the result must match the decision |
| P-1 | **Release blocker (no packaging evidence)**: NOT VERIFIED | **The user** (Windows machine), with the coordinator | NSIS failed: `spawn wine ENOENT` (`build-win.log`) | On Windows, from a clean checkout of `1bc16b5e` (or the next candidate): `cd lba3\desktop && npm ci && npm run dist:win`. Then: `certutil -hashfile release\LBA3-The-Awakening-Setup-<ver>.exe SHA256` (record it); install on a new Windows user account; first launch (fullscreen default, SmartScreen "Run anyway"); New Game → skip the opening → Pause → Save & quit → Quit Game; relaunch → Continue resumes in the house; Settings → Language עברית → quit → relaunch (still Hebrew); unplug the network for one session; Settings → Apps → uninstall; check whether `%APPDATA%\LBA3 The Awakening` is kept (documented: kept); delete that test account |
| PK-1 | Major (packaging) | Coordinator | `package.json` and `src/main.js` VERSION 0.49.0 = the earlier build; title shows the 23.11 artifact stamp | Bump the version in `desktop/package.json` and `src/main.js` before the release build, and set `BUILD_NUMBER` or the stamp. Retest: the title corner shows the new version on the first launch |
| PK-2 | Minor (privacy) | The user (decision); coordinator | `resources/app-update.yml` (provider github, owner and repo) | Remove `repository` or add `"publish": null` to `build`. Rebuild; check that `resources/app-update.yml` is gone |
| PK-3 | Minor | Coordinator | `desktop/main.js` before-input-event: Ctrl+Shift+I toggles DevTools | Gate it on `!app.isPackaged` or an env flag. Retest: Ctrl+Shift+I in the installed build does nothing |
| PK-4 | Minor (doc) | Coordinator | DESKTOP.md says `-c.win.signAndEditExecutable=false` makes the Windows build work on Linux; the installer still needs wine | Correct DESKTOP.md: on Linux only the zip is built without wine |
| D-3 | Minor (provenance record) | Coordinator; the user for the soundfont licence check | §5 D-3 | Update ASSET_MANIFEST rows (music, voices, loading pictures, icon, splash, bundled Rubik); confirm the MuseScore_General licence |
| PERF | Mandatory cross-check: NOT VERIFIED | Coordinator (cloud), the user (hardware) | §6 | Once, on the frozen candidate: `GAME_URL=… SECS=60 node tests/smooth-routes.mjs` (the three routes at 30 and Unlimited) and `node tests/arrival-steps.mjs`; on the user's machines Pause → Benchmark (performance.md §6) |

No main-path blocker and no data loss was found in this review. Progression's three were fixed before the freeze.

## 8. Remaining uncertainty

- Windows: the exe, the installer, SmartScreen, `%APPDATA%`, fullscreen-by-default and the GPU switches were never
  run. Linux under xvfb with SwiftShader is not the user's platform.
- One old save (v5) was tried in the packaged app; the other formats rely on save-migration (inspected).
- The end card was forced, not reached by play. Expanded chapters 11–13 were only reached from STAGED saves.
- Settings: only language and text size were checked for persistence.
- Asset provenance was read from the repository's own docs; this review cannot confirm where an asset came from.

## 9. Files

- This report: `lba3/docs/lba3-audit/release.md` (the only commit).
- Scratchpad (not committed): `build-win.sh`, `release-check.mjs`, `run-check.sh`, `asset-check.mjs`, `brand-scan.mjs`,
  `release-check.log`, `build-*.log`, `asar-list.txt`, `shots/*.png`, and `rc/lba3/desktop/release/`, which holds the
  zip, `win-unpacked` and `linux-unpacked`. The disposable install and profile were deleted after the uninstall check.
