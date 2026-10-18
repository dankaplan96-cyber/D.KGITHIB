# The cast as low-poly LBA-style models (Blender, headless):
#   python tools/blender/cast_poly.py art/characters/skeletons.json assets/poly [names…]   (skeletons: tools/dump-skeletons.mjs)
# Each character is built from its look in src/game/characters.js (race, outfit, colours, accessories) on its
# own game skeleton, so every animation drives it. LBA2's character language throughout: a few big shapes,
# faceted but smooth-shaded, ball hands, flat diamond eyes, Quetch faces with the short forward snout (the
# head sections measured on the original Twinsen, scaled to each head), Grobo trunk and ears, Rabbibunny ears,
# Esmer tall heads with a ridge. Writes <out>/<name>.json per character and <out>/../../art/characters/cast_poly.blend.
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from lbapoly import Builder, Part, box, disc, loft, lerp, ring, smooth, sphere, strip, tube  # noqa: E402

args = [a for a in sys.argv[1:] if not a.endswith('.py')]
SKEL, OUTDIR = args[0], args[1]
ONLY = args[2:]
ALL = json.load(open(SKEL))

# Twinsen's head, horizontal sections (fractions of his height; front centre → side → back centre).
TW_HEAD = [
    (0.822, [(0, 0.143), (0.045, 0.105), (0.055, 0.075), (0.028, 0.045), (0, 0.025)]),
    (0.847, [(0, 0.153), (0.03, 0.134), (0.056, 0.115), (0.077, 0.069), (0.051, 0.02), (0, 0.0)]),
    (0.870, [(0, 0.15), (0.034, 0.13), (0.058, 0.115), (0.076, 0.07), (0.068, 0.02), (0.033, -0.008), (0, -0.016)]),
    (0.890, [(0, 0.141), (0.036, 0.126), (0.058, 0.113), (0.076, 0.07), (0.072, 0.025), (0.035, -0.012), (0, -0.026)]),
    (0.908, [(0, 0.119), (0.035, 0.114), (0.059, 0.1), (0.073, 0.076), (0.071, 0.024), (0.035, -0.014), (0, -0.024)]),
    (0.935, [(0, 0.109), (0.029, 0.105), (0.045, 0.097), (0.06, 0.06), (0.061, 0.02), (0.03, -0.005), (0, -0.011)]),
    (0.950, [(0, 0.08), (0.04, 0.072), (0.054, 0.05), (0.05, 0.02), (0.02, 0.0), (0, -0.005)]),
]
TW_Y0, TW_Y1, TW_W, TW_Z0, TW_Z1 = 0.799, 0.956, 0.077, -0.026, 0.153


def resample(half, k):
    seg = [math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)]
    tot = sum(seg)
    out = []
    for j in range(k):
        d, i = tot * j / (k - 1), 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]
            i += 1
        t = min(1, d / seg[i]) if seg[i] else 0
        out.append((half[i][0] + (half[i + 1][0] - half[i][0]) * t, half[i][1] + (half[i + 1][1] - half[i][1]) * t))
    return out


def build(name):
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    race = L.get('race', 'quetch')
    kid, slim = bool(L.get('kid')), (0.86 if L.get('slim') else 1.0)
    grobo, bunny, esmer = race == 'grobo', race == 'bunny', race == 'esmer'
    wide = (1.5 if grobo else 1.0) * slim * (0.92 if kid else 1.0)
    belly = L.get('belly', 0) or 0
    hs = (L.get('headS') or 1) * (1.3 if kid else 1) * (1.1 if grobo else 1)
    outfit = L.get('outfit', 'tunic')
    hemY = max(0.06, L.get('hem', 0.5))
    hemR = (L.get('hemW') or 1) * {'dress': 0.34, 'robe': 0.32}.get(outfit, 0.27) * wide * (0.92 if kid else 1) + belly * 0.4
    hipsY, shY, neckY, headY = bp('hips')[1], bp('shL')[1], bp('neck')[1], bp('head')[1]
    shX = bp('shL')[0]
    legX = bp('hipL')[0]
    stoop = L.get('stoop', 0) or 0
    neckZ, headZ = bp('neck')[2], bp('head')[2]
    tunic, trim = L.get('tunic', '#888888'), L.get('tunicTrim') or L.get('tunic', '#888888')
    skin = L.get('fur') or L.get('skin') or '#f0c49b'
    hair = L.get('hair') or '#3b2414'
    b = Builder(name, B)

    # ---------------------------------------------------------------- torso (waist → collar)
    waistY = hipsY + 0.05
    chestY = shY - 0.11
    zc = lambda y: stoop * 0.5 * smooth(waistY, neckY, y)  # the stoop leans the chest forward
    N = 12

    def w_torso(p):
        x, y, z = p
        arm = smooth(shX - 0.07, shX + 0.01, abs(x)) * smooth(chestY - 0.05, shY - 0.02, y)
        s = 'L' if x > 0 else 'R'
        return {'torso': 1 - arm * 0.6, 'sh' + s: arm * 0.6}

    gown = outfit == 'gown'
    if grobo:
        # LBA2's Grobo: one great round body from the knees to the shoulders (the original's: ±0.5 m at the hips,
        # its bottom low over the legs, no waist and no neck), the coat above, the trousers below
        def w_blob(p):
            k = smooth(hipsY - 0.15, hipsY + 0.25, p[1])
            return {'hips': 1 - k, 'torso': k}
        kn_ = bp('kneeL')[1]
        bodyR = [(kn_ + 0.02, 0.26, 0.2, -0.17), (kn_ + 0.1, 0.4, 0.34, -0.28), (hipsY - 0.12, 0.48, 0.44, -0.36), (hipsY + 0.05, 0.5, 0.48, -0.38),
                 (hipsY + 0.3, 0.46, 0.45, -0.34), (shY - 0.08, 0.4, 0.38, -0.28), (shY + 0.06, 0.3, 0.29, -0.21), (neckY + 0.04, 0.16, 0.18, -0.12)]
        bl = b.P('_blob', tunic, w_blob, 50)
        loft(bl, [ring(y, hw * slim, zf + belly, zb, 16, 0.7) for y, hw, zf, zb in bodyR], cap_bottom=True, cap_top=True)
        b.parts.remove(bl)
        cut = hipsY - 0.06 - (0.06 if hemY < 0.5 else 0)   # (the coat's hem; the trousers below)
        sel = [sum(bl.v[i][1] for i in f) / len(f) < cut for f in bl.f]
        b.P('coat', tunic, w_blob, 50).add(bl.v, [f for f, v in zip(bl.f, sel) if not v])
        b.P('trousers', L.get('pants', '#555555'), w_blob, 50).add(bl.v, [f for f, v in zip(bl.f, sel) if v])
        if L.get('belt'):
            loft(b.P('belt', L['belt'], w_blob, 50), [ring(cut - 0.004, 0.495 * slim, 0.475 + belly, -0.376, 16, 0.7), ring(cut + 0.05, 0.5 * slim, 0.481 + belly, -0.381, 16, 0.7)])
    else:
        gown = outfit == 'gown'  # (LBA2's Zoé: a fitted red outfit, deep V neckline, bare arms, the legs separate)
        torso = b.P('torso', skin if gown else tunic, w_torso, 50)
        tw = 0.168 * wide
        loft(torso, [
            ring(waistY - 0.01, tw, 0.115 * wide + belly * 0.7, -0.095 * wide, N, 0.75, cz=zc(waistY)),
            ring((waistY + chestY) / 2, tw * 1.08 + belly * 0.3, 0.125 * wide + belly, -0.1 * wide, N, 0.72, cz=zc((waistY + chestY) / 2)),
            ring(chestY, 0.2 * wide, 0.135 * wide + belly * 0.5, -0.11 * wide, N, 0.7, cz=zc(chestY)),
            ring(shY + 0.015, shX + 0.035 * wide, 0.095 * wide, -0.09 * wide, N, 0.6, cz=zc(shY)),
            ring(neckY - 0.005, 0.075 * wide, 0.06 * wide, -0.055 * wide, N, 0.9, cz=neckZ),
        ], cap_top=True)
        if gown:
            # the bodice over the skin: the same sections a little larger, the front cut down in a V to the bust
            bod = b.P('bodice', tunic, w_torso, 50)
            vy = chestY - 0.07
            def vcut(r, y):
                out = []
                for (x, yy, z) in r:
                    k = max(0.0, 1 - abs(x) / (0.11 * wide)) if z > 0 else 0.0
                    out.append((x, yy - (yy - vy) * k * smooth(vy, chestY, yy), z))
                return out
            loft(bod, [
                ring(waistY - 0.012, tw * 1.03, 0.118 * wide + belly * 0.7, -0.098 * wide, N, 0.75, cz=zc(waistY)),
                ring((waistY + chestY) / 2, tw * 1.11 + belly * 0.3, 0.129 * wide + belly, -0.103 * wide, N, 0.72, cz=zc((waistY + chestY) / 2)),
                vcut(ring(chestY, 0.206 * wide, 0.139 * wide + belly * 0.5, -0.113 * wide, N, 0.7, cz=zc(chestY)), chestY),
                vcut(ring(shY + 0.012, shX + 0.02 * wide, 0.098 * wide, -0.093 * wide, N, 0.6, cz=zc(shY)), shY),
            ])
        if L.get('collar'):
            tube(b.P('collar', L.get('collarColor') or trim, 'neck', 40), (0, neckY - 0.03, neckZ), (0, neckY + 0.07, neckZ + 0.005), 0.07, 0.065, 10, cap=False)
        if L.get('collarFlat'):  # a round flat collar lying on the shoulders
            cl = b.P('collarFlat', L['collarFlat'], w_torso, 40)
            loft(cl, [ring(shY + 0.01, shX * 0.72, 0.11 * wide, -0.095 * wide, N, 0.8, cz=zc(shY)),
                      ring(neckY - 0.01, 0.085 * wide, 0.07 * wide, -0.06 * wide, N, 0.9, cz=neckZ)])
        if L.get('buttons'):
            bt = b.P('buttons', L.get('buckle') or '#d8b04a', 'torso', 30)
            for k in range(4):
                y = chestY + 0.06 - k * 0.12
                if y > waistY:
                    fz = 0.125 * wide + belly * 0.6 + zc(y) + 0.004
                    box(bt, -0.016, 0.016, y - 0.016, y + 0.016, fz - 0.01, fz + 0.012)

        # ---------------------------------------------------------------- skirt / robe / tunic bottom
        def w_skirt(p):
            x, y, z = p
            k = smooth(waistY - 0.02, waistY - 0.3, y)
            a = math.atan2(x, z - 0.01)
            c, s = math.cos(a), math.sin(a)
            w = {'hips': 1 - k}
            for bn, v in (('skirtF', max(0, c) ** 2), ('skirtB', max(0, -c) ** 2), ('skirtL', max(0, s) ** 2), ('skirtR', max(0, -s) ** 2)):
                if v > 0:
                    w[bn] = k * v
            return w

        if gown:
            hips_ = b.P('skirt', tunic, w_skirt, 50)
            hipR = max(tw * 1.15, legX + 0.11 * wide)
            loft(hips_, [ring(waistY - 0.01, tw * 1.02, 0.117 * wide, -0.097 * wide, N, 0.75, cz=zc(waistY)),
                         ring(hipsY - 0.02, hipR, 0.13 * wide, -0.12 * wide, N, 0.72),
                         ring(hipsY - 0.13, hipR * 0.92, 0.115 * wide, -0.11 * wide, N, 0.72)])
        skirt = b.P('skirt', tunic, w_skirt, 50)
        rings = [ring(waistY - 0.01, tw, 0.115 * wide + belly * 0.7, -0.095 * wide, N, 0.75, cz=zc(waistY))]
        hipR = max(tw * 1.12, legX + 0.1 * wide)
        rings.append(ring(hipsY - 0.08, hipR, 0.125 * wide + belly * 0.5, -0.11 * wide, N, 0.72))
        if hemY < hipsY - 0.35:
            ym = (hipsY - 0.08 + hemY) / 2
            rings.append(ring(ym, (hipR + hemR) / 2, (0.125 * wide + hemR * 0.85) / 2, -(0.11 * wide + hemR * 0.8) / 2, N, 0.7))
        rings.append(ring(hemY, hemR, hemR * 0.85, -hemR * 0.8, N, 0.7))
        if (outfit in ('dress', 'robe') or hemY < hipsY - 0.4) and not gown:
            # soft folds below the hips, deeper toward the hem (cloth, not a tube)
            def fold(r, amp):
                return [(x * (1 + amp * math.sin(6 * 2 * math.pi * k / len(r) + 0.4)), y, z * (1 + amp * math.sin(6 * 2 * math.pi * k / len(r) + 0.4))) for k, (x, y, z) in enumerate(r)]
            n_ = len(rings)
            rings = [fold(r, 0.03 * max(0, (i - 1)) / max(1, n_ - 2)) if i >= 2 else r for i, r in enumerate(rings)]
        if not gown:
            loft(skirt, rings)  # (plain cloth, as LBA2's townsfolk wear: no trim at the hem)

        belt = b.P('belt', L.get('belt', '#5a3a1a'), 'torso', 50) if not gown else None
        if belt: loft(belt, [ring(waistY - 0.02, tw * 1.03, 0.118 * wide + belly * 0.72, -0.098 * wide, N, 0.75, cz=zc(waistY)),
                    ring(waistY + 0.035, tw * 1.03, 0.118 * wide + belly * 0.72, -0.098 * wide, N, 0.75, cz=zc(waistY))])
        if L.get('bow'):  # a sash bow at the back of the waist
            bw = b.P('bow', L.get('belt', '#f4d27a'), 'torso', 40)
            bz = -0.1 * wide + zc(waistY)
            for sxx in (1, -1):
                sphere(bw, (sxx * 0.05, waistY + 0.01, bz - 0.02), 0.045, 7, 5, (1.2, 0.7, 0.45))
                tube(bw, (sxx * 0.015, waistY - 0.01, bz - 0.02), (sxx * 0.05, waistY - 0.2, bz - 0.03), 0.02, 0.012, 5, squash=0.4)
            sphere(bw, (0, waistY + 0.01, bz - 0.025), 0.022, 6, 4)
        if L.get('buckle') and not L.get('bow') and not gown:
            fz = 0.118 * wide + belly * 0.72 + zc(waistY)
            box(b.P('buckle', L.get('buckle') or '#d8b04a', 'torso', 20), -0.03, 0.03, waistY - 0.025, waistY + 0.04, fz - 0.01, fz + 0.012)
        if L.get('apron'):
            ap = b.P('apron', L['apron'], w_skirt, 30)
            top, bot = chestY - 0.02, max(hemY + 0.06, hipsY - 0.42)
            cols = [-0.13 * wide, -0.045 * wide, 0.045 * wide, 0.13 * wide]
            rows = [top, waistY, (waistY + bot) / 2, bot]
            fz = lambda y, x: (0.13 * wide + belly * 0.8 + zc(y) if y > waistY else 0.13 * wide + belly * 0.5 + (waistY - y) * 0.12) - abs(x) * 0.25 + 0.012
            v = [(x, y, fz(y, x)) for y in rows for x in cols]
            f = [[r * 4 + c, r * 4 + c + 1, (r + 1) * 4 + c + 1, (r + 1) * 4 + c][::-1] for r in range(3) for c in range(3)]
            ap.add(v, f)

    if L.get('emblem'):
        ez = (0.48 + belly + 0.005) if grobo else (0.135 * wide + belly * 0.5 + zc(chestY) + 0.012)
        ey = (shY - 0.12) if grobo else chestY
        disc(b.P('emblemRim', '#c8a050', 'torso', 30), (0, ey, ez), 0.055 if grobo else 0.042, 8, 'z', 0.01)
        disc(b.P('emblem', L['emblem'], 'torso', 30), (0, ey, ez + 0.007), 0.038 if grobo else 0.029, 8, 'z', 0.0)
    # ---------------------------------------------------------------- legs and feet
    pants, shoes = L.get('pants', '#555555'), L.get('shoes', '#3a2a1a')
    for s, sx in (('L', 1), ('R', -1)):
        hp, kn, ft = bp('hip' + s), bp('knee' + s), bp('foot' + s)
        r1, r2 = (0.085 if grobo else 0.06) * slim, (0.075 if grobo else 0.05) * slim
        if gown:
            # (each leg of the outfit: from the hips, tapering to the ankle, like the original's leg panels)
            thigh = b.P('thigh' + s, tunic, lambda p, s=s, k=kn[1]: {'hip' + s: 1 - smooth(k + 0.08, k - 0.04, p[1]), 'knee' + s: smooth(k + 0.08, k - 0.04, p[1])}, 50)
            tube(thigh, (hp[0], hp[1] - 0.04, hp[2]), kn, 0.122, 0.1, 10)
            tube(b.P('shin' + s, tunic, 'knee' + s, 50), kn, (ft[0], ft[1] + 0.02, ft[2]), 0.1, 0.075, 10)
        elif grobo:
            tube(b.P('shin' + s, pants, 'knee' + s, 50), (kn[0], kn[1] + 0.12, kn[2]), (ft[0], ft[1] + 0.03, ft[2]), 0.11 * slim, 0.1 * slim, 9)
        elif hemY > kn[1] - 0.12:
            thigh = b.P('thigh' + s, pants, lambda p, s=s, k=kn[1]: {'hip' + s: 1 - smooth(k + 0.08, k - 0.04, p[1]), 'knee' + s: smooth(k + 0.08, k - 0.04, p[1])}, 50)
            tube(thigh, (hp[0], min(hemY + 0.06, hp[1]), hp[2]), kn, r1, r2 * 1.05, 8)
        if hemY > ft[1] + 0.08 and not gown and not grobo:  # (a mid-length coat still shows the shins)
            tube(b.P('shin' + s, pants, 'knee' + s, 50), (kn[0], min(kn[1], hemY + 0.06), kn[2]), (ft[0], ft[1] + 0.03, ft[2]), r2 * 1.05, r2 * 0.9, 8)
        fx, fl, fh = (0.07 if grobo else 0.05) * slim, (0.2 if bunny else 0.15 if grobo else 0.13), (0.09 if grobo else 0.07)
        shoe = b.P('shoe' + s, shoes, 'foot' + s, 35)
        if grobo:
            sphere(shoe, (ft[0], 0.06, ft[2] + 0.03), 0.12, 8, 5, (1, 0.6, 1.2))
        else:
            # a shaped shoe: sections from the heel to a rounded toe, the top sloping down to it
            secs = [(-0.05, 0.8, 1.0), (-0.02, 0.95, 1.05), (fl * 0.45, 1.0, 0.85), (fl * 0.8, 0.85, 0.55), (fl, 0.45, 0.32)]
            rings_ = []
            for dz, wk, hk in secs:
                rings_.append([(ft[0] + fx * wk * math.cos(2 * math.pi * k / 10), 0.004 + fh * hk * 0.66 * (1 + math.sin(2 * math.pi * k / 10)), ft[2] + dz) for k in range(10)])
            from lbapoly import loft as _lf  # (rings along z: same quad pattern)
            vv = [p for r in rings_ for p in r]
            ff = [[j * 10 + i, j * 10 + (i + 1) % 10, (j + 1) * 10 + (i + 1) % 10, (j + 1) * 10 + i] for j in range(len(rings_) - 1) for i in range(10)]
            c0 = tuple(sum(p[k] for p in rings_[0]) / 10 for k in range(3)); c1 = tuple(sum(p[k] for p in rings_[-1]) / 10 for k in range(3))
            vv += [c0, c1]
            ff += [[(i + 1) % 10, i, len(vv) - 2] for i in range(10)] + [[40 + i, 40 + (i + 1) % 10, len(vv) - 1] for i in range(10)]
            shoe.add(vv, ff)
            box(b.P('sole' + s, '#3a2a20', 'foot' + s, 30), ft[0] - fx * 0.95, ft[0] + fx * 0.95, 0.0, 0.008, ft[2] - 0.05, ft[2] + fl * 0.95)

    # ---------------------------------------------------------------- arms and hands
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        ra = (0.08 if grobo else 0.066) * slim * (0.92 if kid else 1)
        sleeve = skin if gown else tunic
        up = b.P('upper' + s, sleeve, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.06, e - 0.04, p[1]), 'el' + s: smooth(e + 0.06, e - 0.04, p[1])}, 50)
        tube(up, (sh[0] - sx * 0.02, sh[1] + 0.03, sh[2]), el, ra * 1.05, ra, 8)
        wrist = lerp(el, hd, 0.82)
        tube(b.P('fore' + s, sleeve, 'el' + s, 50), el, wrist, ra * (0.85 if gown else 1), ra * (0.8 if gown else 1.08), 8)  # (sleeves widen a little toward the cuff)
        if not gown:
            tube(b.P('cuff' + s, trim, 'el' + s, 40), lerp(el, hd, 0.72), lerp(el, hd, 0.86), ra * 1.12, ra * 1.12, 8)
        hr = (0.075 if grobo else 0.05) * (0.9 if kid else 1)
        # the hand: LBA2's ball, hanging just out of the cuff
        ax = [hd[i] - wrist[i] for i in range(3)]
        al = math.sqrt(sum(c * c for c in ax)) or 1
        sphere(b.P('hand' + s, skin, 'hand' + s, 60), tuple(hd[i] + ax[i] / al * hr * 0.55 for i in range(3)), hr, 9, 6)
        # the shoulder: flush with the sleeve, where it meets the body
        sphere(b.P('shoulder' + s, sleeve, 'sh' + s, 50), (sh[0] - sx * 0.015, sh[1] + 0.01, sh[2]), ra * 1.06, 9, 6, (1.0, 0.8, 1.0))
        if L.get('brace') and s == 'R':
            tube(b.P('brace', '#c89a48', 'el' + s, 30), lerp(el, hd, 0.35), lerp(el, hd, 0.6), ra * 1.18, ra * 1.12, 8)

    # ---------------------------------------------------------------- neck and head
    head_w = lambda p: {'head': 1.0}
    nr = (0.075 if grobo else 0.052) * (1.0 if not kid else 0.9)
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.04, p[1]), 'head': smooth(headY - 0.02, headY + 0.04, p[1])}, 60),
         (0, neckY - 0.04, neckZ), (0, headY + 0.08, headZ), nr, nr * 0.95, 8)
    # LBA2 heads are big: scale the design's head about the chin (quetch/esmer ×1.2, bunny ×1.1)
    hk = {'quetch': 1.22, 'esmer': 1.15, 'bunny': 1.1}.get(race, 1.0)
    chin = headY - 0.027 * hs
    Hc = (0, chin + (0.13 + 0.027) * hs * hk, headZ)
    hs = hs * hk
    hw, hh, hd_ = 0.115 * hs * (L.get('skullW') or 1), 0.165 * hs, 0.128 * hs
    egg = (L.get('skullY') or 1.13) if L.get('skull') == 'egg' else 1.0

    def eyes_on(front, ey, ex, size, color, white='#e4e0f0'):
        # flat diamonds on a face whose surface depth is front(x, y)
        lidc = L.get('lidColor') or (L.get('hair') if race == 'quetch' else '#2a2420') or '#3a2a20'
        for sx in (1, -1):
            cx = sx * ex
            on = lambda dx, dy, lift=0.0: (cx + dx, ey + dy, front(cx + dx, ey + dy) + 0.004 + lift)
            w, h = size * 0.66, size * 0.36
            ts = [2 * math.pi * k / 10 for k in range(10)]
            # almond white (outer corner a touch higher), a round iris looking slightly inward, the pupil, the upper lid
            wq = [on(w * math.cos(t), h * math.sin(t) + sx * h * 0.12 * math.cos(t)) for t in ts]
            ic, ir = sx * -w * 0.08, h * 0.78
            iq = [on(ic + ir * math.cos(t), ir * math.sin(t), 0.0012) for t in ts]
            pq = [on(ic + ir * 0.45 * math.cos(t), ir * 0.45 * math.sin(t), 0.0022) for t in ts[::1][:10]]
            lid = [on(-w * 1.05, h * 0.15, 0.0028), on(-w * 0.5, h * 1.02, 0.0028), on(0, h * 1.18, 0.0028), on(w * 0.5, h * 1.08, 0.0028), on(w * 1.08, h * 0.45, 0.0028),
                   on(w * 1.0, h * 0.75, 0.0028), on(w * 0.5, h * 1.4, 0.0028), on(0, h * 1.5, 0.0028), on(-w * 0.5, h * 1.34, 0.0028), on(-w * 1.0, h * 0.42, 0.0028)]
            b.eye(on(0, 0), [(wq, white), (iq, color), (pq, '#141820')])

    eyec = L.get('eyes', '#2a2a2a')
    if race == 'quetch':
        # Twinsen's head sections scaled onto this head (snout forward, forehead sloping back)
        y0, y1 = Hc[1] - hh * 0.95, Hc[1] + hh * egg * 0.92
        sx_ = hw / TW_W
        z0, z1 = Hc[2] - hd_ * 0.95, Hc[2] + hd_ * 1.12
        my = lambda y: y0 + (y - TW_Y0) / (TW_Y1 - TW_Y0) * (y1 - y0)
        mz = lambda z: z0 + (z - TW_Z0) / (TW_Z1 - TW_Z0) * (z1 - z0)
        K = 11
        rr = []
        FINE = []
        for (ya, ha), (yb, hb) in zip(TW_HEAD, TW_HEAD[1:]):
            ra_, rb_ = resample(ha, 25), resample(hb, 25)
            FINE += [(ya, ha), ((ya + yb) / 2, [((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) for p, q in zip(ra_, rb_)])]
        FINE.append(TW_HEAD[-1])
        for y, half in FINE:
            h = resample(half, K)
            pts = [(x * sx_, my(y), mz(z)) for x, z in h] + [(-x * sx_, my(y), mz(z)) for x, z in reversed(h[1:-1])]
            rr.append(pts)
        hp = b.P('head', skin, head_w, 80)
        loft(hp, rr)
        n = len(rr[0])
        o = len(hp.v)
        hp.add([(0, my(0.799), mz(0.095))], [])
        hp.f += [[(i + 1) % n, i, o] for i in range(n)]
        hp.add([(0, my(0.956), mz(0.035))], [])
        t0 = (len(rr) - 1) * n
        hp.f += [[t0 + i, t0 + (i + 1) % n, o + 1] for i in range(n)]

        def front(x, y):
            yy = TW_Y0 + (y - y0) / (y1 - y0) * (TW_Y1 - TW_Y0)
            for (ya, ha), (yb, hb) in zip(TW_HEAD, TW_HEAD[1:]):
                if ya <= yy <= yb:
                    t = (yy - ya) / (yb - ya)
                    def fz(hx):
                        pts = resample(hx, 25)
                        for (xa, za), (xb, zb) in zip(pts, pts[1:]):
                            if xa <= abs(x) / sx_ <= xb:
                                u = (abs(x) / sx_ - xa) / (xb - xa) if xb > xa else 0
                                return mz(za + (zb - za) * u)
                        return mz(pts[0][1])
                    return fz(ha) + (fz(hb) - fz(ha)) * t
            return Hc[2] + hd_
        eyes_on(front, my(0.896), 0.037 * sx_, 0.025 * sx_ * (L.get('eyeScale') or 1) * (1.2 if kid else 1), eyec)
        top_y, back_z = my(0.95), mz(-0.05)
        style = L.get('hairStyle', 'cap')
        if style not in ('bald', 'bun'):
            # the hair as a shell 6 mm off the skull, covering the back and the crown, its line rising from behind
            # the ears to the top (long hair covers more of the sides)
            cap = b.P('hair', hair, head_w, 70)
            M_ = 13
            zcuts = [0.0, 0.03, 0.05, 0.07, 0.085] if style not in ('longtail', 'bun') else [0.02, 0.05, 0.07, 0.09, 0.1]
            rows = []
            for (y, half), zc_ in zip(TW_HEAD[2:], zcuts):
                full = resample(half, 25)
                pts = [(x, z) for x, z in full if z <= zc_]
                arc = list(reversed(pts)) + [(-x, z) for x, z in pts[1:]]
                seg = [math.dist(arc[i], arc[i + 1]) for i in range(len(arc) - 1)]
                tot = sum(seg) or 1
                row = []
                for j in range(M_):
                    d, i = tot * j / (M_ - 1), 0
                    while i < len(seg) - 1 and d > seg[i]:
                        d -= seg[i]; i += 1
                    t = min(1, d / seg[i]) if seg[i] else 0
                    x = arc[i][0] + (arc[i + 1][0] - arc[i][0]) * t; z = arc[i][1] + (arc[i + 1][1] - arc[i][1]) * t
                    r = math.hypot(x, z - 0.06) or 1
                    row.append((x * sx_ + x / r * 0.007, my(y), mz(z) + (z - 0.06) / r * 0.007))
                rows.append(row)
            vv = [p for r in rows for p in r]
            ff = [[(j + 1) * M_ + i, (j + 1) * M_ + i + 1, j * M_ + i + 1, j * M_ + i] for j in range(len(rows) - 1) for i in range(M_ - 1)]
            vv.append((0, my(0.962), mz(0.03)))
            o_ = (len(rows) - 1) * M_
            ff += [[o_ + i + 1, o_ + i, len(vv) - 1] for i in range(M_ - 1)]
            cap.add(vv, ff)
        tails = [k for k in ('tail0', 'tail1', 'tail2') if k in B]
        if style == 'bun' and len(tails) >= 3:
            for i, r in enumerate((0.044 * 2.1, 0.034 * 2.1, 0.025 * 2.1)):
                sphere(b.P('bun%d' % i, hair, tails[i], 180), tuple(B[tails[i]]['p']), r, 9, 6)
        elif style == 'bun':
            for i, (dy, dz, r) in enumerate(((0.012, -0.075, 0.042), (-0.02, -0.105, 0.03))):
                sphere(b.P('bun%d' % i, hair, tails[i] if i < len(tails) else 'head', 180), (0, my(0.95 + dy), mz(-0.03 + dz)), r * sx_, 9, 6)
        elif style in ('tail', 'longtail'):
            # a ponytail tied high at the back of the crown: tapered segments down the back, each on a tail bone
            long = style == 'longtail'
            # (below the head the points follow the body: the nape, then between the shoulder blades)
            backZ = -0.1 * wide + zc(shY)
            if long:
                pts = [(0, my(0.935), Hc[2] - hd_ * 0.72), (0, my(0.905), Hc[2] - hd_ * 1.08), (0, headY + 0.0, Hc[2] - hd_ * 1.1),
                       (0, shY - 0.05, backZ - 0.06), (0, shY - 0.28, backZ - 0.04)]
            else:
                pts = [(0, my(0.95), Hc[2] - hd_ * 0.82), (0, my(0.9), Hc[2] - hd_ * 1.05), (0, headY + 0.04, Hc[2] - hd_ * 1.08), (0, headY - 0.05, Hc[2] - hd_ * 1.0)]
            rad = [0.04, 0.036, 0.03, 0.02, 0.008] if long else [0.034, 0.03, 0.022, 0.01]
            for i in range(len(pts) - 1):
                bone = tails[min(i, len(tails) - 1)] if tails else 'head'
                tube(b.P('tail%d' % i, hair, bone, 75), pts[i], pts[i + 1], rad[i] * sx_, rad[i + 1] * sx_, 10, squash=0.75)
            sphere(b.P('tie', L.get('tie') or L.get('belt') or hair, tails[0] if tails else 'head', 180), pts[0], 0.022 * sx_, 7, 5)
        elif style == 'tuft':
            # a spiky tuft over the forehead (Arthur)
            tf = b.P('tuft', hair, head_w, 30)
            for dx, dy, dz in ((-0.025, 0.06, 0.05), (0.0, 0.075, 0.035), (0.025, 0.06, 0.05), (0.0, 0.05, 0.08)):
                tube(tf, (dx * sx_, my(0.94), mz(0.0 + dz * 0.4)), (dx * 1.4 * sx_, my(0.94 + dy), mz(dz)), 0.024 * sx_, 0.003, 6)
        elif style == 'pigtails':
            for sxx in (1, -1):
                pg = b.P('pig', hair, head_w, 60)
                tube(pg, (sxx * 0.068 * sx_, my(0.905), mz(-0.02)), (sxx * 0.095 * sx_, my(0.8), mz(-0.035)), 0.026 * sx_, 0.02 * sx_, 7)
                tube(pg, (sxx * 0.095 * sx_, my(0.8), mz(-0.035)), (sxx * 0.09 * sx_, my(0.7), mz(-0.03)), 0.02 * sx_, 0.008 * sx_, 7)
                sphere(b.P('ribbon', L.get('belt') or '#ffffff', head_w, 40), (sxx * 0.07 * sx_, my(0.905), mz(-0.02)), 0.02 * sx_, 6, 4)
        elif style == 'bald' and L.get('hair') and not L.get('crest'):
            for sxx in (1, -1):  # tufts over the ears
                sphere(b.P('tuft', hair, head_w, 180), (sxx * 0.07 * sx_, my(0.875), mz(0.0)), 0.028 * sx_, 7, 5, (0.8, 1.0, 1.2))
        if L.get('helmetQ'):   # Vesk's guards: a round helmet, a violet visor across the eyes
            hq = b.P('helmetQ', L['helmetQ'], head_w, 40)
            sphere(hq, (0, my(0.925), mz(0.055)), 0.088 * sx_, 12, 7, (1.05, 0.85, 1.12))
            disc(hq, (0, my(0.9), mz(0.06)), 0.1 * sx_, 12, 'y', 0.012)
            vz = front(0, my(0.896))
            box(b.P('visor', L.get('visor', '#c070ff'), head_w, 30), -0.07 * sx_, 0.07 * sx_, my(0.882), my(0.91), vz - 0.012, vz + 0.012)
        if L.get('moustache'):
            sphere(b.P('moustache', hair, head_w, 180), (0, my(0.842), mz(0.15)), 0.03 * sx_, 8, 5, (1.6, 0.55, 0.8))
        if L.get('crest'):
            cr = b.P('crest', L['crest'], head_w, 30)
            pts = [(0, my(0.9), mz(0.11)), (0, my(0.985), mz(0.06)), (0, my(0.99), mz(-0.02)), (0, my(0.93), mz(-0.06))]
            cr.add([(x - 0.012, y, z) for x, y, z in pts] + [(x + 0.012, y + 0.035, z) for x, y, z in pts],
                   [[i, i + 1, 5 + i, 4 + i] for i in range(3)] + [[4 + i, 5 + i, i + 1, i][::-1] for i in range(3)])
        if L.get('goggles'):
            gg = b.P('goggles', '#c89a48', head_w, 40)
            for sxx in (1, -1):
                c = (sxx * 0.03 * sx_, my(0.935), mz(0.11))
                tube(gg, c, (c[0], c[1] + 0.006, c[2] + 0.03), 0.022 * sx_, 0.022 * sx_, 8)
            strip(b.P('strap', '#3a2a20', head_w, 40), [(-0.075 * sx_, my(0.93), mz(0.06)), (0, my(0.94), mz(0.12)), (0.075 * sx_, my(0.93), mz(0.06))], 0.006)
        if L.get('hardhat'):
            hh_ = b.P('hardhat', L['hardhat'], head_w, 40)
            sphere(hh_, (0, my(0.935), mz(0.06)), 0.085 * sx_, 10, 6, (1.0, 0.75, 1.05))
            disc(hh_, (0, my(0.925), mz(0.08)), 0.1 * sx_, 12, 'y', 0.01)
    elif bunny:
        # LBA2's Rabbibunny head: small, drawn out into a long snout (the original's reaches 0.1 of its height in
        # front of the neck), the eyes high on the sides, two long ears standing up in a V
        hp = b.P('head', skin, head_w, 70)
        c = (0, Hc[1] - 0.04, Hc[2] - 0.01)
        sphere(hp, c, hw * 0.78, 10, 7, (1.0, 1.0, 1.05))
        sn = (0, c[1] - hh * 0.22, c[2] + hd_ * 1.25)
        tube(hp, (0, c[1] - hh * 0.05, c[2] + hd_ * 0.35), sn, hw * 0.62, hw * 0.3, 9, squash=0.85)
        sphere(b.P('nose', L.get('noseC') or '#3a2a2a', head_w, 180), (0, sn[1] + 0.006, sn[2] + 0.004), hw * 0.16, 6, 4)
        for sxx in (1, -1):
            ear = b.P('ear', skin, head_w, 45)
            base = (sxx * hw * 0.32, c[1] + hh * 0.55, c[2] - 0.03)
            tube(ear, base, (sxx * hw * 0.95, c[1] + hh * 2.7, c[2] - 0.08), 0.042, 0.022, 7, squash=0.4)
            tube(b.P('earIn', '#f4b8c8', head_w, 45), (base[0], base[1] + 0.06, base[2] + 0.016), (sxx * hw * 0.92, c[1] + hh * 2.45, c[2] - 0.064), 0.02, 0.01, 6, squash=0.3)
        front = lambda x, y: c[2] + hw * 0.82 * math.sqrt(max(0.05, 1 - (x / (hw * 0.78)) ** 2 - ((y - c[1]) / (hw * 0.78)) ** 2))
        eyes_on(front, c[1] + hh * 0.12, hw * 0.42, hw * 0.24 * (L.get('eyeScale') or 1), eyec)
        if L.get('glasses'):
            gl = b.P('glasses', '#2a2a30', head_w, 30)
            for sxx in (1, -1):
                cc = (sxx * hw * 0.4, c[1] + hh * 0.18, front(sxx * hw * 0.4, c[1] + hh * 0.18) + 0.012)
                pts = []
                for k in range(9):
                    t = 2 * math.pi * k / 8
                    pts.append((cc[0] + math.cos(t) * hw * 0.3, cc[1] + math.sin(t) * hw * 0.26, cc[2]))
                strip(gl, pts, 0.006, (0, 0, 0))
        # LBA2's wizards (bodies 111, 123): a long beard hanging from under the snout, a tall pointed hat between the ears
        if L.get('beard'):
            tube(b.P('beard', L['beard'], head_w, 60), (0, c[1] - hh * 0.3, c[2] + hd_ * 0.7), (0, c[1] - hh * 2.5, c[2] + hd_ * 1.05), hw * 0.55, 0.01, 8, squash=0.55)
        if L.get('wizHat'):
            tube(b.P('wizHat', L['wizHat'], head_w, 40), (0, c[1] + hh * 0.45, c[2] - 0.01), (0, c[1] + hh * 3.4, c[2] - 0.05), hw * 0.62, 0.004, 9)
    elif grobo:
        # LBA2's Grobo head: as wide as the body and sunk into it (no neck), a long trunk hanging in front of the
        # belly, and great flat ears standing out to either side (the original's reach ±0.5 of its height)
        R = 0.3 * slim
        c = (0, headY - 0.02, 0.1)
        hp = b.P('head', skin, head_w, 70)
        sphere(hp, c, R, 12, 8, (1.0, 0.92, 1.08))
        sphere(hp, (0, c[1] - R * 0.35, c[2] + R * 0.62), R * 0.55, 9, 6, (1.0, 0.85, 0.9))   # (the muzzle the trunk grows from)
        tr = b.P('trunk', skin, head_w, 55)
        bf = 0.48 + belly
        pts = [(0, c[1] - R * 0.3, c[2] + R * 1.05), (0, c[1] - R * 0.95, c[2] + R * 1.25), (0, c[1] - R * 1.9, max(bf + 0.08, c[2] + R * 1.2)), (0, c[1] - R * 2.6, bf + 0.12), (0, c[1] - R * 3.0, bf + 0.18)]
        rad = [0.1, 0.08, 0.065, 0.055, 0.05]
        for i in range(len(pts) - 1):
            tube(tr, pts[i], pts[i + 1], rad[i], rad[i + 1], 9)
        for sxx in (1, -1):
            ear = b.P('ear', skin, head_w, 40)
            disc(ear, (sxx * R * 2.05, c[1] + R * 0.15, c[2] - R * 0.25), R * 1.05, 10, 'z', 0.035)
            disc(b.P('earIn', L.get('earIn') or '#c8a0a8', head_w, 40), (sxx * R * 2.05, c[1] + R * 0.15, c[2] - R * 0.25 + 0.019), R * 0.8, 10, 'z', 0.0)
        front = lambda x, y: c[2] + R * 1.08 * math.sqrt(max(0.05, 1 - (x / R) ** 2 - ((y - c[1]) / (R * 0.92)) ** 2))
        eyes_on(front, c[1] + R * 0.3, R * 0.36, R * 0.15, eyec)
        if L.get('hat'):
            ht = b.P('hat', L['hat'], head_w, 40)
            tube(ht, (0, c[1] + R * 0.78, c[2]), (0, c[1] + R * 1.25, c[2]), R * 0.55, R * 0.5, 10)
            disc(ht, (0, c[1] + R * 0.8, c[2]), R * 0.95, 12, 'y', 0.015)
        if L.get('helmet'):
            hm = b.P('helmet', L['helmet'], head_w, 45)
            sphere(hm, (0, c[1] + R * 0.22, c[2] - 0.01), R * 1.06, 12, 6, (1.0, 0.8, 1.1))
            box(b.P('visor', '#1a2830', head_w, 30), -R * 0.7, R * 0.7, c[1] + R * 0.38, c[1] + R * 0.55, c[2] + R * 0.85, c[2] + R * 1.1)
    else:  # esmer: a tall egg head, small pointed ears, a ridge over the crown
        hp = b.P('head', skin, head_w, 80)
        c = (0, Hc[1] + hh * 0.15, Hc[2])
        sphere(hp, c, hw * 0.95, 10, 8, (1.0, 1.45, 1.0))
        sphere(hp, (0, c[1] - hh * 0.55, c[2] + hd_ * 0.45), hw * 0.62, 8, 6, (1.0, 0.7, 0.9))
        for sxx in (1, -1):
            tube(b.P('ear', skin, head_w, 40), (sxx * hw * 0.85, c[1] - hh * 0.05, c[2] - 0.01), (sxx * hw * 1.55, c[1] + hh * 0.2, c[2] - 0.06), 0.04, 0.008, 6, squash=0.4)
        rg = b.P('ridge', L.get('ridge', '#3e7a62'), head_w, 30)
        pts = [(0, c[1] + hh * 0.9, c[2] + hd_ * 0.55), (0, c[1] + hh * 1.45, c[2] + hd_ * 0.1), (0, c[1] + hh * 1.25, c[2] - hd_ * 0.6), (0, c[1] + hh * 0.6, c[2] - hd_ * 0.98)]
        rg.add([(x - 0.012, y, z) for x, y, z in pts] + [(x, y + 0.03, z + (0.02 if i < 2 else -0.02)) for i, (x, y, z) in enumerate(pts)],
               [[i, i + 1, 5 + i, 4 + i] for i in range(3)] + [[i + 1, i, 4 + i, 5 + i] for i in range(3)])
        front = lambda x, y: c[2] + hd_ * math.sqrt(max(0.05, 1 - (x / (hw * 0.95)) ** 2 - ((y - c[1]) / (hh * 1.45)) ** 2))
        eyes_on(front, c[1] - hh * 0.05, hw * 0.38, hw * 0.22, eyec, '#f4f0d8')
        if L.get('hat'):
            ht = b.P('hat', L['hat'], head_w, 40)
            disc(ht, (0, c[1] + hh * 0.75, c[2]), hw * 1.5, 12, 'y', 0.015)
            tube(ht, (0, c[1] + hh * 0.75, c[2]), (0, c[1] + hh * 1.1, c[2]), hw * 0.7, hw * 0.55, 10)

    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


# LBA2's Zoé, from the original model's horizontal sections (fractions of her height ZH; arms excluded):
# (y, half-width, front, back). Narrow shoulders (±0.107), a slim waist, wide hips (±0.134) and a full front,
# trousers tapering from the hips to the ankle (the full front softened to 0.12: at 0.143 it reads as a belly in our lighting), long pointed shoes, a narrow head (±0.053) set back on the neck.
ZOE_BODY = [
    (0.404, 0.132, 0.118, -0.107), (0.428, 0.134, 0.122, -0.107), (0.452, 0.127, 0.127, -0.107), (0.476, 0.119, 0.131, -0.107),
    (0.500, 0.111, 0.118, -0.107), (0.524, 0.103, 0.115, -0.103), (0.548, 0.095, 0.11, -0.096), (0.572, 0.087, 0.104, -0.090),
    (0.596, 0.078, 0.096, -0.087), (0.620, 0.072, 0.086, -0.086), (0.644, 0.077, 0.072, -0.086), (0.668, 0.089, 0.073, -0.088),
    (0.692, 0.103, 0.078, -0.089), (0.716, 0.107, 0.069, -0.091), (0.740, 0.107, 0.044, -0.090), (0.764, 0.103, 0.024, -0.088),
    (0.788, 0.094, 0.010, -0.081), (0.812, 0.072, 0.0, -0.064), (0.824, 0.03, -0.004, -0.05),
]
# each trouser leg: (y, centre x, radius across, front, back)
ZOE_LEG = [(0.44, 0.06, 0.066, 0.11, -0.1), (0.404, 0.066, 0.066, 0.112, -0.1), (0.308, 0.065, 0.059, 0.095, -0.09), (0.212, 0.064, 0.052, 0.078, -0.077),
           (0.116, 0.065, 0.045, 0.05, -0.065), (0.05, 0.065, 0.039, 0.044, -0.056)]
ZOE_BUN = ((1.0, -0.135, 0.052), (0.973, -0.188, 0.037), (0.936, -0.204, 0.026))


def build_zoe(name):
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    ZH = 1.95  # her height to the crown, matched to the game skeleton (hips 0.95, shoulders 1.47, neck 1.56)
    red, skin, hair, shoes = L.get('tunic', '#c62c2c'), L.get('skin', '#efc39a'), L.get('hair', '#ecd79a'), L.get('shoes', '#4c9a46')
    b = Builder(name, B)
    N = 20
    # ---- the body: one loft of the measured sections; faces inside the V neckline (front and back) are skin
    def w_body(p):
        x, y, z = p
        hips = 1 - smooth(0.5 * ZH, 0.58 * ZH, y)
        arm = smooth(0.08 * ZH, 0.11 * ZH, abs(x)) * smooth(0.72 * ZH, 0.78 * ZH, y)
        s_ = 'L' if x > 0 else 'R'
        w = {'hips': hips * (1 - arm), 'torso': (1 - hips) * (1 - arm)}
        if arm > 0: w['sh' + s_] = arm
        return {k: v for k, v in w.items() if v > 0}
    # the dress up to the shoulder line; above it bare shoulders and the neck's base (skin, a hair smaller)
    dress = b.P('dress', red, w_body, 50)
    # (its top ring tucked under the shoulders' skin, so no red line shows across the neckline)
    loft(dress, [ring(y * ZH, hw * ZH * k, zf * ZH * k, zb * ZH * k, N, 0.72) for y, hw, zf, zb in ZOE_BODY if y <= 0.79 for k in [0.94 if y > 0.78 else 1.0]])
    loft(b.P('shoulders', skin, w_body, 50), [ring(y * ZH, hw * ZH * 0.975, zf * ZH - 0.004, zb * ZH + 0.004, N, 0.72) for y, hw, zf, zb in ZOE_BODY if y >= 0.71], cap_top=True)
    sec = lambda y: next((a[1] + (c[1] - a[1]) * (y - a[0]) / (c[0] - a[0])) for a, c in zip(ZOE_BODY, ZOE_BODY[1:]) if a[0] <= y <= c[0])
    # the V neckline, front and back: a skin panel laid on the dress (ray-cast onto its surface), its edges straight
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    tree = BVHTree.FromPolygons([Vector(v) for v in dress.v], dress.f)
    bare = b.P('neckline', skin, w_body, 60)
    for side_, vy in ((1, 0.672), (-1, 0.665)):   # (the V reaches the bust in front, nearly as low at the back)
        rows, M = 10, 13
        top = 0.787
        grid = []
        for j in range(rows):
            y = vy + (top - vy) * j / (rows - 1)
            xv = min((y - vy) / 0.75, sec(y) * (0.8 if j < rows - 1 else 0.72)) if j else 0.0   # (the dress's edge at the shoulders: the straps)
            row = []
            for i in range(M):
                x = -xv + 2 * xv * i / (M - 1)
                hit = tree.ray_cast(Vector((x * ZH, y * ZH, side_ * 1.0)), Vector((0, 0, -side_)))
                z = hit[0].z if hit[0] is not None else (row[-1][2] - side_ * 0.004 if row else 0.0)
                row.append((x * ZH, y * ZH, z + side_ * 0.007))
            grid.append(row)
        vv = [p for r in grid for p in r]
        ff = [[j * M + i, j * M + i + 1, (j + 1) * M + i + 1, (j + 1) * M + i][::side_] for j in range(rows - 1) for i in range(M - 1)]
        bare.add(vv, ff)
    # ---- the trouser legs (each follows its thigh, then its shin) and the long pointed shoes
    for s_, sx in (('L', 1), ('R', -1)):
        hp, kn, ft = bp('hip' + s_), bp('knee' + s_), bp('foot' + s_)
        def w_leg(p, s_=s_, kn=kn):
            y = p[1]
            top = smooth(0.47 * ZH, 0.4 * ZH, y)          # (the top of the leg blends into the hips)
            knee = smooth(kn[1] + 0.06, kn[1] - 0.06, y)
            return {k: v for k, v in (('hips', 1 - top), ('hip' + s_, top * (1 - knee)), ('knee' + s_, top * knee)) if v > 0}
        leg = b.P('leg' + s_, red, w_leg, 50)
        loft(leg, [ring(y * ZH, r * ZH, zf * ZH, zb * ZH, 10, 0.8, cx=sx * max(hp[0], cx * ZH * 0.8)) for y, cx, r, zf, zb in reversed(ZOE_LEG)], cap_bottom=True)
        sh = b.P('shoe' + s_, shoes, 'foot' + s_, 40)
        x0 = sx * max(hp[0], 0.065 * ZH * 0.8)
        secs = [(-0.054, 0.03, 0.05), (-0.02, 0.036, 0.06), (0.03, 0.036, 0.05), (0.07, 0.026, 0.032), (0.105, 0.008, 0.012)]
        rings_ = [[(x0 + hw * ZH * math.cos(2 * math.pi * k / 8), 0.004 + h * ZH * 0.5 * (1 + math.sin(2 * math.pi * k / 8)), z * ZH) for k in range(8)] for z, hw, h in secs]
        vv = [p for r in rings_ for p in r]
        ff = [[j * 8 + i, j * 8 + (i + 1) % 8, (j + 1) * 8 + (i + 1) % 8, (j + 1) * 8 + i] for j in range(len(rings_) - 1) for i in range(8)]
        vv.append(tuple(sum(p[k] for p in rings_[0]) / 8 for k in range(3)))
        ff += [[(i + 1) % 8, i, len(vv) - 1] for i in range(8)]
        sh.add(vv, ff)
    # ---- bare thin arms and small hands
    for s_, sx in (('L', 1), ('R', -1)):
        shp, el, hd = bp('sh' + s_), bp('el' + s_), bp('hand' + s_)
        up = b.P('upper' + s_, skin, lambda p, s_=s_, e=el[1]: {'sh' + s_: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s_: smooth(e + 0.05, e - 0.03, p[1])}, 50)
        tube(up, (shp[0] - sx * 0.025, shp[1] + 0.02, shp[2] - 0.02), el, 0.03, 0.025, 8)
        wrist = lerp(el, hd, 0.86)
        tube(b.P('fore' + s_, skin, 'el' + s_, 50), el, wrist, 0.025, 0.019, 8)
        sphere(b.P('hand' + s_, skin, 'hand' + s_, 60), lerp(el, hd, 0.97), 0.03, 8, 6, (0.8, 1.15, 1.0))
    # ---- neck and head: Twinsen's head sections, narrowed to hers and set on her neck
    neckY, headY = bp('neck')[1], bp('head')[1]
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.04, p[1]), 'head': smooth(headY - 0.02, headY + 0.04, p[1])}, 60),
         (0, neckY - 0.06, -0.035), (0, 0.87 * ZH, -0.03), 0.04, 0.037, 8)
    sx_ = 0.053 / 0.077
    my = lambda y: (0.849 + (y - TW_Y0) / (TW_Y1 - TW_Y0) * (0.994 - 0.849)) * ZH
    mz = lambda z: (-0.106 + (z - TW_Z0) / (TW_Z1 - TW_Z0) * 0.17) * ZH
    FINE = []
    for (ya, ha), (yb, hb) in zip(TW_HEAD, TW_HEAD[1:]):
        ra_, rb_ = resample(ha, 25), resample(hb, 25)
        FINE += [(ya, ha), ((ya + yb) / 2, [((p[0] + q[0]) / 2, (p[1] + q[1]) / 2) for p, q in zip(ra_, rb_)])]
    FINE.append(TW_HEAD[-1])
    rr = []
    for y, half in FINE:
        h = resample(half, 11)
        rr.append([(x * sx_ * ZH, my(y), mz(z)) for x, z in h] + [(-x * sx_ * ZH, my(y), mz(z)) for x, z in reversed(h[1:-1])])
    hp_ = b.P('head', skin, 'head', 80)
    loft(hp_, rr)
    n_, o_ = len(rr[0]), len(hp_.v)
    hp_.add([(0, my(0.799), mz(0.095)), (0, my(0.956), mz(0.035))], [])
    hp_.f += [[(i + 1) % n_, i, o_] for i in range(n_)] + [[(len(rr) - 1) * n_ + i, (len(rr) - 1) * n_ + (i + 1) % n_, o_ + 1] for i in range(n_)]
    def front(x, y):
        yy = TW_Y0 + (y / ZH - 0.849) / (0.994 - 0.849) * (TW_Y1 - TW_Y0)
        for (ya, ha), (yb, hb) in zip(TW_HEAD, TW_HEAD[1:]):
            if ya <= yy <= yb:
                t = (yy - ya) / (yb - ya)
                def fz(hx):
                    pts = resample(hx, 25)
                    for (xa, za), (xb, zb) in zip(pts, pts[1:]):
                        if xa <= abs(x) / (sx_ * ZH) <= xb:
                            u = (abs(x) / (sx_ * ZH) - xa) / (xb - xa) if xb > xa else 0
                            return mz(za + (zb - za) * u)
                    return mz(pts[0][1])
                return fz(ha) + (fz(hb) - fz(ha)) * t
        return mz(0.1)
    # small almond eyes (white, a green iris) and red lips, as on the original
    ey, ex = my(0.896), 0.037 * sx_ * ZH
    for sxx in (1, -1):
        cx = sxx * ex
        on = lambda dx, dy, lift=0.0, cx=cx: (cx + dx, ey + dy, front(cx + dx, ey + dy) + 0.004 + lift)
        ts = [2 * math.pi * k / 10 for k in range(10)]
        w, h = 0.021, 0.0085
        b.eye(on(0, 0), [([on(w * math.cos(t), h * math.sin(t) + sxx * h * 0.25 * math.cos(t)) for t in ts], '#ecebf2'),
                         ([on(-sxx * 0.002 + 0.0075 * math.cos(t), 0.0075 * math.sin(t), 0.0012) for t in ts], '#3f7a4a'),
                         ([on(-sxx * 0.002 + 0.0032 * math.cos(t), 0.0032 * math.sin(t), 0.0022) for t in ts], '#141820')])
    ly = my(0.834)
    lips = b.P('lips', '#a31a1e', 'head', 30)
    lp = [(-0.024, 0.0), (-0.01, 0.006), (0.0, 0.003), (0.01, 0.006), (0.024, 0.0), (0.0, -0.01)]
    lips.add([(x, ly + y, front(x, ly + y) + 0.004) for x, y in lp], [[5, 4, 3, 2, 1, 0]])
    # the bun: the original's three balls, from the crown back and down
    tails = [k for k in ('tail0', 'tail1', 'tail2') if k in B]
    for i, (y, z, r) in enumerate(ZOE_BUN):
        sphere(b.P('bun%d' % i, hair, tails[min(i, len(tails) - 1)], 180), (0, y * ZH, z * ZH), r * ZH, 10, 7)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


# ------------------------------------------------------------------ Zeelich's races, after the original models
def banded(b, name, rings, bands, weights, angle=50, cap0=True, cap1=True):
    """One loft, its faces coloured by height: bands = [(y_top, colour), ...] from the bottom up (shared vertices,
    so the shading stays smooth across a colour change)."""
    tmp = Part(name, '#000000', weights, angle)
    loft(tmp, rings, cap_bottom=cap0, cap_top=cap1)
    for i, (ytop, col) in enumerate(bands):
        ylo = bands[i - 1][0] if i else -1e9
        fs = [f for f in tmp.f if ylo <= sum(tmp.v[k][1] for k in f) / len(f) < ytop]
        if fs:
            b.P('%s%d' % (name, i), col, weights, angle).add(tmp.v, fs)


def ell(y, rx, rz, n=14, cz=0.0):
    return ring(y, rx, rz, -rz, n, 1.0, cz=cz)


def limb_legs(b, bp, color, shoe, r1, r2, foot_len, foot_w, top=None, ZH=2.0):
    for s, sx in (('L', 1), ('R', -1)):
        hp, kn, ft = bp('hip' + s), bp('knee' + s), bp('foot' + s)
        if top is None or top > kn[1]:
            a = (hp[0], min(hp[1], top) if top else hp[1], hp[2])
            tube(b.P('thigh' + s, color, lambda p, s=s, k=kn[1]: {'hip' + s: 1 - smooth(k + 0.06, k - 0.04, p[1]), 'knee' + s: smooth(k + 0.06, k - 0.04, p[1])}, 50), a, kn, r1, r1 * 0.9, 7)
        tube(b.P('shin' + s, color, 'knee' + s, 50), (kn[0], min(kn[1], top) if top else kn[1], kn[2]), (ft[0], ft[1] + 0.02, ft[2]), r1 * 0.9, r2, 7)
        secs = [(-0.035 * ZH, 0.8, 1.0), (0.0, 1.0, 1.0), (foot_len * 0.6, 0.9, 0.6), (foot_len, 0.3, 0.2)]
        rr = [[(ft[0] + foot_w * wk * math.cos(2 * math.pi * k / 8), 0.004 + 0.06 * hk * 0.5 * (1 + math.sin(2 * math.pi * k / 8)), ft[2] + dz) for k in range(8)] for dz, wk, hk in secs]
        vv = [q for r in rr for q in r]
        ff = [[j * 8 + i, j * 8 + (i + 1) % 8, (j + 1) * 8 + (i + 1) % 8, (j + 1) * 8 + i] for j in range(len(rr) - 1) for i in range(8)]
        vv.append(tuple(sum(q[k] for q in rr[0]) / 8 for k in range(3)))
        ff += [[(i + 1) % 8, i, len(vv) - 1] for i in range(8)]
        b.P('foot' + s, shoe, 'foot' + s, 40).add(vv, ff)


def face_dots(b, front, ey, ex, w, h, white, iris):
    for sxx in (1, -1):
        cx = sxx * ex
        on = lambda dx, dy, lift=0.0, cx=cx: (cx + dx, ey + dy, front(cx + dx, ey + dy) + 0.004 + lift)
        ts = [2 * math.pi * k / 10 for k in range(10)]
        quads = [([on(w * math.cos(t), h * math.sin(t)) for t in ts], white)]
        if iris:
            quads.append(([on(w * 0.45 * math.cos(t), h * 0.75 * math.sin(t), 0.0015) for t in ts], iris))
        b.eye(on(0, 0), quads)


def build_esmer(name):
    # LBA2's Esmer: one capsule for body and head (the original's: ±0.1 H round, from 0.19 H to the top), the face
    # high on it, trousers below, thin arms hanging out from the capsule with cone hands, thin legs, long boots
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    H = S['height'] * 0.98
    skin, cloth, pants, shoes = L.get('skin', '#f0a080'), L.get('tunic', '#c84a3a'), L.get('pants', '#3a3a4a'), L.get('shoes', '#e8e0c8')
    trim = L.get('tunicTrim') or cloth
    b = Builder(name, B)
    headY, neckY, hipsY = bp('head')[1], bp('neck')[1], bp('hips')[1]
    R = 0.1 * H * (0.92 if L.get('slim') else 1.0)
    st = L.get('stoop', 0) or 0
    def w_cap(p):
        y = p[1]
        hd = smooth(neckY - 0.02, headY + 0.06, y)
        hp = 1 - smooth(hipsY - 0.05, hipsY + 0.15, y)
        return {k: v for k, v in (('hips', hp), ('torso', (1 - hp) * (1 - hd)), ('head', hd)) if v > 0}
    zc = lambda y: st * 0.5 * smooth(hipsY, headY, y)
    # (rings at every colour edge, so each band's faces end on it)
    ys = [0.19, 0.205, 0.24, 0.3, 0.33, 0.36, 0.45, 0.55, 0.66, 0.685, 0.75, 0.82, 0.88, 0.95, 0.985, 1.0]
    ks = [0.55, 0.85, 0.97, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.6, 0.15]
    rings = [ell(y * H, R * k * (1.06 if y <= 0.3 else 1.0), R * k * (1.06 if y <= 0.3 else 1.0), 16, cz=zc(y * H)) for y, k in zip(ys, ks)]
    faceY = 0.82 * H
    bands = [(0.33 * H - 1e-4, pants), (0.36 * H - 1e-4, trim), (0.66 * H - 1e-4, cloth), (0.685 * H - 1e-4, trim), (9e9, skin)]
    banded(b, 'capsule', rings, bands, w_cap)
    front = lambda x, y: zc(y) + math.sqrt(max(0.0, R * R - x * x))
    face_dots(b, front, faceY, R * 0.38, R * 0.27, R * 0.16, '#f0ece0', L.get('eyes', '#2a2a2a'))
    mouth = b.P('mouth', '#6a2a2a', 'head', 30)
    mw = R * 0.28
    mouth.add([(x, faceY - R * 0.62 + yy, front(x, faceY - R * 0.62) + 0.003) for x, yy in ((-mw, 0), (mw, 0), (mw, 0.008), (-mw, 0.008))], [[0, 1, 2, 3]])
    if L.get('hat'):   # a round cap over the top of the capsule
        ht = b.P('hat', L['hat'], 'head', 40)
        sphere(ht, (0, 0.955 * H, zc(H)), R * 1.12, 12, 6, (1.0, 0.62, 1.05))
        disc(ht, (0, 0.93 * H, zc(H) + R * 0.25), R * 1.25, 12, 'y', 0.012)
    if L.get('glasses'):
        gl = b.P('glasses', '#2a2a30', 'head', 30)
        for sxx in (1, -1):
            c = (sxx * R * 0.36, faceY, front(sxx * R * 0.36, faceY) + 0.008)
            strip(gl, [(c[0] + math.cos(2 * math.pi * k / 8) * R * 0.25, c[1] + math.sin(2 * math.pi * k / 8) * R * 0.2, c[2]) for k in range(9)], 0.004, (0, 0, 0))
    # arms: thin, out from the capsule's side at the shoulder; a cone hand pointing down
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        a0 = (sx * R * 0.85, sh[1] + 0.02, sh[2])
        up = b.P('upper' + s, cloth, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50)
        tube(up, a0, el, 0.034, 0.028, 7)
        wrist = lerp(el, hd, 0.95)
        tube(b.P('fore' + s, skin, 'el' + s, 50), el, wrist, 0.028, 0.024, 7)
        ax = [hd[i] - el[i] for i in range(3)]; al = math.sqrt(sum(c * c for c in ax)) or 1
        tip = tuple(hd[i] + ax[i] / al * 0.17 for i in range(3))
        tube(b.P('hand' + s, L.get('gloves') or skin, 'hand' + s, 40), tuple(hd[i] - ax[i] / al * 0.01 for i in range(3)), tip, 0.045, 0.006, 7)
    limb_legs(b, bp, pants, shoes, 0.045, 0.04, 0.13 * H * 0.9, 0.04, ZH=H)   # (from the hip joint, inside the capsule: a stride never shows a gap)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_bee(name):
    # LBA2's Mosquibee: a big upright oval abdomen (the original's ±0.11 H, 0.29–0.71 H), a small head forward on
    # top with two great eyes, a long proboscis and curled antennae, two long wings on the back, thin dark legs
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    H = S['height'] * 0.98
    body, stripe, dark, eyec, wing = L.get('tunic', '#d8a040'), L.get('tunicTrim', '#5a3a1a'), L.get('skin', '#5a4a4a'), L.get('eyes', '#3a8a3a'), L.get('wing', '#7ac0a8')
    b = Builder(name, B)
    hipsY, headY, neckY = bp('hips')[1], bp('head')[1], bp('neck')[1]
    def w_abd(p):
        k = smooth(hipsY - 0.1, hipsY + 0.25, p[1])
        return {'hips': 1 - k, 'torso': k}
    R = 0.115 * H * (L.get('belly', 0) * 2 + 1)
    ys = [0.29, 0.31, 0.36, 0.45, 0.55, 0.64, 0.69, 0.71]
    ks = [0.25, 0.6, 0.88, 1.0, 0.97, 0.75, 0.42, 0.12]
    rings = [ell(y * H, R * k, R * k * 0.95, 12, cz=-0.01 * H) for y, k in zip(ys, ks)]
    bands = [(0.35 * H, body)]
    if L.get('stripes', True):
        bands += [(0.41 * H, stripe), (0.47 * H, body), (0.53 * H, stripe), (9e9, body)]
    else:
        bands += [(9e9, body)]
    banded(b, 'abdomen', rings, bands, w_abd)
    # thorax collar and neck
    tube(b.P('neck', dark, lambda p: {'torso': 1 - smooth(neckY, headY, p[1]), 'head': smooth(neckY, headY, p[1])}, 50), (0, 0.69 * H, 0.0), (0, 0.76 * H, 0.03 * H), 0.05 * H, 0.04 * H, 8)
    # head: a flattened oval forward of the neck, two great eyes on its sides, the proboscis forward
    hc = (0, 0.79 * H, 0.07 * H)
    hp_ = b.P('head', dark, 'head', 60)
    sphere(hp_, hc, 0.075 * H, 10, 7, (1.25, 0.8, 1.35))
    for sxx in (1, -1):
        sphere(b.P('eyeBall', eyec, 'head', 70), (sxx * 0.06 * H, 0.83 * H, 0.15 * H), 0.045 * H, 9, 6, (0.85, 1.0, 0.9))
        sphere(b.P('glint', '#e8fff0', 'head', 70), (sxx * 0.066 * H, 0.85 * H, 0.185 * H), 0.009 * H, 5, 4)
        ant = b.P('antenna', dark, 'head', 40)
        pts = [(sxx * 0.02 * H, 0.86 * H, 0.12 * H), (sxx * 0.025 * H, 0.97 * H, 0.15 * H), (sxx * 0.03 * H, 1.0 * H, 0.21 * H), (sxx * 0.03 * H, 0.985 * H, 0.27 * H)]
        for i in range(3):
            tube(ant, pts[i], pts[i + 1], 0.008 * H, 0.006 * H, 5)
        sphere(ant, pts[-1], 0.012 * H, 5, 4)
    tube(b.P('proboscis', L.get('proboscis', '#2a2020'), 'head', 40), (0, 0.79 * H, 0.17 * H), (0, 0.78 * H, 0.5 * H), 0.016 * H, 0.004 * H, 6)
    # wings: two long flat leaves on the back, angled up and out
    for sxx in (1, -1):
        w = b.P('wing', wing, 'torso', 30)
        base = (sxx * 0.03 * H, 0.66 * H, -0.09 * H)
        pts = []
        for k in range(10):
            t = 2 * math.pi * k / 10
            u = 0.5 + 0.5 * math.cos(t)               # 0 at the base, 1 at the tip
            v = math.sin(t) * 0.07 * H * (0.4 + 0.6 * math.sin(math.pi * min(1, u * 1.1)))
            pts.append((base[0] + sxx * (u * 0.16 * H), base[1] + u * 0.1 * H + v, base[2] - u * 0.32 * H))
        disc_pts = pts
        w.add(disc_pts + [tuple(q + (0.004 if i == 2 else 0) for i, q in enumerate(p)) for p in disc_pts], [list(range(10)), list(reversed(range(10, 20)))])
    # thin legs and arms (forelegs)
    limb_legs(b, bp, dark, dark, 0.03, 0.02, 0.1 * H * 0.8, 0.03, ZH=H)
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        tube(b.P('upper' + s, dark, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50), (sx * R * 0.8, sh[1], sh[2] + 0.02), el, 0.022, 0.018, 6)
        tube(b.P('fore' + s, dark, 'el' + s, 50), el, hd, 0.018, 0.014, 6)
        sphere(b.P('hand' + s, dark, 'hand' + s, 50), hd, 0.025, 6, 4)
    if L.get('crown'):
        cr = b.P('crown', L['crown'], 'head', 30)
        for k in range(5):
            a = 2 * math.pi * k / 5
            tube(cr, (math.sin(a) * 0.03 * H, 0.84 * H, 0.07 * H + math.cos(a) * 0.03 * H), (math.sin(a) * 0.035 * H, 0.89 * H, 0.07 * H + math.cos(a) * 0.035 * H), 0.008 * H, 0.002 * H, 4)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_mole(name):
    # Zeelich's moles (bodies 194, 323, 327, 336: 0.94 of Twinsen's height): a robed pear of a body (±0.19 H, deep
    # ±0.16, from 0.24 H to the rounded top at 0.92 H), no neck: the head is a long pale snout reaching forward
    # from the top of the robe to +0.5 H, small dark eyes on it, a yellow lip under it; long pale arms hanging well
    # out from the sides (±0.31–0.37 H), pale legs and big pale feet pointing forward
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    H = S['height'] * 0.98
    robe, pale, lip, apron = L.get('tunic', '#5a5068'), L.get('skin', '#e8e0d8'), L.get('lip', '#f0c060'), L.get('apron')
    b = Builder(name, B)
    hipsY, headY, neckY = bp('hips')[1], bp('head')[1], bp('neck')[1]
    def w_b(p):
        y = p[1]
        hd = smooth(neckY, headY + 0.1, y)
        k = smooth(hipsY - 0.1, hipsY + 0.25, y)
        return {kk: v for kk, v in (('hips', 1 - k), ('torso', k * (1 - hd)), ('head', k * hd)) if v > 0}
    secs = [(0.24, 0.17, 0.14), (0.26, 0.19, 0.16), (0.4, 0.19, 0.16), (0.56, 0.185, 0.155), (0.65, 0.172, 0.15), (0.74, 0.15, 0.14), (0.82, 0.12, 0.12), (0.88, 0.08, 0.09), (0.92, 0.03, 0.04)]
    rings = [ring(y * H, hw * H, zf * H, -zf * H, 14, 0.8) for y, hw, zf in secs]
    bands = [(0.4 * H, apron), (9e9, robe)] if apron else [(9e9, robe)]
    banded(b, 'robe', rings, bands, w_b, cap0=True, cap1=True)
    # the snout: from the front of the robe's top, forward and a little down, pale; the lip under it
    sp = [(0, 0.86 * H, 0.08 * H), (0, 0.875 * H, 0.22 * H), (0, 0.87 * H, 0.38 * H), (0, 0.855 * H, 0.5 * H)]
    sr = [0.085 * H, 0.06 * H, 0.04 * H, 0.012 * H]
    sn = b.P('snout', pale, 'head', 50)
    for i in range(3):
        tube(sn, sp[i], sp[i + 1], sr[i], sr[i + 1], 9, squash=0.8)
    tube(b.P('lip', lip, 'head', 50), (0, 0.83 * H, 0.12 * H), (0, 0.835 * H, 0.42 * H), 0.04 * H, 0.008 * H, 7, squash=0.5)
    for sxx in (1, -1):
        sphere(b.P('eyeBall', L.get('eyes', '#2a1a1a'), 'head', 70), (sxx * 0.05 * H, 0.905 * H, 0.2 * H), 0.016 * H, 6, 4)
    # arms: long and pale, hanging well out from the sides
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        out = lambda p, k: (p[0] + sx * k * H, p[1], p[2] + 0.06 * H)
        a0, e2, h2 = (sx * 0.16 * H, 0.74 * H, 0.06 * H), out(el, 0.12), out(hd, 0.14)
        tube(b.P('upper' + s, robe, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50), a0, e2, 0.055, 0.045, 8)
        tube(b.P('fore' + s, pale, 'el' + s, 50), e2, h2, 0.045, 0.04, 8)
        sphere(b.P('hand' + s, pale, 'hand' + s, 50), (h2[0], h2[1] - 0.03, h2[2]), 0.045, 7, 5, (0.8, 1.2, 1.0))
    limb_legs(b, bp, pale, pale, 0.075, 0.065, 0.22 * H, 0.085, ZH=H)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_tri(name):
    # LBA2's triangle-headed Zeelichians (bodies 84, 430; 1.13 of Twinsen's height): a thin body in a suit (shoulders
    # ±0.13 H, the waist ±0.06), thin arms with pointed hands, thin legs; the head a big inverted triangle from a
    # pointed chin (0.70 H) to the cheekbones (±0.108 H with the ears' points), a flat top (±0.079), the face forward
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    H = S['height'] * 0.98
    skin, suit, shirt, pants, shoes, hair = L.get('skin', '#c08a68'), L.get('tunic', '#2f6a3a'), L.get('shirt', '#e8e0c8'), L.get('pants', '#9a7a3a'), L.get('shoes', '#4a8a5a'), L.get('hair', '#e0c890')
    b = Builder(name, B)
    hipsY, neckY, headY = bp('hips')[1], bp('neck')[1], bp('head')[1]
    def w_t(p):
        k = smooth(hipsY - 0.05, hipsY + 0.15, p[1])
        return {'hips': 1 - k, 'torso': k}
    secs = [(0.40, 0.065, 0.04, -0.04), (0.47, 0.062, 0.045, -0.04), (0.52, 0.065, 0.05, -0.042), (0.58, 0.1, 0.06, -0.05), (0.65, 0.128, 0.064, -0.05), (0.71, 0.13, 0.06, -0.045), (0.735, 0.08, 0.04, -0.03)]
    rings = [ring(y * H, hw * H, zf * H, zb * H, 12, 0.7) for y, hw, zf, zb in secs]
    banded(b, 'suit', rings, [(0.45 * H, pants), (9e9, suit)], w_t)
    if L.get('tie'):   # shirt front and a tie
        sf = b.P('shirt', shirt, 'torso', 30)
        z = lambda y: 0.062 * H + 0.002
        sf.add([(-0.035 * H, 0.735 * H, z(0)), (0.035 * H, 0.735 * H, z(0)), (0.0, 0.6 * H, z(0))], [[0, 2, 1][::-1]])
        tie = b.P('tie', L['tie'], 'torso', 30)
        tie.add([(-0.01 * H, 0.725 * H, z(0) + 0.003), (0.01 * H, 0.725 * H, z(0) + 0.003), (0.014 * H, 0.62 * H, z(0) + 0.003), (0.0, 0.6 * H, z(0) + 0.003), (-0.014 * H, 0.62 * H, z(0) + 0.003)], [[0, 4, 3, 2, 1]])
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(neckY, headY + 0.05, p[1]), 'head': smooth(neckY, headY + 0.05, p[1])}, 50), (0, 0.72 * H, 0), (0, 0.79 * H, 0.01 * H), 0.03 * H, 0.028 * H, 8)
    # the head: sections from the chin up (y, half-width, front, back), the ears' points at the widest
    hs = [(0.70, 0.004, 0.13, 0.11), (0.74, 0.04, 0.135, 0.0), (0.79, 0.07, 0.135, -0.02), (0.84, 0.092, 0.14, -0.035), (0.885, 0.1, 0.125, -0.05), (0.93, 0.08, 0.105, -0.058), (0.975, 0.078, 0.09, -0.05)]
    hr = [ring(y * H, hw * H, zf * H, zb * H, 12, 0.55) for y, hw, zf, zb in hs]
    hp_ = b.P('head', skin, 'head', 40)
    loft(hp_, hr, cap_bottom=True)
    loft(b.P('hair', hair, 'head', 40), [ring(0.972 * H, 0.08 * H, 0.092 * H, -0.052 * H, 12, 0.55), ring(1.0 * H, 0.078 * H, 0.088 * H, -0.05 * H, 12, 0.55)], cap_top=True)
    for sxx in (1, -1):   # the ears: flat points out of the cheekbones
        ear = b.P('ear', skin, 'head', 30)
        ear.add([(sxx * 0.09 * H, 0.86 * H, 0.03 * H), (sxx * 0.09 * H, 0.91 * H, 0.0), (sxx * 0.15 * H, 0.93 * H, -0.01 * H)], [[0, 1, 2] if sxx > 0 else [2, 1, 0]])
        ear.add([(sxx * 0.09 * H, 0.86 * H, 0.03 * H), (sxx * 0.15 * H, 0.93 * H, -0.01 * H), (sxx * 0.09 * H, 0.91 * H, 0.0)], [[0, 1, 2] if sxx > 0 else [2, 1, 0]])
    def front(x, y):
        yy = y / H
        for (ya, wa, fa, _), (yb, wb, fb, _) in zip(hs, hs[1:]):
            if ya <= yy <= yb:
                t = (yy - ya) / (yb - ya); w = (wa + (wb - wa) * t) * H; f = (fa + (fb - fa) * t) * H
                return f * max(0.2, 1 - (abs(x) / max(w, 1e-3)) ** 1.8) ** 0.55
        return 0.1 * H
    face_dots(b, front, 0.87 * H, 0.035 * H, 0.016 * H, 0.008 * H, '#f0ece0', L.get('eyes', '#2a2a2a'))
    nose = b.P('nose', skin, 'head', 30)
    nz = front(0, 0.82 * H)
    nose.add([(-0.012 * H, 0.835 * H, nz), (0.012 * H, 0.835 * H, nz), (0.0, 0.8 * H, nz + 0.03 * H)], [[0, 2, 1][::-1]])
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        tube(b.P('upper' + s, suit, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50), (sx * 0.135 * H, 0.71 * H, 0), el, 0.03, 0.026, 7)
        tube(b.P('fore' + s, suit, 'el' + s, 50), el, hd, 0.026, 0.022, 7)
        ax = [hd[i] - el[i] for i in range(3)]; al = math.sqrt(sum(c * c for c in ax)) or 1
        tube(b.P('hand' + s, skin, 'hand' + s, 40), hd, tuple(hd[i] + ax[i] / al * 0.13 for i in range(3)), 0.03, 0.004, 6)
    limb_legs(b, bp, pants, shoes, 0.04, 0.034, 0.1 * H * 0.8, 0.032, ZH=H)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_vesk(name):
    # Vesk, the villain: a silhouette of his own, as FunFrock had. A long near-black coat flaring to the floor
    # (each half carried by its leg, like Twinsen's robe), a tall stiff collar standing up behind the head, angular
    # brass pauldrons, a broad brass belt, the project's violet emblem on the chest; a narrow grey-violet egg of a
    # head with a swept crest, a violet monocle, a sharp chin; a heavy brass gauntlet on the right forearm
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    coat, lining, brass, skin, glow, boots = '#1a2a33', '#4a2a6a', '#c8a050', L.get('skin', '#a99cc6'), '#e090ff', '#16141a'
    b = Builder(name, B)
    hipsY, neckY, headY = bp('hips')[1], bp('neck')[1], bp('head')[1]
    shY, shX = bp('shL')[1], bp('shL')[0]
    def w_coat(p):
        x, y, z = p
        if y >= hipsY:
            arm = smooth(shX - 0.04, shX + 0.04, abs(x)) * smooth(shY - 0.15, shY - 0.02, y)
            s_ = 'L' if x > 0 else 'R'
            return {k: v for k, v in (('torso', 1 - arm), ('sh' + s_, arm)) if v > 0}
        k = smooth(hipsY, hipsY - 0.2, y)
        knee = 1 - smooth(0.42, 0.62, y)
        l = smooth(-0.05, 0.05, x)
        w = {'hips': 1 - k}
        for s_, ws in (('L', l), ('R', 1 - l)):
            if ws > 0:
                if 1 - knee > 0: w['hip' + s_] = k * ws * (1 - knee)
                if knee > 0: w['knee' + s_] = k * ws * knee
        return {kk: v for kk, v in w.items() if v > 1e-4}
    st = 0.04
    secs = [(0.03, 0.34, 0.27, -0.29), (0.25, 0.3, 0.24, -0.26), (0.5, 0.25, 0.2, -0.22), (0.75, 0.2, 0.16, -0.18), (hipsY, 0.165, 0.135, -0.14),
            (hipsY + 0.25, 0.18, 0.15, -0.14), (shY - 0.12, 0.21, 0.15, -0.14), (shY, 0.2, 0.12, -0.12), (neckY - 0.02, 0.075, 0.07, -0.06)]
    rings = [ring(y, hw, zf + st * smooth(hipsY, neckY, y), zb, 20, 0.7) for y, hw, zf, zb in secs]
    loft(b.P('coat', coat, w_coat, 50), rings, cap_top=True)
    # the lining shows at the hem: a violet band just inside it
    loft(b.P('lining', lining, w_coat, 60), [ring(0.035, 0.335, 0.265, -0.285, 20, 0.7), ring(0.1, 0.32, 0.255, -0.275, 20, 0.7)])
    # the belt and its buckle; the emblem on the chest
    loft(b.P('belt', brass, 'torso', 50), [ring(hipsY - 0.03, 0.168, 0.138, -0.143, 20, 0.7), ring(hipsY + 0.05, 0.17, 0.142, -0.142, 20, 0.7)])
    box(b.P('buckle', '#e8c870', 'torso', 30), -0.05, 0.05, hipsY - 0.035, hipsY + 0.055, 0.135, 0.16)
    ey_, ez_ = shY - 0.2, 0.17 + st * smooth(hipsY, neckY, shY - 0.2)
    disc(b.P('emblemRim', brass, 'torso', 30), (0, ey_, ez_), 0.07, 8, 'z', 0.012)
    disc(b.P('emblem', glow, 'torso', 30), (0, ey_, ez_ + 0.008), 0.048, 8, 'z', 0.0)
    # the tall collar: a curved shell standing up behind the head, wider at the top, violet inside
    cv, cf = [], []
    M = 9
    for j, (y, r) in enumerate(((shY + 0.02, 0.14), (neckY + 0.12, 0.17), (headY + 0.22, 0.23))):
        for i in range(M):
            a = math.pi * (0.15 + 0.7 * i / (M - 1))          # the back half, open in front
            cv.append((r * math.cos(a), y, -r * math.sin(a) * 0.9 - 0.01))
    for j in range(2):
        for i in range(M - 1):
            cf.append([j * M + i, j * M + i + 1, (j + 1) * M + i + 1, (j + 1) * M + i])
    b.P('collar', coat, 'torso', 40).add(cv, cf)
    b.P('collarIn', lining, 'torso', 40).add([(x * 0.97, y, z * 0.97 + 0.004) for x, y, z in cv], [f[::-1] for f in cf])
    # pauldrons: angular brass plates on the shoulders
    for s_, sx in (('L', 1), ('R', -1)):
        sh = bp('sh' + s_)
        sphere(b.P('pauldron' + s_, brass, 'sh' + s_, 25), (sh[0] + sx * 0.02, sh[1] + 0.03, sh[2]), 0.11, 6, 4, (1.15, 0.55, 1.05))
    # arms: coat sleeves; the left hand a grey-violet ball, the right forearm a brass gauntlet with claws
    for s_, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s_), bp('el' + s_), bp('hand' + s_)
        tube(b.P('upper' + s_, coat, lambda p, s_=s_, e=el[1]: {'sh' + s_: 1 - smooth(e + 0.06, e - 0.04, p[1]), 'el' + s_: smooth(e + 0.06, e - 0.04, p[1])}, 50), (sh[0], sh[1] + 0.02, sh[2]), el, 0.065, 0.058, 8)
        if s_ == 'R':
            tube(b.P('gauntlet', brass, 'el' + s_, 30), el, lerp(el, hd, 0.95), 0.085, 0.075, 7)
            for k in (-1, 0, 1):
                tube(b.P('claw', '#8a6a3a', 'hand' + s_, 30), (hd[0] + k * 0.03, hd[1], hd[2] + 0.02), (hd[0] + k * 0.035, hd[1] - 0.13, hd[2] + 0.07), 0.018, 0.004, 5)
            sphere(b.P('gauntletLight', glow, 'el' + s_, 60), lerp(el, hd, 0.5)[:2] + (lerp(el, hd, 0.5)[2] + 0.08,), 0.022, 6, 4)
        else:
            tube(b.P('fore' + s_, coat, 'el' + s_, 50), el, lerp(el, hd, 0.85), 0.058, 0.064, 8)
            sphere(b.P('hand' + s_, skin, 'hand' + s_, 60), lerp(el, hd, 1.05), 0.048, 8, 6)
    # boots under the coat
    for s_, sx in (('L', 1), ('R', -1)):
        ft = bp('foot' + s_)
        tube(b.P('shin' + s_, boots, 'knee' + s_, 40), (ft[0], 0.45, ft[2]), (ft[0], 0.06, ft[2]), 0.06, 0.055, 7)
        box(b.P('boot' + s_, boots, 'foot' + s_, 30), ft[0] - 0.055, ft[0] + 0.055, 0.0, 0.07, ft[2] - 0.06, ft[2] + 0.17, 0.035)
    # the neck and head: a narrow egg, the chin sharp, a crest swept back, the monocle on the right eye
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.05, p[1]), 'head': smooth(headY - 0.02, headY + 0.05, p[1])}, 60), (0, neckY - 0.05, 0.03), (0, headY + 0.06, 0.06), 0.045, 0.042, 8)
    c = (0, headY + 0.16, 0.07)
    hp_ = b.P('head', skin, 'head', 70)
    sphere(hp_, c, 0.1, 10, 8, (0.85, 1.45, 1.0))
    tube(hp_, (0, c[1] - 0.06, c[2] + 0.04), (0, c[1] - 0.2, c[2] + 0.07), 0.07, 0.008, 8)   # the long sharp chin
    tube(b.P('nose', skin, 'head', 40), (0, c[1] + 0.0, c[2] + 0.085), (0, c[1] - 0.05, c[2] + 0.15), 0.022, 0.006, 6)
    cr = b.P('crest', L.get('crest', '#5a4a8a'), 'head', 30)
    pts = [(0, c[1] + 0.1, c[2] + 0.05), (0, c[1] + 0.17, c[2] - 0.02), (0, c[1] + 0.17, c[2] - 0.12), (0, c[1] + 0.08, c[2] - 0.2)]
    cr.add([(x - 0.012, y, z) for x, y, z in pts] + [(x, y + 0.05, z - 0.02) for x, y, z in pts] + [(x + 0.012, y, z) for x, y, z in pts],
           [[i, i + 1, 5 + i, 4 + i] for i in range(3)] + [[4 + i, 5 + i, 9 + i, 8 + i] for i in range(3)])
    front = lambda x, y: c[2] + 0.1 * math.sqrt(max(0.05, 1 - (x / 0.085) ** 2 - ((y - c[1]) / 0.145) ** 2))
    ey = c[1] + 0.035
    for sxx in (1, -1):
        on = lambda dx, dy, lift=0.0, cx=sxx * 0.038: (cx + dx, ey + dy, front(cx + dx, ey + dy) + 0.004 + lift)
        ts = [2 * math.pi * k / 10 for k in range(10)]
        if sxx < 0:   # the monocle: a brass ring, violet glass
            b.eye(on(0, 0), [([on(0.026 * math.cos(t), 0.026 * math.sin(t), 0.004) for t in ts], brass), ([on(0.019 * math.cos(t), 0.019 * math.sin(t), 0.006) for t in ts], glow)])
        else:
            b.eye(on(0, 0), [([on(0.02 * math.cos(t), 0.008 * math.sin(t) - 0.002 * math.cos(t)) for t in ts], '#f0e8d0'), ([on(0.007 * math.cos(t), 0.007 * math.sin(t), 0.0012) for t in ts], L.get('eyes', '#e0a020'))])
    brow = b.P('brow', '#3a2a4a', 'head', 30)
    brow.add([(0.012, ey + 0.012, front(0.012, ey + 0.012) + 0.006), (0.062, ey + 0.03, front(0.062, ey + 0.03) + 0.006), (0.062, ey + 0.042, front(0.062, ey + 0.042) + 0.006), (0.012, ey + 0.02, front(0.012, ey + 0.02) + 0.006)], [[0, 1, 2, 3]])
    my = c[1] - 0.075
    b.P('mouth', '#3a1a2a', 'head', 30).add([(-0.03, my, front(-0.03, my) + 0.004), (0.03, my - 0.008, front(0.03, my) + 0.004), (0.03, my - 0.002, front(0.03, my) + 0.004), (-0.03, my + 0.006, front(-0.03, my) + 0.004)], [[0, 1, 2, 3]])
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_elf(name):
    # Joe the Elf, after LBA2's (body 110; 0.86 of Twinsen's height): a small body in a green A-line tunic with a
    # belt, short teal legs and pointed green shoes; a big head with great pointed ears standing out, a long nose,
    # a short white beard; a tall green pointed hat bending back, a yellow pompom at its tip; thin arms, ball hands
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    skin, green, dark, legs, shoes = L.get('skin', '#e8b890'), L.get('tunic', '#3a8a3a'), L.get('tunicTrim', '#2a5a2a'), L.get('pants', '#2a6a6a'), L.get('shoes', '#4a9a4a')
    b = Builder(name, B)
    hipsY, shY, neckY, headY = bp('hips')[1], bp('shL')[1], bp('neck')[1], bp('head')[1]
    kn = bp('kneeL')[1]
    def w_t(p):
        x, y, z = p
        k = smooth(hipsY - 0.05, hipsY + 0.15, y)
        if y < hipsY - 0.05:   # the skirt of the tunic follows the legs a little
            l = smooth(-0.05, 0.05, x)
            leg = smooth(hipsY - 0.05, kn, y) * 0.5
            return {kk: v for kk, v in (('hips', 1 - leg), ('hipL', leg * l), ('hipR', leg * (1 - l))) if v > 1e-4}
        return {kk: v for kk, v in (('hips', 1 - k), ('torso', k)) if v > 0}
    secs = [(kn + 0.06, 0.25, 0.2, -0.19), (hipsY - 0.1, 0.2, 0.16, -0.15), (hipsY + 0.05, 0.15, 0.13, -0.12), (shY - 0.08, 0.15, 0.12, -0.11), (shY + 0.02, 0.13, 0.09, -0.09), (neckY + 0.02, 0.06, 0.05, -0.05)]
    st = L.get('stout', 1.0)   # (Ker'aooc, after body 188: a broad round body)
    if st != 1.0:
        secs = [(y, hw * (st if i < len(secs) - 1 else 1), zf * (st if i < len(secs) - 1 else 1), zb * (st if i < len(secs) - 1 else 1)) for i, (y, hw, zf, zb) in enumerate(secs)]
    loft(b.P('tunic', green, w_t, 50), [ring(y, hw, zf, zb, 14, 0.75) for y, hw, zf, zb in secs], cap_top=True)
    loft(b.P('belt', L.get('belt', '#3a2a1a'), 'torso', 50), [ring(hipsY + 0.02, 0.155 * st, 0.135 * st, -0.125 * st, 14, 0.75), ring(hipsY + 0.07, 0.155 * st, 0.135 * st, -0.125 * st, 14, 0.75)])
    loft(b.P('hem', dark, w_t, 50), [ring(kn + 0.05, 0.253 * st, 0.203 * st, -0.193 * st, 14, 0.75), ring(kn + 0.1, 0.24 * st, 0.19 * st, -0.18 * st, 14, 0.75)])
    for s_, sx in (('L', 1), ('R', -1)):
        hp, k_, ft = bp('hip' + s_), bp('knee' + s_), bp('foot' + s_)
        tube(b.P('thigh' + s_, legs, lambda p, s_=s_, k=k_[1]: {'hip' + s_: 1 - smooth(k + 0.06, k - 0.04, p[1]), 'knee' + s_: smooth(k + 0.06, k - 0.04, p[1])}, 50), hp, k_, 0.055, 0.05, 8)
        tube(b.P('shin' + s_, legs, 'knee' + s_, 50), k_, (ft[0], ft[1] + 0.03, ft[2]), 0.05, 0.045, 8)
        sh = b.P('shoe' + s_, shoes, 'foot' + s_, 40)   # pointed, the toe curling up
        tube(sh, (ft[0], 0.05, ft[2] - 0.05), (ft[0], 0.05, ft[2] + 0.12), 0.06, 0.04, 8, squash=0.7)
        tube(sh, (ft[0], 0.05, ft[2] + 0.12), (ft[0], 0.11, ft[2] + 0.2), 0.04, 0.005, 6)
    for s_, sx in (('L', 1), ('R', -1)):
        shp, el, hd = bp('sh' + s_), bp('el' + s_), bp('hand' + s_)
        tube(b.P('upper' + s_, green, lambda p, s_=s_, e=el[1]: {'sh' + s_: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s_: smooth(e + 0.05, e - 0.03, p[1])}, 50), (shp[0], shp[1] + 0.02, shp[2]), el, 0.042, 0.035, 8)
        tube(b.P('fore' + s_, skin, 'el' + s_, 50), el, hd, 0.03, 0.028, 7)
        sphere(b.P('hand' + s_, skin, 'hand' + s_, 60), hd, 0.055, 8, 6)
    # the head: big and round, ears, nose, beard; the hat
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.05, p[1]), 'head': smooth(headY - 0.02, headY + 0.05, p[1])}, 60), (0, neckY - 0.04, 0), (0, headY + 0.08, 0.01), 0.05, 0.05, 8)
    c = (0, headY + 0.17, 0.02)
    sphere(b.P('head', skin, 'head', 60), c, 0.17, 12, 9, (1.0, 0.95, 0.95))
    # (Ker'aooc, after body 188, has no great ears, a long pointed beard, star-pointed shoulders and bells on his shoes)
    if not L.get('noEars'):
        for sxx in (1, -1):
            tube(b.P('ear', skin, 'head', 40), (sxx * 0.14, c[1] + 0.02, c[2] - 0.02), (sxx * 0.36, c[1] + 0.14, c[2] - 0.06), 0.06, 0.004, 7, squash=0.35)
    tube(b.P('nose', L.get('noseC', '#e89a80'), 'head', 50), (0, c[1] - 0.01, c[2] + 0.14), (0, c[1] - 0.06, c[2] + 0.27), 0.04, 0.012, 7)
    if L.get('beardLong'):
        tube(b.P('beard', L.get('beard', '#f2f0ea'), lambda p: {'head': 1 - smooth(neckY, shY - 0.15, p[1]), 'torso': smooth(neckY, shY - 0.15, p[1])}, 60), (0, c[1] - 0.06, c[2] + 0.1), (0.03, hipsY - 0.02, c[2] + 0.24), 0.13, 0.01, 9, squash=0.55)
    else:
        sphere(b.P('beard', L.get('beard', '#f2f0ea'), 'head', 60), (0, c[1] - 0.11, c[2] + 0.08), 0.12, 9, 6, (1.0, 0.7, 0.75))
    if L.get('pads'):
        for s_, sx in (('L', 1), ('R', -1)):
            tube(b.P('pad' + s_, green, 'torso', 50), (sx * 0.08, shY - 0.02, 0), (sx * 0.46, shY + 0.04, -0.01), 0.13, 0.012, 8, squash=0.7)
    if L.get('bells'):
        for s_, sx in (('L', 1), ('R', -1)):
            ft = bp('foot' + s_)
            sphere(b.P('bell' + s_, L['bells'], 'foot' + s_, 30), (ft[0], 0.125, ft[2] + 0.2), 0.03, 7, 5)
    front = lambda x, y: c[2] + 0.17 * 0.95 * math.sqrt(max(0.05, 1 - (x / 0.17) ** 2 - ((y - c[1]) / 0.16) ** 2))
    face_dots(b, front, c[1] + 0.04, 0.06, 0.022, 0.014, '#f4f0e8', L.get('eyes', '#7a2a2a'))
    hat = b.P('hat', L.get('hat', '#2f7a3a'), lambda p: {'head': 1.0}, 40)
    loft(hat, [ring(c[1] + 0.08, 0.19, 0.18, -0.18, 12, 1.0, cz=c[2]), ring(c[1] + 0.12, 0.17, 0.16, -0.16, 12, 1.0, cz=c[2])], cap_bottom=True)
    pts = [(0, c[1] + 0.12, c[2]), (0, c[1] + 0.34, c[2] - 0.03), (0, c[1] + 0.52, c[2] - 0.1), (0, c[1] + 0.62, c[2] - 0.22)]
    if L.get('hatStraight'):
        pts = [(0, c[1] + 0.12, c[2]), (0, c[1] + 0.36, c[2]), (0, c[1] + 0.58, c[2] - 0.01), (0, c[1] + 0.74, c[2] - 0.02)]
    rad = [0.165, 0.11, 0.06, 0.012]
    for i in range(3):
        tube(hat, pts[i], pts[i + 1], rad[i], rad[i + 1], 10)
    sphere(b.P('pompom', L.get('pompom', '#f2d860'), 'head', 60), pts[-1], 0.05, 7, 5)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_fclone(name):
    # LBA1's FunFrock trooper (bodies 18-20, 62-64; 1196 of Twinsen's 1240 units to the helmet top): a fat body in a
    # greatcoat to the ankles (+-280 units at the hips), red straps crossing the chest to a red belt with a black
    # buckle, a big red pack on the back with a blue bedroll under it, a small head under a round helmet, long arms
    # to below the hips with small ball hands, red boots
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    u = 2.1 / 1240
    coat, red = L.get('tunic', '#576743'), L.get('belt', '#872f1f')
    b = Builder(name, B)
    hipsY = bp('hips')[1]
    def w_coat(p):
        x, y, z = p
        k = smooth(hipsY - 0.05, hipsY + 0.2, y)
        if y < hipsY:
            l = smooth(-0.08, 0.08, x)
            leg = smooth(hipsY, 0.15, y) * 0.45
            return {kk: v for kk, v in (('hips', 1 - leg), ('hipL', leg * l), ('hipR', leg * (1 - l))) if v > 1e-4}
        return {kk: v for kk, v in (('hips', 1 - k), ('torso', k)) if v > 0}
    secs = [(75, 262, 240), (190, 285, 262), (330, 290, 268), (480, 278, 258), (620, 250, 232), (760, 205, 190), (860, 158, 145), (930, 105, 98), (958, 70, 70)]
    loft(b.P('coat', coat, w_coat, 40), [ell(y * u, rx * u, rz * u, 16, cz=10 * u) for y, rx, rz in secs], cap_top=True, cap_bottom=True)
    # the belt and buckle, two straps crossing the chest
    loft(b.P('belt', red, 'torso', 40), [ell(530 * u, 281 * u, 261 * u, 16, cz=10 * u), ell(585 * u, 280 * u, 260 * u, 16, cz=10 * u)])
    box(b.P('buckle', '#070b17', 'torso', 40), -56 * u, 56 * u, 520 * u, 595 * u, 268 * u, 285 * u)
    for sx in (1, -1):
        tube(b.P('strap', red, 'torso', 40), (sx * 110 * u, 900 * u, 125 * u), (sx * 165 * u, 590 * u, 250 * u), 18 * u, 18 * u, 5, squash=0.4)
        tube(b.P('strap', red, 'torso', 40), (sx * 110 * u, 900 * u, -120 * u), (sx * 150 * u, 600 * u, -150 * u), 18 * u, 18 * u, 5, squash=0.4)
    # the pack and its bedroll
    box(b.P('pack', L.get('pack', '#872f1f'), 'torso', 40), -190 * u, 165 * u, 600 * u, 1000 * u, -330 * u, -150 * u)
    tube(b.P('roll', L.get('roll', '#4f9bbf'), 'torso', 50), (-200 * u, 545 * u, -235 * u), (175 * u, 545 * u, -235 * u), 60 * u, 60 * u, 10)
    # head: a small face under the helmet, a chin strap
    hd = bp('head')
    sk = L.get('skin', '#f3af53')
    sphere(b.P('face', sk, 'head', 60), (0, 1015 * u, 15 * u), 1.0, 10, 7, (90 * u, 70 * u, 85 * u))
    tube(b.P('chin', sk, 'head', 60), (0, 990 * u, 20 * u), (0, 925 * u, 45 * u), 70 * u, 12 * u, 7)   # (the face narrows to a point)
    tube(b.P('nose', sk, 'head', 50), (0, 1020 * u, 90 * u), (0, 995 * u, 130 * u), 24 * u, 9 * u, 6)
    for sx in (1, -1):
        sphere(b.P('eye', '#101418', 'head', 60), (sx * 32 * u, 1035 * u, 88 * u), 11 * u, 6, 4)
    hm = b.P('helmet', L.get('helmet', '#576743'), 'head', 40)
    sphere(hm, (0, 1105 * u, 0), 1.0, 12, 7, (128 * u, 90 * u, 128 * u))
    disc(hm, (0, 1066 * u, 0), 142 * u, 14, 'y', 0.012)
    # long arms from the high shoulders, small ball hands
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd_ = bp('sh' + s), bp('el' + s), bp('hand' + s)
        tube(b.P('upper' + s, coat, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50), sh, el, 62 * u, 52 * u, 8)
        tube(b.P('fore' + s, coat, 'el' + s, 50), el, hd_, 52 * u, 40 * u, 8)
        sphere(b.P('hand' + s, L.get('hands', '#e3a34f'), 'hand' + s, 60), hd_, 38 * u, 8, 6)
    # red boots under the hem
    for s, sx in (('L', 1), ('R', -1)):
        ft = bp('foot' + s)
        bt = b.P('boot' + s, L.get('shoes', '#872f1f'), 'foot' + s, 30)
        tube(bt, (ft[0], 45 * u, ft[2] - 180 * u), (ft[0], 40 * u, ft[2] + 230 * u), 60 * u, 40 * u, 8, squash=0.6)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_sphero(name):
    # LBA1's Sphero (bodies 68-70; 828 of Twinsen's 1240 units tall, measured in the scratchpad): a star-shaped body
    # 0.8 m across the shoulder points, its face (a skin oval with blue eyes, red brows, a nose) in the middle of the
    # front, an orange crest at the top point, arms hanging straight from the shoulder points with big ball hands,
    # short legs with ball knees and flat feet turned out
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    u = 2.1 / 1240
    coat, coatD, skin = L.get('tunic', '#5b9f63'), L.get('tunicTrim', '#4f8f57'), L.get('skin', '#d3af87')
    b = Builder(name, B)
    # the star: 5 outer points and 5 inner ones (front view), a front and a back face, thicker inside than at the tips
    cy = 600
    outer = [(0, 828), (399, 640), (232, 352), (-232, 352), (-399, 640)]
    inner = [(190, 742), (238, 472), (0, 380), (-238, 472), (-190, 742)]
    ring_ = []
    for k in range(5):
        ring_ += [(outer[k], 55), (inner[k], 170)]
    V, F = [], []
    for (x, y), t in ring_:
        V.append((x * u, y * u, t * u)); V.append((x * u, y * u, -t * u))
    n = len(ring_)
    V.append((0, cy * u, 228 * u)); V.append((0, cy * u, -228 * u))
    cf, cb = len(V) - 2, len(V) - 1
    for k in range(n):
        a, c = 2 * k, 2 * ((k + 1) % n)
        F.append([cf, a, c]); F.append([cb, c + 1, a + 1]); F.append([a, a + 1, c + 1, c])
    def w_star(p):
        k = smooth(cy * u - 0.1, cy * u + 0.05, p[1])
        return {'torso': 0.4 + 0.6 * k, 'hips': 0.6 - 0.6 * k}
    b.P('star', coat, w_star, 25).add(V, F)
    # the crest at the top point, the face
    tube(b.P('crest', L.get('hair', '#ef7b53'), 'torso', 30), (0, 790 * u, 0), (0, 870 * u, -20 * u), 70 * u, 4 * u, 6)
    fc = (0, 600 * u, 150 * u)
    sphere(b.P('face', skin, 'torso', 70), fc, 1.0, 12, 8, (171 * u, 145 * u, 95 * u))
    for sx in (1, -1):
        sphere(b.P('eye', L.get('eyes', '#2787a7'), 'torso', 60), (sx * 68 * u, 612 * u, 236 * u), 1.0, 8, 6, (58 * u, 40 * u, 14 * u))
        sphere(b.P('pupil', '#101820', 'torso', 60), (sx * 55 * u, 612 * u, 250 * u), 13 * u, 6, 4)
        tube(b.P('brow', L.get('brows', '#732717'), 'torso', 40), (sx * 20 * u, 652 * u, 236 * u), (sx * 112 * u, 682 * u, 222 * u), 14 * u, 10 * u, 5)
    tube(b.P('nose', '#af7b5b', 'torso', 50), (0, 580 * u, 240 * u), (0, 470 * u, 290 * u), 52 * u, 8 * u, 5)
    # arms from the shoulder points: a small ball at the tip, a thin arm straight down, a big ball hand
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        sphere(b.P('shBall' + s, coatD, 'sh' + s, 50), sh, 21 * u, 7, 5)
        tube(b.P('upper' + s, coat, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s: smooth(e + 0.05, e - 0.03, p[1])}, 50), sh, el, 14 * u, 13 * u, 6)
        tube(b.P('fore' + s, coat, 'el' + s, 50), el, hd, 13 * u, 12 * u, 6)
        sphere(b.P('hand' + s, '#c3936f', 'hand' + s, 60), hd, 57 * u, 9, 6)
    # legs: thigh, a ball knee, shin, a flat foot turned out
    for s, sx in (('L', 1), ('R', -1)):
        hp, kn, ft = bp('hip' + s), bp('knee' + s), bp('foot' + s)
        tube(b.P('thigh' + s, coat, lambda p, s=s, k=kn[1]: {'hip' + s: 1 - smooth(k + 0.05, k - 0.03, p[1]), 'knee' + s: smooth(k + 0.05, k - 0.03, p[1])}, 50), hp, kn, 30 * u, 26 * u, 7)
        sphere(b.P('knee' + s, coatD, 'knee' + s, 50), kn, 42 * u, 8, 6)
        tube(b.P('shin' + s, L.get('hair', '#ef7b53'), 'knee' + s, 50), kn, (ft[0], 60 * u, ft[2]), 24 * u, 20 * u, 6)
        f = b.P('foot' + s, L.get('shoes', '#1f4a27'), 'foot' + s, 30)
        tube(f, (ft[0] - sx * 40 * u, 18 * u, ft[2] - 20 * u), (ft[0] + sx * 90 * u, 14 * u, ft[2] + 60 * u), 34 * u, 12 * u, 6, squash=0.5)
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris)
    return name


def build_any(n):
    L = ALL[n]['look']
    if n == 'zoe':
        return build_zoe(n)
    if n == 'vesk':
        return build_vesk(n)
    race = L.get('race')
    if race == 'sphero':
        return build_sphero(n)
    if race == 'fclone':
        return build_fclone(n)
    if race == 'esmer':
        return build_esmer(n)
    if race == 'bee':
        return build_bee(n)
    if race == 'mole':
        return build_mole(n)
    if race == 'tri':
        return build_tri(n)
    if race == 'elf':
        return build_elf(n)
    return build(n)


bpy.ops.wm.read_factory_settings(use_empty=True)
# (Twinsen and Zoé have their own scripts: twinsen_poly.py, zoe_poly.py (SRC-1). build_zoe below is the earlier Zoé,
# kept as the rollback: it is built only when named, `cast_poly.py <skel> <out> zoe`)
names = [n for n in ALL if n != 'twinsen' and (n in ONLY if ONLY else n != 'zoe')]
built = [build_any(n) for n in names]
# (a build of only some characters goes to its own file, so it never replaces the whole cast's)
blend = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'characters', 'cast_poly.blend' if not ONLY else 'cast_poly_' + '_'.join(ONLY) + '.blend')
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend))
idx = os.path.join(OUTDIR, 'index.json')
have = sorted(set(json.load(open(idx)) if os.path.exists(idx) else []) | set(built) | {'twinsen'})
json.dump(have, open(idx, 'w'))
print('index', have)
