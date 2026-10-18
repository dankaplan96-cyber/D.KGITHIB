#!/usr/bin/env python3
# SRC-1: before/after sheets from the screenshots of lookdev-shot.mjs and ingame-shots.mjs (our renders only).
#   python3 make-sheets.py <shots dir (B-*.png / A-*.png)> <game dir: the opening run> <play dir: the `play` run> <out dir>
import os
import sys

from PIL import Image, ImageDraw

shots, game, play, out = sys.argv[1:5]


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 7 * len(text), 18], fill=(255, 255, 255))
    d.text((4, 3), text, fill=(10, 20, 40))
    return im


def pair(a, b, la, lb, path, scale=1.0):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if scale != 1.0:
        A = A.resize((int(A.width * scale), int(A.height * scale)))
        B = B.resize((int(B.width * scale), int(B.height * scale)))
    im = Image.new('RGB', (A.width, A.height + B.height + 6), (30, 30, 30))
    im.paste(label(A, la), (0, 0))
    im.paste(label(B, lb), (0, A.height + 6))
    im.save(path, quality=88)
    print(path, im.size)


for k in ('body', 'head', 'grey'):
    pair(os.path.join(shots, 'B-%s.png' % k), os.path.join(shots, 'A-%s.png' % k), 'BEFORE (c0264c8)', 'AFTER (SRC-1)',
         os.path.join(out, 'zoe-%s-before-after.jpg' % k))
# the game: crops round Zoé, before above after, one column per shot
names = ['house-zoe-walk', 'out-zoe-idle', 'out-zoe-walk', 'out-zoe-run', 'out-zoe-walk-away']
C = 240
im = Image.new('RGB', (C * len(names), 2 * C + 6), (30, 30, 30))
for i, n in enumerate(names):
    for r, pre in enumerate(('before', 'after')):
        p = os.path.join(play, '%s-%s-zoe.png' % (pre, n))
        if os.path.exists(p):
            t = Image.open(p).convert('RGB').resize((C, C))
            im.paste(label(t, ('%s %s' % (pre, n))[:30]), (i * C, r * (C + 6)))
im.save(os.path.join(out, 'zoe-ingame-crops-before-after.jpg'), quality=88)
for n in ('opening-46s', 'opening-52s', 'opening-63s', 'opening-71s'):
    pair(os.path.join(game, 'before-%s.png' % n), os.path.join(game, 'after-%s.png' % n), 'BEFORE ' + n, 'AFTER ' + n,
         os.path.join(out, 'zoe-ingame-%s.jpg' % n), 0.6)
pair(os.path.join(play, 'before-out-zoe-walk.png'), os.path.join(play, 'after-out-zoe-walk.png'), 'BEFORE play camera, walking',
     'AFTER play camera, walking', os.path.join(out, 'zoe-ingame-play-walk.jpg'), 0.6)
