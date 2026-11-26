# HEADING-LOAD-2: per heading, main-pass calls / triangles before → after, in all and by GPU group, from two q_area.js
# outputs (the as-is frame of each heading).
#   python3 -I table.py before.txt after.txt [title]
import re, sys
GROUPS = ['scenery', 'grass', 'trees', 'terrain', 'characters', 'water', 'particles', 'transparent', 'sky']
def parse(path):
    out, cur = {}, None
    for line in open(path):
        m = re.match(r'heading (\d+) \((\d+)°.*?: main (\d+) calls (\d+)k tris · shadow (\d+) calls (\d+)k', line)
        if m:
            cur = int(m.group(2)); out[cur] = {'all': (int(m.group(3)), int(m.group(4))), 'shadow': (int(m.group(5)), int(m.group(6))), 'g': {}, 'gl': True}
            continue
        if cur is not None and out[cur]['gl'] and line.startswith('   ') and not line.startswith('   main') and not line.startswith('   ['):
            for g, c, t in re.findall(r'(\w+) (\d+)/(\d+)k', line):
                out[cur]['g'][g] = (int(c), int(t))
            out[cur]['gl'] = False
    return out
A, B = parse(sys.argv[1]), parse(sys.argv[2])
title = sys.argv[3] if len(sys.argv) > 3 else ''
print(f'{title} — main pass, calls/k triangles, before → after')
print('heading | all | ' + ' | '.join(GROUPS[:7]) + ' | shadow')
ma = mb = 0
for h in sorted(A):
    a, b = A[h], B.get(h)
    if not b: continue
    f = lambda x: f'{x[0]}/{x[1]}k'
    cells = [f"{f(a['g'].get(g, (0, 0)))} → {f(b['g'].get(g, (0, 0)))}" if a['g'].get(g) != b['g'].get(g) else f(a['g'].get(g, (0, 0))) for g in GROUPS[:7]]
    print(f"{h}° | {f(a['all'])} → {f(b['all'])} | " + ' | '.join(cells) + f" | {f(a['shadow'])} → {f(b['shadow'])}")
    ma += a['all'][1]; mb += b['all'][1]
n = len([h for h in A if h in B])
print(f'mean main triangles over the {n} headings: {ma / n:.1f}k → {mb / n:.1f}k ({100 * (mb - ma) / ma:+.0f} %)')
