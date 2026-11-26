# ANIM-POLISH: a per-frame table of a cap.mjs capture (feet: height above the ground in cm, ground speed m/s, plant state).
# usage: python3 table.py <dir> <seq> [from_s] [to_s] [every]
import json, sys, math
d, seq = sys.argv[1], sys.argv[2]
t0 = float(sys.argv[3]) if len(sys.argv) > 3 else 0
t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 99
ev = int(sys.argv[5]) if len(sys.argv) > 5 else 1
S = json.load(open(f'{d}/{seq}.json'))['samples']
print(' t      anim     spd   ang°   hipsUp | footL up  v  | footR up  v  | plant         | knL   knR   | extra')
for i, s in enumerate(S):
    if s['t'] < t0 or s['t'] > t1 or i % ev: continue
    p = S[i - 1] if i else s
    row = f"{s['t']:.3f} {s['anim'][:8]:8s} {s['speed']:5.2f} {math.degrees(s['angle']):6.1f} {s['hips'][1]-s['pos'][1]:.3f} |"
    for k in ('footL', 'footR'):
        f, fp = s[k], p[k]
        v = math.hypot(f[0] - fp[0], f[2] - fp[2]) / s['dt']
        row += f" {100*(f[1]-s['ground']):5.1f} {v:4.2f} |"
    row += f" {str(s['plant']):13s} | {s['rot']['knL'][0]:.2f} {s['rot']['knR'][0]:.2f} |"
    if s.get('move'): row += f" {s['move']['key']} t{s['move']['t']:.3f} hits{s['move']['hits']}"
    if s.get('landT'): row += f" landT {s['landT']} S{s['landS']}"
    if not s['onGround']: row += f" air vy {s['vy']}"
    print(row)
