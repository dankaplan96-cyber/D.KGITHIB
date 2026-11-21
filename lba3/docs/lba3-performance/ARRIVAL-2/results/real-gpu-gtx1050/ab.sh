#!/bin/sh
cd /c/Users/danka/dev/lba3-bench
st() { powershell.exe -NoProfile -Command "\$b=Get-CimInstance Win32_Battery; \"\$(\$b.BatteryStatus) \$(\$b.EstimatedChargeRemaining)\"" | tr -d '\r'; }
echo "power at start: $(st)"
for q in medium high; do for k in 1 2 3; do for w in base:8993 v113:8994; do n=${w%%:*}; p=${w##*:}
  timeout 900 node arrhw.mjs http://127.0.0.1:$p/ $q arr/$n-$q-$k.json > /dev/null 2>&1; echo "$n $q $k rc $?"
done; done; done
echo "power at end: $(st)"
