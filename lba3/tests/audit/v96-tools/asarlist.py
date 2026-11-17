import json, struct, sys
f = open(sys.argv[1], 'rb')
f.read(8)
hsize = struct.unpack('<I', f.read(4))[0]
slen = struct.unpack('<I', f.read(4))[0]
h = json.loads(f.read(slen))
out = []
def walk(node, p):
    for k, v in node.get('files', {}).items():
        q = p + '/' + k if p else k
        if 'files' in v:
            walk(v, q)
        else:
            out.append((q, v.get('size', 0)))
walk(h, '')
print('files', len(out))
game = [x for x in out if x[0].startswith('game/')]
print('game files', len(game))
for d in ['game/assets/voice2', 'game/assets/voice/', 'game/src/game/text/he/', 'game/assets/lba1', 'game/assets/lba2', 'game/src/game/he-text.js', 'game/src/build-stamp.js']:
    print(d, sum(1 for x in game if x[0].startswith(d)))
idx = [x for x in out if x[0] == 'game/index.html']
print(idx)
