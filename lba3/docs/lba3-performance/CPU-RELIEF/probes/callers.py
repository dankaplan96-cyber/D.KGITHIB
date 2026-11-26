# CPU-RELIEF: who calls into FILE (e.g. physics.js): the time spent under FILE's functions, by the nearest caller outside
# it (two levels).   python3 -I callers.py file.cpuprofile physics.js FRAMES
import json, sys, collections
p = json.load(open(sys.argv[1])); nodes = {n['id']: n for n in p['nodes']}
parent = {c: n['id'] for n in p['nodes'] for c in n.get('children', [])}
key = lambda n: f"{n['callFrame']['functionName'] or '(anon)'} {n['callFrame']['url'].split('/')[-1]}:{n['callFrame']['lineNumber'] + 1}"
dt = collections.Counter()
for i, s in enumerate(p['samples']): dt[s] += p['timeDeltas'][i] if i < len(p['timeDeltas']) else 0
f, F = sys.argv[2], float(sys.argv[3]); out = collections.Counter()
for nid, t in dt.items():
    x = nid; inside = None
    while x is not None:
        k = key(nodes[x])
        if f in k: inside = x
        elif inside is not None:
            y = parent.get(x); k2 = key(nodes[y]) if y is not None else ''
            out[k + '  <  ' + k2] += t; break
        x = parent.get(x)
for k, v in out.most_common(20): print(f"{v / 1000 / F:8.3f} ms/frame  {k}")
