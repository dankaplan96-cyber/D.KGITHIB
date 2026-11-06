# HOUSE-FIX review sheets: BEFORE | AFTER rows from before/ and after/ (cd scratch dir; python3 sheets.py <outdir>)
import sys
from PIL import Image, ImageDraw
OUT = sys.argv[1].rstrip('/') + '/'
W, H = 640, 360
def label(d, x, y, t):
    d.rectangle((x, y, x + 8 + 6 * len(t), y + 18), fill='black'); d.text((x + 5, y + 4), t, fill='white')
def pair(rows, out):
    sheet = Image.new('RGB', (2 * W, H * len(rows)))
    d = ImageDraw.Draw(sheet)
    for i, (bp, ap, cap) in enumerate(rows):
        bp = bp if '.' in bp else f'before/b-{bp}.jpg'; ap = ap if '.' in ap else f'after/a-{ap}.jpg'
        sheet.paste(Image.open(bp).convert('RGB').resize((W, H)), (0, H * i)); sheet.paste(Image.open(ap).convert('RGB').resize((W, H)), (W, H * i))
        label(d, 0, H * i, 'BEFORE  ' + cap); label(d, W, H * i, 'AFTER')
    sheet.save(OUT + out, quality=82)
v = lambda n, cap: (n, n, cap)
pair([v('elev-west-reading', 'reading room, west wall'), v('close-reading', 'reading corner'), v('play-reading', 'play camera')], '01-reading-window-bookcases.jpg')
pair([v('close-bed', 'family room bed'), v('play-bed', 'play camera')], '02-family-bed-headboard.jpg')
pair([v('close-arthurbed', "Arthur's bed"), v('play-arthur', 'play camera')], '03-arthur-bed-headboard.jpg')
pair([v('close-sink', 'dresser, curtain, Dino-Fly painting'), v('elev-north-family', 'family room north wall')], '04-dresser-curtain-paintings.jpg')
pair([v('elev-north-arthur', "Arthur's room north wall: desk")], '05-arthur-desk-curtain.jpg')
pair([v('close-sideboard', 'hall: dresser / portrait'), v('elev-east-hall', 'hall, east side'), v('play-door', 'play camera at the door')], '06-hall-sideboard-portrait-coatstand.jpg')
pair([v('close-toychest', 'toy chest, plush Dino-Fly'), v('elev-south-toys', 'toy corner')], '07-plush-toychest.jpg')
pair([v('play-c1', 'cellar, play camera'), v('elev-c-north', 'cellar north: radio on the sideboard'), v('elev-c-west', 'cellar west: Dino-Fly poster')], '08-cellar-radio-poster.jpg')
pair([v('top-all', 'whole house, overhead'), v('top-family', 'family room, overhead'), v('top-hall', 'hall and reading room, overhead')], '09-overhead.jpg')
pair([v('play-family', 'play camera, family room'), v('play-hall', 'play camera, hall'), v('play-zoe', "play camera, Zoe's corner")], '10-play-camera.jpg')
pair([v('close-zoe', "Zoe's corner (unchanged)"), v('close-bench', "Arthur's bench (unchanged)"), v('close-trunk', 'trunk, mend box, meter (unchanged)'), v('close-stove', 'stove, firewood giver, cupboard (unchanged)')], '11-unchanged-spots.jpg')
pair([('probe-before.jpg', 'probe-after.jpg', 'reading room to hall doorway, walked through')], '13-reading-doorway-stairwell.jpg')
