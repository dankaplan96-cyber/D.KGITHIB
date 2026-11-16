// U-4 "Twelve Years Late" — the world's pieces and the old pictures (docs/lba-maturity/U4-TWELVE-YEARS-LATE.md; the story
// is src/game/story/yearslate.js, the text src/game/text/yearslate.js). Ours: nothing here is LBA1/LBA2's.
//
// On Zeelich's street (the terminal island, local metres in its group's frame, walking level Y0):
//   - the postcard pinned on the council house's arcade, beside its notice, with Oma's note (UNDELIVERABLE. ANYONE?); later
//     three new cards in its place (Ysel's pictures of the street today)
//   - the plank ramp over the step at Nara's door (her pot trolley's: today's street has it, the old picture has the step)
//   - Ysel's camera on its tripod by the door, once she takes pictures again
//   - the old pictures' period pieces, shown only for the one frame each picture is rendered (THEN): PORTRAITS over Nara's
//     door (the glass house was Ysel's studio), CLINIC over the bakehouse's hatch (the old watch house was the street's
//     clinic before the doctor moved up to Otringal), the hatch shuttered
//
// The pictures are rendered from the game itself, at runtime (capture): the camera at the photographer's spot, the
// people and the twelve years' additions hidden (zeelife.js `now`, the sky's shuttles, Citadel's harbour block from
// townlife.js), the period pieces shown; one frame into a canvas; then everything as it was, the same frame. The canvas is
// toned like an old print (agePhoto): one texture-sized canvas a picture, nothing kept on disk or in the save.
//
// CONTRACT
//   SPOTS {id: {region: 'zeelich'|'citadel', at {x,z} (local to the region's frame), eye {x,y,z} and look {x,y,z}
//     (y above the ground there), fov}}; spotWorld(game, id) → {at, eye, look} in world metres
//   buildYearsLate(game, Z) → Z.yearslate = { card {x,z,y} (its touch point), setBoard('card'|'none'|'new'),
//     ramp, tripod {x,z,a, cam {x,z}}, setTripod(b), then {row: Group} }
//   capture(game, spotId) → a canvas (the old picture, aged) or null; agePhoto(canvas) → canvas
import * as THREE from 'three';

const Y0 = 6.0;
// the photographer's spots (eye: where the lens was; look: what it looked at)
export const SPOTS = {
  row: { region: 'zeelich', at: { x: -15.5, z: 2.5 }, eye: { x: -15.5, y: 1.7, z: 2.5 }, look: { x: -4, y: 2.5, z: -14 }, fov: 50 },
  pier: { region: 'zeelich', at: { x: -62.6, z: -1.2 }, eye: { x: -62.6, y: 1.75, z: -1.2 }, look: { x: -54.5, y: 2.6, z: 4.8 }, fov: 52 },
  harbour: { region: 'citadel', at: { x: -95.5, z: 37.0 }, eye: { x: -95.5, y: 1.7, z: 37.0 }, look: { x: -112, y: 1.2, z: 32.0 }, fov: 50 },
};
export const SPOT_IDS = Object.keys(SPOTS);
const ZEELICH_O = { x: 2400, z: 0 };
const EAST_X = 37.6;   // (zeelich.js GATE.x 37.2: the shield gate onto the project's drill platform)
// Nara's flower house (zeelich.js HOUSES[2]: the octagonal hall), its door, the step before it
export const NARA = { x: -11, front: -8.1, door: { x: -11, z: -7.35 } };
// Ysel's camera on its tripod, west of the door between it and the lamp; she stands behind it, facing the street
export const TRIPOD = { x: -12.5, z: -5.75, a: 0.25 };
// the card on the council house's arcade: the pier east of the middle arch (zeelich.js HOUSES[1])
const CARD = { x: -24.2, y: 1.5, zFrom: -3.0, zDefault: -8.15 };
// Citadel's harbour block (townlife.js BOOTH, CRATE, SHOP and what stands round them): hidden in the old picture
const HARBOUR = { x0: -126, x1: -97.5, z0: 25, z1: 44 };

export function spotWorld(game, id) {
  const S = SPOTS[id]; if (!S) return null;
  const o = S.region === 'zeelich' ? ZEELICH_O : { x: 0, z: 0 };
  const P = game.physics;
  const gy = (x, z) => (S.region === 'zeelich' ? Y0 : P.groundAt(x, z, 60));
  const w = (p) => ({ x: o.x + p.x, z: o.z + p.z });
  const at = w(S.at), eye = w(S.eye), look = w(S.look);
  const ey = gy(eye.x, eye.z);
  return { at: { ...at, y: ey }, eye: { ...eye, y: ey + S.eye.y }, look: { ...look, y: ey + S.look.y }, fov: S.fov };
}

// ---------------------------------------------------------------- painted faces
const tex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
};
const mat = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide, ...extra });
const flat = (color, rough = 0.85, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
// a postcard's face: a small brown street of domes (the inventory-sized look; the real picture is the render)
const cardFace = (seed = 0) => tex(96, 64, (x, W, H) => {
  x.fillStyle = '#f4ead4'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#b89870'; x.fillRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#d8c4a0'; x.fillRect(5, 5, W - 10, (H - 10) * 0.55);
  x.fillStyle = '#6a4a30';
  const hx = 12 + (seed * 17) % 30;
  x.fillRect(hx, 28, 22, 20); x.beginPath(); x.ellipse(hx + 11, 28, 13, 7, 0, Math.PI, 0); x.fill();
  x.fillRect(hx + 34, 14, 7, 34);
  x.fillStyle = '#4a3020'; x.fillRect(hx + 8, 38, 6, 10);
});
const noteFace = () => tex(128, 64, (x, W, H) => {
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#2a2a38'; x.textAlign = 'center'; x.font = 'bold 17px sans-serif';
  x.fillText('UNDELIVERABLE', W / 2, 27); x.font = 'bold 15px sans-serif'; x.fillText('ANYONE?', W / 2, 50);
});
const newFace = () => tex(128, 40, (x, W, H) => {
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#5a3a2a'; x.textAlign = 'center'; x.font = 'bold 16px sans-serif'; x.fillText('NEW CARDS: YSEL', W / 2, 26);
});
const signFace = (lines, { bg = '#f0e2c4', ink = '#3a2418', w = 320, h = 80, size = 34 } = {}) => tex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = ink; x.lineWidth = 6; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => { x.font = `bold ${i ? size * 0.62 : size}px serif`; x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.95); });
});

// ---------------------------------------------------------------- the pieces on the street
export function buildYearsLate(game, Z) {
  const G = new THREE.Group(); G.name = 'yearslate'; Z.group.add(G);
  const P = game.physics, o = Z.group.position;
  const box = (w, h, d, m) => { const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); g.castShadow = g.receiveShadow = true; return g; };

  // ---- the card on the council house's arcade (where the pier's face is: a ray from the street)
  let cz = CARD.zDefault;
  {
    const rc = new THREE.Raycaster(new THREE.Vector3(o.x + CARD.x, Y0 + CARD.y, o.z + CARD.zFrom), new THREE.Vector3(0, 0, -1), 0, 9);
    Z.group.updateMatrixWorld(true);
    const hits = rc.intersectObjects(Z.group.children.filter((c) => c !== G), true).filter((h) => h.object.visible && h.point.z < o.z + CARD.zFrom - 2);
    if (hits.length) cz = hits[0].point.z - o.z + 0.012;
  }
  const board = new THREE.Group(); board.position.set(CARD.x, Y0 + CARD.y, cz); G.add(board);
  const pin = flat('#b03a2a', 0.4, { metalness: 0.3 });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.18), mat(cardFace(0))); card.position.set(0, 0.08, 0.004); board.add(card);
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), mat(noteFace())); note.position.set(0, -0.11, 0.003); note.rotation.z = 0.04; board.add(note);
  const cardPin = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), pin); cardPin.position.set(0, 0.16, 0.01); board.add(cardPin);
  const newCards = new THREE.Group(); board.add(newCards);
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), mat(cardFace(i + 1))); m.position.set(-0.27 + i * 0.27, 0.1, 0.004 + i * 0.001); m.rotation.z = (i - 1) * 0.05; newCards.add(m); const p2 = cardPin.clone(); p2.position.set(m.position.x, 0.17, 0.01); newCards.add(p2); }
  const nl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.09), mat(newFace())); nl.position.set(0, -0.08, 0.003); newCards.add(nl);
  const setBoard = (k) => { card.visible = note.visible = cardPin.visible = k === 'card'; newCards.visible = k === 'new'; };
  setBoard('none');

  // ---- the plank ramp over the step at Nara's door (for her pot trolley): today's street
  const ramp = new THREE.Group(); G.add(ramp);
  {
    // the step's top and its front edge, from the ground under it (zeelich.js: the house's step before the door)
    let top = Y0, edge = NARA.front + 0.35;
    for (let z = NARA.front + 0.05; z < NARA.front + 1.2; z += 0.05) { const h = P.groundAt(o.x + NARA.door.x, o.z + z, Y0 + 1); if (h > Y0 + 0.04) { top = Math.max(top, h); edge = z; } }
    const rise = Math.max(0.12, top - Y0), run = 0.95, len = Math.hypot(rise, run), ang = Math.atan2(rise, run);
    const wood = flat('#c8a070', 0.85), dark = flat('#7a5434', 0.85);
    const deck = new THREE.Group(); deck.position.set(NARA.door.x, Y0 + rise / 2 + 0.02, edge + run / 2 - 0.02); deck.rotation.x = ang; ramp.add(deck);
    for (let i = 0; i < 5; i++) { const pl = box(0.22, 0.035, len, i % 2 ? dark : wood); pl.position.set(-0.5 + i * 0.25, 0, 0); deck.add(pl); }
    for (const s of [-1, 1]) { const kerb = box(0.05, 0.06, len, dark); kerb.position.set(s * 0.64, 0.035, 0); deck.add(kerb); }
  }

  // ---- Ysel's camera on its tripod
  const tripod = new THREE.Group(); tripod.position.set(TRIPOD.x, Y0, TRIPOD.z); tripod.rotation.y = TRIPOD.a; G.add(tripod);
  {
    const wood = flat('#8a6440', 0.8), brass = flat('#c89a3c', 0.35, { metalness: 0.7 }), black = flat('#22202a', 0.7), cloth = flat('#2a2430', 0.95);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, leg = box(0.04, 1.42, 0.04, wood); leg.position.set(Math.sin(a) * 0.22, 0.68, Math.cos(a) * 0.22); leg.rotation.set(Math.cos(a) * 0.17, 0, -Math.sin(a) * 0.17); tripod.add(leg); }
    const head = box(0.16, 0.05, 0.16, brass); head.position.y = 1.4; tripod.add(head);
    const body = box(0.26, 0.24, 0.3, wood); body.position.set(0, 1.55, 0); tripod.add(body);
    const bellows = box(0.2, 0.2, 0.16, black); bellows.position.set(0, 1.55, 0.22); tripod.add(bellows);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 14), brass); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.55, 0.35); tripod.add(lens);
    const hood = box(0.3, 0.34, 0.06, cloth); hood.position.set(0, 1.52, -0.18); hood.rotation.x = 0.12; tripod.add(hood);
    tripod.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  }
  const tripodCol = game.physics.add({ type: 'cyl', x: o.x + TRIPOD.x, z: o.z + TRIPOD.z, r: 0.3, top: Y0 + 1.7, noStand: true, seeThrough: true });
  const setTripod = (b) => { tripod.visible = !!b; if (tripodCol) tripodCol.enabled = !!b; };
  setTripod(false);

  // ---- the old pictures' period pieces (THEN): shown only while a picture is rendered
  const row = new THREE.Group(); row.visible = false; G.add(row);
  {
    // PORTRAITS over Nara's door: Ysel's studio
    const s = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.52), mat(signFace(['PORTRAITS', 'CARDS AND VIEWS'], { size: 34 }))); s.position.set(NARA.door.x, Y0 + 2.98, NARA.front + 0.12); row.add(s);
    // her prints in a frame by the door
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.66), mat(tex(64, 80, (x, W, H) => { x.fillStyle = '#5a3a24'; x.fillRect(0, 0, W, H); for (let i = 0; i < 4; i++) { x.fillStyle = ['#d8c8a8', '#c8b490', '#e0d0b0', '#bca880'][i]; x.fillRect(6 + (i % 2) * 27, 6 + Math.floor(i / 2) * 36, 24, 32); } }))); fr.position.set(NARA.door.x + 1.25, Y0 + 1.45, NARA.front + 0.08); row.add(fr);
    // CLINIC over the bakehouse's hatch (zeelife.js: the sign at HATCH.x 12.15, 3.05 m up, on the south face z −9.2)
    const c = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.6), mat(signFace(['CLINIC', 'THE DOCTOR IS IN'], { bg: '#f4f0e6', ink: '#2a4a6a', w: 320, h: 118, size: 44 }))); c.position.set(12.15, Y0 + 3.05, -9.2 + 0.08); row.add(c);
    // and its sign hung out over the street on a bracket, to be seen from up and down it
    const iron = flat('#3a3640', 0.5, { metalness: 0.5 });
    const arm = box(0.05, 0.05, 1.05, iron); arm.position.set(8.95, Y0 + 3.15, -9.2 + 0.52); row.add(arm);
    for (const sd of [1, -1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.5), mat(signFace(['CLINIC'], { bg: '#f4f0e6', ink: '#2a4a6a', w: 256, h: 136, size: 56 }), { side: THREE.FrontSide })); b.position.set(8.95 - sd * 0.012, Y0 + 2.82, -9.2 + 0.62); b.rotation.y = sd * Math.PI / 2 * -1; row.add(b); }
    // its window shuttered (the guards' window, before it was a hatch)
    const sh = flat('#7a6a5a', 0.9);
    for (const sx of [-1, 1]) { const leaf = box(0.7, 0.88, 0.04, sh); leaf.position.set(12.15 + sx * 0.36, Y0 + 0.95 + 0.44, -9.2 + 0.05); row.add(leaf); }
  }

  return Z.yearslate = {
    group: G, ramp, tripodG: tripod, tripod: { ...TRIPOD, x: o.x + TRIPOD.x, z: o.z + TRIPOD.z, stand: { x: o.x + TRIPOD.x - Math.sin(TRIPOD.a) * 0.62, z: o.z + TRIPOD.z - Math.cos(TRIPOD.a) * 0.62 } }, setTripod,
    card: { x: o.x + CARD.x, z: o.z + cz, y: Y0 + CARD.y + 0.08 }, setBoard, cardMesh: card, newCards,
    door: { x: o.x + NARA.door.x, z: o.z + NARA.door.z }, then: { row },
  };
}

// ---------------------------------------------------------------- the old pictures
// what is different twelve years ago at each spot: returns the undo
function thenWorld(game, id) {
  const undo = [];
  const hide = (o) => { if (o && o.visible) { o.visible = false; undo.push(() => { o.visible = true; }); } };
  const show = (o) => { if (o && !o.visible) { o.visible = true; undo.push(() => { o.visible = false; }); } };
  const S = SPOTS[id];
  if (S.region === 'zeelich') {
    const Z = game.rooms?.zeelich;
    if (Z) {
      for (const m of Z.life?.now || []) hide(m);
      Z.group.traverse((c) => { if (c.name === 'esmerShuttle') hide(c); });   // (no shuttles in the sky yet)
      // (nor the project's platform past the shield gate: whatever of the island's group lies wholly east of the gate)
      if (!Z._tylEast) { const b = new THREE.Box3(); Z._tylEast = Z.group.children.filter((c) => { if (c.name === 'yearslate') return false; b.setFromObject(c); return !b.isEmpty() && b.min.x > Z.group.position.x + EAST_X; }); }
      for (const c of Z._tylEast) hide(c);
      const Y = Z.yearslate;
      if (Y) { hide(Y.ramp); hide(Y.tripodG); if (id === 'row') show(Y.then.row); }
      // (the pier: the line running, her loading bridge down and the board without its LINE CLOSED strip)
      if (id === 'pier' && Z.skyferry?.setBoard) { const S2 = Z.skyferry, was = S2.boardState, k0 = S2.bridgeK; S2.setBoard('open'); S2.setBridge?.(1); undo.push(() => { S2.setBoard(was); S2.setBridge?.(k0); }); }
    }
  } else {
    // Citadel's harbour: the customs booth, the cargo of two worlds and Nell's shop (townlife.js) were not there yet
    const root = game.scene.getObjectByName('townlife');
    if (root) {
      const b = new THREE.Box3(), c = new THREE.Vector3();
      for (const ch of root.children) { b.setFromObject(ch); if (b.isEmpty()) continue; b.getCenter(c); if (c.x > HARBOUR.x0 && c.x < HARBOUR.x1 && c.z > HARBOUR.z0 && c.z < HARBOUR.z1) hide(ch); }
    }
  }
  // the people: an old print's long exposure kept nobody who moved
  const g = game;
  for (const a of [g.hero, ...g.npcs, ...(g.enemies || [])]) { hide(a?.rig?.root); hide(a?.shadow); hide(a?.icon); }
  game.scene.traverse((o) => { if (o.userData?.rig) hide(o); });   // (the street's walkers and the rooms' people have rigs of their own)
  hide(g.hero?.swordMesh); hide(g.ball?.mesh);
  for (const d of game.rooms?.zeelich?.dogs || []) hide(d.root || d.group);
  return () => { for (let i = undo.length - 1; i >= 0; i--) undo[i](); };
}

// the old picture at a spot: rendered now, from the game itself. W×H at most 800 wide (the screen's shape)
export function capture(game, id, { maxW = 800 } = {}) {
  const S = SPOTS[id], R = game.renderer, cam = game.camera;
  if (!S || !R?.renderer) return null;
  const sw = spotWorld(game, id);
  const saved = { p: cam.position.clone(), q: cam.quaternion.clone(), fov: cam.fov };
  const undo = thenWorld(game, id);
  let out = null;
  try {
    cam.position.set(sw.eye.x, sw.eye.y, sw.eye.z); cam.fov = sw.fov; cam.updateProjectionMatrix();
    cam.lookAt(sw.look.x, sw.look.y, sw.look.z); cam.updateMatrixWorld();
    R.render(); R.render();   // (twice: what is culled for the view is settled by the first)
    const src = R.renderer.domElement, w = Math.min(maxW, src.width), h = Math.round(w * src.height / src.width);
    out = document.createElement('canvas'); out.width = w; out.height = h;
    out.getContext('2d').drawImage(src, 0, 0, w, h);
  } catch (e) { console.warn('yearslate capture', e); out = null; }
  finally {
    undo();
    cam.position.copy(saved.p); cam.quaternion.copy(saved.q); cam.fov = saved.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    try { R.render(); } catch { /* the next frame draws it */ }   // (the screen shows today again at once)
  }
  return out ? agePhoto(out, id.length * 7 + 3) : null;
}

// toned like an old print: sepia, a little faded, a warm vignette, grain, a few dust specks
export function agePhoto(src, seed = 1) {
  const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, w, h), d = img.data;
  let s = seed * 9301 + 49297; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const cx = w / 2, cy = h / 2, rr = Math.hypot(cx, cy);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    let l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255;
    l = 0.12 + l * 0.8;                                                  // (faded: no true black, no true white)
    const v = 1 - Math.pow(Math.hypot(i - cx, j - cy) / rr, 2.2) * 0.55;  // (the vignette)
    const n = (rnd() - 0.5) * 0.07;                                      // (grain)
    const L = Math.max(0, Math.min(1, l * v + n));
    d[k] = Math.min(255, L * 255 * 1.07 + 10); d[k + 1] = L * 255 * 0.93 + 4; d[k + 2] = L * 255 * 0.72;
  }
  x.putImageData(img, 0, 0);
  x.fillStyle = 'rgba(250,240,220,0.5)';
  for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.4, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(250,240,220,0.22)'; x.lineWidth = 1;
  for (let i = 0; i < 3; i++) { const sx = rnd() * w; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + (rnd() - 0.5) * 30, h); x.stroke(); }
  return c;
}
