// WEATHER-1: the weather director and the light cycle (src/game/weather.js, src/engine/environment.js weatherMods).
//   - the default test boot is today's look exactly (weather off in an automated browser without ?weather=1)
//   - each state is reached on each planet by the director's own schedule (fast clocks); the regions show their own
//     version (Desert Island dry, the Hamalayi snow); Desert Island and Zeelich never rain
//   - blends are smooth (no per-frame jump beyond a small step), through a state change and through a whole day
//   - the light never drops below the storm palette's (the floor), a storm at the cycle's darkest point included
//   - indoors: no rain, no fog or light change; a hold pins clear (and the story's own holds: a cutscene, a reveal
//     beat, the chapter-4 sandstorm, which it never starts or stops); Settings' toggle; the quality caps; no new
//     shader programs or textures from any state
// ISO (logged): states and phases are forced through game.weather's test handles; the time is game.step's.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page } = await launch();
const ev = (f, a) => page.evaluate(f, a);

// the picture's numbers on one frame
const LOOK = () => {
  const G = game, e = G.env, h = (c) => '#' + c.getHexString(), U = G.renderer.output?.uniforms?.gradeTint?.value;
  return { fog: [+e.fog.near.toFixed(4), +e.fog.far.toFixed(4)], fogCol: h(e.fog.color), sun: +e.sun.intensity.toFixed(5), sunCol: h(e.sun.color), hemi: +e.hemi.intensity.toFixed(5),
    hemiCol: h(e.hemi.color), ground: h(e.hemi.groundColor), zenith: h(e.skyU.uZenith.value), cloud: h(e.skyU.uCloud.value), cover: e.skyU.uCover.value, rain: e.rain.visible, motes: e.motes.visible,
    storm: G.storm, worldStorm: G.world.storm, tint: U ? [U.x, U.y, U.z] : null, wx: e.wx.on };
};

// ---------------------------------------------------------------- 1. the default test boot: today's look
await open(page, '?nocine'); await menu(page, 'new');
const def = await ev((LOOK) => {
  const G = game, L = new Function('return (' + LOOK + ')()');
  P.settle();
  G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(3);
  return { on: G.weather.enabled(), info: G.weather.info(), look: L() };
}, LOOK.toString());
check('default test boot: weather off in an automated browser (no ?weather=1); nothing applied, the storm value 0',
  def.on === false && def.info.region === null && def.look.wx === false && def.look.storm === 0 && def.look.worldStorm === 0, def);
check('default test boot: Citadel exactly as before (fog 45–190 #a8d2f2, sun 2.6, sky fill 1.42, no rain, no motes, no frame tint)',
  def.look.fog[0] === 45 && def.look.fog[1] === 190 && def.look.fogCol === '#a8d2f2' && def.look.sun === 2.6 && def.look.hemi === 1.42 && !def.look.rain && !def.look.motes && def.look.cover === 0 && JSON.stringify(def.look.tint) === '[1,1,1]', def.look);

// ---------------------------------------------------------------- the weather on
await ev(() => localStorage.clear());   // (a fresh profile again: no save, so New Game asks nothing)
await open(page, '?nocine&weather=1&weatherseed=11'); await menu(page, 'new');
const base = await ev((LOOK) => {
  const G = game, L = new Function('return (' + LOOK + ')()'), R = G.renderer.renderer;
  P.settle();
  G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(3);
  const compiled = (m) => !!R.properties.get(m).currentProgram;
  return { state: G.state, on: G.weather.enabled(), info: G.weather.info(), look: L(), warm: { rain: compiled(G.env.rain.material), motes: compiled(G.env.motes.material), rainShown: G.env.rain.visible } };
}, LOOK.toString());
check('?weather=1: on; a new game starts clear at noon, today\'s look (nothing applied)', base.state === 'play' && base.on && base.info.state === 'clear' && base.info.light === 'noon' && base.info.held === null && !base.look.wx
  && JSON.stringify(base.look) === JSON.stringify(def.look), { state: base.state, info: base.info, look: base.look, def: def.look });
check('the rain lines\' and motes\' programs are made with the scene\'s warm-up, before any rain (no stall on the first rainy frame)', base.warm.rain && base.warm.motes && !base.warm.rainShown, base.warm);

// ---------------------------------------------------------------- 2. every state reached by the schedule, per planet
const reach = await ev(() => {
  const G = game, W = G.weather, out = {};
  W.timeScale = 400;
  const run = (secs) => {
    const seen = new Set(), shown = new Set(); let rained = 0, stormed = 0, frames = 0;
    for (let t = 0; t < secs; t += 1 / 30) {
      G.step(1 / 30, 1 / 30); frames++;
      const i = W.info(); seen.add(i.state); shown.add(i.shown);
      if (G.env.rain.visible) rained++; if (G.storm > 0) stormed++;
      if (G.state !== 'play') { if (G.state === 'dialog') { G.hud.advance?.(); } }
    }
    return { seen: [...seen].sort(), shown: [...shown].sort(), rained, stormed, frames };
  };
  out.citadel = run(150);
  G.enterRoom('zeelich', null, true, true); G.step(0.5);
  out.zeelich = run(150);
  W.timeScale = 1;
  return out;
});
check('Twinsun (Citadel): the schedule reaches clear, haze, rain, wind and storm', JSON.stringify(reach.citadel.seen) === JSON.stringify(['clear', 'haze', 'rain', 'storm', 'wind']) && reach.citadel.rained > 0 && reach.citadel.stormed > 0, reach.citadel);
check('Zeelich: the schedule reaches clear, mist, gusts and overcast; it never rains there, no storm value', JSON.stringify(reach.zeelich.seen) === JSON.stringify(['clear', 'gusts', 'mist', 'overcast']) && reach.zeelich.rained === 0 && reach.zeelich.stormed === 0, reach.zeelich);

// each planet state as each region shows it; Desert Island and Zeelich never rain
const regions = await ev(() => {
  const G = game, W = G.weather, out = {};
  const look = (room, planetStates) => {
    if (room) G.enterRoom(room, null, true, true); else G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true);
    G.step(0.5);
    const rows = [];
    for (const s of planetStates) {
      W.force(s, 0); G.step(0.4);
      const e = G.env;
      rows.push({ s, shown: W.info().shown, rain: e.rain.visible, wxRain: e.wx.rain, storm: G.storm, motes: e.motes.visible, fogFar: +e.fog.far.toFixed(1), rainSnd: W.rainSnd });
    }
    W.force('clear', 0); W.unforce(); G.step(0.2);
    return rows;
  };
  const T = ['clear', 'haze', 'rain', 'wind', 'storm'];
  out.citadel = look(null, T);
  out.desert = look('desert', T);
  out.hamalayi = look('hamalayi', T);
  out.zeelich = look('zeelich', ['clear', 'mist', 'gusts', 'overcast']);
  out.isle = look('isle_otringal', ['clear', 'mist', 'gusts', 'overcast']);
  out.deserted = G.rooms.desert.storm.level;
  return out;
});
const by = (rows) => Object.fromEntries(rows.map((r) => [r.s, r.shown]));
check('Citadel shows each Twinsun state as itself; rain and storm draw rain lines', JSON.stringify(by(regions.citadel)) === JSON.stringify({ clear: 'clear', haze: 'haze', rain: 'rain', wind: 'wind', storm: 'storm' })
  && regions.citadel.find((r) => r.s === 'rain').rain && regions.citadel.find((r) => r.s === 'storm').storm === 1 && regions.citadel.find((r) => r.s === 'wind').motes, regions.citadel);
check('Desert Island: dry states only (clear, haze, wind; rain and storm blow dust): never rain, no storm value; the sandstorm untouched',
  regions.desert.every((r) => !r.rain && r.wxRain === 0 && r.storm === 0 && r.rainSnd === 0 && ['clear', 'haze', 'wind'].includes(r.shown)) && regions.desert.find((r) => r.s === 'rain').motes && regions.deserted === 0, regions.desert);
check('the Hamalayi: a snow flurry instead of rain (snow motes, no rain lines)', regions.hamalayi.every((r) => !r.rain && r.storm === 0) && regions.hamalayi.find((r) => r.s === 'rain').shown === 'snow' && regions.hamalayi.find((r) => r.s === 'rain').motes, regions.hamalayi);
check('Zeelich and its islands: mist, gusts, overcast; never rain', [...regions.zeelich, ...regions.isle].every((r) => !r.rain && r.wxRain === 0 && r.storm === 0) && regions.zeelich.find((r) => r.s === 'mist').fogFar < regions.zeelich.find((r) => r.s === 'clear').fogFar && regions.isle.find((r) => r.s === 'gusts').motes, { z: regions.zeelich, isle: regions.isle });
const pink = await ev(() => {
  const G = game, W = G.weather, out = [];
  G.enterRoom('zeelich', null, true, true); G.step(0.3);
  for (const s of ['clear', 'mist', 'gusts', 'overcast']) for (const ph of [0.03, 0.4, 0.79]) {
    W.force(s, 0); W.setPhase(ph); G.step(0.3);
    const c = G.env.fog.color; out.push({ s, ph, r: +c.r.toFixed(3), g: +c.g.toFixed(3), b: +c.b.toFixed(3) });
  }
  W.force('clear', 0); W.unforce(); W.setPhase(0.3); G.step(0.2);
  return out;
});
check('Zeelich keeps its pink-violet in every state and light (the fog\'s red and blue above its green)', pink.every((c) => c.r > c.g && c.b > c.g * 0.98), pink);

// ---------------------------------------------------------------- 3. smooth blends; the light's floor
const smooth = await ev(() => {
  const G = game, W = G.weather, e = G.env;
  G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(0.5);
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const sample = () => [e.fog.near / 45, e.fog.far / 190, e.sun.intensity, e.hemi.intensity, e.fog.color.r, e.fog.color.g, e.fog.color.b, e.sun.color.r, e.sun.color.g, e.sun.color.b,
    Math.max(e.storm, e.wx.on ? e.wx.rain : 0) * 0.5, e.wx.on ? e.wx.motes * e.wx.moteAlpha : 0, e.skyU.uZenith.value.b, e.skyU.uCover.value];
  const sweep = (secs, f) => {
    let prev = sample(), max = 0, at = -1, minLight = 1e9, below = 0, n = 0, lit = 0;
    for (let t = 0; t < secs; t += 1 / 60) {
      f?.(t); G.step(1 / 60, 1 / 60); n++;
      const s = sample();
      // (a lightning flash and the frame after it are not blends)
      const flash = e.flash > 0 || lit > 0; lit = e.flash > 0 ? 2 : Math.max(0, lit - 1);
      for (let i = 0; i < s.length; i++) { const d = Math.abs(s[i] - prev[i]); if (d > max && !flash) { max = d; at = i; } }
      prev = s;
      const lv = e.sun.intensity * lum(e.sun.color) + e.hemi.intensity * lum(e.hemi.color);
      if (lv < minLight) minLight = lv;
      if (lv < e.floorCitadel - 1e-6) below++;
    }
    return { max: +max.toFixed(5), at, minLight: +minLight.toFixed(4), floor: +e.floorCitadel.toFixed(4), below, frames: n };
  };
  const out = {};
  W.force('clear', 0); W.setPhase(0.4); G.step(0.1);
  W.force('rain', 30); out.toRain = sweep(32);
  W.force('storm', 25); out.toStorm = sweep(27);
  W.force('wind', 40); out.toWind = sweep(42);
  W.force('haze', 20); out.toHaze = sweep(22);
  W.force('clear', 30); out.toClear = sweep(32);
  // a whole day at 60× (20 s of play), clear and then under a storm: the light's floor
  W.timeScale = 60; W.setPhase(0); G.step(1 / 60);
  const phases = new Set();
  out.dayClear = sweep(20.5, () => phases.add(W.info().light));
  W.force('storm', 0); W.setPhase(0); G.step(1 / 60);
  out.dayStorm = sweep(20.5);
  out.phases = [...phases].sort();
  W.timeScale = 1; W.force('clear', 0); W.unforce(); W.setPhase(0.3); G.step(0.2);
  return out;
});
const STEP = 0.02;   // the largest change of any sampled value in one 60 Hz frame (fog distances as a share of today's)
check(`state blends are smooth: no sampled value (fog range, colours, sun and sky light, rain, motes, sky) changes more than ${STEP} in a frame`,
  ['toRain', 'toStorm', 'toWind', 'toHaze', 'toClear'].every((k) => smooth[k].max <= STEP), smooth);
check(`the day is smooth at 60× speed too (morning → noon → golden hour → morning), and passes every light`, smooth.dayClear.max <= STEP && JSON.stringify(smooth.phases) === JSON.stringify(['between', 'golden', 'morning', 'noon']), { day: smooth.dayClear, phases: smooth.phases });
check('the light never drops below the storm palette\'s (the floor): through every blend, a whole day, and a storm at the darkest point',
  Object.entries(smooth).filter(([k]) => k !== 'phases').every(([, r]) => r.below === 0) && smooth.dayStorm.minLight >= smooth.dayStorm.floor - 1e-4, smooth);

// ---------------------------------------------------------------- 4. indoors: nothing
const indoors = await ev((LOOK) => {
  const G = game, W = G.weather, L = new Function('return (' + LOOK + ')()');
  G.enterRoom('house', null, true, true); G.step(1);
  G.settings.weather = 'off'; G.applySettings(); G.step(0.5);
  const off = L();
  G.settings.weather = 'on'; G.applySettings(); G.step(0.2);
  const rows = [];
  for (const s of ['rain', 'storm', 'haze', 'wind']) for (const ph of [0.03, 0.79]) {
    W.force(s, 0, 'twinsun'); W.setPhase(ph, 'twinsun'); G.step(0.5);
    rows.push({ s, ph, same: JSON.stringify(L()) === JSON.stringify(off), look: L() });
  }
  W.force('clear', 0, 'twinsun'); W.unforce('twinsun'); W.setPhase(0.3, 'twinsun'); G.step(0.2);
  return { off, rows: rows.map((r) => ({ s: r.s, ph: r.ph, same: r.same, ...(r.same ? {} : { look: r.look }) })), region: W.info().region };
}, LOOK.toString());
check('indoors (Twinsen\'s house): no rain, no motes, no fog, light or tint change under any state or hour', indoors.region === null && indoors.rows.every((r) => r.same) && !indoors.off.rain && !indoors.off.motes, indoors);

// ---------------------------------------------------------------- 5. holds
const holds = await ev((HB) => {
  const G = game, W = G.weather, e = G.env, out = {};
  G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(0.5);
  W.force('rain', 0); W.setPhase(0.79); G.step(0.5);
  const ph0 = W.info().phase;
  W.hold('test');
  G.step(1); out.during = { ...W.info(), rain: e.rain.visible };
  G.step(HB + 1); G.step(20);
  out.held = { ...W.info(), rain: e.rain.visible, wxRain: e.wx.rain, storm: G.storm, phaseKept: W.info().phase === ph0 };
  W.release('test'); G.step(5);
  out.after = { ...W.info(), resumed: W.info().phase !== ph0 };
  // a cut (snap): at once
  W.force('storm', 0); G.step(0.3);
  W.hold('cut', true); G.step(1 / 60);
  out.snap = { ...W.info(), storm: G.storm, rain: e.rain.visible };
  W.release('cut'); G.step(0.2);
  // the story's own holds, without a call: a cutscene state, a reveal beat, the sandstorm
  W.force('rain', 0); G.step(0.2);
  const st = G.state; G.state = 'cutscene'; G.step(HB + 0.5); out.cutscene = { ...W.info(), storm: G.storm }; G.state = st;
  W.force('rain', 0); G.step(0.2);
  G.reveal = { active: true }; G.step(HB + 0.5); out.reveal = W.info(); G.reveal = null;
  G.enterRoom('desert', null, true, true); G.step(0.5);
  const D = G.rooms.desert;
  W.force('wind', 0); G.step(0.5);
  out.desertWind = { ...W.info(), motes: e.motes.visible, level: D.storm.level };
  D.storm.setLevel(1); G.step(HB + 1);
  out.sandstorm = { ...W.info(), motes: e.motes.visible, level: D.storm.level, wx: e.wx.on };
  D.storm.setLevel(0); G.step(1);
  out.afterSand = { ...W.info(), level: D.storm.level };
  W.unforce(); G.step(0.2);
  return out;
}, 4);
check('a hold pins clear (blended over a few seconds) and holds the light; released, the clock runs again',
  holds.during.held === 'test' && holds.held.state === 'clear' && holds.held.k === 1 && !holds.held.rain && holds.held.wxRain === 0 && holds.held.storm === 0 && holds.held.phaseKept && holds.after.held === null && holds.after.resumed && holds.after.state === 'clear', holds);
check('a cut\'s hold (snap) is clear at once: no storm, no rain on its first frame', holds.snap.state === 'clear' && holds.snap.k === 1 && holds.snap.storm === 0 && !holds.snap.rain, holds.snap);
check('the story holds the weather without a call: a cutscene, a reveal beat', holds.cutscene.held === 'cutscene' && holds.cutscene.state === 'clear' && holds.cutscene.storm === 0 && holds.reveal.held === 'reveal' && holds.reveal.state === 'clear', { cutscene: holds.cutscene, reveal: holds.reveal });
check('the chapter-4 sandstorm holds the ambient weather off (its dust gone) and is never started or stopped by it',
  holds.desertWind.motes && holds.desertWind.level === 0 && holds.sandstorm.held === 'sandstorm' && holds.sandstorm.state === 'clear' && !holds.sandstorm.motes && holds.sandstorm.level === 1 && holds.afterSand.level === 0, holds);

// ---------------------------------------------------------------- 6. Settings' toggle (by the player's click), quality caps
const ui = await ev(() => { const G = game; G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(0.3); G.weather.force('wind', 0); G.weather.setPhase(0.79); G.step(0.5);
  const was = { wx: G.env.wx.on, motes: G.env.motes.visible };
  G.pause(); G.showScreen('settings'); G.setTabTo('display');
  return { was, state: G.state, label: [...document.querySelectorAll('#settings .set-label')].map((e) => e.textContent).find((t) => /Weather/.test(t)) }; });
await page.click('#settings .seg[data-setting="weather"] button[data-v="off"]');
const off = await ev((LOOK) => { const G = game, L = new Function('return (' + LOOK + ')()'); G.act('back'); G.act('resume'); G.step(0.5);
  return { set: G.settings.weather, stored: JSON.parse(localStorage.getItem('sunshard_settings_v1')).weather, on: G.weather.enabled(), look: L() }; }, LOOK.toString());
await ev(() => { game.pause(); game.showScreen('settings'); game.setTabTo('display'); });
await page.click('#settings .seg[data-setting="weather"] button[data-v="on"]');
const on = await ev(() => { const G = game; G.act('back'); G.act('resume'); G.step(0.5); return { set: G.settings.weather, on: G.weather.enabled(), info: G.weather.info() }; });
check('Settings → Display: "Weather and light changes" On/Off; Off is today\'s look at once (stored), On starts fresh (clear, noon)',
  ui.was.wx && ui.was.motes && ui.label === 'Weather and light changes' && off.set === 'off' && off.stored === 'off' && !off.on && JSON.stringify(off.look) === JSON.stringify(def.look)
  && on.set === 'on' && on.on && on.info.state === 'clear' && on.info.light === 'noon', { ui, off, on });
const caps = await ev(() => {
  const G = game, W = G.weather, e = G.env, out = {};
  const q = (k) => { G.settings.quality = k; G.settings.qualityAuto = false; G.applySettings(); G.step(0.3); };
  for (const k of ['low', 'medium', 'high']) {
    q(k);
    W.force('wind', 0); G.step(0.3); const m = e.motes.visible ? e.motes.geometry.drawRange.count : 0;
    W.force('storm', 0); G.step(0.3); const r = e.rain.visible ? e.rain.geometry.drawRange.count / 2 : 0;
    out[k] = { motes: m, rain: r };
  }
  W.force('clear', 0); W.unforce(); G.step(0.3);
  return out;
});
check('quality: High 320 motes and all 2400 rain lines (as before), Medium 160 motes, Low no motes and 60 % of the lines; back up to High restores them',
  caps.high.motes === 320 && caps.high.rain === 2400 && caps.medium.motes === 160 && caps.medium.rain === 2400 && caps.low.motes === 0 && caps.low.rain === 1440, caps);

// ---------------------------------------------------------------- 7. cost: no new programs, textures or geometries from any state
const res1 = await ev(() => {
  const G = game, W = G.weather, R = G.renderer.renderer, out = {};
  G.exitRoom({ x: -42, z: -2, a: 0.6 }, true, true); G.step(0.3);
  // (a few drawn frames first: the shadow cache, rebuilt over several frames after the quality changes above, settles)
  W.force('clear', 0); W.setPhase(0.4); for (let i = 0; i < 8; i++) { G.step(0.2); G.renderer.render(); }
  out.before = { programs: R.info.programs.length, textures: R.info.memory.textures, geometries: R.info.memory.geometries };
  // (the same frame of the world each time — nobody walks between the renders — only the weather changed)
  const calls = (s, ph) => { W.force(s, 0); W.setPhase(ph); W.update(0); G.env.setStorm(G.storm); G.env.update(0, G.camera, G.hero.pos); R.info.reset(); G.renderer.render(); return R.info.render.calls; };
  out.calls = { clear: calls('clear', 0.4), rain: calls('rain', 0.4), wind: calls('wind', 0.4), storm: calls('storm', 0.04), golden: calls('clear', 0.79) };
  for (const s of ['haze', 'rain', 'wind', 'storm', 'clear']) for (const ph of [0.03, 0.4, 0.79]) { W.force(s, 0); W.setPhase(ph); G.step(0.2); G.renderer.render(); }
  W.unforce();
  return { ...out, programs: R.info.programs.length, textures: R.info.memory.textures, geometries: R.info.memory.geometries };
});
const res0 = res1.before;
console.log('COST draw calls (one frame, Citadel square, High):', JSON.stringify(res1.calls), '· programs/textures/geometries before and after every state:', JSON.stringify(res0), JSON.stringify({ programs: res1.programs, textures: res1.textures, geometries: res1.geometries }));
console.log('COST quality caps:', JSON.stringify(caps));
check('no new shader programs, textures or geometries from any state or hour (the rain lines and motes exist from the start)',
  res1.programs <= res0.programs && res1.textures <= res0.textures && res1.geometries <= res0.geometries, { res0, res1 });
// (a shorter fog range lets the fog cull leave more out: a state may draw fewer calls than clear, never more than one extra)
check('draw calls: rain and the storm add at most one (the lines), wind one (the motes), the light cycle none', ['rain', 'wind', 'storm', 'golden'].every((k) => res1.calls[k] <= res1.calls.clear + (k === 'golden' ? 0 : 1)), res1.calls);

done();
await browser.close();
