// STABILIZATION (docs/lba3-performance/STABILIZATION.md): the GPU/rendering investigator's benchmark variants, one per
// group of GPU work (no vegetation, no water, no particles, no characters, no terrain detail, shadow casters only …),
// run in the full benchmark's Medium breakdown on the same frozen route as the others (bench.js adds each one, its id
// prefixed "GPU group: "). This file belongs to the GPU investigator: bench.js only reads the list.
// Each entry: { id, apply(), undo() } — as bench.js's own variants; `this` is the entry (keep state on it).
//   G: the Game · R: the game's Renderer (renderer.js)
export function gpuVariants(G, R) { // eslint-disable-line no-unused-vars
  return [];
}
