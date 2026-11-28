# RENDER-INV: regions.mjs results as one Markdown table (Medium and High side by side).
#   python3 regsum.py results/regions-medium.json results/regions-high.json
import json, sys
runs = [json.load(open(f)) for f in sys.argv[1:]]
views = list(runs[0]['rows'].keys())
head = '| Area / view | ' + ' | '.join(f"{r['quality'].capitalize()} calls (shadow) off → on | submit CPU ms off → on | raster proxy, lamp skip off → on" for r in runs) + ' |'
print(head)
print('|' + '---|' * (1 + 3 * len(runs)))
for v in views:
    cells = []
    for r in runs:
        x = r['rows'].get(v, {})
        if 'batchesOff' not in x:
            cells += ['—', '—', '—']; continue
        a, b, l0, l1 = x['batchesOff'], x['batchesOn'], x['lampSkipOff'], x['lampSkipOn']
        pc = lambda o, n: f"{(n - o) / o * 100:+.0f} %" if o else ''
        cells += [f"{a['calls']:.0f} ({a['shadow']:.0f}) → {b['calls']:.0f} ({b['shadow']:.0f}) {pc(a['calls'], b['calls'])}",
                  f"{a['submitMs']} → {b['submitMs']} {pc(a['submitMs'], b['submitMs'])}",
                  f"{l0['rasterMs']} → {l1['rasterMs']} {pc(l0['rasterMs'], l1['rasterMs'])} (lamps {x.get('lampsLit', '?')})"]
    print(f'| {v} | ' + ' | '.join(cells) + ' |')
for r in runs:
    print(f"\n{r['quality']}: load {r['load']} → {r['loadAfter']}, errors {r['errors']}")
