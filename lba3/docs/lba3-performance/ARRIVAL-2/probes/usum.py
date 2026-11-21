# ARRIVAL-2: summary of units.mjs outputs — per area: the draw-batch build units >= 6 ms (count >10/>20/>30, the 5
# longest with labels), the wait / foreign-browser lines. Usage: python3 usum.py file...
import json, sys
for f in sys.argv[1:]:
    print('==', f.split('/')[-1])
    area = None
    units = {}
    for l in open(f):
        l = l.rstrip('\n')
        if l.startswith('waited') or l.startswith('another'): print('  ' + l)
        if l.startswith('== '): area = l[3:]; units[area] = []
        if l.startswith('  {') and area:
            try: units[area].append(json.loads(l.strip()))
            except Exception: pass
        if l.startswith('black frames'): print(f'  {area}: {l}')
    for a, U in units.items():
        D = [u for u in U if u['tag'].startswith('draw')]
        c = lambda t: sum(1 for u in D if u['ms'] > t)
        top = ', '.join(f"{u['ms']} {u['from']}>{u['to']}" for u in sorted(D, key=lambda u: -u['ms'])[:5])
        S = [u for u in U if u['tag'].startswith('shadow')]
        print(f"  {a}: draw units >10 {c(10)}, >20 {c(20)}, >30 {c(30)}; longest {top} | shadow longest {max([u['ms'] for u in S] or [0])}")
