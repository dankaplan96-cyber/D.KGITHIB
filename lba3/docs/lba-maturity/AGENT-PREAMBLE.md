# Shared preamble for every worker agent (the coordinator passes its path in each brief)

You are one agent of the user's LBA3-RUN (docs/LBA3-RUN.md), working on LBA3: The Awakening (three.js browser game;
repo root /home/user/D.KGITHIB, game in lba3/). Your own brief is the agent file named below (in
/home/user/D.KGITHIB/.claude/agents/) — read it first and follow its checklist; this preamble adds the project's
context and rules.

Project instructions to read first: lba3/docs/lba3-audit/START.md (starting revision, build, chapters, baseline tests,
PROTECTED USER CHANGES — do not undo any of them), lba3/docs/lba-maturity/NEXT-SESSION.md (standing rules),
lba3/docs/lba-maturity/status.md (the user's reports P1–P134), KNOWN-FAILING.md, tests/README.md.

Setup: `git fetch origin ccr-c1c2c4b9-dep6ed && git reset --hard origin/ccr-c1c2c4b9-dep6ed`. Commit on your worktree
branch (small commits); do not push; no PR; NEVER publish or deploy anything (no artifact publish). Serve with
`SERVE=1` where the test supports it (tests/lib/serve.mjs: Playwright request routing, no server process), otherwise
`python3 -m http.server <free port>` from lba3; stop it at the end. PC ONLY (the user, 24.11): the game is for a desktop PC; no phone/portrait framing or touch work.
One browser at a time, long timeouts (the machine is shared with one other agent). Use your own scratchpad subfolder
under <the session scratchpad>/<your-agent-name>/. Don't
commit test-overwritten pictures (`git checkout -- lba3/captures/`); never commit LBA1/LBA2 files or extracted
original text/art. Results here are Automated runtime only (SwiftShader, headless Chromium) — say "automated",
"inspected" or "untested" precisely; there is no person playing and no real GPU; never invent hardware numbers.
Old saves must load (save format 6). FEWER TESTS (the user, 23.11): run only the one suite that covers each change, once; no repeats, no extra orders or variants unless a result is in doubt. EVERY FIX IS GAME-WIDE (the user, 23.11, and again 26.11: "every fault like this that we find must go to the whole game, not only one spot"): fix the cause for every case of a fault across the whole game (all bodies, regions, panels of that kind), never one spot only; list the sweep in your report. English is the source text; every new or changed English player line needs its
Hebrew in lba3/src/game/text/he/<file>.js, then `node tools/he-bundle.mjs` and `node tests/dialogue-check.mjs` PASS
(Hebrew action prompts are infinitives; only the text is RTL). New src files are allowed again (since v150 the artifact bundles the code into one file). Visible world/character changes are allowed on the branch but list each one
clearly in your report (the user picks them before anything ships). No spoilers matter in your docs (the coordinator
filters for the user). Save your findings where your agent file says (docs/lba3-audit/<name>.md, i.e.
lba3/docs/lba3-audit/<name>.md). Report briefly at the end: revision, what you did, evidence, files changed, issues
handed to the parent (the coordinator), remaining uncertainty.
