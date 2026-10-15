// The arsenal: weapons and gadgets, the stalls that sell them and the people who give them (src/game/weapons.js,
// gadgets.js, story/arsenal.js). English only. Item descriptions follow LBA2's where it had the item.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  a_title: 'Odd jobs and gear',
  // ---- weapon names (HUD, wheel)
  wp_blowgun: 'Blowgun', wp_blowtron: 'Blowtron', wp_laser: 'Laser Pistol', wp_glove: 'Wannie Glove', wp_lightning: 'Lightning',
  // ---- inventory
  it_on: 'lit', it_use_hint: 'E: use',
  it_blowgun: 'Blowgun', itd_blowgun: 'Fires darts fast and accurately. Light damage; a Grobo\'s armour shrugs it off. Darts: Pippa\'s stall or Nara\'s, three for 4 kashes.',
  it_blowtron: 'Blowtron', itd_blowtron: 'Mosquibee work. Fires darts twice as fast as the old blowgun, and harder.',
  it_laser: 'Laser Pistol', itd_laser: 'An Esmer pistol. Straight shots at distant targets, hardest on machines. Each crystal cell gives five shots; without one it burns 2 magic a shot.',
  it_glove: 'Wannie Glove', itd_glove: 'A Wannie miner\'s glove, made for punching rock. Heavy punches that throw enemies back, break old boards, and knock their shots back at them.',
  it_lightning: 'Lightning', itd_lightning: 'Bersimon\'s spell, made with the pearl of incandescence. Strikes what you aim at and jumps to two more nearby. 3 magic.',
  it_protect: 'Protection', itd_protect: 'Ker\'aooc\'s ward. For fifteen seconds, blows land half as hard. 3 magic.',
  it_penguin: 'Meca-Penguin', itd_penguin: 'A Nitro-Meca-Penguin. Set it down on level, open ground: it waddles off, enemies go for it, and a few seconds later it goes bang.',
  it_conch: 'Arthur\'s Conch', itd_conch: 'Arthur found it on the beach. A deep call: guard dogs cower, people look round, and the Dino-Fly always answers.',
  it_lantern: 'Lantern', itd_lantern: 'A brass lantern. Shows what dark corners hide.',
  it_pearl: 'Pearl of Incandescence', itd_pearl: 'From the School of Magic\'s jar. Bersimon needs it for his lightning spell.',

  // ---- toasts
  a_toast_nodarts: 'No darts left', a_toast_nocharge: 'No crystal charge, and not enough magic', a_toast_nomp: 'Not enough magic',
  a_toast_nopenguin: 'No penguins left', a_toast_onepenguin: 'One penguin at a time', a_toast_penguinroom: 'The penguin needs level, open ground',
  a_toast_protect: 'Protection: 15 seconds', a_toast_lanternon: 'Lantern lit', a_toast_lanternoff: 'Lantern out',
  a_toast_got: 'New: {n}', a_toast_darts: '+{n} darts', a_toast_kashes: '+{n} kashes',
  a_toast_wheel: 'Hold the weapon key ({k}) to choose a weapon',

  // ---- stalls
  a_shop_zeelich: "Nara's stall",
  a_sh_blowgun: 'Blowgun, with six darts', a_sh_darts: 'Three darts', a_sh_penguin: 'Nitro-Meca-Penguin', a_sh_lantern: 'Brass lantern',
  a_sh_laser: 'Esmer laser pistol, with a crystal cell', a_sh_cell: 'Crystal cell: five laser shots', a_sh_blowtron: 'Blowtron (Mosquibee work)',
  p_trade: 'Trade', p_take: 'Take', p_look2: 'Look',

  // ---- Nara's case on Zeelich's street
  a_nara_1: "Esmer goods. That pistol came off the shuttle yard's bench: it runs on a crystal cell, or on your own magic if it has to.",
  a_nara_2: 'Need anything?',
  a_nara_tron: "A Blowtron came in from Mosquibee Island. The Mosquibees don't sell to just anyone, but they owe me.",
  a_case_away: "Nara's case. A note on the lid: BACK SOON. PAY IN THE JAR.",

  // ---- Arthur's conch
  a_conch_look: "Arthur's conch, on the table by his radio.",
  a_ar_conch1: "That's my conch! I found it on the beach under the lighthouse.",
  a_ar_conch2: 'You can borrow it. Blow it outside. The Dino-Fly always answers.',
  a_tw_conch: "I'll bring it back.",
  a_ar_conch3: 'Without sand in it.',
  a_conch_note: 'A note under it, in Arthur\'s writing: DAD, YOU CAN BORROW IT. THE DINO-FLY ANSWERS.',

  // ---- the School of Magic and the wizards
  a_hougo_pearl: "Twinsen! If you pass Bersimon's tent, take him this. A pearl of incandescence. He's wanted one for his lightning spell since we were students.",
  a_hougo_pearl2: "Tell him the jar's empty now. Otherwise he'll want two.",
  a_hougo_pearl_asked: "Bersimon sent you? Of course he did. Here, a pearl of incandescence. Tell him the jar's empty now.",
  a_ber_ask: "I'm one pearl of incandescence short of a lightning spell. Twelve years short. The School of Magic keeps a jar of them, on Desert Island.",
  a_ber_pearl1: 'A pearl of incandescence! Stand back. Further.',
  a_ber_pearl2: '(The cauldron flashes white. Bersimon\'s eyebrows survive, just.)',
  a_ber_pearl3: "There. Point, and think of thunder. It eats magic, mind. And it jumps to whoever's standing close.",
  a_ker_offer: "I treat everybody for everything. This one's prevention: a ward against blows. Twenty kashes, for the school roof.",
  a_ker_learn: "Done. Three magic, and they hit you half as hard. For a while. Don't test it on purpose.",
  a_ker_poor: 'Twenty kashes. The roof leaks on my patients.',
  a_menu_ward: "Ker'aooc's ward", a_menu_learn: 'Learn the ward', a_note_20: '◆ 20',

  // ---- the dark places (the lantern) and the old boards (the glove)
  a_dark: 'Too dark to see in there. Something glints.',
  a_nook_cellar: 'An old tin box behind a loose stone. FunFrock\'s stamp on the lid; the house is built on older walls. Inside: darts and a few kashes.',
  a_nook_gal: 'A niche cut by hand, older than the project. Someone left a clover in it.',
  a_nook_ug: "The old Wannie mine. On a crate inside: a miner's work glove, made for punching rock.",
  a_nook_empty: 'Nothing else in there.',
  a_adit_sign: 'WANNIE WORKS. CLOSED. (Someone has added: "DARK. BRING A LAMP.")',
  a_boards: 'The old coal chute, boarded up before we moved in. The boards are nailed tight. A punch might do it. A big one.',
  a_boards_thud: 'Thud. The boards don\'t care.',
  a_boards_cache: "Behind the boards, in the old chute: somebody's purse of kashes, and a clover.",

  // ---- journal
  a_j_pearl: "Bersimon wants a pearl of incandescence (the School of Magic, Desert Island)",
  a_j_pearl_give: 'Take the pearl to Bersimon\'s tent on Citadel',
  a_j_dark: 'Something glints in the dark: a lantern would show it',
  a_j_boards: 'The coal chute in the cellar is boarded up. It needs a heavy punch',
});
