// H-15 · The Francos' dig, twelve years on (docs/lba-maturity/FRANCOS.md; story/francos.js; the pieces: francosworld.js).
// English only; short, plain lines. No night, evening, tonight, sunset, dawn or dusk: two suns, no time of day. No player line says "Francos" (the islanders
// are drawn as Esmers). New people: Foreman Mott, Old Gubb, Pella and Tuffo, the diggers of Knartas. The Great Waker is our own invention (not LBA2's).
import { STR } from '../i18n.js';
import '../he-text.js';   // (HE-TEXT: the Hebrew of these lines; a key missing there shows the English)

Object.assign(STR.en, {
  n_fr_mott: 'Foreman Mott', n_fr_gubb: 'Old Gubb', n_fr_pella: 'Pella', n_fr_tuffo: 'Tuffo',

  // ---- Foreman Mott: the story and the spade
  fr_mott_0: 'Twelve years we have dug for the Great Waker. The Founder buried it here. It woke the first shift.',
  fr_mott_1: 'Every digger knows a piece of the old rhyme. Nobody agrees which piece. Ask them, if you have a day.',
  fr_mott_2: 'Here, a spare spade. Everyone on Knartas has a spare. Dig where you like. Just not in Gubb\'s holes.',
  fr_mott_wait: 'Found it? No? Then you are one of us now.',
  fr_mott_all: 'You have heard them all? Then you know more than any of us. We never listen to each other.',
  // ---- the three tips
  fr_gubb_0: 'The rhyme goes: "Below the gold dome lies the Waker." Below! Under the house!',
  fr_gubb_1: 'The foreman won\'t let me dig up his floor. So I dig as close to his wall as he lets me.',
  fr_tw_gubb: '(Below the gold dome... or just downhill from it?)',
  fr_gubb_again: 'Closer to the wall every year. One day he goes out for soup, and I go in.',
  fr_pella_0: 'My mother\'s half of the rhyme: "Twelve steps from the Founder\'s Seat, the way the Founder looked."',
  fr_pella_1: 'I sit on the seat, I look where it looks, and I count. One, two... seven. Then I lose count. So I dig at seven.',
  fr_tw_pella: '(Her holes run in a line from the seat. The rest of the line is still to dig.)',
  fr_pella_again: 'Seven. Eight? No. Seven. Seven is lucky.',
  fr_tuffo_0: 'Shh! Grandad says the Waker hums under the ground. I listen for it.',
  fr_tuffo_1: 'All I ever hear is Old Gubb\'s spade. And my tummy.',
  fr_tw_tuffo_set: '(Something buried that hums. Arthur\'s Pocket Set hears things that hum. Worth a try.)',
  fr_tw_tuffo_noset: '(Something that hums... I have nothing to hear it with. Where the other tips meet, I\'ll dig.)',
  fr_tuffo_again: 'Still nothing. Gubb, stop digging for one minute!',
  // ---- the seat
  fr_seat_look: 'The Founder\'s Seat. Worn smooth by twelve years of diggers sitting on it for luck. It faces the gully below the gold dome.',
  fr_tw_seat: '(Twelve steps from here, that way. Pella stops at seven.)',
  fr_seat_after: 'The Founder\'s Seat. Old Gubb has finally sat down on it.',
  // ---- digging
  fr_dig_none1: 'Stones. Worms. No Waker.',
  fr_dig_none2: 'Earth, and more earth.',
  fr_dig_none3: 'A boot. Not the Waker. Probably Gubb\'s.',
  fr_tw_useset: '(Arthur\'s Pocket Set might hear it from here. Better than digging up the whole island.)',
  fr_dig_box: 'Clunk! A dented tin box. The label says: THE GREAT WAKER. DO NOT OPEN UNTIL FOUND.',
  fr_dig_clock: 'It\'s... an alarm clock. And it\'s still ticking!',
  fr_tuffo_found: 'He found it! Everybody! He FOUND it!',
  fr_x_tomott: 'Show the foreman! Go on!',
  // ---- the hand-over
  fr_mott_see: 'The Great Waker. It\'s... smaller than in the songs.',
  fr_gubb_see: 'The songs have it the size of a house.',
  fr_pella_see: 'How is it still ticking after all these years?',
  fr_tw_wind: 'The back says SELF-WINDING. Every shake winds it. Twelve years of your digging kept it going.',
  fr_mott_wind: 'Then let it wake us properly. Give it a turn.',
  fr_tuffo_ring: 'IT\'S SO LOUD!',
  fr_mott_thanks: 'Twelve years we changed shifts by Gubb\'s stomach. Now the shift starts at six, like the notice says.',
  fr_mott_pay: 'The finder\'s purse: every digger put in a coin a year for whoever found it. It\'s yours. And my spade back, thank you.',
  fr_mott_set: 'We\'ll set it up right where it slept, so the whole island can see it.',
  fr_toast_kashes: '{n} kashes: the finder\'s purse',
  // ---- after
  fr_shrine_look: 'The Great Waker on its pillar, under its own little roof. Its hands point to six.',
  fr_mott_after: 'It rang at six, and the whole shift came on time. First time in twelve years.',
  fr_mott_after2: 'Mind the holes. We\'ll fill them in. One day.',
  fr_gubb_after: 'Below the gold dome. Downhill. Who would have thought.',
  fr_gubb_after2: 'Twelve years of digging. Now I sit.',
  fr_pella_after: 'Twelve steps. I\'ve been practising. Eight, nine, ten...',
  fr_pella_after2: 'Eleven! Nearly there.',
  fr_tuffo_after: 'It hums! I can hear it now. Well, it ticks.',
  fr_tuffo_after2: 'When I\'m big, I\'ll be the one who winds it.',
  // ---- the pockets and the journal
  it_fr_spade: 'Spare spade', itd_fr_spade: 'Foreman Mott\'s spare. Everyone on Knartas has one.',
  it_fr_clock: 'The Great Waker', itd_fr_clock: 'The diggers\' relic: a tin alarm clock with two bells. Still ticking.',
  fr_j_title: 'The dig on Knartas',
  fr_j_hook: 'The diggers of Knartas have dug for their Great Waker for twelve years. Each knows a piece of the rhyme.',
  fr_j_gubb: 'Old Gubb: "Below the gold dome." He digs at its wall.',
  fr_j_pella: 'Pella: "Twelve steps from the Founder\'s Seat, the way the Founder looked." She stops at seven.',
  fr_j_tuffo: 'Tuffo: the Waker hums under the ground.',
  fr_j_dig: 'Dig where the tips meet.',
  fr_j_give: 'Show the Great Waker to Foreman Mott.',
});
