# Handoff for a new cloud session (4.11.2026)

Start here: read this file, then `docs/future/WORLD_CONSISTENCY.md` (rules R1–R11), `tools/testlab/CLOUD_ORDERS.md`
(orders to the laptop) and `tools/testlab/WORLD_ART_REQUESTS.md` (requests from the laptop). Branch: commit and push
only to `ccr-adf00ea7-37ebl3` (and `expansion/ballastra` for the expansion). No PRs. Reply to the user in Hebrew,
short; player text is English.

## The user's standing rules (keep them)
- The user plays chapters 1–2 only: **no spoilers** past chapter 2 (no pictures, places, people or events from 3–12 or
  the expansion unless asked). Report later-chapter work as "a later chapter".
- Story: Twinsen the protagonist; Zoé and Arthur (12) have agency; two suns, no Earth-style night; FunFrock dead;
  Vesk the villain; planets joined only by spaceship; "Esmer" for Zeelich's peoples, "Wannies" for the moles; no
  sequel promise.
- **IP:** never redistribute LBA1/LBA2 assets; numbers and descriptions only. The GOG files under
  `/root/.claude/uploads/...` are read-only; extract to `/dev/shm` only; never commit originals or the user's photos.
- **R11:** every place has a meaning for the journey, even a small one; no superfluous LBA places, no cacophony.
- ~80 % likeness to LBA1/LBA2 for kept places (`ALIGNMENT.md`).
- Honesty: the container renders with SwiftShader; never claim fps; say when something is unverified by a human.
- **Save tokens** (the user asked): at most 2 agents at a time; short messages; only relevant tests; publish the
  artifact once per batch. Ask before starting new agents beyond the agreed plan.
- No desktop builds for small changes (`docs/BUILDS.md`); the user plays through the pinned artifact
  https://claude.ai/artifact/EjPMQXPwbmre2kDevMC4tA (publish with `root=lba3`, `files` = changed `src`/`assets` paths;
  if refused for "unread" files, check the published sha256 equals an older git version, then `overwrite_unread`).
- Voices: Piper-rendered gibberish banks (`tools/voice-render/piper-banks.py`, `assets/voice/`), LibriTTS-R CC BY 4.0
  credited. The user's taste: soft, varied, human; not synthetic.
- Saves are not critical: old saves must not crash (a clean fallback is enough).

## Testing (how)
`git archive HEAD lba3 | tar -x -C /dev/shm/tNNN`; serve from inside `/dev/shm/tNNN/lba3` with
`(setsid nohup python3 -m http.server PORT >/dev/null 2>&1 < /dev/null &)`; run
`(cd /home/user/geriatrics-course/lba3 && BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:PORT/ timeout 2400 node /home/user/geriatrics-course/lba3/tests/X.mjs)`
(absolute paths: `cd` may not stick); kill the server by pid in its OWN command
(`ps -eo pid,args | awk '/[h]ttp.server PORT/{print $1}' | xargs -r kill`), never on the line that starts it; delete
snapshots after. Scratch probes: `tests/lib/try.mjs <script.js>`. Ports: cloud 850x–852x; agents 8530–8599.

## State at handoff (4.11.2026)
Merged and on the artifact (v32): spaceport crowds by chapter, story journeys (films), residents in chapters 4–9 and on
Zeelich's nine islands (PEOPLE-1), the sewers' ways (SEWERS-1), the asylum (ASYLUM-1: reason, Twinsen's cell, cut-away
ceiling), EQUIP-2 a+b (five new gadgets), the follow camera after doors, fuller 1.25× rooms, the clutter cleanup and
purposes (DECLUTTER), the laptop's requests (CAMPAIGN-1/2, DOORS-1, ZEELICH BAR/HOTEL/TEMPLE/SKY/WANNIE, BG-STUCK-1,
LINE-CLEAR-1), Piper voices, Medium as the default camera distance. A 26-test regression passed on 4.11.

Running when this was written (they report to the old session; if their branches exist unmerged, review and merge):
- `ch12-staging`: chapter 1–2 staging fixes from the user's playtest: the crystal + Sendell scene as a cinematic with
  close-ups; Vesk's ship (docked in ch 1 then "arriving" again in ch 2) and its arrival animation; Vesk's entrance
  framed close; after the Vesk talk Twinsen left in the beam pad's light and Zoé vanishing; Doran teleporting after a
  talk; the follow camera crushed against a window.
- `audio-fix`: Sendell's voice more like a magical spirit; Vesk clearly different from Twinsen; the music crackling
  again (find the cause). Listening files go to the scratchpad `voices/8-sendell.mp3`, `9-twinsen-vesk.mp3`.

## Queue (after those)
1. **ASYLUM-2 story part:** the laptop builds the place (two entrances, the Esmer workers' hostel, Vesk's store, the
   plaque "SEALED BY ORDER OF THE CITADEL ISLAND COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN.", `R.npcSpots`); the cloud
   then writes the people, lines, Vesk's notebook, the hidden humming crate (Arthur's pocket set), the two guards and
   the chapter states (answer in `WORLD_ART_REQUESTS.md`, "ASYLUM-2 · the cloud's answer").
2. Laptop orders 5–6 (`CLOUD_ORDERS.md`): pave the way up to Citadel's tavern as LBA2; bring Zeelich closer to LBA2's.
3. Expansion (`expansion/ballastra`, `docs/future/OREN_PROGRESS.md`): next NW-2 "Local Override" (needs a source the
   player saw, or BR-4); OG-5 when the laptop's W-8 lands; W-1 waits for the user's approval of its pictures.
4. Smaller: chapter 10's glider menu has no glider film; arrival films for chapters 2→3 and 8→9; the follow camera's
   very close first half-second outside a door.
