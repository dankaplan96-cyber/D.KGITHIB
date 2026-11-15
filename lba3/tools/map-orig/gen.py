#!/usr/bin/env python3
# Make matched shot lists for lba2remake (LBA2 original data) and for our game, from island-centred metres (IC: x east,
# z south, as tools/lba2-islands.py). Remake three.js units: IC.x = r.z * K, IC.z = -r.x * K (K = 1.3698 m per unit,
# found from the dome islet and the lighthouse). Ours: x = IC.x - 76, z = IC.z + 16 (world.js LAYOUT).
# usage: python3 gen.py <ref heights json> <spots json> <out prefix>
import json, math, sys
K = 32768 * (2.07 / 1238) / 40          # metres per remake unit (a 32768-unit section is 40 units)
ref = json.load(open(sys.argv[1]))
spots = json.load(open(sys.argv[2]))
out = sys.argv[3]
REG = sys.argv[4] if len(sys.argv) > 4 else 'citadel'
ROFF = (40 * K, 20 * K) if REG == 'desert' else (0.0, 0.0)   # (the remake's island origin: Desert's 4 x 5 sections sit one section east and half a section south of its grid's centre)
if REG == 'desert':   # desert.js: world = local + (3400, 0); IC = R(275 deg) (local - (tx, tz))
    _C, _S = math.cos(math.radians(275)), math.sin(math.radians(275)); DY = 0.0
    def our(X, Z): return [round(_C * X - _S * Z - 4 + 3400, 3), round(_S * X + _C * Z - 40, 3)]
else:
    DY = 1.9
    def our(X, Z): return [X - 76, Z + 16]
N, C = ref['nx'], ref['cell']
H = ref['heights']


def ground(X, Z):  # IC metres -> original ground height (m), bilinear
    gx = X / C + (N - 1) / 2; gz = Z / C + (N - 1) / 2
    i = max(0, min(N - 2, int(math.floor(gx)))); j = max(0, min(N - 2, int(math.floor(gz))))
    fx, fz = gx - i, gz - j
    h = lambda a, b: H[b * N + a] / 100
    return (h(i, j) * (1 - fx) + h(i + 1, j) * fx) * (1 - fz) + (h(i, j + 1) * (1 - fx) + h(i + 1, j + 1) * fx) * fz


def to_r(X, Y, Z):
    X, Z = X + ROFF[0], Z + ROFF[1]
    return [round(-Z / K, 3), round(Y / K, 3), round(X / K, 3)]


rem, ours = {'list': []}, {'list': []}
for s in spots:
    if s.get('raw'):   # explicit camera in IC metres: pos [X, Y, Z], target [X, Y, Z]
        P, T = s['pos'], s['target']
        rem['list'].append(dict(name=s['name'], pos=to_r(*P), target=to_r(*T), fov=s.get('fov', 40), fogK=s.get('fogK')))
        ours['list'].append(dict(name=s['name'], pos=[our(P[0], P[2])[0], P[1] + DY, our(P[0], P[2])[1]], target=[our(T[0], T[2])[0], T[1] + DY, our(T[0], T[2])[1]], fov=s.get('fov', 40), abs=True, hero=None, nofog=s.get('nofog', False)))
        continue
    X, Z = s['at']; yaw = math.radians(s['yaw'])
    fx, fz = math.sin(yaw), -math.cos(yaw)
    A, P, F = s.get('arm', 8.75), s.get('pitch', 0.42), s.get('fov', 50)
    piv, ahead = s.get('pivot', 1.4), s.get('ahead', 1.2)
    g = ground(X, Z) + s.get('lift', 0)
    cam = (X - fx * A * math.cos(P), g + piv + A * math.sin(P), Z - fz * A * math.cos(P))
    tgt = (X + fx * ahead, g + piv, Z + fz * ahead)
    rem['list'].append(dict(name=s['name'], pos=to_r(*cam), target=to_r(*tgt), fov=F, fogK=s.get('fogK')))
    # ours: relative to our own ground at the spot (the page reads it), the same offsets
    ours['list'].append(dict(name=s['name'], at=our(X, Z), cam=[our(cam[0], cam[2])[0], cam[1] - g, our(cam[0], cam[2])[1]],
                             target=[our(tgt[0], tgt[2])[0], tgt[1] - g, our(tgt[0], tgt[2])[1]], fov=F, hero=s.get('hero', True), yaw=s['yaw']))
json.dump(rem, open(out + '-remake.json', 'w'), indent=0)
json.dump(ours, open(out + '-ours.json', 'w'), indent=0)
print(len(rem['list']), 'shots')
