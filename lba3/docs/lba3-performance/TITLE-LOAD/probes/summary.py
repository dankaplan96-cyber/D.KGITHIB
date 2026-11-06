# TITLE-LOAD: results/summary.json from the runs' own files (title counts, startup steps, the reveal probe's verdicts)
import json, re, os
R = os.path.join(os.path.dirname(__file__), '..', 'results')
J = lambda f: json.load(open(os.path.join(R, f)))
out = {'machine': 'SwiftShader in the development container: exact counts, relative ms only; no laptop GPU time or fps',
       'title': {}, 'startup': {}, 'reveal': {}}
for k in ['base', 'after', 'far150', 'lod40', 'frame95']:
    P = J(f'title-{k}.json')['per']
    out['title'][k] = {'perAngle': [{'angleDeg': p['angleDeg'], 't': p['t'], 'main': p['main'], 'shadow': p['shadow'], 'beyondFogTris': p['beyondFogTris']} for p in P],
                       'meanMain': {'calls': round(sum(p['main']['calls'] for p in P) / len(P), 1), 'tris': round(sum(p['main']['tris'] for p in P) / len(P))},
                       'meanShadow': {'calls': round(sum(p['shadow']['calls'] for p in P) / len(P), 1), 'tris': round(sum(p['shadow']['tris'] for p in P) / len(P))}}
A = J('title-after.json')['per']
out['title']['sameFrameAB'] = {v: {'pxMax': max(p['vars'][v]['px'] for p in A), 'pxMin': min(p['vars'][v]['px'] for p in A)} for v in A[0]['vars']}
for k, f in [('before', 'startup-base-run1.json'), ('before2', 'startup-base-run2.json'), ('after', 'startup-after.json'), ('after2', 'startup-after-run2.json')]:
    d = J(f)
    out['startup'][k] = {'wallToTitleS': d['wallToTitle'], 'buildMs': d['loadTimes']['total'], 'prepareMs': d['loadTimes']['shaders'], 'prep': d['loadTimes']['prep'],
                         'slices': d['loadTimes'].get('slices'), 'programs': d['programs'], 'programKinds': d['programKinds'], 'parallelCompile': d['parallel'],
                         'longTasks': {'count': d['longTaskCount'], 'sumMs': d['longTaskSum'], 'over100': d['over100'], 'over200': d['over200'], 'top': d['longTasks'][:12]}}
for k, f in [('before', 'reveal2-low-base.txt'), ('after', 'reveal2-low-after.txt')]:
    t = open(os.path.join(R, f)).read()
    m = re.search(r'frames in view that made geometries: (\d+) · longest black frame (\d+) ms', t)
    out['reveal'][k] = {'framesInViewWithNewGeometry': int(m.group(1)), 'longestBlackFrameMs': int(m.group(2)), 'visits': re.findall(r'^(\w+ \((?:cold|repeat)\)): .*$', t, re.M)}
json.dump(out, open(os.path.join(R, 'summary.json'), 'w'), indent=1)
print('ok')
