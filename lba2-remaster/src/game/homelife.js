// Twelve years of family life in Twinsen's house (called from interiors.js buildHouse). A few things a family adds
// to a house over the years, each where it would be: Zoé's work corner in the reading room (she keeps the Water
// Office's connection register: which houses the project hooks up to its heat network next), Arthur's workbench
// with his paddle boat, the old travel trunk that now holds seed packets, a box of neighbours' things Twinsen has
// mended by the front door, and the heat line's meter where it comes into the hall (Zoé's note on it). One
// chair has a newer leg in paler wood. The story layer (src/game/story/life.js) gives a few of them a short look.
//
// R.life {zoeDesk, trunk, mendBox, meter, bench} (world {x, z}): the spots the story layer offers.
import * as THREE from 'three';
import { MAT, rbox, plane, cyl, sphere, lathe, torus, canvasTex } from './props.js';
import * as P from './props.js';

// Zoé's board: the island's streets in chalk, a pin per house: green on the heat network, red still waiting.
// Stage 0 (before the project's heat): every pin red. 1 (the heat is on): the town and Bug Street green, the
// harbour row red. 2 (Zoé has seen Vesk's plan): the same, the harbour row ringed in her chalk with a question mark.
const boardTex = (stage) => canvasTex(256, 176, (x, W, H) => {
  let seed = 1234567; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // (the same grain on every stage)
  x.fillStyle = '#b8895a'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(90,60,30,${rnd() * 0.25})`; x.fillRect(rnd() * W, rnd() * H, 2, 2); }
  x.fillStyle = '#f2ead6'; x.fillRect(12, 10, W - 24, H - 20);
  x.strokeStyle = '#7a8a9a'; x.lineWidth = 3;
  // the island's outline (rough) and its streets
  x.beginPath(); x.moveTo(70, 18); x.lineTo(150, 22); x.lineTo(160, 60); x.lineTo(150, 150); x.lineTo(110, 160); x.lineTo(80, 120); x.lineTo(30, 110); x.lineTo(28, 80); x.lineTo(70, 70); x.closePath(); x.stroke();
  x.strokeStyle = '#c8a070'; x.lineWidth = 2;
  for (const [a, b, c, d] of [[100, 30, 105, 150], [60, 90, 150, 95], [105, 60, 150, 50], [40, 95, 60, 90]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); }
  const pin = (px, py, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fill(); x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(px + 2, py + 3, 3, 2); };
  // town and Bug Street (green once the heat is on); the harbour row (west): red
  for (const [px, py] of [[98, 40], [110, 45], [104, 58], [96, 70], [112, 74], [100, 130], [108, 140], [116, 128]]) pin(px, py, stage >= 1 ? '#3a9a4a' : '#d03a2a');
  for (const [px, py] of [[34, 92], [42, 100], [50, 96], [38, 104], [56, 104], [146, 100]]) pin(px, py, '#d03a2a');
  if (stage >= 2) {
    x.strokeStyle = '#3a4a8a'; x.lineWidth = 2.5;
    x.beginPath(); x.ellipse(45, 98, 22, 14, 0.1, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#3a4a8a'; x.font = 'bold 20px serif'; x.fillText('?', 66, 84);
  }
  x.fillStyle = '#3a4a5a'; x.font = 'bold 11px serif'; x.fillText('CONNECTIONS', 160, 30); x.font = '11px serif'; x.fillText('green: on', 168, 140); x.fillText('red: waiting', 168, 154);
});
// the heat meter's dial: the needle at rest before the connection, up once the heat is on
const dialTex = (on) => canvasTex(64, 64, (c, W, H) => {
  c.fillStyle = '#f4ecd4'; c.beginPath(); c.arc(W / 2, H / 2, 30, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2, H / 2);
  if (on) c.lineTo(W / 2 + 18, H / 2 - 16); else c.lineTo(W / 2 - 20, H / 2 + 12);
  c.stroke(); c.fillStyle = '#d03a2a'; c.fillRect(46, 12, 6, 6);
});
// stickers on the old trunk
const stickerTex = (label, bg) => canvasTex(128, 64, (x, W, H) => {
  x.fillStyle = bg; x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 2, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#f8f0dc'; x.lineWidth = 3; x.stroke();
  x.fillStyle = '#f8f0dc'; x.font = 'bold 18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, W / 2, H / 2 + 1);
});
// a small paper note
const noteTex = (lines) => canvasTex(128, 96, (x, W, H) => {
  x.fillStyle = '#f8f2d8'; x.fillRect(0, 0, W, H); x.fillStyle = '#3a4a8a'; x.font = '14px cursive, serif';
  lines.forEach((l, i) => x.fillText(l, 8, 22 + i * 18));
});

export function dressHomeLife(B, R) {
  const k = B.k, L = (R.life = {});
  // what changes with the story: 0 before the project's heat, 1 with it on, 2 once Zoé has seen Vesk's plan
  const stageFns = [];
  L.stage = -1;
  L.setStage = (st) => { if (st === L.stage) return; L.stage = st; for (const fn of stageFns) fn(st); };

  // --- Zoé's corner in the reading room, against the divider to Arthur's room (z 7)
  {
    const x = -6.4, z = 7.42;
    B.put(x, z, 0, P.desk, { w: 1.3, d: 0.6, pal: 'honey', leather: '#3f8a6a' });
    B.put(x, z + 0.8, Math.PI, P.chair, { cushion: '#3f9a6a' }, { noStand: true, seeThrough: true });
    // the board on its little easel at the back of the desk
    k.add(rbox(0.86, 0.6, 0.03, 0.01), MAT.wood('dark'), x, 0.78 + 0.38, z - 0.2, 0, { rx: -0.12 });
    const boardM = [0, 1, 2].map((st) => MAT.map(boardTex(st), 0.8));
    const board = new THREE.Mesh(plane(0.8, 0.54), boardM[0]); board.position.set(x, 0.78 + 0.38, z - 0.18); board.rotation.x = -0.12; B.group.add(board);
    stageFns.push((st) => { board.material = boardM[Math.min(2, st)]; });
    // the register: two ledgers, one open; a pen; a cup of seed packets; a little brass bell from the office
    k.add(rbox(0.3, 0.06, 0.22, 0.01), MAT.paint('#2f5a8a', 0.6), x - 0.42, 0.81, z + 0.08, 0.1);
    k.add(rbox(0.3, 0.05, 0.22, 0.01), MAT.paint('#8a3a2a', 0.6), x - 0.42, 0.865, z + 0.08, 0.15);
    k.add(rbox(0.42, 0.012, 0.28, 0.004), MAT.flat('#f4ecd4', 0.9), x + 0.05, 0.786, z + 0.12, -0.08);
    k.add(cyl(0.006, 0.006, 0.16, 5), MAT.paint('#2a2a3a', 0.4), x + 0.12, 0.8, z + 0.12, 0.6, { rz: Math.PI / 2 });
    k.add(lathe([[0.001, 0], [0.05, 0], [0.055, 0.1], [0.001, 0.1]], 10), MAT.flat('#d8b070', 0.6), x + 0.45, 0.78, z - 0.02);
    for (let i = 0; i < 4; i++) k.add(rbox(0.05, 0.08, 0.004, 0.002), MAT.flat(['#e0503a', '#e8c040', '#3f9a6a', '#3b78d8'][i], 0.8), x + 0.42 + (i % 2) * 0.03, 0.9, z - 0.04 + i * 0.01, i * 0.3);
    P.deskBell(k, x + 0.5, 0.78, z + 0.18);
    L.zoeDesk = B.world(x, z + 0.75);
  }

  // --- Arthur's workbench in his room, against the west wall between his toy chest and his bed (in full view of
  //     the house's camera: the north wall behind the family room's wardrobe was hidden): the paddle boat he is
  //     building to beat Lulu's, plans pinned up
  {
    const x = -13.18, z = 2.2, ry = Math.PI / 2;   // (its front faces east, into the room)
    B.put(x, z, ry, P.workbench, { w: 1.4, d: 0.6, h: 0.78 });
    k.at(x, 0, z, ry, () => {
      // the boat: a hull, a paddle wheel on the bench (one paddle missing), a pot of glue, a rudder blade
      k.at(-0.15, 0.78, 0.05, 0.4, () => {
        k.add(rbox(0.42, 0.08, 0.14, 0.03), MAT.paint('#e8c040', 0.5), 0, 0.04, 0);
        k.add(rbox(0.14, 0.08, 0.1, 0.02), MAT.paint('#e0503a', 0.5), -0.06, 0.12, 0);
      });
      const wheel = k.pivot(0.35, 0.78 + 0.1, 0.12, 0); wheel.rotation.z = 0.3;
      for (let i = 0; i < 6; i++) { if (i === 4) continue; const pd = new THREE.Mesh(rbox(0.012, 0.08, 0.06, 0.004), MAT.wood('pale')); pd.position.set(Math.cos(i * Math.PI / 3) * 0.06, Math.sin(i * Math.PI / 3) * 0.06, 0); pd.rotation.z = i * Math.PI / 3; wheel.add(pd); }
      const hub = new THREE.Mesh(cyl(0.02, 0.02, 0.07, 8), MAT.brass()); hub.rotation.x = Math.PI / 2; wheel.add(hub);
      k.add(lathe([[0.001, 0], [0.04, 0], [0.04, 0.06], [0.001, 0.06]], 10), MAT.flat('#f2ecdc', 0.5), 0.55, 0.78, -0.12);
      // plans on the wall above: a boat in side view with a paddle wheel
      k.add(plane(0.5, 0.36), MAT.map(noteTex(['PADDLE BOAT', 'v3 (faster)', 'beat Lulu!']), 0.9), -0.25, 1.45, -0.3);
      k.add(plane(0.36, 0.28), MAT.map(noteTex(['rudder:', 'needs pin', '(pliers?)']), 0.9), 0.3, 1.5, -0.3);
    });
    L.bench = B.world(x + 0.8, z);
  }

  // --- the old travel trunk in the hall: faded stickers from two worlds; it holds Zoé's seed packets now
  {
    const x = 3.9, z = 9.1;
    B.put(x, z, -Math.PI / 2, P.chest, { w: 0.95, d: 0.55, h: 0.48, pal: 'dark', band: MAT.paint('#8a6a3a', 0.6) });
    for (const [lbl, bg, dz, dy] of [['DESERT ISLAND', '#c86a2a', -0.22, 0.22], ['ZEELICH', '#8a5ac0', 0.18, 0.3]]) {
      k.add(plane(0.3, 0.15), MAT.map(stickerTex(lbl, bg), 0.9, { transparent: true }), x + 0.285, dy, z + dz, Math.PI / 2);
    }
    // a seed packet left on the lid
    k.add(rbox(0.07, 0.004, 0.1, 0.002), MAT.flat('#3f9a6a', 0.8), x + 0.05, 0.69, z - 0.1, 0.4);
    L.trunk = B.world(x - 0.8, z);
  }

  // --- by the front door: a crate of neighbours' things Twinsen has mended, waiting to go back
  {
    const x = 2.65, z = 10.8;
    B.put(x, z, 0.2, (kk) => P.crate(kk, 0.55, { h: 0.4, pal: 'pale' }), {});
    P.kettle(k, x - 0.1, 0.4, z - 0.05);
    k.add(rbox(0.22, 0.03, 0.14, 0.01), MAT.brass(), x + 0.12, 0.42, z + 0.08);   // a baker's scale pan
    k.add(cyl(0.012, 0.012, 0.16, 6), MAT.brass(), x + 0.12, 0.5, z + 0.08);
    k.add(plane(0.2, 0.15), MAT.map(noteTex(['RETURN:', 'Gilbert - kettle', 'baker - scales']), 0.9), x, 0.3, z + 0.29);
    L.mendBox = B.world(x, z - 0.6);
  }

  // --- the heat line comes in through the floor by the door: a riser, a meter, Zoé's note pinned on it
  {
    const x = 4.15, z = 10.25;
    k.add(cyl(0.05, 0.05, 1.2, 10), MAT.copper(), x, 0.6, z);
    k.add(cyl(0.12, 0.12, 0.06, 18), MAT.brass(), x, 1.15, z + 0.07, 0, { rx: Math.PI / 2 });
    const dialM = [MAT.map(dialTex(false), 0.6), MAT.map(dialTex(true), 0.6)];
    const dial = new THREE.Mesh(plane(0.18, 0.18), dialM[0]); dial.position.set(x, 1.15, z + 0.105); B.group.add(dial);
    // Zoé's note goes up once the heat is on and the needle jumps
    const note = new THREE.Mesh(plane(0.16, 0.12), MAT.map(noteTex(['jumps when', 'ground hums', '-Z']), 0.9)); note.position.set(x, 0.88, z + 0.06); B.group.add(note);
    stageFns.push((st) => { dial.material = dialM[st >= 1 ? 1 : 0]; note.visible = st >= 1; });
    B.ccol(x, z, 0.12, 1.25, { noStand: true });
    L.meter = B.world(x - 0.6, z + 0.2);
  }

  // --- a chair mended with a newer leg (paler wood), and an Esmer lamp that came with the trade
  {
    const x = -1.8, z = 9.8;
    B.put(x, z, 0.5, P.chair, { cushion: '#e9c46a' }, { noStand: true, seeThrough: true });
    k.add(rbox(0.045, 0.42, 0.045, 0.01), MAT.wood('pale'), x + 0.17, 0.21, z + 0.12);
    // the Esmer lamp: a brass ring on three legs round a glowing ball (on the hall's side table, by the candle)
    k.add(torus(0.08, 0.012, 6, 16), MAT.brass(), -0.55, 0.78, 5.1, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) k.add(cyl(0.006, 0.006, 0.16, 4), MAT.brass(), -0.55 + Math.cos(i * 2.1) * 0.07, 0.7, 5.1 + Math.sin(i * 2.1) * 0.07);
    k.add(sphere(0.055, 12, 8), MAT.glow('#f0e0ff', '#b08aff', 1.2), -0.55, 0.79, 5.1);
  }
  L.setStage(0);
  return L;
}
