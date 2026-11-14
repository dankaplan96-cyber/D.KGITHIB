// ISLES-BAR: Zeelich's islands at Citadel's level: the usable pieces' words and the people at home indoors
// (src/game/story/isleslife.js). Keys: il_<kind>[_<state>|_<phase>], il_<person>[_<state>|_<phase>][_2]. English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- the shuttle departures board on every island (with chalked notes while an island's favour is open)
  il_board: 'ESMER SHUTTLE · DEPARTURES. Zeelich Spaceport, Otringal, Knartas, Mosquibee, Celebration, Under Celebration, the Platform, the Lift Dock, the Nectar Orchard, the Old Watch.',
  il_board_crisis: 'ESMER SHUTTLE · DEPARTURES. Every island, as usual. A strip pasted over it: PROJECT FLIGHTS HAVE PRIORITY THIS WEEK.',
  il_board_after: 'ESMER SHUTTLE · DEPARTURES. Every island, every hour. The priority strip has been torn off.',
  il_board_light: 'Chalked beside KNARTAS: QUAY LIGHT OUT. LAND WITH CARE.',
  il_board_hives: 'Beside MOSQUIBEE: PILOTS, KEEP HIGH OVER THE HIVES. Someone has added: PLEASE.',
  il_board_bell: 'Beside THE PLATFORM: CHAPEL BELL SILENT. MINERS, MIND THE TIME.',
  il_signpost: 'A signpost: {w}.',
  il_warn: 'A sign: {w}.',
  // ---- Otringal
  il_fountain: 'The plaza fountain. The project\'s heat keeps it from freezing. The water is cold and clean.',
  il_fountain_crisis: 'The fountain still runs. Obo says it freezes if the project stops. Today it doesn\'t.',
  il_fountain_after: 'The fountain runs, faintly steaming. Somebody has floated a paper shuttle in it.',
  il_stall: 'A market stall, its awning tied down. A slate: BACK AFTER THE NEXT SHUTTLE.',
  il_stall_crisis: 'A market stall, half empty. A slate: NO TWINSUN GOODS THIS WEEK.',
  il_stall_after: 'A market stall, stacked high again. A slate: TWINSUN APPLES. KESH WOOL. ASK INSIDE.',
  // ---- Knartas
  il_netRack: 'Nets drying on a rack. Twinsun hemp, mended in a dozen colours.',
  il_laundry: 'Washing on a line, snapping in the wind off the clouds.',
  // ---- Mosquibee Island
  il_greatHive: 'The great hive buzzes angrily. Every shuttle that cuts over the meadow sets it off again.',
  il_greatHive_calm: 'The great hive hums, low and steady. The shuttles swing wide of the meadow now.',
  // ---- Under Celebration
  il_gasHolder: 'A gas holder. Its gauge reads LOW. Chalk marks beside it say LOW, LOW, LOW, going back years.',
  il_gasHolder_crisis: 'A gas holder. The needle has jumped past LOW. The latest chalk mark is underlined twice.',
  il_gasHolder_after: 'A gas holder. The needle is back on LOW. Someone has drawn a smile beside it.',
  il_pump: 'A pump engine, thumping away. An oil can and a spanner rest on its casing.',
  // ---- the Platform
  il_boardSign: 'BUILDING COMPANY. Underneath, smaller: WE BUILD. (MOSTLY WE DIG.)',
  il_boardSign_crisis: 'BUILDING COMPANY. A notice nailed over it: DOUBLE SHIFTS, BY ORDER OF THE PROJECT.',
  il_boardSign_after: 'BUILDING COMPANY. The double-shift notice is crossed out: ORDINARY HOURS.',
  il_mineMouth: 'The Wannies\' mine. Rails run into the dark, and warm air breathes out.',
  il_mineMouth_crisis: 'The mine breathes warm air. A rope across a side tunnel: DEEP SEAM CLOSED. TOO WARM.',
  il_mineMouth_after: 'The mine. The rope is still across the side tunnel. A new tag: DEEP SEAM. LEAVE IT ALONE.',
  il_liftTower: 'The lift tower. A brass plate on the cage: LIFT RESERVED · JOINT PROJECT.',
  il_liftTower_after: 'The lift tower. LIFT RESERVED · JOINT PROJECT, says the plate. Scratched under it: BY WHOM?',
  il_bellFrame: 'The chapel bell hangs in its frame, silent. Its clapper is gone.',
  il_bellFrame_rung: 'The chapel bell, its clapper back. A tap, and it sings over the whole village.',
  // ---- the Lift Dock
  il_crane: 'Mr Kett\'s crane. A clipboard hangs from its lever: today\'s manifest, in very small writing.',
  // ---- the Nectar Orchard
  il_cloudCatcher: 'The cloud catcher: fine nets on a ring of poles, dripping into the trees\' channels. High on one pole, a beacon sits dark.',
  il_cloudCatcher_lit: 'The cloud catcher drips into the trees\' channels. High on its pole, the beacon glows amber.',
  il_nectarPress: 'A nectar press. Sticky to the elbow.',
  il_weighBeam: 'A weighing beam. The weights are honey jars.',
  // ---- the Old Watch
  il_ruinedTower: 'The old watchtower. Names are chiselled in its stones, a few of them spelled two ways.',
  il_fallenDome: 'The tower\'s dome, fallen long ago and half sunk in the grass. Mr Halt has numbered its stones.',

  // ---- people at home: their own (names)
  n_il_avra: 'Miss Avra', n_il_ione: 'Sister Ione', n_il_jaspa: 'Old Jaspa', n_il_zuzz: 'Zuzz', n_il_zett: 'Zett',
  // the residents' indoor selves (they speak under their own names: n_ot_ulla …)
  il_ulla: "Nobody buys while the council argues. So I count apples. Forty-one. Yesterday it was forty-one too.",
  il_ulla_2: 'The stall stays shut until they decide. Apples keep. Mostly.',
  il_tanek_evac: "The project wants blankets for Twinsun. So I'm cutting my scarves into blankets. Very warm, very short.",
  il_tanek_council: 'Still cutting blankets. Nobody knows who will pay for them. I cut anyway.',
  il_tanek_2: "Ulla says I'm wasting good wool. Ulla has never been cold.",
  il_obo: 'Half heat, they said. My room is warm. I swept it twice just to stand in it.',
  il_mila_evac: 'No letters from Twinsun. I stay by the radio. Rook says the post is slow. Rook says a lot of things.',
  il_mila_council: 'Still nothing from my sister. Tem keeps asking. I keep cooking.',
  il_mila_2: "Tem's out on the quay with his father. Better than watching me watch the radio.",
  il_nessa: 'A day off. My first in twenty years. I\'m mending a net anyway. Habit.',
  il_pudd: 'Root tea, and more root tea. Worry needs feeding. Sit, dear, if you can fold up small enough.',
  il_pudd_2: 'Nib takes the bread up and brings the news down. The news is heavier.',
  il_rudd_evac: "I watch the needle. The needle watches me. It's jumped twice since breakfast.",
  il_rudd_council: 'I sent my readings to the council. Six pages. They sent back a form.',
  il_rudd_2: 'Foreman Grob says go outside, get some air. The air is what I\'m measuring.',
  // Miss Avra, the terrace school
  il_avra_ord: "Cloud-sea geography today: why the islands don't sink. Nobody knows, but we spell it right.",
  il_avra_evac: "The children ask about Twinsun all day. So today's lesson is Twinsun.",
  il_avra_council: "We're holding a pretend council. It has decided nothing for three days. Very true to life.",
  il_avra_net: "The children are building a relay out of tins. It doesn't work, but it hums beautifully.",
  il_avra_home: "The children wrote you a letter. It says thank you eleven times and draws you with a very big head.",
  il_avra_2: 'Mind the chalk dust. It gets into everything. Even the cakes.',
  // Sister Ione, the high town's clinic
  il_ione_ord: 'Coughs from the cloud damp, bruises from the lifts. Nothing worse, mostly.',
  il_ione_evac: "I've made up ten extra cots. The project says Twinsun folk may come. Nobody has, yet.",
  il_ione_council: 'Half my patients are council clerks. Nerves. I prescribe tea.',
  il_ione_net: 'A crate of my bandages went to the terminal island. For relays, they said. I did not ask.',
  il_ione_home: 'Empty cots. The best kind.',
  il_ione_heal: 'Sit. Hold still. There. Mind the lifts on your way down.',
  // Old Jaspa, Knartas's gem-sorting room
  il_jaspa_ord: 'Blue for the project\'s machines, red for the jewellers, green for nobody. I sort them anyway.',
  il_jaspa_evac: 'The project wants every blue stone, now. Three days without a break. My eyes are blue.',
  il_jaspa_council: "The council's men count my trays twice. They count worse than I do.",
  il_jaspa_net: 'Blue stones for an inventor\'s relays. He paid in kashes, not coupons. I like him.',
  il_jaspa_home: 'The green ones turned out good for something after all: festival lanterns.',
  // Zuzz, Mosquibee's honey room
  il_zuzz_ord: 'Bzz. I seal the comb. Wax, warm, press, next. Do not touch the warm ones.',
  il_zuzz_crisis: 'Bzz. Honey for the project\'s ships, half price, they say. I seal slower.',
  il_zuzz_after: 'Bzz. A thick comb this season. Busy, busy.',
  // Zett, the Orchard's press house
  il_zett_ord: 'Bzz. Turn the screw, nectar comes. Turn it again, more comes. Pello calls it a craft.',
  il_zett_crisis: 'The project wants our nectar at their price. Pello said no. I press anyway. Bzz.',
  il_zett_after: 'Good harvest. The vats are full, and so am I. Bzz.',

  // ---- the residents' lines that only hold once an island's favour is done (story/islandpeople.js linesFor): the
  //      ones said while it is still open
  ip_kn_kid_after_dark: "The light still doesn't blink. Harbourmaster Quill asks everyone who lands about the lens.",
  ip_kn_kid_1_lit: 'The light blinks now! I count the blinks. I always lose count after forty.',
  ip_kn_fisher_after_dark: 'Warm harbour office, and the skiff still leaks. The light is still dark. One out of three.',
  ip_ow_kid_after_dark: 'I looked for the Knartas light through the telescope. Still dark. Old Oumi says someone should fix it.',
  ip_ot_boss_after_dark: "You bought the lens, didn't you? Then fit it. Quill's quay is still dark.",
  ip_ot_guest_after_dark: "My cousins say the shuttles still cut low over the meadows. The hives are cross. Bzz.",
  ip_ld_load2_after_dark: 'The shuttles still cut low over the meadows. My cousins are not sleeping. Bzz.',
  ip_or_carter_after_dark: 'Crates to the shuttle. The shuttles still come in low. I duck. Bzz.',
  ip_ce_dancer1_after_dark: "We made up a new step. It goes like a shuttle ducking. Everyone's doing it.",
  ip_or_pick1_after_dark: 'Good harvest. Bzzra came by. Her hives are still cross about the shuttles.',
  ip_or_pell_ord_lit: 'The cloud catcher waters the trees, and its beacon shines again. The pilots swing wide. Bzzra sent a jar.',
});
