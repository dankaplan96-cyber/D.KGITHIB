# ANIM-POLISH: when each melee move's fist / foot / blade reads as contact, against when combat.js strikes.
# usage: python3 contact.py <dir> [seq...]   (cap.mjs captures of fists / sword)
# Contact pose = the frame the striking hand (foot for the kick) is furthest out along his facing; for the blade, the frame its
# tip crosses straight ahead (its angle from the facing changes sign). Hit time = s + land * a (combat.js MOVES: a punch or
# a kick lands at land 0.5; a blade sweeps its arc over the active frames and strikes as it reaches a dummy 1.6 m ahead).
import json, sys, math
MOVES = {  # combat.js MOVES (s, a, land, arc)
    'jab': (0.07, 0.08, 0.5, None, 'handR'), 'jab2': (0.07, 0.08, 0.5, None, 'handL'), 'kick': (0.13, 0.1, 0.5, None, 'footR'),
    'slash1': (0.11, 0.1, None, (1.25, -1.15), 'blade'), 'slash2': (0.1, 0.1, None, (-1.2, 1.2), 'blade'), 'slash3': (0.19, 0.09, None, (0.3, -0.3), 'blade'),
}
d = sys.argv[1]
for seq in sys.argv[2:] or ['fists', 'sword']:
    S = json.load(open(f'{d}/{seq}.json'))['samples']
    runs = {}
    for s in S:
        m = s.get('move')
        if not m: continue
        runs.setdefault(m['key'], []).append(s)
    for k, R in runs.items():
        sa, a, land, arc, part = MOVES[k]
        if arc:
            # combat.js sweep(): a body of radius 0.5 at 1.6 m dead ahead is taken once the swept sector (the arc so far, 0.12 rad
            # either side) comes within its angular half-width (pad) of straight ahead; a blade strikes as it sweeps
            pad = math.atan2(0.5, 1.6) + 0.12
            hit = sa + a * max(0.0, (abs(arc[0]) - pad) / abs(arc[0] - arc[1]))
        else:
            hit = sa + a * land
        best = None
        prev = None
        for s in R:
            h, ang = s['pos'], s['angle']
            fx, fz = math.sin(ang), math.cos(ang)
            p = s.get(part) if part != 'blade' else s.get('blade')
            if p is None: continue
            dx, dz = p[0] - h[0], p[2] - h[2]
            fwd, side = dx * fx + dz * fz, dx * fz - dz * fx
            if part == 'blade':
                th = math.atan2(side, fwd)
                want = arc[1] - arc[0]   # (the sweep's own direction: a crossing the other way is the wind-up)
                if k == 'slash3':
                    # the overhead: the tip coming down through chest height (1.2 m) in front of him
                    y = p[1] - h[1]
                    if prev is not None and prev[2] > 1.2 >= y and fwd > 0.3 and best is None: best = prev[0] + (s['move']['t'] - prev[0]) * (prev[2] - 1.2) / (prev[2] - y)
                    prev = (s['move']['t'], th, y); continue
                if prev is not None and len(prev) == 2 and (prev[1] > 0) != (th > 0) and (th - prev[1]) * want > 0 and abs(th) < 1.2 and best is None:
                    # interpolate the crossing
                    u = prev[1] / (prev[1] - th)
                    best = prev[0] + (s['move']['t'] - prev[0]) * u
                prev = (s['move']['t'], th)
            else:
                R2 = R
                if best is None: best = []
                best.append((s['move']['t'], fwd))
        if part != 'blade':
            # the fist / foot arrives: the first frame at 90 % of its furthest reach out (from its guard)
            f0, fm = best[0][1], max(f for _, f in best)
            t = next(tt for tt, f in best if f >= f0 + 0.9 * (fm - f0))
        else: t = best
        print(f"{seq:6s} {k:7s} hit {hit*1000:5.0f} ms  contact pose {('%5.0f ms' % (t*1000)) if t is not None else '  n/a'}  diff {('%+4.0f ms' % ((t-hit)*1000)) if t is not None else ''}")
