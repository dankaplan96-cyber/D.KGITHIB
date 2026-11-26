import json, sys
for path in sys.argv[1:]:
    try:
        d = json.load(open(path))
    except Exception as e:
        print('##', path, 'unreadable', e); continue
    print('##', path, d.get('chapter'), d.get('start'), d.get('error') or '')
    for s in d['scenes']:
        rows = s.get('rows', [])
        if rows or s.get('error'):
            print(' ', s.get('scene'), s.get('error', ''), [p[0] for p in s.get('people', [])], s.get('things'))
        for r in rows:
            print('     ', r)
