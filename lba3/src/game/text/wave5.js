// WAVE 5 (docs/lba-maturity/WAVE5.md; CONTENT-15H.md §3 H-12, H-13, H-14): Nell's tune-ups and Baldino's prototype
// tins, the monastery cistern and the old adit's seam, Ilka's warm-ground readings. Story: story/wave5.js; the pieces:
// wave5world.js. English only; short, plain lines. No new people: Nell, Pello, Tashi, Baldino, Tenpa, Old Jaspa, Ilka,
// Dallan, Councillor Brum.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  p_w5_take: 'Take it', p_w5_watch: 'Watch the flag', p_w5_pour: 'Pour', p_w5_fill: 'Fill the bucket', p_w5_go: 'Go down',
  p_w5_drink: 'Drink some tea',

  // ================================================================ H-12 · Nell's bench
  w5n_hook1: "Bring me the right part and I'll tune any of your gadgets. I charge, but I charge fair.",
  w5n_hook2: "What each one needs is chalked on my bench.",
  w5n_list_head: "Nell's chalk list, on the end of her bench:",
  w5n_list_lance: 'PUMP LANCE: an Esmer pressure bulb. Pello on the Orchard has one. 15 K.',
  w5n_list_flask: 'HEAT FLASK: a copper sleeve. Ask Tashi in Lhar. 20 K.',
  w5n_list_pack: "HOP-PACK: Baldino's three prototype tins. Ask him where. 25 K.",
  w5n_list_none: "Underneath: 'More once you own more gadgets.'",
  w5n_list_done: 'Most lines are crossed out now.',
  w5n_what: 'What are we tuning?',
  w5n_m_title: "Nell's bench",
  w5n_m_lance: 'Pump lance: 12 jets a tank', w5n_m_flask: 'Heat flask: holds heat 150 s', w5n_m_pack: 'Hop-pack: longer thrust',
  w5n_k15: '15 kashes', w5n_k20: '20 kashes', w5n_k25: '25 kashes',
  w5n_short: "That's more kashes than you have. I charge fair, not free.",
  w5n_done_lance: "There. A bigger bulb, a stiffer spring. Twelve jets a tank now.",
  w5n_done_flask: "The sleeve holds the heat in. A good two and a half minutes now.",
  w5n_done_pack: "Baldino's old parts, his new pack. Longer thrust. It still won't lift you higher than a storey. Nothing will.",
  w5_toast_lance: 'Pump lance tuned: 12 jets a tank', w5_toast_flask: 'Heat flask tuned: holds heat 150 s', w5_toast_pack: 'Hop-pack tuned: 3 s of thrust',
  // the parts
  w5n_pel_ask: "Nell says you might have an Esmer pressure bulb.",
  w5n_pel_give: "The bulb on the shelf in my nectar house? Take it. It never fitted.",
  w5n_tashi_ask: 'Nell needs a copper sleeve for the heat flask. Do you have an offcut?',
  w5n_tashi_give: "You asked nicely. Here, the offcut from the flask itself. Tell Nell she owes me a cup.",
  it_w5n_bulb: 'Pressure Bulb', itd_w5n_bulb: "An Esmer pressure bulb from Pello's nectar house. Nell can fit it to the pump lance.",
  it_w5n_sleeve: 'Copper Sleeve', itd_w5n_sleeve: "Tashi's copper offcut. Nell can fit it round the heat flask.",
  it_w5t_tins: "Baldino's Tins", itd_w5t_tins: "Lilac tins of hop-pack parts from Baldino's first prototype. Nell wants all three.",
  // tuned descriptions (the tool's own description, once tuned)
  itd_w5_lance_t: "Bram's spare hand pump on a tank, tuned by Nell. Attack: a jet of water. It cools what is too hot to touch and pushes an enemy 3 m back; crystal mites freeze for 2 s. It hurts nobody. 12 jets a tank: fill it at any water (a trough, a well, a barrel, the sea).",
  itd_w5_flask_t: "Baldino's drawing, Tashi's smithing, a project heat cell inside, Nell's copper sleeve round it. {e} at a heat post, a steam vent or a fire draws its heat. Attack: let it out in front. It thaws and melts, and burns enemies within 2.5 m for 2 (ice creatures 4). One charge; the heat fades in 150 s.",
  itd_w5_pack_t: "Baldino's hop-pack, tuned by Nell with his old prototype's parts. In Athletic mode, jump and hold the jump: it lifts you about one storey for a few seconds. It needs ground close below and open sky above, and refills on solid ground.",

  // ================================================================ H-12 · Baldino's prototype tins
  w5t_bal1: "My first prototype went up nicely and came down wherever it liked. Three tins of its parts are still up on rocks all over Twinsun.",
  w5t_bal2: "One on Citadel under the Whispering Cliffs, one by the School of Magic, one under Lhar's frozen falls. Lilac paint. Nell would know what to do with them.",
  w5t_low: "A lilac tin on top of the rock. Baldino's colour. Too high for a jump.",
  w5t_low_pack: "A lilac tin on top of the rock. Baldino's colour. One storey up: a job for the hop-pack.",
  w5t_take: "One of Baldino's tins. Parts, and eight kashes rattling at the bottom.",
  w5t_all: "That's all three tins. Nell's bench next.",
  w5_toast_tin: "Baldino's tins: {n} of 3",
  w5_toast_kashes: '+{n} kashes',

  // ================================================================ H-13 · The monastery cistern
  w5c_tenpa1: 'The old cistern door in the yard opens when its basin is full. The spring under it froze years ago.',
  w5c_tenpa2: "Nobody has been down since my teacher's time. The monks' seed store is under there, if the mice left any.",
  w5c_basin_look: 'An empty stone basin hangs on a chain beside a low stone door. Fill it, and its weight should lift the door.',
  w5c_basin_early: 'A stone basin on a chain beside a low stone door. Ice in the bottom. Nobody has used it for years.',
  w5c_bucket_hint: 'There is a bucket by the trough. The lance would be quicker.',
  w5c_trough: "The monks' trough. They break the ice by the spout every morning: the water under it is clear.",
  w5c_take_bucket: 'A wooden bucket.',
  w5c_filled: 'Full.',
  w5c_poured: 'Splash.',
  w5c_full: 'The basin is full. The chain runs, and the stone door grinds up.',
  w5c_door_shut: 'A low stone door. No handle, no keyhole. A chain runs from its top to the basin.',
  w5c_store: "The monks' seed store: jars of seed, dry as the day they were sealed, a tea urn on a warm stone, and a bowl of old offering coins.",
  w5c_store2: 'Twenty kashes in the bowl. And the tea is still warm. Somebody must have kept the stone hot all these years.',
  w5c_tea: 'Butter tea, salty and warm. Your magic is full.',
  w5c_tea_full: 'Your magic is full already. The tea will keep.',
  w5c_tenpa_after1: 'The store is open? Then the stone under the urn is still warm. My teacher said the first keepers sat on the vent to keep the seed dry.',
  w5c_tenpa_after2: "Drink the tea whenever you pass. It's what it's there for.",
  it_w5c_bucket: 'Bucket', itd_w5c_bucket: "The monks' wooden bucket. Fill it at the trough, pour it into the cistern's basin.",
  it_w5c_bucket_full: 'Bucket of water', itd_w5c_bucket_full: "The monks' bucket, full of trough water. Pour it into the cistern's basin.",
  w5_toast_basin: 'The basin: {n} of 6',

  // ================================================================ H-13 · The old adit's seam
  w5s_jaspa: "The old adit under Celebration? The Wannies used to say a seam whistles behind the loose stones there. Bring me what you find.",
  w5s_look_dark: 'Loose stones packed into an old timber frame. Too dark behind them to tell what is there.',
  w5s_look_lit: 'Loose stones in an old timber frame. In the lantern light, something glints in the crack behind them.',
  w5s_thud: 'Thud. The stones are packed tight. A Wannie glove might shift them.',
  w5s_broke: "The stones tumble out. A seam of rough gems behind them: one comes loose in his hand.",
  w5s_after: 'The empty frame. The seam behind it is picked clean.',
  w5s_sell1: 'A rough gem from the old adit? Let me see. Mm. Good colour, honest weight.',
  w5s_sell2: "Twenty-five kashes. The project would offer five, and call it generous.",
  it_w5s_gem: 'Rough Gem', itd_w5s_gem: "A rough gem from the old adit's seam under Celebration. Old Jaspa on Knartas pays fair for gems.",

  // ================================================================ H-14 · Ilka's breathing ground
  w5b_ilka1: "The vent breathes. I need it in numbers, or the council will call it a feeling.",
  w5b_ilka2: "I put three stakes in: by the oasis, on the dig's rim, and by Hesk's flags. Strike your fork by each one. Or just watch its little flag.",
  w5b_ilka3: 'Then pin the readings to my board, or bring them to me.',
  w5b_stake_look: "One of Ilka's survey stakes, a little red flag on top.",
  w5b_stake_read: 'A reading from this stake already.',
  w5b_fork: 'The fork rings low and long: warm ground under this stake.',
  w5b_flag: 'He waits. The little flag hangs... then lifts, as warm air breathes up past the stake. Warm ground.',
  w5_toast_read: 'Warm-ground readings: {n} of 3',
  w5b_three: "That's three readings. Ilka's board, or Ilka herself.",
  w5b_give1: 'Three for three. It breathes, and it breathes on a schedule. Thank you, Twinsen.',
  w5b_give2: "Take my warm-ground map. I've marked where the ground still hums. Copy it to your holomap.",
  w5b_pin: "Pinned to her board. Under it hangs her warm-ground map. He copies it to his holomap: where something still hums.",
  w5b_after: 'Your holomap shows where the ground still hums. Go and see why.',
  w5_toast_map: "Ilka's map: the holomap shows where something still hums",
  map_hums: 'still hums',
  // chapter 9: Dallan's proof scene, with the readings (story/council.js reads w5b_done)
  w5b_c9_dallan: "And three stakes' worth of warm ground, read by hand across the island. It breathes like clockwork.",
  w5b_c9_brum: 'Numbers. Fine. I can vote on numbers. I vote yes, and you may all write that down.',

  // ================================================================ the journal
  w5_j_title: 'Odd Jobs',
  w5_j_nell: "Nell tunes gadgets on her bench for a part and some kashes.",
  w5_j_lance: 'Pump lance: a pressure bulb from Pello on the Orchard.',
  w5_j_flask: 'Heat flask: a copper sleeve from Tashi in Lhar.',
  w5_j_pack: "Hop-pack: Baldino's three prototype tins, on rocks round Twinsun.",
  w5_j_cistern: "Fill the monastery cistern's basin to open its door.",
  w5_j_seam: "Old Jaspa wants what is behind the loose stones in the old adit under Celebration.",
  w5_j_gem: 'Sell the rough gem to Old Jaspa.',
  w5_j_breath: "Take Ilka's three warm-ground readings: the oasis, the dig's rim, Hesk's flags.",
  w5_j_breath2: 'Pin them to her board, or give them to Ilka.',
});
