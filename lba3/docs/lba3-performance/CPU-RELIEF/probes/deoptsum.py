# CPU-RELIEF: deopt.mjs's bailout lines after the "DEOPT-PROBE: street" mark, by function and reason (most first).
import re, sys, collections
route = None; c = collections.Counter()
for line in open(sys.argv[1], errors='replace'):
    m = re.search(r'DEOPT-PROBE: (\w+)', line)
    if m: route = None if m.group(1) == 'done' else m.group(1); continue
    if not route or 'bailout' not in line: continue
    m = re.search(r'reason: (.*?)\): begin.*?<JSFunction (\S+)', line)
    if m: c[(route, m.group(2), m.group(1))] += 1
for (rt, f, r), n in c.most_common(50): print(f'{n:5d}  {rt:10s} {f:34s} {r}')
