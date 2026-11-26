// Heightfield terrain. Gameplay height queries interpolate the exact same
// triangles that are rendered, so feet never float or sink.
import * as THREE from 'three';
import { dlHook } from './depthlook.js';

// SHADE-COST: the terrain shader's switches. The game runs with the defaults; the others exist for the benchmark's GPU
// lines (benchgpu.js: each prices one of them on the laptop) and the probes' pixel A/B. A change compiles another program
// (customProgramCacheKey): the caller prepares it (warmGraphics) before the frame that draws it.
//   grassSkip  the grass tile is read only where its colour is used (true; false: on every terrain pixel, as before)
//   nrmVarying the world normal for the rock's triplanar weights as its own varying (false: from the view-space normal)
//   diag       'implicit' the reads as before PERF-GPU 3 (every tile read on every pixel, implicit-gradient texture2D);
//              'grass'    one grass read and no splat (what the splat costs); 'unlit' the splat without lighting or
//              shadow (what the lighting costs on the terrain) — diagnostics, never in play
//   sunLambert (trade-off, off) the sun lights the terrain without its specular term (GGX): diffuse only
export const TERRAIN_SHADE = { grassSkip: true, nrmVarying: false, diag: null, sunLambert: false };
const MATS = new Set();   // (the terrains' splat materials: a switch marks them for a new program)
// QUIET-ROCK (docs/lba-maturity/QUIET-ROCK.md; the user 26.11: the quiet granite game-wide): a terrain may read its
// flat rock (the triplanar's read from above) from another tile (textures.rockTop), times a tint (textures.rockTopK).
// tileTint(a, b): that tint for tile b to take tile a's mean colour, per channel in linear light (what the shader
// reads), so the vertex colours, the splat and the rock's edge wobble (dot(rock, 1/3)) stay as they were on average.
// Read once per pair from the tiles' canvases (512²: a few ms), at the first build that asks.
const TINTS = new Map();
const linMean = (t) => {
  const img = t.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, L = new Float32Array(256), s = [0, 0, 0];
  for (let i = 0; i < 256; i++) { const v = i / 255; L[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  for (let i = 0; i < d.length; i += 4) { s[0] += L[d[i]]; s[1] += L[d[i + 1]]; s[2] += L[d[i + 2]]; }
  return s.map((v) => v / (d.length / 4));
};
const MEANS = new Map(), linMeanOf = (t) => { if (!MEANS.has(t.uuid)) MEANS.set(t.uuid, linMean(t)); return MEANS.get(t.uuid); };   // (ROCK-EDGES)
export function tileTint(a, b) {
  const k = a.uuid + b.uuid;
  if (!TINTS.has(k)) { let r = [1, 1, 1]; try { const ma = linMean(a), mb = linMean(b); r = ma.map((v, i) => v / mb[i]); } catch { /* unreadable: no tint */ } TINTS.set(k, r); }
  return TINTS.get(k);
}
export function setTerrainShade(k, v) { if (TERRAIN_SHADE[k] === v) return false; TERRAIN_SHADE[k] = v; for (const m of MATS) m.needsUpdate = true; return true; }
const shadeKey = (S) => 'terrain-splat' + (S.grassSkip ? '' : '-g') + (S.nrmVarying ? '-n' : '') + (S.diag ? '-' + S.diag : '') + (S.sunLambert ? '-sl' : '') + (LAWN_EDGE ? '-le' : '') + (ROCK_EDGE ? '-re' : '');
// LAWN-EDGES-2 (P135, ?lawnedge=new; off by default): the grass/soil split cut per pixel by a per-vertex signed distance
// to the lawn's edge (the `lawn` attribute, Terrain._edgeChannels), as LAWN-EDGES cuts the paving. Off: no attribute, no
// work, the shader's text as before.
// (LAWN-EDGES-2, the user's pick 26.11: smooth grass/soil edges are the default; ?lawnedge=old brings back the stepped edge)
export const LAWN_EDGE = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('lawnedge') !== 'old'; } catch { return true; } })();
const LAWN_WOB = 0.1;   // (m: the edge's wobble by the grass tile's brightness, so it reads painted, not ruled)
// ROCK-EDGES (docs/lba-maturity/ROCK-EDGES.md; ?rockedge=new, off by default): LAWN-EDGES-2's traced edge for two more
// channels, the rock's edge (the rock's share, re-split per pixel: rk) and the paving's (its share of the ground that is
// not rock: pk) — the `rockedge` attribute, [rock distance, rock strength, paving distance, paving strength] per grid
// point (Terrain._edgeChannels). Off: no attribute, no work, the shader's text as before. Where LAWN-EDGES' own paving
// line runs (Citadel's streets, vEdge), its cut (EDGE_CUT) still decides, as before.
export const ROCK_EDGE = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('rockedge') === 'new'; } catch { return false; } })();
const ROCK_WOB = 0.1, PAVE_WOB = 0.1;   // (m: the rock's edge wobbled by the rock tile's brightness about its mean (uRockMid), the paving's by the grass tile's; 0.25 drew the granite's dark specks as a dotted fringe outside the line)
const RB = (0.25 + ROCK_WOB).toFixed(3), PB = (0.25 + PAVE_WOB).toFixed(3);   // (m: beyond these on the outer side the cut is 0 whatever the wobble)
// the rock's share: the old split (the share plus the tile's wobble, on a short ramp: across a ~1 m triangle the grid's
// saw-tooth) or ROCK-EDGES' cut at the rock distance 0, times the old split on the rock's own strength (a faint rock
// stays faint inside its edge). `rest` (the rest's share) must be set before; where it is ~0 (a triangle all rock:
// WA-12's patches, the desert's outcrops, Otringal's turf) the rock stays whole, or the shares would sum under 1.
const ROCK_SPLIT = (gate) => ROCK_EDGE
  ? `float rb = dot(rock, vec3(0.333)), ra = clamp(rw.x * 0.6, 0.004, 0.25);
          float rk = ${gate ? `vRockE.x < ${RB}` : 'true'} ? max((1.0 - smoothstep(-ra, ra, vRockE.x + (rb - uRockMid) * ${ROCK_WOB.toFixed(3)})) * smoothstep(0.38, 0.52, vRockE.y + (rb - 0.5) * 0.3), 1.0 - rest * 50.0) : 0.0;`
  : null;
// the paving's share of the rest (needs ns, gtex): the old split, or ROCK-EDGES' cut at the paving distance 0, times
// the old split on the paving's own strength
const PAVE_SPLIT = `          if (ns - sp2 > 0.001 && (sp2 > 0.001 || vRockE.z < ${PB})) {
            float pa = clamp(rw.y * 0.6, 0.004, 0.25), pg = dot(gtex, vec3(0.333)) - 0.42;
            float pk = (1.0 - smoothstep(-pa, pa, vRockE.z + pg * ${PAVE_WOB.toFixed(3)})) * smoothstep(0.4, 0.6, vRockE.w + pg * 0.25);
            float ok = ns * (1.0 - pk) / (ns - sp2);
            sp.x *= ok; sp.y *= ok; sp.w *= ok; sp2 = ns * pk;
          }`;
// the grass/soil split: the old one (the vertex shares' ratio re-split at 0.5 on a short ramp: across a ~1 m triangle,
// the grid's saw-tooth) or LAWN-EDGES-2's cut at the lawn distance 0 (lk: the soil's share, also for EDGE_CUT below)
const LAWN_SPLIT = LAWN_EDGE ? `          float gs = sp.x + sp.w;
          float la = clamp(lw * 0.6, 0.004, 0.25);   // (LAWN-EDGES-2: lk, the soil's share: the cut at the lawn's edge, times the old split's on the soil's own strength)
          float gw = dot(gtex, vec3(0.333)) - 0.42;
          float lk = (1.0 - smoothstep(-la, la, vLawn.x + gw * ${LAWN_WOB.toFixed(3)})) * smoothstep(0.42, 0.58, vLawn.y + gw * 0.35);
          sp.x = gs * (1.0 - lk); sp.w = gs * lk;` : `          float gs = sp.x + sp.w;
          if (gs > 0.001) {
            float d = sp.w / gs + (dot(gtex, vec3(0.333)) - 0.42) * 0.35;
            float dk = smoothstep(0.42, 0.58, d);
            sp.x = gs * (1.0 - dk); sp.w = gs * dk;
          }`;

// The splat's shader text for the switches above: { vpre, vert, fpre, frag, light?, out? }.
// Per terrain pixel (SHADE-COST, measured on Citadel's street at Medium on battery, SwiftShader counts: 1.91 reads of
// the five tiles a pixel before, 1.28 after): the rock's 3 triplanar reads where its weight can be > 0, the grass where
// its colour is used (it is also the wobble of the soil's and the paving's edges), the sand's 2, the dirt and the
// cobbles where theirs is > 0, every read with explicit gradients so Direct3D keeps the branches (PERF-GPU 3).
// LAWN-EDGES (P112): a terrain may carry, per grid point, the signed distance to its paving's edge and the width of an
// earth band inside it (Terrain edgeFn; the `edge` attribute, int16 over ±EDGE_RANGE m; EDGE_OFF where there is none).
// The distance is linear across a triangle along a straight edge, so the cut at 0 is a straight line on the ground,
// not the grid's zig-zag: the paving's share is set by it per pixel (anti-aliased over about a pixel), and the band's
// earth takes the grass's share up to its width. Only where the distance is under EDGE_RANGE − 0.05 (near an edge).
export const EDGE_RANGE = 4, EDGE_OFF = EDGE_RANGE;
const LE_SUB = 4, LE_R = 2.6;   // (LAWN-EDGES-2: fine samples a cell a side; the distance's reach, m)
// (LAWN-EDGES-2: beside the paving's line, a point painted paving lends its share to the grass or the earth by the
//  lawn's cut, lk, instead of to the earth alone)
const EDGE_CUT = `
          if (vEdge.x < ${EDGE_RANGE - 0.05}) {
            float aa = clamp(ew * 0.6, 0.004, 0.25);
            float pe = 1.0 - smoothstep(-aa, aa, vEdge.x);
            float tot = sp.x + sp.y + sp.z + sp.w + sp2, oth = tot - sp2, rem = tot * (1.0 - pe);
            if (oth > 0.002) sp *= rem / oth; else sp = ${LAWN_EDGE ? 'vec4(rem * (1.0 - lk), 0.0, 0.0, rem * lk)' : 'vec4(0.0, 0.0, 0.0, rem)'};   // (beside the line, a point painted paving lends its share to the earth)
            sp2 = tot * pe;
            if (vEdge.y > 0.05) { float be = 1.0 - smoothstep(vEdge.y - aa, vEdge.y + aa, vEdge.x); float g = sp.x * be; sp.x -= g; sp.w += g; }
          }`;
function splatShader(S) {
  const nv = S.nrmVarying;
  const vpre = 'attribute vec4 splat; attribute float splat2; attribute vec2 edge; varying vec4 vSplat; varying float vSplat2; varying vec3 vWPos; varying vec2 vEdge;\n'
    + (LAWN_EDGE ? 'attribute vec2 lawn; varying vec2 vLawn;\n' : '')
    + (ROCK_EDGE ? 'attribute vec4 rockedge; varying vec4 vRockE;\n' : '')
    + (nv ? 'varying vec3 vWNrm;\n' : '#ifdef FLAT_SHADED\nvarying vec3 vWNrm;\n#endif\n');
  const vert = `vSplat = splat; vSplat2 = splat2; vEdge = edge * ${EDGE_RANGE}.0; vWPos = (modelMatrix * vec4(position, 1.0)).xyz;\n`
    + (LAWN_EDGE ? `vLawn = vec2(lawn.x * ${EDGE_RANGE}.0, lawn.y);\n` : '')
    + (ROCK_EDGE ? `vRockE = vec4(rockedge.x * ${EDGE_RANGE}.0, rockedge.y, rockedge.z * ${EDGE_RANGE}.0, rockedge.w);\n` : '')
    + (nv ? 'vWNrm = normalize(mat3(modelMatrix) * normal);\n' : '#ifdef FLAT_SHADED\nvWNrm = normalize(mat3(modelMatrix) * normal);\n#endif\n');
  const fpre = 'uniform sampler2D tGrass, tSand, tRock, tRockTop, tDirt, tCobble; uniform vec3 uRockTop; varying vec4 vSplat; varying float vSplat2; varying vec3 vWPos; varying vec2 vEdge;\n'
    + (LAWN_EDGE ? 'varying vec2 vLawn;\n' : '')
    + (ROCK_EDGE ? 'uniform float uRockMid; varying vec4 vRockE;\n' : '')
    + (nv ? 'varying vec3 vWNrm;\n' : '#ifdef FLAT_SHADED\nvarying vec3 vWNrm;\n#endif\n');
  // SHADE-COST: the world normal from the view-space one three interpolates anyway (vNormal), turned back by the view's
  // rotation: the same direction (a rotation commutes with the interpolation), and the weights below do not depend on
  // its length. Three fewer interpolated values on every terrain pixel. (FLAT_SHADED, the 1997 look, has no vNormal.)
  const wn = nv ? 'normalize(vWNrm)' : '\n#ifdef FLAT_SHADED\nnormalize(vWNrm)\n#else\n(vec4(vNormal, 0.0) * viewMatrix).xyz\n#endif\n';
  let frag;
  if (S.diag === 'implicit') frag = `
          vec2 tuv = vWPos.xz * 0.22; float ew = fwidth(vEdge.x);${LAWN_EDGE ? ' float lw = fwidth(vLawn.x);' : ''}${ROCK_EDGE ? ' vec2 rw = fwidth(vRockE.xz);' : ''}
          vec3 bw = pow(abs(${wn}), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec3 rock = texture2D(tRock, vec2(vWPos.z, vWPos.y * 1.25) * 0.14).rgb * bw.x
                    + texture2D(tRock, vec2(vWPos.x, vWPos.y * 1.25) * 0.14).rgb * bw.z
                    + texture2D(tRockTop, vWPos.xz * 0.14).rgb * uRockTop * bw.y;
          vec4 sp = vSplat; float sp2 = vSplat2;
${ROCK_EDGE ? `          float rest = 1.0 - sp.z;
          ${ROCK_SPLIT(false)}` : `          float rk = smoothstep(0.38, 0.52, sp.z + (dot(rock, vec3(0.333)) - 0.5) * 0.3);
          float rest = 1.0 - sp.z;`}
          float kk = rest > 0.001 ? (1.0 - rk) / rest : 0.0;
          sp = vec4(sp.x * kk, sp.y * kk, rk, sp.w * kk); sp2 *= kk;
          vec3 gtex = texture2D(tGrass, tuv).rgb;
          float ns = sp.x + sp.y + sp.w + sp2;
${ROCK_EDGE ? PAVE_SPLIT : `          if (sp2 > 0.001 && ns - sp2 > 0.001) {
            float pk = smoothstep(0.4, 0.6, sp2 / ns + (dot(gtex, vec3(0.333)) - 0.42) * 0.25);
            float ok = ns * (1.0 - pk) / (ns - sp2);
            sp.x *= ok; sp.y *= ok; sp.w *= ok; sp2 = ns * pk;
          }`}
${LAWN_SPLIT}${EDGE_CUT}
          vec3 sandT = vec3(0.0);
          if (sp.y > 0.003) {
            vec3 sand1 = texture2D(tSand, tuv * 1.2).rgb;
            vec3 sand2 = texture2D(tSand, mat2(0.8, 0.6, -0.6, 0.8) * tuv * 0.47 + vec2(0.37, 0.11)).rgb;
            sandT = sand1 * (0.62 + 0.46 * sand2);
          }
          vec3 tex = gtex * sp.x + sandT * sp.y + rock * sp.z + texture2D(tDirt, tuv * 1.3).rgb * sp.w + texture2D(tCobble, vWPos.xz * 0.25).rgb * sp2;
          diffuseColor.rgb *= tex;`;
  else if (S.diag === 'grass') frag = 'diffuseColor.rgb *= texture2D(tGrass, vWPos.xz * 0.22).rgb;';
  else frag = `
          vec2 tuv = vWPos.xz * 0.22;
          // PERF-GPU: each tile is read only where its share is not zero, with explicit gradients (textureGrad, from the
          // world position's screen derivatives taken before any branch: the same mip level and anisotropy as before).
          // Before, the three triplanar rock reads, the dirt and the cobbles were read on every terrain pixel (on
          // Citadel's street ~half the screen) with their weight 0 on most of them; and Direct3D cannot keep a branch
          // around implicit-gradient reads (texture2D), so the sand's branch ran everywhere too. Same pixels.
          vec3 dPx = dFdx(vWPos), dPy = dFdy(vWPos);
          float ew = fwidth(vEdge.x);   // (LAWN-EDGES: before any branch)${LAWN_EDGE ? '\n          float lw = fwidth(vLawn.x);   // (LAWN-EDGES-2)' : ''}${ROCK_EDGE ? '\n          vec2 rw = fwidth(vRockE.xz);   // (ROCK-EDGES)' : ''}
          vec2 gx = dPx.xz * 0.22, gy = dPy.xz * 0.22;
          vec4 sp = vSplat; float sp2 = vSplat2;
          // cliffs: triplanar rock so steep faces show undistorted strata
          // (QUIET-ROCK: the read from above, the flat ground's, is tRockTop times uRockTop: by default the same tile, times 1)
          // (the rock's share below is 0 wherever the splat's rock weight is under 0.23: 0.38 minus the wobble's 0.15)
          vec3 rock = vec3(0.0);
          if (${ROCK_EDGE ? `vRockE.x < ${RB}) {   // (ROCK-EDGES: wherever the cut can give rock: the traced line is not the interpolated share's)` : 'sp.z > 0.229) {'}
            vec3 bw = pow(abs(${wn}), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
            rock = textureGrad(tRock, vec2(vWPos.z, vWPos.y * 1.25) * 0.14, vec2(dPx.z, dPx.y * 1.25) * 0.14, vec2(dPy.z, dPy.y * 1.25) * 0.14).rgb * bw.x
                 + textureGrad(tRock, vec2(vWPos.x, vWPos.y * 1.25) * 0.14, vec2(dPx.x, dPx.y * 1.25) * 0.14, vec2(dPy.x, dPy.y * 1.25) * 0.14).rgb * bw.z
                 + textureGrad(tRockTop, vWPos.xz * 0.14, dPx.xz * 0.14, dPy.xz * 0.14).rgb * uRockTop * bw.y;
          }
          // crisp rock edges (the cliff rim is a hard line in LBA2, not a fade)
          // (GFX-LOOK-2: a shorter ramp, wobbled by the rock's own strata: on a steep slope one ~1 m grid cell spans
          //  metres of screen, and 0.28–0.62 drew a soft green veil over the foot of every cliff)
${ROCK_EDGE ? `          float rest = 1.0 - sp.z;
          ${ROCK_SPLIT(true)}` : `          float rk = sp.z > 0.229 ? smoothstep(0.38, 0.52, sp.z + (dot(rock, vec3(0.333)) - 0.5) * 0.3) : 0.0;
          float rest = 1.0 - sp.z;`}
          float kk = rest > 0.001 ? (1.0 - rk) / rest : 0.0;
          sp = vec4(sp.x * kk, sp.y * kk, rk, sp.w * kk); sp2 *= kk;
          // crisp soil edges too (paths and town soil): the grass/soil share is re-split per pixel with a
          // short ramp, wobbled by the grass texture so the edge looks painted, not ruled
          float ns = sp.x + sp.y + sp.w + sp2;
          ${S.grassSkip ? `// SHADE-COST: the grass is read only where its colour is used: its own share (sp.x > 0), or the wobble of the
          // paving's edge or the soil's (both need a share other than the paving's: ns - sp2 > 0.001; without one, gs below
          // is under 0.001 too). On the paving alone (62 % of the street's terrain pixels) it was read for nothing.
          vec3 gtex = vec3(0.0);
          if (ns - sp2 > 0.001 || sp.x > 0.0) gtex = textureGrad(tGrass, tuv, gx, gy).rgb;` : 'vec3 gtex = textureGrad(tGrass, tuv, gx, gy).rgb;'}
          // GFX-LOOK-2: the paving's edge as crisp (it faded into the grass and soil over the ~1 m grid: a green smear
          // round every street and the quay): its share re-split per pixel on the same kind of ramp, no extra read
${ROCK_EDGE ? PAVE_SPLIT : `          if (sp2 > 0.001 && ns - sp2 > 0.001) {
            float pk = smoothstep(0.4, 0.6, sp2 / ns + (dot(gtex, vec3(0.333)) - 0.42) * 0.25);
            float ok = ns * (1.0 - pk) / (ns - sp2);
            sp.x *= ok; sp.y *= ok; sp.w *= ok; sp2 = ns * pk;
          }`}
${LAWN_SPLIT}${EDGE_CUT}
          // sand: a second, turned and coarser sample modulates the first so the tile's ripples never line up
          // into rows or repeat at one visible interval (POLISH-AUDIT #16)
          // (only where there is sand: elsewhere, Citadel's grass for one, it costs no texture reads at all; the weight
          //  is near 0 at the borders, so the branch's edge never shows)
          vec3 sandT = vec3(0.0);
          if (sp.y > 0.003) {
            vec3 sand1 = textureGrad(tSand, tuv * 1.2, gx * 1.2, gy * 1.2).rgb;
            mat2 sr = mat2(0.8, 0.6, -0.6, 0.8);
            vec3 sand2 = textureGrad(tSand, sr * tuv * 0.47 + vec2(0.37, 0.11), sr * gx * 0.47, sr * gy * 0.47).rgb;
            sandT = sand1 * (0.62 + 0.46 * sand2);
          }
          vec3 tex = gtex * sp.x + sandT * sp.y + rock * sp.z;
          if (sp.w > 0.0) tex += textureGrad(tDirt, tuv * 1.3, gx * 1.3, gy * 1.3).rgb * sp.w;
          if (sp2 > 0.0) tex += textureGrad(tCobble, vWPos.xz * 0.25, dPx.xz * 0.25, dPy.xz * 0.25).rgb * sp2;
          diffuseColor.rgb *= tex;`;
  const R = { vpre, vert, fpre, frag };
  // (diagnostic: the splat's colour as it is, tinted by the vertex colour, without any light or shadow)
  if (S.diag === 'unlit') R.out = 'vec3 outgoingLight = diffuseColor.rgb;';
  // (trade-off: the sun's light on the terrain without its specular highlight — the ground's roughness is 0.95, so the
  //  highlight is a faint broad sheen; the sun's diffuse light and shadow as before)
  if (S.sunLambert) {
    const L = THREE.ShaderChunk.lights_fragment_begin, call = 'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
    const d = L.indexOf('getDirectionalLightInfo('), c = d > 0 ? L.indexOf(call, d) : -1;
    // (three's order: point, spot, directional, then area and hemisphere lights: the first call after the directional
    //  light's set-up is the sun's)
    if (c > 0 && L.indexOf('getSpotLightInfo(', c) < 0 && L.indexOf('getPointLightInfo(', c) < 0) {
      R.light =L.slice(0, c) + 'if ( directLight.visible ) reflectedLight.directDiffuse += saturate( dot( geometryNormal, directLight.direction ) ) * directLight.color * BRDF_Lambert( material.diffuseColor );' + L.slice(c + call.length);
    }
  }
  return R;
}

export class Terrain {
  // squares (HEADING-LOAD-2): > 0 draws the tiles' cells in squares of that many cells a side, all in one BatchedMesh
  // whose squares three culls one by one against the view (the caller passes it only with WEBGL_multi_draw)
  constructor({ size, segs, heightFn, colorFn, splatFn, edgeFn = null, textures, cx = 0, cz = 0, tile = 70, squares = 0 }) {
    this.tile = tile; this.squares = squares;
    this.splatFn = splatFn; this.edgeFn = edgeFn;   // (LAWN-EDGES: edgeFn(x, z, h, e) sets e = [distance to the paving's edge, band width]; none: no edge)
    this.tex = textures;
    // ROCK-EDGES: the rock's traced line at the old split's midpoint on average: rk = 0.5 where the share plus the tile's
    // wobble ((brightness − 0.5) × 0.3) is 0.45, so at the share 0.45 − (the flat read's mean brightness − 0.5) × 0.3
    // (the cliff tile and the quiet granite ~0.27: 0.52; Otringal's and Knartas's granite ~0.47: 0.46). Read from the
    // tiles this terrain is given (QUIET-ROCK's tint may change), once per tile.
    if (ROCK_EDGE && splatFn && textures) {
      const top = textures.rockTop || textures.rock, K = textures.rockTopK || [1, 1, 1];
      let mid = 0.3; try { const m = linMeanOf(top); mid = (m[0] * K[0] + m[1] * K[1] + m[2] * K[2]) / 3; } catch { /* unreadable: the cliff tile's */ }
      this.rockMid = mid; this.rockThr = Math.max(0.3, Math.min(0.6, 0.45 - (mid - 0.5) * 0.3));
    }
    this.size = size;
    this.segs = segs;
    this.half = size / 2;
    // the grid is centred on cx, cz (its corner at x0, z0)
    this.cx = cx; this.cz = cz; this.x0 = cx - size / 2; this.z0 = cz - size / 2;
    this.step = size / segs;
    const n = segs + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        this.heights[j * n + i] = heightFn(this.x0 + i * this.step, this.z0 + j * this.step);
      }
    }
    this.mesh = this._build(colorFn);
    this.heightTexture = this._heightTexture();
  }

  _h(i, j) {
    const n = this.segs + 1;
    i = Math.max(0, Math.min(this.segs, i));
    j = Math.max(0, Math.min(this.segs, j));
    return this.heights[j * n + i];
  }

  // Outdoor regions far from Citadel (Desert Island, …) bring their own heightfield as a patch: inside its
  // square the patch answers every height query (gameplay and physics), outside it this terrain does.
  addPatch(t, cx, cz) { (this.patches ||= []).push({ t, cx, cz }); }

  heightAt(x, z) {
    if (this.patches) for (let k = 0, L = this.patches; k < L.length; k++) { const p = L[k];   // (PERF-CPU: no iterator: called thousands of times a frame)
      const lx = x - p.cx, lz = z - p.cz;
      if (lx > -p.t.half && lx < p.t.half && lz > -p.t.half && lz < p.t.half) return p.t.heightAt(lx, lz);
    }
    const gx = (x - this.x0) / this.step;
    const gz = (z - this.z0) / this.step;
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const h00 = this._h(i, j), h10 = this._h(i + 1, j), h01 = this._h(i, j + 1), h11 = this._h(i + 1, j + 1);
    // Triangles split along the (1,0)-(0,1) diagonal, matching _build().
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  slopeAt(x, z) {
    const e = this.step;
    const dx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const dz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }

  _build(colorFn) {
    const n = this.segs + 1;
    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const spl = new Float32Array(n * n * 4);
    const spl2 = new Float32Array(n * n);
    const edg = new Int16Array(n * n * 2).fill(32767), e = [EDGE_OFF, 0], q16 = (v) => Math.round(Math.max(-1, Math.min(1, v / EDGE_RANGE)) * 32767);
    const w = [0, 0, 0, 0, 0];
    const slopes = (LAWN_EDGE || ROCK_EDGE) && this.splatFn ? new Float32Array(n * n) : null;   // (LAWN-EDGES-2, ROCK-EDGES: for the fine samples)
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = this.x0 + i * this.step, z = this.z0 + j * this.step;
        const h = this.heights[k];
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        const slope = Math.hypot(this._h(i + 1, j) - this._h(i - 1, j), this._h(i, j + 1) - this._h(i, j - 1)) / (2 * this.step);
        if (slopes) slopes[k] = slope;
        colorFn(x, z, h, slope, c);
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
        if (this.splatFn) {
          this.splatFn(x, z, h, slope, w);
          const sum = w[0] + w[1] + w[2] + w[3] + w[4] || 1;
          for (let q = 0; q < 4; q++) spl[k * 4 + q] = w[q] / sum;
          spl2[k] = w[4] / sum;
          if (this.edgeFn) { e[0] = EDGE_OFF; e[1] = 0; this.edgeFn(x, z, h, e); edg[k * 2] = q16(e[0]); edg[k * 2 + 1] = q16(e[1]); }
        }
      }
    }
    const idx = new Uint32Array(this.segs * this.segs * 6);
    let p = 0;
    for (let j = 0; j < this.segs; j++) {
      for (let i = 0; i < this.segs; i++) {
        const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
        idx[p++] = a; idx[p++] = d; idx[p++] = b;
        idx[p++] = e; idx[p++] = b; idx[p++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    if (this.splatFn && this.tex) {
      geo.setAttribute('splat', new THREE.BufferAttribute(spl, 4));
      geo.setAttribute('splat2', new THREE.BufferAttribute(spl2, 1));
      geo.setAttribute('edge', new THREE.BufferAttribute(edg, 2, true));   // (LAWN-EDGES; every splat terrain has it: one shader program)
      if (slopes) {
        const E = this._edgeChannels(spl, spl2, slopes);
        if (E.lawn) geo.setAttribute('lawn', new THREE.BufferAttribute(E.lawn, 2, true));   // (LAWN-EDGES-2)
        if (E.rock) geo.setAttribute('rockedge', new THREE.BufferAttribute(E.rock, 4, true));   // (ROCK-EDGES)
      }
      this._splatMaterial(mat);
    }
    // drawn in tiles of TILE × TILE cells sharing the vertex data, each with its own bounds, so the camera
    // culls what it doesn't see; tiles wholly deep under the sea (the water there is opaque) aren't drawn
    const group = new THREE.Group(); group.name = 'terrain';
    // (PERF-2: 70 cells ≈ 65 m on Citadel, 16 tiles instead of 49: a turning camera drew 15–20 of them, one call each;
    // the island's whole terrain is ~160k triangles, so the few more drawn off-screen cost the GPU little)
    // (PERF-CALLS: an outdoor region passes bigger tiles: the desert's 300 m drew 21 of its 25 tiles from the arrival
    //  point, the Hamalayi's 9 of 16 — one call each, for ground nearly all in view; in quarters, 4 calls at most)
    const TILE = this.tile, SQ = [];
    for (let tj = 0; tj < this.segs; tj += TILE) {
      for (let ti = 0; ti < this.segs; ti += TILE) {
        const j1 = Math.min(this.segs, tj + TILE), i1 = Math.min(this.segs, ti + TILE);
        let hi = -1e9, lo = 1e9;
        for (let j = tj; j <= j1; j++) for (let i = ti; i <= i1; i++) { const h = this.heights[j * n + i]; if (h > hi) hi = h; if (h < lo) lo = h; }
        if (hi < -4) continue;
        if (this.squares > 0) { SQ.push([ti, tj, i1, j1, lo, hi]); continue; }
        group.add(this._tileMesh(geo, mat, ti, tj, i1, j1, lo, hi));
      }
    }
    if (SQ.length) { const bm = this._squares(geo, mat, SQ); bm.userData.tiles = SQ; group.add(bm); }   // (tiles: the probes rebuild them, _tileMesh)
    group.userData.full = geo; // (the whole grid, for anything that wants it in one piece)
    if (this.lawnStats) group.userData.lawnStats = this.lawnStats;   // (LAWN-EDGES-2: its cost, for the probes)
    return group;
  }

  // LAWN-EDGES-2 (?lawnedge=new): per grid point, [the signed distance (m) to the grass/soil edge: + on the grass, − on
  // the soil, ±EDGE_RANGE far from one; the soil's strength 0..1]. The edge is the 0.5 line of the soil's share of grass + soil (splat w[3] / (w[0] + w[3]),
  // the ratio the shader splits on), found in the cells whose corners lie on both sides: the splat sampled on a fine
  // grid (LE_SUB × LE_SUB a cell; the corners are the grid points themselves, so the classes agree) and its 0.5 line
  // traced (marching squares). Each grid point within LE_R m takes its distance to the nearest piece, and the distances
  // are smoothed once (1-2-1): a distance is linear across a straight edge, so the smoothing keeps it; it rounds the
  // steps of a splat that is itself stepped by the grid (the isles' routes, read at the nearest data point). The
  // smoothing never moves a point to the other side (a route one point wide would vanish).
  // A point with no grass or soil (paving, sand, snow, rock: under 1 % of the two) takes the side of the piece it is
  // nearest to, or with none near, its neighbours' side.
  // Nothing else changes: the splat, the heights and the scatter (which reads the splat functions, not this) as before.
  // ROCK-EDGES (?rockedge=new): the same, in one pass sharing the fine samples, for the rock's share and the paving's
  // share of what is not rock (the `rockedge` attribute); the lawn's result is the same with it or without.
  _edgeChannels(spl, spl2, slopes) {
    const t0 = performance.now(), n = this.segs + 1, S = LE_SUB, NF = this.segs * S + 1, st = this.step, fs = st / S;
    // the channels: [name, threshold, the value at a grid point k, the value from a fine sample's weights w (sum: their
    // sum), the weight of a grid point's side when it has no value (NaN), the trace's step in fine samples]
    const C = [];
    if (LAWN_EDGE) C.push(['lawn', 0.5, (k) => { const g = spl[k * 4] + spl[k * 4 + 3]; return g > 0.01 ? spl[k * 4 + 3] / g : NaN; },
      (w, sum) => { const g = (w[0] + w[3]) / sum; return g > 0.01 ? w[3] / (w[0] + w[3]) : NaN; }, (k) => spl[k * 4] + spl[k * 4 + 3], 1]);
    // ROCK-EDGES: the rock's share of all (the shader splits on it: rk), at the old split's mean midpoint for this terrain's
    // tile (this.rockThr); the paving's share of the ground that is not rock (pk's ratio, sp2 / ns)
    // (the rock's line on fine samples at most ~0.5 m apart: on the grids of 1 m or less (Citadel, the desert, the
    //  Hamalayi) every second one, 2 × 2 a cell — there the rock has 3–100× the lawn's cells, and at 4 × 4 it tripled
    //  Citadel's build time; on the isles' 1.7 m grid all 4 × 4, as the lawn's. The paving's at 4 × 4 everywhere: its
    //  edges are often a step (paved(), the posts), and its cells are few)
    if (ROCK_EDGE) {
      C.push(['rock', this.rockThr, (k) => spl[k * 4 + 2], (w, sum) => w[2] / sum, () => 1, st > 1.2 ? 1 : 2]);
      const nr = (k) => spl[k * 4] + spl[k * 4 + 1] + spl[k * 4 + 3] + spl2[k];
      C.push(['pave', 0.5, (k) => { const g = nr(k); return g > 0.01 ? spl2[k] / g : NaN; },
        (w, sum) => { const g = w[0] + w[1] + w[3] + w[4]; return g / sum > 0.01 ? w[4] / g : NaN; }, nr, 1]);
    }
    const NC = C.length, ratios = C.map(([, , gv]) => { const r = new Float32Array(n * n); for (let k = 0; k < n * n; k++) r[k] = gv(k); return r; });
    // the fine samples, shared by the channels and by neighbouring cells: the splat at each, one value per channel
    const fine = new Map(), w = [0, 0, 0, 0, 0];
    const sl = (i, j) => slopes[Math.max(0, Math.min(this.segs, j)) * n + Math.max(0, Math.min(this.segs, i))];
    const at = (c, I, J) => {
      const i = Math.min(this.segs - 1, Math.floor(I / S)), j = Math.min(this.segs - 1, Math.floor(J / S)), fx = I / S - i, fz = J / S - j;
      if (fx === 0 && fz === 0) return ratios[c][j * n + i];
      const key = J * NF + I; let v = fine.get(key);
      if (v === undefined) {
        const x = this.x0 + I * fs, z = this.z0 + J * fs;
        const h00 = this._h(i, j), h10 = this._h(i + 1, j), h01 = this._h(i, j + 1), h11 = this._h(i + 1, j + 1);
        const h = fx + fz < 1 ? h00 + (h10 - h00) * fx + (h01 - h00) * fz : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
        const slope = (sl(i, j) * (1 - fx) + sl(i + 1, j) * fx) * (1 - fz) + (sl(i, j + 1) * (1 - fx) + sl(i + 1, j + 1) * fx) * fz;
        this.splatFn(x, z, h, slope, w);
        const sum = w[0] + w[1] + w[2] + w[3] + w[4] || 1;
        v = C.map((ch) => ch[3](w, sum));
        fine.set(key, v);
      }
      return v[c];
    };
    const outs = [], stats = {};
    for (let c = 0; c < NC; c++) {
      const [name, thr, , , wtOf, u] = C[c], ratio = ratios[c], fq = fs * u;
      const side = (v) => (v >= thr ? 1 : 0);
      // the cells the edge crosses
      const cells = [];
      for (let j = 0; j < this.segs; j++) for (let i = 0; i < this.segs; i++) {
        const a = ratio[j * n + i], b = ratio[j * n + i + 1], cc = ratio[(j + 1) * n + i], d = ratio[(j + 1) * n + i + 1];
        let s0 = 0, s1 = 0;
        for (const v of [a, b, cc, d]) if (v === v) { if (side(v)) s1++; else s0++; }
        if (s0 && s1) cells.push(i, j);
      }
      // the line's pieces, per cell: [x0, z0, x1, z1, gx, gz] (g: toward the inner side: the soil, the rock, the paving)
      const segs = new Map(), P = [];
      let nSeg = 0;
      for (let q = 0; q < cells.length; q += 2) {
        const ci = cells[q], cj = cells[q + 1], list = [];
        for (let b = 0; b < S; b += u) for (let a = 0; a < S; a += u) {
          const I = ci * S + a, J = cj * S + b;
          const v00 = at(c, I, J) - thr, v10 = at(c, I + u, J) - thr, v01 = at(c, I, J + u) - thr, v11 = at(c, I + u, J + u) - thr;
          if (!(v00 === v00 && v10 === v10 && v01 === v01 && v11 === v11)) continue;
          const X = this.x0 + I * fs, Z = this.z0 + J * fs;
          P.length = 0;
          const cut = (va, vb, xa, za, xb, zb) => { if ((va < 0) !== (vb < 0)) { const f = va / (va - vb); P.push(xa + (xb - xa) * f, za + (zb - za) * f); } };
          cut(v00, v10, X, Z, X + fq, Z); cut(v10, v11, X + fq, Z, X + fq, Z + fq); cut(v11, v01, X + fq, Z + fq, X, Z + fq); cut(v01, v00, X, Z + fq, X, Z);
          if (P.length < 4) continue;
          const gx = (v10 - v00 + v11 - v01), gz = (v01 - v00 + v11 - v10);
          list.push(P[0], P[1], P[2], P[3], gx, gz); nSeg++;
          if (P.length === 8) { list.push(P[4], P[5], P[6], P[7], gx, gz); nSeg++; }
        }
        if (list.length) segs.set(cj * n + ci, list);
      }
      // each grid point near a piece: its distance to the nearest, and that piece's side
      const best = new Float32Array(n * n).fill(Infinity), sgn = new Int8Array(n * n);
      const R = Math.max(2, Math.ceil(LE_R / st));
      for (const [ck, L] of segs) {
        const ci = ck % n, cj = (ck - ci) / n;
        for (let j = Math.max(0, cj - R + 1); j <= Math.min(this.segs, cj + R); j++) for (let i = Math.max(0, ci - R + 1); i <= Math.min(this.segs, ci + R); i++) {
          const k = j * n + i, px = this.x0 + i * st, pz = this.z0 + j * st;
          for (let s = 0; s < L.length; s += 6) {
            const ax = L[s], az = L[s + 1], dx = L[s + 2] - ax, dz = L[s + 3] - az, ll = dx * dx + dz * dz;
            const f = ll > 1e-12 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / ll)) : 0;
            const ex = px - ax - dx * f, ez = pz - az - dz * f, d = Math.hypot(ex, ez);
            if (d < best[k]) { best[k] = d; sgn[k] = ex * L[s + 4] + ez * L[s + 5] > 0 ? -1 : 1; }
          }
        }
      }
      // (a point with no value and no piece near takes the side of its neighbours that have one, weighed by their
      //  share (the lawn's: grass + soil; the paving's: what is not rock): between a trodden way and the snow or sand
      //  beside it no edge is drawn, as before)
      const D = new Float32Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = j * n + i, r = ratio[k];
        let cls;
        if (r === r) cls = side(r) ? -1 : 1;
        else if (best[k] < Infinity) cls = sgn[k];
        else {
          let a = 0;
          for (let b = -1; b <= 1; b++) for (let cc = -1; cc <= 1; cc++) {
            const ii = i + cc, jj = j + b; if (ii < 0 || jj < 0 || ii > this.segs || jj > this.segs) continue;
            const kk = jj * n + ii, rr = ratio[kk]; if (rr === rr) a += (side(rr) ? -1 : 1) * wtOf(kk);
          }
          cls = a < 0 ? -1 : 1;
        }
        D[k] = cls * Math.min(EDGE_RANGE, best[k]);
      }
      // smoothed once (1-2-1 each way) where a piece is near
      const out = new Int16Array(n * n * 2), q16 = (v) => Math.round(Math.max(-1, Math.min(1, v / EDGE_RANGE)) * 32767);
      let near = 0, kept = 0;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = j * n + i;
        let v = D[k];
        if (best[k] < EDGE_RANGE) {
          near++;
          let a = 0, ws = 0;
          for (let b = -1; b <= 1; b++) for (let cc = -1; cc <= 1; cc++) {
            const ii = i + cc, jj = j + b; if (ii < 0 || jj < 0 || ii > this.segs || jj > this.segs) continue;
            const wt = (2 - Math.abs(cc)) * (2 - Math.abs(b)); a += D[jj * n + ii] * wt; ws += wt;
          }
          v = a / ws;
          if (v * D[k] < 0) { v = D[k]; kept++; }   // (never across the point's own side: a strip one point wide stays)
        }
        out[k * 2] = q16(v);
        // the inner side's strength: the strongest share among the point and its neighbours, so it does not fall across
        // the edge (the old split, now inside the cut: a faint trodden way stays faint, a strong soil is whole to the line)
        let st2 = ratio[k] === ratio[k] ? ratio[k] : 0;
        for (let b = -1; b <= 1; b++) for (let cc = -1; cc <= 1; cc++) {
          const ii = i + cc, jj = j + b; if (ii < 0 || jj < 0 || ii > this.segs || jj > this.segs) continue;
          const rr = ratio[jj * n + ii]; if (rr >= thr && rr > st2) st2 = rr;
        }
        out[k * 2 + 1] = Math.round(Math.min(1, st2) * 32767);
      }
      outs.push(out);
      stats[name] = { thr: +thr.toFixed(3), sub: S / u, cells: cells.length / 2, pieces: nSeg, near, kept, bytes: out.byteLength };
    }
    const res = {};
    if (LAWN_EDGE) res.lawn = outs[0];
    if (ROCK_EDGE) {   // (one attribute: [rock distance, rock strength, paving distance, paving strength])
      const r = outs[NC - 2], p = outs[NC - 1], o = new Int16Array(n * n * 4);
      for (let k = 0; k < n * n; k++) { o[k * 4] = r[k * 2]; o[k * 4 + 1] = r[k * 2 + 1]; o[k * 4 + 2] = p[k * 2]; o[k * 4 + 3] = p[k * 2 + 1]; }
      res.rock = o;
    }
    this.lawnStats = { ms: +(performance.now() - t0).toFixed(1), step: +st.toFixed(3), verts: n * n, samples: fine.size, ...stats, bytes: (res.lawn?.byteLength || 0) + (res.rock?.byteLength || 0) };
    return res;
  }

  // one tile of the grid: its own index over the shared vertex data, its own bounds
  _tileMesh(geo, mat, ti, tj, i1, j1, lo, hi) {
    const n = this.segs + 1, ix = new Uint32Array((j1 - tj) * (i1 - ti) * 6);
    let q = 0;
    for (let j = tj; j < j1; j++) for (let i = ti; i < i1; i++) {
      const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
      ix[q++] = a; ix[q++] = d; ix[q++] = b; ix[q++] = e; ix[q++] = b; ix[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    for (const [k, at] of Object.entries(geo.attributes)) g.setAttribute(k, at);
    g.setIndex(new THREE.BufferAttribute(ix, 1));
    const bx0 = this.x0 + ti * this.step, bx1 = this.x0 + i1 * this.step, bz0 = this.z0 + tj * this.step, bz1 = this.z0 + j1 * this.step;
    g.boundingBox = new THREE.Box3(new THREE.Vector3(bx0, lo, bz0), new THREE.Vector3(bx1, hi, bz1));
    g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.name = 'terrain';
    // PERF-BATTERY: drawn after the other opaque things (three sorts opaque draws by renderOrder first), so the
    // ground under houses, walls, trees and people is rejected by the depth test before its splat shader runs:
    // on Citadel's street at Medium the terrain's shaded fragments 1.08M → 0.72M (all opaque ones 1.70M → 1.42M,
    // for 1.04M pixels); 22–72 of 1.05M pixels differ, where something lies exactly on the ground
    m.renderOrder = 1;
    return m;
  }

  // HEADING-LOAD-2: the tiles drawn (those not wholly deep under the sea, as above) in squares of `squares` cells a side,
  // each its own geometry in ONE BatchedMesh: three tests each square's bounds against the view and draws the ones in
  // it with one multi-draw. A region's tiles are quarters of its patch (PERF-CALLS: few calls), so the ground behind
  // the camera went to the GPU with the ground in view: the desert drew 124k triangles a frame on average over a
  // turn for 43k in view, the Hamalayi 53k for 13k. The same vertices (positions, normals, colours, splats copied
  // from the whole grid), the same triangles, material and draw order rule (renderOrder 1): the same pixels — two
  // squares meet on the very same edge, where the rasteriser gives each pixel to one triangle as within a tile.
  _squares(geo, mat, tiles) {
    const n = this.segs + 1, S = this.squares, parts = [];
    let nv = 0, ni = 0;
    for (const [ti, tj, ti1, tj1] of tiles) {
      for (let sj = tj; sj < tj1; sj += S) for (let si = ti; si < ti1; si += S) {
        const i1 = Math.min(ti1, si + S), j1 = Math.min(tj1, sj + S), w = i1 - si + 1, h = j1 - sj + 1;
        const g = new THREE.BufferGeometry();
        for (const [k, at] of Object.entries(geo.attributes)) {
          const c = at.itemSize, src = at.array, a = new src.constructor(w * h * c);
          for (let j = 0; j < h; j++) a.set(src.subarray(((sj + j) * n + si) * c, ((sj + j) * n + si + w) * c), j * w * c);
          g.setAttribute(k, new THREE.BufferAttribute(a, c, at.normalized));
        }
        const ix = new Uint32Array((w - 1) * (h - 1) * 6);
        let q = 0;
        for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
          const a = j * w + i, b = a + 1, d = a + w, e = d + 1;
          ix[q++] = a; ix[q++] = d; ix[q++] = b; ix[q++] = e; ix[q++] = b; ix[q++] = d;
        }
        g.setIndex(new THREE.BufferAttribute(ix, 1));
        parts.push(g); nv += w * h; ni += ix.length;
      }
    }
    const bm = new THREE.BatchedMesh(parts.length, nv, ni, mat);
    for (const g of parts) bm.addInstance(bm.addGeometry(g));
    bm.receiveShadow = true; bm.name = 'terrain'; bm.renderOrder = 1;   // (renderOrder: PERF-BATTERY, above)
    return bm;
  }

  // Texture splatting: five painted tiles blended per vertex
  // (grass, sand, rock, dirt, cobbles), tinted by the vertex colour. The shader's text: splatShader() below.
  _splatMaterial(mat) {
    const T = this.tex;
    // (QUIET-ROCK: T.rockTop, the rock's tile seen from above (the flat ground; the faces keep T.rock), times T.rockTopK)
    const uniforms = { tGrass: { value: T.grass }, tSand: { value: T.sand }, tRock: { value: T.rock }, tRockTop: { value: T.rockTop || T.rock }, uRockTop: { value: new THREE.Vector3(...(T.rockTopK || [1, 1, 1])) }, uRockMid: { value: this.rockMid ?? 0.3 }, tDirt: { value: T.dirt }, tCobble: { value: T.cobble } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      const S = splatShader(TERRAIN_SHADE);
      sh.vertexShader = S.vpre + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + S.vert);
      sh.fragmentShader = S.fpre + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + S.frag);
      if (S.light) sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', S.light);
      if (S.out) sh.fragmentShader = sh.fragmentShader.replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', S.out);
      dlHook(sh, mat);   // (DEPTH-LOOK: ?depth=, off by default: nothing)
    };
    mat.customProgramCacheKey = () => shadeKey(TERRAIN_SHADE);
    MATS.add(mat); mat.addEventListener('dispose', () => MATS.delete(mat));
  }

  // Heights packed into an 8-bit texture (range -10..20m) for the water shader's shore foam.
  _heightTexture() {
    const n = this.segs + 1;
    const data = new Uint8Array(n * n);
    for (let k = 0; k < n * n; k++) data[k] = Math.max(0, Math.min(255, Math.round(((this.heights[k] + 10) / 30) * 255)));
    const tex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }
}
