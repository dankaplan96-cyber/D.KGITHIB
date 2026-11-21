#!/usr/bin/env python3
"""R5-OPENING: reads capture.mjs's log.json and prints the per-item measures.
   python3 analyze.py <log.json> [section ...]     sections: hand feet gaze faces ceil (default: all)
hand   Zoé's right hand at the tap (gap to the handle) and in the stream (gap to the axis, vertices in the water)
feet   ankle slide while a foot is planted (each actor, each foot), grouped into events, at 30 fps
gaze   head forward vs the look target, per actor and look period
faces  on picture frames: faces cut by the frame's top, hidden behind the set, or turned away, per shot
ceil   the part of each house shot taken by the ceiling (downward-facing surfaces over 2 m) and by anything over 2.5 m
"""
import json, math, sys
from collections import defaultdict

log = json.load(open(sys.argv[1]))
want = set(sys.argv[2:]) or {'hand', 'feet', 'gaze', 'faces', 'ceil'}

TAP = [(41.0, 44.7), (58.0, 60.15), (69.0, 70.35)]
STREAM = [(60.0, 62.05)]

def inwin(t, wins):
    return any(a <= t <= b for a, b in wins)

if 'hand' in want:
    print('== hand (Zoé, right) ==')
    for a, b in TAP:
        rows = [r for r in log if a <= r['t'] <= b and 'zh' in r]
        if not rows: continue
        on = [r for r in rows if r['zh']['dHandle'] <= 0.02]
        print(f'tap {a:.2f}-{b:.2f}: frames {len(rows)}, on the handle (<=2 cm) {len(on)}; dHandle min {min(r["zh"]["dHandle"] for r in rows):.3f}'
              f' median {sorted(r["zh"]["dHandle"] for r in rows)[len(rows)//2]:.3f}; while the handle turns:')
        turning = [r for r in rows if abs(r['zh']['handleY']) > 0.02 and abs(r['zh']['handleY']) < 2.18]
        if turning:
            print(f'   handle moving: {len(turning)} frames, on the handle {sum(1 for r in turning if r["zh"]["dHandle"] <= 0.02)}, worst {max(r["zh"]["dHandle"] for r in turning):.3f}'
                  f' at {max(turning, key=lambda r: r["zh"]["dHandle"])["t"]}')
        for r in rows[::6]:
            z = r['zh']; print(f'   {r["t"]:6.2f} dH {z["dHandle"]:.3f} dS {z["dStream"]:.3f} tip {z["tip"]} low {z["low"]:.3f} hY {z["handleY"]:.2f} anim {r["a"]["zoe"]["anim"]}')
    for a, b in STREAM:
        rows = [r for r in log if a <= r['t'] <= b and 'zh' in r]
        if not rows: continue
        wet = [r for r in rows if r['zh']['stream'] and r['zh']['inStream'] > 0]
        print(f'stream {a:.2f}-{b:.2f}: frames {len(rows)}, fingers in the water {len(wet)}; dStream median {sorted(r["zh"]["dStream"] for r in rows)[len(rows)//2]:.3f}; lowest vertex {min(r["zh"]["low"] for r in rows):.3f}')
        for r in rows[::6]:
            z = r['zh']; print(f'   {r["t"]:6.2f} dS {z["dStream"]:.3f} in {z["inStream"]} tip {z["tip"]} low {z["low"]:.3f}')

if 'feet' in want:
    print('== feet: planted-foot slide, standing (not walking): a contact patch (the same sole vertices, on the floor) moving; else the ankle ==')
    ids = sorted({k for r in log for k in r['a']})
    for aid in ids:
        for fi, side in enumerate('LR'):
            seq = [(r['t'], r['a'][aid], r['room'], r['fade']) for r in log if aid in r['a']]
            use_sole = any('soles' in a for _, a, _, _ in seq)
            hs = sorted(a['feet'][fi][1] for _, a, _, _ in seq)
            base = hs[len(hs) // 20] if hs else 0
            events, cur, pops, sink = [], None, [], []
            for (t0, a0, rm0, fd0), (t1, a1, rm1, fd1) in zip(seq, seq[1:]):
                if rm0 != rm1 or fd1 or not a1['vis'] or t1 - t0 > 0.05 or a1['anim'] in ('walk', 'run'): cur = None; continue
                # an ankle that jumps while standing: a pop
                da = math.hypot(a1['feet'][fi][0] - a0['feet'][fi][0], a1['feet'][fi][2] - a0['feet'][fi][2])
                if da > 0.06 and not a1['anim'].startswith('kneel'): pops.append((t1, da))
                if use_sole and 'soles' in a0 and 'soles' in a1:
                    p0, p1 = a0['soles'][fi], a1['soles'][fi]
                    if p1[4] < -0.015: sink.append((t1, p1[4]))
                    # the same contact patch (the same vertices) on the floor in both frames
                    planted = p0[3] and p0[3] == p1[3]
                    d = math.hypot(p1[0] - p0[0], p1[2] - p0[2]) if planted else 0
                if planted and d > 0.004:
                    if cur and t0 - cur['t1'] < 0.1: cur['t1'] = t1; cur['d'] += d; cur['anims'].add(a1['anim']); cur['max'] = max(cur['max'], d)
                    else:
                        cur = {'t0': t0, 't1': t1, 'd': d, 'anims': {a1['anim']}, 'max': d}; events.append(cur)
                elif cur and t0 - cur['t1'] >= 0.1: cur = None
            big = [e for e in events if e['d'] > 0.03]
            out = []
            if big: out.append('slide ' + '; '.join(f'{e["t0"]:.2f}-{e["t1"]:.2f} {e["d"]*100:.0f} cm ({"/".join(sorted(e["anims"]))}, max {e["max"]*100:.1f} cm/frame)' for e in big))
            if pops: out.append('ankle jumps ' + ', '.join(f'{t:.2f} {d*100:.0f} cm' for t, d in pops[:6]))
            if sink: out.append(f'sole under the floor >1.5 cm: {len(sink)} frames, deepest {min(x for _, x in sink)*100:.1f} cm at {min(sink, key=lambda x: x[1])[0]:.2f}')
            if out: print(f'{aid} {side} ({"sole" if use_sole else "ankle"}): ' + ' | '.join(out))
    # walking: the stance foot's contact patch against the floor
    print('-- walking: contact-patch slide per frame while a foot is planted --')
    for aid in ids:
        seq = [(r['t'], r['a'][aid], r['room'], r['fade']) for r in log if aid in r['a']]
        n, tot, worst = 0, 0, (0, 0)
        for (t0, a0, rm0, fd0), (t1, a1, rm1, fd1) in zip(seq, seq[1:]):
            if a1['anim'] != 'walk' or a0['anim'] != 'walk' or rm0 != rm1 or fd1 or t1 - t0 > 0.05 or 'soles' not in a0 or 'soles' not in a1: continue
            for fi in (0, 1):
                p0, p1 = a0['soles'][fi], a1['soles'][fi]
                if p0[3] and p0[3] == p1[3]:
                    d = math.hypot(p1[0] - p0[0], p1[2] - p0[2]); n += 1; tot += d
                    if d > worst[0]: worst = (d, t1)
        if n: print(f'{aid}: {n} planted foot-frames while walking, mean {tot/n*100:.2f} cm/frame, worst {worst[0]*100:.1f} cm at {worst[1]:.2f}')

if 'gaze' in want:
    print('== gaze (deg between head forward and the look target) ==')
    for aid in ('zoe', 'twinsen', 'arthur', 'worker', 'resident'):
        cur = None; spans = []
        for r in log:
            a = r['a'].get(aid)
            if not a or 'gaze' not in a or r['fade']: cur = None; continue
            if cur and r['t'] - cur['t1'] < 0.05 and a.get('look') == cur['look']: cur['t1'] = r['t']; cur['g'].append(a['gaze'])
            else: cur = {'t0': r['t'], 't1': r['t'], 'g': [a['gaze']], 'look': a.get('look')}; spans.append(cur)
        for s in spans:
            g = s['g'][len(s['g']) // 3:]   # (after the head has had time to get there)
            if not g: continue
            print(f'{aid} {s["t0"]:.2f}-{s["t1"]:.2f} at {s["look"]}: settled median {sorted(g)[len(g)//2]:.0f}, max {max(g):.0f}')

if 'faces' in want:
    print('== faces on picture frames ==')
    per = defaultdict(lambda: defaultdict(list))
    for r in log:
        if r['fade']: continue
        for aid, a in r['a'].items():
            f = a.get('face')
            if not f or f['behind'] or f['d'] > 15 or abs(f['c'][0]) > 1 or abs(f['c'][1]) > 1: continue
            per[r['shot']][aid].append((r['t'], f))
    for shot in sorted(per):
        for aid, fs in per[shot].items():
            cut = [t for t, f in fs if f['top'] > 1.0]
            hid = [t for t, f in fs if f.get('hidden')]
            away = [t for t, f in fs if f['front'] < -0.2]
            under = [t for t, f in fs if f['chin'] < -0.62]   # (in the subtitle's band at the bottom)
            ys = [f['c'][1] for t, f in fs]
            print(f'shot {shot:2d} {aid:9s} frames {len(fs):3d} faceY {min(ys):+.2f}..{max(ys):+.2f}  crown cut {len(cut)}'
                  + (f' ({cut[0]:.1f}-{cut[-1]:.1f})' if cut else '') + f'  hidden {len(hid)}' + (f' ({hid[0]:.1f}-{hid[-1]:.1f} {fs[0][1].get("hidden")})' if hid else '')
                  + f'  back to lens {len(away)}' + (f' ({away[0]:.1f}-{away[-1]:.1f})' if away else '') + f'  low (subtitle band) {len(under)}')

if 'ceil' in want:
    print('== ceiling share per house shot (picture frames) ==')
    per = defaultdict(list)
    for r in log:
        if 'ceil' in r and not r['fade']: per[r['shot']].append(r)
    for shot in sorted(per):
        rs = per[shot]
        m = lambda k: sum(r['ceil'].get(k, 0) for r in rs) / len(rs)
        print(f'shot {shot:2d} {rs[0]["t"]:6.2f}-{rs[-1]["t"]:6.2f}: ceiling {m("down")*100:4.1f}% of frame (top half {m("topHalf")*100:4.1f}%), over 2.5 m {m("high")*100:4.1f}%, outside the set (black) {m("void")*100:4.1f}%')
