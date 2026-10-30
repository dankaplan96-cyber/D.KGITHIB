// LBA3 – The Awakening (fan project): game orchestration.
// Generic glue lives here (states, rooms, saves, UI, combat hooks);
// the story itself is in src/game/prologue.js.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { loadBake } from './engine/sculpt.js';
import { preloadCharacters } from './game/characters.js';
import { Environment } from './engine/environment.js';
import { AudioEngine } from './engine/audio.js';
import { driveMouth } from './engine/voice.js';
import { Perf, gpuQuality, oldGpuQuality, integratedGpu } from './engine/perf.js';
import { Bench } from './engine/bench.js';
import { FitWatch } from './engine/autofit.js';
import { AutoApply } from './engine/autoapply.js';
import { FarCull, BlobBatch, BoxCull } from './engine/drawcull.js';
import { BLOBS } from './engine/rig.js';
import { LightPool, poolSize, BATTERY_LAMPS } from './engine/lightpool.js';
import { ShadowCull, cellFor } from './engine/shadowcull.js';
import { DrawBatch } from './engine/drawbatch.js';
import { TEXARRAY } from './engine/texarray.js';
import { warmShadowPrograms, warmPassPrograms } from './engine/warmup.js';
import { Input, applyBindings, setKeyScheme, keyFor, keyLabel, REBINDABLE } from './engine/input.js';
import { CameraRig } from './engine/camera.js';
import { lerp, angleDiff, dampAngle } from './engine/math.js';
import { buildWorldSteps, POI, QUAY } from './game/world.js';
import { streetDist } from './game/town.js';
import { buildWizardTent } from './game/wizards.js';
import { buildLba1Door } from './game/lba1places.js';
import { preloadLba1Rooms } from './game/lba1room.js';
import { preloadIslands } from './game/zislands.js';
import { buildSpaceport } from './game/spaceport.js';
import { buildTownLife } from './game/townlife.js';
import { Resident } from './game/walkers.js';
import { buildCityDressing } from './game/citydress.js';
import { buildCitadelContainers, buildRegionContainers, ContainerCues } from './game/containers.js';
import { enterArena } from './game/arena.js';
import { Regions, CITADEL_REF, CHAPTER_AREAS } from './game/regions.js';
import { travelRegion } from './game/travel.js';
import { updateKitLod, enableBatching, LOD_BATCHES, KIT_LOD } from './game/kit.js';
import { ShadowCache } from './engine/shadowcache.js';
import { Power } from './engine/power.js';
import { Hero, NPC, MagicBall, Bolts, Pickups, Particles, BEHAVIOURS, HERO_LOOK, PICK_TYPES } from './game/actors.js';
import { Targeting, CombatDirector, WEAPONS } from './game/combat.js';
import { Weapons, freshArms } from './game/weapons.js';
import { Gadgets } from './game/gadgets.js';
import { createEnemy, Drone } from './game/enemies.js';
import { koGone } from './game/death.js';
import { BehaviourMenu } from './game/behmenu.js';
import { HUD } from './game/hud.js';
import { Inventory } from './game/inventory.js';
import { Story, ORDER, OLD_ORDER, NUMBER as CH_NUMBER } from './game/story/index.js';
import { t, setLang, getLang } from './game/i18n.js';
import { roomName } from './game/mapdraw.js';

const SAVE_KEY = 'lba3_save_v1'; // (storage key kept stable; the format version lives inside the save)
const SAVE_VERSION = 5;
// SAVE-SLOTS: the autosave keeps SAVE_KEY (slot 0: an old single save shows as the Autosave); six manual slots of
// their own. Every save is the same snapshot() plus `at` (when, ms since 1970), `played` (seconds of play, when the
// game has counted them from a new game) and, in a manual slot, `thumb`: a small JPEG of the picture as the pause
// menu opened (at most THUMB_MAX characters; none when the main thread's part of taking it went over THUMB_MS).
export const SLOT_COUNT = 6;
export const slotKey = (n) => (n ? 'lba3_slot_' + n : SAVE_KEY);
const THUMB_W = 160, THUMB_H = 90, THUMB_MAX = 15000, THUMB_MS = 50;
// (the slot picture's encoder, run as a worker from this text: the read-back of the frame waits for the GPU there,
//  not on the main thread; a lower quality when the picture would be over the limit)
const THUMB_WORKER = `onmessage = async (e) => {
  const { bmp, max, token } = e.data;
  try {
    const c = new OffscreenCanvas(bmp.width, bmp.height); c.getContext('2d').drawImage(bmp, 0, 0); bmp.close();
    let url = null;
    for (const quality of [0.6, 0.35]) { const b = await c.convertToBlob({ type: 'image/jpeg', quality }); url = new FileReaderSync().readAsDataURL(b); if (url.length <= max) break; }
    postMessage({ url, token });
  } catch (err) { postMessage({ url: null, token }); }
};`;
const SLOT_SCREENS = new Set(['savegame', 'loadgame', 'slotconfirm']);
// the states that count as play time (not the title, the pause menus, game over or the ending screen)
const PLAYED = new Set(['play', 'dialog', 'shop', 'inventory', 'map', 'cutscene', 'cinematic', 'cinematicEnd']);
// an enemy in one of these states, near him, is a fight in progress: no manual save then
const FIGHT = new Set(['chase', 'windup', 'lunge', 'recover', 'alerted', 'stunned', 'hurt', 'strike', 'stagger', 'slam', 'bash', 'aim', 'warn']);
export const VERSION = '0.40.1'; // (the desktop build's version: desktop/package.json)
const TALK_ABOVE = 1.8;   // no Talk prompt for someone more than this far below Twinsen (he is on a roof or a ledge)
// Bring an older save up to the current format. Returns null when the data can't be a save.
// v1 → v2: lists that early saves could lack are filled in; v2 → v3: the chapter's key is stored; v3 → v4: the hero
// carries his weapons and gadgets (hero.arms, weapons.js; an older save carries none); v4 → v5: the final chapter is two
// (The Shell, The Core): a save in the core's part of the old one goes to The Core, and the stored position follows ORDER.
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
  if (v < 5) {
    // v4 → v5: chapter 11 was 'The Shell' to the end. The core's scenes (Vesk's talk, the guardian, the pylons, the coil)
    // are now chapter 12, 'The Core'; a save in the core room or with the fight begun goes there, the rest stay in The Shell.
    // (flags.chapter, the position, is redone: 'home' moved one place on; the key is what a load reads.)
    const f = s.flags && typeof s.flags === 'object' ? s.flags : (s.flags = {});
    if (f.chapterKey === 'shell' && (s.room === 'c3core' || f.c3_fight || f.c3_overload || f.c3_turned)) f.chapterKey = 'core';
    const i = ORDER.indexOf(f.chapterKey);
    if (i >= 0) f.chapter = i;
    v = 5;
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
  // a write that says how it went: 'ok', 'quota' (the storage is full; the old value is kept) or 'fail'
  put(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return 'ok'; }
    catch (e) { return e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014 ? 'quota' : 'fail'; }
  },
};
// what a slot holds, for the menus: null when empty; `s` is the save brought to the current format (null: unreadable)
function slotInfo(n) {
  const raw = store.get(slotKey(n));
  if (!raw) return null;
  let s = null; try { s = migrateSave(raw); } catch { s = null; }
  return { n, raw, s, at: Number.isFinite(raw.at) ? raw.at : 0 };
}
const REGION_KEY = { desert: 'map_desert', hamalayi: 'map_hamalayi', zeelich: 'isle_zeelich' };
// the name of where a save stands: Citadel outdoors, an outdoor region, an island, or the room he is in
function placeName(room) {
  if (!room) return t('map_citadel');
  if (REGION_KEY[room]) return t(REGION_KEY[room]);
  const isle = 'isle_' + room, s = t(isle);
  return s !== isle ? s : roomName(room);
}
const playedText = (sec) => { const m = Math.max(1, Math.floor(sec / 60)), h = Math.floor(m / 60); return h ? `${h}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };

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
    this.settings = { lang: 'en', controls: 'classic', camera: 'lba', camDist: 'far', hud: 'lba', visual: '2026', quality: 'high', res: 'auto', fps: 'auto', aa: 'msaa', music: 0.55, sfx: 0.8, voice: 0.8, textSpeed: 'normal', textSize: 'normal', shake: 'on', difficulty: 'normal', aimAssist: 'normal', lockMode: 'toggle', minimap: 'north', ...store.get(SET_KEY) };
    if (!['lba', 'follow', 'free'].includes(this.settings.camera)) this.settings.camera = 'lba';
    if (!['near', 'medium', 'far'].includes(this.settings.camDist)) this.settings.camDist = 'far';
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
    // PERF-BATTERY: on battery, the battery profile within the preset (engine/power.js, renderer.js setBattery); known
    // before the first shader is compiled in the desktop app
    this.power = new Power((on) => this.setBattery(on));
    this.renderer.battery = this.power.onBattery === true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2500);
    this.loadTimes = {};
    this.preparing = true;
    this.ready = this.boot().catch((e) => { console.error('startup failed', e); loadingStep('The game could not start: ' + (e?.message || e)); throw e; });
  }

  // LAZY-REGIONS: startup builds Citadel (the title's backdrop), Twinsen's house and the well (a new game's opening)
  // and the area the autosave stands in, in steps with a paint between them, so the loading bar moves with a real
  // label (src/game/regions.js; every other area is built the first time it is needed, behind a scene change's black).
  async boot() {
    // startup cost per step (ms), for profiling: game.loadTimes
    const tm = performance.now(), L = this.loadTimes;
    const timed = (name, fn) => {
      const t0 = performance.now(), n0 = this.scene.children.length, w0 = this.world?.root.children.length ?? 0, r = fn();
      L[name] = (L[name] || 0) + Math.round(performance.now() - t0);
      // (diagnostics: tag what each builder added, for tests/drawcalls.mjs)
      for (const [root, from] of [[this.scene, n0], [this.world?.root, w0]]) if (root) for (let i = from; i < root.children.length; i++) root.children[i].userData.src ??= name;
      return r;
    };
    // the bar: 0.25 → 0.70 across the build, each step animated (on the compositor) over its estimated time at this
    // computer's pace (measured on the steps so far), so it keeps moving while a step blocks the main thread
    const areas = this.bootAreas();
    const bar = new BootBar(0.25, 0.7, BUILD_REF.total + (areas[0] === '*' ? 10000 : areas.length * 300));
    enableBatching(this.renderer.renderer); // (vegetation in one draw call where WEBGL_multi_draw is there: kit.js)
    {
      const it = buildWorldSteps(this.scene);
      let r = null;
      L.worldSteps = {};
      for (let i = 0; ; i++) {
        const ref = BUILD_REF.world[i] ?? 150;
        await bar.step('Building Citadel…', ref);
        const t0 = performance.now();
        r = timed('world', () => it.next());
        const ms = Math.round(performance.now() - t0), k = r.done ? 'end' : r.value;
        L.worldSteps[k] = (L.worldSteps[k] || 0) + ms;
        bar.measured(ref, ms);
        if (r.done) break;
      }
      this.world = r.value;
    }
    this.terrain = this.world.terrain;
    this.physics = this.world.physics;
    const S = this.scene, P = this.physics;
    await bar.step('Building Citadel…', BUILD_REF.town);
    {
      const t0 = performance.now();
      timed('spaceport', () => buildSpaceport(this.world.root, P, this.world));
      timed('townlife', () => buildTownLife(this.world.root, P, this.world));
      timed('containers', () => buildCitadelContainers(this.world.root, P, this.world));   // (before the dressing: it keeps clear of them)
      timed('citydress', () => buildCityDressing(this.world.root, P, this.world));
      // (the wizard's tent and the asylum's block-house stand on Citadel; their rooms are built when needed)
      timed('wizards', () => buildWizardTent(S, P, this.world));
      timed('lba1', () => buildLba1Door(S, P));
      bar.measured(BUILD_REF.town, performance.now() - t0);
    }
    L.citadel = Math.round(performance.now() - tm);
    this.env = new Environment(this.scene, this.terrain);
    this.shadowCull = new ShadowCull(this.env.sunDir, this.env.sun, this.scene); // (static shadow batches, view test: engine/shadowcull.js)
    this.shadowCull.shadowsOn = () => this.renderer.renderer.shadowMap.enabled;   // (PERF-CPU: no caster tests without the shadow pass)
    this.syncShadowCells();   // (PERF-HIGH: the cell size for the preset; before any area is built)
    this.renderer.setup(this.scene, this.camera);
    this.perf = new Perf(this.renderer.renderer); this.perf.game = this;
    // (PERF-BATTERY: the static casters drawn into a cached shadow map only when needed: engine/shadowcache.js)
    this.shadowCache = new ShadowCache(this.renderer.renderer, this.env.sun, () => this.shadowCull.area, () => LOD_BATCHES.map((b) => b.mesh));
    // (PERF-BATTERY-2: still instanced casters join the cache, but not the vegetation tiles that switch detail with distance)
    this.shadowCache.quiet = (o) => { for (const L of [this.world.lodTiles || [], KIT_LOD.tiles]) for (const T of L) if (T.hi === o || T.lo === o) return false; return true; };
    this.renderer.setIntegrated(integratedGpu(this.perf.gpu || ''));   // (AUTO-FIT: the presets' pixel ratio on a high-density screen)
    // AUTO-QUALITY (I-13): Quality is Auto (engine/autoapply.js) for a new player and for everyone whose stored preset
    // was never chosen by hand: the one the game picked from the GPU's name (perf.js gpuQuality; before 0.30 the old
    // rule, oldGpuQuality). A preset picked in Settings (qPicked, from 0.30) — or one that is neither of the automatic
    // picks (chosen before qPicked was recorded) — stays, as chosen by hand.
    {
      const saved = store.get(SET_KEY), gpu = this.perf.gpu || '';
      if (!(saved?.qv >= 2)) {
        const hand = !!saved?.qPicked || (!!saved?.quality && saved.quality !== gpuQuality(gpu) && saved.quality !== oldGpuQuality(gpu));
        this.settings.qualityAuto = !hand; this.settings.qualityChosenByHand = hand;
        if (!saved?.quality) this.settings.quality = gpuQuality(gpu);
        this.settings.qv = 2;
      }
      // (the user, 28.10: "the game detects the machine and sets quality itself, without manual changes": one time,
      // everyone moves to Auto, a hand-picked preset included; a preset picked in Settings from now on stays)
      if (!(this.settings.qv >= 3)) { this.settings.qualityAuto = true; this.settings.qualityChosenByHand = false; this.settings.qv = 3; }
      this.autoQ = new AutoApply(this);
      if (this.settings.qualityAuto) this.settings.quality = this.autoQ.tier();
    }
    // Startup overlap: the Citadel's shaders are sent to the driver now, with the final lights, shadows and preset,
    // so the GPU process compiles them while the rest is built below (prepare() then waits for whatever is left).
    // The light pool's size is fixed per preset; lamps placed later join it (collect, below and on each area's build).
    this.lightPool = new LightPool(this.scene, this.lampCount());
    this.lightPool.setFade(this.lampFade());   // (PERF-BATTERY-2: on battery, the nearest lamps, faded)
    if (this.settings.visual !== '1997' && !/[?&]noearly/.test(location.search)) { // (?noearly: for A/B timing)
      if (this.autoQ.on()) this.autoQ.applyAll();
      else { this.renderer.setQuality(this.settings.quality); this.env.setShadowQuality(this.settings.quality); }
      this.earlyCompile = this.renderer.precompile().catch(() => {});
    }
    // the areas (src/game/regions.js): this computer's pace on Citadel sets the loading card's estimates
    this.regions = new Regions(S, P, (gid, rooms, why) => this.regionBuilt(gid, rooms, why));
    this.regions.afterBuilt = (gid, rooms) => this.regionReady(gid, rooms);
    this.regions.speed = Math.min(30, Math.max(0.2, L.citadel / CITADEL_REF));
    this.rooms = this.regions.rooms;
    for (const id of areas[0] === '*' ? [...this.regions.groups.values()].map((G) => G.rooms[0]) : areas) {
      const gid = this.regions.groupOf(id);
      if (!gid || this.regions.stateOf(id) !== 'unloaded') continue;
      const ref = this.regions.groups.get(gid).ref;
      await bar.step(`Building ${inText(id)}…`, ref);
      const t0 = performance.now();
      try { this.regions.buildGroup(gid, 'startup'); } catch (e) { console.warn('startup area', id, e); }
      L[gid] = Math.round(performance.now() - t0);
      bar.measured(ref, L[gid]);
    }
    this.room = null;
    await bar.step('Preparing the story…', BUILD_REF.story);
    const ts = performance.now();
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
    // (CAM-FOLLOW: with a lock-on the Follow camera stands behind his shoulder on the line from the target, framing both)
    this.camRig.lockOn = () => { const e = this.targeting?.lock; return e && e.alive !== false && e.present !== false && e.pos ? e.pos : null; };
    // (CAM-CLEAR-2: a dialogue outdoors under Follow frames him and whoever has spoken in it, within 9 m: AUDIT-CH12 #13)
    this.camRig.talk = () => {
      if (this.state !== 'dialog' || this.room || !this.talkers?.size) return null;
      const h = this.hero.pos, out = [];
      for (const a of this.talkers) if (a.pos && a.present !== false && Math.hypot(a.pos.x - h.x, a.pos.z - h.z) < 9) out.push(a.pos);
      return out.length ? out : null;
    };
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
    // (an area not built yet reads as missing while the story, the travel network and the cast are set up; each
    //  area's part of them follows its build: regionBuilt)
    this.regionContainers = timed('regioncontainers', () => this.regions.peek(() => buildRegionContainers(this.rooms, P)));
    this.story = this.regions.peek(() => new Story(this));

    this.state = 'loading';
    this.time = 0;
    this.played = null;   // (SAVE-SLOTS: seconds of play since a new game; null for a game loaded from a save that didn't count them)
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

    timed('actors', () => this.regions.peek(() => this.spawnActors()));
    // (PERF-2: actors of other areas are left out of the render; engine/drawcull.js)
    this.farCull = new FarCull(() => [this.npcs, this.enemies], this.camera, this.scene.fog);
    // (PERF-CPU: people out of the view are posed at a lower rate; never in dialogue, a story scene or a door's fade)
    this.farCull.anim.hold = () => this.state !== 'play' || !!this.trans || !!this.cutscene;
    this.blobBatch = new BlobBatch(this.scene, BLOBS);
    this.renderer.pre = () => { this.farCull.hide(); this.blobBatch.hide(); };
    // (RENDER-INV: an area's static pieces drawn in one call per material and 48 m cell: engine/drawbatch.js)
    this.drawBatch = new DrawBatch();
    TEXARRAY.init = (t) => this.renderer.renderer.initTexture(t);   // (PERF-CPU: the world's texture array, sent to the GPU when made)
    // (PERF-BATTERY-2: then the draw batches, terrain tiles and instanced tiles wholly outside the view by their boxes)
    this.boxCull = new BoxCull();
    this.renderer.mid = () => {
      const root = this.room?.group || this.world.root;
      if (this.shadowCull.areas.has(root)) this.drawBatch.update(root);
      this.boxCull.hide(root, this.renderer.camera, this.drawBatch.enabled ? this.drawBatch.meshes(root) : undefined, this.renderer.renderer.shadowMap.enabled);
    };
    this.renderer.post = () => { this.boxCull.restore(); this.blobBatch.restore(); this.farCull.restore(); };
    this.lightPool.collect(); // (after every builder has placed its lamps)
    this.regionsLive = true;  // (from here on an area's build brings its part of the story, the cast and travel: regionBuilt)
    L.story = Math.round(performance.now() - ts);
    bar.measured(BUILD_REF.story, L.story);
    L.total = Math.round(performance.now() - tm);
    L.regions = this.regions.summary();
    this.fit = new FitWatch(this);   // (AUTO-FIT: one suggestion when the preset can't hold ~50 fps in play: engine/autofit.js)
    this.behMenu = new BehaviourMenu(this, HERO_LOOK);
    this.bubble = this.makeBubble();
    this.applySettings();
    this.wireUI();
    this.last = performance.now();
    requestAnimationFrame((t2) => this.loop(t2));

    if (matchMedia('(pointer: coarse)').matches) this.touch = true;
    await this.prepare();
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
    const lap = (k) => { const n = performance.now(); prep[k] = (prep[k] || 0) + Math.round(n - tp); tp = n; };
    // LAZY-REGIONS: a labelled step each, the bar animated over the step's time on this computer's last start
    // (a little longer, so it creeps on rather than stops when a step runs late)
    const last = loadEst.prep || {};
    const step = async (label, to, k, dflt) => { (BootBar.timeline ||= []).push([Math.round(performance.now()), label]); loadingStep(label); loadBar(to, Math.max(300, (last[k] ?? dflt) * 1.5)); await nextPaint(); lap('paint'); };
    await step('Preparing graphics…', 0.74, 'programs', 600);
    const R = this.renderer.renderer;
    this.titleCamera(0);
    this.lightPool.update(this.camera.position);
    // (the driver compiles in parallel where it can, the main thread waiting free: the bar creeps on toward the step's
    //  end meanwhile, a little slower each time, so a long compile never shows a bar standing still)
    { let at = 0.74; const creep = setInterval(() => { at += (0.8 - at) * 0.12; loadBar(at, 900); }, 1000);
      try { await this.renderer.precompile(); } catch (e) { console.warn('shader precompile', e); } finally { clearInterval(creep); } }
    this.warmMenus();
    if (this.autoQ?.on()) this.autoQ.prewarm();   // (AUTO-QUALITY: bloom and FXAA can switch on in play: their pass programs now)
    lap('programs');
    // upload every texture now too, and draw the title's first view (shadow and post-processing passes)
    await step('Preparing graphics…', 0.84, 'textures', 1500);
    const tex = new Set();
    this.scene.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of TEX_SLOTS) if (m[k]?.isTexture) tex.add(m[k]); });
    tex.add(this.particles.mesh.material.uniforms.map.value);   // (FX-SOFT: the particles' atlas is a uniform, not a material slot)
    for (const t of tex) R.initTexture(t);
    (this._texUp ??= new WeakSet()).add(this.world.root);   // (the rooms built so far get theirs at their first entry)
    lap('textures');
    // (FRAME-1: Citadel's geometry too, in parts with a paint between; each room/region at its first entry)
    {
      const kids = [...this.world.root.children], K = 6;
      for (let c = 0; c < K; c++) {
        await step('Preparing Citadel…', 0.84 + 0.09 * (c + 1) / K, 'geometryPart', 500);
        this.uploadGeometry(this.world.root, new Set(kids.slice(Math.floor((c * kids.length) / K), Math.floor(((c + 1) * kids.length) / K))));
        lap('geometry');
        prep.geometryPart = Math.round(prep.geometry / (c + 1));
      }
      this.uploadGeometry(this.world.root);   // (anything left, and marks it done)
      lap('geometry');
    }
    await step('Almost there…', 0.95, 'batches', 1500);
    this.titleCamera(0);
    this.lightPool.update(this.camera.position);
    this.shadowCull.update(this.world.root, this.camera, this.camera.position); // (the Citadel's shadow batches, built while loading)
    this.drawBatch.update(this.world.root);   // (and its draw batches, uploaded by the render below)
    lap('batches');
    await step('Almost there…', 0.96, 'shadowPrograms', 1000);
    if (!/[?&]nowarm/.test(location.search)) this.warmShadows(); // (?nowarm: for A/B timing)
    lap('shadowPrograms');
    await step('Almost there…', 0.99, 'firstFrame', 3000);
    this.renderer.render();
    lap('firstFrame');
    this.loadTimes.shaders = Math.round(performance.now() - t0);
    this.loadTimes.programs = R.info.programs.length;
    this.regions.phase = 'play';   // (an area built from here on is built in play: regions.summary's "later")
    // (the startup's steps: [ms since the page started, label], and the longest gap between two)
    { const T = (BootBar.timeline || []).concat([[Math.round(performance.now()), 'title']]); this.loadTimes.timeline = T; this.loadTimes.longestStep = Math.max(0, ...T.slice(1).map((x, i) => x[0] - T[i][0])); }
    this.perf.load = this.loadTimes;
    this.preparing = false;
    if (this._powerWarm) { this._powerWarm = false; this.warmGraphics(); }   // (PERF-BATTERY: the power source changed while loading)
    this.last = performance.now();
    const boot = sessionStorage.getItem(BOOT_KEY);
    sessionStorage.removeItem(BOOT_KEY);
    loadBar(1, 150);
    try { localStorage.setItem(LOADT_KEY, JSON.stringify({ total: this.loadTimes.total, shaders: this.loadTimes.shaders, pace: this.regions.speed, prep: this.loadTimes.prep })); } catch { /* (private mode) */ }
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
    // (LAZY-REGIONS: an NPC whose spot is in an area not built yet waits hidden for it: addActors)
    this.npcs = this.story.npcDefs().map((d) => { const n = d.ambient ? new Resident(this, d) : new NPC(this, d); if (d.pending) n.setPresent(false); return n; });
    this.enemies = this.story.enemyDefs().map((d) => createEnemy(this, d));
    this.story.decorate();
    // reward on top of the Whispering Cliffs (optional ball + jumping puzzle); kashes come from the givers
    const s = this.world.shard1Spot;
    this.pickups.spawn('clover', s.x, s.y, s.z, { id: 'cliff-clover' });
    // six singing crystals, hidden off the paths (each one: +1 max health; all six: Sendell notices)
    this.spawnCrystals();
  }
  // the crystals whose spots are built (the mill's is on Zeelich: it appears when Zeelich is built), each once
  spawnCrystals() {
    for (const c of this.crystalSpots()) {
      if (c.pending || this.pickups.list.some((p) => p.id === c.id) || (this.regionsLive && this.collected.includes(c.id))) continue;
      this.pickups.spawn('crystal', c.x, c.y, c.z, { id: c.id });
    }
  }
  crystalSpots() {
    const W = this.world, G = (x, z) => this.physics.groundAt(x, z) + 0.75, mt = this.regions.built('zeelich')?.millTop;
    const out = [
      { id: 'sc-lighthouse', x: -113, z: 85 }, { id: 'sc-orchard', x: -85, z: -49.5 }, { id: 'sc-pier', x: W.pierEnd.x - 0.6, z: W.pierEnd.z },
      { id: 'sc-east', x: -28, z: 40 }, { id: 'sc-north', x: -45, z: -84 },
    ].map((c) => ({ ...c, y: G(c.x, c.z) }));
    // (the count is six whether or not Zeelich is built yet)
    if (mt) out.push({ id: 'sc-mill', x: mt.x - 0.9, y: mt.y + 0.75, z: mt.z });
    else if (this.regions.has('zeelich')) out.push({ id: 'sc-mill', pending: true });
    return out;
  }
  // LAZY-REGIONS (src/game/regions.js): the areas built at startup besides Citadel — a new game's opening (the house,
  // the well) and where the autosave stands (its room and its chapter's areas). ?allregions builds every area.
  bootAreas() {
    if (/[?&]allregions\b/.test(location.search)) return ['*'];
    const out = ['house', 'well'];
    const n = this.newestSlot();   // (what Continue loads)
    let s = null; try { s = n == null ? null : migrateSave(store.get(slotKey(n))); } catch { s = null; }
    if (s) out.push(...this.saveAreas(s));
    return out;
  }
  // builds the areas not built yet under the loading screen (a load, the benchmark); resolves when done (under the
  // tests' fixed stepping: at once)
  buildAreas(ids, text = 'Loading…') {
    if (!this.regions.missing(ids).length) return Promise.resolve();
    if (this.testFreeze) { for (const id of ids) this.regions.ensure(id, 'load'); return Promise.resolve(); }
    const card = new ArriveCard(text, true);
    return this.regions.buildAsync(ids, 'load', async (i, n, gid, est) => { card.step(i, n, est); await nextPaint(); }).finally(() => card.hide());
  }
  // the areas a save needs as it loads: the room it stands in and the areas of its chapter
  saveAreas(s) { return [...(s?.room ? [s.room] : []), ...(CHAPTER_AREAS[s?.flags?.chapterKey] || [])]; }
  // after an area's build (src/game/regions.js): its containers, travel points, cast, the story's things in it, its
  // lamps; containers searched before the game was loaded give again; the cast is placed again
  regionBuilt(gid, rooms) {
    if (!this.regionsLive) return;   // (startup: the story's construction reads whatever is built by then)
    const P = this.physics, ids = Object.keys(rooms);
    this.regions.peek(() => {
      Object.assign(this.regionContainers ||= {}, buildRegionContainers(rooms, P));
      for (const id of ids) travelRegion(this, id);
      this.addActors();
      this.story.decorate();
      this.spawnCrystals();
    });
    this.lightPool.collect();
    this.pruneGivers(ids);
    this._shadowWarm = true;   // (its kinds of shadow caster: depth programs at the next warm-up, warmScene)
  }
  // (after the story's waiting states went on the new area: regions.whenBuilt)
  regionReady(gid, rooms) {
    if (!this.regionsLive) return;
    this.story.regionBuilt?.(Object.keys(rooms));
    this.story.refreshCast();
  }
  // the cast of an area just built: NPCs that waited for its spots go there, its enemies are made
  addActors() {
    for (const d of this.story.npcDefs()) {
      const n = this.npcs.find((x) => x.def.id === d.id);
      if (!n) { const m = d.ambient ? new Resident(this, d) : new NPC(this, d); if (d.pending) m.setPresent(false); this.npcs.push(m); continue; }
      if (n.def.pending && !d.pending) { n.def = d; n.placeAt({ x: d.x, z: d.z, a: d.angle ?? 0, anim: d.anim ?? null }); n.setPresent(true); }
    }
    for (const d of this.story.enemyDefs()) {
      if (this.enemies.some((e) => e.def?.id === d.id)) continue;
      const e = createEnemy(this, d);
      this.enemies.push(e);
      if (this.killed.includes(e.id)) koGone(e);
    }
  }
  // (refillGivers keeps the keys of areas not built yet: the hero has not been there since the game was loaded, so
  //  once it is built its refillable containers give again, as they would have after any scene change elsewhere)
  pruneGivers(ids) {
    const here = this.where();
    this.searched = this.searched.filter((k) => {
      if (typeof k !== 'string' || !k.startsWith('giver:')) return true;
      const i = k.indexOf(':', 6), area = k.slice(6, i), id = k.slice(i + 1);
      if (!ids.includes(area) || area === here) return true;
      return this.giverOnce(this.regions.built(area)?.givers?.find((g) => g.id === id));
    });
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
  // LAZY-REGIONS: `need` names the rooms the scene change goes to; any not built yet are built while the screen is
  // black, under a loading card (the loading screen's look: "Arriving at Zeelich…" and a bar), before mid() runs.
  startTransition(mid, need = null) {
    this.trans = { t: 0, mid, called: false, walk: !!this.walkNext, hold: false, need: need?.filter(Boolean) || null };
    this.walkNext = false;
    this.hud.prompt(null); // (the last room's prompt would otherwise come back with the new scene's first frames)
  }
  // the areas a scene change needs, built behind the black screen with the loading card; a failed build keeps the
  // player where he was (the card says so, then the screen clears on the old scene)
  arrive(T) {
    T.building = true; T.hold = true; T.holdT = performance.now();
    const card = (T.card = new ArriveCard(arriveText(T.need[0])));
    this.regions.buildAsync(T.need, 'enter', async (i, n, gid, est) => { card.step(i, n, est); await nextPaint(); })
      .then(() => { T.built = true; T.long = true; })
      .catch((e) => { console.warn('area build failed', e); T.failed = true; card.fail(`${placeName(T.need[0])} could not be loaded. You stay here.`); })
      .finally(() => { T.building = false; T.holdT = performance.now(); if (T.failed) { this.doorCool = 3; setTimeout(() => { T.hold = false; }, 2200); } else T.hold = false; });
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
    // (a freshly built area's shaders may take longer than a known one's: up to 20 s behind its card)
    if (T.hold) { f.style.opacity = 1; T.held = true; T.heldAt = undefined; if (!T.building && performance.now() - T.holdT > (T.long ? 20000 : 4000)) T.hold = false; return; }
    // PERF-BATTERY: the first frame drawn after a hold stays fully black too. It is the new scene's first real frame
    // (its geometry's first draw, the static shadow cache, pieces that started moving leaving their batches): on the
    // user's arrival route the frames after the black came at 90 % fade and counted, and showed, as stalls in view
    // I-11: and the frames after it stay black while the GPU catches up with that first frame (its shadow cache build,
    // uploads, first draws: on the user's arrival route the frame AFTER the black one came at 150–200 ms, half in view):
    // while the last interval was over 50 ms, at most 3 more frames. (Under the tests' fixed stepping: one, as before.)
    if (T.held) {
      if (this.testFreeze || this._frameNo == null) { T.held = false; f.style.opacity = 1; this._fadeOp = 1; return; }
      T.heldAt ??= this._frameNo;
      const k = this._frameNo - T.heldAt;
      // PERF-CPU: also while the last frame still rebuilt the static shadow cache, built batches or compiled a program (a
      // first visit: pieces that toggle on the area's first frames leave their shadow batch, the cache is redrawn: the
      // user's arrival showed that frame, 133 ms, in view), at most 6 frames in all
      if (k === 0 || (k <= 3 && this._lastRealMs > 50) || (k <= 6 && this._settleBusy)) { f.style.opacity = 1; this._fadeOp = 1; T.settled = k; return; }
      T.held = false;
    }
    if (T.card && T.called) { T.card.hide(); T.card = null; }
    if (this._transBudget != null) { dt = Math.min(dt, this._transBudget); this._transBudget -= dt; }
    T.t += dt;
    if (T.t >= 0.35 && !T.called) {
      T.t = 0.35;
      if (T.need && !T.built && !T.failed && this.regions.missing(T.need).length && !this.testFreeze) { f.style.opacity = 1; this._fadeOp = 1; this.arrive(T); return; }
      if (T.need && this.testFreeze) for (const id of T.need) this.regions.ensure(id, 'enter');   // (tests' fixed stepping: at once)
      T.called = true;
      if (T.failed) { T.card?.hide(); T.card = null; }   // (stays where he was)
      else { T.mid(); this.warmScene(T); }
    }
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
    // AUTO-QUALITY: the governor's commit knobs (shadow filter, lamps, shadows on/off) take effect here, behind the black:
    // their programs are made by the precompile below (its key changes with them), the depth and pass programs now
    if (this.state === 'play' && this.autoQ?.commit('scene change')) { this._shadowWarm = true; warmPassPrograms(R, this.renderer.composer); }
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
    else this.drawBatch.readmit(root);   // (PERF-CALLS: pieces that left on the last visit and are back as they were)
    this.uploadGeometry(root);
    this.uploadTextures(root);
    if (this._shadowWarm) { this._shadowWarm = false; this.warmShadows(); }   // (LAZY-REGIONS: an area built since the last warm-up)
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
  // (`part`: only those children of root, the others hidden meanwhile — startup sends Citadel up in parts with a
  //  paint between them; root is marked done by a call without a part)
  uploadGeometry(root, part = null) {
    const R = this.renderer.renderer, C = this.renderer.composer, S = this.scene;
    const done = (this._uploaded ??= new WeakSet());
    if (!C || !root || done.has(root) || this.testFreeze) return 0;
    for (let p = root; p; p = p.parent) if (!p.visible) return 0;   // (not on show any more: next time)
    if (!part) done.add(root);
    const t0 = performance.now(), g0 = R.info.memory.geometries, lit = new Set(), shown = [], off = [], culled = [], out = [];
    S.traverseVisible((o) => { if (o.isLight) lit.add(o); });
    if (part) for (const k of root.children) if (!part.has(k) && k.visible) { k.visible = false; out.push(k); }
    for (const r of part || [root]) r.traverse((o) => { if (!o.visible && !o.isLight) { o.visible = true; shown.push(o); } });
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
      for (const o of out) o.visible = true;
    }
    (this.uploadLog ??= []).push({ root: this.room?.id || 'citadel', ms: Math.round(performance.now() - t0), newGeometries: R.info.memory.geometries - g0 });
    return R.info.memory.geometries - g0;
  }
  // LAZY-REGIONS: an area built after startup sends its textures to the GPU in its black frame too (startup does
  // Citadel's in prepare), not on the first frames shown
  uploadTextures(root) {
    const R = this.renderer.renderer, done = (this._texUp ??= new WeakSet());
    if (!root || done.has(root) || this.testFreeze) return;
    done.add(root);
    const tex = new Set();
    root.traverse((o) => { for (const m of [].concat(o.material || [])) for (const k of TEX_SLOTS) if (m[k]?.isTexture) tex.add(m[k]); });
    for (const t of tex) R.initTexture(t);
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

  // PERF-BATTERY: battery (true) or mains (false): the battery profile on or off within the preset, its shader variants
  // prepared before the next frame is drawn (as a preset change; the last frame stays up meanwhile). Returns whether
  // anything changed. (Also the benchmark's comparison and the tests: game.setBattery(true).)
  setBattery(on) {
    if (!this.renderer.setBattery(!!on)) return false;
    this.autoQ?.onPower(!!on);   // (AUTO-QUALITY: this machine's state for the new power source, or one tier)
    this.syncLamps();   // (PERF-BATTERY-2: the light pool's size and fades; its programs are prepared with the rest below)
    if (this.preparing || !this.lightPool) this._powerWarm = true; else this.warmGraphics();
    this.fit?.reset();
    if (this.screen === 'settings') this.syncSettingsUI();
    return true;
  }
  // PERF-HIGH: the shadow batches' cell size for the preset (engine/shadowcull.js cellFor). A change rebuilds the shadow
  // batches of the area on show on its next frame (inside the preset change's shader hold), other areas' on their next
  // visit. Only on a preset change.
  syncShadowCells() { this.shadowCull?.setCell(cellFor(this.settings.qualityAuto ? 'high' : this.settings.quality)); }   // (AUTO-QUALITY: Auto keeps High's cells: no rebuild when its knobs move)
  // the light pool for the preset and the power state (engine/lightpool.js poolSize: on battery at Medium/High, the 2
  // lamps nearest the hero, faded; otherwise the preset's 2/4/8)
  syncLamps() {
    const L = this.lightPool; if (!L) return;
    L.setSize(this.lampCount());
    L.setFade(this.lampFade());
  }
  // (AUTO-QUALITY: under Auto the governor's lamp count — as last committed — with the battery profile's cap; a preset's
  //  2 / 4 / 8 otherwise)
  lampCount() {
    const bat = this.renderer.battery && this.renderer.batteryCuts && !this.renderer.retro;   // (LOOK-FIRST: no battery cut)
    if (this.autoQ?.on()) { const n = this.autoQ.gov.knobs().lamps; return bat && this.autoQ.gov.knobs().shadows ? Math.min(n, BATTERY_LAMPS) : n; }
    return poolSize(this.settings.quality, bat);
  }
  lampFade() { return this.renderer.battery && this.renderer.batteryCuts && !this.renderer.retro && (this.autoQ?.on() ? !!this.autoQ.gov.knobs().shadows : this.settings.quality !== 'low'); }
  // what the current preset does, for the benchmark's report
  graphicsConfig() {
    const R = this.renderer, W = this.world;
    return { battery: R.batteryProfile(), shadowFilter: (R.hwShadows ? ['4 hardware reads (battery)', 'PCF 9 hardware reads', 'PCF soft 9 hardware reads', 'VSM'] : ['5 reads (battery)', 'PCF', 'PCF soft', 'VSM'])[R.renderer.shadowMap.type] ?? '?', minScale: R.minDyn(), pr: R.pixelRatio(), msaa: R.composer?.renderTarget1?.samples ?? 0, fxaa: !!R.fxaa?.enabled, edgeAA: (R.output?.uniforms.edgeAA?.value || 0) > 0, sharpen: +(R.output?.uniforms.sharpen?.value || 0).toFixed(2), shadows: R.renderer.shadowMap.enabled, shadowMap: this.env?.sun?.shadow?.mapSize?.x ?? 0,
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
      // (LAZY-REGIONS: built now if nothing built it before — the black screen of a scene change, a story scene, a
      //  test; a door or a travel builds it ahead, under its loading card: startTransition's `need`)
      const R = this.rooms[id];
      if (!R) { console.warn('no such room', id); this.doorCool = 3; return; }
      if (typeof spawn === 'function') spawn = spawn(R);
      if (this.room) this.room.group.visible = false;
      this.room = R;
      this.regions.activate(id);
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
    if (instant) go(); else this.startTransition(go, [id]);
  }

  exitRoom(to, instant = false, quiet = false) {
    const go = () => {
      const R = this.room;
      this.regions.activate(null);
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
  // the autosave (SAVE-SLOTS: slot 0). Returns 'ok', 'skip' (not a moment to save), 'quota' or 'fail'; a full
  // storage is told once per session (a toast), and Save & Quit asks before quitting without the save
  save(toast = true) {
    if (this.benching || this.hero.dead || this.state === 'title' || this.room?.id === 'arena') return 'skip';
    const r = store.put(SAVE_KEY, this.stamp(this.snapshot()));
    if (r !== 'ok') { if (!this._saveWarned) { this._saveWarned = true; this.hud.toast(r === 'quota' ? 'toast_save_full' : 'toast_save_fail'); } return r; }
    if (toast) this.hud.toast('toast_saved');
    return r;
  }
  // a snapshot with when it was made and the play time so far
  stamp(s) {
    s.at = Date.now();
    if (this.played != null) s.played = Math.round(this.played);
    return s;
  }
  applySave(s) {
    const h = this.hero;
    this.regions.clearWaits();   // (a load in the same page: the last load's waiting area states go)
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
    this.played = Number.isFinite(s.played) ? s.played : null;
    this.applyCrystals();
    for (const e of this.enemies) if (this.killed.includes(e.id)) koGone(e);
    for (const p of [...this.pickups.list]) if (p.id && this.collected.includes(p.id)) { this.scene.remove(p.mesh); this.pickups.list.splice(this.pickups.list.indexOf(p), 1); }
    this.brokenCrates.forEach((i) => { if (this.world.crates[i]) this.breakCrate(this.world.crates[i], true); });
    this.restoreLoot(s.loot);
    if (this.flags.target) this.hitTarget(true);
    this.story.applyFlags();
    const at = { x: s.hero.x, z: s.hero.z, a: 0 };
    this.resetCombat('drop'); // (a bonus on the ball from before the load is nobody's)
    if (s.room && this.regions.has(s.room)) this.enterRoom(s.room, at, true);
    else if (s.room) this.exitRoom(this.lastSafe || at, true); // (a room this build doesn't have: back outdoors)
    else this.exitRoom(at, true);
    this.gadgets.jet?.afterLoad();   // (never in the air, the sea or inside something: jetpack.js)
  }

  // ------------------------------------------------ flow
  startNew() {
    store.del(SAVE_KEY);   // (the autosave only: the manual slots are never touched by a new game)
    this.played = 0;
    this.beginPlay();
    this.story.start();
  }
  // loads the autosave, or a manual slot's key (SAVE-SLOTS: Load Game); either goes through the same migration
  startContinue(key = SAVE_KEY) {
    const raw = store.get(key);
    let s = null; try { s = migrateSave(raw); } catch { s = null; }
    // LAZY-REGIONS: the areas the save stands in that are not built yet are built first, under the loading screen
    // (the newest save's are built at startup: Continue goes straight on; under the tests' fixed stepping: at once)
    if (s && !this.testFreeze && !this._loadingAreas && this.regions.missing(this.saveAreas(s)).length) {
      this._loadingAreas = true;
      this.buildAreas(this.saveAreas(s)).catch((e) => console.warn('area build failed', e))
        .finally(() => { this.startContinue(key); this._loadingAreas = false; });
      return;
    }
    // an older format is kept untouched next to the migrated save
    if (raw && s && raw.v !== SAVE_VERSION) store.set(key + '_backup_v' + (raw.v || 1), raw);
    try {
      if (!s) throw new Error('unreadable save');
      this.applySave(s);
    } catch (e) {
      // never delete a save we couldn't read: set it aside and start fresh
      console.error('save load failed', e);
      if (raw) store.set(key + '_unreadable', raw);
      store.del(key);
      // a manual slot that isn't a save at all: nothing was loaded, the Load menu stays and says so
      if (key !== SAVE_KEY && !s) { this.slotMsg = t('slot_unreadable'); this.slotMsgBad = true; if (this.screen === 'loadgame') this.buildSlots('loadgame'); return; }
      if (key !== SAVE_KEY && store.get(SAVE_KEY)) store.set(SAVE_KEY + '_before_new', store.get(SAVE_KEY));   // (the new game below replaces the autosave)
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
    // AUTO-QUALITY: the title's calibration and any commit knobs take effect as play starts (the first frames wait for
    // their programs: warmGraphics)
    if (this.autoQ?.start()) this.warmGraphics();
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
    if (id === 'title') { const any = this.anySave(); $('#btn-continue').disabled = !any; $('#btn-load').disabled = !any; }
    this.screen = id;
    if (id === 'settings') { this.syncSettingsUI(); this.setTabTo(this.setTab || 'game'); }
    if (id === 'savegame' || id === 'loadgame') this.buildSlots(id);
    if (id === 'slotconfirm') this.buildSlotConfirm();
    if (id === 'pause') { $('#pause-msg').textContent = ''; $('#btn-save').classList.toggle('blocked', !!this.saveBlockReason()); }
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
      if (b.dataset.act) { this.audio.play('select'); this.act(b.dataset.act, b); }
      const seg = b.closest('.seg');
      if (seg && b.dataset.v) {
        // (AUTO-QUALITY: the Auto chip turns the governor on; Low / Medium / High are a choice by hand, kept as such)
        if (seg.dataset.setting === 'quality') {
          if (b.dataset.v === 'auto') this.settings.qualityAuto = true;
          else { this.settings.quality = b.dataset.v; this.settings.qualityAuto = false; this.settings.qualityChosenByHand = true; this.settings.qPicked = true; }
          if (this.settings.qualityAuto) this.settings.quality = this.autoQ.tier();
        } else this.settings[seg.dataset.setting] = b.dataset.v;
        this.applySettings(); this.syncSettingsUI();
      }
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
    // (SAVE-SLOTS: the same on the slot screens — the slot under the mouse is the selected one, one burning bar)
    const pickSlot = (e) => {
      if (!SLOT_SCREENS.has(this.screen) || (e.type === 'pointermove' && e.pointerType !== 'mouse')) return;
      const b = e.target.closest('.menu button'); if (!b) return;
      const k = this.menuButtons().indexOf(b);
      if (k >= 0 && k !== this.menuSel) { this.menuSel = k; this.focusMenu(); }
    };
    for (const id of SLOT_SCREENS) { $('#' + id).addEventListener('pointermove', pickSlot); $('#' + id).addEventListener('pointerdown', pickSlot); }
    $('#pausebtn').addEventListener('click', () => this.pause());
    // a story scene stops when the window loses focus (its music would run on without the picture)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'cinematic') this.pause();
      if (!document.hidden) this.last = performance.now(); // back from another tab: no catch-up for the time away
      this.setBackground();
    });
    // PERF-BATTERY: while the window can't be seen or is not the one in use, the game is drawn at BG_FPS (the user saw
    // 91 % GPU with it behind another window: the desktop app keeps running in the background for its music). The game
    // goes on as before (it keeps real time in steps of at most 1/30 s); back in focus, the next frame is at full rate.
    addEventListener('focus', () => { this._blurred = false; this.setBackground(); });
    window.desktop?.onWindow?.((st) => { this._win = st; this.setBackground(); });
    // F9 / ?perf: frame-time overlay (its own key: F1–F4 pick behaviours; a held key toggles once)
    addEventListener('keydown', (e) => { if (e.code === 'F9') { e.preventDefault(); if (!e.repeat) this.perf.overlay(); } });
    if (new URLSearchParams(location.search).has('perf')) this.perf.overlay(true);
    addEventListener('blur', () => { if (this.state === 'cinematic') this.pause(); this._blurred = true; this.setBackground(); });
  }
  setBackground() {
    const W = this._win, bg = !!(document.hidden || this._blurred || (W && (!W.focused || W.minimized || !W.visible)));
    if (bg === !!this.background) return;
    this.background = bg; this._due = 0;
    this.renderer._fb.length = 0;   // (the automatic resolution starts its count again)
  }
  // the label of the key bound to an action ("E", "Space"...), for prompts
  keyName(action) { return keyLabel(keyFor(action)); }

  act(a, btn) {
    switch (a) {
      // Continue: the newest of the autosave and the manual slots (SAVE-SLOTS)
      case 'continue': { const n = this.newestSlot(); if (n != null) this.startContinue(slotKey(n)); break; }
      case 'loadgame': this.openChild('loadgame'); this.selectSlot(this.newestSlot()); break;
      case 'savegame': {
        // not during a story scene, a fight, or while he is down: say why, stay in the pause menu
        const why = this.saveBlockReason();
        if (why) { $('#pause-msg').textContent = why; this.audio.play('deny'); break; }
        this.openChild('savegame');
        break;
      }
      case 'slot': this.pickSlot(+btn?.dataset.slot); break;
      case 'slotdel': if (slotInfo(+btn?.dataset.slot)) { this.slotAsk = { kind: 'delete', n: +btn.dataset.slot }; this.openChild('slotconfirm'); } break;
      case 'slotyes': {
        const A = this.slotAsk; this.slotAsk = null;
        if (!A) { this.closeChild(); break; }
        if (A.kind === 'overwrite') this.writeSlot(A.n);
        else { store.del(slotKey(A.n)); this.slotMsg = t('slot_deleted', { n: A.n }); this.slotMsgBad = false; }
        this.closeChild();
        this.selectSlot(A.n);
        break;
      }
      // New Game over an existing autosave asks first (the user: one press used to wipe the progress); the old
      // autosave is kept aside as lba3_save_v1_before_new, so even a yes can be undone by hand. The manual slots
      // are never touched (SAVE-SLOTS)
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
      case 'quit': {
        // (never save half a cinematic) — a full storage asks once before quitting without the save
        const r = this.cine ? 'skip' : this.save(false);
        if ((r === 'quota' || r === 'fail') && !this._quitAnyway && this.screen === 'pause') { this._quitAnyway = true; $('#pause-msg').textContent = t('quit_full'); this.audio.play('deny'); break; }
        this.reloadInto('title');
        break;
      }
      case 'bench':
        if (this.cine) break;
        this.hideScreens();
        this.bench.run().then((text) => { if (!text) return; $('#bench-out').value = text; this.showScreen('benchres'); this.setState('pause'); });
        break;
      // AUTO-QUALITY: the routes as the player plays them, Quality Auto on (engine/bench.js runAuto)
      case 'benchauto':
        if (this.cine) break;
        this.hideScreens();
        this.bench.runAuto().then((text) => { if (!text) return; $('#bench-out').value = text; this.showScreen('benchres'); this.setState('pause'); });
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
    if (this.state === 'cinematic' && this.cine) { this.pauseThumb = null; this.cine.pause(); this.setState('pause'); this.showScreen('pause'); return; }
    if (this.state !== 'play') return;
    this.pauseThumb = null; this._thumbTok = (this._thumbTok || 0) + 1;
    this.setState('pause');
    this.showScreen('pause');
    // SAVE-SLOTS: the picture for a save slot, taken from the frame drawn as the pause menu opens (after this frame's
    // render, before the browser shows it and clears the canvas); never on a session where it once took too long
    if (!this.thumbOff) { const f0 = this.renderer.renderer.info.render.frame; queueMicrotask(() => this.grabThumb(f0)); }
  }

  // ------------------------------------------------ save slots (SAVE-SLOTS)
  anySave() { for (let n = 0; n <= SLOT_COUNT; n++) if (store.get(slotKey(n))) return true; return false; }
  // the slot Continue loads: the newest readable save (the autosave on a tie, or when no save says when it was made)
  newestSlot() {
    let best = null;
    for (let n = 0; n <= SLOT_COUNT; n++) { const I = slotInfo(n); if (I?.s && (!best || I.at > best.at)) best = I; }
    return best ? best.n : store.get(SAVE_KEY) ? 0 : null;
  }
  // why a manual save can't be made now ('' when it can): LBA2 saves anywhere; here not in the middle of a story
  // scene, a fight, or while he is down
  saveBlockReason() {
    const h = this.hero;
    if (!h || this.state === 'title') return t('nosave_here');
    if (this.cine || this.cutscene) return t('nosave_scene');
    if (h.dead || h.hp <= 0) return t('nosave_dead');
    if (this.benching || this.room?.id === 'arena') return t('nosave_here');
    if (this.trans) return t('nosave_wait');
    if (this.inFight()) return t('nosave_fight');
    return '';
  }
  inFight() {
    const h = this.hero;
    if (this.combatDir?.holders.size) return true;
    if ($('#bossbar') && !$('#bossbar').classList.contains('hidden')) return true;
    return this.enemies.some((e) => e.alive && e.present && !e.def?.passive && FIGHT.has(e.state) && Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) < 15);
  }
  // A 160x90 JPEG of the canvas (cropped to 16:9) for a save slot. `f0`: the renderer's frame count when asked; a
  // frame drawn since is still in the canvas, otherwise one is drawn here. The main thread only copies the frame out
  // (createImageBitmap: a GPU-side copy, no wait) and hands it to a small worker (THUMB_WORKER), which reads it back,
  // encodes it and answers with a data URL. Reading it back on the main thread (toDataURL / toBlob of a 2D canvas)
  // blocked until the GPU had finished every frame queued before it. The main thread's step is timed (thumbMs); over
  // THUMB_MS the picture is dropped and pictures stay off for the session. No worker or OffscreenCanvas: no picture.
  // A save made before the picture is ready is made without one.
  grabThumb(f0) {
    if (this.state !== 'pause' || this.cine || typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return;
    const token = (this._thumbTok = (this._thumbTok || 0) + 1), t0 = performance.now();
    const live = () => token === this._thumbTok && this.state === 'pause' && !this.thumbOff;
    let bmp;
    try {
      const R = this.renderer.renderer, src = R.domElement;
      if (R.info.render.frame === f0) this.renderer.render();
      const W = src.width, H = src.height, k = Math.min(W / THUMB_W, H / THUMB_H), sw = Math.round(THUMB_W * k), sh = Math.round(THUMB_H * k);
      bmp = createImageBitmap(src, Math.round((W - sw) / 2), Math.round((H - sh) / 2), sw, sh, { resizeWidth: THUMB_W, resizeHeight: THUMB_H, resizeQuality: 'medium' });
      this._thumbW ??= new Worker(URL.createObjectURL(new Blob([THUMB_WORKER], { type: 'text/javascript' })));
    } catch { this.thumbOff = true; return; }
    this.thumbMs = performance.now() - t0;
    if (this.thumbMs > THUMB_MS) { this.thumbOff = true; bmp.then((b) => b.close(), () => {}); return; }
    const w = this._thumbW;
    bmp.then((b) => {
      if (!live()) { b.close(); return; }
      w.onmessage = (e) => { const u = e.data?.url; if (e.data?.token !== this._thumbTok) return; if (live() && typeof u === 'string' && u.startsWith('data:image/jpeg') && u.length <= THUMB_MAX) this.pauseThumb = u; this.thumbDone = token; };
      w.onerror = () => { this.thumbOff = true; this.thumbDone = token; };
      w.postMessage({ bmp: b, max: THUMB_MAX, token }, [b]);
    }, () => { this.thumbDone = token; });
  }
  // a manual save into slot n: the autosave's snapshot, its time, the picture. A full storage keeps the slot's old
  // save and says so (first tried again without the picture).
  writeSlot(n) {
    const key = slotKey(n), data = this.stamp(this.snapshot());
    let r = this.pauseThumb ? store.put(key, { ...data, thumb: this.pauseThumb }) : 'quota';
    if (r === 'quota') r = store.put(key, data);
    this.slotMsg = r === 'ok' ? t('slot_saved', { n }) : t(r === 'quota' ? 'slot_full' : 'slot_fail');
    this.slotMsgBad = r !== 'ok';
    if (r !== 'ok') this.audio.play('deny');
    return r;
  }
  // a slot pressed: Save Game writes it (asking first over an occupied one), Load Game loads it
  pickSlot(n) {
    if (!(n >= 0 && n <= SLOT_COUNT)) return;
    if (this.screen === 'loadgame') { if (store.get(slotKey(n))) this.startContinue(slotKey(n)); return; }
    if (this.screen !== 'savegame' || !n) return;
    if (slotInfo(n)) { this.slotAsk = { kind: 'overwrite', n }; this.openChild('slotconfirm'); return; }
    this.writeSlot(n);
    this.buildSlots('savegame');
    this.selectSlot(n);
  }
  selectSlot(n) {
    const k = this.menuButtons().findIndex((b) => b.classList.contains('slot') && +b.dataset.slot === n);
    if (k >= 0) this.menuSel = k;
    this.focusMenu(true);
  }
  // one slot's picture and lines (a button on the lists, a card on the confirmation)
  slotCard(el, n, I, latest) {
    const s = I?.s, mk = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
    const pic = mk('span', 'slot-pic');
    if (typeof I?.raw.thumb === 'string' && I.raw.thumb.startsWith('data:image/jpeg')) { const im = document.createElement('img'); im.src = I.raw.thumb; im.alt = ''; pic.append(im); }
    else pic.append(mk('i', '', n ? String(n) : 'A'));
    const txt = mk('span', 'slot-txt'), name = mk('b', 'slot-name', n ? t('slot_n', { n }) : t('slot_auto'));
    if (latest) name.append(mk('em', 'slot-tag', t('slot_latest')));
    txt.append(name);
    if (!I) txt.append(mk('span', 'slot-ch', t('slot_empty')));
    else if (!s) txt.append(mk('span', 'slot-ch', t('slot_bad')));
    else {
      const key = s.flags.chapterKey, num = CH_NUMBER[key];
      txt.append(mk('span', 'slot-ch', (num ? t('chapter_n', { n: num }) + ' · ' : '') + t('chapter_' + key)));
      const meta = [placeName(s.room)];
      if (Number.isFinite(s.played)) meta.push(playedText(s.played));
      if (I.at) meta.push(new Date(I.at).toLocaleString(getLang() === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
      txt.append(mk('span', 'slot-meta', meta.join(' · ')));
    }
    el.classList.toggle('empty', !I);
    el.append(pic, txt);
  }
  // the Save Game list (the six slots) or the Load Game list (the Autosave and the six slots, a Delete on each
  // manual one), then Back
  buildSlots(id) {
    const load = id === 'loadgame', list = $(`#${id} .slot-list`), latest = load ? this.newestSlot() : null;
    list.textContent = '';
    for (let n = load ? 0 : 1; n <= SLOT_COUNT; n++) {
      const I = slotInfo(n), row = document.createElement('div'), b = document.createElement('button');
      row.className = 'slot-row';
      b.className = 'slot'; b.dataset.act = 'slot'; b.dataset.slot = n;
      this.slotCard(b, n, I, load && I && n === latest);
      if (load && !I) b.disabled = true;
      row.append(b);
      if (load && n && I) { const d = document.createElement('button'); d.className = 'slot-del'; d.dataset.act = 'slotdel'; d.dataset.slot = n; d.textContent = t('slot_delete'); d.setAttribute('aria-label', t('slot_delete') + ' ' + t('slot_n', { n })); row.append(d); }
      list.append(row);
    }
    const back = document.createElement('button'); back.dataset.act = 'back'; back.className = 'slot-back'; back.textContent = t('back');
    list.append(back);
    const m = $(`#${id} .menu-msg`);
    m.textContent = this.slotMsg || ''; m.classList.toggle('bad', !!this.slotMsgBad);
    this.slotMsg = ''; this.slotMsgBad = false;
  }
  buildSlotConfirm() {
    const A = this.slotAsk || { kind: 'overwrite', n: 1 }, S = $('#slotconfirm');
    S.querySelector('h1').textContent = t(A.kind === 'delete' ? 'slot_delete_q' : 'slot_overwrite_q', { n: A.n });
    const card = S.querySelector('.slot-card'); card.textContent = '';
    this.slotCard(card, A.n, slotInfo(A.n), false);
    S.querySelector('[data-act="slotyes"]').textContent = t(A.kind === 'delete' ? 'slot_delete_yes' : 'slot_overwrite_yes');
  }
  // the Load list: up / down go from slot to slot (past the Delete buttons), right / left between a slot and its Delete
  slotNav(btns) {
    const i = this.input, cur = btns[this.menuSel], isDel = (b) => !!b?.classList.contains('slot-del');
    const go = (b) => { const k = btns.indexOf(b); if (k >= 0 && k !== this.menuSel) { this.menuSel = k; this.focusMenu(true); this.audio.play('blip'); } };
    if (i.pressed('right')) { if (cur?.classList.contains('slot')) go(cur.parentElement.querySelector('.slot-del')); return true; }
    if (i.pressed('left')) { if (isDel(cur)) go(cur.parentElement.querySelector('.slot:not(:disabled)')); return true; }
    const d = i.pressed('down') ? 1 : i.pressed('up') ? -1 : 0;
    if (!d) return false;
    let k = isDel(cur) ? Math.max(0, btns.indexOf(cur.parentElement.querySelector('.slot'))) : this.menuSel;
    for (let n = 0; n < btns.length; n++) { k = (k + d + btns.length) % btns.length; if (!isDel(btns[k])) break; }
    this.menuSel = k; this.focusMenu(true); this.audio.play('blip');
    return true;
  }

  syncSettingsUI() {
    const s = this.settings, L = (a) => keyLabel(keyFor(a));
    const segVal = (k) => (k === 'quality' && s.qualityAuto ? 'auto' : String(s[k]));
    document.querySelectorAll('.seg').forEach((g) => g.querySelectorAll('button').forEach((b) => { const on = segVal(g.dataset.setting) === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }));
    document.querySelectorAll('[data-range]').forEach((r) => { r.value = s[r.dataset.range]; this.syncRange(r); });
    // one line under a few rows, only where the choice isn't obvious (or depends on another setting)
    const hint = {
      controls: () => t('set_h_' + s.controls),
      camera: () => t('set_h_cam_' + s.camera, { l: L('camL'), r: L('camR') }),
      camDist: () => t('set_h_cd'),
      res: () => t('set_h_res_' + s.res),
      aa: () => t(s.quality === 'low' && !s.qualityAuto ? 'set_h_aa_low' : 'set_h_aa_' + s.aa),
      // (AUTO-QUALITY: what Auto runs now, in words; PERF-BATTERY: the battery profile's note)
      quality: () => [s.qualityAuto && this.autoQ ? t('set_h_q_auto', { s: this.autoQ.label() + (this.autoQ.gov.phase === 'evaluate' && !this.autoQ.test ? ', settling' : '') }) : '', this.renderer.batteryProfile() ? t('set_h_q_battery') : ''].filter(Boolean).join(' '),
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
    // AUTO-QUALITY: a preset set directly while Auto is on (the benchmark's fixed runs, a test, a probe) is a preset by
    // hand from then on; Settings' Auto chip sets qualityAuto and the governor's tier
    if (this.settings.qualityAuto && this.autoQ && this.settings.quality !== this.autoQ.tier()) this.settings.qualityAuto = false;
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
    if (changed('quality') || changed('qualityAuto')) {
      this.applyGraphics();
      if (was.quality) this.warmGraphics();
    }
    if (changed('res')) this.renderer.setAutoRes(s.res !== 'full');
    if (changed('aa')) this.renderer.setAA(s.aa);   // (RENDER-INV: Settings → Edges; Low always uses FXAA)
    // FRAME-1: frame-rate limit ('auto': the screen's own rate); the automatic resolution's budget follows it
    if (changed('fps')) { this.frameCapMs = s.fps === '30' ? 1000 / 30 : s.fps === '60' ? 1000 / 60 : 0; this.renderer.budgetMs = this.frameCapMs || 1000 / 60; this._acc = 0; }
    const retro = s.visual === '1997';
    if (changed('visual')) {
      this.renderer.setRetro(retro);
      this.syncLamps();   // (the battery profile's lamps don't apply to the 1997 look)
      this.camRig.cut = retro; // 1997: hard cuts between shots, remaster: glide
      this.env.setFogRange(...(retro ? [18, 72] : [45, 190]));
      this.env.waterU.uWaveAmp.value = retro ? 0.3 : 1;
    }
    if (changed('camera')) this.camRig.setMode(s.camera);
    if (changed('camDist')) this.camRig.setFollowDistance(s.camDist);   // (CAM-FOLLOW: Follow's distance and height)
    if (changed('hud')) this.hud.setStyle(s.hud === 'lba');
    // comfort: dialogue speed (LBA2 types 50 chars/s), subtitle size, camera shake
    this.hud.textRate = { slow: 28, normal: 50, fast: 95, instant: 1e9 }[s.textSpeed] ?? 50;
    document.body.classList.toggle('big-text', s.textSize === 'large');
    this.camRig.shakeScale = { on: 1, reduced: 0.35, off: 0 }[s.shake] ?? 1;
    this.audio.vol.music = s.music;
    this.audio.vol.sfx = s.sfx;
    this.audio.vol.voice = s.voice;
    this.audio.applyVolumes();
    this._applied = { ...now, quality: s.quality, qualityAuto: s.qualityAuto };   // (Auto names its tier in applyGraphics)
    store.set(SET_KEY, s);
  }

  saveSettings() { store.set(SET_KEY, this.settings); }
  // the graphics of the preset chosen by hand, or Auto's knobs (engine/autoapply.js)
  applyGraphics() {
    const s = this.settings;
    if (s.qualityAuto && this.autoQ) {
      this.autoQ.gov.commit('quality set to Auto');   // (the programs are made by the caller's warm-up)
      this.autoQ.applyAll();
      s.quality = this.autoQ.tier();
      this.renderer.timer = this.benching ? this.renderer.timer : this.autoQ.timer();
      return;
    }
    this.renderer.setKnobs(null);
    if (!this.benching) this.renderer.timer = null;
    this.renderer.setQuality(s.quality); this.env?.setShadowQuality(s.quality); this.syncLamps();
    this.world?.setDetail?.(s.quality);
    if (this.shadowCull) this.shadowCull.quality = s.quality;
    this.syncShadowCells();
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
      // (G1-QUEST #17: someone at his back gets the prompt only at arm's length: 1.5 m behind him, "Talk" showed with
      //  nobody in front of him)
      consider(dist(n.pos.x, n.pos.z) + (n.ambient ? 0.45 : 0) + (o.behind ? 0.6 : 0), 2.6, o);   // (a walking resident gives way to the story's people on a tie: WORLD-LIFE)
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
    if (it.kind === 'npc') { (this.talkers ??= new Set()).add(it.npc); this.story.talk(it.npc); }   // (G1-CAM: the one he spoke to is in the two-shot from the first line)
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
      const list = area === 'out' ? this.world.givers : this.regions.built(area)?.givers;
      if (!list && this.regions.has(area)) return true;   // (an area not built yet: pruneGivers when it is)
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
    // (who has spoken in this dialogue, him aside: the Follow camera's two-shot; let go on the next frame of play)
    if (speaker && speaker !== this.hero && speaker.pos) (this.talkers ??= new Set()).add(speaker);
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
      this._jumpHintT = 1.2;   // (game time: a pause holds it, updatePlay shows it — G1-QUEST #21)
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
          if (e.room) { this.audio.play('door'); this.walkNext = true; const from = this.room.id; this.enterRoom(e.room, (R2) => R2.entries?.[from] || R2.spawn); this.walkNext = false; this.doorCool = 1.5; return; }
          if (this.story.canExit(this.room, e.to)) {
            this.audio.play('door');
            // an exit leads outdoors on Citadel, or into another room/region ({ room, x, z, a })
            // (LAZY-REGIONS: where it lands may be read from an area not built yet: then that area is built behind
            //  the black, under its card, and the exit is worked out there)
            const pr = this.regions.probe(() => this.story.exitTo(e.to)), ek = e.to;
            if (pr.error && !pr.misses.size) throw pr.error;
            this.walkNext = true;
            if (pr.misses.size) this.startTransition(() => { const to = this.story.exitTo(ek); if (to?.room) this.enterRoom(to.room, to, true); else this.exitRoom(to, true); }, [...pr.misses]);
            else { const to = pr.value; if (to?.room) this.enterRoom(to.room, to); else this.exitRoom(to); }
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
    // FRAME-2: the display's refresh measured from requestAnimationFrame: the median of the last 32 intervals
    // (recomputed every 8 frames: it follows a move to another screen within half a second), for the frame-rate limit
    // and the benchmark's report. (A skipped refresh still calls back, so the limit itself never skews it.)
    if (d > 0 && d < 100) { const B = (this._rafBuf ??= { a: new Float32Array(32), n: 0, k: 0 }); B.a[B.k] = d; B.k = (B.k + 1) % 32; B.n = Math.min(32, B.n + 1); if (B.k % 8 === 0 || B.n < 8) this._refresh = medianOf(B.a, B.n); }
    // PERF-HIGH (benchmark only): how late this callback runs after the frame's timestamp (the main thread busy with
    // something else), and the benchmark's "nothing drawn" probe: a few refreshes with no simulation and no render, to
    // tell the display's own pace from the game's (engine/bench.js idleProbe). The time is not simulated.
    if (this.benching) {
      this._lag = performance.now() - now;
      if (this.benchIdle) { this.benchIdle(now); this.last = now; requestAnimationFrame((t2) => this.loop(t2)); return; }
    }
    // FRAME-1 / FRAME-2: frame-rate limit (Settings; off by default, off while benchmarking). A limit at or above the
    // display's measured refresh does nothing: requestAnimationFrame sets the pace, so its jitter can never drop a
    // frame (the user, 29.10). Below it, a time accumulator: each refresh adds its real interval, a frame is drawn once
    // the sum reaches the limit less 1.5 ms of tolerance, and the limit is taken off; a remainder of more than half
    // the limit (a stall) is dropped, so a stall can't cause a burst. A skipped refresh simulates and draws nothing (keys wait in Input): at 30 on a 60 Hz
    // screen every other refresh is drawn, an even 33 ms.
    const cap = this.benching ? 0 : this.background && !this.testFreeze ? Math.max(this.frameCapMs || 0, 1000 / BG_FPS) : this.frameCapMs;
    const refresh = this._refresh || this._vsync || 1000 / 60;
    if (cap && cap > refresh + 1 && !this.testFreeze && !this.preparing) {
      this._acc = (this._acc ?? cap) + Math.max(0, d);
      if (this._acc + LIMIT_TOL_MS < cap) { requestAnimationFrame((t2) => this.loop(t2)); return; }
      const rem = this._acc - cap; this._acc = rem > cap / 2 ? 0 : rem;   // (signed: a frame drawn up to 1.5 ms early is paid back, so the average is the limit; a stall's late time is dropped: no burst)
    } else this._acc = cap;   // (unlimited: the next limited frame is due at once)
    // rAF timestamps can be slightly older than performance.now() on the first frame: never step backwards
    const real = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    if (!this.testFreeze && !this.preparing) { this.advance(real); if (!this.settings.qualityAuto) this.fit?.frame(real); }   // (AUTO-QUALITY: Auto adjusts itself: no suggestion)
    requestAnimationFrame((t2) => this.loop(t2));
  }

  // Real time → simulation. A slow frame is simulated in steps of at most MAX_STEP (so the game keeps real
  // time down to MAX_STEP / MAX_SUB ≈ 7.5 fps instead of turning into slow motion below 20 fps); a longer gap
  // (a stall, a GC, a dragged window) is dropped rather than caught up, so a hitch can't snowball. Input is
  // read once per step: a press is an edge in the first step only, a held key stays held.
  // (I-11 / AUTO-QUALITY) counters of the jobs that can make a frame long, read before and after each frame: what ran in
  // the frame before a long interval is noted on it for the benchmark's hitch list (bench.js hitchList)
  jobCounters() {
    const R = this.renderer.renderer, M = R.info.memory;
    return { p: R.info.programs?.length ?? 0, g: M.geometries, x: M.textures, sc: this.shadowCache?.stats.full ?? 0, db: this.drawBatch?.buildMs ?? 0, dbn: this.drawBatch?.builds ?? 0,
      sb: this.shadowCull?.buildMs ?? 0, sbn: this.shadowCull?.builds ?? 0, up: this.uploadLog?.length ?? 0, aq: this.autoQ?.log.length ?? 0, h: performance.memory?.usedJSHeapSize ?? 0 };
  }
  jobsBetween(a, b) {
    const o = [];
    if (b.dbn > a.dbn) o.push(`draw batches built ${(b.db - a.db).toFixed(0)} ms`);
    if (b.sbn > a.sbn) o.push(`shadow batches built ${(b.sb - a.sb).toFixed(0)} ms`);
    if (b.sc > a.sc) o.push('shadow cache rebuilt');
    if (b.p > a.p) o.push(`${b.p - a.p} shader program${b.p - a.p > 1 ? 's' : ''} compiled`);
    if (b.g > a.g + 2 || b.x > a.x) o.push(`+${b.g - a.g} geometries, +${b.x - a.x} textures on the GPU`);
    if (b.up > a.up) o.push('geometry upload');
    if (b.aq > a.aq) o.push('Auto quality step');
    return o.join(', ');
  }
  advance(real) {
    const t0 = performance.now(), jc = this.jobCounters();
    this._frameNo = (this._frameNo || 0) + 1; this._lastRealMs = real * 1000;   // (I-11: updateTransition's settle frames)
    // (a heap that shrank since the last frame: a garbage collection ran in the interval)
    const gc = this._jc && this._jc.h && jc.h && this._jc.h - jc.h > 8e6 ? `GC −${((this._jc.h - jc.h) / 1048576).toFixed(0)} MB` : '';
    const dt = Math.min(real, MAX_STEP * MAX_SUB);
    const n = Math.max(1, Math.ceil(dt / MAX_STEP - 1e-6)), sub = dt / n;
    this.perf.beginFrame();
    this._renderMs = 0;
    this.benchTick?.(real);
    this._transBudget = Math.min(real, 0.1);
    // (RENDER-INV: `_inner`: a catch-up step before the drawn one; what only serves the picture runs on the drawn one)
    try { for (let i = 0; i < n; i++) { this._inner = i < n - 1; this.frame(sub, i === n - 1); } } finally { this._inner = false; }
    const ms = performance.now() - t0;
    // (PERF-HIGH: the frame's own work without the background slices, for spareMs)
    this._workMs = ms - (this._bgMs || 0); this._bgMs = 0;
    // (FRAME-1: `black`: this interval was spent with a fully black screen on show (a scene change's fade or shader
    // hold), so a long one is a pause behind the fade, not a hitch in view)
    const black = !!this._shownBlack;
    this._shownBlack = !!this.trans && (this.trans.hold || this._fadeOp >= 0.999);
    let lamps = 0; for (const l of this.lightPool.lights) if (l.intensity > 0) lamps++;
    const why = real * 1000 > 33.4 ? [this._jobsPrev, gc].filter(Boolean).join(', ') : '';
    this.perf.record({ real, ms: real * 1000, steps: n, lost: real - dt, sim: ms - this._renderMs, render: this._renderMs, black, lamps, lag: this._lag ?? 0, bg: !!this.background, why: why || undefined });
    { const jc1 = this.jobCounters(), j = this.jobsBetween(jc, jc1); this._jobsPrev = `frame before: work ${ms.toFixed(0)} ms${j ? ', ' + j : ''}`; this._jc = jc1;
      this._settleBusy = jc1.sc > jc.sc || jc1.dbn > jc.dbn || jc1.sbn > jc.sbn || jc1.p > jc.p || this._lastLeft !== (this.shadowCull?.left ?? 0); this._lastLeft = this.shadowCull?.left ?? 0; }
    // automatic resolution follows the frame time in play (not through fades, menus or a benchmark's fixed runs; its
    // "as played" runs keep it: PERF-BATTERY-2)
    if (this.state === 'play' && !this.trans && (!this.benching || this.benchAuto) && !this.background) this.renderer.adapt(real * 1000);
    // AUTO-QUALITY: the governor (play) and the first start's calibration (title), with the frame's own CPU work
    this.autoQ?.frame(real, this._workMs);
  }

  // PERF-HIGH: the CPU time a background job (the map built after an arrival) may take in this frame: what the last
  // frame's own work (simulation + render submission, without such jobs) left of three quarters of the frame interval
  // (the display's, or the frame-rate limit's), between 0.5 ms (it always gets on) and max
  // FRAME-2: the display's refresh as requestAnimationFrame shows it (ms, median of the last 32 intervals)
  refreshMs() { return this._refresh || this._vsync || null; }

  spareMs(max) {
    const frame = Math.max(this.frameCapMs || 0, this._vsync || 1000 / 60);
    return Math.max(0.5, Math.min(max, 0.75 * frame - (this._workMs ?? 0)));
  }

  // Deterministic stepping for automated tests: game.step(seconds).
  step(seconds, dt = 1 / 60) {
    this._transBudget = null;
    for (let t = 0; t < seconds; t += dt) this.frame(dt, false);
  }

  frame(dt, render) {
    this.time += dt;
    if (this.played != null && PLAYED.has(this.state)) this.played += dt;   // (SAVE-SLOTS: play time, shown in the save slots)
    const input = this.input;
    input.update();

    this.updateTransition(dt);
    driveMouth(this);   // (FACES-HANDS: the speaker's mouth follows the voice's syllables)

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
          h.syncSword(); h.rig.play(sp === h ? 'talk' : sp ? 'listen' : 'idle'); h.rig.update(dt, 0); h.sync();
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
        if (!this.menuNav() && this.state === 'pause' && input.pressed('pause')) this.act('resume');
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
    if (this.room) for (const u of this.room.updaters) u(dt, this.time, this.particles);   // (3rd: the area's vents and the like puff through it)
    if (!this._inner) this.lightPool.update(this.state === 'title' || this.state === 'loading' ? this.camera.position : focus, this.time);
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

  // returns true when it used the pause key (Esc / Menu: Back on the save-slot screens)
  menuNav() {
    const btns = this.menuButtons();
    if (!btns.length || this._rebindOff) return false; // (while a key is awaited, the keys belong to the rebinding)
    const i = this.input;
    // the save-slot screens (SAVE-SLOTS): Esc or a pad's B goes back one screen
    if (SLOT_SCREENS.has(this.screen) && (i.pressed('pause') || (i.lastDevice === 'pad' && i.pressed('dodge')))) { this.audio.play('select'); this.act('back'); return true; }
    // a pad's B goes back from a child menu (Esc keeps its meaning: in the pause menus it resumes)
    if (i.lastDevice === 'pad' && i.pressed('dodge') && (this.screen === 'settings' || this.screen === 'controls')) { this.audio.play('select'); this.act('back'); return false; }
    if (this.screen === 'settings' && this.settingsNav(btns)) return false;
    if (this.screen === 'loadgame' && this.slotNav(btns)) return false;
    if (i.pressed('down')) { this.menuSel = (this.menuSel + 1) % btns.length; this.focusMenu(true); this.audio.play('blip'); }
    if (i.pressed('up')) { this.menuSel = (this.menuSel + btns.length - 1) % btns.length; this.focusMenu(true); this.audio.play('blip'); }
    if (i.pressed('interact') || i.pressed('action') || i.pressed('recenter')) { this.audio.init(); btns[this.menuSel]?.click(); }
    return false;
  }

  titleCamera(dt) {
    const a = this.time * 0.05 + 2.2;
    this.camRig.override = { pos: new THREE.Vector3(Math.cos(a) * 110, 42, Math.sin(a) * 110), look: new THREE.Vector3(0, 4, 0) };
    if (!this._titleInit) { this._titleInit = true; this.camera.position.copy(this.camRig.override.pos); }
    this.camRig.update(dt, this.hero.pos, 0, false, null);
    for (const n of this.npcs) n.update(dt);
  }

  updatePlay(dt) {
    this.talkers?.clear();
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
    const stopped = this.hitStop > 0;
    if (stopped) { this.hitStop -= dt; dt *= 0.1; }
    this.combatDir.update(dt);
    if (input.pressed('recenter')) this.camRig.recenter();
    if (input.pressed('view')) this.camRig.toggleView();
    this.saveTimer -= dt;
    this.doorCool -= dt;

    h.update(dt, input);
    if (this.state !== 'play') return;
    // (ACTION-FEEL: a blow that lands in this frame holds the rest of it too, so the struck enemy's reaction starts after
    // the held impact: it jumped 8 cm on the contact frame, stood 3 frames, then went on. The hold's length is unchanged)
    if (!stopped && this.hitStop > 0) { this.hitStop -= dt; dt *= 0.1; }
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
    if (this._jumpHintT > 0 && (this._jumpHintT -= dt) <= 0) this.hud.toast('hint_jump', { b: this.hud.key('b2'), k: this.hud.key('action') });
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
const BG_FPS = 8;   // (PERF-BATTERY: frames a second drawn while the window is in the background)
const LIMIT_TOL_MS = 1.5;   // (FRAME-2: the frame-rate limit's tolerance for requestAnimationFrame's jitter)
function medianOf(a, n) { const b = Array.from(a.subarray(0, n)).sort((x, y) => x - y); return n ? b[n >> 1] : 0; }
const TEX_SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'bumpMap', 'alphaMap'];
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
// LAZY-REGIONS: reference times (ms, the development container, quiet) of the startup's steps — Citadel's build
// steps (world.js buildWorldSteps), the town's dressing, the story and cast — for the bar's pace on this computer
const BUILD_REF = { world: [120, 520, 140, 30, 260, 70, 5, 5, 5, 5, 3, 3, 1, 1, 2, 2, 30, 70, 380, 2, 15], town: 450, story: 220 };
BUILD_REF.total = BUILD_REF.world.reduce((a, b) => a + b, 0) + BUILD_REF.town + BUILD_REF.story;
// the startup bar from `a` to `b`: each step moves it by its share, animated over the step's estimated time at the
// pace measured so far (the last start's pace before any step is measured), so it moves while a step blocks
class BootBar {
  constructor(a, b, total) { this.a = a; this.b = b; this.total = total; this.done = 0; this.ref = 0; this.real = 0; }
  pace() { return this.ref >= 1000 ? Math.min(30, Math.max(0.2, this.real / this.ref)) : (loadEst.pace || 1); }
  async step(label, ref) {
    (BootBar.timeline ||= []).push([Math.round(performance.now()), label]);   // (when each step began: loadTimes.timeline)
    loadingStep(label);
    this.done += ref;
    loadBar(this.a + (this.b - this.a) * Math.min(1, this.done / this.total), Math.max(150, ref * this.pace()));
    await nextPaint();
  }
  measured(ref, ms) { this.ref += ref; this.real += ms; }
}
// LAZY-REGIONS: the loading card of a scene change into an area not built yet (or of a load): the loading screen
// itself over the black fade, its bar moving per area at its estimated pace (shown after a short delay, so a quick
// build is only black)
const inText = (id) => placeName(id).replace(/^The /, 'the ');   // (a place's name inside a sentence)
const arriveText = (id) => (REGION_KEY[id] || /^isle_/.test(id) ? `Arriving at ${inText(id)}…` : `Entering ${inText(id)}…`);
class ArriveCard {
  constructor(text, now = false) {
    this.el = document.querySelector('#loading'); this.text = text;
    const f = document.querySelector('#load-fill'); if (f) { f.style.transition = 'none'; f.style.transform = 'scaleX(0.03)'; void f.getBoundingClientRect(); }   // (the bar starts from the left, not from the last load's end)
    loadingStep(text);
    this.el?.classList.add('art', 'arrive'); this.el?.classList.toggle('now', now); this.el?.classList.remove('hidden');
  }
  step(i, n, est) { loadingStep(this.text); loadBar(0.05 + 0.85 * ((i + 1) / n), Math.max(150, est)); }
  fail(msg) { loadingStep(msg); }
  hide() { this.el?.classList.add('hidden'); this.el?.classList.remove('arrive', 'now'); }
}
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
Promise.all([noBake ? Promise.resolve(false) : loadBake(window.LBA_BAKE_URL || 'assets/bake.bin').catch(() => false), preloadCharacters(), preloadLba1Rooms(), preloadIslands()]).then(() => { loadBar(0.22); return splashDone; }).then(async () => { if (SPLASH_MS) await new Promise((r) => setTimeout(r, 1200)); loadingStep('Building Citadel…'); loadBar(0.25); await nextPaint(); window.game = new Game(); });

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
