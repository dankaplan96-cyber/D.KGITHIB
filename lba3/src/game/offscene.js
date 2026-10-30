// PACE-SIM: what the simulation may leave be. The game shows one scene at a time — Citadel, one interior, or one outdoor
// area (Zeelich, Desert Island, the Hamalayi, an island) — far apart from each other. A person or an enemy that nobody
// can see and that can reach nobody, while it is calm (a person with no walk of the story's to follow and in no
// conversation; an enemy idle, on patrol or on guard), needs nothing changed: its update is skipped and it waits exactly
// as it is. On the way back it is where it was, with no catching up to do and nothing to pop.
//
// offScene(game, actor) is true only:
//   - in play or dialogue (the title, cut-scenes and cinematics may show any scene: everything runs there),
//   - outside a scene change's fade and a story reveal,
//   - indoors (game.room an interior): for an actor more than ROOM m from the room's centre — outside it (the largest
//     interior reaches 39 m from its centre; probes/roomsizes.mjs) and so in another scene;
//     outdoors (Citadel or an outdoor area): for an actor farther from the camera and from the hero than the far cull
//     draws anyone (drawcull.js FarCull: the fog's far distance, at least 250 m, + 10 m): not drawn, out of reach,
//   - and as long as the actor has not been moved since it was left: a story that puts it somewhere else (or the cast's
//     placement) gets one full update for it, which places its body there.
const ROOM = 60;
export function offScene(g, a) {
  const st = g.state;
  if ((st !== 'play' && st !== 'dialog') || g.trans || g.cutscene || g.reveal?.on) return false;
  const p = a.pos, h = g.hero?.pos, R = g.room;
  if (!p || !h) return false;
  if (R && !R.outdoor) {
    const c = R.center || R.group?.position; if (!c) return false;
    if ((p.x - c.x) ** 2 + (p.z - c.z) ** 2 <= ROOM * ROOM) return false;
  } else {
    const cam = g.camera?.position, far = Math.max(g.scene?.fog?.far ?? 0, 250) + 10, F2 = far * far;
    if (!cam || (p.x - h.x) ** 2 + (p.z - h.z) ** 2 <= F2 || (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2 <= F2) return false;
  }
  // (moved since it was left — by the story, a placement, a load: one full update, then it rests there)
  const s = a._offRest;
  if (!s || s.x !== p.x || s.y !== p.y || s.z !== p.z) {
    if (s) { s.x = p.x; s.y = p.y; s.z = p.z; } else a._offRest = { x: p.x, y: p.y, z: p.z };
    return false;
  }
  return true;
}
// the enemies' calm states (enemies.js, guards.js, guarddog.js): anything else — a chase, a wind-up, a search, the way
// home — runs on until it has settled, as before (a chase broken off by a door ends with the enemy going home)
export const CALM = new Set(['idle', 'patrol', 'guard']);
