# CPU-RELIEF: self time of every function called under ROOT (a "name file:line" key from prof.py), per frame.
#   python3 -I under.py file.cpuprofile "update rig.js:1011" FRAMES [N]
import json, sys, collections
p = json.load(open(sys.argv[1])); nodes = {n['id']: n for n in p['nodes']}
parent = {c: n['id'] for n in p['nodes'] for c in n.get('children', [])}
key = lambda n: f"{n['callFrame']['functionName'] or '(anon)'} {n['callFrame']['url'].split('/')[-1]}:{n['callFrame']['lineNumber'] + 1}"
dt = collections.Counter()
for i, s in enumerate(p['samples']): dt[s] += p['timeDeltas'][i] if i < len(p['timeDeltas']) else 0
root, F = sys.argv[2], float(sys.argv[3]); out = collections.Counter(); tot = 0
for nid, t in dt.items():
    x = nid; inside = False
    while x is not None:
        if key(nodes[x]) == root: inside = True; break
        x = parent.get(x)
    if inside: out[key(nodes[nid])] += t; tot += t
print(f'{root}: {tot / 1000 / F:.3f} ms a frame')
for k, v in out.most_common(int(sys.argv[4]) if len(sys.argv) > 4 else 25): print(f"{v / 1000 / F:8.3f} {k}")
