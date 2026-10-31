#!/usr/bin/env python3
# Zeelich's island layouts from the user's own LBA2 files, as numbers only (assets/lba2/islands/*.json).
#
#   python3 -I tools/lba2-islands.py <folder with the original *.ILE files> <out folder> [NAME ...]
#
# What is written: the ground heights (cm, every 2nd point of the original's 65x65 section grids, ≈ 1.71 m apart)
# and, for each of the island's objects, its place and the size of its bounding box with a size class
# ([x, z, bottom y, size x, size y, size z, turn 0..4095, kind, body] in metres, island-centred). No graphics,
# textures, meshes or text leave the original files; the game draws its own pieces (src/game/zislands.js).
#
# Which file is which (identified from the numbers, ZL-ALL; SCENE.HQR's scenes name an island number and a start
# point, and the start points and objects fit one file's ground or decks only):
#   island 0  CITADEL   Citadel Island (Twinsun)            island 1  CITABAU  Citadel again: same ground, 352
#             objects instead of 270 (another state of Citadel; no scene starts on it — loaded by the game's code)
#   island 2  DESERT    Desert Island (Twinsun)             island 3  EMERAUDE the Emerald Moon (4 sections)
#   island 12 MOON      the Emerald Moon again (0.17 % of the ground and nine gate posts differ): not used
#   island 4  OTRINGAL  · 5 CELEBRAT Celebration Island · 6 PLATFORM · 7 MOSQUIBE · 8 KNARTAS · 9 ILOTCX the CX islet
#   island 10 ASCENCE   Zeelich: a cargo lift dock on stilts at the cloud line (one section; ground only 8 % of it,
#             0.1 m up; decks at 4.1–6.7 m, an 11 m lift tower, a crane, stacked crates, a 14.6 m hull alongside).
#             Its only scene (121) is numbered among the Platform's (117–127).
#   island 11 SOUSCELB  Under Celebration
#   island 13 CELEBRA2  Celebration Island later: the same section with a round pit (up to 3.9 m deeper, ≈ 22 m
#             across) and a 21 m figure risen from it (four parts, 8.7–10.4 m wide). The game keeps CELEBRAT's
#             ground (the pit leaves only a narrow rim to walk on) and adds CELEBRA2's new objects as "risen":
#             twelve years on the figure still stands, the pit round its feet filled and paved for the festival.
# The Emerald Moon (EMERAUDE, MOON) is not wanted (the user); Citadel and Desert are built by our own code.
#
# Desert Island (WORLD-SHAPE): `python3 -I tools/lba2-islands.py <ILE folder> --desert src/game/desert-layout.js` writes
# the original DESERT ground as numbers only: every 2nd point of its height grid (≈ 1.71 m apart), each height
# rounded to 0.05 m and packed one byte per point (base64). desert.js turns it into its own frame, uses it for the
# coast and the high ground, and keeps its own dunes, flats and places on top.
import sys, os, json, struct, base64

K = 2.07 / 1238          # metres per LBA unit (Twinsen 2.07 m)
SEC = 32768              # a section's size in LBA units
NAMES = {'OTRINGAL': 'otringal', 'KNARTAS': 'knartas', 'MOSQUIBE': 'mosquibee', 'CELEBRAT': 'celebration',
         'SOUSCELB': 'undergas', 'ILOTCX': 'cxislet', 'PLATFORM': 'platform', 'ASCENCE': 'liftdock'}


def expand(src, size, minlen):   # the HQR's LZ (GPL engine source: LIB386/SYSTEM/LZ.ASM)
    out = bytearray(); i = 0
    while len(out) < size:
        flags = src[i]; i += 1
        for _ in range(8):
            if len(out) >= size: break
            if flags & 1: out.append(src[i]); i += 1
            else:
                w = src[i] | (src[i + 1] << 8); i += 2
                off = (w >> 4) + 1; n = (w & 15) + minlen
                for _ in range(n): out.append(out[-off])
            flags >>= 1
    return bytes(out[:size])


def entries(path):
    d = open(path, 'rb').read()
    n = struct.unpack_from('<I', d, 0)[0] // 4
    out = []
    for o in struct.unpack_from('<%dI' % n, d, 0):
        if o == 0 or o + 10 > len(d): out.append(None); continue
        size, csize, meth = struct.unpack_from('<IIH', d, o)
        raw = d[o + 10:o + 10 + csize]
        out.append(raw[:size] if meth == 0 else expand(raw, size, meth + 1) if meth in (1, 2) else None)
    return out


def island(path):   # {(section x, section z): {Y: 65*65 heights, decs: [12 ints]}}
    E = entries(path); idm = E[0]; cubes = {}
    for y in range(16):
        for x in range(16):
            i = idm[y * 16 + x] & 127
            if not i: continue
            b = 3 + 6 * (i - 1)
            inf = struct.unpack_from('<10i', E[b], 0)
            Y = struct.unpack_from('<%dh' % (65 * 65), E[b + 4], 0)
            dob = E[b + 1] or b''
            decs = [struct.unpack_from('<12i', dob, k * 48) for k in range(inf[2])] if inf[2] and len(dob) >= 48 * inf[2] else []
            cubes[(x, y)] = dict(Y=Y, decs=decs)
    return cubes


def convert(src, name, out_dir, later=None):
    C = island(src)
    xs = [k[0] for k in C]; zs = [k[1] for k in C]
    x0, z0, x1, z1 = min(xs), min(zs), max(xs), max(zs)
    nsx, nsz = x1 - x0 + 1, z1 - z0 + 1
    STEP = 2
    nx, nz = nsx * 64 // STEP + 1, nsz * 64 // STEP + 1
    H = [[-600] * nx for _ in range(nz)]
    for (cx, cz), c in C.items():
        for j in range(0, 65, STEP):
            for i in range(0, 65, STEP):
                gi = ((cx - x0) * 64 + i) // STEP; gj = ((cz - z0) * 64 + j) // STEP
                if gi < nx and gj < nz: H[gj][gi] = round(c['Y'][j * 65 + i] * K * 100)
    cell = SEC * K / 64 * STEP
    w, d = nsx * SEC * K, nsz * SEC * K
    decor = objects(C, x0, z0, w, d)
    hs = [v for row in H for v in row if v > 0]
    out = dict(name=name, size=[round(w, 1), round(d, 1)], cell=round(cell, 4), nx=nx, nz=nz, maxH=max(hs) / 100 if hs else 0,
               heights=[v for row in H for v in row], decor=decor,
               note='Layout numbers measured from the original LBA2 island (heights in cm, decor: [x, z, bottom y, size x, size y, size z, turn 0..4095, kind, body] in m, island-centred); no original graphics.')
    if later:   # the objects only the island's later state has (same frame)
        L2 = island(later)
        have = {tuple(o[:6]) for o in decor}   # (the later file numbers its bodies anew: compare places and sizes)
        out['risen'] = [o for o in objects(L2, x0, z0, w, d) if tuple(o[:6]) not in have]
        out['note'] += ' risen: the objects of its later state (' + os.path.basename(later) + ') that the first lacks.'
    p = os.path.join(out_dir, name + '.json')
    with open(p, 'w') as f: json.dump(out, f, separators=(',', ':'))
    print(name, 'from', os.path.basename(src), 'grid', nx, 'x', nz, 'size m', out['size'], 'maxH', out['maxH'], 'decor', len(decor), 'risen', len(out.get('risen', [])), 'bytes', os.path.getsize(p))


def objects(C, x0, z0, w, d):
    decor = []
    for (cx, cz), c in C.items():
        for dd in c['decs']:
            body, x, y, z, code, beta, xm, ym, zm, xM, yM, zM = dd
            sx, sy, sz = (xM - xm) * K, (yM - ym) * K, (zM - zm) * K
            if max(sx, sz) > 4.2: kind = 'building'
            elif sy > 2.2 * max(sx, sz, 0.3) and sy > 2.5: kind = 'tall'
            elif max(sx, sy, sz) < 0.9: kind = 'small'
            else: kind = 'prop'
            fx = ((cx - x0) * SEC + (xm + xM) / 2) * K - w / 2; fz = ((cz - z0) * SEC + (zm + zM) / 2) * K - d / 2
            decor.append([round(fx, 2), round(fz, 2), round(ym * K, 2), round(sx, 2), round(sy, 2), round(sz, 2), beta & 4095, kind, body & 0xFFFF])
    return decor


LATER = {'CELEBRAT': 'CELEBRA2'}   # an island's later state, whose new objects are kept as "risen"

def desert_js(src, out):
    C = island(src)
    xs = [k[0] for k in C]; zs = [k[1] for k in C]
    x0, z0, nsx, nsz = min(xs), min(zs), max(xs) - min(xs) + 1, max(zs) - min(zs) + 1
    STEP = 2
    nx, nz = nsx * 64 // STEP + 1, nsz * 64 // STEP + 1
    q = bytearray(nx * nz)
    for (cx, cz), c in C.items():
        for j in range(0, 65, STEP):
            for i in range(0, 65, STEP):
                gi = ((cx - x0) * 64 + i) // STEP; gj = ((cz - z0) * 64 + j) // STEP
                q[gj * nx + gi] = max(0, min(255, round(c['Y'][j * 65 + i] * K / 0.05)))
    w, d = nsx * SEC * K, nsz * SEC * K
    with open(out, 'w') as f:
        f.write('// Desert Island\'s ground after the original LBA2 island (DESERT), as numbers only: written by\n'
                '// tools/lba2-islands.py --desert from the user\'s own files. Every 2nd point of the original height grid\n'
                '// (CELL m apart, NX x NZ points, x east, z south, centred on the grid), each height in 0.05 m steps, one byte\n'
                '// per point, base64. 0 is the sea. desert.js turns it into its own frame (see DESERT_FIT there).\n')
        f.write('export const CELL = %.4f, NX = %d, NZ = %d, W = %.2f, D = %.2f, UNIT = 0.05;\n' % (SEC * K / 64 * STEP, nx, nz, w, d))
        f.write("export const HEIGHTS = '%s';\n" % base64.b64encode(bytes(q)).decode())
    print('desert layout', nx, 'x', nz, 'size m', round(w, 1), round(d, 1), 'bytes', os.path.getsize(out))


# ------------------------------------------------------------------ WORLD-80: reference layouts for tools/worldscore.mjs
# `python3 -I tools/lba2-islands.py <LBA2 folder> --ref tools/worldscore/ref` writes citadel.json and desert.json in the
# format of the Zeelich files above (heights every 2nd point, objects) plus the island's exterior doors from SCENE.HQR:
# doors: [x, z, y, to scene, from scene] in metres, island-centred. Numbers only.
# `python3 -I tools/lba2-islands.py <LBA1 folder> --hamalayi tools/worldscore/ref/hamalayi-lba1.json` writes, for
# LBA1's Hamalayi exterior scenes, each scene's walkable top (cell count, area, height of each walkable cell in
# 0.43 m layers): numbers only, no bricks or graphics.
ISLAND_NO = {'CITADEL': 0, 'DESERT': 2}


def scene_doors(scene_path, island_no, x0, z0, w, d):
    E = entries(scene_path); out = []; seen = set()
    for num in range(len(E) - 1):
        s = E[num + 1]
        if not s or len(s) < 64 or s[0] != island_no: continue
        cube = (s[1], s[2])
        if cube == (0, 0): continue          # an interior of the island
        o = 0

        def rd(fmt):
            nonlocal o
            v = struct.unpack_from('<' + fmt, s, o); o += struct.calcsize('<' + fmt)
            return v if len(v) > 1 else v[0]
        try:
            rd('3b'); rd('4b'); rd('2h'); rd('20h'); rd('2hb'); rd('3h')
            t = rd('h'); o += t; t = rd('h'); o += t   # (the hero's track and life scripts)
            n = rd('h')
            for _ in range(1, n):            # the scene's objects (lba-source/lbadata.py scene2)
                flags = rd('I'); rd('h'); rd('b'); rd('h'); rd('h'); rd('3h'); rd('b'); rd('h'); rd('h'); rd('h'); rd('b'); rd('4h'); rd('h'); rd('b')
                if flags & (1 << 18): rd('Ih')
                rd('2b'); t = rd('h'); o += t; t = rd('h'); o += t
            o += 4
            nz = rd('h')
            for _ in range(nz):              # zones: box (6 × s32), info0..7, type, num
                v = struct.unpack_from('<14i2h', s, o); o += 60
                box, typ, to = v[0:6], v[14], v[15]
                if typ != 0 or box[3] - box[0] > 4000 or box[5] - box[2] > 4000: continue   # (section-edge strips)
                cx = ((cube[0] - x0) * SEC + (box[0] + box[3]) / 2) * K - w / 2
                cz = ((cube[1] - z0) * SEC + (box[2] + box[5]) / 2) * K - d / 2
                key = (to, round(cx), round(cz))
                if key in seen: continue
                seen.add(key); out.append([round(cx, 2), round(cz, 2), round(box[1] * K, 2), to, num])
        except struct.error:
            continue
    return out


def ref(src_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for src, name in (('CITADEL', 'citadel'), ('DESERT', 'desert')):
        convert(os.path.join(src_dir, src + '.ILE'), name, out_dir)
        p = os.path.join(out_dir, name + '.json'); L = json.load(open(p))
        C = island(os.path.join(src_dir, src + '.ILE'))
        xs = [k[0] for k in C]; zs = [k[1] for k in C]
        L['doors'] = scene_doors(os.path.join(src_dir, 'SCENE.HQR'), ISLAND_NO[src], min(xs), min(zs), L['size'][0], L['size'][1])
        L['note'] += ' doors: the exterior door zones of its scenes [x, z, y, to scene, from scene].'
        with open(p, 'w') as f: json.dump(L, f, separators=(',', ':'))
        print(name, 'doors', len(L['doors']), 'bytes', os.path.getsize(p))


HAMALAYI_SCENES = [9, 62, 63, 65, 69, 71, 72, 82]   # LBA1 island 5's exterior scenes (WORLD-SHAPE audit)


def hamalayi(src_dir, out):
    GRI, BLL = entries(os.path.join(src_dir, 'LBA_GRI.HQR')), entries(os.path.join(src_dir, 'LBA_BLL.HQR'))
    SC = entries(os.path.join(src_dir, 'SCENE.HQR'))

    def blocks(i):
        b = BLL[i]; n = struct.unpack_from('<I', b, 0)[0] // 4; res = []
        for k in range(n):
            o = struct.unpack_from('<I', b, k * 4)[0]
            dx, dy, dz = b[o], b[o + 1], b[o + 2]
            res.append([struct.unpack_from('<BBH', b, o + 3 + j * 4) for j in range(dx * dy * dz)])
        return res
    scenes = []
    for num in HAMALAYI_SCENES:
        g = GRI[num]; B = blocks(num); top = {}
        for z in range(64):
            for x in range(64):
                p = struct.unpack_from('<H', g, (x + z * 64) * 2)[0]; n = g[p]; p += 1; y = 0; solid = []
                for _ in range(n):           # a column's runs (GPL source: GRILLE_A.ASM DecompColonne)
                    op = g[p]; p += 1; cnt = (op & 0x3F) + 1
                    if not (op & 0xC0): y += cnt; continue
                    if op & 0x40:
                        for _ in range(cnt):
                            blk, pos = g[p], g[p + 1]; p += 2
                            if blk and blk - 1 < len(B) and pos < len(B[blk - 1]) and B[blk - 1][pos][0]: solid.append(y)
                            y += 1
                    else:
                        blk, pos = g[p], g[p + 1]; p += 2
                        for _ in range(cnt):
                            if blk and blk - 1 < len(B) and pos < len(B[blk - 1]) and B[blk - 1][pos][0]: solid.append(y)
                            y += 1
                if solid: top[(x, z)] = max(solid) + 1   # the walkable top of the column, in layers
        layers = sorted(top.values())
        scenes.append(dict(scene=num, island=SC[num][0] if SC[num] else None, cells=len(top), area=round(len(top) * (512 * K) ** 2),
                           layers=[layers.count(v) for v in range(26)]))
    res = dict(cell=round(512 * K, 4), layer=round(256 * K, 4), scenes=scenes,
               note='LBA1 Hamalayi exterior scenes (64 x 64 cells each): the walkable top of each column, counted per height layer. Numbers only.')
    with open(out, 'w') as f: json.dump(res, f, separators=(',', ':'))
    print('hamalayi scenes', [(s['scene'], s['island'], s['area']) for s in scenes])


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[2] == '--ref':
        ref(sys.argv[1], sys.argv[3]); sys.exit()
    if len(sys.argv) >= 4 and sys.argv[2] == '--hamalayi':
        hamalayi(sys.argv[1], sys.argv[3]); sys.exit()
    if len(sys.argv) >= 4 and sys.argv[2] == '--desert':
        desert_js(os.path.join(sys.argv[1], 'DESERT.ILE'), sys.argv[3]); sys.exit()
    if len(sys.argv) < 3: sys.exit(__doc__ or 'usage: lba2-islands.py <ILE folder> <out folder> [NAME ...]')
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for src, name in NAMES.items():
        if len(sys.argv) > 3 and src not in sys.argv[3:]: continue
        later = os.path.join(src_dir, LATER[src] + '.ILE') if src in LATER else None
        convert(os.path.join(src_dir, src + '.ILE'), name, out_dir, later if later and os.path.exists(later) else None)
