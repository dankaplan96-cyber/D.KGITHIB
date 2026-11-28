---
name: lba3-measure-in-desktop-app
description: LBA3 laptop measurements run in the installed desktop app by default; Chrome only for quick A/B of the branch
metadata:
  type: feedback
---

Measure LBA3 in the installed desktop app (C:\Users\dan\lba3-bench\electron-bench.mjs, Playwright _electron, exe under %LOCALAPPDATA%\Programs\LBA3 The Awakening), not Chrome. Result files say "desktop app <version>". Keep the Chrome runner (chrome-bench.mjs, needs `python -m http.server 8161` in lba2-remaster) for quick A/B checks of the branch before a build.

**Why:** the user wants numbers from what they actually play (2026-10-30).
**How to apply:** always launch with the bench profile (--user-data-dir=lba3-bench\electron-profile), never the real %APPDATA%\LBA3 The Awakening (the user's chapter 1–2 saves; backup in lba3-bench\save-backup-2026-10-30). Run auto, then full. See [[lba3-local-setup]].
