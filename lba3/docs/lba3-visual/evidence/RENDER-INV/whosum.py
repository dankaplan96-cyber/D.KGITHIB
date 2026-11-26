# RENDER-INV: who.mjs results, one line per file.   python3 whosum.py results/who-*.json
import json, sys
for f in sys.argv[1:]:
    d = json.load(open(f))
    print(f.split('/')[-1], d.get('quality'), d['errors'], {v: (r['callsPerFrame'], r['perCellMergeSaves']) for v, r in d['out'].items()})
