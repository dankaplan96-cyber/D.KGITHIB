# The closed pilot (27.11.2026)

The user's picks: **itch.io, a page closed by a password**; **a closed pilot of 20–30 people**; **a Discord server**.
Everything below is ready to paste. The game is the same build as the web page (`tools/itch-build.mjs` packs it).

## 1. itch.io (the user does this once, ~15 minutes)
1. Make a free account on itch.io → Dashboard → **Create new project**.
2. Fill in:
   - **Title:** `The Awakening (fan-made LBA tribute)` (not "LBA3", see section 5)
   - **Project URL:** e.g. `the-awakening-fan`
   - **Short description:** `A free, non-commercial fan tribute to Little Big Adventure. Closed pilot.`
   - **Classification:** Games · **Kind of project:** HTML
   - **Pricing:** No payments
   - **Uploads:** the zip from `node tools/itch-build.mjs` (≈60 MB); tick **"This file will be played in the browser"**
   - **Embed options:** Viewport 1280 × 720; tick **Fullscreen button**; tick **Automatically start on page load** off (click to launch)
   - **Description:** section 2 below
   - **Genre:** Adventure · **Tags:** `3D`, `adventure`, `fan-game`, `isometric`, `retro`
   - **Visibility & access:** **Restricted** → set a **password** (Access → "Password protected"). Save as **Draft** until the password is set, then **Public** (with the password it is still closed).
3. Give the password only in the Discord's pilot channel (section 3).

## 2. The itch.io page text (English)
> **The Awakening** is a free fan-made tribute to Little Big Adventure 1 and 2, made out of love for Twinsen's world.
>
> Twelve years after LBA2, Twinsen is back home on Citadel Island, and something under the island is starting to wake up.
>
> **This is a closed pilot.** The game is a work in progress; things will break. Please report what you find in our Discord (link below) — what you did, what you expected, what happened, and a screenshot if you can.
>
> **How to play:** a PC with a keyboard, Chrome or Edge (Firefox works too). Click *Run game*, then the fullscreen button. Your progress is saved in the browser on this computer. WASD or the arrow keys to move, W/E to talk and search, Space for the behaviour's action, F1–F4 to change behaviour; a gamepad works too. All keys are in the game's settings, and can be changed there.
>
> **Not official.** This is not affiliated with, endorsed by or connected to the owners of Little Big Adventure. No money is made from it, and it will always be free. All models, music, sounds and code were made for this project; no files from the original games are included. If the rights holders ask, it will be taken down.
>
> Updates come every week. Release planned: 31 May 2027.

## 3. The Discord server (the user creates it; ~20 minutes)
Create server → "For me and my friends" → name **The Awakening – fan game**.

**Roles:** `Dev` (you), `Pilot` (the 20–30 testers), everyone else no role.

**Channels:**
| Category | Channel | Who can write | What |
|---|---|---|---|
| WELCOME | `#welcome-and-rules` | Dev | the welcome text and rules below |
| | `#announcements` | Dev | the weekly update post |
| | `#join-the-pilot` | everyone | one message per person: "I'd like to test" + their PC (Windows/Mac, browser) |
| COMMUNITY | `#general` | everyone | talk |
| | `#screenshots` | everyone | pictures |
| PILOT (only role Pilot + Dev can see) | `#pilot-info` | Dev | the itch.io link + password, how to report |
| | `#bug-reports` | Pilot | one bug per message, the template below |
| | `#feedback` | Pilot | what feels like LBA, what does not |

**#welcome-and-rules (paste):**
> Welcome to **The Awakening**, a free fan-made tribute to Little Big Adventure. 🌍
> 1. Be kind. We're all here because we love Twinsen's world.
> 2. No spoilers outside the pilot channels.
> 3. Don't share the pilot link or password outside the pilot.
> 4. No piracy and no original game files, please.
> 5. This is a fan project, not official, not affiliated with the rights holders, and it will always be free.
> Want to test it? Write in **#join-the-pilot**. Updates every week in **#announcements**.

**#pilot-info (paste, with the link and password):**
> Thanks for testing! 🙏 Play here: <itch link> · password: <password>
> PC with a keyboard, Chrome or Edge. Your save stays in your browser.
> In-game, the pause menu shows the build date: please write it in every report.
> Report in **#bug-reports** with: **Where** (place/chapter) · **What you did** · **What you expected** · **What happened** · **Build date** · a screenshot if you can.

**#bug-reports pinned template:**
```
Where:
What I did:
What I expected:
What happened:
Build date (pause menu):
PC / browser:
```

## 4. The weekly update (every week; the cloud prepares it)
1. The cloud builds the zip (`node tools/itch-build.mjs`) from the newest **published** version and sends it to the user.
2. The user uploads it on itch.io (Edit game → Uploads → replace the file). itch keeps the password.
3. The cloud writes the **#announcements** post in English (what's new, 3–6 lines, one or two pictures, no spoilers past chapter 2), and the user pastes it.
4. Bug reports: the user pastes the week's #bug-reports here; each becomes a P-row in status.md and is fixed game-wide.

## 5. Things to know
- **The title screen still says "LBA3".** For a page others see, "LBA3" reads like an official sequel. Suggested: the title screen shows "The Awakening" with "a fan-made LBA tribute" under it (#21, the names; the user decides).
- **Rights:** the rights holders of LBA are active (they make their own LBA game). A fan game that is free, says clearly it is unofficial, and stays a closed pilot carries less risk, but a takedown request is always possible. The game includes layout **numbers measured** from the user's own copies of LBA1/LBA2 (`ASSET_MANIFEST.md`: the asylum and Temple of Bù rooms, Zeelich's island heights and object places), no original graphics or sounds. For a wider public release later, consider replacing those with our own layouts.
- **Saves** are per browser and per computer; a tester who changes browser starts over.
- Tested: the zip unpacked and served locally boots to the title with no errors (automated runtime only, SwiftShader).
