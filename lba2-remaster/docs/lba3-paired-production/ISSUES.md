# Open issues fed into the pairs (coordinator-only file)

Source lists already in the repo: docs/lba3-production/reviews/AUDIT-CH12/FINDINGS.md (ch.1–2, 21 items: camera batch done by
CAM-CLEAR-2; STORY 3, 4, 5, 7, 8, 11, 17, 18, 19, 20, 21 and ART 6, 9, 10, 16 open), docs/lba3-production/reviews/POLISH-AUDIT/FINDINGS.md,
docs/lba3-production/WORKLIST.he.md.

| ID | Group | Issue | Owner (planned) | Status |
|---|---|---|---|---|
| I-1 | G1 | Twinsen from behind reads as a mushroom with a bald ring (AUDIT-CH12 #6) | G1-ART | pending |
| I-2 | G1 | Statue heads are faceted lumps; Gilbert rough at first talk (#16) | G1-ART | pending |
| I-3 | G1 | Lighthouse: plain cylinders, slab door, no windows (#10); harbour shed a box (#9) | later env-art repair pair | pending |
| I-4 | G1 | Vesk two-shot at the beam pad: the arch crosses Twinsen (arch has colliders only on legs) | G1-CAM | pending |
| I-5 | G1 | Modern controls, street: camera jitter 4–5 > 3 (camsteady, since WORLD-LIFE) | G1-CAM | pending |
| I-6 | G1 | Camera swings to a clear view only when he stands still; walking through tight spots still draws in | G1-CAM | pending |
| I-7 | G1 | STORY batch (#3 journal tense, #4 water-return cut, #5 valve sound, #7 vision cone, #8 square steam sprites, #11 stall canopy, #17 house exit/Talk, #18 ch.2 card, #19 Mira repeats, #20 green plates, #21 minor) | G1 Round 2 (quest + narrative), after CH1-LONGER | pending |
| I-8 | all | Music "a little crackly on every computer" (the user): buffer 10→50 ms in e0d28f4, unheard here | user check in the next build | implemented_unverified |
| I-9 | all | High preset below 60 plugged in (street 54.5, arrival 45); battery Medium street CPU-bound (47.5 as played) | PERF-HIGH (merged 7d446f6) → I-11, I-12 | implemented_unverified (build 244 plugged: High street 59 when the display paces at 60) |
| I-10 | all | ~56.5 fps plateau: settled by build 244 — the display/OS sets the pace ("nothing drawn" 18 ms too); user to check Radeon Chill / Vari-Bright / Windows power + dynamic refresh | the user | blocked (external) |
| I-11 | G1 | Cold first-visit stall: Low street 2750 ms at 2.8 s; arrival 150–200 ms on every preset | PERF round 2 (queued; build batches/shadow batches under the loading card) | pending |
| I-12 | G1 | High arrival CPU-bound (game CPU 16.5 ms, 379 calls); High street at the edge (game CPU 15.4 ms) — harbour (~50 draws at 100 m, cargo lift 51 meshes), grass tiles, face parts | PERF round 2 (queued) | pending |
