#!/usr/bin/env python3
# perf.py before.json after.json out.json — draw calls / triangles per spot, before and after, with the budget check
import json, sys
b = {r['spot']: r for r in json.load(open(sys.argv[1]))['rows']}
a = json.load(open(sys.argv[2]))
rows = []
for r in a['rows']:
    s = r['spot']; o = b.get(s, {})
    cb, ca = o.get('calls'), r['calls']
    ok = ca <= 775 or (cb and ca <= cb * 1.10)
    rows.append({'spot': s, 'callsBefore': cb, 'callsAfter': ca, 'dCalls': None if cb is None else ca - cb,
                 'trisBefore': o.get('tris'), 'trisAfter': r['tris'], 'texturesBefore': o.get('textures'), 'texturesAfter': r['textures'],
                 'geometriesBefore': o.get('geometries'), 'geometriesAfter': r['geometries'],
                 'heroBefore': [o.get('x'), o.get('z'), o.get('a')], 'heroAfter': [r['x'], r['z'], r['a']], 'views': r.get('views'), 'withinBudget': bool(ok)})
out = {'conditions': a['conditions'] + ' Budget: calls <= before x 1.10, or under 775. Landmark spots: each build its own R.landmark (the stand and look moved where the planner camera model chose a clearer view), so those rows compare views, not identical camera positions.', 'rows': rows}
json.dump(out, open(sys.argv[3], 'w'), indent=1)
for r in rows:
    print(f"{r['spot']:24s} calls {r['callsBefore']}->{r['callsAfter']} ({r['dCalls']:+d})  tris {r['trisBefore']}->{r['trisAfter']}  {'OK' if r['withinBudget'] else 'OVER'}")
