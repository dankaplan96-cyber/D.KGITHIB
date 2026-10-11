// Heightfield terrain. Gameplay height queries interpolate the exact same
// triangles that are rendered, so feet never float or sink.
import * as THREE from 'three';

export class Terrain {
  constructor({ size, segs, heightFn, colorFn, splatFn, textures }) {
    this.splatFn = splatFn;
    this.tex = textures;
    this.size = size;
    this.segs = segs;
    this.half = size / 2;
    this.step = size / segs;
    const n = segs + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        this.heights[j * n + i] = heightFn(-this.half + i * this.step, -this.half + j * this.step);
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

  heightAt(x, z) {
    const gx = (x + this.half) / this.step;
    const gz = (z + this.half) / this.step;
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
        const x = -this.half + i * this.step, z = -this.half + j * this.step;
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
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
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
          vec3 tex = texture2D(tGrass, tuv).rgb * sp.x
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
