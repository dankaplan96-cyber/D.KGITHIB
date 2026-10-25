#!/usr/bin/env python3
"""Side-by-side video from two capture.mjs frame folders (frames f_<t>.jpg taken every 1/fps of scene time):
   python3 sbs.py <before_dir> <after_dir> <out.mp4> <fps> [label_before label_after]
Pairs the frames by scene time, labels each half with its build and the scene time, and encodes H.264 at `fps`
frames a second (= normal speed when the captures stepped 1/fps of scene time per frame). No sound: the captures
have none."""
import glob, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

bd, ad, out, fps = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
lb, la = (sys.argv[5], sys.argv[6]) if len(sys.argv) > 6 else ('before', 'after')
def frames(d):
    return {round(float(os.path.basename(f)[2:8]) * fps): f for f in glob.glob(os.path.join(d, 'f_*.jpg'))}
B, A = frames(bd), frames(ad)
keys = sorted(set(B) & set(A))
tmp = tempfile.mkdtemp()
for n, k in enumerate(keys):
    b, a = Image.open(B[k]), Image.open(A[k])
    w, h = b.size
    im = Image.new('RGB', (w * 2 + 4, h), (0, 0, 0))
    im.paste(b, (0, 0)); im.paste(a.resize((w, h)), (w + 4, 0))
    d = ImageDraw.Draw(im)
    for x, lab in ((6, lb), (w + 10, la)):
        d.rectangle((x - 2, 2, x + 7 * len(lab) + 70, 16), fill=(0, 0, 0))
        d.text((x, 4), f'{lab}  t={k / fps:5.2f}', fill=(255, 230, 120))
    im.save(os.path.join(tmp, f'{n:05d}.jpg'), quality=88)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', os.path.join(tmp, '%05d.jpg'),
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', out], check=True)
print(out, len(keys), 'frames', f'{len(keys) / fps:.1f} s')
