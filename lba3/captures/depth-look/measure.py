"""DEPTH-LOOK measurements from probe.mjs captures: per frame, the sun's share, shade share, lit/shade ratio,
cast shadows, fog loss, normal maps. usage: python3 -I measure.py DIR [tag-filter]"""
import sys, os, json, glob
import numpy as np
from PIL import Image

D = sys.argv[1]
flt = sys.argv[2] if len(sys.argv) > 2 else ''

def load(p):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    Y = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)       # linear luminance
    L = (a @ np.array([0.2126, 0.7152, 0.0722], np.float32)) * 255  # sRGB luma 0-255
    return Y, L, a

rows = {}
for base in sorted(glob.glob(os.path.join(D, '*.png'))):
    n = os.path.basename(base)[:-4]
    if '~' in n or flt not in n: continue
    vs = {k: os.path.join(D, f'{n}~{k}.png') for k in ('nosun', 'noshadow', 'nofog', 'nonormal')}
    Y, L, a = load(base)
    H, W = Y.shape
    crop = np.zeros_like(Y, bool); crop[int(H * .1):int(H * .9), int(W * .08):int(W * .92)] = True
    r = {'mean': float(L[crop].mean()), 'std': float(L[crop].std())}
    # local contrast: mean absolute difference to a 9x9 box mean (mid-frequency detail)
    from numpy.lib.stride_tricks import sliding_window_view
    k = 9; pad = np.pad(L, k // 2, mode='edge'); box = sliding_window_view(pad, (k, k)).mean(axis=(2, 3))
    r['local'] = float(np.abs(L - box)[crop].mean())
    if all(os.path.exists(p) for p in vs.values()):
        Ys = {k: load(p)[0] for k, p in vs.items()}
        Ls = {k: load(p)[1] for k, p in vs.items()}
        world = crop & ((np.abs(Y - Ys['nosun']) > 1e-4) | (np.abs(Y - Ys['nofog']) > 1e-4) | (np.abs(Y - Ys['noshadow']) > 1e-4) | (np.abs(Y - Ys['nonormal']) > 1e-4))
        # (the sun's share of a pixel's light; shade: < 15 %, lit: > 35 %)
        share = np.clip((Y - Ys['nosun']) / np.maximum(Y, 1e-4), 0, 1)
        shade = world & (share < 0.15); lit = world & (share > 0.35)
        r['world_px'] = float(world.sum() / crop.sum())
        r['shade_share'] = float(shade.sum() / max(world.sum(), 1))
        r['lit_share'] = float(lit.sum() / max(world.sum(), 1))
        r['sun_share_mean'] = float(share[world].mean())
        r['lit_L'] = float(L[lit].mean()) if lit.any() else None
        r['shade_L'] = float(L[shade].mean()) if shade.any() else None
        r['lit_shade_ratio_lin'] = float(Y[lit].mean() / max(Y[shade].mean(), 1e-4)) if lit.any() and shade.any() else None
        cast = world & ((Ys['noshadow'] - Y) / np.maximum(Ys['noshadow'], 1e-4) > 0.15)
        r['cast_share'] = float(cast.sum() / max(world.sum(), 1))
        r['cast_depth'] = float((Y[cast] / np.maximum(Ys['noshadow'][cast], 1e-4)).mean()) if cast.any() else None
        r['fog_meanabs'] = float(np.abs(L - Ls['nofog'])[world].mean())
        r['fog_std_loss'] = float(1 - L[crop].std() / max(Ls['nofog'][crop].std(), 1e-4))
        r['fog_local_loss'] = None
        nd = np.abs(L - Ls['nonormal'])
        r['normal_px_share'] = float((nd[world] > 2).mean())
        r['normal_meanabs'] = float(nd[world].mean())
    rows[n] = r
json.dump(rows, open(os.path.join(D, 'measure.json'), 'w'), indent=1)
keys = ['mean', 'std', 'local', 'shade_share', 'lit_L', 'shade_L', 'lit_shade_ratio_lin', 'cast_share', 'cast_depth', 'fog_std_loss', 'normal_px_share', 'normal_meanabs']
print('frame'.ljust(30), ' '.join(k[:9].rjust(9) for k in keys))
for n, r in rows.items():
    print(n.ljust(30), ' '.join(('%9.2f' % r[k]) if isinstance(r.get(k), float) else '        -' for k in keys))
