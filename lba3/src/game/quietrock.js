// QUIET-ROCK (the user, 26.11: "apply the quiet rock game-wide"; docs/lba-maturity/QUIET-ROCK.md). The cliff tile's
// light facets and dark cracks read busy on flat ground, like crazy paving. Knartas took Otringal's pale granite for
// its rock (#17b, KNARTAS-PALETTE.md). Every other terrain whose rock is the cliff tile now reads the granite for its
// flat rock only: the triplanar's read from above (terrain.js tRockTop), tinted to the cliff tile's mean colour in
// linear light (tileTint), so each place keeps its own rock colour (its vertex colours are unchanged). The steep faces
// keep the carved cliff tile. One shared 512² texture (the same ctex key as Otringal's and Knartas's), no new draw,
// program or per-frame work. ?quietrock=old: the cliff tile on the flat as before.
import { rng } from '../engine/math.js';
import { tileTint } from '../engine/terrain.js';
import { ctex } from './kit.js';

export const QUIET_ROCK = (() => { try { return new URLSearchParams(globalThis.location?.search || '').get('quietrock') !== 'old'; } catch { return true; } })();

// (ZEELICH-2: the original's Otringal rock, pale and speckled: a neutral grey with white and dark flecks and a little
// moss grey, lit planes and cracks; used triplanar on Otringal's and Knartas's ground and cliffs)
export const graniteTex = () => ctex('isle-granite', 512, 512, (x, S) => {
  const r = rng(77);
  x.fillStyle = '#bcb8b0'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    const px = r() * S, py = r() * S, w = 18 + r() * 60, h = 10 + r() * 30, t = r();
    x.fillStyle = t < 0.4 ? 'rgba(232,230,224,0.5)' : t < 0.7 ? 'rgba(120,118,110,0.35)' : 'rgba(150,154,138,0.35)';
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.ellipse(px + ox, py + oy, w / 2, h / 2, r() * 3, 0, 7); x.fill(); }
  }
  x.strokeStyle = 'rgba(70,68,62,0.5)'; x.lineWidth = 1.6;
  for (let i = 0; i < 50; i++) {
    let px = r() * S, py = r() * S; const pts = [[px, py]];
    for (let k = 0; k < 5; k++) { px += 8 + r() * 20; py += (r() - 0.5) * 10; pts.push([px, py]); }
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy))); x.stroke(); }
  }
  for (let i = 0; i < 2600; i++) { const t = r(); x.fillStyle = t < 0.45 ? '#f2f0ea' : t < 0.8 ? '#6a6860' : '#7c8270'; x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
});

// the terrain's textures with the quiet flat rock over `rock` (the cliff tile): { rockTop, rockTopK }, or nothing
// with ?quietrock=old. SCREEN: the tint times 0.9. At the same mean in linear light the quieter tile read brighter on
// screen (the tone curve and the sRGB encoding are concave: less contrast, a higher mean), by 3–10 levels in boxes of
// flat rock at the play camera (QUIET-ROCK.md); times 0.9 brings them back to within a few levels.
const SCREEN = 0.9;
export function quietRock(rock) {
  if (!QUIET_ROCK) return {};
  const g = graniteTex();
  return { rockTop: g, rockTopK: tileTint(rock, g).map((v) => v * SCREEN) };
}
