# TITLE-LOAD: the title views of each run against this build's (same angle, same frozen state): differing pixels, and
# side-by-side JPEGs (this build | the option) for the angles in PAIRS.
#   python3 -I optdiff.py <shots dir> <out dir>
import sys, os
import numpy as np
from PIL import Image
D, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
REF = 'after'
PAIRS = ['t00000-base', 't073.3-base']
for run in ['base', 'far150', 'lod40', 'frame95']:
    rows = []
    for f in sorted(os.listdir(os.path.join(D, REF))):
        if not f.endswith('-base.png') or not os.path.exists(os.path.join(D, run, f)): continue
        a = np.asarray(Image.open(os.path.join(D, REF, f)).convert('RGB')).astype(np.int16)
        b = np.asarray(Image.open(os.path.join(D, run, f)).convert('RGB')).astype(np.int16)
        d = np.abs(a - b).max(axis=2)
        rows.append((f.split('-')[0], int((d > 0).sum()), int((d > 8).sum()), d.size))
        if f[:-4] in PAIRS:
            A, B = Image.open(os.path.join(D, REF, f)).convert('RGB'), Image.open(os.path.join(D, run, f)).convert('RGB')
            w, h = A.size; C = Image.new('RGB', (w * 2 + 8, h), (255, 255, 255)); C.paste(A, (0, 0)); C.paste(B, (w + 8, 0))
            C.resize(((w * 2 + 8) // 2, h // 2)).save(os.path.join(OUT, f'title-{run}-vs-after-{f.split("-")[0]}.jpg'), quality=85)
    print(f'{run} vs {REF}: ' + ' · '.join(f'{t} {n} px ({100 * n / s:.2f} %; >8 levels {m})' for t, n, m, s in rows))
