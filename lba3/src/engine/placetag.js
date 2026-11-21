// PLACE-2: a name for the next pieces a builder draws, for tests/place-scan.mjs (tests/lib/placerec.js), where the
// builder draws a piece inline (a bench of a long loop) and its function's name says nothing. Each call starts a new
// piece; placeTag(null) ends the naming. In play (no recorder) it is one property read.
export function placeTag(name) { const R = globalThis.__PLACE_REC; if (R) { R.tag = name; R.tagN++; } }
