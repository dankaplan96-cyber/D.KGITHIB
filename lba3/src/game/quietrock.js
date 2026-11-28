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

// the granite with more of its own variation: each channel stretched about its mean by `c` (sRGB, clamped). For a place
// whose rock is so dark that the plain granite's speckle all but vanishes (Under Celebration); its tint is worked out
// from it as for the plain one (tileTint), so its mean colour in linear light is the same
export const graniteVivid = (c) => ctex('isle-granite-v' + c, 512, 512, (x, S) => {
  x.drawImage(graniteTex().image, 0, 0);
  const im = x.getImageData(0, 0, S, S), d = im.data, m = [0, 0, 0], n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { m[0] += d[i]; m[1] += d[i + 1]; m[2] += d[i + 2]; }
  for (let k = 0; k < 3; k++) m[k] /= n;
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, Math.round(m[k] + (d[i + k] - m[k]) * c)));
  x.putImageData(im, 0, 0);
});

// the terrain's textures with the quiet flat rock over `rock` (the cliff tile): { rockTop, rockTopK }, or nothing
// with ?quietrock=old. SCREEN: the tint times 0.9. At the same mean in linear light the quieter tile read brighter on
// screen (the tone curve and the sRGB encoding are concave: less contrast, a higher mean), by 3–10 levels in boxes of
// flat rock at the play camera (QUIET-ROCK.md); times 0.9 brings them back to within a few levels.
const SCREEN = 0.9;
// PLACE (the user, 26.11: "brighten the places that came out darker"): the 0.9 was fitted to the bright places (Citadel's
// grey, the desert, Mosquibee); the dark ones came out darker than their old rock. Per place (`place`: the terrain's
// caller's name), a factor per channel on the tint, fitted to the sunlit flat rock's mean colour on the captures
// (QUIET-ROCK.md "Brightness per place"), and for Under Celebration more of the granite's own variation (`vivid`).
// Anything else: times 1. Only the read from above changes (the faces keep the cliff tile).
const PLACE = {
  citadel: { k: [1.045, 1.04, 1.055] },
  celebration: { k: [1.19, 1.19, 1.2] },
  undergas: { k: [1.08, 1.08, 1.08], vivid: 1.7 },
  platform: { k: [1.27, 1.27, 1.27] },
};
export function quietRock(rock, place) {
  if (!QUIET_ROCK) return {};
  const P = PLACE[place] || {}, g = P.vivid ? graniteVivid(P.vivid) : graniteTex(), k = P.k || [1, 1, 1];
  return { rockTop: g, rockTopK: tileTint(rock, g).map((v, i) => v * SCREEN * k[i]) };
}
