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
from lbapoly import Builder, box, disc, loft, lerp, ring, smooth, sphere, strip, tube  # noqa: E402

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


bpy.ops.wm.read_factory_settings(use_empty=True)
names = [n for n in ALL if n != 'twinsen' and (not ONLY or n in ONLY)]
built = [build_zoe(n) if ALL[n]['look'].get('outfit') == 'gown' and n == 'zoe' else build(n) for n in names]
blend = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'characters', 'cast_poly.blend')
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(blend))
idx = os.path.join(OUTDIR, 'index.json')
have = sorted(set(json.load(open(idx)) if os.path.exists(idx) else []) | set(built) | {'twinsen'})
json.dump(have, open(idx, 'w'))
print('index', have)
