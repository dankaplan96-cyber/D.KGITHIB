# python floating.py <model.json>... : parts of a character model (rest pose) that touch nothing else of it.
# Each connected piece of the body mesh (vertices merged at 0.1 mm) is measured against every other piece: the least
# distance vertex->triangle both ways. A piece whose least distance to all the others is over GAP (env, default 6 mm) is
# reported as floating, with its size, colour, bone and where it is. Eyes and mouths are separate meshes on the head by
# design and are not measured. A piece crossing into another through long edges with no vertex close to the other's
# surface can be reported falsely: every report is looked at before anything is changed.
import json, os, sys
import numpy as np

GAP = float(os.environ.get('GAP', '0.006'))
SKEL = json.load(open(os.environ['SKEL'])) if os.environ.get('SKEL') else None


def pt_tri_dist(P, A, B, C):
    """Least distance from each point P[i] to the triangles (A,B,C)[j]: (len(P),) array (Ericson, vectorised)."""
    best = np.full(len(P), np.inf)
    for s in range(0, len(A), 512):
        a, b, c = A[s:s + 512][None], B[s:s + 512][None], C[s:s + 512][None]
        p = P[:, None, :]
        ab, ac, ap = b - a, c - a, p - a
        d1, d2 = (ab * ap).sum(-1), (ac * ap).sum(-1)
        bp = p - b; d3, d4 = (ab * bp).sum(-1), (ac * bp).sum(-1)
        cp = p - c; d5, d6 = (ab * cp).sum(-1), (ac * cp).sum(-1)
        va = d3 * d6 - d5 * d4; vb = d5 * d2 - d1 * d6; vc = d1 * d4 - d3 * d2
        den = va + vb + vc; den = np.where(np.abs(den) < 1e-18, 1e-18, den)
        v = vb / den; w = vc / den
        q = a + ab * v[..., None] + ac * w[..., None]   # (inside the face)
        # (the regions outside: a vertex or an edge)
        def seg(x, y):
            xy = y - x; t = np.clip(((p - x) * xy).sum(-1) / np.maximum((xy * xy).sum(-1), 1e-18), 0, 1)
            return x + xy * t[..., None]
        out = (v < 0) | (w < 0) | (v + w > 1)
        qe = np.stack([seg(a, b), seg(b, c), seg(c, a)])
        de = ((qe - p[None]) ** 2).sum(-1).min(0)
        di = ((q - p) ** 2).sum(-1)
        d = np.where(out, de, di)
        best = np.minimum(best, np.sqrt(d.min(1)))
    return best


def pieces(pos):
    V = pos.reshape(-1, 3)
    key = np.round(V / 1e-4).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    n = inv.max() + 1
    parent = np.arange(n)
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    T = inv.reshape(-1, 3)
    for a, b, c in T:
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra; parent[find(rc)] = ra
    root = np.array([find(x) for x in range(n)])
    tri_comp = root[T[:, 0]]
    return V.reshape(-1, 3, 3), tri_comp


def dist(A, B):
    """Least distance between two sets of triangles (vertex->triangle both ways), inf if their boxes are 5 cm apart."""
    lo, hi = A.reshape(-1, 3).min(0) - 0.05, A.reshape(-1, 3).max(0) + 0.05
    near = np.all((B.max(1) >= lo) & (B.min(1) <= hi), axis=1)
    if not near.any():
        return np.inf
    Bn = B[near]
    Pa = np.unique(A.reshape(-1, 3), axis=0)
    blo, bhi = Bn.reshape(-1, 3).min(0) - 0.05, Bn.reshape(-1, 3).max(0) + 0.05
    Pa = Pa[np.all((Pa >= blo) & (Pa <= bhi), axis=1)]
    d1 = pt_tri_dist(Pa, Bn[:, 0], Bn[:, 1], Bn[:, 2]).min() if len(Pa) else np.inf
    Pb = np.unique(Bn.reshape(-1, 3), axis=0)
    Pb = Pb[np.all((Pb >= lo) & (Pb <= hi), axis=1)]
    d2 = pt_tri_dist(Pb, A[:, 0], A[:, 1], A[:, 2]).min() if len(Pb) else np.inf
    return min(d1, d2)


def inside(p, T):
    """Is point p inside the closed-ish surface T (a ray along +x, Moller-Trumbore, odd hits)? Three slightly different
    rays vote, so a ray grazing an edge does not decide it."""
    votes = 0
    for dvec in ((1.0, 0.013, 0.007), (1.0, -0.011, 0.017), (0.98, 0.02, -0.19)):
        d = np.array(dvec); d /= np.linalg.norm(d)
        a, b, c = T[:, 0], T[:, 1], T[:, 2]
        e1, e2 = b - a, c - a
        h = np.cross(d, e2); det = (e1 * h).sum(1)
        ok = np.abs(det) > 1e-12
        f = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
        s = p - a; u = f * (s * h).sum(1)
        q = np.cross(s, e1); v = f * (q @ d); t = f * (e2 * q).sum(1)
        hit = ok & (u >= 0) & (u <= 1) & (v >= 0) & (u + v <= 1) & (t > 1e-9)
        votes += int(hit.sum()) % 2
    return votes >= 2


def check(path):
    J = json.load(open(path))
    look = os.path.basename(path)[:-5]
    PAR = {}
    if SKEL and look in SKEL:
        PAR = {k: v.get('parent') for k, v in SKEL[look]['bones'].items()}
    pos = np.array(J['pos'], dtype=np.float64); col = np.array(J['col']).reshape(-1, 3, 3)
    si = np.array(J['si']).reshape(-1, 4)
    tris, comp = pieces(pos)
    ids = list(np.unique(comp))
    H = pos.reshape(-1, 3)[:, 1].max()
    T = {c: tris[comp == c] for c in ids}
    # each piece's bone (the one most of its vertices follow): a piece must hold on to its own bone's pieces, or its
    # parent's or child's (an ear on the head, not on the shoulder it happens to graze in the rest pose)
    BONE, BSET = {}, {}
    for c in ids:
        vi = np.where(np.repeat(comp == c, 3))[0]
        cnt = np.bincount(si[vi, 0], minlength=len(J['bones']))
        BONE[c] = J['bones'][int(cnt.argmax())]
        BSET[c] = {J['bones'][i] for i in np.where(cnt >= 0.1 * cnt.sum())[0]}   # (a body skinned over the hips and the torso)
    def up(x, k=3):
        out = [x]
        for _ in range(k):
            x = PAR.get(x)
            if not x: break
            out.append(x)
        return out
    def kin(a, b):
        # (the same bone, or one an ancestor of the other within three steps: a head sunk in the torso holds through the
        #  neck it hides, a shoe on a leg skinned to the hips)
        if not PAR:
            return True
        return any(x in up(y) or y in up(x) for x in BSET[a] for y in BSET[b])
    # (pieces that touch are joined; the body is the group holding the biggest piece; every other group floats)
    grp = {c: c for c in ids}
    def g(x):
        while grp[x] != x:
            grp[x] = grp[grp[x]]; x = grp[x]
        return x
    D = {}
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            d = dist(T[a], T[b])
            if d > GAP and kin(a, b):
                # (a piece buried inside another is held by it: a neck stub inside the head, a root sunk in the skull)
                # (or crossing into it: a leg's top inside the round body; a vertex of the smaller inside the bigger)
                for small, big in ((a, b), (b, a)):   # (either way round: a forearm's end inside a ball hand)
                    Ps = np.unique(T[small].reshape(-1, 3), axis=0)
                    blo, bhi = T[big].reshape(-1, 3).min(0), T[big].reshape(-1, 3).max(0)
                    Ps = Ps[np.all((Ps >= blo) & (Ps <= bhi), axis=1)]
                    if len(Ps) > 24:
                        Ps = Ps[np.linspace(0, len(Ps) - 1, 24).astype(int)]
                    if inside(T[small].reshape(-1, 3).mean(0), T[big]) or any(inside(p, T[big]) for p in Ps):
                        d = 0.0
                        break
            D[(a, b)] = D[(b, a)] = d
            if d <= GAP and kin(a, b):
                grp[g(b)] = g(a)
    main = g(max(ids, key=lambda c: len(T[c])))
    groups = {}
    for c in ids:
        if g(c) != main:
            groups.setdefault(g(c), []).append(c)
    out = []
    body = [c for c in ids if g(c) == main]
    for gid, mem in groups.items():
        dk = [D[(a, b)] for a in mem for b in body if kin(a, b)]
        d = min(dk) if dk else np.inf
        M = np.concatenate([T[c] for c in mem])
        mask = np.isin(comp, mem)
        vi = np.where(np.repeat(mask, 3))[0]
        bone = J['bones'][int(np.bincount(si[vi, 0]).argmax())]
        cc = col[mask].reshape(-1, 3).mean(0).astype(int)
        out.append((d, int(mask.sum()), '#%02x%02x%02x' % tuple(cc), bone, M.reshape(-1, 3).mean(0), len(mem)))
    return out, H


for f in sys.argv[1:]:
    res, H = check(f)
    name = os.path.basename(f)[:-5]
    if not res:
        print(f'{name:14s} ok'); continue
    for d, n, c, bone, ctr, k in sorted(res, key=lambda r: -r[0]):
        print(f'{name:14s} FLOAT gap {"none near" if d == np.inf else f"{d*100:.1f} cm":>9s}  {n:4d} tris in {k} piece(s)  {c}  bone {bone:7s}  at ({ctr[0]:+.2f}, {ctr[1]:.2f}, {ctr[2]:+.2f}) of H {H:.2f}')
