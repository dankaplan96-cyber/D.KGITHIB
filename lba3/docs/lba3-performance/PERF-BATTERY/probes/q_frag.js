(async () => {
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 80; i++) { route.drive((i + 1) / 30, 1 / 30); G.frame(1 / 30, i > 70); }
  const catOf = (o) => {
    if (o.name === 'drawBatch') return 'drawBatch';
    if (o.name === 'lodBatch') return 'trees';
    if (o.isSkinnedMesh) return 'characters';
    if (o.name === 'terrain' || o.parent?.name === 'terrain') return 'terrain';
    if (o.material?.isShaderMaterial) return 'shader';
    if (o.isInstancedMesh) return o.material?.side === 2 ? 'grass/flowers' : 'instanced';
    return 'other meshes';
  };
  const Wt = 683, Ht = 384, T = new THREE.WebGLRenderTarget(Wt, Ht, { depthBuffer: true });
  const mk = (g) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1 / 255, g / 255, 0), blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, toneMapped: false, depthWrite: true, fog: false });
  const A = mk(0), B = mk(1);
  const cats = new Set(); G.scene.traverseVisible((o) => { if (o.isMesh) cats.add(catOf(o)); });
  const res = {};
  const comp = G.renderer.composer, cr = comp.render;
  for (const c of [...cats, null]) {
    const swaps = [];
    comp.render = () => {
      const prev = R.getRenderTarget(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
      G.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isLine) { swaps.push([o, o.material]); const mat = Array.isArray(o.material) ? o.material[0] : o.material; const base = catOf(o) === c ? B : A; const m2 = base.clone(); m2.side = mat?.side ?? 0; m2.transparent = !!mat?.transparent; m2.depthWrite = mat?.depthWrite !== false; m2.depthTest = mat?.depthTest !== false; m2.visible = mat?.visible !== false; m2.colorWrite = mat?.colorWrite !== false; o.material = m2; } });
      const bg = G.scene.background; G.scene.background = null;
      R.setRenderTarget(T); R.setClearColor(0, 0); R.clear();
      try { R.render(G.scene, G.camera); } finally { for (const [o, m] of swaps) { o.material.dispose(); o.material = m; } swaps.length = 0; G.scene.background = bg; R.shadowMap.autoUpdate = au; }
      const px = new Uint8Array(Wt * Ht * 4); R.readRenderTargetPixels(T, 0, 0, Wt, Ht, px);
      let all = 0, cat = 0, cover = 0; for (let i = 0; i < px.length; i += 4) { all += px[i]; cat += px[i + 1]; if (px[i]) cover++; }
      res[c ?? 'ALL'] = { frags: all * 4, cat: cat * 4, coveredPx: cover * 4 };
      R.setRenderTarget(prev);
    };
    try { G.renderer.render(); } finally { comp.render = cr; }
  }
  return Object.entries(res).map(([k, v]) => `${k.padEnd(14)} shaded ${v.cat}  (all ${v.frags}, covered px ${v.coveredPx})`).join('\n');
})()
