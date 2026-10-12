// LBA3 – The Awakening (fan project): game orchestration.
// Generic glue lives here (states, rooms, saves, UI, combat hooks);
// the story itself is in src/game/prologue.js.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { loadBake } from './engine/sculpt.js';
import { preloadCharacters } from './game/characters.js';
import { Environment } from './engine/environment.js';
import { AudioEngine } from './engine/audio.js';
import { Input, applyBindings, keyFor, keyLabel, REBINDABLE } from './engine/input.js';
import { CameraRig } from './engine/camera.js';
import { lerp, angleDiff, dampAngle } from './engine/math.js';
import { buildWorld, POI, QUAY } from './game/world.js';
import { streetDist } from './game/town.js';
import { buildInteriors } from './game/interiors.js';
import { buildZeelich } from './game/zeelich.js';
import { buildUnderground } from './game/underground.js';
import { buildDesert } from './game/desert.js';
import { buildCondenser } from './game/condenser.js';
import { buildHamalayi } from './game/hamalayi.js';
import { buildObsRoom } from './game/obsroom.js';
import { buildUpper3 } from './game/upper.js';
import { Hero, NPC, MagicBall, Bolts, Pickups, Particles, BEHAVIOURS, HERO_LOOK } from './game/actors.js';
import { createEnemy, Drone } from './game/enemies.js';
import { BehaviourMenu } from './game/behmenu.js';
import { HUD } from './game/hud.js';
import { Inventory } from './game/inventory.js';
import { Story, OLD_ORDER } from './game/story/index.js';
import { t, setLang } from './game/i18n.js';

const SAVE_KEY = 'lba3_save_v1'; // (storage key kept stable; the format version lives inside the save)
const SAVE_VERSION = 3;
// Bring an older save up to the current format. Returns null when the data can't be a save.
// v1 → v2: lists that early saves could lack are filled in; v2 → v3: the chapter's key is stored.
export function migrateSave(raw) {
  if (!raw || typeof raw !== 'object' || !raw.hero || typeof raw.hero !== 'object') return null;
  const s = JSON.parse(JSON.stringify(raw));
  let v = s.v || 1;
  if (v < 2) {
    s.flags = s.flags && typeof s.flags === 'object' ? s.flags : {};
    for (const k of ['killed', 'collected', 'searched', 'crates']) if (!Array.isArray(s[k])) s[k] = [];
    v = 2;
  }
  if (v < 3) {
    // v2 → v3: the chapter is stored by key, so chapters can be inserted later without moving saves
    if (!s.flags.chapterKey) s.flags.chapterKey = OLD_ORDER[Math.min(s.flags.chapter || 0, OLD_ORDER.length - 1)];
    v = 3;
  }
  s.v = v;
  return s;
}
// music per interior (mood names, see src/engine/music.js MOODS); outdoors it follows the area (see updatePlay)
const ROOM_MUSIC = { house: 'home', well: 'well', office: 'office', projoffice: 'stealth', control: 'station', workshop: 'workshop', lighttop: 'home' };
// footsteps and background hum per interior (rooms can also set .surface / .sounds themselves)
const ROOM_SURFACE = { obsv: 'stone', upper: 'stone', council: 'stone', archive: 'metal', hamalayi: 'grass', desert: 'dirt', condA: 'metal', condB: 'stone', house: 'wood', office: 'wood', projoffice: 'wood', workshop: 'wood', lighttop: 'wood', control: 'metal', well: 'stone', zeelich: 'stone', c3shaft: 'metal', c3deep: 'metal', c3core: 'metal', c3gallery: 'stone', c3sendell: 'stone' };
const ROOM_HUM = { condA: 'machine', condB: 'machine', control: 'machine', c3shaft: 'machine', c3deep: 'machine', c3core: 'machine', well: 'water' };
const SET_KEY = 'sunshard_settings_v1';
const BOOT_KEY = 'lba3_boot';
const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// kashes lying around the island
const COINS = [
  [-36, -8], [-46, 3], [-30, -24], [-20, -45], [-8, -62], [-26, 22], [-14, 34], [6, -8], [18, -8], [26, -14],
  [40, 18], [30, 42], [-58, -20], [-60, 12], [10, -40], [-30, -60], [64, 6], [20, 70], [-40, 40], [44, -36],
];

const SHOP = [
  { id: 'magic', key: 'shop_magic' },
  { id: 'potion', key: 'shop_potion', price: 6 },
  { id: 'flask', key: 'shop_flask', price: 5 },
  { id: 'clover', key: 'shop_clover', price: 22 },
];

class Game {
  constructor() {
    this.settings = { lang: 'en', controls: 'modern', camera: 'lba', hud: 'lba', visual: '2026', quality: 'high', music: 0.55, sfx: 0.8, voice: 0.8, textSpeed: 'normal', textSize: 'normal', shake: 'on', ...store.get(SET_KEY) };
    if (!['lba', 'free'].includes(this.settings.camera)) this.settings.camera = 'lba';
    // English only for now: the language choice is hidden (texts stay in the i18n tables for later translations)
    this.settings.lang = 'en';
    setLang(this.settings.lang);

    this.renderer = new Renderer($('#game'));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
    const tm = performance.now(); this.loadTimes = {};
    this.world = buildWorld(this.scene);
    this.loadTimes.world = performance.now() - tm;
    this.terrain = this.world.terrain;
    this.physics = this.world.physics;
    let tr = performance.now();
    this.rooms = buildInteriors(this.scene, this.physics);
    this.loadTimes.rooms = performance.now() - tr;
    // outdoor regions are rooms flagged `outdoor`: LBA camera, own sky, doors to their own interiors
    tr = performance.now();
    this.rooms.zeelich = buildZeelich(this.scene, this.physics);
    Object.assign(this.rooms, buildUnderground(this.scene, this.physics));
    tr = performance.now();
    this.rooms.desert = buildDesert(this.scene, this.physics);
    Object.assign(this.rooms, buildCondenser(this.scene, this.physics));
    tr = performance.now();
    this.rooms.hamalayi = buildHamalayi(this.scene, this.physics);
    this.loadTimes.hamalayi = performance.now() - tr;
    Object.assign(this.rooms, buildObsRoom(this.scene, this.physics));
    Object.assign(this.rooms, buildUpper3(this.scene, this.physics));
    this.loadTimes.desert = performance.now() - tr;
    this.loadTimes.zeelich = performance.now() - tr;
    this.room = null;
    this.env = new Environment(this.scene, this.terrain);
    this.renderer.setup(this.scene, this.camera);
    this.audio = new AudioEngine();
    this.audio.setMood('title');
    this.env.onThunder = () => this.audio.play('thunder');
    this.input = new Input(this.renderer.canvas);
    this.camRig = new CameraRig(this.camera, this.terrain, this.physics);
    this.particles = new Particles(this.scene);
    this.world.particles = this.particles;
    this.pickups = new Pickups(this);
    this.bolts = new Bolts(this);
    this.ball = new MagicBall(this);
    this.hud = new HUD(this);
    this.inventory = new Inventory(this);
    this.hud.buildMapImage(this.terrain);
    this.story = new Story(this);

    this.state = 'loading';
    this.time = 0;
    this.storm = 0;
    this.flags = {};
    this.killed = [];
    this.collected = [];
    this.searched = [];
    this.brokenCrates = [];
    this.lastSafe = { x: POI.start.x, z: POI.start.z };
    this.saveTimer = 0;
    this.combat = 0;
    this.doorCool = 0;
    this.trans = null;
    this.cutscene = null;

    tr = performance.now();
    this.spawnActors();
    this.loadTimes.actors = performance.now() - tr;
    this.loadTimes.total = performance.now() - tm;
    this.behMenu = new BehaviourMenu(this, HERO_LOOK);
    this.bubble = this.makeBubble();
    this.applySettings();
    this.wireUI();
    this.last = performance.now();
    requestAnimationFrame((t2) => this.loop(t2));

    const boot = sessionStorage.getItem(BOOT_KEY);
    sessionStorage.removeItem(BOOT_KEY);
    $('#loading').classList.add('hidden');
    if (boot === 'new') this.startNew();
    else if (boot === 'continue' && store.get(SAVE_KEY)) this.startContinue();
    else this.showScreen('title');
    if (matchMedia('(pointer: coarse)').matches) this.touch = true;
  }

  // ------------------------------------------------ spawning
  spawnActors() {
    this.hero = new Hero(this, POI.start.x, POI.start.z);
    this.npcs = this.story.npcDefs().map((d) => new NPC(this, d));
    this.enemies = this.story.enemyDefs().map((d) => createEnemy(this, d));
    this.story.decorate();
    COINS.forEach(([x, z], i) => this.pickups.spawn('coin', x, this.physics.groundAt(x, z) + 0.5, z, { id: 'c' + i }));
    // reward on top of the Whispering Cliffs (optional ball + jumping puzzle)
    const s = this.world.shard1Spot;
    this.pickups.spawn('clover', s.x, s.y, s.z, { id: 'cliff-clover' });
    for (let i = 0; i < 5; i++) this.pickups.spawn('coin', s.x + Math.cos(i * 1.26) * 2.2, s.y - 0.8, s.z + Math.sin(i * 1.26) * 2.2, { id: 'cliff-k' + i });
    // six singing crystals, hidden off the paths (each one: +1 max health; all six: Sendell notices)
    for (const c of this.crystalSpots()) this.pickups.spawn('crystal', c.x, c.y, c.z, { id: c.id });
  }
  crystalSpots() {
    const W = this.world, G = (x, z) => this.physics.groundAt(x, z) + 0.75, mt = this.rooms.zeelich?.millTop;
    const out = [
      { id: 'sc-lighthouse', x: 7, z: -77 }, { id: 'sc-orchard', x: -27, z: 38 }, { id: 'sc-pier', x: W.pierEnd.x - 0.6, z: W.pierEnd.z },
      { id: 'sc-east', x: 70, z: 0 }, { id: 'sc-north', x: 30, z: -60 },
    ].map((c) => ({ ...c, y: G(c.x, c.z) }));
    if (mt) out.push({ id: 'sc-mill', x: mt.x - 0.9, y: mt.y + 0.75, z: mt.z });
    return out;
  }
  // what Twinsen walks on, for the footsteps
  surfaceAt(p) {
    const R = this.room;
    if (R) return R.surface || ROOM_SURFACE[R.id] || 'stone';
    const W = this.world, gy = this.terrain.heightAt(p.x, p.z);
    if (p.y > gy + 0.25) return p.x < QUAY.x0 + 0.5 ? 'wood' : 'stone';  // the pier deck, steps, walls
    if (p.x > QUAY.x0 && p.x < QUAY.x1 && p.z > QUAY.z0 && p.z < QUAY.z1) return 'stone';
    if (streetDist(p.x, p.z) < 0.2 || Math.hypot(p.x - POI.village.x, p.z - POI.village.z) < 11) return 'stone';
    if (W.pathDist(p.x, p.z) < 1.7) return 'dirt';
    return 'grass';
  }
  // positional ambience: the well once the water is back, the station machinery when it runs, rooms with a hum
  soundSources() {
    const R = this.room, out = [];
    if (!R) {
      const W = this.world;
      if (this.flags.c1_water) out.push({ kind: 'water', x: W.well.x, z: W.well.z, r: 12 });
      if (W.station?.active) out.push({ kind: 'machine', x: W.station.bore.x, z: W.station.bore.z, r: 32 });
    } else {
      if (R.sounds) out.push(...R.sounds);
      const hum = ROOM_HUM[R.id];
      if (hum) out.push({ kind: hum, x: this.hero.pos.x, z: this.hero.pos.z, r: 1, vol: 0.6 });
    }
    return out;
  }
  crystalCount() { return this.collected.filter((id) => id.startsWith('sc-')).length; }
  applyCrystals() { this.hero.maxHp = 10 + this.crystalCount(); this.hero.hp = Math.min(this.hero.hp, this.hero.maxHp); }

  // ------------------------------------------------ rooms (interiors)
  startTransition(mid) {
    this.trans = { t: 0, mid, called: false };
  }
  updateTransition(dt) {
    const T = this.trans;
    if (!T) return;
    T.t += dt;
    if (T.t >= 0.35 && !T.called) { T.called = true; T.mid(); }
    const op = T.t < 0.35 ? T.t / 0.35 : Math.max(0, 1 - (T.t - 0.35) / 0.35);
    $('#fade').style.opacity = op;
    if (T.t >= 0.7) { this.trans = null; $('#fade').style.opacity = ''; }
  }

  enterRoom(id, spawn = null, instant = false) {
    const go = () => {
      if (this.room) this.room.group.visible = false;
      const R = (this.room = this.rooms[id]);
      R.group.visible = true;
      R.lights.forEach((l) => { l.intensity = l.userData.base; });
      this.world.root.visible = false;
      if (R.outdoor) { this.env.setInterior(false); this.env.setRegion(R.env); } else { this.env.setRegion(null); this.env.setInterior(true); }
      const sp = spawn || R.spawn;
      const h = this.hero;
      h.pos.set(sp.x, this.physics.groundAt(sp.x, sp.z), sp.z);
      h.angle = sp.a ?? 0;
      h.vy = 0; h.onGround = true; h.vel?.set(0, 0);
      this.lastSafe = { x: sp.x, z: sp.z };
      this.camRig.setIso(R.outdoor ? null : R);
      this.doorCool = 1;
      this.audio.setMood(R.music || ROOM_MUSIC[id] || 'citadel');
      this.audio.setPlace?.(R.outdoor ? (id === 'zeelich' || id === 'hamalayi' ? 'sky' : 'island') : id.startsWith('c3') || id === 'well' ? 'under' : 'interior');
      this.story.onEnterRoom(id);
      if (this.state !== 'title') this.save(false);
    };
    if (instant) go(); else this.startTransition(go);
  }

  exitRoom(to, instant = false) {
    const go = () => {
      const R = this.room;
      if (R) { R.group.visible = false; R.lights.forEach((l) => { l.intensity = 0; }); }
      this.room = null;
      this.world.root.visible = true;
      this.env.setRegion(null);
      this.env.setInterior(false);
      const h = this.hero;
      h.pos.set(to.x, this.physics.groundAt(to.x, to.z), to.z);
      h.angle = to.a ?? 0;
      h.vy = 0; h.onGround = true; h.vel?.set(0, 0);
      this.lastSafe = { x: to.x, z: to.z };
      this.camRig.setIso(null);
      this.doorCool = 1;
      this.audio.setOutdoorArea(to, POI);
      this.audio.setPlace?.('island');
      if (R) this.story.onExitRoom(R.id);
      if (this.state !== 'title') this.save(false);
    };
    if (instant) go(); else this.startTransition(go);
  }

  // where the hero is on the island map (inside a room: where that room is)
  mapHero() {
    if (!this.room || this.room.outdoor) return this.hero;
    const pos = this.room.id === 'house' ? this.world.houses[0] : this.world.well;
    return { pos: { x: pos.x, z: pos.z }, angle: this.hero.angle };
  }

  // ------------------------------------------------ saves
  snapshot() {
    const h = this.hero;
    return {
      v: SAVE_VERSION,
      room: this.room?.id || null,
      hero: { x: this.room ? h.pos.x : this.lastSafe.x, z: this.room ? h.pos.z : this.lastSafe.z, hp: Math.max(h.hp, 4), mp: h.mp, magicLevel: h.magicLevel, clovers: h.clovers, coins: h.coins, hasBall: h.hasBall, behaviour: h.behaviour },
      flags: this.flags, killed: this.killed, collected: this.collected, searched: this.searched, crates: this.brokenCrates,
    };
  }
  save(toast = true) {
    if (this.hero.dead || this.state === 'title') return;
    store.set(SAVE_KEY, this.snapshot());
    if (toast) this.hud.toast('toast_saved');
  }
  applySave(s) {
    const h = this.hero;
    Object.assign(h, { hp: s.hero.hp, mp: s.hero.mp, magicLevel: s.hero.magicLevel, clovers: s.hero.clovers, coins: s.hero.coins, hasBall: !!s.hero.hasBall });
    h.behaviour = s.hero.behaviour || 'normal';
    this.flags = s.flags || {};
    this.killed = s.killed || [];
    this.collected = s.collected || [];
    this.searched = s.searched || [];
    this.brokenCrates = s.crates || [];
    this.applyCrystals();
    for (const e of this.enemies) if (this.killed.includes(e.id)) { e.state = 'dead'; e.deadT = 99; e.rig.root.visible = false; }
    for (const p of [...this.pickups.list]) if (p.id && this.collected.includes(p.id)) { this.scene.remove(p.mesh); this.pickups.list.splice(this.pickups.list.indexOf(p), 1); }
    this.brokenCrates.forEach((i) => { if (this.world.crates[i]) this.breakCrate(this.world.crates[i], true); });
    if (this.flags.target) this.hitTarget(true);
    this.story.applyFlags();
    const at = { x: s.hero.x, z: s.hero.z, a: 0 };
    if (s.room && this.rooms[s.room]) this.enterRoom(s.room, at, true);
    else if (s.room) this.exitRoom(this.lastSafe || at, true); // (a room this build doesn't have: back outdoors)
    else this.exitRoom(at, true);
  }

  // ------------------------------------------------ flow
  startNew() {
    store.del(SAVE_KEY);
    this.beginPlay();
    this.story.start();
  }
  startContinue() {
    const raw = store.get(SAVE_KEY);
    const s = migrateSave(raw);
    // an older format is kept untouched next to the migrated save
    if (raw && s && raw.v !== SAVE_VERSION) store.set(SAVE_KEY + '_backup_v' + (raw.v || 1), raw);
    try {
      if (!s) throw new Error('unreadable save');
      this.applySave(s);
    } catch (e) {
      // never delete a save we couldn't read: set it aside and start fresh
      console.error('save load failed', e);
      if (raw) store.set(SAVE_KEY + '_unreadable', raw);
      store.del(SAVE_KEY);
      this.startNew();
      this.hud.toast('toast_save_error');
      return;
    }
    this.beginPlay();
    this.setState('play');
  }
  beginPlay() {
    this.audio.init();
    this.hideScreens();
    this.hud.show(true);
    this.hud.behaviour(this.hero.behaviour);
    this.camRig.override = null;
    $('#touch').classList.toggle('hidden', !this.touch);
    this.updateObjective();
  }
  reloadInto(mode) {
    sessionStorage.setItem(BOOT_KEY, mode);
    $('#fade').classList.add('on');
    setTimeout(() => location.reload(), 500);
  }
  setState(s) { this.state = s; }
  gameOver() {
    this.setState('gameover');
    this.hud.show(false);
    this.showScreen('gameover');
  }

  // ------------------------------------------------ UI
  showScreen(id) {
    this.hideScreens();
    document.querySelector('#chapter')?.classList.remove('show'); // (a chapter title never sits on top of a screen)
    $('#' + id).classList.remove('hidden');
    if (id === 'title') $('#btn-continue').disabled = !store.get(SAVE_KEY);
    if (id === 'settings') this.syncSettingsUI();
    this.screen = id;
    this.screenT = 0;
    this.menuSel = 0;
    this.focusMenu();
  }
  hideScreens() { document.querySelectorAll('.screen').forEach((e) => { if (e.id !== 'loading') e.classList.add('hidden'); }); this.screen = null; }
  menuButtons() { return this.screen ? [...document.querySelectorAll(`#${this.screen} .menu button:not(:disabled)`)] : []; }
  focusMenu() { this.menuButtons().forEach((b, i) => b.classList.toggle('sel', i === this.menuSel)); }

  wireUI() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.audio.init();
      if (b.dataset.act) { this.audio.play('select'); this.act(b.dataset.act); }
      const seg = b.closest('.seg');
      if (seg && b.dataset.v) { this.settings[seg.dataset.setting] = b.dataset.v; this.applySettings(); this.syncSettingsUI(); }
    });
    document.querySelectorAll('[data-range]').forEach((r) => r.addEventListener('input', () => { this.settings[r.dataset.range] = +r.value; this.applySettings(); }));
    $('#pausebtn').addEventListener('click', () => this.pause());
  }

  act(a) {
    switch (a) {
      case 'continue': this.startContinue(); break;
      case 'new': if (this.dirty) this.reloadInto('new'); else this.startNew(); break;
      case 'settings': this.prevScreen = this.screen; this.showScreen('settings'); break;
      case 'controls': this.prevScreen = this.screen; this.showScreen('controls'); this.buildRebind(); break;
      case 'resetkeys': this.settings.keys = {}; this.applySettings(); this.buildRebind(); break;
      case 'back': this.showScreen(this.prevScreen || 'title'); break;
      case 'resume': this.hideScreens(); this.setState('play'); break;
      case 'quit': this.save(false); this.reloadInto('title'); break;
      case 'retry': this.reloadInto(store.get(SAVE_KEY) ? 'continue' : 'new'); break;
      case 'explore':
        this.hideScreens(); this.hud.show(true); this.camRig.override = null; this.setState('play');
        this.story.afterEnding();
        this.updateObjective();
        break;
    }
  }

  pause() {
    if (this.state !== 'play') return;
    this.setState('pause');
    this.showScreen('pause');
  }

  syncSettingsUI() {
    document.querySelectorAll('.seg').forEach((s) => s.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(this.settings[s.dataset.setting]) === b.dataset.v)));
    document.querySelectorAll('[data-range]').forEach((r) => { r.value = this.settings[r.dataset.range]; });
  }

  // key rebinding (controls screen): click an action, press the new key
  buildRebind() {
    const el = $('#rebind');
    if (!el) return;
    el.innerHTML = '';
    for (const a of REBINDABLE) {
      const lab = document.createElement('label'); lab.textContent = t('kb_' + a);
      const b = document.createElement('button'); b.className = 'keybtn'; b.textContent = keyLabel(keyFor(a));
      b.addEventListener('click', () => {
        b.textContent = t('rebind_press'); b.classList.add('wait');
        const on = (e) => {
          e.preventDefault(); e.stopPropagation();
          removeEventListener('keydown', on, true);
          if (e.code !== 'Escape') { this.settings.keys = { ...(this.settings.keys || {}), [a]: e.code }; this.applySettings(); }
          this.buildRebind();
        };
        addEventListener('keydown', on, true);
      });
      el.append(lab, b);
    }
  }

  applySettings() {
    const s = this.settings;
    applyBindings(s.keys || {});
    setLang(s.lang);
    document.documentElement.lang = s.lang;
    document.documentElement.dir = s.lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
    document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
    this.hud.refreshText();
    this.renderer.setQuality(s.quality);
    const retro = s.visual === '1997';
    this.renderer.setRetro(retro);
    this.camRig.setMode(s.camera);
    this.camRig.cut = retro; // 1997: hard cuts between shots, remaster: glide
    this.env.setFogRange(...(retro ? [18, 72] : [45, 190]));
    this.env.waterU.uWaveAmp.value = retro ? 0.3 : 1;
    this.hud.setStyle(s.hud === 'lba');
    // comfort: dialogue speed (LBA2 types 50 chars/s), subtitle size, camera shake
    this.hud.textRate = { slow: 28, normal: 50, fast: 95, instant: 1e9 }[s.textSpeed] ?? 50;
    document.body.classList.toggle('big-text', s.textSize === 'large');
    this.camRig.shakeScale = { on: 1, reduced: 0.35, off: 0 }[s.shake] ?? 1;
    this.audio.vol.music = s.music;
    this.audio.vol.sfx = s.sfx;
    this.audio.vol.voice = s.voice;
    this.audio.applyVolumes();
    if (this.hero) this.updateObjective();
    store.set(SET_KEY, s);
  }

  updateObjective() { this.hud.objective(this.story.objective()); }

  mapMarkers() {
    const m = [];
    m.push({ x: POI.village.x, z: POI.village.z, color: '#fff', r: 3, label: t('sign_village').split('·')[0].trim() });
    for (const n of this.npcs) if (n.present && Math.abs(n.pos.x) < 200) m.push({ x: n.pos.x, z: n.pos.z, color: '#5ab0ff', r: 3 });
    return m.concat(this.story.markers());
  }

  // ------------------------------------------------ interaction
  findInteractable() {
    const h = this.hero, W = this.world;
    let best = null, bd = 1e9;
    // ranking: distance, plus a penalty for things off to the side or behind Twinsen (so what he faces wins),
    // and people a little ahead of signs and searches when they are about as close
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle);
    const consider = (d, max, o) => {
      if (!(d < max)) return;
      const s = d + (o.kind === 'npc' ? -0.35 : 0);
      if (s < bd) { bd = s; best = o; }
    };
    const dist = (x, z) => {
      const dx = x - h.pos.x, dz = z - h.pos.z, d = Math.hypot(dx, dz);
      const facing = d > 1e-3 ? (dx * fx + dz * fz) / d : 1;
      return d + (1 - facing) * 0.45;
    };
    for (const n of this.npcs) if (n.present && !n.def.noTalk) consider(dist(n.pos.x, n.pos.z), 2.6, { kind: 'npc', npc: n, label: n.def.id === 'pippa' ? 'p_shop' : 'p_talk' });
    if (!this.room) {
      for (const s of W.signs) consider(dist(s.x, s.z), 2.0, { kind: 'sign', sign: s, label: 'p_read' });
      for (const s of W.searchSpots) if (!this.searched.includes(s.id)) consider(dist(s.x, s.z), s.r, { kind: 'search', spot: s, label: 'p_search' });
    }
    // the chapter's own interactions first: on a tie (same spot) they win over the generic ones
    this.story.interactables(consider, dist);
    this.story.chapters[0].baseInteractables(consider, dist, this.story.cur);
    return best;
  }

  tryInteract() {
    const it = this.findInteractable();
    if (!it) return;
    if (it.kind === 'npc') { this.story.talk(it.npc); return; }
    if (it.kind === 'sign') { this.say('', [t(it.sign.key)]); return; }
    if (it.kind === 'search') {
      this.searched.push(it.spot.id);
      const s = it.spot, y = this.physics.groundAt(s.x, s.z) + 1.2;
      if (s.reward === 'flask') { this.pickups.spawn('flask', s.x, y, s.z, { pop: true }); this.hud.toast('toast_flask'); }
      if (s.reward === 'clover') { this.pickups.spawn('clover', s.x, y, s.z, { pop: true }); this.hud.toast('toast_clover_found'); }
      this.audio.play('chest');
      return;
    }
    this.story.interact(it);
  }

  say(name, lines, done, speaker = null, color = null) {
    if (!Array.isArray(lines)) lines = [lines];
    this.setState('dialog');
    this.hud.prompt(null);
    this.speaker = speaker;
    color ??= speaker?.def?.color || (speaker === this.hero ? '#8fc2ff' : '#ffffff');
    this.bubbleSide = !this.bubbleSide;
    this.audio.duck(true);
    this.hud.say(name, lines, () => { this.speaker = null; this.audio.duck(false); this.setState('play'); done?.(); }, color);
  }

  // LBA2's speech-bubble sprite above whoever is talking (DrawBulle in INCRUST.CPP)
  makeBubble() {
    const c = document.createElement('canvas');
    c.width = 96; c.height = 72;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 4;
    x.beginPath(); x.ellipse(48, 30, 40, 24, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(30, 48); x.lineTo(20, 68); x.lineTo(44, 52); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff'; x.fillRect(28, 44, 18, 8);
    x.fillStyle = '#000';
    for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(32 + i * 16, 30, 4, 0, Math.PI * 2); x.fill(); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sp.scale.set(0.9, 0.68, 1);
    sp.renderOrder = 11;
    sp.visible = false;
    this.scene.add(sp);
    return sp;
  }

  updateBubble() {
    const s = this.speaker;
    this.bubble.visible = !!s && this.state === 'dialog';
    if (!this.bubble.visible) return;
    const top = s.pos.y + (s.rig.height || 2.0) * (s.rig.root.scale.y || 1);
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const side = this.bubbleSide ? 1 : -1;
    const k = this.room ? 0.6 : 1;
    this.bubble.position.set(s.pos.x, top + 0.3 * k, s.pos.z).addScaledVector(right, side * 0.7 * k);
    this.bubble.scale.set(side * 0.9 * k, 0.68 * k, 1);
  }

  openShop() {
    const h = this.hero;
    this.setState('shop');
    const items = () => SHOP.map((s) => {
      const it = { ...s };
      if (s.id === 'magic') { it.price = [0, 15, 30, 50][h.magicLevel] ?? 0; it.disabled = h.magicLevel >= 4; }
      if (s.id === 'clover') it.disabled = h.clovers >= 9;
      return it;
    });
    this.hud.openShop(items, (it) => {
      if (it.disabled) { this.hud.toast('shop_max'); this.audio.play('deny'); return; }
      if (h.coins < it.price) { this.hud.toast('shop_poor'); this.audio.play('deny'); return; }
      h.coins -= it.price;
      if (it.id === 'magic') { h.magicLevel++; h.mp = h.mpMax; this.hud.toast('toast_magic', { n: h.magicLevel }); }
      if (it.id === 'potion') h.hp = h.maxHp;
      if (it.id === 'flask') h.mp = h.mpMax;
      if (it.id === 'clover') h.clovers++;
      this.audio.play('heal');
      this.save(false);
    }, () => this.setState('play'));
  }

  // ------------------------------------------------ combat hooks
  meleeHit(hero, dmg, range) {
    let any = false;
    for (const e of this.enemies) {
      if (!e.alive || !e.present) continue;
      const d = hero.distTo(e);
      if (d < range + e.radius && Math.abs(angleDiff(hero.angle, hero.angleTo(e))) < 0.95 && Math.abs(e.pos.y - hero.pos.y) < 1.5) {
        e.damage(dmg, hero.pos); any = true;
      }
    }
    if (!this.room) for (const c of this.world.crates) {
      if (!c.alive) continue;
      const d = Math.hypot(c.x - hero.pos.x, c.z - hero.pos.z);
      const a = Math.atan2(c.x - hero.pos.x, c.z - hero.pos.z);
      if (d < range + 0.5 && Math.abs(angleDiff(hero.angle, a)) < 1) { this.breakCrate(c); any = true; }
    }
    if (any) this.camRig.shake(0.12);
  }

  ballHitTest(p) {
    for (const e of this.enemies) {
      if (!e.alive || !e.present) continue;
      if (Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < (e.hitR || 0.75) && p.y > e.pos.y - 0.2 && p.y < e.pos.y + (e.hitH || 2)) {
        e.damage(this.ball.damage, p);
        return true;
      }
    }
    if (this.story.ballHit(p)) return true;
    if (this.room) return false;
    for (const c of this.world.crates) if (c.alive && p.distanceTo(new THREE.Vector3(c.x, c.y, c.z)) < 0.9) { this.breakCrate(c); return true; }
    const T = this.world.target;
    if (!T.hit && Math.hypot(p.x - T.x, p.y - T.y, p.z - T.z) < 1.25) { this.hitTarget(); return true; }
    return false;
  }

  // things the magic ball may curve toward
  ballAimTargets() {
    const out = [];
    for (const e of this.enemies) if (e.alive && e.present) out.push({ x: e.pos.x, y: e.pos.y + (e instanceof Drone ? e.hover : 0.45), z: e.pos.z });
    if (this.room) { for (const t2 of this.room.ballTargets) if (!t2.node?.lit && !t2.done) out.push(t2); }
    else if (!this.world.target.hit) out.push(this.world.target);
    return out.concat(this.story.ballTargets());
  }

  hitTarget(silent = false) {
    const T = this.world.target;
    T.hit = true;
    T.ringMat.color.set('#6aff7a'); T.ringMat.emissive.set('#20d040');
    this.flags.target = true;
    this.world.raiseStones(silent);
    if (!silent) {
      this.audio.play('rumble');
      this.camRig.shake(0.8);
      this.hud.toast('toast_stones');
      setTimeout(() => this.hud.toast('hint_jump'), 2400);
      this.save(false);
    }
  }

  breakCrate(c, silent = false) {
    if (!c || !c.alive) return;
    c.alive = false;
    c.c.enabled = false;
    c.mesh.parent?.remove(c.mesh);
    const i = this.world.crates.indexOf(c);
    if (!this.brokenCrates.includes(i)) this.brokenCrates.push(i);
    if (silent) return;
    this.audio.play('break');
    this.particles.burst(c.x, c.y, c.z, '#c8904a', 24, 4);
    const r = Math.random();
    const type = r < 0.45 ? 'coin' : r < 0.7 ? 'heart' : r < 0.85 ? 'flask' : null;
    if (type) for (let k = 0; k < (type === 'coin' ? 2 : 1); k++) this.pickups.spawn(type, c.x, c.y + 0.4, c.z, { pop: true });
  }

  alertGroup(group, pos, chance = 1) {
    for (const e of this.enemies) if (e.group === group && e.alive && Math.random() < chance) e.alert(pos);
  }

  onEnemyKilled(e) {
    this.killed.push(e.id);
    this.pickups.spawn('coin', e.pos.x, e.pos.y + 0.8, e.pos.z, { pop: true });
    if (Math.random() < 0.4) this.pickups.spawn('heart', e.pos.x, e.pos.y + 0.8, e.pos.z, { pop: true });
    this.save(false);
  }

  collect(p) {
    const h = this.hero;
    if (p.id) this.collected.push(p.id);
    const fl = { coin: ['+1', '#ffe35a'], heart: ['♥', '#ff5a6a'], flask: ['✦', '#7fc4ff'], clover: ['♣', '#7fef7a'], crystal: ['♦', '#9fe8ff'] }[p.type];
    if (fl) this.hud.float(fl[0], p.pos, fl[1]);
    switch (p.type) {
      case 'coin': h.coins++; this.audio.play('coin'); break;
      case 'heart': h.hp = Math.min(h.maxHp, h.hp + 3); this.audio.play('heal'); break;
      case 'flask': h.mp = h.mpMax; this.audio.play('heal'); break;
      case 'clover': h.clovers = Math.min(9, h.clovers + 1); this.audio.play('heal'); this.hud.toast('toast_clover_found'); break;
      case 'crystal': {
        const n = this.crystalCount();
        this.applyCrystals(); h.hp = h.maxHp;
        this.audio.play('shard');
        this.hud.toast('toast_crystal', { n, max: this.crystalSpots().length });
        if (n === 1) this.story.cur.chain([['hero', 'crystal_first']]);
        if (n >= this.crystalSpots().length) { this.flags.crystalsAll = true; this.story.cur.chain([['hero', 'crystal_all']]); }
        this.save(false);
        break;
      }
    }
    this.particles.burst(p.pos.x, p.pos.y, p.pos.z, p.type === 'coin' ? '#ffd23a' : '#ffffff', 10, 2.5);
  }

  // ------------------------------------------------ zones
  onZoneEnter(z) {
    const h = this.hero;
    if (z.type === 'checkpoint') {
      this.lastSafe = { x: h.pos.x, z: h.pos.z };
      if (this.saveTimer <= 0) { this.save(true); this.saveTimer = 20; }
    } else if (z.type === 'hint' && !this.flags.target) this.hud.toast('hint_target');
  }

  // doors outside, exits inside
  checkDoors() {
    if (this.doorCool > 0 || this.trans) return;
    const h = this.hero;
    if (this.room) {
      for (const e of this.room.exits) {
        if (Math.hypot(h.pos.x - e.x, h.pos.z - e.z) < e.r) {
          if (this.story.canExit(this.room, e.to)) {
            this.audio.play('door');
            // an exit leads outdoors on Citadel, or into another room/region ({ room, x, z, a })
            const to = this.story.exitTo(e.to);
            if (to?.room) this.enterRoom(to.room, to); else this.exitRoom(to);
          }
          this.doorCool = 1.5;
          return;
        }
      }
    }
    // doors: on Citadel (no region) or in the outdoor region the hero is in
    if (!this.room || this.room.outdoor) {
      const region = this.room?.id;
      for (const d of this.story.doors()) {
        if ((d.region || undefined) !== region) continue;
        if (Math.hypot(h.pos.x - d.x, h.pos.z - d.z) < d.r) { this.audio.play('door'); this.enterRoom(d.room); return; }
      }
    }
  }

  // ------------------------------------------------ main loop
  loop(now) {
    // rAF timestamps can be slightly older than performance.now() on the first frame: never step backwards
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000));
    this.last = now;
    if (!this.testFreeze) this.frame(dt, true);
    requestAnimationFrame((t2) => this.loop(t2));
  }

  // Deterministic stepping for automated tests: game.step(seconds).
  step(seconds, dt = 1 / 60) {
    for (let t = 0; t < seconds; t += dt) this.frame(dt, false);
  }

  frame(dt, render) {
    this.time += dt;
    const input = this.input;
    input.update();

    if (input.pressed('retro')) { this.settings.visual = this.settings.visual === '1997' ? '2026' : '1997'; this.applySettings(); }
    this.updateTransition(dt);

    if (this.trans && this.state === 'play') {
      // frozen while the screen fades
      this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null);
    } else switch (this.state) {
      case 'title': case 'loading': this.titleCamera(dt); this.menuNav(); break;
      case 'play': this.updatePlay(dt); break;
      case 'dialog':
        this.hud.updateDialog(dt);
        if (input.pressed('interact') || input.pressed('action') || input.pressed('click') || input.pressed('recenter')) this.hud.advance();
        this.updateBubble();
        {
          // Twinsen gestures when he speaks and turns to whoever else is talking
          const h = this.hero, sp = this.speaker;
          if (sp && sp !== h && sp.pos && h.distTo(sp) < 6) h.angle = dampAngle(h.angle, h.angleTo(sp), 5, dt);
          h.rig.play(sp === h ? 'talk' : sp ? 'listen' : 'idle'); h.rig.update(dt, 0); h.sync();
        }
        for (const n of this.npcs) n.update(dt);
        this.camRig.update(dt, this.hero.pos, this.hero.angle, false, input);
        break;
      case 'shop': this.hud.shopNav(input); this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null); break;
      case 'inventory':
        this.inventory.nav(input);
        if (input.pressed('inventory') || input.pressed('pause') || input.pressed('interact')) { this.inventory.show(false); this.setState('play'); }
        break;
      case 'map':
        this.hud.drawHolomap(this.time);
        if (input.pressed('map') || input.pressed('pause')) { $('#holomap').classList.add('hidden'); this.setState('play'); }
        break;
      case 'pause': case 'gameover': case 'ending':
        // a grace period, so a key still held from the last line of dialogue doesn't press a button
        if (this.state !== 'pause' && this.screenT < 1.2) { this.screenT += dt; break; }
        this.menuNav();
        if (this.state === 'pause' && input.pressed('pause')) this.act('resume');
        break;
      case 'cutscene':
        this.cutscene?.(dt);
        this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null);
        for (const n of this.npcs) n.update(dt);
        break;
    }

    this.world.storm = this.storm;
    this.env.setStorm(this.storm);
    this.audio.setStorm(this.storm);
    this.env.update(dt, this.camera, this.state === 'title' ? new THREE.Vector3(0, 0, 0) : this.hero.pos);
    this.world.update(dt, this.time);
    if (this.room) for (const u of this.room.updaters) u(dt, this.time);
    this.particles.update(dt);
    if (this.state !== 'title') this.pickups.update(this.state === 'play' ? dt : 0);
    if (this.state !== 'play') this.behMenu.show(false);
    this.hud.updateFloats(dt, this.camera);
    if (this.state !== 'dialog') this.bubble.visible = false;
    if (render) {
      this.renderer.render();
      this.behMenu.render(this.renderer.renderer, dt);
    }
  }

  menuNav() {
    const btns = this.menuButtons();
    if (!btns.length) return;
    const i = this.input;
    if (i.pressed('down')) { this.menuSel = (this.menuSel + 1) % btns.length; this.focusMenu(); this.audio.play('blip'); }
    if (i.pressed('up')) { this.menuSel = (this.menuSel + btns.length - 1) % btns.length; this.focusMenu(); this.audio.play('blip'); }
    if (i.pressed('interact') || i.pressed('action') || i.pressed('recenter')) { this.audio.init(); btns[this.menuSel]?.click(); }
  }

  titleCamera(dt) {
    const a = this.time * 0.05 + 2.2;
    this.camRig.override = { pos: new THREE.Vector3(Math.cos(a) * 110, 42, Math.sin(a) * 110), look: new THREE.Vector3(0, 4, 0) };
    if (!this._titleInit) { this._titleInit = true; this.camera.position.copy(this.camRig.override.pos); }
    this.camRig.update(dt, this.hero.pos, 0, false, null);
    for (const n of this.npcs) n.update(dt);
  }

  updatePlay(dt) {
    const input = this.input, h = this.hero;
    this.dirty = true;
    if (input.pressed('pause')) { this.pause(); return; }
    if (input.pressed('map') && h.hasBall) { this.setState('map'); $('#holomap').classList.remove('hidden'); return; }
    if (input.pressed('inventory')) { this.setState('inventory'); this.inventory.show(true); this.audio.play('select'); return; }
    if (input.down('wheel')) {
      // hold Ctrl: behaviour menu, world frozen
      const i = BEHAVIOURS.indexOf(h.behaviour);
      if (input.pressed('right') || input.pressed('next')) h.setBehaviour(BEHAVIOURS[(i + 1) % 4]);
      if (input.pressed('left') || input.pressed('prev')) h.setBehaviour(BEHAVIOURS[(i + 3) % 4]);
      for (let k = 0; k < 4; k++) if (input.pressed('b' + (k + 1))) h.setBehaviour(BEHAVIOURS[k]);
      this.behMenu.show(true);
      this.behMenu.refresh();
      this.hud.prompt(null);
      return;
    }
    this.behMenu.show(false);
    if (input.pressed('recenter')) this.camRig.recenter();
    if (input.pressed('view')) this.camRig.toggleView();
    this.saveTimer -= dt;
    this.doorCool -= dt;

    h.update(dt, input);
    if (this.state !== 'play') return;
    for (const n of this.npcs) n.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.ball.update(dt);
    this.bolts.update(dt);
    if (!this.room) this.world.zones.update(h.pos, { enter: (z) => this.onZoneEnter(z) });
    this.checkDoors();
    this.story.update(dt);
    if (this.state !== 'play') return;

    // remember a safe spot to return to after a fall
    this.safeT = (this.safeT || 0) - dt;
    if ((!this.room || this.room.outdoor) && this.safeT <= 0 && h.onGround && h.pos.y > 0.4) { this.safeT = 1; this.lastSafe = { x: h.pos.x, z: h.pos.z }; }

    // outdoor music follows the area: village and harbour, the open island, the project station in the old fortress
    if (!this.room) this.audio.setOutdoorArea(h.pos, POI);
    this.audio.updateSources(this.soundSources(), h.pos);
    // adaptive combat music
    const chasing = this.enemies.some((e) => e.alive && e.present && (e.state === 'chase' || e.state === 'windup'));
    this.combat = lerp(this.combat, chasing ? 1 : 0, 1 - Math.exp(-dt * 1.5));
    this.audio.setCombat(this.combat);

    const it = this.findInteractable();
    this.hud.prompt(it ? t(it.label) : null);
    this.hud.stats(h);
    if (!this.room) this.hud.drawMinimap();
    this.camRig.update(dt, h.pos, h.angle, h.speed > 0.5, input);
    if (!this.room) this.world.fadeOccluders?.(this.camera, h.pos, dt);
  }
}

// Load the pre-sculpted geometry (tools/bake.mjs) before building the world; anything
// missing or changed since the bake is sculpted at load as before.
const noBake = new URLSearchParams(location.search).has('nobake');
Promise.all([noBake ? Promise.resolve(false) : loadBake(window.LBA_BAKE_URL || 'assets/bake.bin').catch(() => false), preloadCharacters()]).then(() => { window.game = new Game(); });
