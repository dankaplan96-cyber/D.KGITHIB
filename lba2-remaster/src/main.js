// LBA3 – The Awakening (fan project): game orchestration.
// Generic glue lives here (states, rooms, saves, UI, combat hooks);
// the story itself is in src/game/prologue.js.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { loadBake } from './engine/sculpt.js';
import { preloadCharacters } from './game/characters.js';
import { Environment } from './engine/environment.js';
import { AudioEngine } from './engine/audio.js';
import { Perf } from './engine/perf.js';
import { Bench } from './engine/bench.js';
import { LightPool, POOL_SIZE } from './engine/lightpool.js';
import { Input, applyBindings, setKeyScheme, keyFor, keyLabel, REBINDABLE } from './engine/input.js';
import { CameraRig } from './engine/camera.js';
import { lerp, angleDiff, dampAngle } from './engine/math.js';
import { buildWorld, POI, QUAY } from './game/world.js';
import { streetDist } from './game/town.js';
import { buildInteriors } from './game/interiors.js';
import { buildZeelich } from './game/zeelich.js';
import { buildUnderground } from './game/underground.js';
import { buildDesert } from './game/desert.js';
import { buildCondenser } from './game/condenser.js';
import { buildTemple } from './game/temple.js';
import { buildWizards } from './game/wizards.js';
import { buildLba1Places } from './game/lba1places.js';
import { preloadLba1Rooms } from './game/lba1room.js';
import { preloadIslands, buildIslands } from './game/zislands.js';
import { buildSpaceport } from './game/spaceport.js';
import { buildTownLife } from './game/townlife.js';
import { buildCityDressing } from './game/citydress.js';
import { buildHamalayi } from './game/hamalayi.js';
import { buildObsRoom } from './game/obsroom.js';
import { buildUpper3 } from './game/upper.js';
import { buildValveRoom } from './game/valveroom.js';
import { buildArena, enterArena } from './game/arena.js';
import { updateKitLod } from './game/kit.js';
import { Hero, NPC, MagicBall, Bolts, Pickups, Particles, BEHAVIOURS, HERO_LOOK, PICK_TYPES } from './game/actors.js';
import { Targeting, CombatDirector, WEAPONS } from './game/combat.js';
import { Weapons, freshArms } from './game/weapons.js';
import { Gadgets } from './game/gadgets.js';
import { createEnemy, Drone } from './game/enemies.js';
import { BehaviourMenu } from './game/behmenu.js';
import { HUD } from './game/hud.js';
import { Inventory } from './game/inventory.js';
import { Story, OLD_ORDER } from './game/story/index.js';
import { t, setLang } from './game/i18n.js';

const SAVE_KEY = 'lba3_save_v1'; // (storage key kept stable; the format version lives inside the save)
const SAVE_VERSION = 4;
export const VERSION = '0.29.1'; // (the desktop build's version: desktop/package.json)
const TALK_ABOVE = 1.8;   // no Talk prompt for someone more than this far below Twinsen (he is on a roof or a ledge)
// Bring an older save up to the current format. Returns null when the data can't be a save.
// v1 → v2: lists that early saves could lack are filled in; v2 → v3: the chapter's key is stored; v3 → v4: the hero
// carries his weapons and gadgets (hero.arms, weapons.js; an older save carries none).
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
  if (v < 4) {
    s.hero.arms = freshArms(s.hero.arms);
    v = 4;
  }
  s.v = v;
  return s;
}
// music per interior (mood names, see src/engine/music.js MOODS); outdoors it follows the area (see updatePlay)
const ROOM_MUSIC = { house: 'home', well: 'well', office: 'office', projoffice: 'stealth', control: 'station', workshop: 'workshop', lighttop: 'home' };
// footsteps and background hum per interior (rooms can also set .surface / .sounds themselves)
const ROOM_SURFACE = { obsv: 'stone', upper: 'stone', council: 'stone', archive: 'metal', valves: 'metal', hamalayi: 'grass', desert: 'dirt', condA: 'metal', condB: 'stone', butemple: 'stone', wtent: 'stone', school: 'stone', asylum: 'stone', bumaze: 'stone', buhalls: 'stone', house: 'wood', office: 'wood', projoffice: 'wood', workshop: 'wood', lighttop: 'wood', control: 'metal', well: 'stone', zeelich: 'stone', c3shaft: 'metal', c3deep: 'metal', c3core: 'metal', c3gallery: 'stone', c3sendell: 'stone' };
const ROOM_HUM = { valves: 'water', condA: 'machine', condB: 'machine', control: 'machine', c3shaft: 'machine', c3deep: 'machine', c3core: 'machine', well: 'water' };
const SET_KEY = 'sunshard_settings_v1';
const BOOT_KEY = 'lba3_boot';
const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

// what counts as having enough kashes when a giver chooses (LBA2: NecessaryChapterMoney)
const MONEY_NEED = 20;

const SHOP = [
  { id: 'magic', key: 'shop_magic' },
  { id: 'potion', key: 'shop_potion', price: 6 },
  { id: 'flask', key: 'shop_flask', price: 5 },
  { id: 'clover', key: 'shop_clover', price: 22 },
];

class Game {
  constructor() {
    this.settings = { lang: 'en', controls: 'classic', camera: 'lba', hud: 'lba', visual: '2026', quality: 'high', res: 'auto', music: 0.55, sfx: 0.8, voice: 0.8, textSpeed: 'normal', textSize: 'normal', shake: 'on', difficulty: 'normal', aimAssist: 'normal', lockMode: 'toggle', ...store.get(SET_KEY) };
    if (!['lba', 'free'].includes(this.settings.camera)) this.settings.camera = 'lba';
    // settings v2: Classic (LBA2's own keys and tank controls) becomes the default, also for settings saved before
    if (!(this.settings.v >= 2)) { this.settings.controls = 'classic'; this.settings.keys = {}; this.settings.v = 2; }
    // English only for now: the language choice is hidden (texts stay in the i18n tables for later translations)
    this.settings.lang = 'en';
    setLang(this.settings.lang);

    this.renderer = new Renderer($('#game'));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
    // startup cost per region (ms), for profiling: game.loadTimes
    const tm = performance.now(); this.loadTimes = {};
    const timed = (name, fn) => { const t0 = performance.now(), r = fn(); this.loadTimes[name] = Math.round(performance.now() - t0); return r; };
    this.world = timed('world', () => buildWorld(this.scene));
    this.terrain = this.world.terrain;
    this.physics = this.world.physics;
    const S = this.scene, P = this.physics;
    timed('spaceport', () => buildSpaceport(this.world.root, P, this.world));
    timed('townlife', () => buildTownLife(this.world.root, P, this.world));
    timed('citydress', () => buildCityDressing(this.world.root, P, this.world));
    this.rooms = timed('interiors', () => buildInteriors(S, P));
    // outdoor regions are rooms flagged `outdoor`: LBA camera, own sky, doors to their own interiors
    this.rooms.zeelich = timed('zeelich', () => buildZeelich(S, P));
    timed('underground', () => Object.assign(this.rooms, buildUnderground(S, P)));
    this.rooms.desert = timed('desert', () => buildDesert(S, P));
    timed('condenser', () => Object.assign(this.rooms, buildCondenser(S, P)));
    timed('temple', () => Object.assign(this.rooms, buildTemple(S, P)));
    timed('wizards', () => Object.assign(this.rooms, buildWizards(S, P, this.rooms.desert, this.world)));
    timed('lba1', () => Object.assign(this.rooms, buildLba1Places(S, P)));
    this.rooms.hamalayi = timed('hamalayi', () => buildHamalayi(S, P));
    timed('obsroom', () => Object.assign(this.rooms, buildObsRoom(S, P)));
    timed('upper', () => Object.assign(this.rooms, buildUpper3(S, P)));
    this.rooms.valves = timed('valves', () => buildValveRoom(S, P));
    this.rooms.arena = timed('arena', () => buildArena(S, P));
    timed('islands', () => Object.assign(this.rooms, buildIslands(S, P)));
    this.room = null;
    this.env = new Environment(this.scene, this.terrain);
    this.renderer.setup(this.scene, this.camera);
    this.perf = new Perf(this.renderer.renderer); this.perf.game = this;
    // a first start on an integrated GPU begins on Medium (a choice in Settings overrides it)
    if (!store.get(SET_KEY)?.quality && /Intel|UHD|Iris|Radeon\(TM\) Graphics|Radeon Vega|Vega \d|Mali|Adreno|PowerVR/i.test(this.perf.gpu || '')) this.settings.quality = 'medium';
    this.version = VERSION;
    this.bench = new Bench(this);
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
    this.weapons = new Weapons(this);   // the blowgun, the laser pistol, the glove, the lightning (weapons.js)
    this.gadgets = new Gadgets(this);   // the penguin, protection, the conch, the lantern (its light joins the pool below)
    this.targeting = new Targeting(this);
    this.combatDir = new CombatDirector(this);
    this.hitStop = 0;
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

    timed('actors', () => this.spawnActors());
    this.lightPool = new LightPool(this.scene, POOL_SIZE[this.settings.quality] ?? 8); // (after every builder has placed its lamps)
    this.loadTimes.total = Math.round(performance.now() - tm);
    this.behMenu = new BehaviourMenu(this, HERO_LOOK);
    this.bubble = this.makeBubble();
    this.applySettings();
    this.wireUI();
    this.last = performance.now();
    requestAnimationFrame((t2) => this.loop(t2));

    if (matchMedia('(pointer: coarse)').matches) this.touch = true;
    this.ready = this.prepare();
  }

  // Compile every shader the island, the rooms and the regions use before the title shows, while the loading
  // screen is up (in parallel where the driver allows: KHR_parallel_shader_compile). Left to the first frame,
  // this froze the spinner for seconds (tens of seconds on some Windows drivers) and stuttered on new rooms.
  async prepare() {
    this.preparing = true;
    const t0 = performance.now();
    loadingStep('Preparing graphics…');
    await nextPaint();
    const R = this.renderer.renderer;
    try { await R.compileAsync(this.scene, this.camera); } catch (e) { console.warn('shader precompile', e); }
    // upload every texture now too, and draw the title's first view (shadow and post-processing passes)
    const tex = new Set();
    this.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap']) if (m[k]?.isTexture) tex.add(m[k]); });
    for (const t of tex) R.initTexture(t);
    loadingStep('Almost there…');
    await nextPaint();
    this.titleCamera(0);
    this.lightPool.update(this.camera.position);
    this.renderer.render();
    this.loadTimes.shaders = Math.round(performance.now() - t0);
    this.perf.load = this.loadTimes;
    this.preparing = false;
    this.last = performance.now();
    const boot = sessionStorage.getItem(BOOT_KEY);
    sessionStorage.removeItem(BOOT_KEY);
    $('#loading').classList.add('hidden');
    if (boot === 'new') this.startNew();
    else if (boot === 'continue' && store.get(SAVE_KEY)) this.startContinue();
    else this.showScreen('title');
  }

  // ------------------------------------------------ spawning
  spawnActors() {
    this.hero = new Hero(this, POI.start.x, POI.start.z);
    this.hero.arms = freshArms();
    this.npcs = this.story.npcDefs().map((d) => new NPC(this, d));
    this.enemies = this.story.enemyDefs().map((d) => createEnemy(this, d));
    this.story.decorate();
    // reward on top of the Whispering Cliffs (optional ball + jumping puzzle); kashes come from the givers
    const s = this.world.shard1Spot;
    this.pickups.spawn('clover', s.x, s.y, s.z, { id: 'cliff-clover' });
    // six singing crystals, hidden off the paths (each one: +1 max health; all six: Sendell notices)
    for (const c of this.crystalSpots()) this.pickups.spawn('crystal', c.x, c.y, c.z, { id: c.id });
  }
  crystalSpots() {
    const W = this.world, G = (x, z) => this.physics.groundAt(x, z) + 0.75, mt = this.rooms.zeelich?.millTop;
    const out = [
      { id: 'sc-lighthouse', x: -113, z: 85 }, { id: 'sc-orchard', x: -85, z: -49.5 }, { id: 'sc-pier', x: W.pierEnd.x - 0.6, z: W.pierEnd.z },
      { id: 'sc-east', x: -28, z: 40 }, { id: 'sc-north', x: -45, z: -84 },
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
  // A scene change: the screen fades to black (0.35 s), the scene swaps, then it fades back in (0.35 s). Through a
  // door the hero walks on into it as the screen darkens and walks in on the other side as it clears, as in LBA2.
  // While black, the new scene's shaders compile (in parallel where the driver allows) and nothing is drawn until
  // they're ready, so the first frames of a room never stutter; the fade advances at most 0.1 s per real frame,
  // so even a slow first frame (buffer uploads) can't skip the fade-in.
  startTransition(mid) {
    this.trans = { t: 0, mid, called: false, walk: !!this.walkNext, hold: false };
    this.walkNext = false;
    this.hud.prompt(null); // (the last room's prompt would otherwise come back with the new scene's first frames)
  }
  updateTransition(dt) {
    const T = this.trans;
    if (!T) return;
    if (T.hold) { $('#fade').style.opacity = 1; if (performance.now() - T.holdT > 4000) T.hold = false; return; }
    if (this._transBudget != null) { dt = Math.min(dt, this._transBudget); this._transBudget -= dt; }
    T.t += dt;
    if (T.t >= 0.35 && !T.called) { T.called = true; T.mid(); this.warmScene(T); }
    const op = T.t < 0.35 ? T.t / 0.35 : Math.max(0, 1 - (T.t - 0.35) / 0.35);
    $('#fade').style.opacity = op;
    if (T.t >= 0.7) { this.trans = null; $('#fade').style.opacity = ''; }
  }
  // compile the new scene's shaders behind the black screen (not under the automated tests' fixed stepping)
  warmScene(T) {
    const R = this.renderer.renderer;
    if (this.testFreeze || !R.compileAsync || this.state !== 'play') return;
    this.lightPool.update(this.hero.pos);
    T.hold = true; T.holdT = performance.now();
    R.compileAsync(this.scene, this.camera).catch(() => {}).finally(() => { T.hold = false; });
  }
  // the hero walks on through the door (fading out), and in from the doorway (fading in)
  transWalk(dt) {
    const h = this.hero, T = this.trans;
    if (!T.walk || T.hold || h.dead) return;
    const sp = 2.2 * (T.called ? Math.min(1, 1.6 - (T.t - 0.35) / 0.35) : 1);   // (slows to a stop as the screen clears)
    const dx = Math.sin(h.angle) * sp * dt, dz = Math.cos(h.angle) * sp * dt;
    // never off a ledge
    const y0 = h.pos.y, ahead = this.physics.groundAt(h.pos.x + dx * 8, h.pos.z + dz * 8, y0 + 0.6);
    if (ahead > y0 - 0.6) { this.physics.move(h, dx, dz); this.physics.fall(h, dt); }
    h.vel.set(dx / dt, dz / dt);
    h.speed = sp;
    h.rig.play('walk'); h.rig.update(dt, sp); h.sync();
  }

  enterRoom(id, spawn = null, instant = false, quiet = false) {
    const go = () => {
      if (this.room) this.room.group.visible = false;
      const R = (this.room = this.rooms[id]);
      R.group.visible = true;
      R.lights.forEach((l) => { l.intensity = l.userData.base; });
      this.world.root.visible = false;
      if (R.outdoor) { this.env.setInterior(false); this.env.setRegion(R.env); } else { this.env.setRegion(null); this.env.setInterior(true); }
      // (a story exit may name only the room, { room }: then the room's own spawn — never a position without x/z)
      const sp = spawn && Number.isFinite(spawn.x) && Number.isFinite(spawn.z) ? spawn : R.spawn;
      const h = this.hero;
      this.resetCombat();
      h.pos.set(sp.x, this.physics.groundAt(sp.x, sp.z), sp.z);
      h.angle = sp.a ?? 0;
      h.vy = 0; h.onGround = true; h.vel?.set(0, 0);
      this.lastSafe = { x: sp.x, z: sp.z };
      this.camRig.setIso(R.outdoor ? null : R);
      this.doorCool = 1;
      this.audio.setPlace?.(R.outdoor ? (id === 'zeelich' || id === 'hamalayi' || R.sky ? 'sky' : 'island') : id.startsWith('c3') || id === 'well' ? 'under' : 'interior');
      if (quiet) return; // (a cinematic changing scenes: its music, its own story, no save mid-scene)
      this.audio.setMood(R.music || ROOM_MUSIC[id] || 'citadel');
      this.story.onEnterRoom(id);
      if (this.state !== 'title') this.save(false);
    };
    if (instant) go(); else this.startTransition(go);
  }

  exitRoom(to, instant = false, quiet = false) {
    const go = () => {
      const R = this.room;
      if (R) { R.group.visible = false; R.lights.forEach((l) => { l.intensity = 0; }); }
      this.room = null;
      this.world.root.visible = true;
      this.env.setRegion(null);
      this.env.setInterior(false);
      const h = this.hero;
      this.resetCombat();
      h.pos.set(to.x, this.physics.groundAt(to.x, to.z), to.z);
      h.angle = to.a ?? 0;
      h.vy = 0; h.onGround = true; h.vel?.set(0, 0);
      this.lastSafe = { x: to.x, z: to.z };
      this.camRig.setIso(null);
      this.occSnap = true;   // (the houses take their faded state at once on the first frame: Game.occluders)
      this.doorCool = 1;
      this.audio.setPlace?.('island');
      if (quiet) return;
      this.audio.setOutdoorArea(to, POI);
      if (R) this.story.onExitRoom(R.id);
      if (this.state !== 'title') this.save(false);
    };
    if (instant) go(); else this.startTransition(go);
  }

  // somewhere to put the hero back after a fall: level ground for a metre all round, nothing steep next to it
  // (a spot on the brink of a slope sent him straight back down it, again and again)
  stableSpot(p) {
    const P = this.physics;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, x = p.x + Math.sin(a), z = p.z + Math.cos(a), g = P.groundAt(x, z, p.y + 0.6);
      if (Math.abs(g - p.y) > 0.6 || P.steepAt(x, z, g)) return false;
    }
    return true;
  }

  // a scene change: the ball comes home, shots in the air vanish, nobody may attack straight away
  resetCombat(carry = 'credit') {
    this.ball?.reset(carry); this.bolts?.clear(); this.weapons?.reset(); this.gadgets?.reset(); this.hero?.combat?.reset(); this.targeting?.release(); this.combatDir?.reset(); this.hitStop = 0;
  }

  // where the hero is on the island map (inside a room: where that room is)
  mapHero() {
    if (!this.room || this.room.outdoor) return this.hero;
    const pos = this.room.id === 'house' || this.room.id === 'cellar' ? this.world.houses[0] : this.world.well;
    return { pos: { x: pos.x, z: pos.z }, angle: this.hero.angle };
  }

  // ------------------------------------------------ saves
  snapshot() {
    const h = this.hero;
    return {
      v: SAVE_VERSION,
      room: this.room?.id || null,
      hero: { x: this.room ? h.pos.x : this.lastSafe.x, z: this.room ? h.pos.z : this.lastSafe.z, hp: Math.max(h.hp, 4), mp: h.mp, magicLevel: h.magicLevel, clovers: h.clovers, coins: h.coins, hasBall: h.hasBall, behaviour: h.behaviour, hasSword: h.hasSword, hasPulse: h.hasPulse, weapon: h.weapon, prevWeapon: h.prevWeapon, arms: freshArms(h.arms) },
      flags: this.flags, killed: this.killed, collected: this.collected, searched: this.searched, crates: this.brokenCrates,
    };
  }
  // the developer combat yard (?arena): never saved, never part of the story
  devArena() { return enterArena(this); }
  save(toast = true) {
    if (this.benching || this.hero.dead || this.state === 'title' || this.room?.id === 'arena') return;
    store.set(SAVE_KEY, this.snapshot());
    if (toast) this.hud.toast('toast_saved');
  }
  applySave(s) {
    const h = this.hero;
    Object.assign(h, { hp: s.hero.hp, mp: s.hero.mp, magicLevel: s.hero.magicLevel, clovers: s.hero.clovers, coins: s.hero.coins, hasBall: !!s.hero.hasBall });
    h.behaviour = s.hero.behaviour || 'normal';
    // weapons: what was owned, what was in hand (never more than one of each; unknown names fall back)
    h.hasSword = !!s.hero.hasSword; h.hasPulse = !!s.hero.hasPulse;
    h.arms = freshArms(s.hero.arms);
    h.weapon = WEAPONS.includes(s.hero.weapon) ? s.hero.weapon : 'ball';
    h.prevWeapon = WEAPONS.includes(s.hero.prevWeapon) ? s.hero.prevWeapon : 'fists';
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
    this.resetCombat('drop'); // (a bonus on the ball from before the load is nobody's)
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
    // a room's dialogue that began as the save put him back in it (Sendell, the control-room scene) goes on, rather
    // than being cut by the switch to play with its ending never run
    if (this.state !== 'dialog' && this.state !== 'cutscene') this.setState('play');
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
  setState(s) {
    const was = this.state;
    this.state = s;
    // back in control: forget presses made during dialogue / menus, and give a beat before enemies attack
    if (s === 'play' && was !== 'play' && this.hero) { this.hero.combat?.reset(); this.input?.clearEdges(); if (was === 'dialog' || was === 'cutscene') this.combatDir?.calm(0.6); }
    if (s !== 'play') this.targeting?.hide();
    this.hud?.busy(s !== 'play');
  }
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
    if (window.desktop) document.body.classList.add('desktop');
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
    // a story scene stops when the window loses focus (its music would run on without the picture)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'cinematic') this.pause();
      if (!document.hidden) this.last = performance.now(); // back from another tab: no catch-up for the time away
    });
    // F9 / ?perf: frame-time overlay (its own key: F1–F4 pick behaviours; a held key toggles once)
    addEventListener('keydown', (e) => { if (e.code === 'F9') { e.preventDefault(); if (!e.repeat) this.perf.overlay(); } });
    if (new URLSearchParams(location.search).has('perf')) this.perf.overlay(true);
    addEventListener('blur', () => { if (this.state === 'cinematic') this.pause(); });
  }
  // the label of the key bound to an action ("E", "Space"...), for prompts
  keyName(action) { return keyLabel(keyFor(action)); }

  act(a) {
    switch (a) {
      case 'continue': this.startContinue(); break;
      case 'new': if (this.dirty) this.reloadInto('new'); else this.startNew(); break;
      case 'settings': this.prevScreen = this.screen; this.showScreen('settings'); break;
      case 'controls': this.prevScreen = this.screen; this.showScreen('controls'); this.buildRebind(); break;
      case 'resetkeys': this.settings.keys = {}; this.applySettings(); this.buildRebind(); break;
      case 'back': this.showScreen(this.prevScreen || 'title'); break;
      case 'exitapp': window.desktop?.quit(); break; // (the desktop app only: desktop/preload.js)
      case 'resume':
        this.hideScreens();
        if (this.cine) { this.setState('cinematic'); this.cine.resume(); } else this.setState('play');
        break;
      case 'quit': if (!this.cine) this.save(false); this.reloadInto('title'); break; // (never save half a cinematic)
      case 'bench':
        if (this.cine) break;
        this.hideScreens();
        this.bench.run().then((text) => { if (!text) return; $('#bench-out').value = text; this.showScreen('benchres'); this.setState('pause'); });
        break;
      case 'benchcopy': navigator.clipboard?.writeText($('#bench-out').value).then(() => this.hud.toast('bench_copied'), () => {}); break;
      case 'retry': this.reloadInto(store.get(SAVE_KEY) ? 'continue' : 'new'); break;
      case 'explore':
        this.hideScreens(); this.hud.show(true); this.camRig.override = null; this.setState('play');
        this.story.afterEnding();
        this.updateObjective();
        break;
    }
  }

  pause() {
    if (this.state === 'cinematic' && this.cine) { this.cine.pause(); this.setState('pause'); this.showScreen('pause'); return; }
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

  // Applies the settings. Only what changed since the last call is redone: a volume slider sends an event per
  // step, and must not rebuild text, render targets, the shadow map or reset the camera.
  applySettings() {
    const s = this.settings, was = this._applied || {}, now = { ...s, keys: JSON.stringify(s.keys || {}) };
    const changed = (k) => now[k] !== was[k];
    if (changed('keys') || changed('controls')) { setKeyScheme(s.controls); applyBindings(s.keys || {}); }
    if (changed('lang') || changed('keys')) {
      setLang(s.lang);
      document.documentElement.lang = s.lang;
      document.documentElement.dir = s.lang === 'he' ? 'rtl' : 'ltr';
      document.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
      document.querySelectorAll('[data-i18n-html]').forEach((e) => { e.innerHTML = t(e.dataset.i18nHtml); });
      this.hud.refreshText();
      if (this.hero) this.updateObjective();
    }
    if (changed('quality')) { this.renderer.setQuality(s.quality); this.env?.setShadowQuality(s.quality); this.lightPool?.setSize(POOL_SIZE[s.quality] ?? 8); }
    if (changed('res')) this.renderer.setAutoRes(s.res !== 'full');
    const retro = s.visual === '1997';
    if (changed('visual')) {
      this.renderer.setRetro(retro);
      this.camRig.cut = retro; // 1997: hard cuts between shots, remaster: glide
      this.env.setFogRange(...(retro ? [18, 72] : [45, 190]));
      this.env.waterU.uWaveAmp.value = retro ? 0.3 : 1;
    }
    if (changed('camera')) this.camRig.setMode(s.camera);
    if (changed('hud')) this.hud.setStyle(s.hud === 'lba');
    // comfort: dialogue speed (LBA2 types 50 chars/s), subtitle size, camera shake
    this.hud.textRate = { slow: 28, normal: 50, fast: 95, instant: 1e9 }[s.textSpeed] ?? 50;
    document.body.classList.toggle('big-text', s.textSize === 'large');
    this.camRig.shakeScale = { on: 1, reduced: 0.35, off: 0 }[s.shake] ?? 1;
    this.audio.vol.music = s.music;
    this.audio.vol.sfx = s.sfx;
    this.audio.vol.voice = s.voice;
    this.audio.applyVolumes();
    this._applied = now;
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
    // how squarely Twinsen faces a point (1 straight ahead, 0 to his side); a point under his feet is not looked at
    const aim = (x, z) => { const dx = x - h.pos.x, dz = z - h.pos.z, d = Math.hypot(dx, dz); return d < 0.5 ? 0 : (dx * fx + dz * fz) / d; };
    // people: not from well above them (a roof, a ledge, the top of a stair: TALK_ABOVE); the one Twinsen faces in
    // reach is remembered, so a room search at his feet or to his side does not take the prompt from them
    let faced = null, fd = 1e9, fa = 0;
    for (const n of this.npcs) {
      if (!n.present || n.def.noTalk || h.pos.y - n.pos.y > TALK_ABOVE) continue;
      const o = { kind: 'npc', npc: n, label: n.def.id === 'pippa' ? 'p_shop' : 'p_talk' };
      consider(dist(n.pos.x, n.pos.z), 2.6, o);
      const d = Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z), a = aim(n.pos.x, n.pos.z);
      if (d < 2.2 && d < fd && a > 0.7) { fd = d; fa = a; faced = o; }
    }
    if (!this.room) {
      for (const s of W.signs) consider(dist(s.x, s.z), 2.0, { kind: 'sign', sign: s, label: 'p_read' });
      for (const p of W.pets || []) consider(dist(p.x, p.z), p.r, { kind: 'pet', pet: p, label: 'p_talk' });
    }
    // the chapter's own interactions first: on a tie (same spot) they win over the generic ones
    this.story.interactables(consider, dist);
    this.story.chapters[0].baseInteractables(consider, dist, this.story.cur);
    if (faced && best?.kind === 'roomsearch' && fa > aim(best.spot.x, best.spot.z)) return faced;
    return best;
  }

  // false when there is nothing in reach (in Normal mode Twinsen then hops: see Hero.hop)
  tryInteract() {
    const it = this.findInteractable();
    if (!it) return false;
    if (it.kind === 'npc') this.story.talk(it.npc);
    else if (it.kind === 'sign') this.say('', [t(it.sign.key)]);
    else if (it.kind === 'pet') it.pet.talk(this);
    else this.story.interact(it);
    return true;
  }

  // ------------------------------------------------ givers (LBA2's "zone giver")
  // A giver is a spot by a bin, a cupboard, a barrel: Twinsen's hop there shakes out one bonus, once (the
  // ids go into `searched`, so saves keep them). Most are indoors, as in the original. The bonus is the kind
  // (of those the spot may give) Twinsen needs most, as LBA2's WhichBonus decides; a bonus of n kashes is one
  // coin worth n.
  givers() { return (this.room ? this.room.givers : this.world.givers) || []; }
  giverHop() {
    const h = this.hero;
    for (const gv of this.givers()) {
      const key = 'giver:' + (this.room?.id || 'out') + ':' + gv.id;
      // (saves from before the givers kept the outdoor two as plain searches: same ids)
      if (this.searched.includes(key) || !this.room && this.searched.includes(gv.id) || Math.hypot(h.pos.x - gv.x, h.pos.z - gv.z) > gv.r) continue;
      if (Math.abs(h.pos.y - (gv.y ?? h.pos.y)) > 1.5) continue;
      this.searched.push(key);
      const y = (gv.y ?? this.physics.groundAt(gv.x, gv.z)) + (gv.top ?? 1);
      this.giveBonus(gv.kinds, gv.n || 1, gv.x, y, gv.z, h.pos);
      return true;
    }
    return false;
  }
  whichBonus(kinds) {
    const h = this.hero;
    const can = kinds.filter((k) => k !== 'magic' || h.magicLevel > 0);
    if (!can.length) return kinds.includes('magic') ? 'life' : null; // (magic without the ball: a heart instead)
    // how much each is needed: what you have against what you should have (> 1: short of it)
    const need = (k) => k === 'money' ? MONEY_NEED / Math.max(1, h.coins)
      : k === 'life' ? (h.hp > h.maxHp * 0.2 ? h.maxHp / h.hp : h.maxHp)
      : k === 'magic' ? (h.mp > 0 ? h.mpMax / h.mp : h.mpMax) : 0;
    let best = null, bv = 1;
    for (const k of can) if (need(k) > bv) { bv = need(k); best = k; }
    return best || can[Math.floor(Math.random() * can.length)];
  }
  // pop a bonus out of (x, y, z): toward `to` like a giver (70° up, ±13°), or straight up when there is no `to`
  // (a broken crate, a defeated enemy). LBA2: 40 units/tick at weight 15 → 3.15 m/s up, 1.13 m/s out, 7.8 m/s².
  giveBonus(kinds, n, x, y, z, to = null) {
    const k = this.whichBonus(kinds);
    if (!k) return null;
    const type = { money: 'coin', life: 'heart', magic: 'flask', clover: 'clover', key: 'key' }[k];
    if (!PICK_TYPES.has(type)) return null;
    let vx = 0, vz = 0;
    if (to) {
      const a = Math.atan2(to.x - x, to.z - z) + (Math.random() - 0.5) * 0.46;
      vx = Math.sin(a) * 1.13; vz = Math.cos(a) * 1.13;
    }
    this.audio.play('bonus');
    return this.pickups.spawn(type, x, y, z, { fly: { vx, vy: to ? 3.15 : 3.35, vz }, value: type === 'coin' ? n : 1, life: type === 'clover' || type === 'key' ? Infinity : 20 });
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

  // where: 'citadel' (Pippa's stall: her stock, then the arsenal's) or another stall the arsenal keeps (story/arsenal.js)
  openShop(where = 'citadel') {
    const h = this.hero;
    this.setState('shop');
    const own = where === 'citadel' ? SHOP : [];
    const items = () => [...own.map((s) => {
      const it = { ...s };
      if (s.id === 'magic') { it.price = [0, 15, 30, 50][h.magicLevel] ?? 0; it.disabled = h.magicLevel >= 4; }
      if (s.id === 'clover') it.disabled = h.clovers >= 9;
      return it;
    }), ...(this.story.arsenal?.shopItems(where) || [])];
    this.hud.openShop(items, (it) => {
      if (it.disabled) { this.hud.toast('shop_max'); this.audio.play('deny'); return; }
      if (h.coins < it.price) { this.hud.toast('shop_poor'); this.audio.play('deny'); return; }
      h.coins -= it.price;
      if (it.arsenal) { this.story.arsenal.buy(it); this.save(false); return; }
      if (it.id === 'magic') { h.magicLevel++; h.mp = h.mpMax; this.hud.toast('toast_magic', { n: h.magicLevel }); }
      if (it.id === 'potion') h.hp = h.maxHp;
      if (it.id === 'flask') h.mp = h.mpMax;
      if (it.id === 'clover') h.clovers++;
      this.audio.play('heal');
      this.save(false);
    }, () => this.setState('play'), where === 'citadel' ? 'shop_title' : 'a_shop_' + where);
  }

  // a choice list (the story's travel menus); onPick(item) runs back in play
  openMenu(titleKey, items, onPick) {
    this.setState('shop');
    this.hud.openMenu(titleKey, items, (it) => { this.setState('play'); onPick(it); }, () => this.setState('play'));
  }

  // ------------------------------------------------ combat hooks
  // sword / fists against the world: crates, and anything a chapter wants struck (ropes, ice, levers)
  meleeWorld(hero, D, a0, a1, hitSet) {
    let any = false;
    const inArc = (x, z, r) => {
      const d = Math.hypot(x - hero.pos.x, z - hero.pos.z);
      if (d > D.reach + r) return false;
      const rel = angleDiff(hero.angle, Math.atan2(x - hero.pos.x, z - hero.pos.z));
      const pad = Math.atan2(r, Math.max(d, 0.3));
      return rel >= a0 - pad && rel <= a1 + pad;
    };
    if (!this.room) for (const c of this.world.crates) {
      if (!c.alive || hitSet.has(c) || !inArc(c.x, c.z, 0.5)) continue;
      hitSet.add(c); this.breakCrate(c); this.impact(c.x, c.y, c.z, 'wood', 'break'); any = true;
    }
    if (this.story.meleeHit?.({ hero, move: D, inArc, hitSet })) any = true;
    return any;
  }

  // the ball's hit test: returns what it struck ({enemy?, material, result}) or null
  ballHitTest(p, ball = this.ball) {
    for (const e of this.enemies) {
      if (!e.alive || !e.present || ball?.hits?.has(e)) continue;
      if (Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < (e.hitR || 0.75) && p.y > e.pos.y - 0.2 && p.y < e.pos.y + (e.hitH || 2)) {
        const res = e.ballHit ? e.ballHit(ball, p) : (e.damage(ball.damage, p), 'hit');
        return { enemy: e, material: res === 'blocked' ? 'armor' : (e.material || 'flesh'), result: res };
      }
    }
    if (this.story.ballHit(p)) return { material: 'machine', result: 'switch' };
    // switches a room offers by itself ({x,y,z,r, onHit()})
    if (this.room) { for (const t2 of this.room.ballTargets) if (t2.onHit && !t2.done && Math.hypot(p.x - t2.x, p.y - t2.y, p.z - t2.z) < (t2.r || 0.7)) { t2.onHit(); return { material: 'machine', result: 'switch' }; } return null; }
    for (const c of this.world.crates) if (c.alive && p.distanceTo(new THREE.Vector3(c.x, c.y, c.z)) < 0.9) { this.breakCrate(c); return { material: 'wood', result: 'break' }; }
    const T = this.world.target;
    if (!T.hit && Math.hypot(p.x - T.x, p.y - T.y, p.z - T.z) < 1.25) { this.hitTarget(); return { material: 'wood', result: 'switch' }; }
    return null;
  }

  // things the magic ball may curve toward
  ballAimTargets() {
    const out = [];
    for (const e of this.enemies) if (e.alive && e.present) out.push({ x: e.pos.x, y: e.pos.y + (e instanceof Drone ? e.hover : 0.45), z: e.pos.z, enemy: e });
    if (this.room) { for (const t2 of this.room.ballTargets) if (!t2.node?.lit && !t2.done) out.push(t2); }
    else if (!this.world.target.hit) out.push(this.world.target);
    return out.concat(this.story.ballTargets());
  }

  // contact feedback: a short burst, a material sound, a little shake
  impact(x, y, z, material = 'flesh', result = 'hit', scale = 1) {
    const C = { flesh: '#ffe0b0', crystal: '#9ff4ff', machine: '#ffd27a', armor: '#ffffff', stone: '#d8ccb0', wood: '#c8904a', magic: '#ffe27a', none: '#a8b8c8' }[material] || '#ffffff';
    const snd = result === 'blocked' ? 'clang' : result === 'immune' ? 'notReady' : { flesh: 'hitFlesh', crystal: 'hitCrystal', machine: 'hitMachine', armor: 'clang', stone: 'hitStone', wood: 'hitWood', magic: 'hit' }[material] || 'hit';
    this.audio.play(snd);
    this.particles.burst(x, y, z, C, Math.round((result === 'blocked' ? 10 : 8) * scale), result === 'blocked' ? 5 : 3.5);
    if (result !== 'immune') this.camRig.shake(result === 'blocked' ? 0.12 : 0.08 * scale);
  }

  // the cursor's point in the world, on the plane at Twinsen's chest height (null when the mouse isn't aiming)
  mouseAim() {
    const I = this.input;
    if (!I.mouseAiming() || this.settings.mouseAim === 'off') return null;
    const r = this.renderer.canvas.getBoundingClientRect();
    const nx = ((I.mouse.x - r.left) / r.width) * 2 - 1, ny = -((I.mouse.y - r.top) / r.height) * 2 + 1;
    this._ray ??= new THREE.Raycaster();
    this._ray.setFromCamera({ x: nx, y: ny }, this.camera);
    const o = this._ray.ray.origin, d = this._ray.ray.direction;
    const py = this.hero.pos.y + 1.0;
    if (Math.abs(d.y) < 1e-4) return null;
    const tt = (py - o.y) / d.y;
    if (tt <= 0) return null;
    return { x: o.x + d.x * tt, z: o.z + d.z * tt };
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
    this.giveBonus(['money', 'life', 'magic'], 2, c.x, c.y + 0.4, c.z);
  }

  alertGroup(group, pos, chance = 1) {
    for (const e of this.enemies) if (e.group === group && e.alive && Math.random() < chance) e.alert(pos);
  }

  onEnemyKilled(e) {
    this.killed.push(e.id);
    this.giveBonus(['money', 'life', 'magic'], 1, e.pos.x, e.pos.y + 0.8, e.pos.z);
    this.save(false);
  }

  collect(p) {
    const h = this.hero;
    if (p.id) this.collected.push(p.id);
    if (p.owe && this.flags[p.owe]) { if (--this.flags[p.owe] <= 0) delete this.flags[p.owe]; }   // (a story's reward, now in hand: ChapterBase.reward)
    const fl = { coin: ['+' + (p.value || 1), '#ffe35a'], heart: ['♥', '#ff5a6a'], flask: ['✦', '#7fc4ff'], clover: ['♣', '#7fef7a'], crystal: ['♦', '#9fe8ff'] }[p.type];
    if (fl) this.hud.float(fl[0], p.pos, fl[1]);
    switch (p.type) {
      case 'coin': h.coins += p.value || 1; this.audio.play('coin'); break;
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
    const h = this.hero;
    // an exit the story refused (a line of dialogue: "not without the ball") fires again only after the hero has
    // stepped out of it; standing in it used to replay the refusal every 1.5 s, faster than he could turn away
    const ref = this.exitRefused;
    if (ref && (ref.room !== this.room || Math.hypot(h.pos.x - ref.e.x, h.pos.z - ref.e.z) > ref.e.r + 0.3)) this.exitRefused = null;
    if (this.doorCool > 0 || this.trans) return;
    if (this.room) {
      for (const e of this.room.exits) {
        if (this.exitRefused?.e === e) continue;
        if (Math.hypot(h.pos.x - e.x, h.pos.z - e.z) < e.r) {
          // a door between two rooms of one building (Twinsen's house and its cellar)
          if (e.room) { this.audio.play('door'); this.walkNext = true; const R2 = this.rooms[e.room]; this.enterRoom(e.room, R2.entries?.[this.room.id] || R2.spawn); this.walkNext = false; this.doorCool = 1.5; return; }
          if (this.story.canExit(this.room, e.to)) {
            this.audio.play('door');
            // an exit leads outdoors on Citadel, or into another room/region ({ room, x, z, a })
            const to = this.story.exitTo(e.to);
            this.walkNext = true;
            if (to?.room) this.enterRoom(to.room, to); else this.exitRoom(to);
            this.walkNext = false;   // (a story exit may have started its own scene instead)
          } else this.exitRefused = { e, room: this.room };
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
        if (Math.hypot(h.pos.x - d.x, h.pos.z - d.z) < d.r) { this.audio.play('door'); this.walkNext = true; this.enterRoom(d.room); this.walkNext = false; return; }
      }
    }
  }

  // ------------------------------------------------ main loop
  loop(now) {
    // rAF timestamps can be slightly older than performance.now() on the first frame: never step backwards
    const real = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (!this.testFreeze && !this.preparing) this.advance(real);
    requestAnimationFrame((t2) => this.loop(t2));
  }

  // Real time → simulation. A slow frame is simulated in steps of at most MAX_STEP (so the game keeps real
  // time down to MAX_STEP / MAX_SUB ≈ 7.5 fps instead of turning into slow motion below 20 fps); a longer gap
  // (a stall, a GC, a dragged window) is dropped rather than caught up, so a hitch can't snowball. Input is
  // read once per step: a press is an edge in the first step only, a held key stays held.
  advance(real) {
    const t0 = performance.now();
    const dt = Math.min(real, MAX_STEP * MAX_SUB);
    const n = Math.max(1, Math.ceil(dt / MAX_STEP - 1e-6)), sub = dt / n;
    this.perf.beginFrame();
    this._renderMs = 0;
    this.benchTick?.(real);
    this._transBudget = Math.min(real, 0.1);
    for (let i = 0; i < n; i++) this.frame(sub, i === n - 1);
    const ms = performance.now() - t0;
    this.perf.record({ real, ms: real * 1000, steps: n, lost: real - dt, sim: ms - this._renderMs, render: this._renderMs });
    // automatic resolution follows the frame time in play (not through fades, menus or a benchmark)
    if (this.state === 'play' && !this.trans && !this.benching) this.renderer.adapt(real * 1000);
  }

  // Deterministic stepping for automated tests: game.step(seconds).
  step(seconds, dt = 1 / 60) {
    this._transBudget = null;
    for (let t = 0; t < seconds; t += dt) this.frame(dt, false);
  }

  frame(dt, render) {
    this.time += dt;
    const input = this.input;
    input.update();

    this.updateTransition(dt);

    if (this.trans && this.state === 'play') {
      // frozen while the screen fades (through a door, the hero walks on)
      this.transWalk(dt);
      this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null);
      this.occluders(dt);
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
        this.occluders(dt);
        break;
      case 'shop': this.hud.shopNav(input); this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null); this.occluders(dt); break;
      case 'inventory':
        this.inventory.nav(input);
        // E on a gadget uses it (LBA2: select it in the inventory); otherwise E closes, as before
        if (input.pressed('interact') && this.inventory.usable()) { const id = this.inventory.usable(); this.inventory.show(false); this.setState('play'); this.gadgets.use(id); this.hud.stats(this.hero); this.save(false); }
        else if (input.pressed('inventory') || input.pressed('pause') || input.pressed('interact')) { this.inventory.show(false); this.setState('play'); }
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
      case 'cinematic':
        if (input.pressed('pause')) { this.pause(); break; }
        this.cine?.update(dt);
        for (const n of this.npcs) n.update(dt);
        break;
      case 'cinematicEnd': break; // (a skip's short dip to black)
      case 'cutscene':
        this.cutscene?.(dt);
        this.camRig.update(dt, this.hero.pos, this.hero.angle, false, null);
        this.occluders(dt);
        for (const n of this.npcs) n.update(dt);
        break;
    }

    this.world.storm = this.storm;
    this.env.setStorm(this.storm);
    this.audio.setStorm(this.storm);
    const focus = this.cine?.focus || this.hero.pos;
    this.env.update(dt, this.camera, this.state === 'title' ? new THREE.Vector3(0, 0, 0) : focus);
    if (!this.room) this.world.updateLod?.(this.state === 'title' || this.state === 'loading' ? this.camera.position : focus);
    else if (this.room.outdoor) updateKitLod(this.hero.pos);
    this.world._hero = this.hero;
    this.world.update(dt, this.time);
    if (this.room) for (const u of this.room.updaters) u(dt, this.time);
    this.lightPool.update(this.state === 'title' || this.state === 'loading' ? this.camera.position : focus);
    this.particles.update(dt);
    if (this.state !== 'title') this.pickups.update(this.state === 'play' ? dt : 0);
    if (this.state !== 'play') this.behMenu.show(false);
    this.hud.updateFloats(dt, this.camera);
    if (this.state !== 'dialog') this.bubble.visible = false;
    if (render && !this.trans?.hold) {
      const t0 = performance.now();
      this.renderer.render();
      this.behMenu.render(this.renderer.renderer, dt);
      this._renderMs = performance.now() - t0;
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
    // weapon selector (hold X / RT): the world slows to a crawl while choosing
    if (input.down('weapons') && h.combat.owned().length > 1) {
      this.hud.weaponSelect(true, h, input);
      dt *= 0.12;
    } else if (this.hud.wselOpen) { const w = this.hud.weaponSelect(false, h, input); if (w) h.combat.equip(w); }
    if (input.pressed('swap')) h.combat.swap();
    // focus / lock-on (toggle or hold, per settings) and switching targets
    const T = this.targeting, lockHold = this.settings.lockMode === 'hold';
    const aim = h.combat.lastAim || { x: Math.sin(h.angle), z: Math.cos(h.angle) };
    if (lockHold) { if (input.down('focus') && !T.lock) T.toggleLock(aim); else if (!input.down('focus') && T.lock) T.release(); }
    else if (input.pressed('focus')) T.toggleLock(aim);
    if (input.pressed('tswitch') && T.lock) T.cycle(input.wheelSteps < 0 ? -1 : 1);
    if (input.pressed('recenterPad') && !T.lock) this.camRig.recenter();
    // hit-stop: a few frames of near-stillness on a solid sword hit (input is still read)
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.1; }
    this.combatDir.update(dt);
    if (input.pressed('recenter')) this.camRig.recenter();
    if (input.pressed('view')) this.camRig.toggleView();
    this.saveTimer -= dt;
    this.doorCool -= dt;

    h.update(dt, input);
    if (this.state !== 'play') return;
    for (const n of this.npcs) n.update(dt);
    this.gadgets.updateEnemies(dt);   // (each enemy's update; a meca-penguin may stand in for Twinsen)
    this.ball.update(dt);
    this.weapons.update(dt);
    this.gadgets.update(dt);
    const c = h.combat;
    T.update(dt, c.lastAim || aim, !!(c.throwing || c.holding || c.move));
    this.hud.weapon(h);
    this.bolts.update(dt);
    if (!this.room) this.world.zones.update(h.pos, { enter: (z) => this.onZoneEnter(z) });
    this.checkDoors();
    this.story.update(dt);
    if (this.state !== 'play') return;

    // remember a safe spot to return to after a fall
    this.safeT = (this.safeT || 0) - dt;
    if ((!this.room || this.room.outdoor) && this.safeT <= 0 && h.onGround && !h.sliding && h.pos.y > 0.4) { if (this.stableSpot(h.pos)) { this.safeT = 1; this.lastSafe = { x: h.pos.x, z: h.pos.z }; } else this.safeT = 0.25; }

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
    this.occluders(dt);
  }

  // Houses between the camera and Twinsen fade out (town.js / island.js fadeOccluders). It runs wherever the game
  // camera follows him outdoors on Citadel — play, dialogue, the shop, cut-scenes and through a door's fade — and on
  // the first frame of a scene (occSnap, set by exitRoom) it takes the final state at once: leaving home used to open
  // on his own roof filling the screen through the whole fade-in, fading only once control was back.
  occluders(dt) {
    if (this.room) return;
    const snap = this.occSnap;
    this.occSnap = false;
    if (snap) this.camera.updateMatrixWorld();
    this.world.fadeOccluders?.(this.camera, this.hero.pos, snap ? 10 : dt);
  }
}

const MAX_STEP = 1 / 30, MAX_SUB = 4; // (see Game.advance)
const loadingStep = (text) => { const e = document.querySelector('#loading-step'); if (e) e.textContent = text; };
// resolves after the browser has painted (so a loading message shows before a long synchronous step)
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Load the pre-sculpted geometry (tools/bake.mjs) before building the world; anything
// missing or changed since the bake is sculpted at load as before.
const noBake = new URLSearchParams(location.search).has('nobake');
Promise.all([noBake ? Promise.resolve(false) : loadBake(window.LBA_BAKE_URL || 'assets/bake.bin').catch(() => false), preloadCharacters(), preloadLba1Rooms(), preloadIslands()]).then(async () => { loadingStep('Building the island…'); await nextPaint(); window.game = new Game(); });
