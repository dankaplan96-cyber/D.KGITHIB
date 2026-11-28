"""DEPTH-LOOK: the user's spot (the fort wall by the flight, in shade), at 1366x768 High from the Follow/Far camera.
The wall's face: mean, contrast (std) and fine detail (mean |L - 9x9 mean|); the foot: the ground band at the wall's foot
against the ground 1.5-2 m out. usage: python3 -I wall.py file.png [...]"""
import sys
import numpy as np
from PIL import Image
from numpy.lib.stride_tricks import sliding_window_view
def L(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
    return a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
for p in sys.argv[1:]:
    l = L(p)
    k = 9; box = sliding_window_view(np.pad(l, 4, mode='edge'), (k, k)).mean(axis=(2, 3)); det = np.abs(l - box)
    face = np.concatenate([l[180:360, 735:915].ravel(), l[180:360, 280:400].ravel()])
    fdet = np.concatenate([det[180:360, 735:915].ravel(), det[180:360, 280:400].ravel()])
    foot_wall = l[352:368, 735:915].mean()      # the wall's lowest course
    upper_wall = l[200:300, 735:915].mean()
    foot_ground = l[384:398, 740:900].mean()    # the ground at the wall's foot
    far_ground = l[430:450, 740:900].mean()     # the ground further out
    print(f'{p.split("/")[-2]}/{p.split("/")[-1]}: face mean {face.mean():.1f} std {face.std():.1f} detail {fdet.mean():.2f} | wall foot/upper {foot_wall / upper_wall:.3f} | ground foot/out {foot_ground / far_ground:.3f}')
