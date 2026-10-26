import json, sys, math
A = json.load(open(sys.argv[1]))['regions']['citadel']; B = json.load(open(sys.argv[2]))['regions']['citadel']
zones = [(-160, -10, 16), (-60, -12, 14), (-80.7, -82, 6), (-25.9, -84, 6), (-27.8, -61.6, 3), (-25.25, -31.45, 5)]
def inz(x, z): return any(math.hypot(x - a, z - b) < r for a, b, r in zones)
def key(c): return (c['t'], round(c['x'], 1), round(c['z'], 1), round(c['w'], 1), round(c['d'], 1), round(c['h'], 1))
ca = {key(c) for c in A['colliders']}; cb = {key(c) for c in B['colliders']}
onlyA = [c for c in ca - cb]; onlyB = [c for c in cb - ca]
print('colliders before', len(ca), 'after', len(cb))
print('removed outside zones:', [c for c in onlyA if not inz(c[1], c[2])][:40])
print('added outside zones:', [c for c in onlyB if not inz(c[1], c[2])][:40])
print('removed in zones', len([c for c in onlyA if inz(c[1], c[2])]), 'added in zones', len([c for c in onlyB if inz(c[1], c[2])]))
ta = {(t['x'], t['z'], t['kind']) for t in A['spots']['trees']}; tb = {(t['x'], t['z'], t['kind']) for t in B['spots']['trees']}
print('trees before', len(ta), 'after', len(tb), 'changed outside zones', [t for t in (ta ^ tb) if not inz(t[0], t[1])][:20])
