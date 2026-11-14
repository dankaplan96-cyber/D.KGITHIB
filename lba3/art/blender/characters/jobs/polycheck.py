# python polycheck.py <look> <baseline.json> <candidate.json> <skeletons.json> <characters.js>
# The game's poly contract, candidate against baseline: bones (names, order) = the skeleton's, eyes and mouths entries,
# weights per vertex (<= 4, sum 1, every index a bone), triangles (+%), vertex colours (each a colour the baseline had,
# or listed as new), the feet (lowest point), and what changed by colour (how many triangles of each colour).
import json, sys, collections
look, A, Bf, SK, CJS = sys.argv[1:6]
a, b = json.load(open(A)), json.load(open(Bf))
sk = json.load(open(SK))[look]['bones']
out = {}
out['bones_equal_baseline'] = a['bones'] == b['bones']
out['bones_in_skeleton'] = all(n in sk for n in b['bones'])
out['eyes_equal'] = a['eyes'] == b['eyes']
out['mouths_equal'] = a['mouths'] == b['mouths']
nv = len(b['pos']) // 3
si, sw = b['si'], b['sw']
k = len(si) // nv
bad_sum = sum(1 for i in range(nv) if abs(sum(sw[i * k:(i + 1) * k]) - 1) > 1e-3)
bad_ix = sum(1 for x in si if x < 0 or x >= len(b['bones']))
out['weights_per_vertex'] = k
out['weights_not_summing_to_1'] = bad_sum
out['bad_bone_index'] = bad_ix
ta, tb = len(a['pos']) // 9, len(b['pos']) // 9
out['body_tris'] = [ta, tb, round(100 * (tb - ta) / ta, 1)]
out['total_tris_incl_eyes_mouth_baseline'] = a.get('tris')
out['total_tris_incl_eyes_mouth_candidate'] = b.get('tris')
cols = lambda d: collections.Counter(tuple(d['col'][i:i + 3]) for i in range(0, len(d['col']), 9))
ca, cb = cols(a), cols(b)
out['new_colours'] = ['#%02x%02x%02x' % c for c in cb if c not in ca]
out['tris_by_colour_changed'] = {'#%02x%02x%02x' % c: [ca.get(c, 0), cb.get(c, 0)] for c in set(ca) | set(cb) if ca.get(c, 0) != cb.get(c, 0)}
ys = b['pos'][1::3]
out['lowest_y'] = [round(min(a['pos'][1::3]), 4), round(min(ys), 4)]
out['top_y'] = [round(max(a['pos'][1::3]), 4), round(max(ys), 4)]
print(json.dumps(out, indent=1))
