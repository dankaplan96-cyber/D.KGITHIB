# ARRIVAL-2: the trace's user-timing UNIT measures and the GC events overlapping each (main thread of the renderer)
import json, sys
d = json.load(open(sys.argv[1])); ev = d['traceEvents'] if isinstance(d, dict) else d
units = {}
for e in ev:
    n = e.get('name', '')
    if n.startswith('UNIT') and e.get('ph') in ('b', 'e'):
        k = (n, e.get('id') or e.get('id2', {}).get('local'))
        units.setdefault(k, {})[e['ph']] = e['ts']
gc = [e for e in ev if e.get('ph') == 'X' and any(s in e.get('name', '') for s in ('GC', 'Scavenge', 'MarkCompact', 'V8.GC'))]
for (n, _), v in sorted(units.items(), key=lambda x: x[1].get('b', 0)):
    b, en = v.get('b'), v.get('e')
    if b is None or en is None: continue
    ov = {}
    for g in gc:
        s, t = g['ts'], g['ts'] + g.get('dur', 0)
        o = min(t, en) - max(s, b)
        if o > 0: ov[g['name']] = ov.get(g['name'], 0) + o / 1000
    top = sorted(ov.items(), key=lambda x: -x[1])[:5]
    print(n, ' | GC overlap:', ', '.join(f'{k} {v:.1f}' for k, v in top) or 'none')
