# ARRIVAL-2: summary of q_look.js outputs — per visit: its header, the longest black frame (and the longest leaving out
# the first drawn one), the first frame drawn (still black: calls > 0) with pieces leaving, uploads and its sections,
# and the longest preparation step by kind. Usage: python3 csum.py file...
import re, sys
for f in sys.argv[1:]:
    print('==', f.split('/')[-1])
    vis, rows = None, []
    def flush():
        if not vis: return
        blk = [r for r in rows if ' BLACK ' in r]
        ms = lambda r: int(re.match(r'\s*\d+\s+(\d+) ms', r).group(1))
        first = [r for r in blk if re.search(r'calls [1-9]', r)]
        rest = [r for r in blk if r not in first[:1]]
        print('  ' + vis)
        print(f"    black frames {len(blk)}, longest {max(map(ms, blk), default=0)} ms, longest before the first drawn {max(map(ms, rest), default=0)} ms")
        if first:
            r = first[0]
            left = re.search(r'(\d+) pieces left draw batches', r); up = re.search(r'uploads (\d+) \((\d+) KB\)', r); sec = re.search(r'SEC ([^,]*)', r)
            print(f"    first frame drawn: {ms(r)} ms, pieces leaving {left.group(1) if left else 0}, uploads {up.group(1) + ' (' + up.group(2) + ' KB)' if up else '-'}, {('SEC ' + sec.group(1)) if sec else ''}{', cache full build' if 'cache full build' in r else ''}")
        steps = {}
        for r in blk:
            for k, v in re.findall(r'(?:STEP | \+ )([a-z][a-z ()-]+?) (\d+)', r):
                steps[k] = max(steps.get(k, 0), int(v))
        print('    longest step by kind: ' + ', '.join(f'{k} {v}' for k, v in sorted(steps.items(), key=lambda x: -x[1])[:6]))
    for l in open(f):
        l = l.rstrip('\n')
        if l.startswith('waited') or l.startswith('another') or l.startswith('(flush'): print('  ' + l)
        m = re.match(r'^(zeelich|desert|hamalayi|citadel|tavern)\b.*frames', l)
        if m: flush(); vis, rows = l, []; continue
        if vis and re.match(r'\s+\d+\s+\d+ ms', l): rows.append(l)
    flush()
