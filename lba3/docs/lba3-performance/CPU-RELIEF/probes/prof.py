# CPU-RELIEF: a .cpuprofile (sections.mjs CPUPROFILE=) as self time per function, and inclusive time for the
# functions whose name/file matches FILTER.   python3 -I prof.py file.cpuprofile [FILTER] [N]
import json, sys, collections
p = json.load(open(sys.argv[1])); nodes = {n['id']: n for n in p['nodes']}
parent = {c: n['id'] for n in p['nodes'] for c in n.get('children', [])}
dt = collections.Counter()
for i, s in enumerate(p['samples']):
    dt[s] += p['timeDeltas'][i] if i < len(p['timeDeltas']) else 0
key = lambda n: f"{n['callFrame']['functionName'] or '(anon)'} {n['callFrame']['url'].split('/')[-1]}:{n['callFrame']['lineNumber'] + 1}"
selft = collections.Counter()
for nid, t in dt.items(): selft[key(nodes[nid])] += t
tot = sum(selft.values())
N = int(sys.argv[3]) if len(sys.argv) > 3 else 40
print('total ms', round(tot / 1000, 1))
for k, v in selft.most_common(N): print(f"{v / 1000:9.1f} {100 * v / tot:5.1f}% {k}")
if len(sys.argv) > 2 and sys.argv[2]:
    filt = sys.argv[2]; inc = collections.Counter()
    for nid, t in dt.items():
        seen = set(); x = nid
        while x is not None:
            k = key(nodes[x])
            if k not in seen: inc[k] += t; seen.add(k)
            x = parent.get(x)
    print('--- inclusive, matching', filt)
    for k, v in inc.most_common(2000):
        if filt in k: print(f"{v / 1000:9.1f} {100 * v / tot:5.1f}% {k}")
