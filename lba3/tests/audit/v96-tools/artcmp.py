import json, sys, hashlib, os, subprocess
d = json.load(open(sys.argv[1]))
t = ''.join(x['text'] for x in d)
j = json.loads(t[t.find('{"files"'):])
files = j['files']
print('artifact files', len(files), 'total MB', round(sum(f.get('size', 0) for f in files) / 1e6, 1))
print({k: v for k, v in j.items() if k != 'files'})
os.chdir('/dev/shm/t986')
gf = json.loads(subprocess.check_output(['node', 'tools/game-files.mjs']))
paths = {f['path']: f for f in files}
extra = [p for p in paths if p not in gf]
missing = [p for p in gf if p not in paths]
print('in artifact not in game-files:', len(extra), extra)
print('in game-files not in artifact:', missing)
diff = []
for p, f in paths.items():
    src = gf.get(p, p)
    if p == 'index.html':
        continue
    if os.path.exists(src) and 'sha256' in f:
        h = hashlib.sha256(open(src, 'rb').read()).hexdigest()
        if h != f['sha256']:
            diff.append(p)
    elif 'sha256' in f:
        diff.append('NOFILE ' + p)
print('hash mismatches vs commit snapshot:', len(diff), diff[:40])
bs = paths.get('src/build-stamp.js')
print('build-stamp entry', bs)
