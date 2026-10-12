# Lists every file the game loads, as a JSON map {published path: source path} for publishing (and packaging).
#   python3 tools/publish-files.py > files.json
#
# Follows the ES-module imports from src/main.js (relative paths, 'three' and 'three/addons/...', including
# three's own relative imports such as build/three.core.min.js), then adds what is fetched at run time:
# the stylesheet, the character models, the music and the geometry bake (published as assets/bake.wasm,
# because artifact hosting serves only web media types; the page sets window.LBA_BAKE_URL accordingly).
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SPEC = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"\n]+)['"]""")


def resolve(spec, here):
    if spec == 'three':
        return 'vendor/three/build/three.module.min.js'
    if spec.startswith('three/addons/'):
        return 'vendor/three/addons/' + spec[len('three/addons/'):]
    if spec.startswith('./') or spec.startswith('../'):
        return os.path.normpath(os.path.join(os.path.dirname(here), spec))
    return None


files, todo, seen = {}, ['src/main.js'], set()
while todo:
    p = todo.pop()
    if p in seen:
        continue
    seen.add(p)
    if not os.path.exists(p):
        sys.exit(f'missing module: {p}')
    files[p] = p
    for m in SPEC.findall(open(p, encoding='utf-8').read()):
        r = resolve(m, p)
        if r:
            todo.append(r)
for pat in ['css/*.css', 'assets/poly/*.json', 'assets/music/*.mp3', 'assets/music/manifest.json']:
    for p in sorted(glob.glob(pat)):
        files[p] = p
files['assets/bake.wasm'] = 'assets/bake.bin'
json.dump(dict(sorted(files.items())), sys.stdout, indent=0)
print(f'{len(files)} files, {sum(os.path.getsize(v) for v in files.values()) / 1e6:.1f} MB', file=sys.stderr)
