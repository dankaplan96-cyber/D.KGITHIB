# GATE-FIX logs (2026-11-01)

**Spoilers for chapters 3–12.** Text only, no screenshots. See ../../GATE_REPORT.md, "GATE-FIX re-run".

- `pt-NN-*.log` / `.trace`: the playthrough chain on the GATE-FIX commit (snapshot served on port 8772), each segment
  from the previous one's kept save. `pt-11-evacuation-run1-FAIL` and `-run2-FAIL` are the two runs where the bot
  died in the fortress-guard fight (a clover revived it; the knock-back carried it through the control-room door).
  `pt-11-evacuation` is the run with `ASSIST=1`.
- `chain-status.txt`, `test-status.txt`: exit code and wall time of every run.
- `t-*.log`: the other tests on the same commit (port 8773).
- `t-chapter10-newcheck-on-old-spots-FAIL.log`: the new `tests/chapter10.mjs` against the game before the fix
  (commit eb92bbe). The dial check fails there, as B-1 says.
- `probe-lamproom-map.txt`: the lamp room in chapter 10 with the new spots. It holds an occupancy map ('#' brick,
  '.' reachable from the stair top, 'o' a person's body plus his, Z/A/R Zoé/Arthur/relay, 1–3 the dials, S the stair
  top) and the reach of each dial with and without the people.
- `scans/`: the cast scan (tools/scan-cast.mjs) of each kept save. `scan-xNN` were made on the exploratory run of
  01–05 (commit eb92bbe; chapters 1–3 are the same code there), and `scan-fNN` on this chain's saves 06–14.
- `explore-pt-01-T1.log`: the first run of segment 01 with the T-1 fix.
- `probe-postgame.log`: Continue from the save kept after Keep Exploring.
- `tools/`: the commands as run (`commands.sh`) and the probes. Their paths point at `/dev/shm/gatefix`.
