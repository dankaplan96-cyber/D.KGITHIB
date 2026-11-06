// Ballastra's handles for the story (EXPANSION_WORLD_SPEC.md): one object, one entry per place, each filled when its
// place is built (regions.js builds them lazily, the first time they are needed).
//   BALLASTRA.harbor   W-1 Float Harbor (harbor.js): the region 'ballastra' and the room 'bl_shed'
//   BALLASTRA.arches   W-2 The Arch District (arches.js): the region 'bl_arches', the rooms 'bl_oren', 'bl_mags', 'bl_pump'
// (W-4's warehouse … add their own entries)
export const BALLASTRA = { harbor: null, arches: null };
// where Ballastra's places stand in the world: far from every other region (Citadel at 0, the rooms along z = 0 up to
// x 8 800, the Zeelich islands along z = 1 800). Each place is its own lazy group.
export const BALLASTRA_AT = { ballastra: { x: 3000, z: -3000 }, bl_shed: { x: 3800, z: -3000 },
  bl_arches: { x: 3000, z: -3800 }, bl_oren: { x: 3800, z: -3800 }, bl_mags: { x: 3900, z: -3800 }, bl_pump: { x: 4000, z: -3800 } };
