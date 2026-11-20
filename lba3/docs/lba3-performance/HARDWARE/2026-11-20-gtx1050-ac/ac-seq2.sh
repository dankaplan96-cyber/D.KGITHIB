#!/bin/sh
cd /c/Users/danka/dev/lba3-bench
st() { powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Battery).BatteryStatus" | tr -d '\r'; }
echo "power status at start: $(st) (2 = on AC)"
timeout 2400 node benchrun.mjs http://127.0.0.1:8986/ meas/ac-benchfps-medium.txt benchfps medium > meas/ac-benchfps-medium.out 2>&1; echo "benchfps medium rc $?"
timeout 3600 node benchrun.mjs http://127.0.0.1:8986/ meas/ac-bench-auto.txt bench auto > meas/ac-bench-auto.out 2>&1; echo "bench auto rc $?"
echo "power status at end: $(st)"
