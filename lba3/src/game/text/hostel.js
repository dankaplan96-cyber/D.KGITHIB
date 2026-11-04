// ASYLUM-2, the story's part: the Joint Project's workers' hostel in FunFrock's old asylum, and Vesk's store behind it
// (src/game/story/hostel.js; the place: src/game/asylumhostel.js). English only.
// Phases (story/hostel.js hostelPhase): v chapters 1–2 (the hostel lived in, the store guarded), u chapters 3–7 (the
// store cleared, the workers uneasy), s chapter 8 (the hostel one of the shelters), l chapter 9 on and the epilogue.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  hs_title: 'The old asylum',
  p_hs_open: 'Open', p_hs_read: 'Read', p_hs_unlock: 'Unlock',
  n_hs_foreman: 'Foreman Ordo', n_hs_cook: 'Mama Pufa', n_hs_worker1: 'Zizi', n_hs_worker2: 'Tellem', n_hs_worker3: 'Gorro', n_hs_worker4: 'Old Kesso', n_hs_sleeper: 'Wix',
  it_hs_key: "Vesk's key", itd_hs_key: "A brass key on a violet tag: 'V. · office'. It was under the straw of a crate that hums.",
  hs_j_crate: 'Find what hums in the store under the hostel',
  hs_j_notes: "Read what Vesk keeps in his office",

  // ---- the foreman (his office, by the old clone statues)
  hs_foreman_v: [
    "Twinsen! The Twinsen? Ordo, foreman. Forty of my people sleep here between shifts. Mind the rope round your old cell, they're proud of it.",
    "The store below is the project's. Mr Vesk's own men keep it. Pipe fittings, they tell me. Nobody of mine goes down there.",
    "The Council sealed this place before any of us came. The diggers broke in, the project needed beds, and here we are.",
  ],
  hs_foreman_u: [
    "Mr Vesk's men packed up between two shifts. Every crate, gone. Pipe fittings don't need that much hurry.",
    "My people ask me questions I can't answer. I tell them to sleep. They don't.",
  ],
  hs_foreman_s: [
    "Bring them down here. The halls are deep and the walls are FunFrock's: whatever he was, he built thick.",
    "We've opened every room. Blankets in the dormitory, soup in the kitchen. Nobody is turned away.",
  ],
  hs_foreman_l: [
    "The hostel stays. Half my people want to go home and half want to stay. I'll keep beds for both.",
    "We took the old plaque down and put it back up. It says 'Never again'. We agree.",
  ],
  // ---- the cook (the old nurses' counter, the kitchen and mess)
  hs_cook_v: [
    "Sit, eat, you're too thin. Soup of the Wannie mines: thick enough to stand a spoon in.",
    "Forty mouths and one stove. FunFrock's nurses cooked for madmen here. Now I cook for miners. Not so different.",
  ],
  hs_cook_u: [
    "The guards used to come up for bread. Now nobody comes up from the store. I keep a loaf for them anyway. Habit.",
    "My boys don't sleep. They say the walls hum. I say eat more soup.",
  ],
  hs_cook_s: [
    "Children first, then the old ones, then you. There is enough. I make there be enough.",
  ],
  hs_cook_l: [
    "When this is all done I'm cooking for the whole town. You'll come. Bring your boy, the one with the radio.",
  ],
  hs_cook_heal: 'Here. Eat it all. Hero or no hero, nobody leaves my kitchen hungry.',
  hs_cook_full: "You've eaten already. Come back when you look tired.",
  // ---- the workers
  hs_worker1_v: [
    "Report for the foreman, sorry, in a hurry. Bzz. Late shift on the dig, early shift on the forms.",
    "On Mosquibee we sleep in the hive, all together. Here they give you a bunk. A whole bunk! Lonely.",
  ],
  hs_worker1_u: ["The foreman counts us twice a shift now. Bzz. Nobody's missing. He counts anyway."],
  hs_worker1_s: ["I'm flying blankets down from the town. Wings are good for something!"],
  hs_worker1_l: ["My mother writes: come home. My friends write: stay, there's work. I write back to both. Bzz."],
  hs_worker2_v: [
    "You're the one from the register! 'Dreams of a goddess.' Did you? Dream of her? Sorry. We all read it.",
    "We roped off your cell. Nobody sleeps in it. It felt rude.",
  ],
  hs_worker2_u: ["Someone left the door of the locked office open. Mr Vesk's. Nobody goes in. Nobody wants to be the one."],
  hs_worker2_s: ["Your cell's full today. Three children and a grandmother. I think you wouldn't mind."],
  hs_worker2_l: ["I've started writing it all down. The hostel, the dig, you. Somebody should."],
  hs_worker3_v: [
    "At home the gas-lamps glow green under the clouds. Here it's two suns, all day, every day. I sleep with my hat over my eyes.",
    "Something down in the store sings when the hostel's quiet. Hmmmm. Like a crystal glass. The guards say it's the boiler. Boilers don't sing.",
  ],
  hs_worker3_u: ["The singing stopped when the crates went. I liked it, a little. Now it's too quiet to sleep."],
  hs_worker3_s: ["We Wannies know tunnels. If the ground shakes, stand in a doorway. FunFrock's doorways are good ones."],
  hs_worker3_l: ["I'm going home soon. To the gas-lamps. But I'll miss your two suns. Don't tell anyone."],
  hs_worker4_v: [
    "Sit, sit. Old Kesso remembers Zeelich before the project. Quiet. Poor. Quiet.",
    "The young ones think the project will make us all rich. I think it will make someone rich.",
  ],
  hs_worker4_u: ["You see? Someone. Not us."],
  hs_worker4_s: ["I've lived through worse. Not much worse. Sit down, there's room on the bench."],
  hs_worker4_l: ["Twelve years ago you beat FunFrock. Now this. Do you ever get to sit down, hero?"],
  // ---- the sleeper (no talk: a listen at his bunk)
  hs_sleeper: [
    "(He talks in his sleep, in Esmer. Something about honey, and his mother.)",
    "(Snoring. A long, contented buzz.)",
    "(\"...not the late shift... not again...\" He turns over.)",
  ],

  // ---- the Council's plaque at the old bricking
  hs_plaque1: "(A bronze plaque, green with age: 'SEALED BY ORDER OF THE CITADEL ISLAND COUNCIL AFTER FUNFROCK'S FALL. NEVER AGAIN.')",
  hs_plaque2: "So that's why nobody ever spoke of it. Sealed, and everyone glad to forget. Until the project's diggers broke back in.",
  // ---- the brass plaque at his old cell
  hs_cellplaque1: "(A brass plaque on the rope: 'CELL 2'. Scratched under it in Esmer letters, and again in ours: 'The hero slept here. Do not touch his marks.')",
  hs_cellplaque2: "They've made it a museum. I'm not sure how I feel about that.",
  // ---- the humming crate (Arthur's pocket set)
  hs_crate1: "This one sings. Under the straw... crystals, warm as bread. Stamped ZEELICH. These aren't pipe fittings.",
  hs_crate2: "And a key on a violet tag. 'V. · office'. Vesk's.",
  hs_crate_after: 'Straw and warm crystals. Nobody has come for them yet.',
  // ---- Vesk's office
  hs_door_locked: "Locked. A good lock, new. The foreman's office is upstairs; this one isn't his.",
  hs_door_open: "Vesk's key turns. Quietly. Of course it does.",
  hs_notes1: "(Vesk's notebook. Small, neat handwriting.) 'Found it on FunFrock's old plans: an asylum under the fort, sealed by their Council. Nobody here will set foot in it. Perfect.'",
  hs_notes2: "'Crystals to the boiler room. The workers are told: pipe fittings. Ordo asks no questions. Good.'",
  hs_notes3: "'The readings rise every day. Twinsun's people call it noise. Let them.'",
  hs_notes_tw: "He hid this place on purpose. A hostel upstairs for the project's good name, and his store under it.",
  hs_box: "His strongbox isn't locked. He didn't think anyone would get this far.",
  hs_box_empty: 'Empty.',
  // ---- the empty store (chapters 3 on)
  hs_store_empty: 'Swept clean. Square marks in the dust where the crates stood.',
});
