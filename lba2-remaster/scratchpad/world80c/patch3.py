p = 'src/game/cliffs.js'; s = open(p).read()
def R(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (s.count(a), a[:80]); s = s.replace(a, b)
R("""export function buildCliffRocks(parent, terrain, tex, { skip = () => false, step = 1.9, minDrop = 1.75 } = {}) {
  const H = (x, z) => terrain.heightAt(x, z);""", """// decide: the ground the blocks are chosen on (default the terrain). WORLD-80: world.js passes the ground as it stood
// before a change, so the random draws (and every block after a changed one) stay as they were; each chosen block is
// then shaped on the real ground.
export function buildCliffRocks(parent, terrain, tex, { skip = () => false, step = 1.9, minDrop = 1.75, decide = terrain } = {}) {
  const H = (x, z) => terrain.heightAt(x, z), DH = (x, z) => decide.heightAt(x, z);""")
R("""      if (terrain.slopeAt(px, pz) < 1.05 || skip(px, pz)) continue;
      // uphill direction
      const e = 0.5;
      let gx = H(px + e, pz) - H(px - e, pz), gz = H(px, pz + e) - H(px, pz - e);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-3) continue;
      gx /= gl; gz /= gl;
      // the drop: highest point a little uphill, lowest a little downhill
      let top = -1e9, bot = 1e9, tTop = 0, tBot = 0;
      for (let t = 0; t <= 2.6; t += 0.2) {
        const hu = H(px + gx * t, pz + gz * t), hd = H(px - gx * t, pz - gz * t);
        if (hu > top) { top = hu; tTop = t; }
        if (hd < bot) { bot = hd; tBot = t; }
      }
      if (top - bot < minDrop || bot < -1.6) continue;""", """      if (decide.slopeAt(px, pz) < 1.05 || skip(px, pz)) continue;
      // uphill direction
      const e = 0.5;
      const uphill = (G) => { const ux = G(px + e, pz) - G(px - e, pz), uz = G(px, pz + e) - G(px, pz - e), l = Math.hypot(ux, uz); return l < 1e-3 ? null : [ux / l, uz / l]; };
      // the drop: highest point a little uphill, lowest a little downhill
      const drop = (G, gx, gz) => {
        let top = -1e9, bot = 1e9, tTop = 0, tBot = 0;
        for (let t = 0; t <= 2.6; t += 0.2) {
          const hu = G(px + gx * t, pz + gz * t), hd = G(px - gx * t, pz - gz * t);
          if (hu > top) { top = hu; tTop = t; }
          if (hd < bot) { bot = hd; tBot = t; }
        }
        return [top, bot, tTop, tBot];
      };
      let g = uphill(DH);
      if (!g) continue;
      let [gx, gz] = g, [top, bot, tTop, tBot] = drop(DH, gx, gz);
      if (top - bot < minDrop || bot < -1.6) continue;
      // (chosen on the decision ground: shaped on the real one)
      if (decide !== terrain) { g = uphill(H) || g; [gx, gz] = g; [top, bot, tTop, tBot] = drop(H, gx, gz); }""")
open(p, 'w').write(s)

p = 'src/game/world.js'; s = open(p).read()
R("""  W_cliffs = buildCliffRocks(scene, terrain, TX.cliff, {
    skip: (x, z) => pathDistScatter(x, z) < 3.2 || boxDist(""", """  // (WORLD-80: the scatter's view of the ground, as it stood before step 2: see PATHS_SCATTER)
  const SG = scatterGround(terrain), HS = SG.heightAt;
  W_cliffs = buildCliffRocks(scene, terrain, TX.cliff, {
    decide: SG,
    skip: (x, z) => pathDistScatter(x, z) < 3.2 || boxDist(""")
R("""  const SG = scatterGround(terrain), HS = SG.heightAt;
  const isletSteep""", """  const isletSteep""")
open(p, 'w').write(s)
print('ok')
