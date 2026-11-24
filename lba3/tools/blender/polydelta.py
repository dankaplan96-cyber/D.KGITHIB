# POLY-DELTA (P123): a variant of a poly model kept as a small delta against the shipped model, so the game can offer it
# behind a switch without a second 1.2 MB model in every build (characters.js applyPolyDelta; Twinsen's ?sleeve=old|hem).
#   python3 tools/blender/polydelta.py BASE.json VARIANT.json OUT.json
# The delta holds the runs of triangles where VARIANT differs from BASE (difflib on whole triangles: every corner's pos,
# nrm, col, si, sw), each as [first triangle in BASE, triangles of BASE removed, VARIANT's triangles put there]. The
# bones, eyes and mouths must be the same. After writing, the delta is applied to BASE here and the result compared with
# VARIANT number for number (it must be equal, or nothing is written).
import difflib, json, sys

PER = {'pos': 9, 'nrm': 9, 'col': 9, 'si': 12, 'sw': 12}


def tri_keys(m):
    n = len(m['pos']) // 9
    return [tuple(tuple(m[k][t * c:(t + 1) * c]) for k, c in PER.items()) for t in range(n)]


def make(base, var):
    for k in ('bones', 'eyes', 'mouths'):
        if base[k] != var[k]:
            raise SystemExit('the %s differ: a delta keeps only the skinned triangles' % k)
    sm = difflib.SequenceMatcher(None, tri_keys(base), tri_keys(var), autojunk=False)
    ops = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            continue
        ops.append([i1, i2 - i1, {k: var[k][j1 * c:j2 * c] for k, c in PER.items()}])
    return {'variantOf': None, 'tris': var['tris'], 'ops': ops}


def apply(base, d):
    out = dict(base)
    for k in PER:
        out[k] = list(base[k])
    for at, n, ins in sorted(d['ops'], key=lambda o: -o[0]):
        for k, c in PER.items():
            out[k][at * c:(at + n) * c] = ins[k]
    out['tris'] = d['tris']
    return out


if __name__ == '__main__':
    bp, vp, op = sys.argv[1:4]
    base, var = json.load(open(bp)), json.load(open(vp))
    d = make(base, var)
    d['variantOf'] = bp.replace('\\', '/').split('/')[-1][:-5]
    back = apply(base, d)
    bad = [k for k in list(PER) + ['tris'] if back[k] != var[k]]
    if bad:
        raise SystemExit('the delta does not rebuild the variant: ' + ', '.join(bad))
    json.dump(d, open(op, 'w'), separators=(',', ':'))
    print(op, 'ops', len(d['ops']), 'base tris removed', sum(o[1] for o in d['ops']),
          'variant tris put in', sum(len(o[2]['pos']) // 9 for o in d['ops']), 'bytes', len(json.dumps(d, separators=(',', ':'))))
