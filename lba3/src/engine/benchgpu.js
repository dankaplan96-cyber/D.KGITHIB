// PERF-GPU (stabilization): the GPU investigator's benchmark variants, for the Medium breakdown (bench.js runs them on
// the street and the house; the CPU investigator owns bench.js and its hook). Each one changes ONE thing on the same
// frozen route, so the laptop prices it: { id, apply(G), undo(G) }.
//
// Groups are left out of the frame at the draw itself (three's renderBufferDirect), not by hiding objects: the game's
// own per-frame visibility (LOD tiles, grass pools, far culls) keeps running exactly as in play, and only the GPU's
// work for that group goes. The CPU still prepares those draws, so compare the GPU ms, not the fps.
//   main  the view; shadow  the sun's shadow map (three passes scene === null there)
// Groups (same rules as the audit probes, docs/lba3-performance/gpu/):
//   terrain · water · sky (cloud ceiling, rain) · characters (every actor's rig: hero, people, enemies, pets) ·
//   trees (trees, bushes, rocks: kit.js LodBatch) · grass (grass, flowers, tulips: world.js smallPool) ·
//   particles (soft particles, blob shadows, points) · transparent (other blended surfaces) · scenery (the rest)
import * as THREE from 'three';
import { warmPassPrograms } from './warmup.js';
import { arrayTextures } from './texarray.js';
import { textures } from './textures.js';
import { LOD_DETAIL } from '../game/kit.js';
import { setViewInst } from './viewinst.js';

export function gpuGroupOf(G, o, m) {
  const E = G.env;
  if (o.name === 'terrain') return 'terrain';
  if (E && o === E.water) return 'water';
  if (E && (o === E.clouds || o === E.rain)) return 'sky';
  if (o.isSkinnedMesh || isCharacter(G, o)) return 'characters';
  if (o.name === 'lodBatch') return 'trees';
  if (o.name === 'smallPool') return 'grass';
  if (o.name === 'softParticles' || o.name === 'blobBatch' || o.isPoints) return 'particles';
  if (m && m.transparent) return 'transparent';
  return 'scenery';
}
// (the actors' roots, gathered once per variant: an object is a character's if one of them is its ancestor)
let ROOTS = null;
function roots(G) {
  if (ROOTS) return ROOTS;
  ROOTS = new Set();
  for (const a of [G.hero, ...(G.npcs || []), ...(G.enemies || []), ...(G.pets || []), ...(G.dogs || [])]) { const r = a?.rig?.root || a?.group || a?.mesh; if (r) ROOTS.add(r); }
  return ROOTS;
}
function isCharacter(G, o) { const S = roots(G); for (let p = o; p; p = p.parent) if (S.has(p)) return true; return false; }

// a filter on the draws: keep(pass, group, object, material) → true to draw, or a material to draw with instead
function filterDraws(G, keep) {
  const r = G.renderer.renderer, prev = r.renderBufferDirect;
  ROOTS = null;
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    // (only the world's draws: the post passes' full-screen quads and the menus' own scenes always go through)
    if (scene !== null && scene !== G.scene) return prev.call(this, camera, scene, geometry, material, object, group);
    const k = keep(scene === null ? 'shadow' : 'main', gpuGroupOf(G, object, material), object, material);
    if (!k) return;
    return prev.call(this, camera, scene, geometry, k === true ? material : k, object, group);
  };
  return () => { r.renderBufferDirect = prev; ROOTS = null; };
}
const skip = (id, groups, passes = ['main', 'shadow']) => ({
  id, apply(G) { this._undo = filterDraws(G, (pass, g) => !(passes.includes(pass) && groups.includes(g))); }, undo() { this._undo?.(); this._undo = null; },
});
// one plain material per side/blending, standing in for every main-pass material of the chosen groups: the same
// geometry, vertex work (skinning, instancing, batching) and depth, almost no pixel work
const plainCache = new Map();
function plain(m) {
  const k = [m.side, m.transparent, m.depthWrite, m.depthTest, m.colorWrite].join('|');
  let p = plainCache.get(k);
  if (!p) { p = new THREE.MeshBasicMaterial({ color: 0x808080, side: m.side, transparent: m.transparent, opacity: m.transparent ? 0.5 : 1, depthWrite: m.depthWrite, depthTest: m.depthTest, colorWrite: m.colorWrite, fog: false }); plainCache.set(k, p); }
  return p;
}
const plainFor = (id, groups) => ({
  id, apply(G) { this._undo = filterDraws(G, (pass, g, o, m) => (pass === 'main' && (groups === '*' || groups.includes(g)) && !m.isShaderMaterial ? plain(m) : true)); }, undo() { this._undo?.(); this._undo = null; },
});

export const GPU_VARIANTS = [
  skip('GPU: no trees/bushes/rocks', ['trees']),
  skip('GPU: no grass/flowers', ['grass']),
  skip('GPU: no characters', ['characters']),
  skip('GPU: no terrain', ['terrain']),
  skip('GPU: no water', ['water']),
  skip('GPU: no sky', ['sky']),
  skip('GPU: no particles/blobs', ['particles']),
  skip('GPU: no other transparent', ['transparent']),
  skip('GPU: no static scenery', ['scenery']),
  // the view with nothing but the characters (and the post passes): what the rest of the world costs together
  { id: 'GPU: characters only', apply(G) { this._undo = filterDraws(G, (pass, g) => g === 'characters'); }, undo() { this._undo?.(); this._undo = null; } },
  // the shadow map and the post passes only: no draw in the view
  skip('GPU: shadow pass + post only', ['terrain', 'water', 'sky', 'characters', 'trees', 'grass', 'particles', 'transparent', 'scenery'], ['main']),
  // pixel work against vertex work: every main-pass material (but the water's and other shader materials) swapped
  // for a flat one; what remains is the geometry's own cost (vertices, rasterising, depth)
  plainFor('GPU: flat materials (all)', '*'),
  plainFor('GPU: flat terrain material', ['terrain']),
  plainFor('GPU: flat scenery material', ['scenery']),
  // texture filtering: every world texture (the materials' maps and uniforms, the draw batches' texture arrays) without
  // anisotropic filtering (trilinear only): what the anisotropy costs (each texture is sent to the GPU again on apply
  // and undo: in the variant's warm-up)
  { id: 'GPU: anisotropic filtering off', apply(G) { this._t = new Map(); for (const t of worldTextures(G)) if (t.anisotropy > 1) { this._t.set(t, t.anisotropy); t.anisotropy = 1; t.needsUpdate = true; } },
    undo() { for (const [t, a] of this._t || []) { t.anisotropy = a; t.needsUpdate = true; } this._t = null; } },
  // far-view levers, priced before any is chosen (kit.js LOD_DETAIL, from the hero): the trees' detailed sculpt (3–9k
  // triangles; the coarse one 0.4–1.3k) to 22 m instead of Medium's 34, the grass and flowers to 30 m instead of 46
  { id: 'GPU: trees detailed to 22 m', apply() { this._n = LOD_DETAIL.near; LOD_DETAIL.near = 22; }, undo() { LOD_DETAIL.near = this._n; } },
  { id: 'GPU: grass/flowers to 30 m', apply() { this._f = LOD_DETAIL.smallFar; LOD_DETAIL.smallFar = 30; }, undo() { LOD_DETAIL.smallFar = this._f; } },
  // HEADING-LOAD: this round's savings undone one at a time (compare each with 'as is': what it saved), and the far-detail
  // trade-offs it prepared (off in play; compare with 'as is': what each would save)
  { id: 'GPU: grass/flowers not culled to the view (as before)', apply(G) { G.world?.setSmallView?.(false); }, undo(G) { G.world?.setSmallView?.(true); } },
  { id: 'GPU: instanced decoration not culled to the view (as before)', apply() { setViewInst(false); }, undo() { setViewInst(true); } },
  // (trade-offs, not in play: grass and flowers half as dense beyond 28 m from Twinsen, in 9 m squares)
  { id: 'GPU: grass/flowers half beyond 28 m (trade-off)', apply(G) { G.world?.setSmallThin?.({ from: 28, keep: 0.5 }); }, undo(G) { G.world?.setSmallThin?.(null); } },
  // the static shadow cache's depth into the live map by a framebuffer blit, as before (shadowcache.js copyDepth)
  { id: 'GPU: shadow cache copy by blit (as before)', apply(G) { const C = G.shadowCache; if (C) { C.depthCopy = 'blit'; C.drop(); } }, undo(G) { const C = G.shadowCache; if (C) { C.depthCopy = 'draw'; C.drop(); } } },
  // the post passes
  { id: 'GPU: no output pass (scene to screen)', apply(G) { G.renderer.output.enabled = false; }, undo(G) { G.renderer.output.enabled = true; } },
  { id: 'GPU: output edges as before (implicit LOD)', apply(G) { G.renderer.setOldEdges(true); warmPassPrograms(G.renderer.renderer, G.renderer.composer); }, undo(G) { G.renderer.setOldEdges(false); } },
];

// every texture the world's materials read (maps, uniforms) and the texture arrays
function worldTextures(G) {
  const out = new Set(arrayTextures());
  for (const t of Object.values(textures() || {})) if (t?.isTexture) out.add(t);   // (the terrain's tiles: its uniforms live in its shader hook)
  G.scene.traverse((o) => {
    for (const m of [o.material].flat()) {
      if (!m) continue;
      for (const v of Object.values(m)) if (v && v.isTexture) out.add(v);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture) out.add(u.value);
    }
  });
  for (const t of [...out]) if (t.isRenderTargetTexture || t.isDepthTexture) out.delete(t);
  return out;
}

// bench.js's hook (STABILIZATION): the list above for the Medium breakdown on the street; bench.js calls apply()/undo()
// without arguments and prefixes the id with "GPU group: "
export function gpuVariants(G) {
  return GPU_VARIANTS.map((v) => ({ id: v.id.replace(/^GPU: /, ''), apply() { return v.apply.call(this, G); }, undo() { return v.undo.call(this, G); } }));
}
