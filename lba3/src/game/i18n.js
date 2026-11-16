// All player-facing text, Hebrew + English.
//
// HE-TEXT (the user, 16.11): the whole game is playable in Hebrew as well as English (Settings → Game → Language).
// English is the default and the source of truth. The story and world text sits in src/game/text/<name>.js (STR.en);
// its Hebrew in src/game/text/he/<name>.js (STR.he), imported by the English file, same keys, same placeholders, same
// number of entries in a list. A key with no Hebrew shows the English (t() below).
// THE STANDING RULE: every new or changed English player line gets its Hebrew line the same day, in the matching
// he/ file. `node tests/dialogue-check.mjs` lists the English keys with no Hebrew (a warning, with a count) and fails on
// a Hebrew line whose placeholders or list length differ from the English. Glossary: docs/lba-maturity/HE-TEXT.md.
// The voices always speak the English line (spoken() below): the gibberish is planned from the English words.

import { HE_I18N } from './text/he/i18n.js';

export const STR = {
  // HE-TEXT: the Hebrew of this file's own English table is text/he/i18n.js (the story's: text/he/<file>.js)
  he: { ...HE_I18N },
  en: {
    continue: 'Continue', new_game: 'New Game', overwrite_q: 'Start a new game?', overwrite_sub: 'The autosave will be replaced. Your save slots are kept.', overwrite_yes: 'New Game', settings: 'Settings', controls: 'Controls', back: 'Back',
    resume: 'Resume', save_quit: 'Save & Quit', paused: 'Paused',
    load_game: 'Load Game', save_game: 'Save Game', slot_n: 'Slot {n}', slot_auto: 'Autosave', slot_empty: 'Empty', slot_latest: 'Latest', slot_delete: 'Delete', slot_bad: "Can't be read",
    slot_overwrite_q: 'Overwrite Slot {n}?', slot_overwrite_yes: 'Overwrite', slot_delete_q: 'Delete Slot {n}?', slot_delete_yes: 'Delete',
    slot_saved: 'Saved in Slot {n}.', slot_deleted: 'Slot {n} deleted.', slot_unreadable: "That save couldn't be read. It was set aside.",
    slot_full: 'Not enough storage space. Save over an old slot, or delete slots from Load Game on the title screen.', slot_fail: "Can't save: the browser's storage isn't available.",
    nosave_scene: "You can't save during a story scene.", nosave_fight: "You can't save during a fight.", nosave_dead: "You can't save right now.", nosave_here: "You can't save here.", nosave_wait: 'Wait a moment, then save.',
    quit_full: "Storage is full, so this spot wasn't saved. Press Save & Quit again to quit anyway.",
    language: 'Language', auto_controls: 'Controls by Device', ac_on: 'Auto', ac_off: 'Off', control_scheme: 'Movement', ctrl_modern: 'Modern', ctrl_classic: 'Classic (LBA2)',
    visual: 'Look', vis_2026: 'LBA3', vis_1997: 'Retro 1997',
    quality: 'Graphics', q_auto: 'Auto', q_high: 'High', q_medium: 'Medium', q_low: 'Low',
    camera: 'Camera', cam_lba: 'Fixed (LBA2)', cam_follow: 'Follow', cam_free: 'Free', cam_dist: 'Camera Distance', cd_near: 'Near', cd_medium: 'Medium', cd_far: 'Far',
    hud: 'HUD', hud_lba: 'Minimal (LBA2)', hud_modern: 'Always on',
    music: 'Music', sfx: 'Sound Effects', voice_vol: 'Voice',
    rebind_title: 'Key Bindings', rebind_hint: 'Click an action, then press a key. Esc cancels.', rebind_press: 'Press a key…', rebind_reset: 'Reset to Defaults',
    kb_up: 'Forward', kb_down: 'Back', kb_left: 'Left', kb_right: 'Right', kb_action: 'Action', kb_interact: 'Talk / Use', kb_ball: 'Throw Ball / Recall', kb_attack: 'Attack', kb_dodge: 'Dodge', kb_focus: 'Focus Target', kb_tswitch: 'Switch Target', kb_swap: 'Swap Weapon', kb_weapons: 'Weapon Wheel', kb_view: 'Camera Distance', kb_recenter: 'Recenter Camera', kb_map: 'Holomap', kb_inventory: 'Inventory', kb_pause: 'Pause',
    auto_talk: 'Dialogue Advances', at_on: 'Automatically', at_off: 'On a Key', text_speed: 'Text Speed', ts_slow: 'Slow', ts_normal: 'Normal', ts_fast: 'Fast', ts_instant: 'Instant',
    text_size: 'Subtitle Size', tsz_normal: 'Normal', tsz_large: 'Large',
    shake_set: 'Camera Shake', sh_on: 'Full', sh_reduced: 'Reduced', sh_off: 'Off',
    weather_set: 'Weather and Light', wx_on: 'On', wx_off: 'Off',   // (WEATHER-1; the Hebrew table falls back to these)
    controls_html: `
      <tr><td colspan="2"><b>Classic (LBA2's keys, the default)</b></td></tr>
      <tr><td>↑ / ↓</td><td>Walk forward / back</td></tr>
      <tr><td>← / →</td><td>Turn</td></tr>
      <tr><td>Space</td><td>Behaviour action: jump (Athletic), attack (Aggressive), hide (Discreet), hop (Normal)</td></tr>
      <tr><td>W</td><td>Talk, open, search</td></tr>
      <tr><td>Alt</td><td>Magic ball: tap to throw · hold, turn with ← / →, release to throw · again while it flies: call it back</td></tr>
      <tr><td>X</td><td>Dodge</td></tr>
      <tr><td>Ctrl + ← / → · F1–F4</td><td>Behaviour: Normal, Athletic, Aggressive, Discreet</td></tr>
      <tr><td>Shift</td><td>Inventory (all your items) and journal</td></tr>
      <tr><td>H</td><td>Holomap</td></tr>
      <tr><td>Enter</td><td>Recenter the camera</td></tr>
      <tr><td>Esc</td><td>Menu</td></tr>
      <tr><td colspan="2"><b>Modern</b></td></tr>
      <tr><td>WASD / arrows</td><td>Move (camera-relative) · Mouse: aim · E talk · F ball · Shift dodge · I inventory · M holomap</td></tr>
      <tr><td colspan="2"><b>Both</b></td></tr>
      <tr><td>Left click / K</td><td>Attack with the weapon in hand (hold: charge the ball, or a heavy sword strike)</td></tr>
      <tr><td>Right click / L</td><td>Focus on a target · wheel / T: next target</td></tr>
      <tr><td>R · hold G (Classic) / X (Modern)</td><td>Swap to the last weapon · weapon wheel</td></tr>
      <tr><td>Q</td><td>Camera distance</td></tr>
      <tr><td>Gamepad</td><td>Left stick move · right stick camera · D-pad the four behaviours: ↑ Normal · → Athletic · ↓ Aggressive · ← Discreet · A action / talk · X attack · Y ball · B dodge · View inventory · LT holomap · RT weapon wheel · LB swap · RB focus · R3 next target · Menu pause</td></tr>`,
    wp_fists: 'Fists', wp_ball: 'Magic Ball', wp_sword: 'Sword', wp_pulse: 'Pulse Tool',
    difficulty: 'Difficulty', df_gentle: 'Gentle', df_normal: 'Normal', df_hard: 'Hard',
    aim_assist: 'Aim Assist', aa_off: 'Off', aa_low: 'Low', aa_normal: 'Normal', aa_high: 'High',
    lock_mode: 'Focus Button', lm_toggle: 'Toggle', lm_hold: 'Hold',
    beh_normal: 'Normal', beh_athletic: 'Athletic', beh_aggressive: 'Aggressive', beh_discreet: 'Discreet',
    p_talk: 'Talk', p_search: 'Inspect', p_rummage: 'Search', p_read: 'Read', p_open: 'Open', p_shop: 'Shop', p_gate: 'Inspect',
    fit_lower: 'The game runs below 50 fps here. Try the {q} graphics preset in Settings.', fit_res: 'The game runs below 50 fps here. Try Resolution: Auto in Settings.',
    toast_saved: 'Game saved', toast_save_full: 'Storage is full: the autosave failed. Delete old slots from Load Game.', toast_save_fail: "Can't save: the browser's storage isn't available.", toast_clover: 'A clover leaf saved you!', toast_save_error: "The save couldn't be loaded. It was kept aside; starting a new game.",
    toast_magic: 'Magic level {n}!', toast_nomp: 'Not enough magic: weak throw',
    toast_clover_found: 'Clover leaf',
    toast_alert: 'Spotted!',
    hint_jump: 'Athletic ({b}), then {k} to jump',
    hint_armour: 'The armour takes it. Hold {b} for a charged throw, or land a heavier blow (a kick: the third {k}).',
    boss_name: 'Warden Krell',
    map_close: 'M / Esc to close',
    gameover: 'Twinsen is down', gameover_sub: 'No clover leaves left. Retry returns to the last autosave with full health.', retry: 'Retry from Last Autosave',
    shop_title: "Pippa's Stall", shop_leave: 'Leave',
    shop_potion: 'Heart potion: full health', shop_flask: 'Magic flask: half your magic back', shop_clover: 'Clover leaf: extra life',
    shop_max: 'Already at maximum.',
    n_pippa: 'Pippa', n_hero: 'Twinsen',
  },
};

let lang = 'en';
export const setLang = (l) => { lang = l; };
export const getLang = () => lang;
export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars && typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

// HE-TEXT: the English source of a line on screen. The dialogue box and the subtitles are given the text, not the key,
// and the voices (engine/voice.js: the phrase chosen, its length, its delivery in text/voicemeta.js) are planned from
// the English words, so a line sounds the same whatever language the box shows. Hebrew -> English, built from the
// tables (a list's entries one by one; a line with placeholders by its pattern). Text that is no translation (English
// already, a line put together from pieces) comes back as it is. spoken.miss: the lines not found (tests).
let REV = null, REV_N = -1, REV_PAT = [];
const revBuild = () => {
  REV = new Map(); REV_PAT = [];
  const he = STR.he, en = STR.en;
  const put = (h, e) => {
    if (typeof h !== 'string' || typeof e !== 'string' || !h) return;
    if (!REV.has(h)) REV.set(h, e);
    if (/\{[a-z][a-z0-9]*\}/i.test(h)) {
      const names = [];
      const src = h.split(/(\{[a-z][a-z0-9]*\})/i).map((p) => { const m = /^\{([a-z][a-z0-9]*)\}$/i.exec(p); if (m) { names.push(m[1]); return '([\\s\\S]*?)'; } return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('');
      REV_PAT.push({ re: new RegExp('^' + src + '$'), names, en: e });
    }
  };
  for (const k of Object.keys(he)) {
    const h = he[k], e = en[k];
    if (Array.isArray(h)) h.forEach((x, i) => put(x, Array.isArray(e) ? (e[i] ?? e.join(' ')) : e));
    else put(h, Array.isArray(e) ? e.join(' ') : e);
  }
  REV_N = Object.keys(he).length;
};
export function spoken(text) {
  if (lang === 'en' || typeof text !== 'string' || !text) return text;
  if (!REV) revBuild();
  let e = REV.get(text);
  if (e === undefined && Object.keys(STR.he).length !== REV_N) { revBuild(); e = REV.get(text); }   // (a text module loaded since)
  if (e !== undefined) return e;
  for (const P of REV_PAT) {
    const m = P.re.exec(text);
    if (m) { let s = P.en; P.names.forEach((n, i) => { s = s.replace(`{${n}}`, m[i + 1]); }); return s; }
  }
  if (/[\u0590-\u05ff]/.test(text)) spoken.miss.add(text);
  return text;
}
spoken.miss = new Set();

// ------------------------------------------------------------------
// LBA3 – The Awakening: prologue texts (original fan story)

Object.assign(STR.en, {
  logo_sub: 'THE AWAKENING',
  title_sub: 'An unofficial fan sequel to Little Big Adventure 2',
  to_title: 'Main Menu',
  disclaimer: 'Non-commercial fan project, not affiliated with Adeline Software or [2.21]. The characters and world belong to their owners. Story, models, sound and music are original.',
  voice_credit: 'Character voices generated with Piper (offline) using the LibriTTS-R voice model (CC BY 4.0)',
  map_title: 'Holomap · Citadel Island',
  toast_coins: '+{n} kashes',
  shop_poor: 'Not enough kashes.',
  n_zoe: 'Zoé', n_arthur: 'Arthur', n_gilbert: 'Gilbert', n_mira: 'Mira', n_xil: 'Xil', n_doran: 'Doran', n_tim: 'Tim', n_lulu: 'Lulu', n_sendell: 'Sendell',
  p_well: 'Inspect', p_door: 'Open',
  sign_village: 'Town Square · Citadel Island',
  pr_intro_1: 'Twelve years have passed since Twinsen came back from Zeelich. Twinsun and Zeelich now trade and share research, but the trust between them is still fragile.',
  pr_intro_2: 'On Citadel Island, Twinsen lives quietly with Zoé and their son, Arthur. When something goes wrong in town, people still knock on his door.',
  pr_zoe_1: 'Twinsen! The well in the square has run dry, and half the street is out there arguing about it.',
  pr_zoe_2: 'Could you go and see what happened? I need to finish up here.',
  pr_tw_1: "A blocked well? I won't need the magic ball for that.",
  pr_zoe_3: 'Take it anyway. For me.',
  pr_ar_1: 'Dad! Can I come?',
  pr_zoe_4: 'No.',
  pr_ar_2: 'I never get to come...',
  pr_zoe_ball: "Twinsen. The ball. It's in the cupboard.",
  pr_zoe_go: "Go on, the well won't fix itself. And be back for dinner!",
  pr_zoe_after: "Warm water, crystals, and now Sendell? Sit down. I'll make tea, and you start from the beginning.",
  pr_ar_early: "Tim and Lulu were at the well first thing. Tim had his guilty face on. Worse than usual.",
  pr_ar_told: "Tim told you himself? He never tells grown-ups anything.",
  pr_ar_hint: "Dad, Tim tells Lulu all his secrets when he thinks nobody's listening. You'd have to sneak up really quietly.",
  pr_ar_after: "Dad, you really talked to Sendell? I'm telling the whole class!",
  pr_cupboard: ['The magic ball, the holomap... and a lot of dust.', 'Hello again, old friend.'],
  pr_toast_ball: 'Magic ball ({ball}) · Holomap ({map})',
  pr_well_locked: ["The lid is padlocked. It's the water office's lock.", 'Mira from the water office is by the well, arguing with Gilbert.'],
  pr_well_rope: 'Too deep to jump. I need a rope. The harbour might have one.',
  pr_well_go: "Lid open, rope tied. Let's see what's down there.",
  pr_well_after: 'Still no water. Whatever is happening down there is more than a blockage.',
  pr_locked: "The neighbours are out. They're in the square, arguing about the well like everyone else.",
  pr_chest: "An old crate from FunFrock's army. A few rusty kashes rattle around inside.",
  pr_fort: 'The old fort is shut. A sign reads: "Danger: falling stones. Keep out."',
  pr_gil_1: 'I paid my water bill! So where is my water?',
  pr_mira_1: 'Mr Gilbert, the bill covers the connection, not the water.',
  pr_gil_2: "So I'm paying for an empty pipe?",
  pr_tw_well: "How about we find out what's wrong with the well instead?",
  pr_mira_2: "Twinsen! Find the fault and I'll waive his bill this month. Here's the key to the well lid.",
  pr_gil_3: 'And last month too.',
  pr_gil_wait: 'Still waiting for my water, Twinsen. And my refund.',
  pr_mira_wait: "If you need anything else from the water office, I'm here. Sadly.",
  pr_toast_key: 'Lid Key',
  pr_xil_1: "Greetings, child of Twinsun. I am Xil, trader, of Zeelich. My cargo sits on that barge until the harbour master stamps my unloading permit.",
  pr_xil_2: 'I asked him three times. The third time, he snored.',
  pr_tw_xil: "I'll talk to him.",
  pr_xil_3: 'The stamp! At last. This cargo is for the joint Twinsun–Zeelich energy project: drills, pipes, sensors.',
  pr_xil_4: 'Please take this rope ladder, Twinsen. You look like someone who climbs down a lot of holes.',
  pr_xil_after: 'They say this project will save both our worlds. Vesk says so, anyway, and people listen to Vesk.',
  pr_toast_rope: 'Rope Ladder',
  pr_doran_snore: 'Zzzz... hrrnk... zzzz...',
  pr_tw_snore: '(Better not wake him without a good reason.)',
  pr_doran_1: 'Hm? What? Oh, Twinsen!',
  pr_tw_doran: 'The trader from Zeelich is waiting for his stamp.',
  pr_doran_2: "The Zeelichian? He's only been waiting three days. Waiting is what harbours are for.",
  pr_doran_3: "Fine, fine. For you. There, stamped. Tell him there's no need to thank me. Again.",
  pr_doran_after: 'The harbour is open. More or less.',
  pr_toast_stamp: 'Unloading Permit',
  pr_tim_1: "I didn't throw anything in the well! ...Why?",
  pr_lulu_1: "He didn't throw anything! He's just standing here!",
  pr_tw_kids: "(They're hiding something. If I sneak up quietly, I might hear what.)",
  pr_lulu_2: 'So what was it?',
  pr_tim_2a: 'A glowing stone! I found it on the beach. It was warm and it buzzed like a bee.',
  pr_tim_2b: 'It scared me, so I threw it in the well. Then the water stopped...',
  pr_lulu_3: "Your mum's going to kill you.",
  pr_tw_tim: 'A warm, glowing stone that buzzes?',
  pr_tim_3: "You heard?! I'm sorry! I didn't know it would break the well!",
  pr_tim_4: "There were more, up on the big rocks at the bay. I only took one. Here, have my clover leaf. Just don't tell my mum.",
  pr_tw_tim2: "(Warm crystals on the bay rocks. That's no ordinary stone.)",
  pr_tim_after: 'Did you tell my mum?',
  pr_lulu_after: "I'm keeping the secret. Mostly.",
  pr_pippa: "Twinsen! I hear the well's broken. While you're here, I've got potions, magic flasks and clover leaves. Take a look?",
  pr_pippa_again: 'Back already? Same potions, same flasks, same clover leaves. Same prices, sadly for you.',
  pr_pippa_shop: "Potions, magic flasks, clover leaves. Whatever the island's worried about this week, I've got something for it.",
  pr_toast_tremor: 'The ground shakes',
  pr_cave_1: "The water's warm. Almost hot. And crystals? These weren't here before.",
  pr_cave_2: 'The magic ball is trembling in my pocket. Maybe it can wake those three dark crystals.',
  pr_toast_node: 'Crystal awake ({n}/3)',
  pr_tw_ball: 'The ball is being pulled toward the wall!',
  pr_sendell_1: 'Twinsen.',
  pr_tw_sendell: "Sendell? I haven't heard your voice in years...",
  pr_sendell_2: 'Twinsen. Someone has reached her.',
  pr_obj_ball: 'Take the magic ball from the cupboard',
  pr_obj_well: 'Check the well',
  pr_obj_descend: 'Climb down the well',
  pr_obj_key: 'Lid key (water office)',
  pr_obj_rope: 'A rope (harbour)',
  pr_obj_tim: 'Optional: what did Tim throw in the well?',
  pr_obj_cave: 'Find the source of the heat',
  pr_obj_nodes: 'Wake the three dark crystals',
  pr_obj_done: 'Prologue complete',
  pr_map_well: 'The well',
});
