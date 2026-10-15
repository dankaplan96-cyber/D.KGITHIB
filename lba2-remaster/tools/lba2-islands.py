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
import sys, os, json, struct

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

if __name__ == '__main__':
    if len(sys.argv) < 3: sys.exit(__doc__ or 'usage: lba2-islands.py <ILE folder> <out folder> [NAME ...]')
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for src, name in NAMES.items():
        if len(sys.argv) > 3 and src not in sys.argv[3:]: continue
        later = os.path.join(src_dir, LATER[src] + '.ILE') if src in LATER else None
        convert(os.path.join(src_dir, src + '.ILE'), name, out_dir, later if later and os.path.exists(later) else None)
