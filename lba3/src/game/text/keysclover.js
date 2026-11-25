// KEYS-CLOVER (story/keysclover.js; the rooms: keyrooms.js; docs/lba-maturity/KEYS-CLOVER.md): LBA's small keys and
// clover boxes. English only. No night, evening, tonight, sunset, dawn or dusk: two suns, no time of day. Lines in
// brackets are Twinsen's own thoughts, as elsewhere.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  room_kc_tunnel: "FunFrock's Old Passage", room_kc_pump: 'The Pump House', room_kc_goats: "Grandma's Old House", room_kc_mill: "Baldino's Mill Room",
  // ---- the two things themselves
  it_kc_key: 'Small key', itd_kc_key: 'Opens one small lock, near where it was found. It stays with you until it does.',
  p_kc_unlock: 'Unlock', p_kc_bolt: 'Draw the bolt', p_kc_down: 'Climb down', p_kc_box: 'Open the clover box', p_kc_valve: 'Turn the valve', p_kc_take: 'Take the key', p_kc_tin: 'Open the tin',
  kc_unlock: '(The small key fits. Click.)',
  kc_box_open: "(An old clover box, with a leaf still in it. There's room for one more leaf now.)",
  toast_kc_box: 'Clover box: you can carry {n} clover leaves now',
  toast_kc_kashes: '+{n} kashes',
  // ---- K1 · Citadel: FunFrock's old passage (the north face) and the fort's yard
  kc_fort_locked: "FunFrock's old passage. The bars have a small lock, newer than the rest. A tag on it: WATCH KEY · POWDER CHEST, YARD.",
  kc_fort_chest: '(The old powder chest. Under the dust and a pair of watch gloves: a small brass key.)',
  kc_fort_chest_empty: '(The old powder chest. Dust, and the gloves.)',
  kc_fort_bolt: '(The bolt slides back. The trapdoor over the ladder opens onto the fort\'s yard.)',
  kc_fort_shelter: "(A side door marked SHELTER. Barred, and rusted solid. Wherever it goes, it doesn't go there today.)",
  kc_fort_shelter_after: '(SHELTER. So this is where the old tunnels went. This side stays rusted shut.)',
  kc_fort_roster: '(The watch\'s old roster. Under it, in a bigger hand: "Whoever has the yard key: the tea tin is empty AGAIN.")',
  // ---- K2 · Otringal: the fountain's pump house and its high jet
  kc_pump_locked: "The fountain's pump house. A small lock, and a note: KEY ON THE FOUNTAIN TOP. OUT OF REACH OF CHILDREN AND BIRDS.",
  kc_pump_fall: '(It drops off the top bowl and lands by the basin. Clink.)',
  kc_pump_take: "(A small brass key, still wet. The pump house's, by the tag.)",
  kc_pump_plate: '(A brass plate on the big wheel: HIGH JET · FESTIVALS ONLY. The last festival was a long time ago.)',
  kc_pump_valve: '(The wheel is stiff, then it gives. Out on the plaza, something starts to roar.)',
  kc_pump_valve_on: "(The high jet's valve. Open, and it can stay open.)",
  kc_pump_small: '(BASIN and SPOUT. They work. Best leave them alone.)',
  kc_sweep_jet: 'Somebody opened the high jet! Twice the sweeping. Twice the rainbows. I\'ll take it.',
  kc_ulla_jet: 'The high jet again! My grandmother danced under that when she was a girl. Now I want to.',
  // ---- K3 · Lhar: Grandma's old house, the goats' now
  kc_goat_locked: "Grandma's old house, the goats' now. A small lock on the door. The goats keep nosing at their hay rack.",
  kc_goat_find: '(Something hard in the hay, right where the goats keep nosing. A small key, warm, and a little chewed.)',
  kc_goat_hay: '(Hay. A goat watches you as if you might eat it.)',
  kc_goat_stall: "(The goats' stall. They're out. Their smell isn't.)",
  kc_goat_trunk: "(Grandma's trunk. Knitting, a tin of buttons sorted by colour, and a cheese recipe marked NOT FOR PIM.)",
  kc_goat_window: '(From the loft window: the observatory dome, small and bright on the peak.)',
  kc_goat_window2: '(The observatory, straight across. All those flashes at this roof, and Grandma had moved out years ago.)',
  // ---- K4 · Zeelich: Baldino's old mill room (chapter 14 on)
  kc_mill_locked: "Baldino's old mill room. A small lock. Scratched into the frame: SPARE KEY UP TOP · B.",
  kc_mill_shut: "The old mill's door. Locked.",
  kc_mill_find: '(A small key on a nail by the railing. A paper tag in Baldino\'s hand: MILL ROOM.)',
  kc_mill_bench: '(Baldino\'s first workbench. A toaster that butters its own toast, marked DO NOT USE. A fan run by a bicycle. A bicycle run by a fan.)',
  kc_mill_photo: '(A photo: a young Baldino and a young Oku at this door, both covered in flour, both very pleased with themselves.)',
  kc_mill_stone: '(The mill\'s first stone, cracked through. Somebody wrote on it in chalk: RETIRED.)',
  kc_mill_tin: '(A biscuit tin of kashes and a note: "For whoever climbed up for the key. Buy Oku a drink. B.")',
  kc_mill_tin_empty: '(The biscuit tin. Crumbs, and the note.)',
});
