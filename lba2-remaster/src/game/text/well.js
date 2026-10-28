// Chapter 1 — "The Well" (src/game/story/prologue.js): the town part's people and small puzzles (CH1-LONGER):
// Zoé's kettle crystals for Mira, the rusted lid, the harbour bell that wakes Doran, the warm stones on the bay rocks.
// English only. (The chapter's older lines are in src/game/i18n.js and text/opening.js.)
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- Zoé, at the neighbours' door: their kettle
  pr_zoe_kettle: ['Same next door. Their tap ran warm, then stopped.', 'And look at their kettle. Furred with these overnight.'],
  pr_tw_kettle: '(Tiny crystals. Still warm.)',
  pr_zoe_kettle2: "Mira's telling everyone it's Gilbert's old pipes. Show her these. Then the well.",
  pr_tw_miraNo: "Mira won't open the well. She says it's the pipes.",
  pr_zoe_kettle_wait: "Show Mira the crystals. Pipes don't grow those.",
  pr_toast_kettle: 'Kettle Crystals',
  it_kettle: 'Kettle Crystals', itd_kettle: "From next door's kettle, furred overnight. Still warm.",

  // ---- Mira and Gilbert: the key only for a fault at the spring
  pr_mira_no: "It isn't the well, Twinsen. It's the old pipes on his street. I don't unlock the town well for a pipe fault.",
  pr_gil_no: 'My pipes are fine! I kick them every morning.',
  pr_tw_kettle2: "Next door's kettle furred up with these overnight. Pipes don't do that.",
  pr_mira_kettle: "Crystals? No, pipes don't grow those. That comes up from the spring.",
  pr_mira_2b: "Fine. Find the fault and I'll waive his bill this month. Here's the key to the lid.",
  pr_mira_wait0: "Show me it's the spring and not his pipes, and the lid is yours.",

  // ---- the lid: rusted to the rim (a kick, Aggressive)
  pr_well_stuck: ["The padlock's off. But the lid's rusted to the rim.", "It won't lift."],
  pr_gil_kick: "Stuck? Give it a good kick. That's how I fix everything.",
  pr_mira_kick: 'That explains his pipes.',
  pr_well_stuck2: 'Still rusted shut. Gilbert would kick it.',
  pr_lid_padlock: '(Kicking a padlock. That only hurts my foot.)',
  pr_lid_kicked: 'There. Twelve years of rust, one kick.',
  pr_gil_told: 'Told you.',
  pr_lid_ball: '(The ball just bounces off. It needs weight behind it.)',
  pr_nudge_kick: 'Aggressive ({b}), then {k} by the lid',
  p_kick: 'Kick',

  // ---- the harbour: Doran sleeps through anything but the bell
  pr_xil_bell: 'Only the bell on that post wakes him. I saw it when the barge came in.',
  pr_tw_snore2: '(He would sleep through a storm. Xil said the bell wakes him.)',
  pr_bell_look: ['The harbour bell. It rings when a boat comes in.', 'The bell rope is long gone, and it hangs out of reach.'],
  pr_doran_bell: 'Boat in! Ropes! Fenders! ...There is no boat.',
  pr_tw_bell: 'Sorry, Doran. The trader from Zeelich is still waiting for his stamp.',
  pr_tw_bell0: 'Sorry, Doran. Just testing the bell.',
  pr_doran_bell0: 'Test it on someone younger.',
  pr_doran_awake: 'No boat, no business. Let an old man sit.',
  pr_nudge_bell: "Out of reach for hands. Not for the magic ball ({ball}).",
  pr_ar_bell: 'Doran? Ring the harbour bell. He jumps up every time. Tim and I checked. Twice.',

  // ---- the bay rocks: Tim's warm stones (Athletic)
  pr_rocks_look: 'Too high to climb. Not too high to jump.',
  pr_stones_take: ['Warm stones, wedged in the rock. They hum like a bee in a jar.', 'And a few kashes. Tim was up here, I bet.'],
  pr_stones_take0: ['Warm stones, wedged in the rock. They hum like a bee in a jar.', 'And a few kashes someone dropped.'],
  pr_toast_stone: 'Warm Stone',
  it_warmstone: 'Warm Stone', itd_warmstone: 'From the bay rocks, where Tim found his. It hums like a bee in a jar.',
  pr_cave_stones: '(Like the stones on the bay rocks. Only here they grow out of the walls.)',
  pr_map_rocks: 'Bay rocks',

  // ---- the objective and the journal
  pr_obj_proof: 'Lid key: Mira wants proof',
  pr_obj_lid: 'Open the rusted lid',
  pr_obj_doran: "A rope (Xil needs Doran's stamp)",
  pr_obj_stones: 'Optional: the warm stones on the bay rocks',
  pr_j_lock: 'The lid is padlocked. Mira from the water office has the key.',
  pr_j_mira: "Mira won't unlock the well for what she calls a pipe fault.",
  pr_j_kettle: "Next door's kettle furred up with warm crystals overnight. Zoé gave me some.",
  pr_j_lid: 'The lid is rusted to the rim. Gilbert swears by a kick.',
  pr_j_deep: 'The well is too deep to jump. The harbour might have a rope.',
  pr_j_doran: "Xil needs Doran's stamp. Doran sleeps through anything but the harbour bell.",
  pr_j_tim: 'Tim threw a warm, buzzing stone into the well. He found it on the bay rocks.',
  pr_j_stones: 'The bay stones are warm and hum like a bee in a jar.',
});
