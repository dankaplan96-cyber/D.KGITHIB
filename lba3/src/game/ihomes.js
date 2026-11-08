// ISLE-HOMES (the user, 7.11.2026: "Zeelich is unfinished: missing doors"; wave 3 of the maturity pack): the house doors
// of Zeelich's islands (zislands.js R.shutDoors: 58 answered the generic "Locked.") and of Kesh on Desert Island
// (desert.js: its five houses and the project post's three cabins) lead into compact rooms that fit who lives or works
// there, or say plainly why they stay shut, with a sign on the door that shows it (EXCEPT below).
//
// Each room is its own lazy group (regions.js: built the first time its door is used, kept after), far from everything
// else at IHOME_AT. The shell is zhomes.js esmerRoom (pale stucco over a dado, the door in the left far wall, low near
// rims: LBA2's cut-away rooms) in the island's own style (STYLE: Esmer, the Francos' timber, the Mosquibees' wax, the
// Wannies' stone, Kesh's adobe, the project's prefab panels). Its furniture comes from its kind (KIND: a home, a shop,
// a workshop…), placed against the walls by a small planner that keeps the door's way in clear and skips what does not
// fit a small room (props.js, roomdress.js pieces; nothing new is modelled). Two things in each room can be looked at:
// its own (the owner's, text/ihomes.js ih_<room>) and one of its kind's (ihk_<piece>). A few have a keeper behind the
// counter (KEEPER: story/ihomes.js places and voices them; defined only once their room is built).
//
// CONTRACT
//   IHOMES: { [doorId]: { k: kind, keeper?: id } | { ex: line key, sign: word } }   (doorId: the region's shutDoors id)
//   IHOME_IDS [roomId]; IHOME_AT { roomId: {x, z} }; roomOf(doorId) → roomId; doorOf(roomId) → doorId; regionOf(doorId)
//   buildIHome(roomId)(scene, physics) → { [roomId]: R }; IH[roomId] (when built): { looks [{x, z, r, key}], npcSpots }
//   KEEPERS { id: { room, char, color } }; EXCEPT: the door ids that stay shut (their line, their sign)
import * as THREE from 'three';
import { esmerRoom } from './zhomes.js';
import { MAT, rbox, plane, cyl, sphere, canvasTex, table, chair, bed, bookcase, desk, deskLamp, officeChair, ledger, papers,
  filingCabinet, kettle, pot, jar, crate, barrel, pottedPlant, rug, hangingLamp, wallShelf, frame, counter, chest, plate,
  wardrobe, dresser, bench, stove, potStove, workbench, toolBoard, chalkboard, cargoCrate, locker, radio, gauge, valveWheel, curioShelf } from './props.js';
import { sackPile, basket, hanging, goodsShelf, boxStack, shelfGoods } from './roomdress.js';
import { rng } from '../engine/math.js';

// ---------------------------------------------------------------- who is behind each door
// Otringal (the Esmers' capital): the plaza, the south terrace, the high town, the lower town and the harbour
// Knartas (the Francos' island): the harbour, the diggers' village; Mosquibee Island; Celebration; under Celebration
// (the Wannies' gas works); the Platform (the Wannies' village and mine); the Orchard's press house; Kesh; the post
export const IHOMES = {
  'otringal-6--29': { k: 'home' },             // the tile-setter's house (south terrace)
  'otringal--4--60': { k: 'school' },          // the terrace school
  'otringal--1--53': { k: 'tailor' },          // Mr Tanek's cutting room (he sells his cloth on the plaza)
  'otringal-3--59': { k: 'home' },             // Ulla the fruit seller's home
  'otringal-17--71': { k: 'home' },            // the sweeper's room
  'otringal-63--45': { k: 'shop', keeper: 'ih_ossa' },   // the high town market
  'otringal-45--52': { k: 'office' },          // a council clerk's flat and desk
  'otringal-55--47': { k: 'home' },            // a big family's flat
  'otringal-63--52': { k: 'office' },          // the lift attendants' office
  'otringal-59--60': { k: 'home' },            // a horn player's home
  'otringal-47--68': { k: 'library' },         // the high town's reading room
  'otringal-52--60': { k: 'clinic' },          // the high town clinic
  'otringal--55--15': { k: 'warehouse' },      // the harbour store
  'otringal-6--24': { k: 'cafe', keeper: 'ih_liwa' },    // the plaza's tea room
  'otringal-4-26': { k: 'office' },            // the shuttle dispatcher's office by the pad
  'otringal--21--10': { k: 'laundry' },        // the hotel's laundry, next door to it
  'otringal-16-6': { ex: 'ihx_pump', sign: 'PUMP HOUSE' },   // the fountain's pump house: 2.5 m wide, valves only
  'otringal-4--11': { k: 'post', keeper: 'ih_dobb' },    // the post office across from the hotel
  'otringal--49-55': { k: 'home' },            // a dock worker's family (lower town)
  'otringal-4-31': { k: 'hall' },              // the lower town's meeting hall
  'otringal--2-56': { k: 'shop', keeper: 'ih_brem' },    // the trading post
  'otringal-3-65': { k: 'glazier' },           // the glass-block maker
  'otringal-12-43': { k: 'home' },             // an old couple's home
  'otringal-40-43': { k: 'warehouse' },        // the quay's cargo store
  'knartas--30--18': { k: 'office' },          // Quill the harbourmaster's office
  'knartas-33--14': { k: 'canteen', keeper: 'ih_gorrin' },   // the diggers' canteen
  'knartas-25--22': { k: 'home' },
  'knartas-25--20': { k: 'home' },
  'knartas-33--20': { k: 'store' },            // the diggers' tool store
  'knartas-19--20': { k: 'home' },             // the fishing family's home (Quill's neighbours)
  'knartas-19--22': { k: 'home' },             // the net-mender's
  'knartas-28--36': { k: 'smokehouse' },
  'knartas-14--36': { k: 'store' },            // the rope and sail store
  'knartas-36--20': { k: 'home' },
  'knartas-37--14': { k: 'bunkhouse' },        // the diggers' bunkhouse
  'knartas-28-29': { k: 'gems' },              // the gem-sorting room
  'knartas-21-19': { k: 'workshop' },          // the tool mender
  'knartas-22-15': { k: 'home' },              // the dig foreman's house
  'knartas-16-18': { k: 'home' },
  'knartas-16-24': { k: 'home' },
  'knartas-9-32': { k: 'hall' },               // the village hall
  'knartas-38-36': { k: 'home' },
  'knartas-44-37': { k: 'store' },             // the gas cans' store
  'knartas-35-12': { k: 'workshop' },          // the boat repairer
  'mosquibee--15-28': { k: 'hive' },           // the honey room
  'mosquibee-37-38': { ex: 'ihx_cell', sign: 'HONEY' },   // two curing cells, 1.9 m wide, sealed with wax
  'mosquibee-32-26': { ex: 'ihx_cell', sign: 'HONEY' },
  'mosquibee-26-15': { k: 'hive' },            // the hive keepers' hall
  'celebration--9-4': { k: 'festival' },       // the lantern makers' store
  'undergas-8--39': { k: 'gasworks' },         // the gas works' gauge room
  'platform--24--27': { k: 'home' },
  'platform-27--31': { k: 'company', keeper: 'ih_tesk' },  // the Building Company's office
  'platform-27--38': { k: 'warehouse' },       // the ore store at the tower's foot
  'platform-27-12': { k: 'home' },
  'platform-35-15': { k: 'home' },
  'platform-30-27': { k: 'chapel' },           // the Wannies' chapel
  'platform-50-46': { k: 'workshop' },         // the lamp mender by the shore
  'orchard-4-28': { k: 'press' },              // the press house
  'kesh-house0': { k: 'trader', keeper: 'ih_dela' },   // Brosk's house: Dela, his wife, keeps the stock
  'kesh-house1': { k: 'weaver' },              // Lumi's weaving room
  'kesh-house2': { k: 'home', keeper: 'ih_jorr' },     // Mother Tarra's house: Jorr, her son, keeps the water tally
  'kesh-house3': { k: 'home', keeper: 'ih_nima' },     // Safi's family (the water carriers): Nima, her mother
  'kesh-house4': { k: 'lodging', keeper: 'ih_hanna' }, // Hesk's lodging: Old Hanna lets the beds
  'post-cabin0': { k: 'pobox' },               // the project post's office
  'post-cabin1': { k: 'postbunk', shut: 'storm' },   // (chapter 4: the gate guard waits out a sandstorm in here: story/ihomes.js)
  'post-cabin2': { k: 'poststore' },
  // the Hamalayi (DOOR-SWEEP, original-mechanics wave 3: their doors were drawn and did nothing): the landing's hut,
  // Lhar's five stone houses, the observatory keeper's house (hamalayi.js R.shutDoors)
  'ham-landing0': { k: 'lodging' },            // the landing's hut: glider harnesses, the keeper's bunk
  'ham-lhar0': { k: 'home' },                  // Bero's family (his grandfather built it)
  'ham-lhar1': { k: 'hall' },                  // Yorna's house, where the village meets
  'ham-lhar2': { k: 'home' },                  // Old Dorje's
  'ham-lhar3': { k: 'weaver' },                // Sana weaves the prayer flags
  'ham-lhar4': { k: 'canteen' },               // Lhamo's kitchen, soup for the street
  'ham-obs0': { k: 'library' },                // the observatory keeper's house: charts and logbooks
  // DESERT-BAR (8.11): Desert Island's kept old houses (desertold.js). S28 is the dig crew's bunkhouse; the great hall in
  // the School's pool is the pupils' dormitory, open once their study crystal is awake (dark inside before: they knock
  // back through the door, story/purposes.js). S40, Bashir's home, stays shut with its own line (his granddaughter at the
  // shutters).
  's28': { k: 'bunkhouse', style: 'crew', keeper: 'ih_brann' },
  'hall': { k: 'dorm', style: 'school', shut: 'lamp', keeper: 'ih_joss' },
};
export const EXCEPT = new Set(Object.keys(IHOMES).filter((d) => IHOMES[d].ex));
export const roomOf = (d) => 'ih_' + d.replace(/--/g, '_m').replace(/-/g, '_');
const DESERT_OLD = new Set(['s28', 'hall']);   // (desertold.js's kept old houses)
export const regionOf = (d) => (d.startsWith('kesh-') || d.startsWith('post-') || DESERT_OLD.has(d) ? 'desert' : d.startsWith('ham-') ? 'hamalayi' : 'isle_' + d.split('-')[0]);
export const IHOME_IDS = Object.keys(IHOMES).filter((d) => !EXCEPT.has(d)).map(roomOf);
const DOOR = Object.fromEntries(Object.keys(IHOMES).map((d) => [roomOf(d), d]));
export const doorOf = (r) => DOOR[r] || null;
// far from every other place (regions.js AT: up to x ≈ 10 100), 50 m apart (a room is at most 8 m across)
export const IHOME_AT = Object.fromEntries(IHOME_IDS.map((r, i) => [r, { x: 10400 + (i % 12) * 50, z: -800 - Math.floor(i / 12) * 50 }]));
// the keepers (story/ihomes.js): their room, their look
export const KEEPERS = {
  ih_ossa: { room: roomOf('otringal-63--45'), char: 'ztri1', color: '#c8b0f0' },
  ih_liwa: { room: roomOf('otringal-6--24'), char: 'nara', color: '#f0c0a8' },
  ih_dobb: { room: roomOf('otringal-4--11'), char: 'clerk', color: '#a8c0e0' },
  ih_brem: { room: roomOf('otringal--2-56'), char: 'oku', color: '#e0c890' },
  ih_gorrin: { room: roomOf('knartas-33--14'), char: 'keeper', color: '#e0a870' },
  ih_tesk: { room: roomOf('platform-27--31'), char: 'zmole1', color: '#b8c8a0' },
  // DESERT-BAR: Kesh's homes and the old houses have their people (no counter: each stands at the piece of the room that
  // is their work, `stand`); their lines follow Kesh's state (story/kesh.js lifePhase); `when`: not there in some states
  ih_dela: { room: roomOf('kesh-house0'), char: 'weaver', color: '#f0b890', stand: 'jars', phase: 'kesh' },
  ih_jorr: { room: roomOf('kesh-house2'), char: 'farmerA', color: '#d8c090', stand: 'jars', phase: 'kesh' },
  ih_nima: { room: roomOf('kesh-house3'), char: 'lharWoman', color: '#e8a8b8', stand: 'jars', phase: 'kesh' },
  ih_hanna: { room: roomOf('kesh-house4'), char: 'tarra', color: '#c8b0e0', stand: 'mats', phase: 'kesh' },
  ih_brann: { room: roomOf('s28'), char: 'worker', color: '#e8c070', stand: 'table', phase: 'kesh', when: 'crew' },
  ih_joss: { room: roomOf('hall'), char: 'desertkid_b', color: '#b8c8ff', stand: 'bookcase', phase: 'kesh' },
};
export const IH = {};

// ---------------------------------------------------------------- styles by place
const ESMER_WALLS = ['#eadcd2', '#e6dad0', '#ece0e6', '#e2d8cc', '#e8dcc8'], ESMER_DADO = ['#2f7a84', '#3a8a7a', '#5a6a9a', '#7a5a7a', '#2f6a9a'];
function styleOf(door, r) {
  const isle = door.split('-')[0];
  const pick = (a) => a[Math.floor(r() * a.length)];
  if (isle === 'knartas') return { wall: pick(['#e8d8c0', '#e2ccae', '#ead8b8']), dado: pick(['#7a5a3a', '#6a4a3a', '#5a6a5a']), floorMat: MAT.planks('honey'), band: false, frame: '#7a5a3a', light: '#ffe2b8', cap: '#d8c4a4' };
  if (isle === 'mosquibee') return { wall: '#f4e4b0', dado: '#c8902a', floor: ['#e8c878', '#d8b060', '#a87a2a'], band: false, frame: '#c8902a', light: '#fff0c0', cap: '#e8d090' };
  if (isle === 'platform' || isle === 'undergas') return { wall: pick(['#d0c8c0', '#c8c0b4']), dado: '#5a5a6a', floor: ['#a8a4a0', '#98948e', '#5a5856'], band: false, frame: '#5a5a6a', light: '#ffe0b0', cap: '#b8b0a8' };
  if (IHOMES[door]?.style === 'crew') return { wall: '#e2cba8', dado: '#6a5a4a', floorMat: MAT.planks('dark'), band: false, frame: '#5a4a3a', light: '#ffe0b0', cap: '#cdb898', music: 'desert_in' };   // (the tower's lower storey: stone, the crew's planks)
  if (IHOMES[door]?.style === 'school') return { wall: '#c8c0b4', dado: '#2f5a8a', floor: ['#8a8478', '#7a7468', '#4a4640'], band: true, frame: '#2f4a6a', light: '#d8f0ff', cap: '#b8b0a4', music: 'desert_in' };   // (the School's grey stone, its blue; the crystal's cool light)
  if (door.startsWith('kesh-')) return { wall: pick(['#ecd0a8', '#e8c8a0', '#f0d4b0']), dado: '#2f7a9a', floor: ['#d89a6a', '#c88a5a', '#8a5a3a'], band: false, frame: '#7a5a3a', light: '#ffe0b0', cap: '#e0bc90', music: 'desert_in' };
  if (door.startsWith('ham-')) return { wall: pick(['#e8dccb', '#e2d4c0', '#ecdcc4']), dado: pick(['#6a4a32', '#5a3a2a', '#7a5a3a']), floorMat: MAT.planks('dark'), band: false, frame: '#5a3a2a', light: '#ffd8a8', cap: '#d8c8b0', music: 'home' };   // (the Hamalayi: whitewashed stone, dark timber, a warm hearth light)
  if (door.startsWith('post-')) return { wall: '#dae6e6', dado: '#2a8a8a', floor: ['#9aa4aa', '#8a949a', '#5a6268'], band: false, frame: '#2a3a44', light: '#eef8ff', cap: '#c8d4d4', music: 'desert_in' };
  return { wall: pick(ESMER_WALLS), dado: pick(ESMER_DADO), floor: pick([['#d8c8b4', '#c4ae96', '#3a6a7a'], ['#d4c8c0', '#c0b2a8', '#3a7a6a'], ['#c8d0d8', '#b4bcc8', '#4a5a7a']]), band: true, frame: '#2f7a84', light: '#ffe8cc', cap: '#e4d6cc' };
}

// ---------------------------------------------------------------- the pieces: drawn at the origin, back to −z, front +z
// each: fw (along the wall), fd (depth), walls it may stand against ('back' 'right' 'left' 'near', 'row': a counter
// across the room with room behind it, 'mid': free in the room), and draw(k, r) → its footprint. A piece with a front
// (shelves, stoves, desks) stands only against the two far walls: the near ones are low rims the camera looks over, and
// it would show its back
const quilts = [['#3a7ac8', '#e8dcc0', '#7a4aa8', '#e8dcc0', '#3a7ac8'], ['#c8a0f4', '#f2ead6', '#f4a0c8', '#f2ead6', '#3a8a7a'], ['#a8582a', '#e8c088', '#5a3a2a', '#e8c088', '#a8582a'], ['#2f6a9a', '#f2ead6', '#c8452f', '#f2ead6', '#2f6a9a']];
const P = {
  bed: { fw: 1.2, fd: 2.0, at: ['right', 'back', 'near'], draw: (k, r) => bed(k, { w: 1.1, l: 1.9, pal: r() < 0.5 ? 'dark' : 'honey', quilt: quilts[Math.floor(r() * quilts.length)] }) },
  cot: { fw: 0.95, fd: 1.95, at: ['back', 'right'], draw: (k) => bed(k, { w: 0.85, l: 1.85, pal: 'pale', quilt: ['#f2f2ee', '#dfe8ee', '#f2f2ee', '#dfe8ee', '#f2f2ee'] }) },
  bunk: { fw: 1.0, fd: 2.0, at: ['right', 'back', 'near'], draw: (k, r) => { const m = MAT.wood('dark'), c = ['#a8582a', '#3a6a8a', '#6a7a4a'][Math.floor(r() * 3)]; for (const y of [0.35, 1.35]) { k.add(rbox(0.95, 0.12, 2.0, 0.02), m, 0, y, 0); k.add(rbox(0.85, 0.12, 1.9, 0.03), MAT.cloth(c, '#e8c088'), 0, y + 0.1, 0); } for (const sz of [-1, 1]) for (const sx of [-1, 1]) k.add(rbox(0.08, 1.8, 0.08, 0.01), m, sx * 0.45, 0.9, sz * 0.96); return { hw: 0.5, hd: 1.0, top: 1.8 }; } },
  table: { fw: 2.3, fd: 0.95, at: ['mid'], draw: (k, r) => { const pal = r() < 0.5 ? 'honey' : 'dark'; table(k, { w: 1.2, d: 0.8, pal }); for (const s of [-1, 1]) k.at(s * 0.95, 0, 0, -s * Math.PI / 2, () => chair(k, { pal, cushion: ['#c8452f', '#2f6a9a', '#3a8a7a'][Math.floor(r() * 3)] })); plate(k, -0.25, 0.78, 0, 0, '#e8dcc0', 0.11, false); pot(k, 0.2, 0.78, 0.05, { r: 0.1, h: 0.12 }); return { hw: 1.15, hd: 0.45, top: 0.78 }; } },
  stove: { fw: 1.3, fd: 0.7, at: ['back', 'left'], draw: (k) => { stove(k); kettle(k, -0.28, 0.85, 0.02); return { hw: 0.64, hd: 0.35, top: 0.9 }; } },
  potstove: { fw: 0.9, fd: 0.9, at: ['back', 'left'], draw: (k) => potStove(k) },
  shelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k, r) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'honey', seed: Math.floor(r() * 99) }) },
  bookcase: { fw: 1.15, fd: 0.4, at: ['back', 'left'], draw: (k, r) => bookcase(k, { w: 1.1, h: 2.1, d: 0.34, pal: 'dark', seed: Math.floor(r() * 99), shelves: 5 }) },
  wardrobe: { fw: 1.3, fd: 0.7, at: ['back', 'left'], draw: (k, r) => wardrobe(k, { w: 1.2, d: 0.6, h: 2.0, pal: r() < 0.5 ? 'honey' : 'dark' }) },
  dresser: { fw: 1.5, fd: 0.55, at: ['back', 'left'], draw: (k) => dresser(k, { w: 1.4, pal: 'honey' }) },
  chest: { fw: 0.95, fd: 0.55, at: ['near', 'back', 'right', 'left'], draw: (k, r) => chest(k, { w: 0.85, d: 0.48, h: 0.45, pal: r() < 0.5 ? 'dark' : 'red' }) },
  desk: { fw: 1.5, fd: 1.4, at: ['back', 'left'], draw: (k, r) => { k.at(0, 0, -0.3, 0, () => desk(k, { w: 1.4, d: 0.7, pal: 'dark', leather: '#2f5a6a' })); k.at(-0.4, 0.78, -0.4, 0, () => deskLamp(k, { shade: '#2f7a84' })); ledger(k, 0.25, 0.78, -0.3, 0.2, '#2a4a6a'); papers(k, 0.5, 0.78, -0.25, 3, Math.floor(r() * 9), 'form'); k.at(0, 0, 0.45, Math.PI, () => officeChair(k, { color: '#2f5a6a' })); return { hw: 0.72, hd: 0.7, top: 0.8 }; } },
  filing: { fw: 0.55, fd: 0.66, at: ['back', 'left'], draw: (k) => filingCabinet(k, { w: 0.5, d: 0.6, h: 1.3, n: 4, color: '#6a8a8a' }) },
  counter: { fw: 2.4, fd: 0.75, at: ['row'], keeper: true, draw: (k, r) => { counter(k, { w: 2.2, d: 0.62, h: 1.0, pal: r() < 0.5 ? 'honey' : 'dark' }); return { hw: 1.15, hd: 0.36, top: 1.05 }; } },
  workbench: { fw: 2.1, fd: 0.85, at: ['back', 'left'], wallTop: true, draw: (k) => { const fp = workbench(k, { w: 2.0, d: 0.78, h: 0.9 }); k.at(0, 1.55, -0.36, 0, () => toolBoard(k, 1.8, 0.7)); return fp; } },
  crates: { fw: 1.4, fd: 0.75, at: ['near', 'right', 'back', 'left'], draw: (k, r) => { const s = 0.62; k.at(-0.34, 0, 0, r() * 0.2, () => crate(k, s, { pal: 'pale' })); k.at(0.34, 0, 0.02, r() * 0.2, () => crate(k, s * 0.9, { pal: 'honey' })); if (r() < 0.6) k.at(-0.3, s, 0, r() * 0.3, () => crate(k, s * 0.8, { pal: 'pale' })); return { hw: 0.68, hd: 0.36, top: 1.2 }; } },
  bigcrates: { fw: 2.0, fd: 1.2, at: ['back', 'right', 'near'], draw: (k, r) => { for (let i = 0; i < 3; i++) k.at(-0.66 + i * 0.66, 0, -0.25, 0, () => { cargoCrate(k, { w: 0.62, h: 0.62, d: 0.62, color: ['#3f6a8a', '#c8762f', '#4a6e62'][i] }); if (r() < 0.7) k.at(0, 0.62, 0, 0.1, () => cargoCrate(k, { w: 0.55, h: 0.5, d: 0.55, color: '#8a6a3a' })); }); k.at(-0.4, 0, 0.35, 0.2, () => crate(k, 0.5, { pal: 'pale' })); return { hw: 1.0, hd: 0.6, top: 1.3 }; } },
  barrels: { fw: 1.4, fd: 0.7, at: ['near', 'right', 'back', 'left'], draw: (k) => { for (const s of [-1, 1]) k.at(s * 0.34, 0, 0, 0, () => barrel(k, { r: 0.3, h: 0.8, pal: s > 0 ? 'dark' : 'honey' })); return { hw: 0.66, hd: 0.32, top: 0.8 }; } },
  sacks: { fw: 1.05, fd: 0.9, at: ['near', 'back', 'right', 'left'], draw: (k, r) => sackPile(k, { seed: Math.floor(r() * 50) }) },
  boxes: { fw: 0.8, fd: 0.65, at: ['near', 'back', 'right', 'left'], draw: (k, r) => boxStack(k, { n: 3, seed: Math.floor(r() * 50), w: 0.6 }) },
  plant: { fw: 0.6, fd: 0.6, at: ['near', 'back', 'right'], draw: (k, r) => pottedPlant(k, { kind: r() < 0.5 ? 'spiky' : 'leafy', s: 1.0, potColor: '#3a7a8a' }) },
  pews: { fw: 3.4, fd: 2.6, at: ['mid'], draw: (k) => { for (const z of [-0.8, 0.5]) for (const x of [-0.85, 0.85]) k.at(x, 0, z, 0, () => bench(k, { w: 1.5, pal: 'dark' })); return { hw: 1.7, hd: 1.15, top: 0.5 }; } },
  pew: { fw: 1.6, fd: 0.5, at: ['mid', 'near'], draw: (k) => { bench(k, { w: 1.5, pal: 'dark' }); return { hw: 0.78, hd: 0.22, top: 0.5 }; } },
  lectern: { fw: 1.0, fd: 0.8, at: ['back', 'left'], draw: (k) => { k.add(rbox(0.7, 1.05, 0.5, 0.04), MAT.wood('dark'), 0, 0.52, 0); k.add(rbox(0.8, 0.05, 0.55, 0.02), MAT.wood('honey'), 0, 1.1, 0.04, 0, { rx: -0.25 }); papers(k, 0, 1.13, 0.05, 2, 3, 'form'); return { hw: 0.45, hd: 0.3, top: 1.15 }; } },
  altar: { fw: 1.5, fd: 0.8, at: ['back', 'left'], draw: (k) => { k.add(rbox(1.3, 0.95, 0.6, 0.06), MAT.stone('sand'), 0, 0.48, 0); k.add(rbox(1.36, 0.05, 0.66, 0.02), MAT.cloth('#e8dcc0', '#c8a050'), 0, 0.98, 0); for (const s of [-1, 1]) { k.add(cyl(0.04, 0.05, 0.3, 8), MAT.brass(), s * 0.45, 1.16, 0); k.add(sphere(0.05, 8, 6), MAT.glow('#fff0c0', '#ffc860', 1.6), s * 0.45, 1.35, 0); } return { hw: 0.66, hd: 0.32, top: 1.0 }; } },
  chalk: { fw: 1.6, fd: 1.4, at: ['back', 'left'], draw: (k) => { k.at(0, 1.55, -0.62, 0, () => chalkboard(k, 1.5, 0.9)); k.at(0, 0, 0.1, 0, () => desk(k, { w: 1.2, d: 0.6, pal: 'honey', leather: '#3a6a4a' })); return { hw: 0.75, hd: 0.65, top: 0.8 }; } },
  cuttable: { fw: 2.0, fd: 1.0, at: ['mid', 'back'], draw: (k) => { table(k, { w: 1.8, d: 0.9, pal: 'pale' }); for (let i = 0; i < 4; i++) k.add(cyl(0.09, 0.09, 0.85, 10), MAT.cloth(['#7a4aa8', '#2f7a84', '#e8b84a', '#c8452f'][i], '#f2ead6'), -0.6 + i * 0.4, 0.88, -0.2, 0, { rz: Math.PI / 2 }); k.add(rbox(0.9, 0.01, 0.5, 0.004), MAT.cloth('#3a8ac8', '#e8dcc0'), 0.2, 0.79, 0.15); return { hw: 0.9, hd: 0.45, top: 0.85 }; } },
  clothshelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k, r) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'honey', goods: (kk, w, y, row) => { for (let i = 0; i < 4; i++) kk.add(rbox(w / 4 - 0.04, 0.16, 0.3, 0.03), MAT.cloth(['#7a4aa8', '#2f7a84', '#e8b84a', '#c8452f', '#f2ead6'][(i + row + Math.floor(r() * 3)) % 5], '#f2ead6'), -w / 2 + (i + 0.5) * w / 4, y + 0.08, 0.01); } }) },
  glassshelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'dark', goods: (kk, w, y, row) => { for (let i = 0; i < 6; i++) kk.add(rbox(0.16, 0.16, 0.16, 0.02), MAT.glass(['#bfeaf2', '#5fb0c8', '#9fd8e8'][(i + row) % 3], 0.75), -w / 2 + 0.12 + i * (w - 0.24) / 5, y + 0.08, 0.02); } }) },
  jarshelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'pale', goods: (kk, w, y, row) => { for (let i = 0; i < 6; i++) jar(kk, -w / 2 + 0.12 + i * (w - 0.24) / 5, y, 0.02, i % 2 ? 'jar' : 'bottle', ['#2f8a8a', '#c8a050', '#7a3a2a'][(i + row) % 3], 0.9); } }) },
  honeyshelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'honey', goods: (kk, w, y) => { for (let i = 0; i < 6; i++) jar(kk, -w / 2 + 0.12 + i * (w - 0.24) / 5, y, 0.02, 'jar', '#e8a830', 0.95); } }) },
  comb: { fw: 1.4, fd: 0.5, at: ['back', 'left'], draw: (k) => { const m = MAT.paint('#e8b840', 0.5); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.add(cyl(0.16, 0.16, 0.3, 6), m, -0.42 + i * 0.42 + (j % 2) * 0.21, 0.35 + j * 0.3, -0.05, 0, { rx: Math.PI / 2 }); return { hw: 0.7, hd: 0.25, top: 1.4 }; } },
  washtubs: { fw: 1.8, fd: 0.8, at: ['back', 'left'], draw: (k) => { for (const s of [-1, 1]) { k.add(cyl(0.38, 0.32, 0.5, 14, true), MAT.wood('honey'), s * 0.45, 0.25, 0); k.add(cyl(0.34, 0.34, 0.02, 14), MAT.glass('#cfe8f0', 0.6), s * 0.45, 0.44, 0); } k.add(rbox(1.6, 0.04, 0.03, 0.01), MAT.wood('dark'), 0, 1.8, -0.3); for (let i = 0; i < 4; i++) k.add(rbox(0.32, 0.5, 0.01, 0.003), MAT.cloth('#f4f0e6', '#dfe8ee'), -0.55 + i * 0.36, 1.53, -0.3); return { hw: 0.85, hd: 0.38, top: 0.55 }; } },
  linen: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'pale', goods: (kk, w, y) => { for (let i = 0; i < 3; i++) kk.add(rbox(w / 3 - 0.06, 0.18, 0.3, 0.04), MAT.cloth('#f4f0e6', '#dfe8ee'), -w / 2 + (i + 0.5) * w / 3, y + 0.09, 0.01); } }) },
  fishrack: { fw: 1.6, fd: 0.6, at: ['back', 'left'], draw: (k) => { const m = MAT.wood('dark'); for (const s of [-1, 1]) k.add(rbox(0.06, 1.9, 0.06, 0.01), m, s * 0.75, 0.95, 0); for (const y of [1.2, 1.7]) { k.add(cyl(0.025, 0.025, 1.55, 6), m, 0, y, 0, 0, { rz: Math.PI / 2 }); for (let i = 0; i < 6; i++) k.add(sphere(0.07, 6, 5), MAT.paint('#c89a5a', 0.6), -0.6 + i * 0.24, y - 0.16, 0, 0, { sy: 2.2 }); } return { hw: 0.8, hd: 0.3, top: 1.9 }; } },
  gemtable: { fw: 1.8, fd: 0.95, at: ['mid', 'back'], draw: (k) => { table(k, { w: 1.6, d: 0.85, pal: 'dark' }); for (let i = 0; i < 3; i++) { k.add(rbox(0.36, 0.04, 0.28, 0.01), MAT.wood('pale'), -0.5 + i * 0.5, 0.8, 0); for (let j = 0; j < 4; j++) k.add(sphere(0.03, 6, 5), MAT.glow(['#9ff4ff', '#ff9fd8', '#c8ff9f'][i], ['#35d8ff', '#ff4ab0', '#8aff30'][i], 0.9), -0.58 + i * 0.5 + j * 0.05, 0.84, (j % 2) * 0.06 - 0.03); } k.add(cyl(0.2, 0.2, 0.08, 14, true), MAT.steel(), 0.55, 0.82, 0.25); return { hw: 0.8, hd: 0.43, top: 0.85 }; } },
  gauges: { fw: 1.6, fd: 0.6, at: ['back', 'left'], draw: (k) => { k.add(rbox(1.5, 1.6, 0.4, 0.04), MAT.paint('#5a6a6a', 0.5), 0, 0.8, 0); for (let i = 0; i < 3; i++) k.at(-0.5 + i * 0.5, 1.25, 0.21, 0, () => gauge(k, { r: 0.13, v: 0.2 + i * 0.3, stem: false })); for (const s of [-1, 1]) k.at(s * 0.4, 0.6, 0.22, 0, () => valveWheel(k, { r: 0.14 })); k.add(cyl(0.07, 0.07, 1.4, 8), MAT.copper(), 0.82, 1.6, -0.1); return { hw: 0.75, hd: 0.25, top: 1.6 }; } },
  lanterns: { fw: 1.8, fd: 0.95, at: ['mid', 'back'], draw: (k) => { table(k, { w: 1.6, d: 0.85, pal: 'honey' }); for (let i = 0; i < 5; i++) { k.add(sphere(0.12, 10, 8), MAT.glow(['#ffb0c8', '#ffe080', '#a8e0ff', '#c8a0ff', '#ffc070'][i], ['#ff6090', '#ffc030', '#40b0ff', '#9060ff', '#ff9020'][i], 0.9), -0.6 + i * 0.3, 0.92, (i % 2) * 0.2 - 0.1, 0, { sy: 1.3 }); } return { hw: 0.8, hd: 0.43, top: 0.95 }; } },
  drums: { fw: 1.4, fd: 0.7, at: ['near', 'right', 'back'], draw: (k) => { for (const [x, r0] of [[-0.35, 0.3], [0.38, 0.24]]) { k.add(cyl(r0, r0, 0.5, 14), MAT.paint('#c8452f', 0.5), x, 0.25, 0); k.add(cyl(r0 + 0.01, r0 + 0.01, 0.02, 14), MAT.flat('#f2ead6', 0.8), x, 0.51, 0); } return { hw: 0.66, hd: 0.32, top: 0.55 }; } },
  press: { fw: 1.8, fd: 1.8, at: ['mid'], draw: (k) => { k.add(cyl(0.8, 0.85, 0.6, 18, true), MAT.wood('dark'), 0, 0.3, 0); k.add(cyl(0.7, 0.7, 0.08, 18), MAT.paint('#e8a830', 0.4), 0, 0.5, 0); for (const s of [-1, 1]) k.add(rbox(0.16, 2.0, 0.16, 0.02), MAT.wood('dark'), s * 0.9, 1.0, 0); k.add(rbox(2.0, 0.2, 0.2, 0.03), MAT.wood('dark'), 0, 2.0, 0); k.add(cyl(0.06, 0.06, 1.3, 8), MAT.iron(), 0, 1.35, 0); k.add(cyl(0.6, 0.6, 0.12, 16), MAT.wood('honey'), 0, 0.72, 0); return { r: 0.9, top: 2.1 }; } },
  vats: { fw: 1.8, fd: 0.95, at: ['back', 'right', 'near'], draw: (k) => { for (const s of [-1, 1]) k.at(s * 0.45, 0, 0, 0, () => barrel(k, { r: 0.42, h: 1.0, pal: 'dark' })); return { hw: 0.88, hd: 0.44, top: 1.0 }; } },
  loom: { fw: 1.7, fd: 1.0, at: ['back', 'right', 'mid'], draw: (k) => { const m = MAT.wood('honey'); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.08, 1.6, 0.08, 0.01), m, sx * 0.75, 0.8, sz * 0.4); for (const y of [0.7, 1.55]) k.add(cyl(0.05, 0.05, 1.5, 8), m, 0, y, -0.4, 0, { rz: Math.PI / 2 }); k.add(rbox(1.4, 0.8, 0.01, 0.003), MAT.cloth('#c8452f', '#e8dcc0'), 0, 1.12, -0.38); k.add(rbox(1.5, 0.05, 0.8, 0.01), m, 0, 0.62, 0.05); return { hw: 0.82, hd: 0.45, top: 1.6 }; } },
  woolshelf: { fw: 1.4, fd: 0.42, at: ['back', 'left'], draw: (k, r) => goodsShelf(k, { w: 1.4, h: 1.9, d: 0.38, rows: 4, pal: 'honey', goods: (kk, w, y, row) => { for (let i = 0; i < 5; i++) kk.add(sphere(0.1, 8, 6), MAT.cloth(['#c8452f', '#2f7a9a', '#e8b84a', '#f2ead6', '#7a4aa8'][(i + row) % 5], '#f2ead6'), -w / 2 + 0.14 + i * (w - 0.28) / 4, y + 0.1, 0.02); } }) },
  jars: { fw: 1.3, fd: 0.6, at: ['near', 'back', 'right', 'left'], draw: (k) => { for (let i = 0; i < 4; i++) k.add(cyl(0.2, 0.16, 0.55, 12), MAT.paint(['#c86a3a', '#d8a050', '#a85030', '#c87a4a'][i], 0.85), -0.45 + i * 0.3, 0.28, (i % 2) * 0.15 - 0.07); return { hw: 0.62, hd: 0.28, top: 0.6 }; } },
  mats: { fw: 1.0, fd: 2.0, at: ['right', 'back', 'near'], draw: (k, r) => { k.add(rbox(0.9, 0.12, 1.9, 0.05), MAT.cloth(['#c8452f', '#2f7a9a', '#e8b84a'][Math.floor(r() * 3)], '#f2e6d0'), 0, 0.06, 0); k.add(rbox(0.5, 0.12, 0.3, 0.06), MAT.cloth('#f2e6d0', '#e8d8b8'), 0, 0.17, -0.75); return { hw: 0.48, hd: 0.98, top: 0.25, low: true }; } },
  harness: { fw: 1.8, fd: 0.7, at: ['back', 'left'], draw: (k) => { k.add(rbox(1.7, 0.06, 0.06, 0.01), MAT.wood('dark'), 0, 1.7, -0.3); for (let i = 0; i < 3; i++) k.add(cyl(0.18, 0.18, 0.06, 12, true), MAT.flat('#7a4a2a', 0.9), -0.5 + i * 0.5, 1.4, -0.28, 0, { rx: Math.PI / 2 }); k.at(0.3, 0, 0, 0, () => crate(k, 0.6, { pal: 'honey' })); k.at(-0.45, 0, 0.05, 0, () => barrel(k, { r: 0.25, h: 0.7, pal: 'honey' })); return { hw: 0.85, hd: 0.33, top: 0.75 }; } },
  lockers: { fw: 1.85, fd: 0.55, at: ['back', 'left'], draw: (k) => { for (const s of [-1, 1]) k.at(s * 0.47, 0, 0, 0, () => locker(k, { w: 0.9, d: 0.5, h: 1.95 })); return { hw: 0.92, hd: 0.27, top: 1.95 }; } },
  radiodesk: { fw: 1.3, fd: 0.7, at: ['back', 'left'], draw: (k) => { table(k, { w: 1.2, d: 0.6, pal: 'dark' }); k.at(0, 0.78, -0.05, 0, () => radio(k, { s: 1.2 })); return { hw: 0.6, hd: 0.3, top: 0.78 }; } },
  pigeon: { fw: 1.2, fd: 0.42, at: ['back', 'left'], draw: (k) => goodsShelf(k, { w: 1.2, h: 2.0, d: 0.36, rows: 5, pal: 'dark', goods: (kk, w, y) => { for (let i = 0; i < 5; i++) kk.add(rbox(0.18, 0.12, 0.02, 0.004), MAT.flat(['#f2ead6', '#e8dcc0', '#dfe8ee'][i % 3], 0.9), -w / 2 + 0.12 + i * (w - 0.24) / 4, y + 0.07, 0.1, 0, { rx: -0.3 }); } }) },
  cafetables: { fw: 2.6, fd: 1.2, at: ['mid'], draw: (k, r) => { for (const s of [-1, 1]) k.at(s * 0.75, 0, 0, 0, () => { table(k, { w: 0.75, d: 0.75, pal: 'pale', round: true }); for (const c of [-1, 1]) k.at(c * 0.6 * 0.0 + 0, 0, c * 0.55, c > 0 ? Math.PI : 0, () => chair(k, { pal: 'pale', cushion: '#2f7a84' })); k.add(cyl(0.05, 0.04, 0.09, 10), MAT.paint('#f2ead6', 0.4), 0.1, 0.83, 0); }); return { hw: 1.25, hd: 0.55, top: 0.78 }; } },
};

// ---------------------------------------------------------------- what each kind of room holds (the first piece is
// its own: its look is the room's own line; the second piece has its kind's look)
const KIND = {
  home: ['bed', 'table', 'stove', 'chest', 'shelf', 'plant'],
  school: ['chalk', 'pews', 'pew', 'bookcase', 'plant'],
  tailor: ['cuttable', 'clothshelf', 'wardrobe', 'boxes'],
  shop: ['counter', 'shelf', 'shelf', 'crates', 'sacks', 'barrels'],
  office: ['desk', 'filing', 'bookcase', 'table', 'plant'],
  company: ['counter', 'desk', 'filing', 'shelf', 'crates'],
  library: ['bookcase', 'bookcase', 'table', 'bookcase', 'plant'],
  clinic: ['cot', 'jarshelf', 'cot', 'desk'],
  warehouse: ['bigcrates', 'barrels', 'crates', 'sacks', 'boxes', 'crates'],
  cafe: ['counter', 'cafetables', 'shelf', 'plant'],
  laundry: ['washtubs', 'linen', 'sacks', 'chest'],
  post: ['counter', 'pigeon', 'sacks', 'filing'],
  hall: ['lectern', 'pews', 'pew', 'plant', 'chest'],
  glazier: ['workbench', 'glassshelf', 'crates', 'barrels'],
  canteen: ['counter', 'table', 'potstove', 'barrels', 'sacks'],
  store: ['workbench', 'crates', 'barrels', 'sacks', 'boxes'],
  smokehouse: ['fishrack', 'barrels', 'potstove', 'sacks'],
  bunkhouse: ['bunk', 'bunk', 'chest', 'table', 'bunk'],
  gems: ['gemtable', 'crates', 'shelf', 'sacks'],
  workshop: ['workbench', 'shelf', 'crates', 'barrels'],
  hive: ['comb', 'honeyshelf', 'barrels', 'honeyshelf', 'sacks'],
  festival: ['lanterns', 'drums', 'shelf', 'boxes'],
  gasworks: ['gauges', 'barrels', 'desk', 'crates'],
  chapel: ['altar', 'pews', 'pew', 'pew'],
  press: ['press', 'vats', 'barrels', 'crates'],
  trader: ['jars', 'sacks', 'bed', 'table', 'crates'],
  weaver: ['loom', 'woolshelf', 'mats', 'chest'],
  lodging: ['harness', 'mats', 'chest', 'jars'],
  pobox: ['desk', 'radiodesk', 'filing', 'lockers'],
  dorm: ['bookcase', 'bunk', 'table', 'bunk', 'chest', 'bunk'],   // (DESERT-BAR: the pupils' dormitory: their books first, its look)
  postbunk: ['bunk', 'lockers', 'bunk', 'table'],
  poststore: ['bigcrates', 'barrels', 'crates', 'lockers'],
};
// Kesh's homes keep their own: Mother Tarra's and Safi's lay mats and water jars rather than an Esmer bed and stove
const KESH_HOME = ['mats', 'jars', 'table', 'chest', 'mats'];

// ---------------------------------------------------------------- the room
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function build(rid, scene, physics) {
  const door = DOOR[rid], spec = IHOMES[door], r = rng([...rid].reduce((s, c) => s * 31 + c.charCodeAt(0) | 0, 7) >>> 0);
  const S = styleOf(door, r), dims = SIZE[door] || { w: 5, d: 5 };
  // the room inside the building's walls: its depth runs away from the door (x), its width along the front (z)
  // (at least 4.2 × 3.6: the door's way in, a bed and a stove; a hut smaller than that is a little bigger inside, as
  //  LBA's rooms often are)
  const W = +clamp(dims.d - 0.7, 4.2, 8.0).toFixed(2), D = +clamp(dims.w - 0.7, 3.6, 7.2).toFixed(2);
  const doorZ = +(D / 2 - (D > 4.4 ? 1.35 : 1.0)).toFixed(2);
  const windows = D >= 5.2 ? [+(doorZ - 2.1).toFixed(2)] : [];
  const o = esmerRoom(rid, { W, D, H: 3.1, wall: S.wall, dado: S.dado, floor: S.floor, floorMat: S.floorMat || null, doorZ, windows, light: S.light, at: IHOME_AT[rid], reg: IH, band: S.band, music: S.music || 'zeelich_in', frame: S.frame, capCol: S.cap, view: 9.0 }, scene, physics);
  const { B, k, LX, BZ, H } = o, RX = W / 2, FZ = D / 2;
  o.R.surface = door.startsWith('knartas') || door.startsWith('kesh') ? 'wood' : 'stone';
  // the planner: what is taken (rects in the room's frame, a margin round each), the door's way in kept clear
  const taken = [{ x0: LX - 0.1, x1: LX + 2.0, z0: doorZ - 0.95, z1: doorZ + 0.95 }];
  for (const wz of windows) taken.push({ x0: LX - 0.1, x1: LX + 0.5, z0: wz - 0.6, z1: wz + 0.6, wallOnly: true });
  const free = (x0, x1, z0, z1) => x0 >= LX + 0.02 && x1 <= RX - 0.02 && z0 >= BZ + 0.02 && z1 <= FZ - 0.02 && !taken.some((q) => x1 > q.x0 - 0.12 && x0 < q.x1 + 0.12 && z1 > q.z0 - 0.12 && z0 < q.z1 + 0.12);
  const slots = (p, wall) => {
    const out = [], st = 0.2, { fw, fd } = p;
    if (wall === 'back') for (let x = LX + fw / 2 + 0.1; x <= RX - fw / 2 - 0.05; x += st) out.push({ x, z: BZ + fd / 2 + 0.04, ry: 0, hx: fw / 2, hz: fd / 2 });
    if (wall === 'right') for (let z = BZ + fw / 2 + 0.1; z <= FZ - fw / 2 - 0.15; z += st) out.push({ x: RX - fd / 2 - 0.04, z, ry: -Math.PI / 2, hx: fd / 2, hz: fw / 2 });
    if (wall === 'left') for (let z = BZ + fw / 2 + 0.1; z <= FZ - fw / 2 - 0.15; z += st) out.push({ x: LX + fd / 2 + 0.04, z, ry: Math.PI / 2, hx: fd / 2, hz: fw / 2 });
    if (wall === 'near') for (let x = LX + 2.2 + fw / 2; x <= RX - fw / 2 - 0.1; x += st) out.push({ x, z: FZ - fd / 2 - 0.08, ry: Math.PI, hx: fw / 2, hz: fd / 2 });
    if (wall === 'row') for (let x = (LX + RX) / 2 + 0.6; x >= LX + fw / 2 + 0.3; x -= st) out.push({ x, z: BZ + 1.05 + fd / 2, ry: 0, hx: fw / 2, hz: fd / 2 });
    if (wall === 'mid') { const cx = (LX + 2.0 + RX) / 2, cz = (BZ + FZ) / 2; for (const [dx, dz] of [[0, 0], [0.3, 0.2], [-0.3, 0.2], [0.3, -0.3], [0, 0.45], [0.5, 0], [-0.5, 0], [0, -0.45]]) out.push({ x: cx + dx, z: cz + dz, ry: 0, hx: fw / 2, hz: fd / 2 }); }
    return out;
  };
  const list = door.startsWith('kesh-') && spec.k === 'home' ? KESH_HOME : KIND[spec.k] || KIND.home;
  const placed = [];
  for (const name of list) {
    const p = P[name];
    for (const wall of p.at) {
      const cand = slots(p, wall);
      // (along a wall, from a seeded place, so two houses of one kind differ; the row and the middle in order)
      const s0 = wall === 'row' || wall === 'mid' ? 0 : Math.floor(r() * cand.length);
      let got = null;
      for (let i = 0; i < cand.length && !got; i++) { const c = cand[(s0 + i) % cand.length]; if (free(c.x - c.hx, c.x + c.hx, c.z - c.hz, c.z + c.hz)) got = c; }
      if (!got) continue;
      if (p.keeper) taken.push({ x0: got.x - got.hx, x1: got.x + got.hx, z0: BZ, z1: got.z + got.hz });   // (the keeper's place behind the counter)
      else taken.push({ x0: got.x - got.hx, x1: got.x + got.hx, z0: got.z - got.hz, z1: got.z + got.hz });
      const fp = B.put(got.x, got.z, got.ry, (kk) => p.draw(kk, r), {}, p.low ? { noStand: true, seeThrough: true } : { noStand: true });
      if (fp && !fp.hw && !fp.r) B.col(got.x, got.z, got.hx, got.hz, 1.0, { noStand: true });
      if (!fp) B.col(got.x, got.z, got.hx, got.hz, 1.0, { noStand: true });
      placed.push({ name, ...got, p });
      if (p.keeper) IH[rid].npcSpots.keeper = { x: o.X(got.x), z: o.Z(BZ + 0.55), a: 0 };
      break;
    }
  }
  IH[rid].pieces = placed.map((q) => q.name);
  // (DESERT-BAR: where to stand before each piece, facing it, in the world: the first of each kind; a story thing kept
  //  on a piece — the post office's desk — is offered from there)
  IH[rid].front = {};
  for (const pc of placed) {
    if (IH[rid].front[pc.name]) continue;
    const fx = Math.sin(pc.ry), fz = Math.cos(pc.ry), d = pc.p.fd / 2 + 0.55;
    const x = clamp(pc.x + fx * d, LX + 0.45, RX - 0.45), z = clamp(pc.z + fz * d, BZ + 0.45, FZ - 0.45);
    // (clear of every other piece by a body's width, and of the door's way in: else none, the piece is read from the side)
    const clear = !placed.some((q) => q !== pc && x > q.x - q.hx - 0.35 && x < q.x + q.hx + 0.35 && z > q.z - q.hz - 0.35 && z < q.z + q.hz + 0.35)
      && !(x < LX + 2.0 && Math.abs(z - doorZ) < 1.0);
    IH[rid].front[pc.name] = { x: o.X(x), z: o.Z(z), a: Math.atan2(pc.x - x, pc.z - z), at: { x: o.X(pc.x), z: o.Z(pc.z) }, clear };
  }
  // a keeper with no counter stands at the piece that is their work (KEEPERS stand), facing it; else at the first
  // piece with room before it
  for (const K of Object.values(KEEPERS)) {
    if (K.room !== rid || !K.stand || IH[rid].npcSpots.keeper) continue;
    const F = IH[rid].front, f = F[K.stand]?.clear ? F[K.stand] : Object.values(F).find((q) => q.clear);
    if (f) IH[rid].npcSpots.keeper = { x: f.x, z: f.z, a: f.a };
  }
  // the two looks: the room's own at its first piece, its kind's at the second (from where he stands before them)
  // (the prompt is in reach of the piece itself; the place to stand before it keeps out of the door's way)
  const lookAt = (pc, key) => {
    const fx = Math.sin(pc.ry), fz = Math.cos(pc.ry), d = (pc.p.fd / 2) + 0.6;
    let x = clamp(pc.x + fx * d, LX + 0.5, RX - 0.5), z = clamp(pc.z + fz * d, BZ + 0.5, FZ - 0.5);
    if (x < LX + 1.4 && Math.abs(z - doorZ) < 1.1) x = LX + 1.4;
    IH[rid].looks.push({ x: o.X(x), z: o.Z(z), r: Math.max(pc.hx, pc.hz) + 1.0, key, at: { x: o.X(pc.x), z: o.Z(pc.z) } });
  };
  if (placed[0]) lookAt(placed[0], rid);
  if (placed[1]) lookAt(placed[1], 'ihk_' + placed[1].name);
  // on the walls: a frame or a hanging on the left wall past the door, a lamp from the ceiling
  const lz0 = BZ + 0.5, lz1 = doorZ - 1.0;
  if (lz1 - lz0 > 1.0 && !placed.some((q) => q.ry === Math.PI / 2 && q.z - q.hz < lz1)) {
    const z = (lz0 + lz1) / 2, pal = [S.dado, '#f2ead6', '#e8b84a', '#f2ead6', S.dado];
    if (r() < 0.5) k.at(LX + 0.04, 1.6, z, Math.PI / 2, () => hanging(k, { w: Math.min(1.0, lz1 - lz0 - 0.2), h: 1.1, bands: pal }));
    else k.at(LX + 0.2, 1.45, z, Math.PI / 2, () => { wallShelf(k, { w: Math.min(1.1, lz1 - lz0 - 0.2), pal: 'honey' }); for (let i = 0; i < 4; i++) jar(k, -0.3 + i * 0.2, 0.03, 0, 'jar', ['#c8a050', '#3a8a7a', '#c8452f'][i % 3], 0.8); });
  }
  const mid = placed.find((q) => q.p.at[0] === 'mid') || { x: (LX + RX) / 2 + 0.6, z: 0 };
  k.at(mid.x, 0, mid.z, 0, () => hangingLamp(k, H - 0.75, H, { shade: S.dado }));
  B.light(S.light, 2.2, 6, mid.x, 2.0, mid.z);
  return { [rid]: B.finish() };
}
// the buildings' footprints (zislands.js R.shutDoors w/d; desert.js HOUSES and the post's cabins), so a room can be
// built before its island (a save made inside one is loaded straight into it)
const SIZE = {
  'otringal-6--29': { w: 3.72, d: 7.66 }, 'otringal--4--60': { w: 8.43, d: 8.43 }, 'otringal--1--53': { w: 10.03, d: 6.39 }, 'otringal-3--59': { w: 6.22, d: 6.82 },
  'otringal-17--71': { w: 5.82, d: 5.82 }, 'otringal-63--45': { w: 7.4, d: 6.9 }, 'otringal-45--52': { w: 6.94, d: 6.94 }, 'otringal-55--47': { w: 9.74, d: 6.57 },
  'otringal-63--52': { w: 6.94, d: 6.94 }, 'otringal-59--60': { w: 7.4, d: 7.4 }, 'otringal-47--68': { w: 7.4, d: 7.4 }, 'otringal-52--60': { w: 6.73, d: 8.79 },
  'otringal--55--15': { w: 4.46, d: 9.66 }, 'otringal-6--24': { w: 7.66, d: 6.97 }, 'otringal-4-26': { w: 7.66, d: 3.72 }, 'otringal--21--10': { w: 5.68, d: 5.07 },
  'otringal-4--11': { w: 5.39, d: 5.68 }, 'otringal--49-55': { w: 6.03, d: 6.81 }, 'otringal-4-31': { w: 7.66, d: 6.97 }, 'otringal--2-56': { w: 14.6, d: 4.18 },
  'otringal-3-65': { w: 8.34, d: 4.16 }, 'otringal-12-43': { w: 5.35, d: 7.13 }, 'otringal-40-43': { w: 7.68, d: 2.5 },
  'knartas--30--18': { w: 3.34, d: 5.02 }, 'knartas-33--14': { w: 7.67, d: 4.33 }, 'knartas-25--22': { w: 2.84, d: 4.35 }, 'knartas-25--20': { w: 4.35, d: 2.84 },
  'knartas-33--20': { w: 5.37, d: 3.15 }, 'knartas-19--20': { w: 4.35, d: 2.84 }, 'knartas-19--22': { w: 2.84, d: 4.35 }, 'knartas-28--36': { w: 4.27, d: 4.27 },
  'knartas-14--36': { w: 4.27, d: 4.27 }, 'knartas-36--20': { w: 5.37, d: 3.15 }, 'knartas-37--14': { w: 7.67, d: 4.33 }, 'knartas-28-29': { w: 7.03, d: 7.43 },
  'knartas-21-19': { w: 6.13, d: 3.33 }, 'knartas-22-15': { w: 5.59, d: 6.58 }, 'knartas-16-18': { w: 5.68, d: 6.07 }, 'knartas-16-24': { w: 5.37, d: 7.43 },
  'knartas-9-32': { w: 7.06, d: 7.04 }, 'knartas-38-36': { w: 5.52, d: 7.43 }, 'knartas-44-37': { w: 5.89, d: 7.06 }, 'knartas-35-12': { w: 7.06, d: 7.03 },
  'mosquibee--15-28': { w: 7.7, d: 3.45 }, 'mosquibee-26-15': { w: 6.98, d: 8.74 }, 'celebration--9-4': { w: 6.79, d: 6.02 }, 'undergas-8--39': { w: 4.02, d: 5.14 },
  'platform--24--27': { w: 5.2, d: 5.15 }, 'platform-27--31': { w: 10.43, d: 6.74 }, 'platform-27--38': { w: 8.72, d: 7.46 }, 'platform-27-12': { w: 6.7, d: 5.99 },
  'platform-35-15': { w: 6.69, d: 6.79 }, 'platform-30-27': { w: 4.28, d: 3.42 }, 'platform-50-46': { w: 5.14, d: 5.14 }, 'orchard-4-28': { w: 5.4, d: 7.0 },
  'kesh-house0': { w: 6.4, d: 5.2 }, 'kesh-house1': { w: 5.4, d: 5.0 }, 'kesh-house2': { w: 7.2, d: 5.4 }, 'kesh-house3': { w: 5.0, d: 4.6 }, 'kesh-house4': { w: 5.6, d: 4.8 },
  'post-cabin0': { w: 7.0, d: 3.4 }, 'post-cabin1': { w: 6.0, d: 3.2 }, 'post-cabin2': { w: 5.0, d: 3.2 },
  'ham-landing0': { w: 4.4, d: 3.6 }, 'ham-lhar0': { w: 5.5, d: 4.4 }, 'ham-lhar1': { w: 6.2, d: 4.6 }, 'ham-lhar2': { w: 5.0, d: 4.2 },
  'ham-lhar3': { w: 4.8, d: 4.0 }, 'ham-lhar4': { w: 5.2, d: 4.2 }, 'ham-obs0': { w: 3.2, d: 2.4 },
  's28': { w: 7.19, d: 2.47 }, 'hall': { w: 10.19, d: 7.02 },   // (the tower's door is in its long west side; the hall's in its north)
};
export const buildIHome = (rid) => (scene, physics) => build(rid, scene, physics);

// ---------------------------------------------------------------- a shut door's sign (EXCEPT): a board on the door
// with its word, a plank nailed across: it never reads as a way in. Drawn onto the region's group once (story/ihomes.js)
let SIGN_M = null;
const signMat = (word) => ((SIGN_M ||= {})[word] ||= MAT.map(canvasTex(256, 96, (x, w, h) => {
  x.fillStyle = '#2a3a44'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8b84a'; x.lineWidth = 6; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#f2ead6'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, w / 2, h / 2 + 2);
}), 0.8));
export function signShutDoor(group, d, word) {
  if (!d?.sill || d._signed) return;
  d._signed = true;
  const g = new THREE.Group(); g.position.set(d.sill.x - group.position.x, d.y, d.sill.z - group.position.z); g.rotation.y = d.ry ?? 0; group.add(g);
  const board = new THREE.Mesh(plane(1.0, 0.38), signMat(word)); board.position.set(0, 1.6, 0.06); g.add(board);
  const plank = new THREE.Mesh(rbox(1.3, 0.14, 0.05, 0.02), MAT.wood('dark')); plank.position.set(0, 0.95, 0.05); plank.rotation.z = 0.5; plank.castShadow = true; g.add(plank);
}
