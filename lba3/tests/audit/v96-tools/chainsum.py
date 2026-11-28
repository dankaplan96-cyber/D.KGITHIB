import json, glob, re, os
D = '/dev/shm/t986-audit/chain'
tot = {}
print('seg | verdict | steps | play s | dialog | scene | trans | hpLost | deaths(retry) | assists | stuck lines | overflow | end')
for f in sorted(glob.glob(D + '/seg-[0-9][0-9].log')):
    i = f[-6:-4]
    L = open(f, errors='replace').read()
    v = re.findall(r'^VERDICT: (\w+)', L, re.M)
    steps = len(re.findall(r'^\[\d+s \+\d+s\]', L, re.M))
    st = {}
    p = f'{D}/stats-{i}.json'
    if os.path.exists(p):
        st = json.load(open(p))['total']
    for k in ('play', 'dialog', 'scene', 'trans', 'hpLost', 'walked', 'words'):
        tot[k] = tot.get(k, 0) + (st.get(k) or 0)
    dr = re.findall(r'^deaths \(Retry\): (\d+)', L, re.M)
    ia = re.findall(r'^ISO assists: (\d+)', L, re.M)
    stuck = len(re.findall(r'stuck at', open(f'{D}/trace-{i}.txt').read())) if os.path.exists(f'{D}/trace-{i}.txt') else -1
    ov = len(re.findall(r'OVERFLOW', L))
    stop = re.findall(r'STOP: (.*)', L)
    last = [x for x in L.splitlines() if re.match(r'^\[\d+s \+', x)]
    end = last[-1].split('|')[-1].strip()[:60] if last else ''
    print(f"{i} | {v[-1] if v else 'NONE'} | {steps} | {st.get('play')} | {st.get('dialog')} | {st.get('scene')} | {st.get('trans')} | {st.get('hpLost')} | {dr[-1] if dr else '?'} | {ia[-1] if ia else '?'} | {stuck} | {ov} | {stop[0] if stop else end}")
print('totals', {k: round(v, 1) for k, v in tot.items()})
