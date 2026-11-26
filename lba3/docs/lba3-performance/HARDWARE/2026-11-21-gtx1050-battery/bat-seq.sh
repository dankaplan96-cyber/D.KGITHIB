#!/bin/sh
# waits for the charger to be unplugged, then the battery runs; stops if the battery falls under 25 %
cd /c/Users/danka/dev/lba3-bench
st() { powershell.exe -NoProfile -Command "\$b = Get-CimInstance Win32_Battery; \"\$(\$b.BatteryStatus) \$(\$b.EstimatedChargeRemaining)\"" | tr -d '\r'; }
echo "waiting for the charger to be unplugged: $(st)"
for i in $(seq 1 720); do s=$(st); [ "${s%% *}" != "2" ] && break; sleep 5; done
s=$(st); [ "${s%% *}" = "2" ] && { echo "still on AC after an hour: stopping"; exit 1; }
echo "on battery: $s ($(date +%T)); 60 s for the power plan to settle"; sleep 60
powershell.exe -NoProfile -Command "powercfg /getactivescheme" | tr -d '\r'
run() { s=$(st); lvl=${s##* }; [ "${s%% *}" = "2" ] && { echo "back on AC before $1: stopping"; exit 1; }; [ "$lvl" -lt 25 ] && { echo "battery $lvl %: stopping before $1"; exit 1; }
  echo "$1 start: $s"; timeout 3600 node benchrun.mjs http://127.0.0.1:8986/ meas/bat-$1.txt $2 $3 > meas/bat-$1.out 2>&1; echo "$1 rc $? end: $(st)"; }
run benchfps-auto benchfps auto
run benchfps-medium benchfps medium
run bench-auto bench auto
run bench-high bench high
echo "done: $(st)"
