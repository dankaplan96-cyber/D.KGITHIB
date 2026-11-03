// EPILOGUE-HOME (the campaign, docs/campaign/CAMPAIGN_DIRECTOR.md): after the ending, everyone the later chapters moved
// is back where they live, and has a word about it. Before, the last chapter to place someone kept him there for good
// (Gilbert at the fortress shelter, Tim and Lulu at the depot bunker, the hill families by the plateau, Mira in the valve
// room, Ilka and Dallan at the bore, Oku on his mill, Pim at the dome's telescope, Lhar's people in the monks' camp), and
// Doran, Baldino, Nara and Oku were not in the world at all; the allies away from Citadel only said "Hello, Twinsen."
// A LOGIC test: the chapters before are set by flags (ISO), the epilogue is played from its start (the dinner, the end
// screen, Keep Exploring), the regions are reached by the travel network's own move (ISO), the talks by E.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
const is = (label, v, ok) => { check(label, !!ok(v), v); return v; };
await open(page, '?nocine');
await menu(page, 'new');
await ev(() => {
  const G = window.game; G.testFreeze = true;
  window.T = {
    tap(c) { G.input.taps.add(c); G.step(1 / 60); },
    talkAll(max = 80) { for (let i = 0; i < max && G.state !== 'play' && G.state !== 'ending'; i++) { G.input.taps.add('KeyE'); G.step(0.05); } G.step(0.3); },
    npc(id) { return G.npcs.find((n) => n.def.id === id); },
    said: [],
    // stand 1.4 m from the NPC, facing them, where the prompt is theirs; E; what was said
    talk(id) {
      const n = T.npc(id), h = G.hero, P = G.physics;
      if (!n?.present) return { id, present: false };
      let spot = null;
      for (let k = 0; k < 12 && !spot; k++) {
        const a = n.angle + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6, x = n.pos.x + Math.sin(a) * 1.4, z = n.pos.z + Math.cos(a) * 1.4;
        if (P.blockedAt(x, z, n.pos.y, 0.3)) continue;
        h.pos.set(x, n.pos.y, z); h.onGround = true; h.vy = 0; h.angle = Math.atan2(n.pos.x - x, n.pos.z - z);
        if (G.findInteractable()?.npc === n) spot = [x, z];
      }
      if (!spot) return { id, present: true, prompt: false };
      T.said.length = 0; G.step(0.3); T.tap('KeyE'); G.step(0.05);
      const text = document.querySelector('#dialog-text')?.textContent || T.said.join(' ');
      T.talkAll();
      return { id, present: true, prompt: true, text: (T.said.join(' ') || text).slice(0, 120) };
    },
    at(id) { const n = T.npc(id); return n?.placed ? { x: +n.placed.x.toFixed(1), z: +n.placed.z.toFixed(1) } : null; },
  };
  const os = G.say.bind(G);
  G.say = (name, text, ...r) => { T.said.push([].concat(text).join(' ')); return os(name, text, ...r); };
});

// ISO: the story through chapter 12, with the states that moved people: the shelters, the hill families, the relays
is('ISO: the chapters before set by flags; the epilogue begins (the dinner, the end screen)', await ev(() => {
  const G = game; T.talkAll();
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: 11, chapterKey: 'core',
    c1_started: true, c1_done: true, c1_water: true, c1_radio: true, c1_veskGone: true, c1_plan: true, c2_shield: true, c2_veskDown: true,
    c4_pump: true, c4_notebook: true, c4_carving: true, c5_planned: true, c5_vent: true, c5_glider: true,
    c6_trip1: true, c6_trip2: true, c6_up: true, c7_vent: true,
    c8_home: true, c8_gilbert: true, c8_pippa: true, c8_farmer1: true, c8_farmer2: true, c8_farmer3: true, c8_zoeDone: true, c8_vesk: true,
    c9_heard: true, c9_dallan: true, c9_vote: true,
    c10_started: true, c10_okuAsk: true, c10_miraAsk: true, c10_pim: true, c10_mill: true, c10_valves: true, c10_light: true, c10_bore: true, c10_dome: true, c10_done: true,
    c3_turned: true, c3_done: true });
  G.hero.hasBall = true; G.story.nextChapter();
  for (let i = 0; i < 20 && G.state !== 'ending'; i++) { G.step(0.5); if (G.state === 'dialog') T.talkAll(); }
  return [G.flags.chapterKey, G.flags.ep_dinner, G.state];
}), (v) => v[0] === 'home' && v[1] === true && v[2] === 'ending');
is('Keep Exploring: free roam, the objective sends him round everyone', await ev(() => {
  const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5);
  if (game.room) { const e = game.room.exits.find((x) => !x.room) || game.room.exits[0]; const h = game.hero; h.pos.set(e.x, h.pos.y, e.z); game.step(1.6); T.talkAll(); }
  return [game.state, game.flags.ep_free, document.querySelector('#pause-objective')?.textContent || '', game.room?.id ?? 'citadel'];
}), (v) => v[0] === 'play' && v[1] === true && /everyone/i.test(v[2]) && v[3] === 'citadel');

// Citadel: home again
const cit = await ev(() => {
  const G = game, W = G.world, near = (id, p, r = 2) => { const n = T.npc(id); return !!n?.present && Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < r; };
  const def = (id) => { const n = T.npc(id); return { x: n.def.x, z: n.def.z }; };
  return {
    gilbert: near('gilbert', W.well, 4), doran: near('doran', { x: W.pierStart.x, z: W.pierStart.z + 2.2 }),
    tim: near('tim', def('tim')), lulu: near('lulu', def('lulu')), xil: near('xil', def('xil')),
    farmers: ['farmer1', 'farmer2', 'farmer3'].map((id) => near(id, def(id))),
    mira: T.at('mira'), miraOffice: G.rooms.office?.npcSpots?.mira ? T.at('mira')?.x === +G.rooms.office.npcSpots.mira.x.toFixed(1) : 'office not built',
    heat: !!G.world.station?.active,
  };
});
is('Citadel: Gilbert by his well, Doran on his quay, the kids and Xil on their spots, the hill families at their farms', cit, (v) => v.gilbert && v.doran && v.tim && v.lulu && v.xil && v.farmers.every(Boolean));
is('Citadel: Mira back at the water office, not in the valve room', cit, (v) => v.miraOffice === true || v.miraOffice === 'office not built');
const citTalk = await ev(() => ['gilbert', 'doran', 'farmer1', 'farmer3'].map((id) => T.talk(id)));
is('Citadel: they talk about being home (Gilbert, Doran, two farmers)', citTalk, (v) => /refund/i.test(v[0].text) && /back/i.test(v[1].text) && /goats/i.test(v[2].text) && /home/i.test(v[3].text));

// Zeelich (ISO travel: the network's own move)
const zee = await ev(() => {
  const G = game; G.story.isles.go('zeelich'); for (let i = 0; i < 30 && (G.trans || G.state !== 'play'); i++) { G.step(0.2); T.talkAll(); }
  G.story.refreshCast();
  const room = G.room?.id, talk = ['nara', 'oku'].map((id) => T.talk(id));
  // into the workshop by its door (the room is built as he goes in, and its people placed: LAZY-REGIONS)
  const h = G.hero, d = G.rooms.zeelich.workshopDoor;
  h.pos.set(d.x, h.pos.y, d.z + 1.5); G.step(1.2); h.pos.set(d.x, h.pos.y, d.z); G.step(1.6); T.talkAll();
  const inside = G.room?.id, b = T.npc('baldino'), sp = G.rooms.workshop?.npcSpots?.baldino;
  return { room, inside, baldino: !!b?.present, atBench: sp && b ? +Math.hypot(b.pos.x - sp.x, b.pos.z - sp.z).toFixed(2) : null, talk: [...talk, T.talk('baldino')] };
});
is('Zeelich: Nara and Oku on the street, Baldino back at his bench, each with a word about it', zee, (v) => v.room === 'zeelich' && v.inside === 'workshop' && v.baldino && v.atBench != null && v.atBench < 1 && /heat/i.test(v.talk[0].text) && /flour/i.test(v.talk[1].text) && /inventor/i.test(v.talk[2].text));

// Desert Island: Kesh's square
const des = await ev(() => {
  const G = game; if (G.room?.id === 'workshop') { const e = G.room.exits[0]; G.hero.pos.set(e.x, G.hero.pos.y, e.z); G.step(1.6); T.talkAll(); }
  G.story.isles.go('desert_ferry'); for (let i = 0; i < 30 && (G.trans || G.state !== 'play'); i++) { G.step(0.2); T.talkAll(); }
  G.story.refreshCast(); G.step(0.3);
  const pz = G.rooms.desert.plaza, bore = G.rooms.desert.bore;
  const d = (id, p) => { const n = T.npc(id); return n?.present ? +Math.hypot(n.pos.x - p.x, n.pos.z - p.z).toFixed(1) : null; };
  return { room: G.room?.id, ilka: d('ilka', pz), dallan: d('dallan', pz), ilkaBore: d('ilka', bore), talk: ['ilka', 'dallan', 'tarra', 'hesk'].map((id) => T.talk(id)) };
});
is('Desert Island: Ilka and Dallan in Kesh, not at the bore', des, (v) => v.room === 'desert' && v.ilka != null && v.ilka < 5 && v.dallan != null && v.dallan < 5 && v.ilkaBore > 10);
is('Desert Island: Ilka, Dallan, Tarra and Hesk each have a word (Dallan carries the water; Tarra has not forgotten)', des, (v) => /gate code/i.test(v.talk[0].text) && /water/i.test(v.talk[1].text) && /jars/i.test(v.talk[2].text) && /glider/i.test(v.talk[3].text));

// the Hamalayi: Lhar lived in again
const ham = await ev(() => {
  const G = game; G.story.isles.go('hamalayi_glider'); for (let i = 0; i < 30 && (G.trans || G.state !== 'play'); i++) { G.step(0.2); T.talkAll(); }
  G.story.refreshCast(); G.step(0.3);
  const M = G.rooms.hamalayi, S = M.npcSpots, y = M.monastery.yard;
  const d = (id, p) => { const n = T.npc(id); return n?.present ? +Math.hypot(n.pos.x - p.x, n.pos.z - p.z).toFixed(1) : null; };
  return { room: G.room?.id, yorna: d('yorna', S.yorna), pim: d('pim', S.pim), lhar1: d('lhar1', S.v1), yornaYard: d('yorna', y), talk: ['yorna', 'pim', 'lhar3'].map((id) => T.talk(id)) };
});
is('The Hamalayi: Yorna, Pim and Lhar\'s people home in the village, not in the monastery yard', ham, (v) => v.room === 'hamalayi' && v.yorna != null && v.yorna < 3 && v.pim != null && v.pim < 3 && v.lhar1 != null && v.lhar1 < 3 && v.yornaYard > 10);
is('The Hamalayi: they talk about being home', ham, (v) => /home/i.test(v.talk[0].text) && /mirror/i.test(v.talk[1].text) && /cold/i.test(v.talk[2].text));
const dome = await ev(() => {
  const G = game, h = G.hero, d = G.rooms.hamalayi.observatory.door;
  h.pos.set(d.x, G.physics.groundAt(d.x, d.z + 2.2, h.pos.y + 30), d.z + 2.2); h.onGround = true; G.step(1.2);
  h.pos.set(d.x, G.physics.groundAt(d.x, d.z, h.pos.y + 2), d.z); G.step(1.6); T.talkAll();
  return { inside: G.room?.id, talk: T.talk('keeper') };
});
is("The Hamalayi: Sefa's dome opens after the ending, and Sefa has a word", dome, (v) => v.inside === 'obsv' && /sleeps/i.test(v.talk.text || ''));

const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
