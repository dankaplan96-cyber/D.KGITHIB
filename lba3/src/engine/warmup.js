// Shader programs prepared before they are first drawn (PERF-ARRIVAL). Each program three.js builds the first time
// something is drawn is a stall on a real GPU (Direct3D 11 compiles HLSL on the spot: tens of ms each on the user's
// Vega 8). Renderer.precompile() (three's compileAsync) prepares ONE program per material, for the first object that
// uses it, in the main pass. Two kinds of program were left to the first frame that needed them:
//
// 1. The shadow pass's depth programs. three draws every caster into the sun's shadow map with its own depth
//    material, whose program depends on the caster (mesh / instanced, with or without instance colours / batched /
//    skinned), on the caster's material (side and shadowSide, map, alphaMap, alphaTest, wireframe) and, like every
//    program, on the lights in the scene (the light pool's size: 2 / 4 / 8 by preset) and the shadow filter (PCF /
//    PCFSoft). The old warm-up made one tiny copy per kind of mesh that was casting at that moment, but the shadow
//    culling (shadowcull.js) switches casters off and on as they leave and enter the view and merges static ones into
//    depth-only batches, so kinds outside the view, or merged, were never prepared: on the street at High 5 depth
//    programs compiled on the first frames, 3 on arriving in Zeelich, 1 for a shadow batch through the house door.
//    Here the kinds come from every mesh that casts or may cast (shadowcull's members and solo pieces included), plus
//    the plain variant of each (the regions' shadow stand-ins, kit.js shadowOnly), plus every side × shadowSide of
//    the depth-only shadow batches.
// 2. The post-processing passes' programs (bloom on High, FXAA on Low or with Edges: Fast, the output pass). Their
//    programs depend on whether the pass draws to the screen or to a target, and on the shadow filter (three keys every
//    non-raw program on it), so they changed with the preset and compiled on its first frame: 8 bloom programs on
//    the first High frame, FXAA on the first Low frame. Here they are compiled for the state they will be drawn in.
import * as THREE from 'three';

// what a caster's depth program depends on (three r180: WebGLShadowMap.getDepthMaterial, WebGLPrograms.getParameters)
const objKind = (o) => (o.isSkinnedMesh ? 's' : o.isBatchedMesh ? 'b' + (o._colorsTexture ? 'c' : '') : o.isInstancedMesh ? 'i' + (o.instanceColor ? 'c' : '') : 'm');
const matKind = (m) => [m.side, m.shadowSide, !!m.map, !!m.alphaMap, m.alphaTest > 0, !!m.displacementMap, !!m.wireframe, !!m.alphaToCoverage].join('|');

// Casts one tiny copy of every kind of caster into a throwaway frame (the real scene's lights, the sun's shadow
// map), so every depth program is ready. mayCast(o): a mesh not casting now that may cast later. Returns the number
// of kinds. Draws a few triangles; nothing reaches the screen.
export function warmShadowPrograms(R, target, scene, camera, at, mayCast = () => false) {
  if (!R.shadowMap.enabled) return 0;
  const kinds = new Map(), made = [];
  const add = (o, m) => {
    if (!m || Array.isArray(m) || m.visible === false) return;
    const k = objKind(o) + '#' + matKind(m);
    if (!kinds.has(k)) kinds.set(k, [o, m]);
  };
  scene.traverse((o) => {
    if (!o.isMesh || o.customDepthMaterial || !o.material || Array.isArray(o.material)) return;
    // (instanced and batched meshes always: the regions' tree and rock tiles swap casting between their detailed and
    //  coarse instances with distance, kit.js setLod, both drawn with the same material)
    if (!o.castShadow && !o.isInstancedMesh && !o.isBatchedMesh && !mayCast(o)) return;
    add(o, o.material);
    // (the same caster drawn with a plain material: a region's tree tile casting through its stand-in, kit.js shadowOnly)
    if (o.isInstancedMesh || o.isBatchedMesh) add(o, plainLike(o.material));
  });
  // a one-triangle geometry with the same attributes as src (only the batched copy needs them to match, its own way)
  const like = (src) => {
    const t = new THREE.BufferGeometry();
    for (const [n, a] of Object.entries(src.attributes)) {
      if (n === 'batchId') continue;
      t.setAttribute(n, new THREE.BufferAttribute(new (a.array.constructor)(3 * a.itemSize), a.itemSize, a.normalized));
    }
    t.attributes.position.array.set([0, 0, 0, 0.05, 0, 0, 0, 0.05, 0]);
    t.setIndex([0, 1, 2]); made.push(t); return t;
  };
  const g = new THREE.Group(), white = new THREE.Color(1, 1, 1), I = new THREE.Matrix4();
  for (const [o, m] of kinds.values()) {
    let c;
    if (o.isSkinnedMesh) { c = new THREE.SkinnedMesh(o.geometry, m); c.bind(o.skeleton, o.bindMatrix); }
    else if (o.isBatchedMesh) { c = new THREE.BatchedMesh(1, 3, 3, m); c.addInstance(c.addGeometry(like(o.geometry))); if (o._colorsTexture) c.setColorAt(0, white); made.push(c); }
    else if (o.isInstancedMesh) { c = new THREE.InstancedMesh(like(o.geometry), m, 1); c.setMatrixAt(0, I); if (o.instanceColor) c.setColorAt(0, white); made.push(c); }
    else c = new THREE.Mesh(like(o.geometry), m);
    c.castShadow = true; c.frustumCulled = false; fresh(c); g.add(c);
  }
  // the depth-only shadow batches (shadowcull.js): every side × shadowSide a cell can have
  const posOnly = new THREE.BufferGeometry(); posOnly.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0.05, 0, 0, 0, 0.05, 0]), 3)); posOnly.setIndex([0, 1, 2]); made.push(posOnly);
  const sides = [THREE.FrontSide, THREE.BackSide, THREE.DoubleSide];
  for (const side of sides) for (const shadowSide of [null, ...sides]) {
    const mm = new THREE.MeshBasicMaterial({ side, shadowSide, colorWrite: false, depthWrite: false }); made.push(mm);
    const c = new THREE.Mesh(posOnly, mm); c.castShadow = true; c.frustumCulled = false; fresh(c); g.add(c);
  }
  // one frame of the real scene's lights (the programs depend on them) with only the copies in it, at the sun's focus
  // so the shadow pass draws them, into a scratch target: nothing reaches the screen, and the GPU draws a few
  // triangles (drawing the whole scene here queued seconds of work on a software renderer, felt at the first door)
  g.position.copy(at);
  const hidden = [];
  for (const c of scene.children) if (!c.isLight && c.visible) { c.visible = false; hidden.push(c); }
  scene.add(g);
  const prev = R.getRenderTarget();
  // (twice: three draws the shadow map BEFORE it takes in the frame's lights (WebGLRenderer.render: shadowMap.render,
  //  then setupLights), so the depth programs of a frame are made with the light count of the frame before: after the
  //  light pool grew from 4 to 8 lamps (Medium → High) a single frame here made them all for 4 again. So a first frame
  //  with nothing in it but the lights, then the copies)
  try {
    R.setRenderTarget(target);
    g.visible = false; R.render(scene, camera);
    g.visible = true; R.render(scene, camera);
  } catch (e) { console.warn('shadow warm-up', e); }
  finally {
    R.setRenderTarget(prev);
    scene.remove(g); for (const c of hidden) c.visible = true;
    for (const t of made) t.dispose?.();
  }
  return kinds.size;
}
// three draws every caster with ONE shared depth material, setting its side and map per caster without marking it
// changed, and only picks a program again when the caster's kind changes (instanced / batched / skinned …). Which
// side × map programs get made therefore depends on the order the shadow pass meets the casters: the street at
// Medium made its "plain mesh, textured, front side" program only when one followed an instanced caster in the
// list. Each warm-up copy marks the depth material changed just before it is drawn, so its own program is made.
// (a BatchedMesh's own onBeforeShadow culls and sorts its instances: kept)
function fresh(c) {
  const base = c.onBeforeShadow;
  c.onBeforeShadow = function (renderer, object, camera, shadowCamera, geometry, depthMaterial, group) {
    if (depthMaterial) depthMaterial.needsUpdate = true;
    return base.call(this, renderer, object, camera, shadowCamera, geometry, depthMaterial, group);
  };
}
// a material with only what the depth program reads from m (its side), no maps: the same program as kit.js's
// shadow stand-in material, cached per side
const PLAIN = {};
function plainLike(m) { return (PLAIN[m.side] ??= new THREE.MeshBasicMaterial({ side: m.side, colorWrite: false, depthWrite: false })); }

// The post-processing passes' programs, compiled for the state they are drawn in now (which pass is last and so draws
// to the screen; the shadow filter). Synchronous on the CPU side; the driver compiles in parallel where it can.
const _quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), _quadGeo = new THREE.PlaneGeometry(2, 2);
export function warmPassPrograms(R, composer) {
  if (!composer) return 0;
  const passes = composer.passes.filter((p) => p.enabled);
  const last = passes[passes.length - 1];
  const prev = R.getRenderTarget();
  let n = 0;
  try {
    for (const p of passes) {
      // (the output pass sets its defines from the renderer on its first frame: before that there is nothing to match)
      if ('_toneMapping' in p && p._toneMapping === null) continue;
      const mats = new Set();
      for (const v of Object.values(p)) {
        if (v?.isMaterial) mats.add(v);
        else if (Array.isArray(v)) for (const x of v) if (x?.isMaterial) mats.add(x);
      }
      // (bloom's plain copy material is used only when bloom itself is the last pass)
      if (p !== last && p._basic) mats.delete(p._basic);
      if (!mats.size) continue;
      const toScreen = p === last && composer.renderToScreen;
      R.setRenderTarget(toScreen ? null : composer.renderTarget1);
      const s = new THREE.Scene();
      for (const m of mats) s.add(new THREE.Mesh(_quadGeo, m));
      R.compile(s, _quadCam);
      n += mats.size;
    }
  } catch (e) { console.warn('pass warm-up', e); }
  finally { R.setRenderTarget(prev); }
  return n;
}
