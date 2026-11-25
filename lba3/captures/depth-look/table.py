"""DEPTH-LOOK: per candidate, the frames' mean, contrast (std) and fine detail (mean |L - 9x9 mean|) at High 1366,
averaged over the places it has, plus the user's wall. usage: python3 -I table.py ROOT"""
import sys, os
import numpy as np
from PIL import Image
from numpy.lib.stride_tricks import sliding_window_view
ROOT = sys.argv[1]
PLACES = ['fortwall', 'square', 'harbour', 'house', 'zeelich', 'desert', 'lhar', 'island']
CANDS = [('today', 'base'), ('a relief', 'c-relief'), ('b light', 'c-light'), ('c contact', 'c-contact'), ('d rim', 'c-rim'), ('e paint', 'c-paint'), ('f wallnormals=all', 'c-wnall'), ('preset', 'c-preset')]
def L(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    return a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
def stats(l):
    H, W = l.shape; c = (slice(int(H * .1), int(H * .9)), slice(int(W * .08), int(W * .92)))
    box = sliding_window_view(np.pad(l, 4, mode='edge'), (9, 9)).mean(axis=(2, 3))
    return l[c].mean(), l[c].std(), np.abs(l - box)[c].mean()
print('| candidate | ' + ' | '.join(PLACES) + ' | mean of places |')
print('|---|' + '---|' * (len(PLACES) + 1))
base = {}
for name, d in CANDS:
    cells, dets = [], []
    for p in PLACES:
        f = os.path.join(ROOT, d, f'{p}-high-1366x768.png')
        if not os.path.exists(f): cells.append('—'); continue
        m, s, det = stats(L(f))
        if d == 'base': base[p] = (m, s, det)
        b = base.get(p)
        if b and d != 'base': cells.append(f'{m - b[0]:+.1f} / {100 * (det / b[2] - 1):+.0f} %'); dets.append(100 * (det / b[2] - 1))
        else: cells.append(f'{m:.0f} / {det:.2f}')
    print(f'| {name} | ' + ' | '.join(cells) + f" | {(np.mean(dets) if dets else 0):+.0f} % |")
