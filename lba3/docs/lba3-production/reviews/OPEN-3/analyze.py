# OPEN-3: reads capture.mjs's log.json and lists, per actor, the frames (picture up, not under a dip to black)
# where the actor's circle overlaps a solid collider, a foot floats or sinks, the actor slides while not walking,
# or jumps between frames.   python3 -I analyze.py <log.json>
import json, sys, math
log = json.load(open(sys.argv[1]))
def runs(items):
    # group consecutive frame times into ranges
    out = []
    for t, info in items:
        if out and t - out[-1][1] < 0.1: out[-1][1] = t; out[-1][2].add(info)
        else: out.append([t, t, {info}])
    return out
hits, feet, slide, jump = {}, {}, {}, {}
prev = {}
for r in log:
    for id, a in r['a'].items():
        if not a['vis'] or r['fade']: prev.pop(id, None); continue
        for h in a['hits']:
            hits.setdefault(id, []).append((r['t'], f"{h['type']}@{h['x']},{h['z']} top {h['top']} {h.get('tag','')}"))
        lo = min(a['feet']); hi = max(a['feet'])
        if a['anim'] not in ('walk', 'run') and lo > 0.16: feet.setdefault(id, []).append((r['t'], f"{a['anim']} feet {lo:.2f}"))
        if lo < -0.04: feet.setdefault(id, []).append((r['t'], f"{a['anim']} sinks {lo:.2f}"))
        if a['pos'][1] - a['floor'] > 0.05: feet.setdefault(id, []).append((r['t'], f"raised {a['pos'][1]-a['floor']:.2f}"))
        p = prev.get(id)
        if p:
            d = math.hypot(a['pos'][0] - p['pos'][0], a['pos'][2] - p['pos'][2])
            dt = r['t'] - p['t'] or 1 / 30
            if d / dt > 3.0: jump.setdefault(id, []).append((r['t'], f"{d:.2f} m"))
            elif d > 0.002 and a['anim'] not in ('walk', 'run'): slide.setdefault(id, []).append((r['t'], f"{a['anim']} {d/dt:.2f} m/s"))
            dy = abs(a['pos'][1] - p['pos'][1])
            if dy > 0.08: jump.setdefault(id, []).append((r['t'], f"dy {dy:.2f}"))
        prev[id] = {'pos': a['pos'], 't': r['t']}
for name, D in (('SOLIDS', hits), ('FEET', feet), ('SLIDE', slide), ('JUMP', jump)):
    print('==', name)
    for id, it in D.items():
        for t0, t1, info in runs(it): print(f"  {id:9s} {t0:6.2f}-{t1:6.2f}  {sorted(info)[:3]}")
