// RENDER-INV: which draw batch makes a frame differ from the same frame drawn without batches. One frozen frame:
// the reference (batches off), the shipped frame, then each batch's pieces drawn on their own again, one batch at a
// time; pixels differing from the reference (readPixels of the canvas right after the render).
//   GAME_URL=http://localhost:8176/ VIEW=workshop node batchdiff.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const FOLD = process.env.FOLD !== '0', VIEW = process.env.VIEW || 'workshop', quality = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, camera: 'free', res: 'full' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const views = { workshop: { room: 'workshop', yaw: 0.8 }, house: { room: 'house', yaw: 0.8 }, hamalayi: { room: 'hamalayi', yaw: 3.5 }, 'house-door': { x: -45, z: 76, yaw: 0.8 }, harbour: { x: -70, z: -4, yaw: 1.6 } };
const out = await page.evaluate(({ v, FOLD }) => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.drawBatch.reset(); G.drawBatch.fold = FOLD; G.testFreeze = true; G.step(0.3); G.setState('play'); G.renderer.setAutoRes(false);
  if (v.room) G.enterRoom(v.room, null, true, true); else G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true);
  G.state = 'play'; G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
  for (let i = 0; i < 40; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, i % 10 === 9); }
  const R = G.renderer, gl = R.renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
  const grab = () => { R.render(); const p = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) > 8 || Math.abs(a[i + 1] - b[i + 1]) > 8 || Math.abs(a[i + 2] - b[i + 2]) > 8) n++; return n; };
  G.drawBatch.enabled = false; grab(); const ref = grab();
  G.drawBatch.enabled = true; grab(); const shipped = grab();
  const A = G.drawBatch.areas.get(G.room?.group || G.world.root), rows = [];
  for (const C of A.cells.values()) {
    if (!C.mesh) continue;
    C.mesh.visible = false; for (const M of C.list) M.o.layers.enable(0);
    const d = diff(grab(), ref);
    C.mesh.visible = true; for (const M of C.list) M.o.layers.disable(0);
    rows.push({ C, d, n: C.list.length, fold: !!C.fold, mat: C.material.type + ':' + (C.material.name || '') + (C.material.map ? '+map' : '') + (C.material.vertexColors ? '+vc' : '') + ' side' + C.material.side + (C.material.alphaTest ? ' alphaTest' : '') + (C.material.polygonOffset ? ' polyOffset' : ''),
      pieces: C.list.slice(0, 6).map((M) => `${M.o.name || M.o.type}<${M.o.parent?.name || M.o.parent?.type} ro${M.o.renderOrder} ${M.material.type}${M.material.polygonOffset ? ' po' : ''}${M.material.alphaTest ? ' at' : ''}${M.material.side ? ' s' + M.material.side : ''}${M.material.depthTest === false ? ' noDepthTest' : ''}${M.material.colorWrite === false ? ' noColor' : ''}${M.material.stencilWrite ? ' stencil' : ''}`) });
  }
  const base = diff(shipped, ref);
  // the pieces of the cells that matter most, in detail
  const detail = (C) => C.list.map((M) => { const m = M.material, g = M.geo, A = g.attributes; return { name: M.o.name, parent: M.o.parent?.name, mat: m.name || m.type, vc: m.vertexColors, color: m.color?.getHexString(), r: m.roughness, mt: m.metalness, map: m.map ? `${m.map.offset.x.toFixed(2)},${m.map.offset.y.toFixed(2)} x${m.map.repeat.x.toFixed(2)},${m.map.repeat.y.toFixed(2)} rot${m.map.rotation} ch${m.map.channel}` : null, flat: m.flatShading, side: m.side, attrs: Object.entries(A).map(([k, a]) => `${k}:${a.itemSize}${a.normalized ? 'n' : ''}${a.array.constructor.name.slice(0, 4)}`).join(' '), idx: !!g.index, det: +M.o.matrixWorld.determinant().toFixed(3), obc: m.onBeforeCompile !== Object.getPrototypeOf(m).onBeforeCompile || !!m.userData.twin, mgen: m.userData.twin ? 'twin' : '' }; });
  const worst = rows.filter((r) => r.d < base).sort((a, b) => a.d - b.d).slice(0, 2);
  const cellOf = new Map([...A.cells.values()].filter((C) => C.mesh).map((C, i) => [i, C]));
  void cellOf;
  return { view: v, pixels: W * H, shippedVsRef: base, cells: rows.filter((r) => r.d < base).sort((a, b) => a.d - b.d).slice(0, 8).map(({ C, ...r }) => r), worstDetail: worst.map((r) => detail(r.C)), allCells: rows.length };
}, { v: views[VIEW], FOLD });
console.log(JSON.stringify({ out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
