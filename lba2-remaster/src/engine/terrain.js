// Heightfield terrain. Gameplay height queries interpolate the exact same
// triangles that are rendered, so feet never float or sink.
import * as THREE from 'three';

export class Terrain {
  constructor({ size, segs, heightFn, colorFn, splatFn, textures, cx = 0, cz = 0 }) {
    this.splatFn = splatFn;
    this.tex = textures;
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
    if (this.patches) for (const p of this.patches) {
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
    const w = [0, 0, 0, 0, 0];
    const c = new THREE.Color();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = this.x0 + i * this.step, z = this.z0 + j * this.step;
        const h = this.heights[k];
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        const slope = Math.hypot(this._h(i + 1, j) - this._h(i - 1, j), this._h(i, j + 1) - this._h(i, j - 1)) / (2 * this.step);
        colorFn(x, z, h, slope, c);
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
        if (this.splatFn) {
          this.splatFn(x, z, h, slope, w);
          const sum = w[0] + w[1] + w[2] + w[3] + w[4] || 1;
          for (let q = 0; q < 4; q++) spl[k * 4 + q] = w[q] / sum;
          spl2[k] = w[4] / sum;
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
      this._splatMaterial(mat);
    }
    // drawn in tiles of TILE × TILE cells sharing the vertex data, each with its own bounds, so the camera
    // culls what it doesn't see; tiles wholly deep under the sea (the water there is opaque) aren't drawn
    const group = new THREE.Group(); group.name = 'terrain';
    const TILE = 40;
    for (let tj = 0; tj < this.segs; tj += TILE) {
      for (let ti = 0; ti < this.segs; ti += TILE) {
        const j1 = Math.min(this.segs, tj + TILE), i1 = Math.min(this.segs, ti + TILE);
        let hi = -1e9, lo = 1e9;
        for (let j = tj; j <= j1; j++) for (let i = ti; i <= i1; i++) { const h = this.heights[j * n + i]; if (h > hi) hi = h; if (h < lo) lo = h; }
        if (hi < -4) continue;
        const ix = new Uint32Array((j1 - tj) * (i1 - ti) * 6);
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
        group.add(m);
      }
    }
    group.userData.full = geo; // (the whole grid, for anything that wants it in one piece)
    return group;
  }

  // Texture splatting: five painted tiles blended per vertex
  // (grass, sand, rock, dirt, cobbles), tinted by the vertex colour.
  _splatMaterial(mat) {
    const T = this.tex;
    const uniforms = { tGrass: { value: T.grass }, tSand: { value: T.sand }, tRock: { value: T.rock }, tDirt: { value: T.dirt }, tCobble: { value: T.cobble } };
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = 'attribute vec4 splat; attribute float splat2; varying vec4 vSplat; varying float vSplat2; varying vec3 vWPos; varying vec3 vWNrm;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSplat = splat; vSplat2 = splat2; vWPos = (modelMatrix * vec4(position, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = 'uniform sampler2D tGrass, tSand, tRock, tDirt, tCobble; varying vec4 vSplat; varying float vSplat2; varying vec3 vWPos; varying vec3 vWNrm;\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          vec2 tuv = vWPos.xz * 0.22;
          // cliffs: triplanar rock so steep faces show undistorted strata
          vec3 bw = pow(abs(normalize(vWNrm)), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
          vec3 rock = texture2D(tRock, vec2(vWPos.z, vWPos.y * 1.25) * 0.14).rgb * bw.x
                    + texture2D(tRock, vec2(vWPos.x, vWPos.y * 1.25) * 0.14).rgb * bw.z
                    + texture2D(tRock, vWPos.xz * 0.14).rgb * bw.y;
          // crisp rock edges (the cliff rim is a hard line in LBA2, not a fade)
          vec4 sp = vSplat; float sp2 = vSplat2;
          float rk = smoothstep(0.28, 0.62, sp.z);
          float rest = 1.0 - sp.z;
          float kk = rest > 0.001 ? (1.0 - rk) / rest : 0.0;
          sp = vec4(sp.x * kk, sp.y * kk, rk, sp.w * kk); sp2 *= kk;
          // crisp soil edges too (paths and town soil): the grass/soil share is re-split per pixel with a
          // short ramp, wobbled by the grass texture so the edge looks painted, not ruled
          vec3 gtex = texture2D(tGrass, tuv).rgb;
          float gs = sp.x + sp.w;
          if (gs > 0.001) {
            float d = sp.w / gs + (dot(gtex, vec3(0.333)) - 0.42) * 0.35;
            float dk = smoothstep(0.42, 0.58, d);
            sp.x = gs * (1.0 - dk); sp.w = gs * dk;
          }
          vec3 tex = gtex * sp.x
                   + texture2D(tSand, tuv * 1.2).rgb * sp.y
                   + rock * sp.z
                   + texture2D(tDirt, tuv * 1.3).rgb * sp.w
                   + texture2D(tCobble, vWPos.xz * 0.25).rgb * sp2;
          diffuseColor.rgb *= tex;`);
    };
    mat.customProgramCacheKey = () => 'terrain-splat';
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
