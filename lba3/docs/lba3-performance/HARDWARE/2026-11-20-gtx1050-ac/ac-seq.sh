#!/bin/sh
cd /c/Users/danka/dev/lba3-bench
st() { powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Battery).BatteryStatus" | tr -d '\r'; }
echo "power status at start: $(st) (2 = on AC)"
timeout 2400 node benchrun.mjs http://127.0.0.1:8986/ meas/ac-benchfps-medium.txt benchfps medium > meas/ac-benchfps-medium.out 2>&1; echo "benchfps medium rc $?"
timeout 3600 node benchrun.mjs http://127.0.0.1:8986/ meas/ac-bench-auto.txt bench auto > meas/ac-bench-auto.out 2>&1; echo "bench auto rc $?"
# 52.2: the harbour and the square, v103 against v95 (the game's own loop, 3 s warm + 10 s), twice each, interleaved
for k in 1 2; do for v in v95 v103; do timeout 900 node v93gpu.mjs C:/Users/danka/dev/${v}w/lba3 $v-$k meas/frames 1536 864 1.25 frames > meas/frames-$v-$k.out 2>&1; echo "frames $v $k rc $?"; done; done
echo "power status at end: $(st)"
