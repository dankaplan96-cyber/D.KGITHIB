// ARRIVAL-2 probe: what a texture array's creation costs, by part (the data copy, three's upload by GL call), for the
// world's array sizes, whole and in layer groups (layerUpdates; mipmaps only on the last group). REPS=3
import { launch, open } from '/home/user/D.KGITHIB/.claude/worktrees/agent-a9cb06280a984a6cd/lba3/tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
const out = await ev(async (reps) => {
  const THREE = await import('three');
  const R = game.renderer.renderer, gl = R.getContext(), T = {};
  for (const fn of ['texStorage3D', 'texSubImage3D', 'texImage3D', 'generateMipmap', 'texParameteri', 'pixelStorei', 'bindTexture']) { const f = gl[fn].bind(gl); gl[fn] = (...a) => { const t = performance.now(); const r = f(...a); T[fn] = (T[fn] || 0) + performance.now() - t; return r; }; }
  const sync = () => { const t = performance.now(); const px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return +(performance.now() - t).toFixed(1); };
  const res = [];
  const mk = (data, w, h, n) => { const tex = new THREE.DataArrayTexture(data, w, h, n); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.flipY = false; tex.unpackAlignment = 4; tex.needsUpdate = true; return tex; };
  for (let r = 0; r < reps; r++) for (const [w, h, n] of [[512, 512, 13], [256, 256, 41], [128, 128, 36]]) {
    const big = new Uint8Array(w * h * 4 * n * 2); for (let i = 0; i < big.length; i += 97) big[i] = i & 255;
    sync();
    let t = performance.now(); const data = big.slice(0, w * h * 4 * n); const tCopy = performance.now() - t;
    for (const k in T) delete T[k];
    t = performance.now(); const tex = mk(data, w, h, n); R.initTexture(tex); const tInit = performance.now() - t; const gW = { ...T }; const s1 = sync();
    tex.dispose();
    // in groups of G layers: the first allocates (with mipmaps), the middle ones without, the last with
    const G = Math.max(1, Math.ceil(n / 4)), parts = [];
    const tex2 = mk(data.slice(), w, h, n);
    for (let a = 0; a < n; a += G) {
      for (const k in T) delete T[k];
      const first = a === 0, last = a + G >= n;
      tex2.generateMipmaps = first || last;
      for (let l = a; l < Math.min(n, a + G); l++) tex2.addLayerUpdate(l);
      tex2.needsUpdate = true;
      t = performance.now(); R.initTexture(tex2); const dt = performance.now() - t; const s = sync();
      parts.push({ ms: +dt.toFixed(1), sync: s, gl: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(1)])) });
    }
    tex2.dispose();
    res.push({ size: `${w}x${h}x${n}`, MB: +(data.length / 1048576).toFixed(1), copy: +tCopy.toFixed(1), init: +tInit.toFixed(1), gl: Object.fromEntries(Object.entries(gW).map(([k, v]) => [k, +v.toFixed(1)])), syncAfter: s1, groups: parts });
  }
  return res;
}, +(process.env.REPS || 3));
for (const r of out) console.log(JSON.stringify(r));
await browser.close();
