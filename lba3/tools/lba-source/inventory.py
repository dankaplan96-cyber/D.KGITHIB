#!/usr/bin/env python3
# Inventory of the character data in the user's own LBA1 / LBA2 files (docs/lba3-team/SOURCE_INVENTORY.md).
#
#   python3 -I tools/lba-source/inventory.py --lba2 <folder with BODY/ANIM/RESS/SCENE/TEXT.HQR>
#                                            [--lba1 <folder with BODY/ANIM/FILE3D/SCENE.HQR>] --out <file.json>
#
# Prints the file table (size, SHA-256, entries) and, per body, its structure and where the scenes use it:
# which File3D record (RESS.HQR entry 44 in LBA2, FILE3D.HQR in LBA1) holds it under which generic body number,
# with which generic animations (idle, walk, talk...), in which scene, at which talk colour, and — as an
# identification hint — the message ids its scene script shows (LBA2 life opcodes LM_MESSAGE 25 / LM_MESSAGE_ZOE 78,
# found by a byte scan, so a hint, not a parse). The JSON written to --out also carries the first words of those
# messages: it holds text from the user's files, so write it to the scratch space, not into the repository.
import argparse
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbadata as L  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--lba2', required=True)
ap.add_argument('--lba1')
ap.add_argument('--out', required=True)
a = ap.parse_args()

out = {'files': {}, 'lba2': {}, 'lba1': {}}


def files(folder, names, key):
    have = L.find_files(folder, names)
    for n, p in have.items():
        if p:
            e = L.hqr(p) if n.endswith('.HQR') else None
            out['files'][key + '/' + n] = {'size': os.path.getsize(p), 'sha256': L.sha256(p),
                                          'entries': len(e) if e else None, 'nonempty': sum(1 for x in e if x) if e else None}
        else:
            out['files'][key + '/' + n] = None
    return have


# ------------------------------------------------------------------ LBA2
f2 = files(a.lba2, ['BODY.HQR', 'ANIM.HQR', 'RESS.HQR', 'SCENE.HQR', 'TEXT.HQR', 'SCREEN.HQR', 'ANIM3DS.HQR', 'OBJFIX.HQR',
                    'SPRITES.HQR', 'SPRIRAW.HQR', 'LBA2.HQR', 'HOLOMAP.HQR', 'SAMPLES.HQR', 'LBA_BKG.HQR'], 'lba2')
BODY, ANIM = L.hqr(f2['BODY.HQR']), L.hqr(f2['ANIM.HQR'])
F3D = L.file3d_table(L.hqr(f2['RESS.HQR']))
SC = L.hqr(f2['SCENE.HQR'])
T = L.hqr(f2['TEXT.HQR']) if f2.get('TEXT.HQR') else []


def bank(i):
    ids, d = T[i], T[i + 1]
    if not ids or not d or len(d) < 2:
        return {}
    n = struct.unpack_from('<H', d, 0)[0] // 2
    offs = list(struct.unpack_from('<%dH' % n, d, 0)) + [len(d)]
    idl = struct.unpack_from('<%dH' % (len(ids) // 2), ids, 0)
    return {idl[k]: d[offs[k] + 1:offs[k + 1]].rstrip(b'\0').decode('latin1') for k in range(min(n, len(idl)))}


banks = {i: bank(i) for i in range(0, max(0, len(T) - 1), 2)}
use = {}
for s in range(len(SC) - 1):
    try:
        S = L.scene2(SC, s)
    except Exception:
        continue
    for o in S['objs']:
        if o['sprite'] or not (0 <= o['f3d'] < len(F3D)):
            continue
        rec = F3D[o['f3d']]
        b = rec['bodies'].get(o['gen_body'])
        if b is None:
            continue
        lf = o['life']
        msgs = [(lf[k], struct.unpack_from('<h', lf, k + 1)[0]) for k in range(len(lf) - 2) if lf[k] in (25, 78)]
        # the scene's language-0 bank: the even bank holding most of the ids (English first in this TEXT.HQR)
        bk = max((b_ for b_ in banks if b_ < len(banks) and any(i in banks[b_] for _, i in msgs)),
                 key=lambda b_: sum(1 for _, i in msgs if i in banks[b_]), default=None)
        lines = [{'op': op, 'id': i, 'text': banks[bk][i][:80]} for op, i in msgs if bk is not None and i in banks[bk]][:4]
        use.setdefault(b[0], []).append({'scene': s, 'island': S['island'], 'cube': S['cube'], 'obj': o['num'], 'f3d': o['f3d'],
                                         'gen_body': o['gen_body'], 'talk_colour': o['talk_colour'], 'bank': bk, 'lines': lines})
bodies = {}
for i, d in enumerate(BODY):
    if not d:
        continue
    try:
        B = L.body2(d)
        w, _ = L.pose2(B)
    except Exception as e:
        bodies[i] = {'error': str(e)}
        continue
    ys = [p[1] for p in w] or [0]
    kinds = {}
    for _, col, typ in B['polys']:
        k = L.POLY_KIND.get(typ & 0xFF, typ & 0xFF)
        kinds[k] = kinds.get(k, 0) + 1
    f3ds = [{'f3d': fi, 'gen': g, 'zv': zv, 'anims': {L.GEN_ANIM[ga] if ga < len(L.GEN_ANIM) else str(ga): ai for ga, ai in sorted(r['anims'].items())}}
            for fi, r in enumerate(F3D) for g, (bb, zv) in r['bodies'].items() if bb == i]
    bodies[i] = {'groups': len(B['groups']), 'points': len(B['pts']), 'polys': len(B['polys']), 'poly_kinds': kinds,
                 'spheres': len(B['spheres']), 'lines': len(B['lines']), 'textures': B['textures'],
                 'height': max(ys) - min(ys), 'zv': B['zv'], 'file3d': f3ds, 'scenes': use.get(i, [])}
anims = {}
for i, d in enumerate(ANIM):
    if not d or len(d) < 8:
        continue
    try:
        an = L.anim2(d)
        anims[i] = {'frames': an['nF'], 'groups': an['nG'], 'loop': an['loop'], 'ms': L.anim_length(an)}
    except Exception:
        pass
out['lba2'] = {'bodies': bodies, 'anims': anims, 'file3d_count': len(F3D), 'scene_count': len(SC) - 1}
print('LBA2: %d bodies, %d anims, %d File3D records, %d scenes' % (len(bodies), len(anims), len(F3D), len(SC) - 1))

# ------------------------------------------------------------------ LBA1
if a.lba1:
    f1 = files(a.lba1, ['BODY.HQR', 'ANIM.HQR', 'FILE3D.HQR', 'SCENE.HQR', 'RESS.HQR', 'LBA_GRI.HQR', 'LBA_BLL.HQR',
                        'LBA_BRK.HQR', 'SPRITES.HQR', 'INVOBJ.HQR', 'SAMPLES.HQR'], 'lba1')
    B1, F1, S1 = L.hqr(f1['BODY.HQR']), L.hqr(f1['FILE3D.HQR']), L.hqr(f1['SCENE.HQR'])
    use1 = {}
    for s in range(len(S1)):
        try:
            S = L.scene1(S1, F1, s)
        except Exception:
            continue
        for ac in S['actors']:
            if ac['body'] is not None:
                use1.setdefault(ac['body'], []).append({'scene': s, 'island': S['island'], 'actor': ac['num'], 'f3d': ac['f3d']})
    b1 = {}
    for i, d in enumerate(B1):
        if not d:
            continue
        try:
            B = L.body1(d)
        except Exception as e:
            b1[i] = {'error': str(e)}
            continue
        ys = [p[1] for p in B['pts']] or [0]
        b1[i] = {'groups': len(B['groups']), 'points': len(B['pts']), 'polys': len(B['polys']), 'spheres': len(B['spheres']),
                 'lines': len(B['lines']), 'height': max(ys) - min(ys), 'parsed_to_end': B['parsed_to_end'], 'scenes': use1.get(i, [])}
    out['lba1'] = {'bodies': b1, 'scene_count': len(S1)}
    print('LBA1: %d bodies, %d scenes' % (len(b1), len(S1)))

for k, v in out['files'].items():
    print('%-18s %s' % (k, 'MISSING' if v is None else '%9d B  sha256 %s  entries %s' % (v['size'], v['sha256'][:16], v['entries'])))
json.dump(out, open(a.out, 'w'), indent=1, default=list)
print('wrote', a.out)
