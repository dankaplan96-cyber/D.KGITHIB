"""Compose ARTHUR-12 evidence sheets (JPG) from raw captures.
usage: python3 -I sheets.py <scratch dir> <review dir>"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

S, R = sys.argv[1], sys.argv[2]
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except OSError:
    F = ImageFont.load_default()


def lab(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 12 + 13 * len(text), 34], fill=(20, 20, 24))
    d.text((8, 5), text, fill=(255, 255, 255), font=F)
    return im


def stack(paths, labels, out, horiz=False, scale=1.0):
    ims = [Image.open(p).convert('RGB') for p in paths]
    ims = [im.resize((int(im.width * scale), int(im.height * scale))) for im in ims]
    ims = [lab(im, t) for im, t in zip(ims, labels)]
    if horiz:
        W, H = sum(i.width for i in ims), max(i.height for i in ims)
        sheet = Image.new('RGB', (W, H), (0, 0, 0)); x = 0
        for i in ims: sheet.paste(i, (x, 0)); x += i.width
    else:
        W, H = max(i.width for i in ims), sum(i.height for i in ims)
        sheet = Image.new('RGB', (W, H), (0, 0, 0)); y = 0
        for i in ims: sheet.paste(i, (0, y)); y += i.height
    sheet.save(os.path.join(R, out), quality=86)
    print(out, sheet.size)


def crop(path, box, out_path, size=None):
    im = Image.open(path).convert('RGB').crop(box)
    if size: im = im.resize(size)
    im.save(out_path)
    return out_path


j = lambda *a: os.path.join(*a)
# 1. lookdev line-up, same light: front / three-quarter / side, before over after
stack([j(S, 'before-lineup.png'), j(S, 'after-lineup.png')], ['BEFORE  (0.62 kid template)', 'AFTER  ARTHUR-12 (twelve)'], '01-lineup-front-34-side.jpg', scale=0.8)
stack([j(S, 'before-head.png'), j(S, 'after-head.png')], ['BEFORE head: front / 3-4 / side', 'AFTER head'], '02-head-front-34-side.jpg', scale=0.8)
stack([j(S, 'before-game.png'), j(S, 'after-game.png')], ['BEFORE  game camera (13.4 m, 38 deg)', 'AFTER'], '03-gamecam-lineup.jpg', horiz=True, scale=0.6)
# 4. in-game, the house in the game's own camera: the family standing; Arthur at his boat (crops of the play view)
for tag in ('before', 'after'):
    crop(j(R, tag + '-house-family-standing.png'), (430, 230, 830, 530), j(S, tag + '-fam-crop.png'), (800, 600))
    crop(j(R, tag + '-house-boat-spot.png'), (480, 220, 880, 520), j(S, tag + '-boat-crop.png'), (800, 600))
stack([j(S, 'before-fam-crop.png'), j(S, 'after-fam-crop.png')], ['BEFORE  house, game camera (2x crop)', 'AFTER'], '04-house-family-standing.jpg', horiz=True)
stack([j(S, 'before-boat-crop.png'), j(S, 'after-boat-crop.png')], ['BEFORE  at his boat (2x crop)', 'AFTER'], '05-house-boat-spot.jpg', horiz=True)
stack([j(R, 'before-house-family-standing.png'), j(R, 'after-house-family-standing.png')], ['BEFORE  house, full play view', 'AFTER'], '06-house-full-view.jpg', horiz=True, scale=0.5)
# 7.. the opening, same frames
for n, (name, title) in enumerate([('op-29s-family', '29.6 s home: over his shoulder'), ('op-32s-arthur-close', '32.3 s "Dad! The mast fits!" close-up'),
                                   ('op-34s-over-shoulder', '34.2 s over his shoulder to his father'), ('op-49s-twinsen-arthur-behind', '49.5 s Twinsen, Arthur behind'),
                                   ('op-54s-all-look-up', '54.3 s all three look up'), ('op-56s-arthur-close2', '56.5 s his close-up, second line')]):
    stack([j(R, 'before-' + name + '.png'), j(R, 'after-' + name + '.png')], ['BEFORE ' + title, 'AFTER'], '%02d-opening-%s.jpg' % (7 + n, name[3:]), horiz=True, scale=0.5)
# 13. poses (after): idle, walk, run, talk, kneelWork, kneelShow, kneelLook at three-quarter and side
poses = ['idle', 'walk', 'run', 'talk', 'kneelWork', 'kneelShow', 'kneelLook']
stack([j(S, 'fpose-%s.png' % p) for p in poses], poses, '13-poses-after.jpg', horiz=True, scale=0.62)
stack([j(S, 'fgrey-walk.png'), j(S, 'fgrey-kneel.png')], ['grey: walk (3-4 / side / front)', 'grey: kneelShow (arm raised, knees 2.3 rad)'], '14-deformation-grey.jpg', scale=0.8)
