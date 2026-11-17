// RELEASE-AUDIT-v96 probe: what the desktop build's voices do. The desktop package copies tools/game-files.mjs's list,
// which has no assets/voice2 (the Expressive banks, the default Voice Style). BLOCK=1 answers every assets/voice2/
// request with 404, as the desktop app's files would; without it, the web build as served. After a new game and Zoé's
// first lines: the setting, whether the Expressive manifest loaded, and whether Zoé's voice finds an Expressive bank.
// Automated runtime only; nothing listened to.
import { launch, open, menu, checker } from '../lib/boot.mjs';
const { check, done } = checker({ info: 'always' });
const BLOCK = !!process.env.BLOCK;
const { browser, page } = await launch({});
const asked = [];
await page.route('**/assets/voice2/**', (r) => { asked.push(r.request().url().replace(/.*assets\//, '')); return BLOCK ? r.fulfill({ status: 404, body: 'not in the package' }) : r.continue(); });
await open(page, '?nocine');
await menu(page, 'new');
const r = await page.evaluate(async () => {
  game.testFreeze = true; game.step(0.5); P.settle();
  const V = await import('/src/engine/voice.js');
  // (Zoé speaks: her line plans and loads the banks the way a conversation does)
  const { t } = await import('/src/game/i18n.js');
  game.say('n_zoe', [t('op_zoe_1')], null, P.npc('zoe')); for (let i = 0; i < 30; i++) { game.step(0.1); await new Promise((f) => setTimeout(f, 50)); }
  P.settle();
  const v = V.voiceFor('n_zoe');
  return { mode: game.settings.voiceMode, expr: V.exprBankOf(v), plan: V.planVoiceLine(v, 'Twinsen. The tap has stopped again.').dur };
});
console.log('voice2 requests:', asked.length, asked.slice(0, 6));
check(`${BLOCK ? 'voice2 missing (desktop package)' : 'voice2 served (artifact)'}: Voice Style is Expressive`, r.mode === 'expressive', r);
check(`${BLOCK ? 'voice2 missing' : 'voice2 served'}: Zoé's voice ${BLOCK ? 'has no' : 'has an'} Expressive bank`, BLOCK ? !r.expr : !!r.expr, r);
await done();
await browser.close();
