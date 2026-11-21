// U-3 "Off the Wall" (the user's own side quest, docs/lba-maturity/DEPTH-PLAN.md; story/offwall.js). English only.
// No night, evening, tonight, sunset, dawn or dusk words: the court has no time of day.
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  ow_title: 'Off the Wall',
  n_ow_tali: 'Tali',
  p_move: 'Move',

  // ---- before she has told him the rule (his throws at her bell)
  ow_pre_direct: 'Hey! Not straight at my bell!',
  ow_pre_direct2: "There's a rule. Come here and I'll tell you.",
  ow_pre_alone: 'Off the wall! How do you know my game?',

  // ---- the rule, and her demonstration
  ow_hi_1: "I made up a game. It's got one rule.",
  ow_hi_2: 'Never hit the bell straight. Off the wall first, then the bell. Watch.',
  ow_hi_3: 'See? The wall does the hard part. Now you: stand in my ring, aim at my X, magic ball and all.',
  ow_tw_hi: 'One rule. I can manage one rule.',
  ow_hi_4: 'Everyone says that.',
  ow_hi_alone: "But you already know it. Off the wall, never straight. So, the real games.",

  // ---- a try that does not count
  ow_direct: ['No! Not straight at it. Off the wall first.', "That's straight. Straight doesn't count.", "The bell didn't mind. I did. Wall first!"],
  ow_ground: "Bouncing off the sand isn't a wall, Twinsen. Nice try.",
  ow_c2_sand: ['It touched the sand first. Clean, I said.', "Sand first. That's a bounce, not a shot."],

  // ---- game 1: off the wall
  ow_wait_c1: 'Off the wall, then the bell. My ring, my X.',
  ow_c1_hint: "Stand in my ring. Don't look at the bell, look at my X.",
  ow_c1_hint2: 'The ball leaves the wall at the same slant it came in. Turn a little at a time.',
  ow_c1_done: "Off the wall! That's the game.",

  // ---- game 2: clean
  ow_c2_set: "Next one. I'm moving the bell further out. And no touching the sand: off the wall and onto the bell, clean.",
  ow_wait_c2: 'Off the wall and onto the bell. No sand.',
  ow_c2_hint: 'It comes down too soon. Stand closer to the wall.',
  ow_c2_hint2: "Closer than the bell is. Then bank it back out to it. Or throw harder: it stays up longer.",
  ow_c2_done: 'Clean! Joss has been trying that since spring.',

  // ---- game 3: the board
  ow_c3_set: 'Last one. The bell goes over there, and my board goes in the way.',
  ow_c3_set2: "From my ring there's only one way. It took me a week.",
  ow_wait_c3: "From my ring there's only one way. A week, it took me.",
  ow_c3_hint: "From my ring, off the wall, just past the end of the board. It's thin. A week, I said.",
  ow_c3_mine: 'That\'s my way! A week it took me, and you just did it.',
  ow_tw_board: 'Could it come off your board?',
  ow_c3_board1: "Off the board? It's a board. It's there to be in the way.",
  ow_c3_board2: '...Go on, then. Show me.',
  ow_wait_c3b: 'Off the board, you said. Go on.',
  ow_c3b_again: 'That\'s my way again. The board, you said!',
  ow_c3b_hint: "If the board's a wall, stand where it faces the bell. Over by the slope.",

  // ---- the way she never thought of
  ow_wow_1: 'Off my board!',
  ow_wow_2: 'Nobody said the board was a wall. Nobody said it wasn\'t.',
  ow_wow_3: 'Then it moves. New game, new place.',
  ow_wow_4: "Rector Hougo put up a prize for my game: his singing crystal. He said nobody would win it. Here.",
  ow_wow_5: "It's your court too now. Move the board, move the bell. I'll keep score.",

  // ---- the court (after)
  ow_court_any: ["Move the board, move the bell. I'll keep score.", 'Off the wall, Twinsen. Always off the wall.', 'The board is a wall now. You did that.'],
  ow_ring_5: "Five! Joss says it's luck. It isn't.",
  ow_ring_15: "Fifteen. I'm running out of board.",
  ow_ring_30: 'Thirty. Rector Hougo wants to know why the bell never stops.',
  ow_later_dig: "Move the board, move the bell. I'll keep score.",
  ow_later_steam: "The ground rumbles when the steam goes. The ball doesn't care. I care a bit.",
  ow_later_mid: 'Joss plays now. White wall only. House rules.',
  ow_later_late: 'Rector Hougo had a go. Straight at the bell, every time. He says that\'s a new rule.',
  ow_later_home: "The ground's gone quiet. You can hear the bell from the School now.",

  // ---- her magic top-up; a throw with no magic
  ow_refill: "Your ball's tired. Hold still. There: the first thing they teach us.",
  ow_dud: "It just drops when it's out of magic. Come here, I'll fix that.",
  ow_noball: 'No ball, no game.',
  ow_busy: "Hang on, I'm moving things.",
  ow_toast_magic: 'Tali tops up your magic.',

  // ---- toasts on the court
  ow_toast_ring: 'Off the wall! ({n})',
  ow_toast_direct: "Straight doesn't count.",
  ow_toast_court: 'Tali\'s court: move the board or the bell ({e}).',

  // ---- looked at
  ow_look_bell: "(A school hand-bell on a post. Scratched into the post: TALI'S GAME. NOT STRAIGHT.)",
  ow_look_board: '(An old blackboard from the School, lying in the sand. TALI 31. JOSS 2.)',
  ow_look_board_c3: "(Tali's blackboard, standing in the way. TALI 31. JOSS 2.)",

  // ---- the journal
  ow_j_rule: "Tali's game behind the School: ring her bell off the wall, never straight.",
  ow_j_c2: 'Second game: off the wall and onto the bell without touching the sand.',
  ow_j_c3: "Last game: the bell beside Tali's board. From her ring there's only one way.",
  ow_j_board: 'Show Tali the ball can come off her board.',
  ow_j_done: "Tali's court: move the board and the bell, and play off the wall.",
});
