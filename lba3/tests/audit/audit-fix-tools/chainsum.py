import json, re, glob, os
D = '/dev/shm/t983-chain'
print('seg | result | free play s | dialogue s | scenes s | life lost | deaths | ISO assists | stuck replans | overflows')
for i in ['01','02','03','04','05','06','07','08','09','10','11','12','12b','13','14']:
    f = f'{D}/seg-{i}.log'
    if not os.path.exists(f): continue
    s = open(f).read()
    ok = 'PASS the segment ran every step' in s
    m = re.search(r'stats total: (\{.*\})', s)
    st = json.loads(m.group(1)) if m else {}
    dm = re.search(r'deaths \(Retry\): (\d+)', s)
    am = re.search(r'ISO assists: (\d+)', s)
    tr = open(f'{D}/trace-{i}.txt').read() if os.path.exists(f'{D}/trace-{i}.txt') else ''
    print(f"{i} | {'PASS' if ok else 'FAIL'} | {st.get('play')} | {st.get('dialog')} | {st.get('scene')} | {st.get('hpLost')} | {dm.group(1) if dm else '?'} | {am.group(1) if am else '?'} | {tr.count('replan')} | {s.count('OVERFLOW')}")
