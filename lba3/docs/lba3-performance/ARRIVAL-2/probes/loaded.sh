#!/bin/bash
# runs a command with N busy CPU loops beside it (a controlled load, standing in for "another browser on the machine")
N=${N:-3}
pids=()
for i in $(seq 1 $N); do node -e 'for(;;){}' & pids+=($!); done
"$@"
rc=$?
kill "${pids[@]}" 2>/dev/null
exit $rc
