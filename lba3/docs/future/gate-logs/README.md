# GATE-1 logs (0f77b57, 2026-11-01)

**Spoilers for chapters 3–12.** Not for the user, who plays chapters 1–2 only. These are text logs: no screenshots.

- `pt-NN-*.log` / `.trace`: playthrough segments, chained through real saves. `*-FAIL` and `pt-01-run2` are the runs
  that stopped (T-1, B-1 in ../GATE_REPORT.md).
- `t-*.log`: the gate tests, one at a time.
- `probe-*.log`: page-side probes used to find root causes.
- `chain-status.txt`, `test-status.txt`: exit code and wall time of every run.
- `tools/`: the wrappers, harness workarounds (`seg01-gate.mjs` W-1, `seg13-gate.mjs` W-2) and probes. Their paths
  point at `/dev/shm/gate1`, where the snapshot was served.
- `gatefix/`: the GATE-FIX re-run on 18c7043, which fixes B-1 and T-1. It has its own README.
