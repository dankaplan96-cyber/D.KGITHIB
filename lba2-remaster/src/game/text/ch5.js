// Chapter 5 — "Steam and Sand" (Desert Island). English only.
import { STR } from '../i18n.js';

Object.assign(STR.en, {
  p_dig: 'Dig', p_fill: 'Fill', p_board: 'Board', p_relief: 'Open',

  // evening in Kesh: the plan, then the setback
  c5_narr: 'That evening, in Kesh.',
  c5_ilka_1: "The test bore is the vent. If we open it fast, the steam goes down into the aquifer and boils the oasis.",
  c5_ilka_2: 'FunFrock built condensers here to cool his own steam engines. If they still work, we can send the steam through them and let it out slowly.',
  c5_hesk_1: "The old hall under the dunes, east of the camp road. Half buried. My grandfather worked there. He hated it.",
  c5_tarra_1: 'Then open it. Kesh has been thirsty long enough.',
  c5_dallan_1: 'Attention, Kesh. By order of the Joint Project, the ferry at the pier is requisitioned for the evacuation.',
  c5_doran_1: "Requisitioned? That's MY ferry. Well. Baldino's. Well. The project's. Still mine to sail!",
  c5_dallan_2: 'The evacuation list is posted on the stall. Pick-up points: the research post. Project staff only.',
  c5_weaver_1: "Project staff only? There are sixty of us in Kesh!",
  c5_dallan_3: 'I follow the plan.',
  c5_tw_1: "Then we'd better make the plan unnecessary. The hall, Hesk.",

  // the drift and the shovel
  c5_drift: 'The door is buried under a drift. I need a shovel.',
  c5_trader_1: "A shovel? Water first. Fill this jar at the oasis, and the shovel's yours. Business is business.",
  c5_toast_jar: 'Empty jar',
  c5_fill: 'Cool, clean water. The oasis is full again.',
  c5_toast_water: 'Jar of water',
  c5_trader_2: 'Lovely. A fair trade. Bring the shovel back. Or don\'t, it\'s an old shovel.',
  c5_toast_shovel: 'Shovel',
  c5_trader_wait: 'The oasis, the jar, the water. Then the shovel.',
  c5_dug: 'Sand, more sand, and then a rusted door with a wheel. It turns.',

  // the valve hall
  c5_hall_in: 'FunFrock\'s condenser hall. And his old security drones are still awake.',
  c5_diagram: 'A diagram: 1 from the bore, open. 2 is a bypass to the aquifer, shut. 3 and 4 feed the condensers, open.',
  c5_toast_valve: 'Valve {v}: {state}',
  c5_open: 'open', c5_shut: 'shut',
  c5_valve_aquifer: 'The aquifer gauge jumps into the red. Not that one.',
  c5_routed: 'All three needles settle in the green. The hangar door unlocks with a clang.',
  c5_hangar_in: 'A hangar. Three condensers, and something big under a tarp.',
  c5_glider_1: 'A FunFrock cargo glider. The wings are sound. Hesk would know what to do with it.',
  c5_hatch: 'The roof hatch grinds open. Daylight pours in.',
  c5_toast_hatch: 'Roof hatch open',

  // the relief valve
  c5_dallan_gate1: 'Twinsen. I suppose you want me to look the other way.',
  c5_tw_gate1: "I want you to look at the gauges. Open the relief valve slowly, and the steam goes through FunFrock's condensers instead of under Kesh.",
  c5_dallan_gate2: 'My orders say the bore stays capped, and Kesh is not on the list.',
  c5_tw_gate2: 'Your orders say sixty people stay behind. You knew that on Zeelich.',
  c5_dallan_gate3: '...The gate is open. I didn\'t see you. Be quick, the pressure is higher than the reports say.',
  c5_relief_1: 'The wheel is stiff. One turn. Two. The ground starts to shake.',
  c5_toast_out: 'Get out of the post!',
  c5_vent_1: 'Geysers burst through the pad, then fall back. Far to the south, two white plumes rise from the dunes. The condensers are working.',
  c5_tw_vent: "It's breathing. And Kesh is dry. In the good way.",

  // the radio, and the way north
  c5_kesh_1: 'Kesh is celebrating. Tarra wants to see you.',
  c5_tarra_2: 'You gave us water twice. Take this. It is for luck, and you will need it.',
  c5_toast_clover: 'Clover leaf',
  c5_ilka_radio: 'Twinsen! Zoé is on my radio. I sent her the carving.',
  c5_zoe_radio1: "Twinsen? Ilka's map matches Grandpa's old charts. The second vent is in the Hamalayi. Under the ice, near an old observatory.",
  c5_zoe_radio2: "The ice up there is melting from below. The villages are cut off. Nobody's on the project's list.",
  c5_tw_radio: "Then that's where I'm going. How's Arthur?",
  c5_zoe_radio3: "Building a radio for every house on Bug Street. Go. And come back.",
  c5_dallan_k1: 'The ferry left without me. Project headquarters recalled it. I am not on the list either, it seems.',
  c5_ilka_k1: 'Welcome to Kesh, Dallan. The water is free.',
  c5_hesk_k1: "The ferry's gone. But that glider in the hangar... it can glide, it can't climb. Launch it from the hangar roof into the wind and we'll reach the Hamalayi foothills.",
  c5_hesk_k2: 'Meet me in the hangar. Bring a coat. It gets cold up north.',
  c5_board_1: "Hesk pulls the tarp away. The glider rolls out under the open hatch, into a gust of hot wind.",
  c5_hesk_board: "Hold on. And if you know any prayers to Sendell, now's the time.",

  // objectives and journal
  c5_obj_hall: "Get into FunFrock's condenser hall",
  c5_sub_shovel: 'Get a shovel from Brosk',
  c5_sub_water: 'Fill the jar at the oasis',
  c5_obj_valves: 'Route the steam through the condensers',
  c5_sub_diagram: 'Read the diagram',
  c5_obj_relief: "Open the test bore's relief valve at the post",
  c5_obj_out: 'Get out of the post!',
  c5_obj_kesh: 'Go back to Kesh',
  c5_obj_hesk: 'Ask Hesk about a way north',
  c5_obj_glider: 'Meet Hesk in the hangar',
  c5_obj_hatch: 'Open the hangar roof hatch',
  c5_j_plan: 'Ilka wants to send the vent\'s steam through FunFrock\'s old condensers.',
  c5_j_ferry: 'Dallan requisitioned the ferry. Kesh is not on the evacuation list.',
  c5_j_routed: 'I routed the steam to the condensers.',
  c5_j_vent: 'Dallan let me through. The desert vent is open, and the oasis is safe.',
  c5_j_north: "Zoé found the second vent: in the Hamalayi ice. Hesk is flying me north in FunFrock's glider.",
  it_jar: 'Jar', itd_jar: "Brosk's jar.",
  it_shovel: 'Shovel', itd_shovel: "Brosk's old shovel.",
});
