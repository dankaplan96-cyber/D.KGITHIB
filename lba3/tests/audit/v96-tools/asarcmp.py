import json, struct, sys, hashlib, os
f = open(sys.argv[1], 'rb')
f.read(8)
struct.unpack('<I', f.read(4))
slen = struct.unpack('<I', f.read(4))[0]
h = json.loads(f.read(slen))
out = {}
def walk(node, p):
    for k, v in node.get('files', {}).items():
        q = p + '/' + k if p else k
        if 'files' in v:
            walk(v, q)
        else:
            out[q] = v
walk(h, '')
root = '/dev/shm/t986'
mism, nohash, ok = [], 0, 0
for q, v in out.items():
    if not q.startswith('game/') or q in ('game/index.html', 'game/icon.png'):
        continue
    src = os.path.join(root, q[5:])
    ih = v.get('integrity', {}).get('hash')
    if not ih:
        nohash += 1
        continue
    if not os.path.exists(src):
        mism.append('NOFILE ' + q)
        continue
    b = open(src, "rb").read()
    if hashlib.sha256(b).hexdigest() != ih and hashlib.sha256(b.replace(b"\n", b"\r\n")).hexdigest() != ih:
        mism.append(q)
    else:
        ok += 1
print('matched', ok, 'nohash', nohash, 'mismatch', len(mism), mism[:20])
