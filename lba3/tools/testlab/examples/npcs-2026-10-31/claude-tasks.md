# LBA3 Test Lab — repair tasks

Run 2026-10-31T16-31-55-npcs · game 0.43.3 (build 292) (packaged) · commit n/a (packaged build) · battery · Test Lab 0.1.0

Each task: fix one finding in the game code, then rerun its reproduction command on the target laptop and check the acceptance criteria.
Measurements are from the machine in the manifest; do not claim a fix without rerunning there.

## F01 · high · Residents: every activity checked and photographed: oda · knock at oda_home: within reach

- Confidence: confirmed
- Observed: 2.57 m (to drawBatch)
- Expected: ≤ 1.2 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "oda · knock at oda_home: within reach" passes in npc-survey on the target laptop, three runs in a row

## F02 · high · Residents: every activity checked and photographed: oda · browse at oda_stall: within reach

- Confidence: confirmed
- Observed: 1.09 m
- Expected: ≤ 1 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "oda · browse at oda_stall: within reach" passes in npc-survey on the target laptop, three runs in a row

## F03 · high · Residents: every activity checked and photographed: maro · knock at maro_home: within reach

- Confidence: confirmed
- Observed: 2.57 m (to drawBatch)
- Expected: ≤ 1.2 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "maro · knock at maro_home: within reach" passes in npc-survey on the target laptop, three runs in a row

## F04 · high · Residents: every activity checked and photographed: tilde · knock at tilde_home: within reach

- Confidence: confirmed
- Observed: 2.57 m (to drawBatch)
- Expected: ≤ 1.2 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "tilde · knock at tilde_home: within reach" passes in npc-survey on the target laptop, three runs in a row

## F05 · high · Residents: every activity checked and photographed: garrick · tend at gar_tend: within reach

- Confidence: confirmed
- Observed: 1.22 m (to original-props)
- Expected: ≤ 1 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "garrick · tend at gar_tend: within reach" passes in npc-survey on the target laptop, three runs in a row

## F06 · high · Residents: every activity checked and photographed: garrick · draw at gar_draw: within reach

- Confidence: confirmed
- Observed: 1.94 m (to drawBatch)
- Expected: ≤ 1 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "garrick · draw at gar_draw: within reach" passes in npc-survey on the target laptop, three runs in a row

## F07 · high · Residents: every activity checked and photographed: garrick · water at gar_water: within reach

- Confidence: confirmed
- Observed: 1.81 m (to original-props)
- Expected: ≤ 1 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "garrick · water at gar_water: within reach" passes in npc-survey on the target laptop, three runs in a row

## F08 · high · Residents: every activity checked and photographed: dot · warm at dot_warm: within reach

- Confidence: confirmed
- Observed: 1.21 m (to drawBatch)
- Expected: ≤ 1 m to what it works on
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "dot · warm at dot_warm: within reach" passes in npc-survey on the target laptop, three runs in a row

## F09 · high · Residents: every activity checked and photographed: dot at dot_warm: not standing inside an object

- Confidence: confirmed
- Observed: a surface 0.25 m above the feet
- Expected: free above the feet
- Reproduce: `node engine/cli.mjs reproduce "C:\Users\dan\lba3\lba3\tools\testlab\runs\2026-10-31T16-31-55-npcs\scenarios\npc-survey.json"`
- Evidence: none
- Source locations: not known
- Acceptance: "dot at dot_warm: not standing inside an object" passes in npc-survey on the target laptop, three runs in a row
