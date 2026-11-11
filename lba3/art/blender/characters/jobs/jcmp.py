# python jcmp.py a.json b.json : compare two poly JSONs (pos to 1e-5, normals 1e-4, the rest exact)
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
def cmp(x, y, tol, path=''):
    if type(x) != type(y) and not (isinstance(x, (int, float)) and isinstance(y, (int, float))): return [path + ' type']
    if isinstance(x, dict):
        r = []
        for k in set(x) | set(y):
            if k not in x or k not in y: r.append(path + '/' + k + ' missing'); continue
            r += cmp(x[k], y[k], 1e-4 if k == 'nrm' else tol, path + '/' + k)
        return r
    if isinstance(x, list):
        if len(x) != len(y): return [path + ' len %d vs %d' % (len(x), len(y))]
        if x and isinstance(x[0], (int, float)):
            n = sum(1 for p, q in zip(x, y) if abs(p - q) > tol)
            return [path + ' %d values differ' % n] if n else []
        r = []
        for i, (p, q) in enumerate(zip(x, y)): r += cmp(p, q, tol, path + '[%d]' % i)
        return r
    return [] if x == y else [path + ' %r vs %r' % (x, y)]
d = cmp(a, b, 1e-5)
print('IDENTICAL' if not d else '\n'.join(d[:20]))
