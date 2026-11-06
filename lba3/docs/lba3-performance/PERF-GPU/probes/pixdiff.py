#!/usr/bin/env python3
# pixdiff.py dirA dirB : per matching PNG, pixels that differ (any channel), over 2 levels, max difference
import sys, os
import numpy as np
from PIL import Image
A, B = sys.argv[1:3]
for f in sorted(os.listdir(A)):
    if not f.endswith('.png') or not os.path.exists(os.path.join(B, f)):
        continue
    a = np.asarray(Image.open(os.path.join(A, f)).convert('RGB')).astype(int)
    b = np.asarray(Image.open(os.path.join(B, f)).convert('RGB')).astype(int)
    d = np.abs(a - b).max(axis=2)
    print(f, 'pixels', d.size, 'differ', int((d > 0).sum()), 'over2', int((d > 2).sum()), 'max', int(d.max()), 'mean', round(float(a.mean()), 2), round(float(b.mean()), 2))
