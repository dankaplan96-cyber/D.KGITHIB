// WAVE 7 (docs/lba-maturity/WAVE7.md; CONTENT-15H.md §3 H-17, H-18): Missing Deliveries (Citadel, chapters 8–14) and
// Dallan's Debt (Kesh, chapter 14 on). Story: story/wave7.js; the pieces: wave7world.js. English only; short, plain
// lines. No night, evening, sunset or dawn: two suns. No new people: Pippa, Tim, Lulu, Odile, Osk, Lumi, Dallan.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  p_w7_kick: 'Pull the lever', p_w7_take: 'Take the key', p_w7_bolt: 'Unbolt the door', p_w7_lift: 'Work the lift',

  // ================================================================ H-17 · Missing Deliveries
  w7m_pi_hook1: "My second cart never came. Blankets and water casks for the depot shelter. People are sleeping on bare stone up there.",
  w7m_pi_hook2: 'I chalked SHELTER on every crate myself, big as my hand. Look at that one by my stall. Somebody down the harbour must have seen them.',
  w7m_tim_hook: "There's no blankets left in the shelter. Pippa's second cart never came. Blankets and water casks, she said.",
  w7m_tw_hook: "Blankets and water casks, chalked SHELTER. I'll look down at the harbour.",
  w7m_stall_look: "Pippa's crate. SHELTER in chalk, big letters, a loop on the S.",
  // the lift's crates
  w7m_crA_0: 'The lift\'s hook is down on a crate aboard the barge, stencilled STATION. Under the paint, an older word in chalk.',
  w7m_crA_1: 'The crate under the hook: STATION, stencilled fresh. Under the paint, chalk: SHELTER, with a loop on the S. Pippa\'s hand.',
  w7m_crA_2: 'Somebody painted the project\'s word over hers. This one is the shelter\'s.',
  w7m_crB: 'The other crate aboard: STATION too, and nothing under the paint. The project\'s own.',
  w7m_crA_pier: "Pippa's crate, on the pier now. SHELTER under the stencil.",
  // the lift's control
  w7m_tag: 'A clamp on the lift\'s lever, and a tag: HELD. UNCLAIMED GOODS. KEY AT THE BAGGAGE CLAIM.',
  w7m_tag_again: 'HELD. KEY AT THE BAGGAGE CLAIM.',
  w7m_unclamp: 'The key fits. The clamp comes off the lever.',
  w7m_m_lift: 'The cargo lift', w7m_m_hoist: 'Hoist', w7m_m_swing: 'Swing over and lower', w7m_m_back: 'Lower it back onto the barge', w7m_m_leave: 'Leave it',
  w7m_up: "It's up.",
  w7m_swing_no: 'The boom pulls at the crate on the barge, and the barge heels over. Hoist it first.',
  w7m_lowered: 'On the pier. Pippa can send for it.',
  w7m_lowered_back: 'Back on the barge.',
  // Odile's ledger
  w7m_od_1: "Rerouted? Let me see. Here: SHELTER, one cart, relabelled STATION on the quay by the lift crew.",
  w7m_od_2: "The station never collected. Held goods are clamped on the lift; the paper and the key go to the baggage claim. Osk has them. It's all perfectly in order. That's the trouble.",
  // Osk at the baggage claim
  w7m_tw_osk: "Pippa's goods for the shelter, stencilled STATION. The lift's key is here?",
  w7m_os_1: "Held for the station. Station goods are station goods. So what's in them? The station's list says drill parts.",
  w7m_m_what: 'What is in the crates?', w7m_m_drill: 'Drill parts', w7m_m_blank: 'Blankets and water casks', w7m_m_oil: 'Lamp oil and rope', w7m_m_later: 'Not now',
  w7m_os_wrong: "That's what you'd put on a list. What would Pippa chalk on a crate?",
  w7m_os_right: "Blankets don't drill. Then they were never the station's.",
  w7m_os_2: "The goods and the lift's key are in the back store, downstairs. The store opens off the old conveyor's lever. It sticks. FunFrock built it, and it only listens to a kick.",
  w7m_os_wait: 'The back store, downstairs. The lever only listens to a kick.',
  w7m_os_after: 'Back passage open, store empty. First quiet week I\'ve had.',
  // the back store
  w7m_lev_no: "Osk's lever. Not mine to pull.",
  w7m_lev_stuck: "It won't budge. Seized solid.",
  w7m_lev_kick: 'Clang. Something gives inside. The lever moves now.',
  w7m_m_lever: 'The conveyor lever', w7m_m_out: 'Run it out', w7m_m_in: 'Run it in',
  w7m_lev_in: 'The rollers turn the wrong way. The bales bump the back door, and the shutter stays down.',
  w7m_lev_out: 'The shutter rolls up, and the conveyor brings the bales out.',
  w7m_lev_done: 'The shutter is up.',
  w7m_key: "The lift's key, on its hook. CARGO LIFT 1.",
  w7m_bolt: 'The back door unbolts. A passage behind the houses, out to the sea wall stair.',
  w7m_back_shut: 'A back door. Bolted from inside.',
  // the delivery
  w7m_pi_done1: "On the pier? And the blankets in the back store? Tim! Lulu! Take the cart. The pier, then the baggage claim.",
  w7m_pi_done2: 'Here. A clover leaf, from the good jar. Don\'t tell the others I have a good jar.',
  w7m_pi_after: "Blankets in every corner of the shelter. And Osk keeps the back passage open now. Says it's quicker to the square.",
  w7m_tim_after: 'We wheeled the blankets up ourselves. Lulu rode on top the whole way.',
  w7m_toast_clover: 'A clover leaf',
  w7m_toast_kashes: '{n} kashes',
  w7m_j_title: 'Missing deliveries',
  w7m_j_hook: "Pippa's second cart for the shelter never came",
  w7m_j_labels: "Find her crates: SHELTER in her chalk",
  w7m_j_key: "Get the lift's key at the baggage claim",
  w7m_j_lift: 'Lower the crate onto the pier',
  w7m_j_done: 'Tell Pippa',
  it_w7m_key: "The cargo lift's key",

  // ================================================================ H-18 · Dallan's Debt
  w7d_lu_0: 'The vent blew, and the shade went with it. Three years of sun on this loom.',
  w7d_m_ask: 'Lumi', w7d_m_pay: '"Dallan should pay for this."', w7d_m_need: '"What do you need?"', w7d_m_leave: '(Leave)',
  w7d_lu_pay: "Pay? With an apology? I've had the project's apology. It was a form.",
  w7d_lu_need: 'Canvas, the heavy kind. Two poles. And someone to put the top ring back on that hook. The project\'s store has the canvas. It isn\'t mine to take.',
  w7d_lu_wait: 'Canvas, two poles, and the top ring on the hook.',
  w7d_lu_rigged: 'He tied the low corners himself. The top ring wants a long arm. Or that ball of yours.',
  w7d_tw_tell: "Lumi's shade tore when the vent blew. She needs canvas from the post's store.",
  w7d_da_key: 'The store key is still on my belt.',
  w7d_tw_carry: 'I can carry it.',
  w7d_da_carry: "No. I'll carry it.",
  w7d_da_rigged: "Two corners tied. The third ring goes on the hook at the top. That's yours.",
  w7d_lu_up: "The sail's straight. That's something.",
  w7d_da_up: "I'll check the knots after the next wind.",
  w7d_lu_after: "It's straight. I check it every morning anyway.",
  w7d_da_after: 'Knots held.',
  w7d_j_title: "Lumi's shade",
  w7d_j_ask: 'Ask Lumi what she needs',
  w7d_j_dallan: 'Canvas from the post\'s store',
  w7d_j_ring: 'The top ring on its hook',
});
