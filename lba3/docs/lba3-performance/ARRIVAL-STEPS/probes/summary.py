"""ARRIVAL-STEPS: a q_arrival.js result summarised per visit.
python3 -I summary.py <result.txt> ...
Per visit: black frames (count, ms in all); the longest black frame apart from the texture-layers read-back stall
(SwiftShader's canvas raster, reported on its own) and from frames that compiled a shader program; frames over 33 / 50 ms
on the same terms; the longest step of each kind; the first frame drawn (still black) and the longest of the first 60
frames in view."""
import re, sys

ROW = re.compile(r'^\s+(\d+)\s+(\d+) ms (BLACK|view )')

def visits(path):
    cur = None
    for line in open(path):
        m = re.match(r'^(\w+) \((cold|repeat)\):', line)
        if m:
            cur = {'id': m.group(1), 'kind': m.group(2), 'rows': []}
            yield cur
            continue
        r = ROW.match(line)
        if r and cur is not None:
            cur['rows'].append((int(r.group(2)), r.group(3) == 'BLACK', line))

def summarise(v):
    black = [(ms, l) for ms, b, l in v['rows'] if b]
    view = [ms for ms, b, l in v['rows'] if not b]
    stall = [ms for ms, l in black if 'texture layers' in l and ms > 1000]
    judged = [(ms, l) for ms, l in black if not ('texture layers' in l and ms > 1000) and '+' not in l.split('STEP')[-1].split('prog')[0][-3:] and 'prog)' not in l and 'programs' not in l]
    prog = [ms for ms, l in black if 'prog)' in l or 'programs' in l]
    steps = {}
    for ms, l in black:
        if 'STEP ' not in l:
            continue
        for part in l.split('STEP ', 1)[1].split(' + '):
            m = re.match(r'([a-z ()-]+?) (\d+)', part)
            if m:
                k = m.group(1).strip(); steps[k] = max(steps.get(k, 0), int(m.group(2)))
    first = next((ms for ms, l in black if 'calls 0' not in l), None)
    return {
        'black': len(black), 'blackMs': sum(ms for ms, _ in black) - sum(stall),
        'maxJudged': max([ms for ms, _ in judged], default=0),
        'over33': sum(1 for ms, _ in judged if ms > 33), 'over50': sum(1 for ms, _ in judged if ms > 50),
        'stall': stall, 'progFrames': prog, 'firstDrawn': first, 'viewMax': max(view[:60], default=0), 'steps': steps,
    }

for p in sys.argv[1:]:
    print(f'== {p}')
    for v in list(visits(p)):
        s = summarise(v)
        st = ' · '.join(f'{k} {ms}' for k, ms in sorted(s['steps'].items(), key=lambda x: -x[1]) if ms >= 10)
        print(f"{v['id']:9} {v['kind']:6} black {s['black']:3} frames {s['blackMs']:5} ms (stall apart: {s['stall']}) · longest black {s['maxJudged']} ms"
              f" · >33 {s['over33']} · >50 {s['over50']} · with programs {s['progFrames']} · first drawn {s['firstDrawn']} · view max {s['viewMax']}")
        print(f'          longest steps: {st}')
