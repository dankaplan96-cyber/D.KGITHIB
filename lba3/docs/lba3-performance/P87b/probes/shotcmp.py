#!/usr/bin/env python3
# P87b: decode the SHOT data URL of two probe outputs, save the PNGs, and compare them pixel by pixel.
import sys, base64, io
from PIL import Image
import numpy as np
def load(p):
    for line in open(p):
        if line.startswith('SHOT data:image/png;base64,'):
            return Image.open(io.BytesIO(base64.b64decode(line.split(',', 1)[1].strip()))).convert('RGB')
    raise SystemExit('no SHOT in ' + p)
a, b = load(sys.argv[1]), load(sys.argv[2])
a.save(sys.argv[3]); b.save(sys.argv[4])
A, B = np.asarray(a, dtype=np.int16), np.asarray(b, dtype=np.int16)
d = np.abs(A - B).max(axis=2)
print(f'size {a.size} vs {b.size}; pixels differing: {(d > 0).sum()} of {d.size} ({100 * (d > 0).mean():.3f} %); > 8 levels: {(d > 8).sum()}; max diff {d.max()}')
