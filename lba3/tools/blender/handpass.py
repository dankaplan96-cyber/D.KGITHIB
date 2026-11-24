# HANDS-2 (the user, 24.11, after the notebook cut's close-up: "the hands look like big blocky paws"; the pick: "more
# detailed hands", game-wide). Every character's hands built as hands in the original's cartoon style: a palm and the back
# of the hand as one rounded block, separate fingers with a gap between each, curled a little toward the palm (relaxed),
# a thumb of its own set off the palm's front edge at about 50 degrees, and a wrist slimmer than the palm that runs up
# into the sleeve. Each species keeps its own hand: Quetch (and the human-like canal folk and Zeelich elves) four fingers;
# a Grobo a broad hand with three stout fingers; a Rabbibunny a round furry hand with three short fingers; a Sphero LBA1's
# big round hand, now with three stubby fingers; an Esmer a narrow hand with three long fingers. Sizes and places follow
# the old hands (the ball's envelope, so the silhouette at play distance and every grip stay where they were).
#
# A pass over a model's exported JSON (assets/poly/<name>.json): the triangles that ride the hand bone alone are the old
# hand (ball, thumb, knuckle lobes, the CONNECT-1 wrist; Twinsen's fist; Zoé's mitten and its finger lines), removed and
# replaced by the new hand on the same bone. One pass for every builder (cast_poly.py, twinsen_poly.py, zoe_poly.py,
# baldino_poly.py, ballastra_poly.py): lbapoly.Builder.export runs it on what it writes, so a rebuild keeps the new hands;
# HANDS2_OLD=1 skips it (the old hands, for comparisons). Idempotent: run again, it rebuilds the same hands.
#   PYTHONPATH=tools/blender/nobpy python3 tools/blender/handpass.py assets/poly [names...]   (in place)
# Not changed: the Zeelich insects and moles (claws), the tri-heads' and Vesk's gauntlet hand, the FunFrock clones (their
# own designs), and the sculpted fallback in src/game/characters.js (handDef: used only when a model fails to load).
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Vector  # noqa: E402
from lbapoly import corner_normals, smooth  # noqa: E402

SKEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'characters', 'skeletons.json')

# ------------------------------------------------------------------ the hands (lengths for k = 1: a Quetch adult, whose
# old ball had r 0.05). s runs down the hand from the wrist's crease; w across it, + toward the thumb (the body's front at
# rest); p through it, + toward the palm (the thigh at rest). Palm sections: (s, half-width, half-thickness, offset to p).
# Fingers: (w at the knuckle, radius, length). Curl: degrees toward the palm at the knuckle, the middle joint, the tip.
QUETCH = dict(
    wrist=(-0.06, 0.008, 0.0185, 0.0142, 0.0205, 0.0152),
    palm=[(-0.006, 0.0205, 0.0148, 0.0), (0.016, 0.0262, 0.0156, 0.0012), (0.035, 0.0288, 0.0146, 0.0012), (0.050, 0.0272, 0.0112, -0.0006)],
    knuckle=0.046, fback=-0.0022,
    fingers=[(0.0204, 0.0073, 0.039), (0.0068, 0.0077, 0.043), (-0.0068, 0.0074, 0.040), (-0.0198, 0.0065, 0.032)],
    spread=0.10, curl=(16, 28, 16),
    thumb=dict(s=0.010, w=0.78, p=0.005, d1=(0.62, 0.55, 0.40), d2=(0.80, 0.12, 0.55), len=(0.022, 0.018), r=(0.0097, 0.0088, 0.0074)),
    ew=0.6, ep=0.85,
)
GROBO = dict(
    wrist=(-0.06, 0.008, 0.021, 0.0165, 0.0225, 0.0172),
    palm=[(-0.006, 0.0225, 0.0168, 0.0), (0.015, 0.0285, 0.0182, 0.0015), (0.032, 0.0305, 0.0172, 0.0015), (0.045, 0.0285, 0.0138, 0.0)],
    knuckle=0.041, fback=-0.0025,
    fingers=[(0.0186, 0.0097, 0.030), (0.0, 0.0103, 0.033), (-0.0186, 0.0095, 0.029)],
    spread=0.08, curl=(14, 26, 14),
    thumb=dict(s=0.010, w=0.78, p=0.006, d1=(0.62, 0.55, 0.40), d2=(0.80, 0.12, 0.55), len=(0.020, 0.015), r=(0.0118, 0.0106, 0.0090)),
    ew=0.7, ep=0.9,
)
BUNNY = dict(
    wrist=(-0.06, 0.008, 0.0185, 0.0150, 0.0205, 0.0160),
    palm=[(-0.006, 0.0205, 0.0160, 0.0), (0.014, 0.0262, 0.0176, 0.0015), (0.031, 0.0278, 0.0170, 0.0015), (0.043, 0.0250, 0.0136, 0.0)],
    knuckle=0.039, fback=-0.0020,
    fingers=[(0.0166, 0.0088, 0.026), (0.0, 0.0094, 0.029), (-0.0166, 0.0086, 0.025)],
    spread=0.06, curl=(14, 24, 14),
    thumb=dict(s=0.010, w=0.78, p=0.006, d1=(0.64, 0.55, 0.40), d2=(0.80, 0.14, 0.55), len=(0.017, 0.012), r=(0.0096, 0.0086, 0.0074)),
    ew=0.85, ep=0.9,
)
SPHERO = dict(
    wrist=(-0.045, 0.008, 0.0090, 0.0085, 0.012, 0.011),
    palm=[(-0.004, 0.0170, 0.0165, 0.0), (0.012, 0.0270, 0.0215, 0.0015), (0.030, 0.0300, 0.0225, 0.0015), (0.045, 0.0275, 0.0175, 0.0)],
    knuckle=0.041, fback=-0.0030,
    fingers=[(0.0180, 0.0094, 0.026), (0.0, 0.0100, 0.029), (-0.0180, 0.0092, 0.025)],
    spread=0.08, curl=(12, 24, 14),
    thumb=dict(s=0.014, w=0.80, p=0.007, d1=(0.60, 0.58, 0.40), d2=(0.80, 0.14, 0.55), len=(0.018, 0.013), r=(0.0110, 0.0098, 0.0082)),
    ew=0.85, ep=0.9,
)
ESMER = dict(
    wrist=(-0.06, 0.008, 0.0170, 0.0125, 0.0185, 0.0130),
    palm=[(-0.006, 0.0180, 0.0122, 0.0), (0.016, 0.0220, 0.0126, 0.0010), (0.036, 0.0236, 0.0116, 0.0010), (0.050, 0.0212, 0.0090, -0.0004)],
    knuckle=0.046, fback=-0.0018,
    fingers=[(0.0148, 0.0066, 0.082), (0.0, 0.0071, 0.095), (-0.0146, 0.0064, 0.078)],
    spread=0.06, curl=(8, 16, 12),
    thumb=dict(s=0.012, w=0.80, p=0.004, d1=(0.66, 0.52, 0.36), d2=(0.82, 0.14, 0.50), len=(0.030, 0.026), r=(0.0084, 0.0074, 0.0060)),
    ew=0.6, ep=0.85,
)


def scaled(st, wf=1.0, tf=1.0, rf=1.0):
    """A style made narrower (wf across), thinner (tf through) or with slimmer fingers (rf): Zoé's slender hand."""
    st = dict(st)
    a, b, hw0, ht0, hw1, ht1 = st['wrist']
    st['wrist'] = (a, b, hw0 * wf, ht0 * tf, hw1 * wf, ht1 * tf)
    st['palm'] = [(s, hw * wf, ht * tf, off * tf) for s, hw, ht, off in st['palm']]
    st['fingers'] = [(w * wf, r * rf, ln) for w, r, ln in st['fingers']]
    th = dict(st['thumb'])
    th['r'] = tuple(r * rf for r in th['r'])
    st['thumb'] = th
    return st


def spec(name, look):
    """The hand a model gets: (style, k, crease: where the wrist's crease sits down the hand bone's axis, sides) or None."""
    race = look.get('race')
    kid = bool(look.get('kid'))
    if name == 'twinsen':   # (HANDS-2b, the user 24.11: "bring his hands back to what they were — it's better": his own fist kept)
        return None
    if name == 'zoe':       # (her ZOE-OPEN mitten's length and place, slimmer)
        return dict(scaled(QUETCH, 0.84, 0.86, 0.84), sides=8), 1.45, -0.004, 'LR'
    if name == 'baldino':   # (his own script's ball, r 0.06, centred 3.5 cm down the hand)
        return GROBO, 1.2, 0.004, 'LR'
    if race == 'sphero':    # (LBA1's big ball, r 0.0965, centred on the bone)
        return scaled(SPHERO, 1.3, 1.25, 1.25), 2.35, -0.095, 'LR'
    if name == 'vesk':      # (his left hand only: the right is the brass gauntlet with claws)
        return QUETCH, 0.96, -0.01, 'L'
    if race == 'canal':     # (Ballastra's canal folk: the cast's ball hand; the dockers' a little bigger, gloved)
        return (QUETCH, 1.12, 0.0, 'LR') if name.startswith('docker') else (QUETCH, 1.0, 0.0, 'LR')
    if race == 'elf':       # (the Zeelich children's ball, r 0.055, centred on the bone)
        return QUETCH, 1.1, -0.029, 'LR'
    if race == 'esmer':
        return ESMER, 1.0, 0.008, 'LR'
    hr = (0.075 if race == 'grobo' else 0.05) * (0.9 if kid else 1) * (look.get('handS') or 1)   # (cast_poly.py's ball)
    # (the cast's hands a little fuller than the bare proportions, so beside the old ball (10 cm across) they do not read
    # small at play distance; set up to the cuff so the wrist shows 1-2 cm, as the ball's did)
    k = hr / 0.05
    if race == 'grobo':
        return scaled(GROBO, 1.1, 1.06, 1.08), k * 1.15, -0.012 * k, 'LR'
    if race == 'bunny':
        return scaled(BUNNY, 1.22, 1.12, 1.2), k * 1.12, -0.012 * k, 'LR'
    if race == 'quetch':
        return scaled(QUETCH, 1.1, 1.06, 1.1), k * 1.1, -0.012 * k, 'LR'
    return None   # (bees, moles, tri-heads, clones: their own hands)


# ------------------------------------------------------------------ geometry
def _sp(x, e):
    return math.copysign(abs(x) ** e, x)


class Mesh:
    def __init__(self):
        self.v, self.f, self.shade, self.pid = [], [], [], []

    def piece(self, rings, cap0=None, cap1=None, shades=None):
        """A loft through rings (lists of points), faces turned outward; cap0 / cap1: a point closing that end."""
        n, o = len(rings[0]), len(self.v)
        for j, r in enumerate(rings):
            self.v += [tuple(p) for p in r]
            self.shade += [shades[j] if shades else 1.0] * n
        faces = [[o + j * n + i, o + j * n + (i + 1) % n, o + (j + 1) * n + (i + 1) % n, o + (j + 1) * n + i]
                 for j in range(len(rings) - 1) for i in range(n)]
        if cap0 is not None:
            self.v.append(tuple(cap0)); self.shade.append(shades[0] if shades else 1.0)
            faces += [[o + (i + 1) % n, o + i, len(self.v) - 1] for i in range(n)]
        if cap1 is not None:
            self.v.append(tuple(cap1)); self.shade.append(shades[-1] if shades else 1.0)
            e = o + (len(rings) - 1) * n
            faces += [[e + i, e + (i + 1) % n, len(self.v) - 1] for i in range(n)]
        # outward: the first side face's normal against the way out from its ring's middle
        a, b, c = (Vector(self.v[i]) for i in faces[0][:3])
        mid = sum((Vector(p) for p in rings[0]), Vector((0, 0, 0))) / n
        if (b - a).cross(c - a).dot(a - mid) < 0:
            faces = [list(reversed(f)) for f in faces]
        self.f += faces
        self.pid += [len(set(self.pid))] * (len(self.v) - len(self.pid))


def cartoon_hand(O, d, pv, wv, k, st, crease, fore=None):
    """The hand in the frame (O the hand bone, d down the hand, pv toward the palm, wv toward the thumb), scaled by k,
    its wrist's crease `crease` down d from O. Returns a Mesh (vertices, quads/triangles, a shade per vertex)."""
    m = Mesh()
    ew, ep = st['ew'], st['ep']
    FN = st.get('sides', 6)   # (a finger's sides: 8 for the two seen close in the opening's shots, 6 for the cast)
    O, d, pv, wv = Vector(O), Vector(d), Vector(pv), Vector(wv)
    at = lambda s, w=0.0, p=0.0: O + d * (crease + s * k) + wv * (w * k) + pv * (p * k)

    def ring(c, t, hw, ht, n, e1=ew, e2=ep):
        t = t.normalized()
        np_ = (pv - t * pv.dot(t)).normalized()
        nw = t.cross(np_).normalized()
        if nw.dot(wv) < 0:
            nw = -nw
        return [c + nw * (_sp(math.cos(2 * math.pi * i / n), e1) * hw) + np_ * (_sp(math.sin(2 * math.pi * i / n), e2) * ht) for i in range(n)]

    # the wrist: from inside the sleeve into the palm, slimmer than the palm
    s0, s1, hw0, ht0, hw1, ht1 = st['wrist']
    hw1, ht1 = min(hw1, st['palm'][0][1] * 0.94), min(ht1, st['palm'][0][2] * 0.88)   # (inside the palm where it enters)
    if fore:
        # a bare forearm in the hand's own colour ends here (fore = its end down d, its half-sizes across w and p, its
        # centre's offsets): the wrist starts inside it at its size and narrows to the wrist, no step where they meet
        fe, fw, fp, cw, cp = fore
        top = O + d * (fe - 0.003) + wv * cw + pv * cp
        m.piece([ring(top, d, fw * 1.04, fp * 1.04, 8, 1, 1), ring(at(s1), d, hw1 * k, ht1 * k, 8, 0.8, 0.9)])
    else:
        m.piece([ring(at(s0), d, hw0 * k, ht0 * k, 8, 0.8, 0.9), ring(at(s1), d, hw1 * k, ht1 * k, 8, 0.8, 0.9)])
    # the palm and the back of the hand: rounded sections, closed under the knuckles
    P = st['palm']
    sL, hwL, htL, offL = P[-1]
    P = P + [(sL + 0.006, hwL * 0.8, htL * 0.72, offL)]   # (rounded over the knuckles: no ledge where the fingers come out)
    rings = [ring(at(s, 0, off), d, hw * k, ht * k, 8) for s, hw, ht, off in P]
    shades = [1.0] * (len(P) - 2) + [0.9, 0.84]   # (the knuckles' edge between the fingers' roots, a shade darker: the gaps read)
    m.piece(rings, cap1=at(sL + 0.0095, 0, offL), shades=shades)
    # the fingers: each from inside the palm, two joints curling toward the palm, a round tip
    c1, c2, c3 = (math.radians(a) for a in st['curl'])
    for w, r, ln in st['fingers']:
        lift = 0.004 if (len(st['fingers']) == 4 and w == st['fingers'][-1][0]) else 0.0   # (the little finger sits higher)
        df = (d + wv * (st['spread'] * (w / 0.02))).normalized()
        dirs = [(df * math.cos(a) + pv * math.sin(a)).normalized() for a in (c1, c1 + c2, c1 + c2 + c3)]
        R = r * k
        wk = w if abs(w) < 0.012 else w - math.copysign(0.0018, w)   # (the outer two set in from the palm's rounded edge)
        K = at(st['knuckle'] - lift, wk, st['fback'])
        B = K - dirs[0] * (R * 0.9)
        M = K + dirs[0] * (ln * k * 0.52)
        D = M + dirs[1] * (ln * k * 0.48 - R * 0.6)
        T = D + dirs[2] * (R * 0.5)
        rs = [ring(B, dirs[0], R * 0.8, R * 0.72, FN, 1, 1), ring(M, (dirs[0] + dirs[1]), R * 0.95, R * 0.88, FN, 1, 1),
              ring(D, (dirs[1] + dirs[2]), R * 0.88, R * 0.80, FN, 1, 1), ring(T, dirs[2], R * 0.66, R * 0.60, FN, 1, 1)]
        m.piece(rs, cap0=B - dirs[0] * (R * 0.5), cap1=D + dirs[2] * (R * 0.92), shades=[0.84, 0.97, 1.0, 1.0])
    # the thumb: off the palm's front edge near the wrist, out and forward, its tip turned in toward the palm
    th = st['thumb']
    hw_at = P[1][1]
    T0 = at(th['s'], hw_at * th['w'], th['p'])
    d1 = (d * th['d1'][0] + wv * th['d1'][1] + pv * th['d1'][2]).normalized()
    d2 = (d * th['d2'][0] + wv * th['d2'][1] + pv * th['d2'][2]).normalized()
    r0, r1, r2 = (x * k for x in th['r'])
    T1 = T0 + d1 * (th['len'][0] * k)
    T2 = T1 + d2 * (th['len'][1] * k - r2 * 0.6)
    T3 = T2 + d2 * (r2 * 0.5)
    T0b = T0 - wv * (r0 * 1.1) - d * (r0 * 0.3)   # (the root buried in the palm, in from its front edge: not out of the back)
    rs = [ring(T0b, d1, r0 * 0.9, r0 * 0.8, FN, 1, 1), ring(T1, d1 + d2, r1, r1 * 0.9, FN, 1, 1),
          ring(T2, d2, r2, r2 * 0.88, FN, 1, 1), ring(T3, d2, r2 * 0.68, r2 * 0.6, FN, 1, 1)]
    m.piece(rs, cap0=T0b - d1 * (r0 * 0.4), cap1=T2 + d2 * (r2 * 0.92), shades=[0.9, 1.0, 1.0, 1.0])
    return m


def frame(B, s, sx):
    """The hand's frame at rest: down the forearm (elbow → hand bone), toward the palm (the thigh), toward the thumb (front)."""
    hd, el = Vector(B['hand' + s]['p']), Vector(B['el' + s]['p'])
    d = (hd - el).normalized()
    pv = Vector((-sx, 0.0, 0.0))
    pv = (pv - d * pv.dot(d)).normalized()
    wv = pv.cross(d).normalized()
    if wv.z < 0:
        wv = -wv
    return hd, d, pv, wv


def forearm(out, bones, s, base, hd, d, pv, wv, crease, wrist):
    """A bare forearm on the elbow's bone in the hand's colour (Arthur's rolled sleeves, the Esmers', Zoé's, Baldino's):
    its last 3.5 cm tapered to the new wrist's size (`wrist`: half-width, half-thickness), so the arm narrows into the hand
    as an arm does instead of ending in a cut 7 cm across over a 5 cm hand. A clamp of each vertex's distance from the
    arm's middle (never pushed out), with the normals there made again: run twice, the same. Returns (its end down d, the
    wrist's half-sizes, the arm's centre across w and p) for the hand's wrist to start in, or None (a sleeve, a glove)."""
    if ('el' + s) not in bones:
        return None
    eb, hb = bones.index('el' + s), bones.index('hand' + s)
    tl, pts = [], {}
    for t in range(len(out['pos']) // 9):
        if tuple(out['col'][t * 9:t * 9 + 3]) != tuple(base):
            continue
        vs = range(t * 3, t * 3 + 3)
        if all(out['si'][v * 4] in (eb, hb) for v in vs) and any(out['si'][v * 4] == eb for v in vs):   # (blends at the wrist too)
            tl.append(t)
            for v in vs:
                q = Vector(out['pos'][v * 3:v * 3 + 3]) - hd
                pts[v] = (q.dot(d), q.dot(wv), q.dot(pv))
    if not pts:
        return None
    end = max(p[0] for p in pts.values())
    if end < crease - 0.08:
        return None
    ZONE = 0.035
    z1 = round(min(end, crease - 0.008), 4)   # (the taper done by the palm's top: past it the arm stays inside the hand)
    z0 = z1 - ZONE
    above = [p[0] for p in pts.values() if p[0] <= z0]
    if not above:
        return None
    top = max(above)   # (its size from the arm's last section above the taper, never from the tapered part: a second run the same)
    ref = [p for p in pts.values() if top - 0.01 <= p[0] <= z0]
    ws, ps = [p[1] for p in ref], [p[2] for p in ref]
    cw, cp = (max(ws) + min(ws)) / 2, (max(ps) + min(ps)) / 2
    rw, rp = (max(ws) - min(ws)) / 2, (max(ps) - min(ps)) / 2
    ww, wp = min(rw, wrist[0] * 0.85), min(rp, wrist[1] * 0.85)   # (inside the hand's wrist, which covers its end)
    moved = False
    for v, (a, w_, p_) in pts.items():
        if a <= z0:
            continue
        f = smooth(z0, z1, a)
        tw, tp = rw + (ww - rw) * f, rp + (wp - rp) * f
        ow, op = cw * (1 - f), cp * (1 - f)   # (its middle brought onto the hand's axis)
        x, y = (w_ - ow) / tw, (p_ - op) / tp
        r = math.sqrt(x * x + y * y)
        if r > 1.0 + 1e-3:   # (past the rounding of a clamped point: a second run moves nothing)
            q = hd + d * a + wv * (ow + (w_ - ow) / r) + pv * (op + (p_ - op) / r)
            out['pos'][v * 3:v * 3 + 3] = [round(c, 5) for c in q]
            moved = True
    if moved:   # (the arm's normals made again where it tapers: its triangles welded by position, smoothed within 60°)
        key, verts, tris = {}, [], []
        for t in tl:
            tri = []
            for v in range(t * 3, t * 3 + 3):
                pp = tuple(out['pos'][v * 3:v * 3 + 3])
                if pp not in key:
                    key[pp] = len(verts); verts.append(pp)
                tri.append(key[pp])
            tris.append(tri)
        cn = corner_normals(verts, tris, 60)
        for t, ns in zip(tl, cn):
            for j, n in enumerate(ns):
                out['nrm'][(t * 3 + j) * 3:(t * 3 + j) * 3 + 3] = [round(c, 4) for c in n]
    return z1, ww, wp, 0.0, 0.0


# ------------------------------------------------------------------ the pass over an exported model
DBG = [(230, 60, 60), (60, 200, 60), (60, 90, 230), (230, 200, 40), (200, 60, 200), (40, 210, 210), (250, 140, 40), (140, 140, 140)] if os.environ.get('HANDS2_DEBUG') else None
def apply(out, name, skel=None):
    """Replace the hands in an export dict (lbapoly.Builder.export's `out`, or a loaded assets/poly JSON) in place."""
    if os.environ.get('HANDS2_OLD'):
        return out
    skel = skel or json.load(open(SKEL))
    S = skel.get(name)
    if not S:
        return out
    sp = spec(name, S.get('look', {}))
    if not sp:
        return out
    st, k, crease, sides = sp
    bones = out['bones']
    for s, sx in (('L', 1), ('R', -1)):
        if s not in sides or ('hand' + s) not in bones:
            continue
        hb = bones.index('hand' + s)
        nt = len(out['pos']) // 9
        keep, cols = [], {}
        for t in range(nt):
            vs = range(t * 3, t * 3 + 3)
            if all(out['si'][v * 4] == hb and out['sw'][v * 4] > 0.999 for v in vs):
                c = tuple(out['col'][t * 9:t * 9 + 3]); cols[c] = cols.get(c, 0) + 1
            else:
                keep.append(t)
        if not cols:
            continue
        base = max(cols, key=cols.get)
        for key, w in (('pos', 9), ('nrm', 9), ('col', 9), ('si', 12), ('sw', 12)):
            a = out[key]
            out[key] = [x for t in keep for x in a[t * w:(t + 1) * w]]
        out['tris'] -= nt - len(keep)
        hd, d, pv, wv = frame(S['bones'], s, sx)
        wr = (st['wrist'][2] * k * 1.08, st['wrist'][3] * k * 1.08)
        m = cartoon_hand(hd, d, pv, wv, k, st, crease, forearm(out, bones, s, base, hd, d, pv, wv, crease, wr))
        verts = [tuple(p) for p in m.v]
        tris = [(f[0], f[j], f[j + 1]) for f in m.f for j in range(1, len(f) - 1)]
        cn = corner_normals(verts, tris, 75)
        for t, ns in zip(tris, cn):
            for i, n in zip(t, ns):
                out['pos'] += [round(c, 5) for c in verts[i]]
                out['nrm'] += [round(c, 4) for c in n]
                out['col'] += DBG[m.pid[i] % len(DBG)] if DBG else [max(0, min(255, round(c * m.shade[i]))) for c in base]
                out['si'] += [hb, 0, 0, 0]
                out['sw'] += [1.0, 0.0, 0.0, 0.0]
        out['tris'] += len(tris)
    return out


if __name__ == '__main__':
    d_ = sys.argv[1]
    names = sys.argv[2:] or sorted(n[:-5] for n in os.listdir(d_) if n.endswith('.json') and n != 'index.json')
    skel = json.load(open(SKEL))
    for n in names:
        p = os.path.join(d_, n + '.json')
        js = json.load(open(p))
        before = js['tris']
        apply(js, n, skel)
        if js['tris'] != before or spec(n, skel.get(n, {}).get('look', {})):
            json.dump(js, open(p, 'w'), separators=(',', ':'))
        print(n, before, '->', js['tris'])
