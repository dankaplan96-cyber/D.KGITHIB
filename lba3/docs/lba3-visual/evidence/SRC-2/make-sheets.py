#!/usr/bin/env python3
# SRC-2: before/after sheets from the screenshots of lookdev-shot.mjs, ingame-shots.mjs and dinofly-ingame.mjs (our
# renders only; no image of an original model).
#   python3 make-sheets.py <lookdev dir (B-*.png / A-*.png)> <game dir (before-*/after-*)> <dino-fly dir> <out dir> [<zoe dir>]
# (zoe dir: ZB-*/ZA-* lookdev shots and SRC-1's ingame-shots.mjs frames, before-*/after-*, for Zoé's slimming)
import os
import sys

from PIL import Image, ImageDraw

shots, game, df, out = sys.argv[1:5]


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 7 * len(text), 18], fill=(255, 255, 255))
    d.text((4, 3), text, fill=(10, 20, 40))
    return im


def pair(a, b, la, lb, path, scale=1.0, side=False):
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if scale != 1.0:
        A = A.resize((int(A.width * scale), int(A.height * scale)))
        B = B.resize((int(B.width * scale), int(B.height * scale)))
    if side:
        im = Image.new('RGB', (A.width + B.width + 6, max(A.height, B.height)), (30, 30, 30))
        im.paste(label(A, la), (0, 0))
        im.paste(label(B, lb), (A.width + 6, 0))
    else:
        im = Image.new('RGB', (max(A.width, B.width), A.height + B.height + 6), (30, 30, 30))
        im.paste(label(A, la), (0, 0))
        im.paste(label(B, lb), (0, A.height + 6))
    im.save(path, quality=88)
    print(path, im.size)


BEFORE, AFTER = 'BEFORE (292a775: a Quetch old man)', 'AFTER (SRC-2: LBA2 body 139, a Grobo)'
for k in ('body', 'head', 'grey'):
    pair(os.path.join(shots, 'B-%s.png' % k), os.path.join(shots, 'A-%s.png' % k), BEFORE, AFTER,
         os.path.join(out, 'baldino-%s-before-after.jpg' % k), 0.8 if k == 'body' else 1.0)
if os.path.exists(os.path.join(shots, 'A-talk.png')):
    im = label(Image.open(os.path.join(shots, 'A-talk.png')).convert('RGB'), 'AFTER: his own talk loop (ANIM 718) hips / wide / forward, idle, turn')
    im.save(os.path.join(out, 'baldino-talk-turn.jpg'), quality=88)
# the game: full frames, before above after, and a strip of the crops round Baldino
names = ['ws-room', 'ws-near', 'ws-talk', 'council-near', 'peg', 'peg-talk']
for n in names:
    a, b = os.path.join(game, 'before-%s.png' % n), os.path.join(game, 'after-%s.png' % n)
    if os.path.exists(a) and os.path.exists(b):
        pair(a, b, 'BEFORE ' + n, 'AFTER ' + n, os.path.join(out, 'baldino-ingame-%s.jpg' % n), 0.6, side=True)
C = 240
crops = [n for n in names if os.path.exists(os.path.join(game, 'before-%s-crop.png' % n))]
im = Image.new('RGB', (C * len(crops), 2 * C + 6), (30, 30, 30))
for i, n in enumerate(crops):
    for r, pre in enumerate(('before', 'after')):
        p = os.path.join(game, '%s-%s-crop.png' % (pre, n))
        if os.path.exists(p):
            im.paste(label(Image.open(p).convert('RGB').resize((C, C)), ('%s %s' % (pre, n))[:30]), (i * C, r * (C + 6)))
im.save(os.path.join(out, 'baldino-ingame-crops-before-after.jpg'), quality=88)
print('crops', crops)
# the Dino-Fly from the play camera: doze and look, S/N/E/W at 5 m, crops round him; before | after
cells = [('S5-doze', (330, 60, 830, 420)), ('S5-look', (330, 60, 830, 420)), ('N5-doze', (330, 260, 830, 620)), ('N5-look', (330, 260, 830, 620)),
         ('E5-doze', (330, 220, 830, 580)), ('E5-look', (330, 220, 830, 580)), ('W5-doze', (300, 260, 800, 620)), ('W5-look', (300, 260, 800, 620))]
W, H = 500, 360
im = Image.new('RGB', (2 * W + 6, len(cells) * (H + 4)), (30, 30, 30))
for i, (n, box) in enumerate(cells):
    for c, pre in enumerate(('before', 'after')):
        p = os.path.join(df, '%s-%s.png' % (pre, n))
        if os.path.exists(p):
            im.paste(label(Image.open(p).convert('RGB').crop(box), '%s %s (play camera, 5 m)' % (pre.upper(), n)), (c * (W + 6), i * (H + 4)))
im.save(os.path.join(out, 'dinofly-ingame-before-after.jpg'), quality=85)
for k in ('doze', 'look', 'grey'):
    a, b = os.path.join(df, 'B-%s.png' % k), os.path.join(df, 'A-%s.png' % k)
    if os.path.exists(a) and os.path.exists(b):
        pair(a, b, 'BEFORE (CH-DF-FIX) ' + k, 'AFTER (SRC-2) ' + k, os.path.join(out, 'dinofly-close-%s-before-after.jpg' % k), 0.7)

# Zoé, no longer expecting (the user's item): lookdev, the opening's four frames, her playable crops
if len(sys.argv) > 5:
    zd = sys.argv[5]
    for k in ('body', 'grey'):
        a, b = os.path.join(zd, 'ZB-%s.png' % k), os.path.join(zd, 'ZA-%s.png' % k)
        if os.path.exists(a) and os.path.exists(b):
            pair(a, b, 'BEFORE (SRC-1: body 26 as measured, pregnant)', 'AFTER (SRC-2: twelve years on, not pregnant)',
                 os.path.join(out, 'zoe-slim-%s-before-after.jpg' % k), 0.8)
    for n in ('opening-46s', 'opening-52s', 'opening-63s', 'opening-71s'):
        a, b = os.path.join(zd, 'before-%s.png' % n), os.path.join(zd, 'after-%s.png' % n)
        if os.path.exists(a) and os.path.exists(b):
            pair(a, b, 'BEFORE ' + n, 'AFTER ' + n, os.path.join(out, 'zoe-slim-ingame-%s.jpg' % n), 0.5, side=True)
    names = ['opening-46s', 'opening-52s', 'opening-63s', 'opening-71s', 'house-zoe-walk', 'out-zoe-idle', 'out-zoe-walk', 'out-zoe-run', 'out-zoe-walk-away']
    names = [n for n in names if os.path.exists(os.path.join(zd, 'before-%s-zoe.png' % n))]
    im = Image.new('RGB', (C * len(names), 2 * C + 6), (30, 30, 30))
    for i, n in enumerate(names):
        for r, pre in enumerate(('before', 'after')):
            p = os.path.join(zd, '%s-%s-zoe.png' % (pre, n))
            if os.path.exists(p):
                im.paste(label(Image.open(p).convert('RGB').resize((C, C)), ('%s %s' % (pre, n))[:30]), (i * C, r * (C + 6)))
    im.save(os.path.join(out, 'zoe-slim-ingame-crops-before-after.jpg'), quality=88)
    print('zoe crops', names)
