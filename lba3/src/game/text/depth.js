// DEPTH first wave (docs/lba-maturity/DEPTH-PLAN.md): the singing crystals' layer (COL-1), Old Jaspa's warm gems on
// Knartas (ISL-1), the pilgrims' waystone on the monastery terrace (HAM-1). src/game/story/depth.js. English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  // ---- COL-1: the singing crystals (the count's toast is common.js toast_crystal)
  crystal_twelve: "(Twelve. They don't hum any more, they sing. One note, all together.)",
  dx_toast_owed: 'Singing crystal',
  dx_c12_catch: 'Not yet, Twinsen. Twelve of my splinters hold you up. Once.',
  dx_c12_home: "(The twelve crystals are still singing in my pocket. Sendell's note. I think she hums along.)",
  dx_j_title: 'Singing crystals ({n} of {max})',
  dx_j_crystals: 'Singing crystals: each one I find makes me a little tougher. Some lie hidden; some are given for a favour.',

  // ---- ISL-1: Old Jaspa's warm gems (Knartas's gem-sorting room)
  dx_jaspa_1: 'The project only takes cold stones. A warm one cracks in their machines, and they fine me for it.',
  dx_jaspa_2: "My eyes can't tell them apart any more. That tray by the wall: cold ones in PROJECT, warm ones in KEEP.",
  dx_jaspa_3: 'My mother used to say warm ones sweat. She never said what that looks like.',
  dx_jaspa_wait: 'Cold in PROJECT, warm in KEEP. My mother said warm ones sweat.',
  dx_jaspa_wrong_warm: "That one sweats! They'll fine me. Tip it all back on the tray. Again.",
  dx_jaspa_wrong_cold: "That one's cold, and you kept it. The project pays for cold ones. Back on the tray. Again.",
  dx_jaspa_done1: 'Two warm, four cold. All of it right.',
  dx_jaspa_done2: "Here. This one hums louder than the rest. They never wanted it. I never knew why I kept it.",
  dx_jaspa_after: "Since you sorted that tray I look for the sweat. I see it now. Mostly.",
  dx_tray_look: 'A tray of blue stones between two bins, PROJECT and KEEP. Jaspa\'s work, not mine.',
  dx_tray_empty: 'The tray is empty.',
  dx_tray_done: 'Sorted. Two in KEEP, four in PROJECT.',
  dx_gem_warm: 'This one wears a pale crust, and a thread of dust rises off it.',
  dx_gem_warm_dig: '(Like the warm discs at the dig: crystal over them, dust rising.)',
  dx_gem_cold: 'Clean and glassy. Cold in my hand.',
  dx_bin_project: 'The PROJECT bin. A little lamp sits on its rim.',
  dx_bin_keep: 'The KEEP bin. Jaspa\'s own.',
  dx_gem_fork: 'Two stones on the tray ring back. The others stay quiet.',
  dx_gem_fork1: 'One stone on the tray rings back. The others stay quiet.',
  dx_gem_fork0: 'Nothing on the tray rings back.',
  dx_j_jaspa: 'Old Jaspa on Knartas can no longer tell warm gems from cold. Cold ones go in the PROJECT bin, warm ones in KEEP; the project fines him for a warm one.',
  dx_j_jaspa_rule: 'Jaspa: "My mother said warm ones sweat."',

  // ---- HAM-1: the pilgrims' waystone (the monastery terrace)
  dx_way_look: 'An old waystone. Its upper stone turns on the pillar, carved on four sides: a dome, a roof, houses, ice.',
  dx_way_s0: "The ice faces the glacier. Cold, and nobody's shrine.",
  dx_way_s1: "The roof faces the monastery's roof. That's the monks' hall, not a shrine.",
  dx_way_s3: "The dome faces down the valley, at Lhar's roofs. Nobody climbed up here to look back down.",
  dx_way_ok: 'The dome faces the dome on the ridge. Something clicks inside the stone.',
  dx_way_open: 'A slab at its foot sinks into the step. There is a niche behind it.',
  dx_way_words: 'Words cut inside the niche: FOR THE LAST PILGRIM.',
  dx_way_done: 'Facing the dome. The pilgrims would leave it like that.',
  dx_way_tenpa1: 'Before the last climb, pilgrims stopped at the waystone on the terrace and turned it to face the shrine.',
  dx_way_tenpa2: 'Nobody climbs for that now. The stone still turns. Mind your fingers.',
  dx_way_tenpa_hint: 'The shrine? Ask the altar here. It remembers more than I do.',
  dx_way_tenpa_done: 'Each pilgrim left a crystal in that niche for the next. Yours waited a long time.',
  dx_j_way: 'Brother Tenpa: before the last climb, pilgrims turned the waystone on the monastery terrace to face the shrine.',
});
