// VOICE-2 (the user, 14.11: "Map each dialogue line to an appropriate intention, with optional emphasis and pause
// information. Use explicit metadata for important scenes; punctuation alone is not sufficient to infer emotion"):
// how a line is delivered, by its key. The lines stay where they are (the text files); this only says how they sound.
//
// A value is one of:
//   'intention'                       every sentence of the line (the last clause of each carries it)
//   ['intention', 'intention', ...]   one per sentence, in order (a sentence ends at . ! ? or ...)
//   { i: one of the above, e: 'word' or ['word', ...] (the word that carries the accent; per sentence when a list),
//     h: 1 (a short hesitation before the line), b: 1 (a released breath before it: relief), p: [s, ...] (an extra
//     pause before each sentence, seconds) }
// Intentions (the brief's): neutral, curious, uncertain, pleased, concerned, urgent, annoyed, and relieved (pleased,
// beginning with a released breath). A line without an entry is read from its words and punctuation
// (voiceplan.js intentOf), as before but with more cues.
//
// The game looks a line up by its English text (the dialogue box and the subtitles get the text, not the key):
// metaFor(text).
import { STR } from '../i18n.js';

export const VOICE_META = {
  // ---------------------------------------------------------------- the opening film (op_)
  op_res_1: 'curious', op_wk_1: 'neutral', op_res_2: { i: 'curious', e: 'hum' }, op_wk_2: { i: 'neutral', h: 1 },
  op_ar_1: 'pleased', op_tw_0: ['pleased', 'neutral'], op_zoe_1: { i: ['neutral', 'concerned'], e: [null, 'stopped'] },
  op_tw_1: { i: 'neutral', e: 'yesterday' }, op_zoe_2: { i: 'annoyed', e: 'worked' }, op_ar_2: ['neutral', 'curious'],
  op_zoe_3: { i: ['concerned', 'concerned'], e: ['warm', 'never'] }, op_tw_2: 'neutral', op_zoe_4: 'neutral', op_zoe_5: ['neutral', 'concerned'],
  // ---------------------------------------------------------------- at home and the town (pr_, prh_)
  pr_zoe_1: { i: ['urgent', 'concerned'], e: [null, 'dry'] }, pr_zoe_2: ['curious', 'neutral'], pr_tw_1: ['curious', 'pleased'],
  pr_zoe_3: ['neutral', 'concerned'], pr_ar_1: ['pleased', 'curious'], pr_zoe_4: 'annoyed', pr_ar_2: 'annoyed',
  pr_zoe_ball: ['neutral', 'annoyed', 'neutral'], pr_zoe_go: ['neutral', 'pleased'], pr_tw_ballfirst: ['neutral', 'neutral'],
  pr_zoe_after: { i: ['curious', 'curious', 'pleased', 'pleased'], b: 0 }, pr_ar_hint: 'neutral', pr_ar_after: ['curious', 'pleased'],
  prh_zoe_1: { i: ['concerned', 'neutral', 'concerned'], e: [null, 'listen', 'knocking'] }, prh_zoe_2: ['uncertain', 'neutral', 'neutral'],
  prh_zoe_3: ['neutral', 'neutral', 'neutral'], prh_ar_1: 'pleased', prh_ar_2: ['uncertain', 'annoyed'], prh_ar_boat: ['pleased', 'neutral', 'pleased'],
  prh_cave_in: ['curious', 'concerned'], prh_pool_1: ['concerned', 'concerned'],
  pr_tw_kettle: 'concerned', pr_zoe_kettle2: ['neutral', 'neutral', 'neutral'], pr_tw_miraNo: ['annoyed', 'neutral'], pr_zoe_kettle_wait: ['neutral', 'annoyed'],
  pr_mira_no: { i: ['annoyed', 'neutral', 'annoyed'], e: ['well', 'pipes', 'pipe'] }, pr_gil_no: ['annoyed', 'pleased'],
  pr_tw_kettle2: ['neutral', 'annoyed'], pr_mira_kettle: { i: ['curious', 'uncertain', 'neutral'], h: 0 }, pr_mira_2b: ['annoyed', 'neutral', 'neutral'],
  pr_mira_wait0: 'neutral', pr_gil_kick: ['curious', 'pleased', 'pleased'], pr_mira_kick: 'annoyed', pr_well_stuck2: ['annoyed', 'pleased'],
  pr_lid_kicked: ['pleased', 'pleased'], pr_gil_told: 'pleased', pr_xil_bell: 'neutral', pr_doran_bell: ['urgent', 'urgent', 'urgent', 'annoyed'],
  pr_tw_bell: ['uncertain', 'neutral'], pr_tw_bell0: ['uncertain', 'neutral'], pr_doran_bell0: 'annoyed', pr_doran_awake: ['annoyed', 'annoyed'],
  pr_ar_bell: ['curious', 'neutral', 'pleased', 'pleased'], pr_rocks_look: ['neutral', 'pleased'],
  pr_gil_1: { i: ['annoyed', 'annoyed'], e: ['paid', 'water'] }, pr_mira_1: 'neutral', pr_gil_2: { i: 'annoyed', e: 'empty' },
  pr_tw_well: { i: 'curious', e: 'well' }, pr_mira_2: { i: ['relieved', 'neutral', 'neutral'] }, pr_gil_3: 'pleased',
  pr_gil_wait: ['annoyed', 'annoyed'], pr_mira_wait: ['neutral', 'annoyed'],
  pr_xil_1: ['pleased', 'neutral', 'concerned'], pr_xil_2: ['annoyed', 'annoyed'], pr_tw_xil: 'neutral', pr_xil_3: ['relieved', 'pleased'],
  pr_xil_4: ['pleased', 'pleased'], pr_xil_after: ['neutral', 'uncertain'], pr_doran_1: ['curious', 'curious', 'pleased'], pr_tw_doran: 'neutral',
  pr_doran_2: ['curious', 'annoyed', 'annoyed'], pr_doran_3: ['annoyed', 'neutral', 'neutral', 'annoyed'], pr_doran_after: ['neutral', 'uncertain'],
  pr_tim_1: { i: ['urgent', 'concerned'], p: [0, 0.35] }, pr_lulu_1: ['urgent', 'neutral'], pr_lulu_2: 'curious', pr_tim_2a: ['pleased', 'neutral', 'pleased'],
  pr_tim_2b: ['concerned', 'concerned'], pr_lulu_3: 'concerned', pr_tw_tim: { i: 'curious', e: 'buzzes' }, pr_tim_3: ['urgent', 'concerned', 'concerned'],
  pr_tim_4: ['neutral', 'uncertain', 'pleased', 'concerned'], pr_tim_after: 'concerned', pr_lulu_after: ['pleased', 'uncertain'],
  pr_pippa: ['pleased', 'neutral', 'neutral', 'curious'], pr_cave_1: { i: ['concerned', 'concerned', 'curious', 'concerned'] },
  pr_cave_2: ['concerned', 'uncertain'], pr_tw_ball: { i: 'urgent', e: 'wall' }, pr_sendell_1: 'neutral', pr_tw_sendell: { i: ['curious', 'pleased'], h: 1 },
  pr_sendell_2: ['neutral', 'concerned'], pr_well_rope: ['neutral', 'neutral', 'uncertain'], pr_well_go: ['neutral', 'curious'],
  pr_well_after: ['concerned', 'concerned'], pr_locked: ['neutral', 'neutral'],
  // ---------------------------------------------------------------- chapter 1 (c1_)
  c1_vesk_speech: { i: ['pleased', 'neutral', 'pleased', 'uncertain', 'pleased'], e: [null, 'Vesk', 'warmth', 'shortly', 'promise'] },
  c1_gil_speech: ['annoyed', 'annoyed'],
  c1_tw_morning: { i: ['curious', 'curious', 'concerned'], e: ['Her', 'Sendell', null] },
  c1_gil_morning: ['urgent', 'pleased', 'concerned', 'neutral', 'neutral'], c1_tw_morning2: ['neutral', 'concerned'],
  c1_zoe_home1: { i: ['relieved', 'concerned', 'curious'], e: [null, 'vanished', 'find'] },
  c1_tw_home1: { i: ['neutral', 'concerned', 'concerned'], e: [null, 'Sendell', 'her'] },
  c1_zoe_home2a: { i: ['curious', 'curious', 'concerned', 'concerned'], e: ['Sendell', 'twelve', 'good', 'Vesk'] },
  c1_ar_home1: ['pleased', 'curious', 'pleased', 'pleased'], c1_zoe_home3: ['neutral', 'neutral', 'neutral'], c1_ar_home2: ['annoyed', 'annoyed'],
  c1_zoe_wait: { i: 'concerned', e: 'face' }, c1_zoe_water: ['pleased', 'pleased', 'pleased', 'pleased'],
  c1_zoe_go: { i: ['neutral', 'concerned', 'concerned'], e: [null, 'careful', 'back'] }, c1_zoe_home2: ['pleased', 'neutral'],
  c1_vesk_1: { i: ['pleased', 'pleased', 'pleased', 'neutral', 'pleased'], e: ['Twinsen', null, 'legend', null, 'pleasure'] },
  c1_tw_vesk1: { i: ['neutral', 'concerned', 'curious'], e: [null, 'warm', 'project'] },
  c1_vesk_2: { i: ['curious', 'pleased', 'neutral', 'neutral', 'uncertain', 'neutral'], e: ['Crystals', 'Fascinating'] },
  c1_tw_vesk2: { i: 'annoyed', e: 'back' }, c1_vesk_3: ['uncertain', 'neutral', 'neutral', 'pleased'], c1_vesk_4: ['pleased', 'pleased', 'neutral', 'neutral', 'concerned'],
  c1_vesk_wait: ['neutral', 'pleased'], c1_vesk_tour1: ['pleased', 'pleased', 'pleased', 'neutral', 'pleased'], c1_vesk_tour1b: ['curious', 'pleased', 'neutral'],
  c1_tw_tour1b: ['pleased', 'pleased'], c1_tw_tour1: { i: 'concerned', e: 'well' },
  c1_vesk_tour2: { i: ['neutral', 'neutral', 'uncertain', 'neutral', 'pleased'] }, c1_tw_tour2: { i: ['curious', 'curious'], e: ['shell', 'What'] },
  c1_vesk_tour3: ['neutral', 'neutral', 'pleased', 'neutral'], c1_vesk_busy: ['neutral', 'annoyed'],
  c1_zoe_gate1: { i: ['urgent', 'neutral', 'curious', 'concerned'], e: [null, null, 'A', 'evacuation'] },
  c1_tw_gate: { i: ['concerned', 'concerned'], e: ['shell', 'quick'] }, c1_zoe_gate2: { i: ['annoyed', 'neutral', 'neutral', 'neutral'], e: ['real'] },
  c1_zoe_gate3: ['pleased', 'pleased', 'pleased'], c1_guard_spot: ['urgent', 'curious', 'annoyed'], c1_zoe_spotted: { i: ['uncertain', 'uncertain', 'annoyed', 'annoyed'], h: 0 },
  c1_zoe_locker1: ['annoyed', 'pleased'], c1_zoe_locker3: ['curious', 'neutral'], c1_zoe_plan1: ['pleased', 'neutral'],
  c1_zoe_plan2: { i: ['curious', 'concerned', 'concerned'], e: ['all', 'none', null] }, c1_zoe_plan3: { i: ['concerned', 'urgent'], e: ['saved', 'see'] },
  c1_conf_zoe1: { i: ['urgent', 'urgent', 'urgent'], e: ['Vesk', null, 'everyone'] }, c1_conf_vesk1: ['neutral', 'curious', 'annoyed', 'uncertain'],
  c1_conf_tw1: { i: 'concerned', e: 'cracking' }, c1_conf_vesk2: ['neutral', 'neutral', 'pleased', 'neutral'], c1_conf_zoe2: { i: 'annoyed', e: 'isn\'t' },
  c1_conf_vesk3: ['neutral', 'neutral', 'annoyed', 'annoyed'], c1_conf_tw2: { i: ['annoyed', 'urgent'], e: ['decide', 'Stop'] },
  c1_conf_vesk4: { i: ['annoyed', 'neutral', 'uncertain'] }, c1_after_zoe: { i: 'concerned', h: 1 }, c1_after_tw: ['concerned', 'neutral', 'concerned'],
  c1_beam_dead: ['annoyed', 'neutral'], c1_ar_radio1: ['urgent', 'urgent', 'urgent'], c1_baldino_1: ['curious', 'pleased', 'neutral', 'annoyed'],
  c1_tw_radio: { i: ['urgent', 'urgent', 'urgent'], e: ['Baldino', 'ship', 'shell'] }, c1_baldino_2: ['urgent', 'neutral', 'neutral', 'neutral', 'urgent'],
  c1_ar_radio2: ['pleased', 'pleased', 'curious'], c1_zoe_radio: ['pleased', 'neutral', 'neutral'], c1_ar_after: 'curious', c1_ar_idle: ['annoyed', 'curious', 'urgent'],
  c1_well_dry: ['concerned', 'concerned'], c1_well_hot: ['relieved', 'concerned', 'concerned'], c1_valve_bars: ['annoyed', 'annoyed', 'pleased'],
  c1_gate_task: ['annoyed', 'neutral'], c1_mira_map: ['neutral', 'concerned', 'neutral'], c1_mira_office: ['pleased', 'annoyed', 'annoyed'],
  c1_mira_after: ['neutral', 'curious'], c1_mira_water: ['pleased', 'annoyed'], c1_mira_gone: ['annoyed', 'annoyed', 'annoyed'],
  c1_tw_water: ['pleased', 'neutral'], c1_tw_control: ['neutral', 'concerned'], c1_worker_1: ['neutral', 'neutral', 'annoyed'], c1_worker_2: ['concerned', 'uncertain'],
  c1_guard_1: 'neutral', c1_guard_2: ['neutral', 'uncertain'], c1_gil_idle: ['pleased', 'pleased'], c1_gil_task: ['curious', 'neutral', 'annoyed'],
  c1_gil_water: ['relieved', 'pleased', 'pleased', 'neutral'], c1_doran_idle: 'annoyed', c1_doran_drones: ['curious', 'neutral', 'neutral', 'concerned', 'neutral', 'pleased'],
  c1_doran_depot: ['neutral', 'uncertain'], c1_doran_ferry1: ['curious', 'curious', 'neutral', 'neutral'], c1_tw_ferry: { i: 'curious', e: 'fly' },
  c1_doran_ferry2: ['pleased', 'neutral'], c1_doran_board: ['neutral', 'pleased'], c1_xil_1: ['annoyed', 'annoyed'], c1_xil_2: ['pleased', 'pleased'],
  c1_pippa_1: ['neutral', 'curious'], c1_pippa_heat: ['neutral', 'pleased', 'pleased', 'curious'], c1_pippa_2: ['concerned', 'neutral'],
  c1_tim: ['urgent', 'curious', 'pleased'], c1_tim_heat: ['pleased', 'pleased'], c1_lulu_heat: ['neutral', 'neutral', 'annoyed'], c1_lulu: ['concerned', 'neutral', 'pleased'],
  // ---------------------------------------------------------------- chapter 2, Zeelich (c2_)
  c2_doran_1: ['neutral', 'neutral', 'pleased'], c2_tw_arrive: ['neutral', 'neutral'], c2_doran_idle: { i: 'pleased', h: 1 },
  c2_bal_1: { i: ['pleased', 'relieved', 'urgent', 'uncertain'], e: [null, null, 'Mind'] }, c2_tw_bal1: { i: ['neutral', 'curious'], e: [null, 'really'] },
  c2_bal_2: ['neutral', 'neutral', 'neutral'], c2_bal_3: ['concerned', 'concerned'], c2_tw_bal2: { i: 'annoyed', e: 'stop' },
  c2_bal_4: { i: ['urgent', 'urgent', 'neutral'], e: ['No'] }, c2_bal_5: ['pleased', 'uncertain', 'neutral'], c2_bal_6: ['neutral', 'neutral'],
  c2_bal_7: ['concerned', 'concerned', 'neutral', 'neutral'], c2_bal_wait: ['neutral', 'urgent'], c2_bal_build: ['pleased', 'neutral', 'uncertain'],
  c2_bal_built: ['pleased', 'pleased', 'uncertain', 'neutral', 'pleased'], c2_bal_after: ['neutral', 'concerned'],
  c2_zoe_in: { i: ['neutral', 'neutral', 'uncertain'], e: [null, null, 'order'] }, c2_zoe_broadcast: ['neutral', 'concerned', 'urgent', 'urgent'],
  c2_zoe_after: ['relieved', 'pleased', 'concerned'], c2_zoe_notyet: 'annoyed',
  c2_vesk_1: { i: ['neutral', 'neutral', 'curious'], e: [null, 'Baldino', 'you'] }, c2_tw_vesk1: { i: ['annoyed', 'annoyed'], e: [null, 'thirty'] },
  c2_vesk_2: { i: ['annoyed', 'neutral', 'concerned', 'neutral'], e: ['everyone'] }, c2_bal_vesk: { i: ['urgent', 'urgent'], e: ['IS'] },
  c2_vesk_3: ['annoyed', 'annoyed', 'neutral'], c2_tw_vesk2: 'annoyed', c2_vesk_4: ['neutral', 'concerned'],
  c2_after_tw: { i: ['urgent', 'concerned', 'urgent'], e: ['ship'] }, c2_ship_bal: ['neutral', 'neutral'], c2_ship_bal2: ['neutral', 'uncertain'],
  c2_after_bal: ['neutral', 'urgent', 'urgent'], c2_ar_sealed: ['curious', 'neutral', 'concerned'], c2_zoe_sealed: ['concerned', 'concerned'],
  c2_tw_sealed0: 'annoyed', c2_bal_sealed1: ['neutral', 'concerned', 'uncertain'], c2_tw_sealed: { i: 'annoyed', e: 'wait' },
  c2_bal_sealed2: ['annoyed', 'neutral', 'neutral'], c2_doran_sealed: ['curious', 'neutral', 'neutral', 'neutral'],
  // ---------------------------------------------------------------- chapter 3, under the shell (c3_)
  c3_tw_arrive: ['concerned', 'concerned', 'concerned'], c3_bal_radio1: ['curious', 'concerned', 'urgent'], c3_sendell_1: 'neutral',
  c3_tw_sendell1: { i: ['curious', 'curious', 'curious'], e: [null, 'her', 'under'] }, c3_sendell_2: ['neutral', 'concerned'],
  c3_tw_sendell2: 'annoyed', c3_sendell_3: ['concerned', 'concerned', 'concerned'], c3_tw_sendell3: ['neutral', 'neutral'], c3_sendell_4: ['neutral', 'concerned'],
  c3_sendell_crystals: ['neutral', 'pleased', 'urgent'], c3_bal_radio2: ['urgent', 'neutral', 'neutral'], c3_bal_radio3: ['pleased', 'neutral', 'neutral'],
  c3_core_vesk1: ['neutral', 'pleased', 'pleased', 'neutral'], c3_core_tw1: { i: ['urgent', 'concerned', 'neutral', 'urgent'], e: ['alive'] },
  c3_core_vesk2: ['annoyed', 'annoyed', 'neutral'], c3_core_vesk3: ['annoyed', 'annoyed'], c3_vesk_over1: ['annoyed', 'annoyed', 'annoyed'],
  c3_tw_over: ['urgent', 'urgent', 'neutral'], c3_vesk_over2: { i: ['annoyed', 'annoyed', 'urgent', 'urgent'], e: ['Over', 'built'] },
  c3_vesk_over3: { i: 'annoyed', e: 'me' }, c3_vesk_coil: ['annoyed', 'urgent'], c3_vesk_hit1: ['urgent', 'annoyed'],
  c3_vesk_hit2: { i: ['concerned', 'urgent', 'urgent'], h: 1 }, c3_vesk_down: ['annoyed', 'annoyed'], c3_tw_down: ['annoyed', 'annoyed'],
  c3_vesk_helped: { i: ['uncertain', 'concerned', 'neutral', 'neutral'], h: 1 }, c3_vesk_left: ['annoyed', 'annoyed', 'annoyed'],
  c3_tw_switch: ['neutral', 'uncertain'], c3_bal_end: { i: ['relieved', 'pleased', 'pleased', 'neutral'] }, c3_sendell_end: ['relieved', 'pleased'],
  // ---------------------------------------------------------------- the epilogue (ep_)
  ep_zoe_1: { i: 'annoyed', e: 'dinner' }, ep_tw_1: { i: ['pleased', 'pleased'], e: ['am', 'that'] }, ep_ar_1: ['urgent', 'curious', 'curious', 'curious'],
  ep_tw_2: { i: 'pleased', h: 1 }, ep_zoe_2: ['pleased', 'pleased'], ep_zoe_3: ['neutral', 'neutral', 'pleased', 'pleased'],
  ep_gilbert: ['pleased', 'pleased', 'pleased'], ep_mira: ['pleased', 'pleased'], ep_doran: ['relieved', 'pleased', 'pleased', 'pleased'],
  ep_arthur: 'curious', ep_zoe_idle: ['pleased', 'pleased', 'pleased'], ep_baldino_vesk: ['neutral', 'neutral', 'annoyed', 'annoyed'],
  // ---------------------------------------------------------------- the middle chapters: Sendell, Arthur's call, home again
  c5_doran_1: ['curious', 'annoyed', 'uncertain', 'uncertain', 'pleased'], c5_zoe_radio2: ['concerned', 'concerned', 'concerned'], c5_tw_radio: ['neutral', 'curious'],
  c5_zoe_radio3: ['pleased', 'neutral', 'concerned'], c7_sendell_1: 'neutral', c7_tw_s1: ['neutral', 'concerned', 'concerned'],
  c7_sendell_2: ['neutral', 'concerned', 'concerned', 'concerned'], c7_tw_s2: { i: 'curious', e: 'she' }, c7_sendell_4: ['neutral', 'neutral', 'urgent'],
  c7_tw_v1: 'pleased', c7_arthur_1: { i: ['curious', 'urgent', 'urgent', 'urgent', 'urgent'] }, c7_tw_ar1: ['neutral', 'curious'],
  c7_arthur_2: ['concerned', 'concerned', 'concerned', 'concerned'], c7_tw_ar2: { i: ['urgent', 'neutral', 'urgent'], e: [null, null, 'nobody'] },
  c8_tw_1: ['concerned', 'concerned', 'neutral'], c8_zoe_1: { i: ['relieved', 'pleased'], b: 1 }, c8_ar_1: ['pleased', 'pleased', 'curious', 'curious'],
  c8_zoe_2: ['concerned', 'concerned'], c8_tw_z1: ['neutral', 'curious'], c8_ar_2: ['urgent', 'neutral', 'annoyed'], c8_zoe_4: ['neutral', 'neutral', 'pleased'],
  c8_gil_1: { i: ['urgent', 'annoyed', 'annoyed', 'annoyed'], e: [null, null, 'MY'] }, c8_tw_g1: ['urgent', 'neutral', 'neutral'],
  c8_gil_2: ['pleased', 'pleased', 'uncertain', 'neutral'], c8_gil_after: ['urgent', 'pleased', 'pleased'], c8_mira_1: ['neutral', 'annoyed', 'annoyed'],
  c8_tw_m1: ['urgent', 'neutral'], c8_mira_2: ['pleased', 'neutral'], c8_mira_after: ['pleased', 'pleased', 'pleased'], c8_zoe_5: ['neutral', 'neutral', 'neutral'],
  c8_zoe_lh3: ['concerned', 'concerned', 'annoyed'], c8_tw_c1: ['concerned', 'concerned', 'concerned'], c8_tw_c2: ['neutral', 'neutral', 'neutral'],
  c9_tw_arrive: ['concerned', 'neutral', 'neutral'], c9_tw_b1: ['concerned', 'neutral', 'curious'], c9_bal_3: ['neutral', 'neutral', 'uncertain', 'pleased'],
  c9_tw_c2: 'neutral', c9_bal_c3: { i: ['pleased', 'pleased', 'urgent'], e: ['network'] }, c9_tw_c3: 'pleased',
  dt_vesk_0: 'neutral', dt_vesk_1: ['neutral', 'neutral', 'neutral'], dt_vesk_2: ['annoyed', 'annoyed'], dt_tw_again: ['neutral', 'concerned'],
  dt_vesk_3: ['annoyed', 'annoyed'], dt_vesk_4: { i: ['annoyed', 'annoyed'], h: 1 }, dt_tw_gate1: ['annoyed', 'neutral', 'annoyed'],
  dp_vesk_fight: ['annoyed', 'annoyed'], dp_vesk_over: { i: 'urgent', e: 'console' },
  co_vesk_up_helped: ['uncertain', 'neutral'], co_vesk_up_left: ['annoyed', 'neutral', 'neutral'], co_vesk_key: ['neutral', 'neutral'], co_tw_key: 'pleased',
  co_bal_end: { i: ['relieved', 'pleased', 'neutral'] }, co_vesk_guard: ['annoyed', 'annoyed'], co_ar_two: { i: ['urgent', 'urgent', 'urgent', 'urgent', 'pleased'] },
  co_zoe_sig: ['pleased', 'neutral', 'neutral'], cn_vesk_1: ['neutral', 'neutral', 'neutral', 'annoyed'], cn_vesk_2: ['annoyed', 'annoyed', 'annoyed'],
  cn_tw_vesk: { i: 'annoyed', e: 'cut' }, cn_bal_iso2: ['neutral', 'neutral', 'pleased', 'uncertain', 'concerned'],
  zt_vesk_1: ['neutral', 'neutral', 'neutral'], zt_vesk_2: ['curious', 'neutral', 'neutral', 'neutral'], zt_bal_bench: ['curious', 'curious', 'pleased', 'pleased'],
  l_tw_pliers: 'curious', l_ar_pliers1: { i: ['uncertain', 'uncertain', 'neutral'], h: 1 }, l_tw_pliers2: { i: 'curious', e: 'now' }, l_ar_pliers2: ['neutral', 'uncertain', 'uncertain', 'uncertain'],
  e2_ar_hint: ['urgent', 'pleased', 'neutral'], e2_tw_set: 'curious', e2_ar_set3: ['concerned', 'concerned', 'urgent'], e2_ar_set4: ['pleased', 'pleased'],
  nw_ar_1: ['curious', 'neutral', 'neutral', 'concerned'], nw_tw_ar: { i: ['curious', 'concerned', 'neutral'], e: ['Four', 'three'] }, nw_ar_home: ['annoyed', 'neutral', 'neutral', 'pleased'],
  nw_zoe_hold: ['annoyed', 'pleased'], nw_zoe_right: ['relieved', 'pleased'], c10_ar_close: ['urgent', 'pleased'], c10_ar_right: ['relieved', 'pleased'],
  c10_ar_mic: { i: ['curious', 'curious', 'neutral', 'pleased'] }, c10_zoe_3: ['pleased', 'neutral', 'pleased'], c10_bal_p3: ['relieved', 'pleased', 'pleased', 'urgent'],
  c10_tw_p1: 'concerned', c10_tw_p2: 'neutral', c10_bal_p2: { i: ['neutral', 'uncertain'] },
};

// the brief's intentions -> the plan's (voiceplan.js clauses: tell, ask, excl, no, worry, warm, unsure)
export const INTENT_KEY = { neutral: 'tell', curious: 'ask', uncertain: 'unsure', pleased: 'warm', relieved: 'warm', concerned: 'worry', urgent: 'excl', annoyed: 'no' };

let BY_TEXT = null;
// the delivery of a line, by its text: { sentences: [{ intent, emph, pause }], hesitate, breath } or null
export function metaFor(text) {
  if (!text) return null;
  if (!BY_TEXT) {
    BY_TEXT = new Map();
    const en = STR?.en || {};
    for (const [k, m] of Object.entries(VOICE_META)) {
      const s = en[k];
      if (typeof s === 'string') BY_TEXT.set(norm(s), m);
      else if (Array.isArray(s)) for (const x of s) if (typeof x === 'string') BY_TEXT.set(norm(x), m);
    }
  }
  const m = BY_TEXT.get(norm(text));
  return m ? expand(m) : null;
}
// (a text module loaded after the first lookup: build the map again)
export function resetVoiceMeta() { BY_TEXT = null; }
const norm = (s) => s.replace(/\s+/g, ' ').trim();
// (the audition view and the tests: a delivery from a value written as in VOICE_META, e.g. 'urgent')
export const expandMeta = (m) => expand(m);
function expand(m) {
  const o = typeof m === 'string' || Array.isArray(m) ? { i: m } : m;
  const I = Array.isArray(o.i) ? o.i : [o.i];
  const E = Array.isArray(o.e) ? o.e : [o.e];
  const one = !Array.isArray(o.i);
  return {
    // (one intention for the line: every sentence; a list: one each, the last repeated)
    intent: (k) => { const x = one ? I[0] : I[Math.min(k, I.length - 1)]; return x ? INTENT_KEY[x] || 'tell' : null; },
    name: (k) => (one ? I[0] : I[Math.min(k, I.length - 1)]) || null,
    emph: (k, last) => (Array.isArray(o.e) ? E[k] || null : last ? o.e || null : null),
    pause: (k) => (o.p && o.p[k]) || 0,
    hesitate: !!o.h, breath: !!o.b || I[0] === 'relieved',
  };
}
