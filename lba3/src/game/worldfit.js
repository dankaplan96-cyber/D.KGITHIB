// WORLD-FIX: what each builder knows about its buildings, kept for tests/worldfit.mjs (the scan of footprints against
// the ground and of façades for parts on top of each other). Nothing in the game reads it; registering costs one
// small object per building at build time.
//
// fitAdd({ region, name, x, z, ry, oy, w, d, base, floor, plinth, steps, sides, top, openings })
//   region   'citadel' | 'zeelich' | 'isle_<name>' | 'desert' | 'hamalayi'
//   x, z, ry the footprint's centre and turn: local x → world (cos ry, −sin ry), local z → (sin ry, cos ry); the
//            front (the door side) faces local +z
//   w, d     the walls' outer size along local x and z (the plinth may stand a little proud of it)
//   oy       the world y of the building's own origin; base, plinth, floor and the openings' y are above it
//   base     the lowest drawn y of the plinth or walls (ground lower than this shows a gap under the building)
//   plinth   the y up to which ground may cover the building (the plinth's top: above it the ground eats the wall)
//   floor    the door sill (ground in front of a door must not be above it)
//   steps    how far below the sill ground may fall in front of a door (a step or two)
//   sides    { front, back, left, right }: each wall's half-length free of corner quoins/piers, seen from outside
//   top      { front, back, left, right }: the highest y an opening may reach (under the eaves or the frieze)
//   openings [{ side, kind: 'door'|'window'|'balcony'|'step'|'lamp'|'sign'|'pipe', x0, x1, y0, y1 }] in wall
//            coordinates seen from outside (x along the wall from its centre), everything that stands round the
//            opening included (surround, alfiz, lintel, sill, open shutter leaves, flower box)
// Wall coordinates follow the kits' panels (architecture.js, props-esmer.js): front x → local +x, back x → local −x,
// left x → local +z (at local x −w/2), right x → local −z (at local x +w/2).
export const FIT = [];
export function fitAdd(b) {
  b.oy ??= 0;
  b.steps ??= 0.5;
  b.openings ??= [];
  FIT.push(b);
  return b;
}
// a side's wall-local (u along the wall, v out from it) → building-local (lx, lz)
export function sideLocal(b, side, u, v = 0) {
  if (side === 'front') return [u, b.d / 2 + v];
  if (side === 'back') return [-u, -b.d / 2 - v];
  if (side === 'left') return [-b.w / 2 - v, u];
  return [b.w / 2 + v, -u];
}
export function toWorld(b, lx, lz) {
  const c = Math.cos(b.ry), s = Math.sin(b.ry);
  return [b.x + c * lx + s * lz, b.z - s * lx + c * lz];
}
