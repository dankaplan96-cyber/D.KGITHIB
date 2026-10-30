#!/bin/bash
# RENDER-INV: the regression set, one test at a time against the candidate server, logs in suite/ (screenshots the
# tests write go to a scratch directory). Prints one line per test: name, exit code, its last verdict line.
#   bash suite.sh [test ...]      (default: the block's list)
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../../../.." && pwd)
logs=${LOGS:-$here/suite}; mkdir -p "$logs"
work=${WORK:-/tmp/render-inv-suite}; mkdir -p "$work"
list=${*:-stability transitions timing menus dynres perfbudget doorcull occluders camclear townlife opening chapter1 chapter4 travel deaths holomap}
for t in $list; do
  start=$(date +%s)
  ( cd "$work" && GAME_URL=${GAME_URL:-http://localhost:8176/} timeout ${TMAX:-3600} node "$root/tests/$t.mjs" > "$logs/$t.log" 2>&1 )
  rc=$?
  verdict=$(grep -E "ALL PASSED|FAILED|DONE|no errors|^PASS|^FAIL" "$logs/$t.log" | tail -1)
  echo "$t rc=$rc $(( $(date +%s) - start ))s load=$(cut -d' ' -f1 /proc/loadavg) :: $verdict" | tee -a "$logs/summary.txt"
done
