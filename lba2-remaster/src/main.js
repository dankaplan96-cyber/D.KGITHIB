// LBA3 – The Awakening (fan project): game orchestration.
// Generic glue lives here (states, rooms, saves, UI, combat hooks);
// the story itself is in src/game/prologue.js.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { loadBake } from './engine/sculpt.js';
import { preloadCharacters } from './game/characters.js';
import { Environment } from './engine/environment.js';
import { AudioEngine } from './engine/audio.js';
import { Perf, gpuQuality, oldGpuQuality } from './engine/perf.js';
import { Bench } from './engine/bench.js';
import { FarCull, BlobBatch } from './engine/drawcull.js';
import { BLOBS } from './engine/rig.js';
import { LightPool, POOL_SIZE } from './engine/lightpool.js';
import { ShadowCull } from './engine/shadowcull.js';
import { DrawBatch } from './engine/drawbatch.js';
import { warmShadowPrograms, warmPassPrograms } from './engine/warmup.js';
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
import { buildCitadelContainers, buildRegionContainers, ContainerCues } from './game/containers.js';
import { buildHamalayi } from './game/hamalayi.js';
import { buildObsRoom } from './game/obsroom.js';
import { buildUpper3 } from './game/upper.js';
import { buildValveRoom } from './game/valveroom.js';
import { buildArena, enterArena } from './game/arena.js';
import { updateKitLod, enableBatching } from './game/kit.js';
import { Hero, NPC, MagicBall, Bolts, Pickups, Particles, BEHAVIOURS, HERO_LOOK, PICK_TYPES } from './game/actors.js';
import { Targeting, CombatDirector, WEAPONS } from './game/combat.js';
import { Weapons, freshArms } from './game/weapons.js';
import { Gadgets } from './game/gadgets.js';
import { createEnemy, Drone } from './game/enemies.js';
import { koGone } from './game/death.js';
import { BehaviourMenu } from './game/behmenu.js';
import { HUD } from './game/hud.js';
import { Inventory } from './game/inventory.js';
import { Story, OLD_ORDER } from './game/story/index.js';
import { t, setLang } from './game/i18n.js';

const SAVE_KEY = 'lba3_save_v1'; // (storage key kept stable; the format version lives inside the save)
const SAVE_VERSION = 4;
export const VERSION = '0.31.0'; // (the desktop build's version: desktop/package.json)
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
    this.settings = { lang: 'en', controls: 'classic', camera: 'lba', hud: 'lba', visual: '2026', quality: 'high', res: 'auto', fps: 'auto', aa: 'msaa', music: 0.55, sfx: 0.8, voice: 0.8, textSpeed: 'normal', textSize: 'normal', shake: 'on', difficulty: 'normal', aimAssist: 'normal', lockMode: 'toggle', minimap: 'north', ...store.get(SET_KEY) };
    if (!['lba', 'follow', 'free'].includes(this.settings.camera)) this.settings.camera = 'lba';
    // settings v2: Classic (LBA2's own keys and tank controls) becomes the default, also for settings saved before
    // (R1-MIGRATE: an update keeps the player's choices; only a missing or unknown scheme falls back to Classic,
    //  and only key bindings that aren't valid key codes are dropped)
    if (!(this.settings.v >= 2)) {
      if (!['classic', 'modern'].includes(this.settings.controls)) this.settings.controls = 'classic';
      const k = this.settings.keys;
      this.settings.keys = k && typeof k === 'object' ? Object.fromEntries(Object.entries(k).filter(([, c]) => typeof c === 'string' && c)) : {};
      this.settings.v = 2;
    }
    // English only for now: the language choice is hidden (texts stay in the i18n tables for later translations)
    this.settings.lang = 'en';
    setLang(this.settings.lang);

    this.renderer = new Renderer($('#game'));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
    // startup cost per region (ms), for profiling: game.loadTimes
    const tm = performance.now(); this.loadTimes = {};
    const timed = (name, fn) => {
      const t0 = performance.now(), n0 = this.scene.children.length, w0 = this.world?.root.children.length ?? 0, r = fn();
      this.loadTimes[name] = Math.round(performance.now() - t0);
      // (diagnostics: tag what each builder added, for tests/drawcalls.mjs)
      for (const [root, from] of [[this.scene, n0], [this.world?.root, w0]]) if (root) for (let i = from; i < root.children.length; i++) root.children[i].userData.src ??= name;
      return r;
    };
    enableBatching(this.renderer.renderer); // (vegetation in one draw call where WEBGL_multi_draw is there: kit.js)
    this.world = timed('world', () => buildWorld(this.scene));
    this.terrain = this.world.terrain;
    this.physics = this.world.physics;
    const S = this.scene, P = this.physics;
    timed('spaceport', () => buildSpaceport(this.world.root, P, this.world));
    timed('townlife', () => buildTownLife(this.world.root, P, this.world));
    timed('containers', () => buildCitadelContainers(this.world.root, P, this.world));   // (before the dressing: it keeps clear of them)
    timed('citydress', () => buildCityDressing(this.world.root, P, this.world));
    this.env = new Environment(this.scene, this.terrain);
    this.shadowCull = new ShadowCull(this.env.sunDir, this.env.sun, this.scene); // (static shadow batches, view test: engine/shadowcull.js)
    this.renderer.setup(this.scene, this.camera);
    this.perf = new Perf(this.renderer.renderer); this.perf.game = this;
    // the graphics preset follows the GPU on a first start (integrated GPUs: Low or Medium, see perf.js); settings
    // saved before the presets were reworked (qv < 1) are re-picked too, unless they hold something other than the
    // old automatic choice (then the player chose it). A choice in Settings sticks (qPicked).
    {
      const saved = store.get(SET_KEY), gpu = this.perf.gpu || '';
      if (!saved?.quality || (!(saved.qv >= 1) && !saved.qPicked && saved.quality === oldGpuQuality(gpu))) this.settings.quality = gpuQuality(gpu);
      this.settings.qv = 1;
    }
    // Startup overlap: the Citadel's shaders are sent to the driver now, with the final lights, shadows and preset,
    // so the GPU process compiles them while the interiors and regions are built below (prepare() then waits for
    // whatever is left). The light pool's size is fixed per preset; lamps placed later join it (collect, below).
    this.lightPool = new LightPool(this.scene, POOL_SIZE[this.settings.quality] ?? 8);
    if (this.settings.visual !== '1997' && !/[?&]noearly/.test(location.search)) { // (?noearly: for A/B timing)
      this.renderer.setQuality(this.settings.quality); this.env.setShadowQuality(this.settings.quality);
      this.earlyCompile = this.renderer.precompile().catch(() => {});
    }
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
    this.regionContainers = timed('regioncontainers', () => buildRegionContainers(this.rooms, P));
    this.room = null;
    // the desktop build's number (stamped by desktop/copy-game.mjs from the CI run), so the player can tell which
    // download is installed; the web copy has none
    this.version = VERSION + (window.LBA_BUILD ? ` (build ${window.LBA_BUILD})` : '');
    { const v = document.querySelector('#ver'); if (v) v.textContent = 'v' + this.version; }
    this.bench = new Bench(this);
    this.audio = new AudioEngine();
    this.audio.setMood('title');
    this.env.onThunder = () => this.audio.play('thunder');
    this.input = new Input(this.renderer.canvas);
    this.camRig = new CameraRig(this.camera, this.terrain, this.physics);
    this.camRig.occ = () => (this.room ? null : this.world.occ);   // Citadel's scenery volumes for the play camera (Game.occluders)
    this.camRig.relative = () => this.settings.controls !== 'classic';   // (CAM-2: camera-relative controls: the free orbit never turns by itself)
    // (CONTROL-FEEL: the Follow view holds while he fights: a lock-on, a move, or enemies after him — the combat music's mix)
    this.camRig.busy = () => !!(this.targeting?.lock || this.hero?.combat?.busy || this.combat > 0.3);
    this.particles = new Particles(this.scene);
    this.world.particles = this.particles;
    this.pickups = new Pickups(this);
    this.cues = new ContainerCues(this.scene);   // (the glint on searchable containers: containers.js)
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
    // (PERF-2: actors of other areas are left out of the render; engine/drawcull.js)
    this.farCull = new FarCull(() => [this.npcs, this.enemies], this.camera, this.scene.fog);
    this.blobBatch = new BlobBatch(this.scene, BLOBS);
    this.renderer.pre = () => { this.farCull.hide(); this.blobBatch.hide(); };
    // (RENDER-INV: an area's static pieces drawn in one call per material and 48 m cell: engine/drawbatch.js)
    this.drawBatch = new DrawBatch();
    this.renderer.mid = () => { if (this.shadowCull.areas.has(this.room?.group || this.world.root)) this.drawBatch.update(this.room?.group || this.world.root); };
    this.renderer.post = () => { this.blobBatch.restore(); this.farCull.restore(); };
    this.lightPool.collect(); // (after every builder has placed its lamps)
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
    // (PERF-ARRIVAL: where the preparation's time goes, for the benchmark's startup line: waiting for the driver to
    //  finish the programs, texture uploads, Citadel's geometry upload, its shadow and draw batches, the shadow
    //  programs, the first frame)
    const prep = (this.loadTimes.prep = {}); let tp = t0;
    const lap = (k) => { const n = performance.now(); prep[k] = Math.round(n - tp); tp = n; };
    loadingStep('Preparing graphics…');
    loadBar(0.72);
    await nextPaint();
    loadBar(0.95, loadEst.shaders || 7000);
    const R = this.renderer.renderer;
    this.titleCamera(0);
    this.lightPool.update(this.camera.position);
    lap('paint');
    try { await this.renderer.precompile(); } catch (e) { console.warn('shader precompile', e); }
    this.warmMenus();
    lap('programs');
    // upload every texture now too, and draw the title's first view (shadow and post-processing passes)
    const tex = new Set();
    this.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap']) if (m[k]?.isTexture) tex.add(m[k]); });
    for (const t of tex) R.initTexture(t);
    lap('textures');
    this.uploadGeometry(this.world.root);   // (FRAME-1: Citadel's geometry too; each room/region at its first entry)
    lap('geometry');
    loadingStep('Almost there…');
    loadBar(0.97);
    await nextPaint();
    lap('paint2');
    this.titleCamera(0);
    this.lightPool.update(this.camera.position);
    this.shadowCull.update(this.world.root, this.camera, this.camera.position); // (the Citadel's shadow batches, built while loading)
    this.drawBatch.update(this.world.root);   // (and its draw batches, uploaded by the render below)
    lap('batches');
    if (!/[?&]nowarm/.test(location.search)) this.warmShadows(); // (?nowarm: for A/B timing)
    lap('shadowPrograms');
    this.renderer.render();
    lap('firstFrame');
    this.loadTimes.shaders = Math.round(performance.now() - t0);
    this.loadTimes.programs = R.info.programs.length;
    this.perf.load = this.loadTimes;
    this.preparing = false;
    this.last = performance.now();
    const boot = sessionStorage.getItem(BOOT_KEY);
    sessionStorage.removeItem(BOOT_KEY);
    loadBar(1, 150);
    try { localStorage.setItem(LOADT_KEY, JSON.stringify({ total: this.loadTimes.total, shaders: this.loadTimes.shaders })); } catch { /* (private mode) */ }
    $('#loading').classList.add('hidden');
    // the loading tune hands over to the game's music where the window may play sound unasked (the desktop app)
    if (window.loadMusicEnd?.(true)) this.audio.init();
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
  // FRAME-1: the fade is drawn frame by frame here, so the stylesheet's own 0.6 s opacity transition is off while it
  // runs (each write restarted that easing: at 60 fps the screen was only ~14 % dark when the room swapped, never
  // over ~25 %). The swap happens at exactly t = 0.35 (a frame that overshot it showed the swap, or the shader
  // hold's frame, through a part-transparent fade: BUG-WALL-T), so that frame and any hold after it are fully black.
  updateTransition(dt) {
    const T = this.trans;
    if (!T) return;
    const f = $('#fade');
    f.style.transition = 'none';
    if (T.hold) { f.style.opacity = 1; if (performance.now() - T.holdT > 4000) T.hold = false; return; }
    if (this._transBudget != null) { dt = Math.min(dt, this._transBudget); this._transBudget -= dt; }
    T.t += dt;
    if (T.t >= 0.35 && !T.called) { T.t = 0.35; T.called = true; T.mid(); this.warmScene(T); }
    const op = T.t < 0.35 ? T.t / 0.35 : Math.max(0, 1 - (T.t - 0.35) / 0.35);
    f.style.opacity = op; this._fadeOp = op;
    if (T.t >= 0.7) { this.trans = null; f.style.opacity = ''; f.style.transition = ''; }
  }
  // compile the new scene's shaders behind the black screen (not under the automated tests' fixed stepping)
  // PERF-2: once per scene and light/graphics state. The warm-up walks every mesh of the scene (~6 400) to work out
  // its program, ~70–130 ms of main-thread time on SwiftShader's CPU even when nothing is left to compile: on the
  // user's laptop the transition stalls (up to 200 ms) at every door. A state already warmed, with no program made
  // since (anything new compiled anywhere starts it over), needs nothing.
  warmScene(T) {
    const R = this.renderer.renderer;
    if (this.testFreeze || !R.compileAsync || this.state !== 'play') return;
    this.lightPool.update(this.hero.pos);
    const lights = {};
    this.scene.traverseVisible((o) => { if (o.isLight) { const k = o.type + (o.castShadow ? '+s' : ''); lights[k] = (lights[k] || 0) + 1; } });
    const key = [this.room?.id || 'citadel', this.settings.quality, this.settings.visual, R.shadowMap.enabled, R.shadowMap.type, JSON.stringify(lights)].join('|');
    const warmed = (this._warmed ??= new Map());
    // (FRAME-1: its geometry too, in this black frame, the shadow batches included: they are built on the area's
    // first update, which used to come later in this frame, so a house's 4.5 MB of batches went up on the first frame shown)
    const root = this.room?.group || this.world.root;
    if (!this.shadowCull.areas.has(root)) this.shadowCull.update(root, this.camera, this.hero.pos);
    if (!this.drawBatch.has(root)) this.drawBatch.update(root);   // (RENDER-INV: the area's draw batches, before the upload)
    this.uploadGeometry(root);
    if (warmed.get(key) === R.info.programs.length) return;
    T.hold = true; T.holdT = performance.now();
    this.renderer.precompile().catch(() => {}).finally(() => { warmed.set(key, R.info.programs.length); T.hold = false; });
  }
  // FRAME-1: every geometry under `root` (hidden parts too) and everything shown is sent to the GPU now, instead of on
  // the first frame that shows it. Left to that frame, the street at Medium uploaded 17 MB mid-play as the camera
  // first turned onto the harbour and the town, up to 4.4 MB in one frame. Called behind the loading screen (Citadel)
  // and in a scene change's black frame (each room/region once). three uploads an object's buffers while it builds
  // the frame's render list (before any draw), so: one render with nothing culled and the draw step itself switched
  // off (no draw call, no shader chosen or compiled, no texture bound; the shadow map is not redrawn). The lights keep
  // their state (nothing that was off is counted on), and everything is put back.
  uploadGeometry(root) {
    const R = this.renderer.renderer, C = this.renderer.composer, S = this.scene;
    const done = (this._uploaded ??= new WeakSet());
    if (!C || !root || done.has(root) || this.testFreeze) return 0;
    for (let p = root; p; p = p.parent) if (!p.visible) return 0;   // (not on show any more: next time)
    done.add(root);
    const t0 = performance.now(), g0 = R.info.memory.geometries, lit = new Set(), shown = [], off = [], culled = [];
    S.traverseVisible((o) => { if (o.isLight) lit.add(o); });
    root.traverse((o) => { if (!o.visible && !o.isLight) { o.visible = true; shown.push(o); } });
    S.traverseVisible((o) => {
      if (o.isLight) { if (!lit.has(o)) { o.visible = false; off.push(o); } return; }
      if (o.frustumCulled && (o.isMesh || o.isPoints || o.isLine || o.isSprite)) { o.frustumCulled = false; culled.push(o); }
    });
    const prevT = R.getRenderTarget(), au = R.shadowMap.autoUpdate, draw = R.renderBufferDirect;
    try { R.shadowMap.autoUpdate = false; R.renderBufferDirect = () => {}; R.setRenderTarget(C.renderTarget1); R.render(S, this.camera); }
    catch (e) { console.warn('geometry upload', e); }
    finally {
      R.renderBufferDirect = draw; R.setRenderTarget(prevT); R.shadowMap.autoUpdate = au;
      for (const o of culled) o.frustumCulled = true;
      for (const o of off) o.visible = true;
      for (const o of shown) o.visible = false;
    }
    (this.uploadLog ??= []).push({ root: this.room?.id || 'citadel', ms: Math.round(performance.now() - t0), newGeometries: R.info.memory.geometries - g0 });
    return R.info.memory.geometries - g0;
  }
  // The shadow pass's depth programs (one per kind of caster: side, texture/alpha test, instanced, batched, skinned)
  // are not compiled by precompile(); left alone they compile on the first frame that casts with each kind. Here a
  // tiny copy of every kind found in the scene (with its own material) is cast into a throwaway shadow map once
  // (PERF-ARRIVAL: also the casters the shadow culling has switched off or merged for now: engine/warmup.js).
  warmShadows() {
    const R = this.renderer.renderer, C = this.renderer.composer;
    if (!R.shadowMap.enabled || !C) return 0;
    const may = new Set();
    for (const A of this.shadowCull?.areas.values() ?? []) { for (const M of A.members) may.add(M.o); for (const M of A.solo) may.add(M.o); }
    return warmShadowPrograms(R, C.renderTarget2, this.scene, this.camera, this.env.sun.target.position, (o) => may.has(o));
  }
  // PERF-ARRIVAL: the behaviour menu's portraits (their own scene and lights, drawn straight to the screen) compiled
  // their programs the first time Ctrl was held in play
  warmMenus() {
    const R = this.renderer.renderer, B = this.behMenu;
    if (!B?.scene || !R.compile) return;
    const prev = R.getRenderTarget();
    try { R.setRenderTarget(null); R.compile(B.scene, B.cam); } catch (e) { console.warn('menu warm-up', e); } finally { R.setRenderTarget(prev); }
  }

  // what the current preset does, for the benchmark's report
  graphicsConfig() {
    const R = this.renderer, W = this.world;
    return { pr: R.pixelRatio(), msaa: R.composer?.renderTarget1?.samples ?? 0, fxaa: !!R.fxaa?.enabled, shadows: R.renderer.shadowMap.enabled, shadowMap: this.env?.sun?.shadow?.mapSize?.x ?? 0,
      bloom: !!R.bloom?.enabled, lamps: this.lightPool?.lights.length ?? 0, smallFar: W?.detail?.smallFar ?? '?', treeNear: W?.detail?.treeNear ?? '?' };
  }
  // after a graphics change (preset: lamp count, shadows): the new shader variants compile before the next frame
  // is drawn (the last frame stays on screen meanwhile, at most 4 s), instead of stalling the first frame
  // (PERF-ARRIVAL: under the automated tests' fixed stepping too, without the hold: the programs are made the same way,
  //  so a test measures the compiles a player would get; the post-processing passes and menus included)
  warmGraphics() {
    const R = this.renderer.renderer;
    if (this.preparing || !R.compileAsync || !this.lightPool) return;
    const hold = this.testFreeze ? null : (this.gfxHold = { t: performance.now() });
    this.warmShadows();
    warmPassPrograms(R, this.renderer.composer);
    this.warmMenus();
    this.lightPool.update(this.state === 'title' || this.state === 'loading' ? this.camera.position : this.hero.pos);
    this.renderer.precompile().catch(() => {}).finally(() => { if (hold && this.gfxHold === hold) this.gfxHold = null; });
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
      this.refillGivers();   // (CONTAINERS-2: a new visit, the containers here give again)
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
      this.occSnap = true;   // (Nell's roof takes its faded state at once on the first frame: Game.occluders)
      this.doorCool = 1;
      this.audio.setPlace?.('island');
      this.refillGivers();
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
    // never a position in the air (a jump, Baldino's hop-pack): outdoors, on Citadel or in an outdoor region, the
    // last safe spot on the ground instead (indoors he can't fly)
    const air = !h.onGround && (!this.room || this.room.outdoor) && this.lastSafe;
    return {
      v: SAVE_VERSION,
      room: this.room?.id || null,
      hero: { x: this.room && !air ? h.pos.x : this.lastSafe.x, z: this.room && !air ? h.pos.z : this.lastSafe.z, hp: Math.max(h.hp, 4), mp: h.mp, magicLevel: h.magicLevel, clovers: h.clovers, coins: h.coins, hasBall: h.hasBall, behaviour: h.behaviour, hasSword: h.hasSword, hasPulse: h.hasPulse, weapon: h.weapon, prevWeapon: h.prevWeapon, arms: freshArms(h.arms) },
      flags: this.flags, killed: this.killed, collected: this.collected, searched: this.searched, crates: this.brokenCrates,
      loot: this.lootSnapshot(),
    };
  }
  // CONTAINERS: what a searched container (a giver, a broken crate) let out and nobody has taken yet, where it lies
  // (an area: a room/region id or 'out' for Citadel). A bonus still in the air is saved where it is and falls from
  // there when the save is loaded.
  lootSnapshot() {
    const out = [];
    for (const p of this.pickups.list) {
      if (!p.loot) continue;
      const fly = !!p.fly || p.carried;
      out.push({ k: p.loot, t: p.type, v: p.value || 1, w: p.where, x: +p.pos.x.toFixed(2), y: +(fly ? p.pos.y : p.baseY).toFixed(2), z: +p.pos.z.toFixed(2), ...(fly ? { f: 1 } : {}) });
    }
    return out;
  }
  restoreLoot(list) {
    // (a load in the same page: Continue from the menus — the bonuses of before go, the save's come back)
    for (const p of [...this.pickups.list]) if (p.loot) { this.scene.remove(p.mesh); this.pickups.list.splice(this.pickups.list.indexOf(p), 1); }
    if (this.ball?.carry?.loot) this.ball.carry = null;
    const seen = new Set();
    for (const L of Array.isArray(list) ? list : []) {
      if (!L || typeof L.k !== 'string' || seen.has(L.k) || !PICK_TYPES.has(L.t) || ![L.x, L.y, L.z].every(Number.isFinite)) continue;
      seen.add(L.k);
      this.pickups.spawn(L.t, L.x, L.y, L.z, { loot: L.k, where: L.w, value: L.v || 1, life: Infinity, ...(L.f ? { fly: { vx: 0, vy: 0, vz: 0 } } : {}) });
    }
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
    for (const e of this.enemies) if (this.killed.includes(e.id)) koGone(e);
    for (const p of [...this.pickups.list]) if (p.id && this.collected.includes(p.id)) { this.scene.remove(p.mesh); this.pickups.list.splice(this.pickups.list.indexOf(p), 1); }
    this.brokenCrates.forEach((i) => { if (this.world.crates[i]) this.breakCrate(this.world.crates[i], true); });
    this.restoreLoot(s.loot);
    if (this.flags.target) this.hitTarget(true);
    this.story.applyFlags();
    const at = { x: s.hero.x, z: s.hero.z, a: 0 };
    this.resetCombat('drop'); // (a bonus on the ball from before the load is nobody's)
    if (s.room && this.rooms[s.room]) this.enterRoom(s.room, at, true);
    else if (s.room) this.exitRoom(this.lastSafe || at, true); // (a room this build doesn't have: back outdoors)
    else this.exitRoom(at, true);
    this.gadgets.jet?.afterLoad();   // (never in the air, the sea or inside something: jetpack.js)
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
    this._rebindOff?.(); // (a key press after leaving the controls screen never rebinds anything)
    document.querySelector('#chapter')?.classList.remove('show'); // (a chapter title never sits on top of a screen)
    $('#' + id).classList.remove('hidden');
    if (id === 'title') $('#btn-continue').disabled = !store.get(SAVE_KEY);
    this.screen = id;
    if (id === 'settings') { this.syncSettingsUI(); this.setTabTo(this.setTab || 'game'); }
    this.screenT = 0;
    this.menuSel = 0;
    this.focusMenu();
  }
  hideScreens() { document.querySelectorAll('.screen').forEach((e) => { if (e.id !== 'loading') e.classList.add('hidden'); }); this.screen = null; }
  // what the arrows / d-pad move between: the screen's menu buttons; on the controls screen the key buttons too;
  // on the settings screen the tab bar, the rows of the open page and Back (settingsItems)
  menuButtons() {
    if (!this.screen) return [];
    if (this.screen === 'settings') return this.settingsItems();
    const keys = this.screen === 'controls' ? '#rebind .keybtn, ' : '';
    return [...document.querySelectorAll(`#${this.screen} :is(${keys}.menu button):not(:disabled)`)];
  }
  focusMenu(scroll = false) {
    const btns = this.menuButtons();
    this.menuSel = Math.max(0, Math.min(this.menuSel, btns.length - 1));
    if (this.screen === 'settings') document.querySelectorAll('#settings .sel').forEach((e) => e.classList.remove('sel'));
    btns.forEach((b, i) => b.classList.toggle('sel', i === this.menuSel));
    if (scroll) btns[this.menuSel]?.scrollIntoView?.({ block: 'nearest' });
  }
  // a child menu (Settings, Controls) remembers where its parent's selection was; Back returns to it
  openChild(id) {
    if (!this.menuStack || !this.screen || this.screen === 'title' || this.screen === 'pause') this.menuStack = [];
    if (this.screen) this.menuStack.push({ id: this.screen, sel: this.menuSel });
    this.prevScreen = this.screen;
    this.showScreen(id);
    if (id === 'controls') this.buildRebind();
  }
  closeChild() {
    const top = this.menuStack?.pop();
    this.showScreen(top?.id || this.prevScreen || 'title');
    if (top) { this.menuSel = top.sel; this.focusMenu(true); }
  }

  // ---- settings screen (SETTINGS-UI): four pages, an Advanced fold on two of them
  settingsItems() {
    const S = $('#settings'), page = S.querySelector(`.set-page[data-page="${this.setTab || 'game'}"]`);
    const rows = [...page.querySelectorAll('.set-row, .set-fold')].filter((e) => e.offsetParent !== null);
    return [S.querySelector('.set-tabs'), ...rows, S.querySelector('.menu button')];
  }
  setTabTo(tab) {
    if (this.setTab !== tab) $('#settings .set-page.on')?.scrollTo?.(0, 0);
    this.setTab = tab;
    this.setAdv ??= {};
    document.querySelectorAll('#settings .set-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
    document.querySelectorAll('#settings .set-page').forEach((p) => {
      p.classList.toggle('on', p.dataset.page === tab);
      p.classList.toggle('adv-open', !!this.setAdv[p.dataset.page]);
      p.querySelector('.set-fold')?.setAttribute('aria-expanded', !!this.setAdv[p.dataset.page]);
    });
    if (this.screen === 'settings') this.focusMenu();
  }
  toggleAdvanced() {
    this.setAdv ??= {};
    this.setAdv[this.setTab] = !this.setAdv[this.setTab];
    this.setTabTo(this.setTab);
    // opened: the fold goes to the top of the list so the advanced rows show under it (it stays selected)
    if (this.setAdv[this.setTab]) $('#settings .set-page.on .set-fold')?.scrollIntoView?.({ block: 'start' });
  }
  // left / right change the selected row's value (a slider steps, and repeats while held), Enter / A on a row picks
  // the next value, the tab bar (or Tab, LB / RB) turns the page; true when it used the confirm press
  settingsNav(btns) {
    const i = this.input, it = btns[this.menuSel], now = performance.now();
    const pad = i.lastDevice === 'pad';
    let tab = 0;
    if (i.pressed('cycle')) tab = i.keys.has('ShiftLeft') || i.keys.has('ShiftRight') ? -1 : 1;
    if (pad && i.pressed('swap')) tab = -1;
    if (pad && i.pressed('focus')) tab = 1;
    let dir = i.pressed('right') ? 1 : i.pressed('left') ? -1 : 0;
    if (dir) this._setHeld = now;
    const slider = it?.querySelector?.('input[type=range]');
    const held = (i.down('right') ? 1 : 0) - (i.down('left') ? 1 : 0);
    if (!dir && slider && held && now - (this._setHeld || 0) > 380 && now - (this._setRep || 0) > 70) { dir = held; this._setRep = now; }
    const confirm = i.pressed('interact') || i.pressed('action') || i.pressed('recenter');
    if (it?.classList.contains('set-tabs')) { tab ||= dir; if (confirm && !tab) tab = 1; dir = 0; }
    if (tab) {
      const T = ['game', 'controls', 'display', 'sound'], k = (T.indexOf(this.setTab) + tab + T.length) % T.length;
      this.setTabTo(T[k]); this.audio.play('blip');
      return confirm;
    }
    const seg = it?.querySelector?.('.seg');
    if (seg && (dir || confirm)) {
      const opts = [...seg.querySelectorAll('button')], cur = opts.findIndex((b) => b.classList.contains('on'));
      const k = confirm ? (cur + 1) % opts.length : Math.max(0, Math.min(opts.length - 1, cur + dir));
      if (k !== cur) { opts[k].click(); this.audio.play('blip'); }
      return confirm;
    }
    if (slider && dir) {
      const v = Math.round(Math.max(0, Math.min(1, +slider.value + dir * 0.05)) * 20) / 20;
      if (v !== +slider.value) { slider.value = v; slider.dispatchEvent(new Event('input', { bubbles: true })); }
    }
    return confirm && !!slider;
  }
  syncRange(r) {
    const v = +r.value;
    r.style.setProperty('--v', `${v * 100}%`);
    const o = r.parentElement.querySelector('output'); if (o) o.textContent = `${Math.round(v * 100)}%`;
  }

  wireUI() {
    if (window.desktop) document.body.classList.add('desktop');
    document.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      this.audio.init();
      // (a menu button keeps no DOM focus: Enter on it would press it a second time through the browser)
      if (b.closest('.screen')) { b.blur(); const k = this.menuButtons().indexOf(b); if (k >= 0) this.menuSel = k; } // (a clicked entry is the selected one, also for Back's return)
      if (b.dataset.act) { this.audio.play('select'); this.act(b.dataset.act); }
      const seg = b.closest('.seg');
      if (seg && b.dataset.v) { this.settings[seg.dataset.setting] = b.dataset.v; if (seg.dataset.setting === 'quality') this.settings.qPicked = true; this.applySettings(); this.syncSettingsUI(); }
      if (b.dataset.tab) { this.setTabTo(b.dataset.tab); this.audio.play('blip'); }
      if (b.classList.contains('set-fold')) { this.toggleAdvanced(); this.audio.play('blip'); }
    });
    document.querySelectorAll('[data-range]').forEach((r) => {
      r.addEventListener('input', () => {
        this.settings[r.dataset.range] = +r.value; this.applySettings(); this.syncRange(r);
        // LBA2 plays a sound while its effects slider moves: a short one at the new level
        if (r.dataset.range === 'sfx' && performance.now() - (this._sfxPreview || 0) > 120) { this._sfxPreview = performance.now(); this.audio.play('select'); }
      });
      r.addEventListener('change', () => r.blur()); // (a slider keeps no focus: Esc and the arrows go back to the game)
    });
    // the mouse (or a touch) selects the row under it: one row highlighted, not one by the pointer and one by keys
    const pick = (e) => {
      if (this.screen !== 'settings' || (e.type === 'pointermove' && e.pointerType !== 'mouse')) return;
      const el = e.target.closest('.set-tabs, .set-row, .set-fold, .menu button'); if (!el) return;
      const k = this.settingsItems().indexOf(el);
      if (k >= 0 && k !== this.menuSel) { this.menuSel = k; this.focusMenu(); }
    };
    $('#settings').addEventListener('pointermove', pick);
    $('#settings').addEventListener('pointerdown', pick);
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
      // New Game over an existing save asks first (the user: one press used to wipe the progress); the old save
      // is kept aside as lba3_save_v1_before_new, so even a yes can be undone by hand
      case 'new': if (store.get(SAVE_KEY) && this.screen === 'title') { this.openChild('confirmnew'); break; } // falls through
      case 'newyes':
        if (store.get(SAVE_KEY)) store.set(SAVE_KEY + '_before_new', store.get(SAVE_KEY));
        if (this.dirty) this.reloadInto('new'); else this.startNew();
        break;
      case 'settings': case 'controls': this.openChild(a); break;
      case 'resetkeys': this.settings.keys = {}; this.applySettings(); this.buildRebind(); break;
      case 'back': this.closeChild(); break;
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
    const s = this.settings, L = (a) => keyLabel(keyFor(a));
    document.querySelectorAll('.seg').forEach((g) => g.querySelectorAll('button').forEach((b) => { const on = String(s[g.dataset.setting]) === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }));
    document.querySelectorAll('[data-range]').forEach((r) => { r.value = s[r.dataset.range]; this.syncRange(r); });
    // one line under a few rows, only where the choice isn't obvious (or depends on another setting)
    const hint = {
      controls: () => t('set_h_' + s.controls),
      camera: () => t('set_h_cam_' + s.camera, { l: L('camL'), r: L('camR') }),
      res: () => t('set_h_res_' + s.res),
      aa: () => t(s.quality === 'low' ? 'set_h_aa_low' : 'set_h_aa_' + s.aa),
      minimap: () => (s.hud === 'lba' ? t('set_h_mm_hud') : ''),
    };
    document.querySelectorAll('#settings [data-hint]').forEach((row) => { row.querySelector('.set-hint').textContent = hint[row.dataset.hint]?.() ?? ''; });
  }

  // key rebinding (controls screen): click an action, press the new key
  buildRebind() {
    const el = $('#rebind');
    if (!el) return;
    el.innerHTML = '';
    for (const a of REBINDABLE) {
      const lab = document.createElement('label'); lab.textContent = t('kb_' + a);
      const b = document.createElement('button'); b.className = 'keybtn'; b.textContent = b.dataset.key = keyLabel(keyFor(a));
      b.addEventListener('click', () => {
        // one key awaited at a time: a second click (on this or another action) replaces the first
        this._rebindOff?.(); el.querySelectorAll('.keybtn.wait').forEach((x) => { x.classList.remove('wait'); x.textContent = x.dataset.key; });
        b.textContent = t('rebind_press'); b.classList.add('wait');
        const sel = Math.max(0, this.menuButtons().indexOf(b));
        const on = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (e.repeat) return; // (Enter held from pressing the button is not the new key)
          this._rebindOff();
          if (e.code !== 'Escape') { this.settings.keys = { ...(this.settings.keys || {}), [a]: e.code }; this.applySettings(); }
          this.buildRebind(); this.menuSel = sel; this.focusMenu();
          this.input.clearEdges?.(); // (the key just taken doesn't also act on the menu)
        };
        this._rebindOff = () => { removeEventListener('keydown', on, true); this._rebindOff = null; };
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
    if (changed('quality')) {
      this.renderer.setQuality(s.quality); this.env?.setShadowQuality(s.quality); this.lightPool?.setSize(POOL_SIZE[s.quality] ?? 8);
      this.world?.setDetail?.(s.quality);
      if (this.shadowCull) this.shadowCull.quality = s.quality;
      if (was.quality) this.warmGraphics();
    }
    if (changed('res')) this.renderer.setAutoRes(s.res !== 'full');
    if (changed('aa')) this.renderer.setAA(s.aa);   // (RENDER-INV: Settings → Edges; Low always uses FXAA)
    // FRAME-1: frame-rate limit ('auto': the screen's own rate); the automatic resolution's budget follows it
    if (changed('fps')) { this.frameCapMs = s.fps === '30' ? 1000 / 30 : s.fps === '60' ? 1000 / 60 : 0; this.renderer.budgetMs = this.frameCapMs || 1000 / 60; this._due = 0; }
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
    // and people a little ahead of signs and searches when they are about as close, but only people in front of
    // him: someone standing just behind him does not take the prompt from the pump he faces at arm's length
    // (FIX-PUMP-N: Bram 0.9 m behind beat the pump 1.4 m ahead)
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle);
    const consider = (d, max, o) => {
      if (!(d < max)) return;
      const s = d + (o.kind === 'npc' && !o.behind ? -0.35 : 0);
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
      const d = Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z), a = aim(n.pos.x, n.pos.z);
      // (behind: in the half-plane at his back, not right on top of him)
      const o = { kind: 'npc', npc: n, label: n.def.id === 'pippa' ? 'p_shop' : 'p_talk', behind: d >= 0.5 && a < 0 };
      consider(dist(n.pos.x, n.pos.z), 2.6, o);
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
  // A giver is a spot by a bin, a cupboard, a barrel: Twinsen's hop there shakes out one bonus. Most are indoors, as
  // in the original. The bonus is the kind (of those the spot may give) Twinsen needs most, as LBA2's WhichBonus
  // decides; a bonus of n kashes is one coin worth n.
  // CONTAINERS-2 (the user, 2026-10-25: "they should refill every time"): as in LBA2 (DISKFUNC.CPP resets a giver's
  // taken flag whenever its scene is loaded) a giver gives once per visit. Its key ('giver:<area>:<id>') goes into
  // `searched` while Twinsen stays in the area and is dropped when he goes through a door, changes region or takes
  // a shuttle (enterRoom / exitRoom → refillGivers), so it gives again when he comes back; a timer alone never
  // refills it. A save keeps the keys of the area he is in (a load continues the visit); an older save's keys of
  // other areas are dropped when it loads. A giver that may give a clover or a key still gives once ever.
  givers() { return (this.room ? this.room.givers : this.world.givers) || []; }
  where() { return this.room?.id || 'out'; }   // (the area a bonus lies in: a room/region id, or Citadel)
  giverKey(gv) { return 'giver:' + this.where() + ':' + gv.id; }
  giverOnce(gv) { return !!gv && (!!gv.once || gv.kinds.includes('clover') || gv.kinds.includes('key')); }
  // (saves from before the givers kept the outdoor two as plain searches: same ids; only the stump's clover counts now)
  // (and a container with three of its bonuses still lying untaken gives no more until one is picked up: nothing times
  //  out here, unlike LBA2, so hearts left at full life would otherwise pile up visit after visit)
  giverTaken(gv) {
    const key = this.giverKey(gv);
    if (this.searched.includes(key) || (!this.room && this.giverOnce(gv) && this.searched.includes(gv.id))) return true;
    let lying = 0;
    for (const p of this.pickups.list) if (p.loot && (p.loot === key || p.loot.startsWith(key + '#')) && ++lying >= 3) return true;
    return false;
  }
  // a new visit to the area he is now in: every other area's refillable giver keys go
  refillGivers() {
    const here = 'giver:' + this.where() + ':';
    this.searched = this.searched.filter((k) => {
      if (typeof k !== 'string' || !k.startsWith('giver:') || k.startsWith(here)) return true;
      const i = k.indexOf(':', 6), area = k.slice(6, i), id = k.slice(i + 1);
      const list = area === 'out' ? this.world.givers : this.rooms[area]?.givers;
      return this.giverOnce(list?.find((g) => g.id === id));
    });
  }
  // the unsearched giver a hop here would search (in reach, about level with him), or null
  giverInReach() {
    const h = this.hero;
    for (const gv of this.givers()) {
      if (Math.hypot(h.pos.x - gv.x, h.pos.z - gv.z) > gv.r || Math.abs(h.pos.y - (gv.y ?? h.pos.y)) > 1.5 || this.giverTaken(gv)) continue;
      return gv;
    }
    return null;
  }
  // CONTAINERS: the bonus pops out toward Twinsen, lands and stays until he takes it (no 20 s timeout: the user's
  // rule), in the save as `loot` under the giver's key, so nothing is lost between the search and the taking (a save,
  // a load, a door, a death and Retry). Refilled, a container can leave a second bonus beside an untaken first one:
  // that one's loot key gets '#2', '#3'… (restoreLoot keeps one bonus per key).
  giverHop() {
    const gv = this.giverInReach();
    if (!gv) return false;
    const key = this.giverKey(gv);
    this.searched.push(key);
    let lk = key;
    for (let i = 2; this.pickups.list.some((p) => p.loot === lk) || this.ball?.carry?.loot === lk; i++) lk = key + '#' + i;
    const y = (gv.y ?? this.physics.groundAt(gv.x, gv.z, this.hero.pos.y + 1)) + (gv.top ?? 1);
    // (from: it leaves the container's own collider before walls count, or it would drop back inside it)
    this.giveBonus(gv.kinds, gv.n || 1, gv.x, y, gv.z, this.hero.pos, { loot: lk, from: { x: gv.x, z: gv.z, r: Math.max(0.3, gv.r - 1.0) } });
    return true;
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
  // (opts.loot: a container's bonus, kept until taken; any other bonus goes after LBA2's 20 s, keys and clovers excepted)
  giveBonus(kinds, n, x, y, z, to = null, opts = {}) {
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
    const life = opts.loot || type === 'clover' || type === 'key' ? Infinity : 20;
    return this.pickups.spawn(type, x, y, z, { fly: { vx, vy: to ? 3.15 : 3.35, vz }, value: type === 'coin' ? n : 1, life, where: this.where(), ...opts });
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
      // (the stones are seen and heard rising; the hint says how to climb them, with the player's keys)
      setTimeout(() => this.hud.toast('hint_jump', { b: this.hud.key('b2'), k: this.hud.key('action') }), 1200);
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
    this.giveBonus(['money', 'life', 'magic'], 2, c.x, c.y + 0.4, c.z, null, { loot: 'crate:' + i });
  }

  alertGroup(group, pos, chance = 1) {
    for (const e of this.enemies) if (e.group === group && e.alive && Math.random() < chance) e.alert(pos);
  }

  onEnemyKilled(e) {
    this.killed.push(e.id);
    // (an enemy with a knock-out, src/game/death.js, lets its bonus out of the body when it hits the ground)
    if (!e.ko) this.giveBonus(['money', 'life', 'magic'], 1, e.pos.x, e.pos.y + 0.8, e.pos.z);
    this.save(false);
  }
  // LBA's GiveExtraBonus for a beaten enemy: one bonus out of its body, in an arc toward Twinsen, onto the ground
  enemyBonus(e, x, y, z) { return this.giveBonus(['money', 'life', 'magic'], 1, x, y, z, this.hero.pos); }

  // A heart is not taken while his life is full, nor a flask while his magic is (LBA2 does the same: EXTRA.CPP leaves
  // it and it hops off); it stays on the ground for later. Coins, keys, clovers and the rest are always taken.
  canTake(p) {
    const h = this.hero;
    if (p.type === 'heart') return h.hp < h.maxHp;
    if (p.type === 'flask') return h.mp < h.mpMax - 0.01;
    return true;
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
      case 'clover': h.clovers = Math.min(9, h.clovers + 1); this.audio.play('heal'); break;   // (the ♣ and the counter say it)
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
      if (this.saveTimer <= 0) { this.save(false); this.saveTimer = 20; }   // (silent, as LBA2's own saves)
    }
    // (the cliffs' 'hint' zone says nothing: Mira's saying and the target itself are the clue, the journal keeps a nudge: HINTS-LESS)
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
    // the display's refresh interval (ms, smoothed), from the rAF timestamps
    const d = now - (this._rafT ?? now); this._rafT = now;
    if (d > 0) this._vsync = this._vsync ? this._vsync + (Math.min(50, d) - this._vsync) * 0.1 : Math.min(50, d);
    // FRAME-1: frame-rate limit (Settings; off by default, off while benchmarking). A refresh before the next frame
    // is due is skipped: nothing is simulated or drawn, the last frame stays on screen, and keys tapped meanwhile
    // wait in Input for the next frame. Due times step by the limit (a frame late by more than one interval
    // starts the count again), so at 30 on a 60 Hz screen every other refresh is drawn: an even 33 ms.
    const cap = this.benching ? 0 : this.frameCapMs;
    if (cap && !this.testFreeze && !this.preparing) {
      if (now < (this._due || 0) - (this._vsync || 16.7) / 2) { requestAnimationFrame((t2) => this.loop(t2)); return; }
      this._due = now - (this._due || 0) > cap ? now + cap : this._due + cap;
    }
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
    // (RENDER-INV: `_inner`: a catch-up step before the drawn one; what only serves the picture runs on the drawn one)
    try { for (let i = 0; i < n; i++) { this._inner = i < n - 1; this.frame(sub, i === n - 1); } } finally { this._inner = false; }
    const ms = performance.now() - t0;
    // (FRAME-1: `black`: this interval was spent with a fully black screen on show (a scene change's fade or shader
    // hold), so a long one is a pause behind the fade, not a hitch in view)
    const black = !!this._shownBlack;
    this._shownBlack = !!this.trans && (this.trans.hold || this._fadeOp >= 0.999);
    let lamps = 0; for (const l of this.lightPool.lights) if (l.intensity > 0) lamps++;
    this.perf.record({ real, ms: real * 1000, steps: n, lost: real - dt, sim: ms - this._renderMs, render: this._renderMs, black, lamps });
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
        for (const e of this.enemies) if (e.ko && !e.ko.done) e.ko.update(dt);   // (a fall in progress lands; nothing else moves)
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
        if (this.hud.holomapUpdate(input, dt)) { this.hud.closeHolomap(); this.setState('play'); }
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
    // (RENDER-INV: detail levels and the lamps' lights serve the picture only: once per displayed frame, not per catch-up step)
    if (this._inner) { /* (the drawn step does it) */ } else if (!this.room) this.world.updateLod?.(this.state === 'title' || this.state === 'loading' ? this.camera.position : focus);
    else if (this.room.outdoor) updateKitLod(this.hero.pos);
    this.world._hero = this.hero; this.world._cam = this.camera;
    this.world.update(dt, this.time);
    if (this.room) for (const u of this.room.updaters) u(dt, this.time);
    if (!this._inner) this.lightPool.update(this.state === 'title' || this.state === 'loading' ? this.camera.position : focus);
    if (render) this.shadowCull.update(this.room?.group || this.world.root, this.camera, focus);
    this.particles.update(dt);
    if (this.state !== 'title') this.pickups.update(this.state === 'play' ? dt : 0, this.state === 'dialog' ? dt : 0);
    this.cues.update(dt, this, this.state === 'play' && !this.trans);
    if (this.state !== 'play') this.behMenu.show(false);
    this.hud.updateFloats(dt, this.camera);
    if (this.state !== 'dialog') this.bubble.visible = false;
    if (render && !this.trans?.hold && !(this.gfxHold && performance.now() - this.gfxHold.t < 4000)) {
      const t0 = performance.now();
      this.renderer.render();
      this.behMenu.render(this.renderer.renderer, dt);
      this._renderMs = performance.now() - t0;
    }
  }

  menuNav() {
    const btns = this.menuButtons();
    if (!btns.length || this._rebindOff) return; // (while a key is awaited, the keys belong to the rebinding)
    const i = this.input;
    // a pad's B goes back from a child menu (Esc keeps its meaning: in the pause menus it resumes)
    if (i.lastDevice === 'pad' && i.pressed('dodge') && (this.screen === 'settings' || this.screen === 'controls')) { this.audio.play('select'); this.act('back'); return; }
    if (this.screen === 'settings' && this.settingsNav(btns)) return;
    if (i.pressed('down')) { this.menuSel = (this.menuSel + 1) % btns.length; this.focusMenu(true); this.audio.play('blip'); }
    if (i.pressed('up')) { this.menuSel = (this.menuSel + btns.length - 1) % btns.length; this.focusMenu(true); this.audio.play('blip'); }
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
    if (input.pressed('map') && h.hasBall) { this.setState('map'); this.hud.openHolomap(); return; }
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
    // (nothing else in reach and an unsearched container by him: the verb, no more — CONTAINERS)
    this.hud.prompt(it ? t(it.label) : h.onGround && this.giverInReach() ? t('p_rummage') : null);
    this.hud.stats(h);
    // (where he is and the doors he used, for the maps; the region's map drawn a slice further; the minimap when shown.
    //  RENDER-INV: once per displayed frame: a slow frame's catch-up steps each drew another slice of the map)
    if (!this._inner) this.hud.mapTick();
    this.camRig.update(dt, h.pos, h.angle, h.speed > 0.5, input);
    this.occluders(dt);
  }

  // Scenery between the camera and Twinsen (VP-10). As in LBA2 nothing on Citadel fades or turns see-through: the
  // houses, the fortress, the project buildings, the spaceport terminal and Nell's lean-to give the camera their
  // shapes (W.occ, src/engine/occlude.js) and each new shot rises over whatever would hide him (camRig.occ, set
  // above; src/engine/camera.js). What is left here is townlife.js's own fade of Nell's roof while he stands under it
  // or the coupler is on the bench (fadeOccluders). It runs wherever the game camera follows him outdoors on Citadel —
  // play, dialogue, the shop, cut-scenes and through a door's fade — and on the first frame of a scene (occSnap, set
  // by exitRoom) it takes its final state at once.
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
// the loading screen's bar (#27): real steps, and across the long synchronous builds an estimated pace (this
// computer's previous start) animated on the compositor, so it keeps moving while the main thread builds
const LOADT_KEY = 'lba3.loadTimes';
const loadEst = (() => { try { return JSON.parse(localStorage.getItem(LOADT_KEY)) || {}; } catch { return {}; } })();
const loadBar = (to, ms = 300) => {
  const f = document.querySelector('#load-fill'); if (!f) return;
  f.style.transition = `transform ${ms}ms ${ms > 600 ? 'cubic-bezier(.25,.6,.45,1)' : 'ease-out'}`;
  f.style.transform = `scaleX(${to})`;
};
// MEA Studio's logo plays first (2.6 s) while the assets download; the automated tests skip it
const SPLASH_MS = (navigator.webdriver && !/[?&]splash/.test(location.search)) || /[?&]nosplash/.test(location.search) ? 0 : 2600;
const splashDone = new Promise((r) => setTimeout(() => { document.querySelector('#loading')?.classList.add('art'); r(); }, SPLASH_MS));
// the logo's sound (the user: "the opening screen has no sound effects"), synthesized and timed to the CSS: a
// rising pluck per letter stroke (0, .3, .6 s), a drop per drip (.9, 1.25, 1.5 s), a soft chord as STUDIO opens
// (1.3 s) under the shine's sweep (1.2 s). The desktop build may play sound without a click; a browser may not
const meaSting = () => {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  let ctx; try { ctx = new AC(); } catch { return; }
  const s = store.get(SET_KEY) || {}, out = ctx.createGain();
  out.gain.value = 0.8 * (s.sfx ?? 0.8); out.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.05;
  const tone = (type, f, at, att, len, peak, f2) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0 + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + len * 0.6);
    g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(peak, t0 + at + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
    o.connect(g).connect(out); o.start(t0 + at); o.stop(t0 + at + len + 0.05);
  };
  [523.25, 659.25, 783.99].forEach((f, i) => { tone('triangle', f, i * 0.3, 0.01, 0.7, 0.22); tone('sine', f * 2, i * 0.3, 0.01, 0.4, 0.06); });
  [0.9, 1.25, 1.5].forEach((at, i) => tone('sine', 1400 - i * 180, at, 0.005, 0.22, 0.14, 420 - i * 40));
  [261.63, 329.63, 392, 493.88].forEach((f) => { tone('sine', f, 1.3, 0.45, 2.2, 0.07); tone('triangle', f * 2, 1.3, 0.6, 1.8, 0.015); });
  const n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const bp = ctx.createBiquadFilter(), ng = ctx.createGain();
  bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(1500, t0 + 1.2); bp.frequency.exponentialRampToValueAtTime(7000, t0 + 2.4);
  ng.gain.setValueAtTime(0.0001, t0 + 1.2); ng.gain.exponentialRampToValueAtTime(0.05, t0 + 1.7); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
  n.buffer = buf; n.connect(bp).connect(ng).connect(out); n.start(t0 + 1.2); n.stop(t0 + 2.6);
  // then a small loading tune (the user: "the opening screen isn't accompanied by a little music"): a slow
  // C – Am – F – G pad with a soft plucked arpeggio over it. All of it is scheduled at once (60 s), because the
  // island's build blocks the main thread; the title's own music takes over (loadMusicEnd) and this fades out
  const bed = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1800; bed.gain.value = 0.0001; bed.connect(lp).connect(out);
  bed.gain.setValueAtTime(0.0001, t0 + 2.2); bed.gain.exponentialRampToValueAtTime(1, t0 + 4.5);
  const chords = [[261.63, 329.63, 392, 493.88], [220, 261.63, 329.63, 392], [174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 392]];
  const note = (type, f, at, att, len, peak) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + att); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(bed); o.start(at); o.stop(at + len + 0.05);
  };
  for (let bar = 0, at = t0 + 2.4; at < t0 + 62; bar++, at += 3.2) {
    const c = chords[bar % 4];
    c.forEach((f) => note('sine', f / 2, at, 1.2, 4.2, 0.045));
    [0, 1, 2, 3, 2, 1].forEach((k, j) => note('triangle', c[k] * 2, at + j * 0.53, 0.01, 1.1, 0.03));
  }
  let ended = false;
  const end = (handOver) => {
    if (ended) return; ended = true;
    const now = ctx.currentTime;
    bed.gain.cancelScheduledValues(now); bed.gain.setValueAtTime(Math.max(0.0001, bed.gain.value), now); bed.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    setTimeout(() => ctx.close().catch(() => {}), 2000);
    return handOver && ctx.state === 'running'; // (true: this window may play sound without a click)
  };
  window.loadMusicEnd = end;
  setTimeout(() => end(false), 64000);
};
if (SPLASH_MS) meaSting();
loadBar(0.08);
// resolves after the browser has painted (so a loading message shows before a long synchronous step)
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Load the pre-sculpted geometry (tools/bake.mjs) before building the world; anything
// missing or changed since the bake is sculpted at load as before.
const noBake = new URLSearchParams(location.search).has('nobake');
Promise.all([noBake ? Promise.resolve(false) : loadBake(window.LBA_BAKE_URL || 'assets/bake.bin').catch(() => false), preloadCharacters(), preloadLba1Rooms(), preloadIslands()]).then(() => { loadBar(0.22); return splashDone; }).then(async () => { if (SPLASH_MS) await new Promise((r) => setTimeout(r, 1200)); loadingStep('Building the island…'); loadBar(0.25); await nextPaint(); loadBar(0.7, loadEst.total || 12000); await nextPaint(); window.game = new Game(); });

// the mouse pointer (the user: "a mouse appears in the game and doesn't go away"): hidden while playing with the
// keys or a pad, or after it rests 2.5 s; any mouse move brings it straight back (menus, aiming the ball)
{
  let idle = 0;
  const hide = () => document.body.classList.add('no-cursor');
  const show = () => { document.body.classList.remove('no-cursor'); clearTimeout(idle); idle = setTimeout(hide, 2500); };
  addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) show(); }, { passive: true });
  addEventListener('keydown', hide, true);
  addEventListener('gamepadconnected', hide);
  idle = setTimeout(hide, 2500);
}
