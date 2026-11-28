# ANIM-COMBAT: a side-by-side clip (before | after) from two cap.mjs captures of the same sequence, at the capture's
# own shot rate (60 fps captures shoot every 2nd step: 30 fps clips, real time). Needs ffmpeg.
# usage: python3 mkclip.py <before dir> <after dir> <seq> <out.mp4> [scratch dir]
import json, os, subprocess, sys
from PIL import Image, ImageDraw
b, a, seq, out = sys.argv[1:5]
tmp = sys.argv[5] if len(sys.argv) > 5 else os.path.dirname(out) + '/.frames'
os.makedirs(tmp, exist_ok=True)
def shots(d):
    S = json.load(open(f'{d}/{seq}.json'))
    return [s for s in S['samples'] if 'shot' in s], S['fps']
B, fps = shots(b); A, _ = shots(a)
n = min(len(B), len(A))
for i in range(n):
    im = Image.new('RGB', (440, 270), (24, 24, 28)); dr = ImageDraw.Draw(im)
    for k, (s, d, lab) in enumerate([(B[i], b, 'before'), (A[i], a, 'after')]):
        im.paste(Image.open(f'{d}/{seq}-{s["shot"]:03d}.png').convert('RGB'), (k * 220, 20))
        ev = ('REL ' if s.get('thr', {}) and s['thr']['released'] else '') + (f'{s["move"]["key"]} {s["move"]["t"]:.2f}' + (' HIT' if s['move']['hits'] else '') if s.get('move') else '')
        dr.text((k * 220 + 4, 4), f'{lab} {s["t"]:.2f}s {s["anim"]} {ev}', fill=(255, 255, 255))
    im.save(f'{tmp}/f{i:04d}.png')
rate = fps / max(1, (B[1]['shot'] - B[0]['shot']) if n > 1 else 1)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(rate), '-i', f'{tmp}/f%04d.png', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', out], check=True)
for f in os.listdir(tmp): os.remove(f'{tmp}/{f}')
os.rmdir(tmp)
print(out, n, 'frames at', rate, 'fps')
