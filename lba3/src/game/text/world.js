// Sign texts and other world-dressing strings for Citadel Island (island.js).
import { STR } from '../i18n.js';

Object.assign(STR.he, {
  w_sign_town: 'כיכר העיר · האי המצודה',
  w_sign_harbour: '← הנמל · מעבורת לאי המדברי',
  w_sign_quay: 'נמל האי המצודה · דוראן, דייג. לא לגעת ברשתות!',
  w_sign_lighthouse: '↑ המגדלור',
  w_sign_cliffs: '→ צוקי הלחישה · זהירות: נפילה!',
  w_sign_depot: 'מחסן המיזם המשותף · הכניסה לעובדים בלבד',
  w_sign_yard: 'שטח המיזם מעבר לקו הצהוב · לעובדים בלבד · בשמירה',
  w_sign_station: '→ תחנת המיזם המשותף (במבצר הישן של פאנפרוק)',
  w_sign_pipe: 'צינור המים של המיזם · לא לטפס!',
  w_sign_orchard: 'הבוסתן הישן · המגוף נעול. אין כניסה.',
  w_door_shut: 'נעול.',
});

Object.assign(STR.en, {
  w_sign_town: 'Town Square · Citadel Island',
  w_sign_harbour: '← Harbour · Ferry to Desert Island',
  w_sign_quay: 'Citadel Harbour · Hands off the nets!',
  w_sign_lighthouse: '↑ Lighthouse',
  w_sign_cliffs: '→ Whispering Cliffs · Mind the drop!',
  w_sign_depot: 'Joint Project Depot · Staff Only',
  w_sign_yard: 'Project yard past the yellow line · Staff only · Guarded',
  w_sign_station: '→ Joint Project Station (old fortress)',
  w_sign_pipe: 'Joint Project Water Main · No Climbing',
  w_sign_orchard: 'Old Orchard · Valve locked. Keep out.',
  w_door_shut: 'Locked.',
  // C-4: each locked door says why (story/prologue.js baseInteract; ids from town.js HOUSES and island.js shutDoor)
  w_door_nbr: "The neighbours are out.",
  w_door_stone: "Tibbo's house. A note on the door: 'At the counter by Pippa's stall. Darts, cells, spare parts.'",
  w_door_pink: "SEWER WORKS, says the plate. Locked. A note: 'Down below. Mind the hatch. F.'",
  w_door_water: "The water office. Closed for now.",
  w_door_plateau: "An old door into the plateau, rusted shut.",
  w_door_passageN: "FunFrock's old passage. Barred. It ran under the fort to his asylum, where the project posts guards now.",
  w_door_passageS: "A trapdoor into FunFrock's old passage. Bolted from below. The asylum's block-house is just past the fort's east wall.",
});
