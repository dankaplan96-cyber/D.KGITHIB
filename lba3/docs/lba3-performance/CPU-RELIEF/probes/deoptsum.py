# CPU-RELIEF: deopt.mjs's bailout lines after the "DEOPT-PROBE: street" mark, by function and reason (most first).
import re, sys, collections
on = False; c = collections.Counter()
for line in open(sys.argv[1], errors='replace'):
    if 'DEOPT-PROBE: street' in line: on = True; continue
    if not on or 'bailout' not in line: continue
    m = re.search(r'reason: ([^)]*)\).*?<JSFunction (\S+)', line)
    if m: c[(m.group(2), m.group(1))] += 1
for (f, r), n in c.most_common(40): print(f'{n:5d}  {f:40s} {r}')
