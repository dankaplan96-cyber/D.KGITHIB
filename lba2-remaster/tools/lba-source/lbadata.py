# Readers for the user's own LBA1 / LBA2 data files (study and measurement only).
#
# Nothing here contains or writes original data: the scripts in this folder read the user's files from a folder
# given on the command line and print numbers (sizes, sections, angles, timings) or write study renders to a
# folder the caller names (keep those outside the repository, see docs/lba3-team/SOURCE_INVENTORY.md).
#
# The layouts come from the GPL engine sources (read, not copied):
#   LBA2  github.com/2point21/lba2-classic @ a256b0c0  LIB386/SYSTEM/HQFILE.CPP + LZ.ASM (HQR), LIB386/H/AFF_OBJ.INC
#         (bodies), ANIM/ANIM.ASM (anims), SOURCES/FICHE.CPP SearchBody/SearchAnim + COMMON.H F_* (File3D, RESS entry 44),
#         SOURCES/DISKFUNC.CPP LoadScene (scenes, entry numscene + 1), SOURCES/DEFINES.H GEN_ANIM_* (anim names)
#   LBA1  github.com/2point21/lba1-classic @ f73f4573  LIB386/LIB_3D/P_OBJET.ASM (bodies), SOURCES/DISKFUNC.C (scenes),
#         SOURCES/FICHE.C (File3D)
# Conventions of both games: +Y up, +Z the model's front, +X the model's left; angles 4096 = 360°;
# LBA2 group rotation R = X(alpha)·Z(gamma)·Y(beta) (three.js order 'XZY'); Twinsen ≈ 1238–1240 units tall.
import hashlib
import math
import os
import struct

# ------------------------------------------------------------------ HQR (both games)


def _expand(src, size, minlen):
    out = bytearray()
    i = 0
    while len(out) < size:
        flags = src[i]
        i += 1
        for _ in range(8):
            if len(out) >= size:
                break
            if flags & 1:
                out.append(src[i])
                i += 1
            else:
                w = src[i] | (src[i + 1] << 8)
                i += 2
                off, n = (w >> 4) + 1, (w & 15) + minlen
                for _ in range(n):
                    out.append(out[-off])
            flags >>= 1
    return bytes(out[:size])


_HQR = {}


def hqr(path):
    """All entries of an .HQR file (None for an empty slot); read once per path."""
    key = os.path.abspath(path)
    if key not in _HQR:
        _HQR[key] = _hqr(path)
    return _HQR[key]


def _hqr(path):
    d = open(path, 'rb').read()
    n = struct.unpack_from('<I', d, 0)[0] // 4
    out = []
    for o in struct.unpack_from('<%dI' % n, d, 0):
        if o == 0 or o + 10 > len(d):
            out.append(None)
            continue
        size, csize, meth = struct.unpack_from('<IIH', d, o)
        raw = d[o + 10:o + 10 + csize]
        out.append(raw[:size] if meth == 0 else _expand(raw, size, meth + 1) if meth in (1, 2) else None)
    return out


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blk in iter(lambda: f.read(1 << 20), b''):
            h.update(blk)
    return h.hexdigest()


# ------------------------------------------------------------------ LBA2 bodies and anims

POLY_KIND = {0: 'solid', 1: 'flat', 2: 'transparent', 3: 'trame', 4: 'gouraud', 5: 'dither', 6: 'gouraud_table',
             7: 'dither_table'}


def body2(d):
    """An LBA2 body: groups (parent group, pivot point, point count, normal count), points local to their group's
    pivot, polygons (vertex indices, colour word, type word), spheres (type, colour, point, radius), lines."""
    H = struct.unpack_from('<iHH6i16i', d, 0)
    nG, oG, nP, oP = H[9], H[10], H[11], H[12]
    nPoly, oPoly, nLin, oLin, nSph, oSph, nTex = H[17], H[18], H[19], H[20], H[21], H[22], H[23]
    groups = [struct.unpack_from('<4H', d, oG + i * 8) for i in range(nG)]
    pts = [struct.unpack_from('<3hH', d, oP + i * 8) for i in range(nP)]
    polys, o = [], oPoly
    for _ in range(64):
        if o >= len(d) - 8 or len(polys) >= nPoly:
            break
        typ, cnt, nxt = struct.unpack_from('<HHI', d, o)
        if cnt == 0 or nxt == 0:
            break
        rec = (nxt - 8) // cnt
        quad = bool(typ & 0x8000)
        for i in range(cnt):
            b = o + 8 + i * rec
            idx = struct.unpack_from('<4H', d, b)
            col = struct.unpack_from('<H', d, b + 8)[0] if rec >= 10 else 0
            polys.append((idx if quad else idx[:3], col, typ))
        o += nxt
    return dict(info=H[0], zv=H[3:9], groups=groups, pts=pts, polys=polys, textures=nTex,
                spheres=[struct.unpack_from('<4H', d, oSph + i * 8) for i in range(nSph)],
                lines=[struct.unpack_from('<4H', d, oLin + i * 8) for i in range(nLin)])


def anim2(d):
    """An LBA2 anim: frames of (time to reach it in ms, root step x/y/z, per group (type 0 rotate / 1 translate,
    alpha, beta, gamma))."""
    nF, nG, loop = struct.unpack_from('<3H', d, 0)
    frames = []
    for f in range(nF):
        b = 8 + f * (8 + nG * 8)
        t, sx, sy, sz = struct.unpack_from('<H3h', d, b)
        frames.append(dict(t=t, step=(sx, sy, sz), g=[struct.unpack_from('<4h', d, b + 8 + g * 8) for g in range(nG)]))
    return dict(nF=nF, nG=nG, loop=loop, frames=frames)


A = 2 * math.pi / 4096


def _rx(a):
    c, s = math.cos(a), math.sin(a)
    return [[1, 0, 0], [0, c, -s], [0, s, c]]


def _ry(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]]


def _rz(a):
    c, s = math.cos(a), math.sin(a)
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]]


def _mm(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def _mv(m, v):
    return [sum(m[i][k] * v[k] for k in range(3)) for i in range(3)]


def owners(B):
    out = []
    for gi, g in enumerate(B['groups']):
        out += [gi] * g[2]
    return out


def pose2(B, frame=None):
    """World positions of the points (rest pose, or one frame: a list of (type, a, b, g) per group) and each
    group's rotation matrix."""
    G, P = B['groups'], B['pts']
    mats, world, start = [], [None] * len(P), 0
    I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
    for gi, (og, op, n, _) in enumerate(G):
        if gi == 0:
            M, T = I, [0, 0, 0]
        else:
            T = world[op]
            ty, a, b, g = frame[gi] if frame and gi < len(frame) else (0, 0, 0, 0)
            if ty == 1:
                M, T = mats[og], [T[0] + a, T[1] + b, T[2] + g]
            else:
                M = _mm(mats[og], _mm(_rx(a * A), _mm(_rz(g * A), _ry(b * A))))
        mats.append(M)
        for i in range(start, start + n):
            v = _mv(M, P[i][:3])
            world[i] = [v[0] + T[0], v[1] + T[1], v[2] + T[2]]
        start += n
    return world, mats


def frame_at(a, t, loops=4):
    """The pose of an anim t ms after its start, linear between keys like the engine (the loop restarts at
    a['loop']); also the root height offset of the first group if it translates."""
    F, n = a['frames'], len(a['frames'])
    seq = list(range(n)) + list(range(a['loop'], n)) * loops
    cur, prev = 0, seq[0]
    for k in seq[1:]:
        d = F[k]['t']
        if t <= cur + d:
            u = (t - cur) / d if d else 1
            out = []
            for g in range(a['nG']):
                P, Q = F[prev]['g'][g], F[k]['g'][g]
                if P[0] == 1:
                    out.append((1, P[1] + (Q[1] - P[1]) * u, P[2] + (Q[2] - P[2]) * u, P[3] + (Q[3] - P[3]) * u))
                else:
                    la = lambda x, y: x + (((y - x + 2048) % 4096) - 2048) * u
                    out.append((0, la(P[1], Q[1]), la(P[2], Q[2]), la(P[3], Q[3])))
            return out
        cur += d
        prev = k
    return F[-1]['g']


def anim_length(a):
    """(time of the whole clip, time of one loop) in ms."""
    T = sum(f['t'] for f in a['frames'][1:])
    L = sum(f['t'] for f in a['frames'][a['loop'] + 1:]) + a['frames'][a['loop']]['t']   # (back to the loop key)
    return T, L


# ------------------------------------------------------------------ LBA2 File3D (RESS.HQR entry 44) and scenes

GEN_ANIM = ['RIEN', 'MARCHE', 'RECULE', 'GAUCHE', 'DROITE', 'ENCAISSE', 'CHOC', 'TOMBE', 'RECEPTION', 'RECEPTION_2',
            'MORT', 'ACTION', 'MONTE', 'ECHELLE', 'SAUTE', 'LANCE', 'CACHE', 'COUP_1', 'COUP_2', 'COUP_3', 'TROUVE',
            'NOYADE', 'CHOC2', 'SABRE', 'DEGAINE', 'SAUTE_GAUCHE', 'SAUTE_DROIT', 'POUSSE', 'PARLE', 'DART',
            'DESCEND', 'ECHDESC', 'ARRIMAGE', 'SKATE', 'SKATEG', 'SARBACANE', 'GANT_DROIT', 'GANT_GAUCHE',
            'PISTOLASER', 'FOUDRE', 'ESQUIVE_DROITE', 'ESQUIVE_GAUCHE', 'ESQUIVE_AVANT', 'ESQUIVE_ARRIERE', 'FEU',
            'SARBATRON', 'GAZ', 'LABYRINTHE']
# (English: idle, walk, walk back, turn left, turn right, hit, hit hard, fall, land, land hard, die, action, climb,
#  ladder, jump, throw, hide, punch 1-3, find, drown, hit 2, sword, draw, jump left, jump right, push, talk, ...)
GEN_ANIM_EN = {0: 'idle', 1: 'walk', 2: 'walk back', 3: 'turn left', 4: 'turn right', 5: 'hit', 6: 'hit hard',
               7: 'fall', 8: 'land', 9: 'land hard', 10: 'die', 11: 'action', 12: 'climb', 14: 'jump', 15: 'throw',
               20: 'find', 27: 'push', 28: 'talk'}


def file3d_table(ress):
    """RESS.HQR entry 44 as a list of File3D records: {'bodies': {gen: (BODY.HQR index, zv or None)},
    'anims': {gen: ANIM.HQR index}}."""
    d = ress[44]
    first = struct.unpack_from('<I', d, 0)[0]
    offs = list(struct.unpack_from('<%dI' % (first // 4), d, 0)) + [len(d)]
    out = []
    for i in range(len(offs) - 1):
        p, end = offs[i], offs[i + 1]
        rec = {'bodies': {}, 'anims': {}}
        while p < end and d[p] != 255:
            cmd = d[p]
            p += 1
            if cmd == 3:   # F_ANIM: u16 gen, u8 size (from itself), s16 anim, u8 has-actions ...
                gen = struct.unpack_from('<H', d, p)[0]
                p += 2
                rec['anims'][gen] = struct.unpack_from('<h', d, p + 1)[0]
                p += d[p]
            elif cmd == 1:  # F_BODY: u8 gen, u8 size, s16 body, u8 has-actions, [F_ZV, 6 x s16]
                gen = d[p]
                p += 1
                b = struct.unpack_from('<h', d, p + 1)[0]
                zv = struct.unpack_from('<6h', d, p + 5) if d[p] >= 16 and d[p + 3] and d[p + 4] == 14 else None
                rec['bodies'][gen] = (b, zv)
                p += d[p]
            else:
                p += 1
                p += d[p]
        out.append(rec)
    return out


def scene2(scenes, num):
    """Scene `num` of an LBA2 SCENE.HQR (entry num + 1): island, cube, hero start, objects with their File3D,
    generic body, position, talk colour."""
    d = scenes[num + 1]
    o = 0

    def rd(fmt):
        nonlocal o
        v = struct.unpack_from('<' + fmt, d, o)
        o += struct.calcsize('<' + fmt)
        return v if len(v) > 1 else v[0]
    S = {'island': rd('b'), 'cube': (rd('b'), rd('b'))}
    rd('bbbb')                     # shadow level, labyrinth, cube mode, (unused)
    rd('hh')                       # light alpha, beta
    rd('20h')                      # 4 ambient samples x 5
    rd('hhb')                      # second min / ecart, jingle
    S['start'] = rd('3h')
    t = rd('h')                    # hero track
    o += t
    t = rd('h')                    # hero life
    o += t
    n = rd('h')
    objs = []
    for i in range(1, n):
        flags = rd('I')
        f3d = rd('h')
        gb, ga, spr = rd('b'), rd('h'), rd('h')
        x, y, z = rd('3h')
        rd('b')                    # hit force
        rd('h')                    # option flags
        beta = rd('h')
        rd('h')                    # rotation speed
        rd('b')                    # move
        rd('4h')                   # info 0..3
        rd('h')                    # bonus count
        col = rd('b')              # talk colour
        if flags & (1 << 18):
            rd('Ih')
        rd('bb')                   # armour, life
        t = rd('h')
        o += t
        life = rd('h')
        lo = o
        o += life
        objs.append(dict(num=i, flags=flags, sprite=bool(flags & (1 << 10)), f3d=f3d, gen_body=gb, gen_anim=ga,
                         pos=(x, y, z), beta=beta, talk_colour=col, life=d[lo:lo + life]))
    S['objs'] = objs
    return S


# ------------------------------------------------------------------ LBA1 bodies, File3D, scenes

def body1(d):
    """An LBA1 body (P_OBJET.ASM): points already summed down the groups to the rest pose."""
    info = struct.unpack_from('<h', d, 0)[0]
    bbox = struct.unpack_from('<6h', d, 2)
    o = 16 + struct.unpack_from('<H', d, 14)[0]
    n = struct.unpack_from('<H', d, o)[0]
    o += 2
    pts = [struct.unpack_from('<3h', d, o + k * 6) for k in range(n)]
    o += 6 * n
    groups = []
    if info & 2:
        ng = struct.unpack_from('<H', d, o)[0]
        o += 2
        for k in range(ng):
            g = struct.unpack_from('<9h', d, o + k * 38)
            groups.append({'start': g[0] // 6, 'n': g[1], 'org': g[2] // 6, 'parent': g[3] // 38 if g[3] != -1 else -1})
        o += 38 * ng
    nn = struct.unpack_from('<H', d, o)[0]
    o += 2 + 8 * nn
    np_ = struct.unpack_from('<H', d, o)[0]
    o += 2
    polys = []
    for _ in range(np_):
        typ, nv = d[o], d[o + 1]
        c = struct.unpack_from('<H', d, o + 2)[0]
        o += 4
        idx = []
        if typ >= 9:
            for _ in range(nv):
                idx.append(struct.unpack_from('<H', d, o + 2)[0] // 6)
                o += 4
        else:
            if typ >= 7:
                o += 2
            for _ in range(nv):
                idx.append(struct.unpack_from('<H', d, o)[0] // 6)
                o += 2
        polys.append((idx, c, typ))
    nl = struct.unpack_from('<H', d, o)[0]
    o += 2
    lines = []
    for _ in range(nl):
        c, p1, p2 = struct.unpack_from('<IHH', d, o)
        lines.append((p1 // 6, p2 // 6, c))
        o += 8
    ns = struct.unpack_from('<H', d, o)[0]
    o += 2
    spheres = []
    for _ in range(ns):
        c, r, p = struct.unpack_from('<IHH', d, o)
        spheres.append((p // 6, r, c))
        o += 8
    W = list(pts)
    if groups:
        W = [None] * len(pts)
        for g in groups:
            base = (0, 0, 0) if g['parent'] == -1 else W[g['org']]
            for k in range(g['start'], g['start'] + g['n']):
                W[k] = tuple(pts[k][j] + base[j] for j in range(3))
        W = [w or (0, 0, 0) for w in W]
    return {'info': info, 'bbox': bbox, 'pts': W, 'groups': groups, 'polys': polys, 'lines': lines,
            'spheres': spheres, 'parsed_to_end': len(d) - o in (0, 2)}   # (each entry ends with one more word)


def file3d1(f3d, idx):
    """LBA1 File3D record: {'bodies': {gen: body}, 'anims': {gen: anim}}."""
    d, p, rec = f3d[idx], 0, {'bodies': {}, 'anims': {}}
    while d and p < len(d) and d[p] != 255:
        cmd = d[p]
        g = d[p + 1]
        p += 2
        if cmd == 1:
            rec['bodies'][g] = struct.unpack_from('<H', d, p + 1)[0] & 0x7FFF
        elif cmd == 3:
            rec['anims'][g] = struct.unpack_from('<H', d, p + 1)[0]
        p += d[p]
    return rec


def scene1(scenes, f3d, num):
    d = scenes[num]
    p = 2 + 4 + 4 + 12 * 2 + 4 + 1
    hero = struct.unpack_from('<3h', d, p)
    p += 6
    for _ in range(2):
        p += 2 + struct.unpack_from('<H', d, p)[0]
    nobj = struct.unpack_from('<H', d, p)[0]
    p += 2
    actors = []
    for k in range(1, nobj):
        flags, fi = struct.unpack_from('<HH', d, p)
        p += 4
        gb = d[p]
        p += 2
        spr, x, y, z = struct.unpack_from('<Hhhh', d, p)
        p += 8
        p += 1 + 2 + 2 * 7 + 4
        p += 2 + struct.unpack_from('<H', d, p)[0]
        p += 2 + struct.unpack_from('<H', d, p)[0]
        sprite = bool(flags & 0x400)
        actors.append({'num': k, 'f3d': None if sprite else fi, 'body': None if sprite else file3d1(f3d, fi)['bodies'].get(gb),
                       'pos': (x, y, z)})
    return {'island': d[0], 'hero': hero, 'actors': actors}


def find_files(folder, names):
    """{NAME: path} for the names found in folder (any case)."""
    have = {f.upper(): os.path.join(folder, f) for f in os.listdir(folder)} if folder and os.path.isdir(folder) else {}
    return {n: have.get(n.upper()) for n in names}
