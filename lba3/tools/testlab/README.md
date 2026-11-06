# LBA3 Test Lab

Launches the real game on this computer, runs repeatable tests, captures evidence and writes a report.
It never uses your own saves or settings, and never changes the installed game.

## Install (once)

Needs Node.js 22+ and Google Chrome (only for the development build).

```
cd lba3/tools/testlab
npm install
node node_modules/electron/install.js
```

(npm 11 may skip Electron's download step; the last line runs it.)

## Start

```
npm start
```

1. **Select Game**: the game's `LBA3 The Awakening.exe`. Use a portable build (unzip
   `LBA3-The-Awakening-<version>-win.zip` from the releases page into its own folder), not the installed game.
   Or **Select Project** for the development build: the repository's `lba3` folder, served on 127.0.0.1 in Chrome.
2. **Run Quick Check** (about 5 min) or **Run Full Test** (about 20–25 min). The window shows the current test,
   progress, elapsed time and the latest finding. Leave the laptop alone while it runs.
3. **Stop** ends safely: the game is closed and a partial report written.
4. **Open Report**: what works, what failed, what is slow, what to fix first, what was not tested.

Other buttons:
- **Reproduce Issue**: pick a scenario from a run's `scenarios/` folder. It runs that test again with the CPU
  profiler on. Each stall then gets the functions and call stack that ran in it, or a note that the wait was
  outside JavaScript.
- **Compare Builds**: the selected game is the baseline; pick the candidate's EXE. It runs baseline → candidate →
  baseline … 3 times each, writes `comparison.csv`, and flags the result as unstable when the baselines disagree.
- **Fix and Retest**: with the `claude` command (Claude Code) installed, it runs a repair loop. It works in its own
  git worktree, makes at most 3 attempts on the top finding, and keeps a fix only when the measurement improves.
  Nothing is pushed. Without the `claude` command, it shows the task file and what to ask Claude Code.

## Command line (same engine)

```
node engine/cli.mjs quick  --game "C:\path\LBA3 The Awakening.exe"
node engine/cli.mjs full   --project ..\..            (development build)
node engine/cli.mjs visual --game "…"                 (contact sheets; separate from performance runs)
node engine/cli.mjs reproduce runs\<run>\scenarios\street-traversal.json
node engine/cli.mjs compare --game "<baseline exe>" --candidate "<candidate exe>" --test street-traversal
node engine/cli.mjs selftest --game "…"               (the tool's own failure handling)
```

Type `stop` and Enter to stop a command-line run.

## Results

Each run's folder is under `runs/`:
- `report.html`: the readable report.
- `results.json`: everything, including every frame record with its timestamp.
- `summary.csv`: the measurement windows.
- `claude-tasks.md`: one task per finding, each with its reproduce command and acceptance criteria.
- `manifest.json`: game version, commit, tool version, settings, hardware and power source.
- `evidence/`: stall records, screenshots, CPU profiles and contact sheets.
- `scenarios/`: one file per test, for Reproduce.

## How it measures (and what it does not claim)

- **Frame data.** Every frame record comes from the game's own instrumentation (`game.perf`), hooked from outside.
  No game file is changed. FPS and percentiles come from the same frames in the same window, and raw timestamps
  are kept.
- **GPU time.** It uses the game's asynchronous timer query, with no synchronous readback. When the browser has no
  timer query, the report says "Unavailable". Clocks and temperatures are always "Unavailable", because Windows
  doesn't report them reliably.
- **Recorded per test.** Each test records whether it used real input (keys through the browser's input pipeline),
  the game's API, injected state (for example a teleport to a start point), or preloaded assets.
- **Determinism.** Input timelines are identical between runs. The game's randomness is not seeded, so its results
  can still differ from run to run.
- **Cold and warm.** A cold run uses a new, empty profile. A warm run uses the kept test profile. A first visit to a
  region and a second visit are reported separately. A stall behind a black screen is counted as a stall, never as
  fixed.
- **Causes.** A failed assertion is *confirmed*. A stall whose frame recorded the work that ran in it is *likely*.
  A stall with nothing recorded is *unexplained*. Timing alone is never treated as a cause.
- **Visual quality.** Animation names and transforms are checked. Whether something looks right is listed under
  "needs visual judgment" and is never passed by the tool.
- **Safety.** Debug connections are the ones Playwright opens on 127.0.0.1 only. The packaged game gets its own
  `--user-data-dir`, and the run stops before any input if the game reports another folder.

`NEEDS_FROM_GAME.md` lists what would make tests stronger and needs a change in the game.
