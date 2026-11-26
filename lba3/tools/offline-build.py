# Builds one self-contained HTML file of the game that opens straight from disk (double-click, file://).
#   python3 tools/offline-build.py <out.html> [--no-music]
#
# A browser won't load the game's ~130 separate files from a file:// page (ES modules and fetch() are blocked
# there), so everything goes inside the page:
#   - every JS module (the game, three.js and the addons it uses) becomes a data: URL in an import map; each
#     module's imports are rewritten to bare "@lba/<path>" names, so relative paths never need a base URL;
#   - the assets (character models, the geometry bake, the music) are stored as base64 text blocks (models
#     and bake gzipped), and a small fetch() shim answers the game's requests for them from those blocks;
#   - the stylesheet is inlined. (The web font is still requested from Google; offline it falls back.)
import base64
import glob
import gzip
import json
import os
import re
import sys

out = sys.argv[1]
music = '--no-music' not in sys.argv

SPEC = re.compile(r"""(\bfrom\s*|\bimport\s*\(?\s*)(['"])([^'"\n]+)\2""")


def resolve(spec, here):
    if spec == 'three':
        return 'vendor/three/build/three.module.min.js'
    if spec.startswith('three/addons/'):
        return 'vendor/three/addons/' + spec[len('three/addons/'):]
    if spec.startswith('./') or spec.startswith('../'):
        return os.path.normpath(os.path.join(os.path.dirname(here), spec))
    return None


modules, todo = {}, ['src/main.js']
while todo:
    path = todo.pop()
    if path in modules:
        continue
    src = open(path, encoding='utf-8').read()

    def sub(m):
        target = resolve(m.group(3), path)
        if target is None:
            return m.group(0)
        todo.append(target)
        return f'{m.group(1)}{m.group(2)}@lba/{target}{m.group(2)}'
    modules[path] = SPEC.sub(sub, src)

imports = {f'@lba/{p}': 'data:text/javascript;base64,' + base64.b64encode(s.encode('utf-8')).decode('ascii')
           for p, s in modules.items()}

assets = {}  # request path -> (bytes, gzipped)
for p in sorted(glob.glob('assets/poly/*.json')):
    assets[p] = (gzip.compress(open(p, 'rb').read(), 9), True)
assets['assets/bake.bin'] = (gzip.compress(open('assets/bake.bin', 'rb').read(), 9), True)
if music:
    for p in sorted(glob.glob('assets/music/*')):
        assets[p] = (open(p, 'rb').read(), False)
else:
    assets['assets/music/manifest.json'] = (b'{"tracks":{}}', False)

src = open('index.html', encoding='utf-8').read()
css = open('css/style.css', encoding='utf-8').read()
src = src.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
src = re.sub(r'<script type="importmap">.*?</script>',
             lambda m: '<script type="importmap">' + json.dumps({'imports': imports}) + '</script>', src, flags=re.S)
shim = '''<script>
// assets live in <script type="text/plain" data-asset> blocks below; answer the game's fetch() from them
(() => {
  const real = window.fetch.bind(window);
  const bytes = (b64) => { const s = atob(b64), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const key = decodeURIComponent(url.replace(/^\\.\\//, '').replace(/^.*?(assets\\/)/, '$1'));
    const el = document.querySelector(`script[data-asset="${key}"]`);
    if (!el) return real(input, init);
    const blob = new Blob([bytes(el.textContent.trim())]);
    const body = el.dataset.gz ? blob.stream().pipeThrough(new DecompressionStream('gzip')) : blob;
    return Promise.resolve(new Response(body, { status: 200 }));
  };
})();
</script>'''
src = src.replace('<script type="importmap">', shim + '\n  <script type="importmap">', 1)
src = src.replace('<script type="module" src="src/main.js"></script>', '<script type="module">import "@lba/src/main.js";</script>')
blocks = ''.join(f'<script type="text/plain" data-asset="{p}"{" data-gz=1" if gz else ""}>{base64.b64encode(b).decode("ascii")}</script>\n'
                 for p, (b, gz) in assets.items())
src = src.replace('</body>', blocks + '</body>')
open(out, 'w', encoding='utf-8').write(src)
print(f'{out}: {len(modules)} modules, {len(assets)} assets, {os.path.getsize(out) / 1e6:.1f} MB')
