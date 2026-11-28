# Unfinished work, stopped 27.11 (the user's token limit)

Four workers were stopped mid-work. Their work is saved here as patches against `ccr-c1c2c4b9-dep6ed` (NOT merged,
NOT fully tested). Resume: `git apply --3way docs/lba-maturity/wip/<name>.patch` in a fresh worktree of the branch,
then finish the brief and run its suites.

| Patch | What | State when stopped | The user's picks |
|---|---|---|---|
| `zeelich29-fortstairs.patch` | #29 Zeelich richer + P139a calm stairs (ZEELICH-29.md, FORTSTAIRS-139.md) | first candidates done and tested; was making both default and enriching Zeelich further (people, stalls, signs, facades) | BOTH picked: default; continue enriching |
| `cam30.patch` | #30 camera into walls, game-wide scan (CAM-30.md) | scan + near-cut fix written; the after-scan was about to run | — |
| `light145.patch` | P145 dynamic lighting (LIGHTING-145.md) | time of day / lamp pools in progress, shots script next; nothing shown to the user | the user wants it "really impressive, truly dynamic" |
| `smallfix-27b.patch` | SMALLFIX-27B: isle slides into new obstacles (4, 2 cost a life), slides off edges, the Platform door fence, zeelich-doors and hamalayi-life tests | slide run finished; fixes partly in | — |
