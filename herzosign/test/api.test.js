'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { open } = require('../src/db');
const { seed, DEMO_PASSWORD } = require('../src/seed');
const { createApp } = require('../src/server');

const SIG = { method: 'typed', image: `data:image/png;base64,${Buffer.from('fake-png').toString('base64')}` };

let server, base, db;

test.before(async () => {
  db = open(':memory:');
  seed(db, { demo: true });
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

async function login(employeeNo) {
  const res = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'HerzoSign' },
    body: JSON.stringify({ employee_no: employeeNo, password: DEMO_PASSWORD }),
  });
  assert.equal(res.status, 200, `login ${employeeNo}`);
  const cookie = res.headers.get('set-cookie').split(';')[0];
  return async (path, { method = 'GET', body } = {}) => {
    const r = await fetch(`${base}/api${path}`, {
      method, headers: { cookie, 'X-Requested-With': 'HerzoSign', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
}

const tplId = (code) => db.prepare('SELECT id FROM templates WHERE code = ?').get(code).id;
const userId = (no) => db.prepare('SELECT id FROM users WHERE employee_no = ?').get(no).id;

test('rejects bad login and requests without CSRF header', async () => {
  const bad = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'HerzoSign' }, body: JSON.stringify({ employee_no: '5001', password: 'nope' }) });
  assert.equal(bad.status, 401);
  const noHeader = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noHeader.status, 403);
  const anon = await fetch(`${base}/api/me`);
  assert.equal(anon.status, 401);
});

test('vacation: employee → manager → HR → approved', async () => {
  const nurse = await login('5001');
  const manager = await login('2001');
  const hr = await login('3001');

  const missing = await nurse('/submissions', { method: 'POST', body: { template_id: tplId('hr-vacation'), data: {}, signature: SIG } });
  assert.equal(missing.status, 400);

  const noSig = await nurse('/submissions', { method: 'POST', body: { template_id: tplId('hr-vacation'), data: {} } });
  assert.equal(noSig.status, 400);

  const sub = await nurse('/submissions', { method: 'POST', body: {
    template_id: tplId('hr-vacation'), signature: SIG,
    data: { type: 'חופשה שנתית', from: '2026-12-01', to: '2026-12-05', days: 5 },
  } });
  assert.equal(sub.status, 200, JSON.stringify(sub.body));
  assert.equal(sub.body.status, 'pending');
  const id = sub.body.id;

  // ממתין אצל המנהלת, לא אצל משאבי אנוש
  assert.ok((await manager('/submissions?scope=inbox')).body.some((s) => s.id === id));
  assert.ok(!(await hr('/submissions?scope=inbox')).body.some((s) => s.id === id));
  assert.equal((await hr(`/submissions/${id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG } })).status, 403);

  // עובד אחר לא יכול לצפות
  const other = await login('5004');
  assert.equal((await other(`/submissions/${id}`)).status, 403);

  const a1 = await manager(`/submissions/${id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG } });
  assert.equal(a1.body.status, 'pending');
  assert.ok((await hr('/submissions?scope=inbox')).body.some((s) => s.id === id));

  const a2 = await hr(`/submissions/${id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG } });
  assert.equal(a2.body.status, 'approved');

  const view = await nurse(`/submissions/${id}`);
  assert.equal(view.body.status, 'approved');
  assert.equal(view.body.signatures.length, 3);
  assert.equal(view.body.integrity.valid, true);
  assert.ok(view.body.history.some((h) => h.action === 'completed'));
});

test('return for correction, resubmit, forward and reject', async () => {
  const nurse = await login('5001');
  const manager = await login('2001');
  const edu = await login('4001');

  const sub = await nurse('/submissions', { method: 'POST', body: {
    template_id: tplId('hr-shift-swap'), signature: SIG,
    data: { date: '2026-12-10', shift: 'לילה', with: 'אמיר', consent: true },
  } });
  const id = sub.body.id;

  assert.equal((await manager(`/submissions/${id}/action`, { method: 'POST', body: { action: 'return' } })).status, 400, 'comment required');
  await manager(`/submissions/${id}/action`, { method: 'POST', body: { action: 'return', comment: 'נא לציין משמרת חוזרת' } });
  let v = await nurse(`/submissions/${id}`);
  assert.equal(v.body.status, 'returned');
  assert.equal(v.body.permissions.resubmit, true);

  const re = await nurse(`/submissions/${id}/resubmit`, { method: 'POST', body: { signature: SIG, data: { date: '2026-12-10', shift: 'לילה', with: 'אמיר', consent: true, return_date: '2026-12-20' } } });
  assert.equal(re.body.status, 'pending');

  // העברה לגורם אחר
  const fwd = await manager(`/submissions/${id}/action`, { method: 'POST', body: { action: 'forward', to_user_id: userId('4001'), comment: 'לבדיקתך' } });
  assert.equal(fwd.status, 200);
  assert.ok((await edu('/submissions?scope=inbox')).body.some((s) => s.id === id));
  assert.ok(!(await manager('/submissions?scope=inbox')).body.some((s) => s.id === id));

  await edu(`/submissions/${id}/action`, { method: 'POST', body: { action: 'reject', comment: 'אין כיסוי למשמרת' } });
  v = await nurse(`/submissions/${id}`);
  assert.equal(v.body.status, 'rejected');
});

test('approve-and-forward inserts an extra step', async () => {
  const nurse = await login('5001');
  const manager = await login('2001');
  const other = await login('2002');
  const sub = await nurse('/submissions', { method: 'POST', body: {
    template_id: tplId('proc-falls'), signature: SIG, data: { ack: true },
  } });
  const id = sub.body.id;
  const r = await manager(`/submissions/${id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG, forward_to: userId('2002') } });
  assert.equal(r.body.status, 'pending');
  assert.ok((await other('/submissions?scope=inbox')).body.some((s) => s.id === id));
  const r2 = await other(`/submissions/${id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG } });
  assert.equal(r2.body.status, 'approved');
});

test('assignments: education assigns procedure, employee signs, compliance updates', async () => {
  const edu = await login('4001');
  const student = await login('5002');
  const created = await edu('/assignments', { method: 'POST', body: { template_id: tplId('proc-hand-hygiene'), department_id: db.prepare("SELECT id FROM departments WHERE name = 'גריאטריה א׳'").get().id, due_date: '2026-12-31' } });
  assert.equal(created.status, 200);
  assert.ok(created.body.created >= 3);

  const mine = await student('/assignments?scope=mine');
  const task = mine.body.find((a) => a.title.includes('היגיינת ידיים'));
  assert.ok(task);

  const checklistIncomplete = await student('/submissions', { method: 'POST', body: { template_id: tplId('proc-hand-hygiene'), signature: SIG, data: { ack: false }, assignment_id: task.id } });
  assert.equal(checklistIncomplete.status, 400);

  const sub = await student('/submissions', { method: 'POST', body: { template_id: tplId('proc-hand-hygiene'), signature: SIG, data: { ack: true }, assignment_id: task.id } });
  const manager = await login('2001');
  await manager(`/submissions/${sub.body.id}/action`, { method: 'POST', body: { action: 'approve', signature: SIG } });
  const after = await student('/assignments?scope=mine');
  assert.ok(!after.body.some((a) => a.id === task.id), 'assignment closed');

  const dash = await manager('/dashboard');
  const row = dash.body.compliance.find((c) => c.title.includes('היגיינת ידיים'));
  assert.ok(row.done >= 1);
});

test('training checklist must be complete; file upload is stored and protected', async () => {
  const nurse = await login('5001');
  const t = (await nurse(`/templates/${tplId('train-new-nurse')}`)).body;
  const topics = t.fields.find((f) => f.key === 'topics').options;
  const partial = await nurse('/submissions', { method: 'POST', body: { template_id: t.id, signature: SIG, data: { start_date: '2026-11-01', preceptor: 'רחל', topics: topics.slice(1) } } });
  assert.equal(partial.status, 400);
  const full = await nurse('/submissions', { method: 'POST', body: { template_id: t.id, signature: SIG, data: { start_date: '2026-11-01', preceptor: 'רחל', topics } } });
  assert.equal(full.status, 200);

  const sick = await nurse('/submissions', { method: 'POST', body: {
    template_id: tplId('hr-sick'), signature: SIG,
    data: { from: '2026-11-20', to: '2026-11-21', kind: 'מחלת עובד/ת' },
    files: { certificate: { name: 'note.pdf', mime: 'application/pdf', data: Buffer.from('%PDF-1.4 test').toString('base64') } },
  } });
  assert.equal(sick.status, 200, JSON.stringify(sick.body));
  const view = await nurse(`/submissions/${sick.body.id}`);
  const attId = view.body.data.certificate.attachment_id;
  assert.ok(attId);
  const other = await login('5004');
  assert.equal((await other(`/attachments/${attId}`)).status, 403);

  const badMime = await nurse('/submissions', { method: 'POST', body: {
    template_id: tplId('hr-sick'), signature: SIG, data: { from: '2026-11-20', to: '2026-11-21', kind: 'מחלת עובד/ת' },
    files: { certificate: { name: 'x.exe', mime: 'application/x-msdownload', data: 'AAAA' } },
  } });
  assert.equal(badMime.status, 400);
});

test('integrity check detects tampering', async () => {
  const nurse = await login('5001');
  const sub = await nurse('/submissions', { method: 'POST', body: { template_id: tplId('proc-incident'), signature: SIG, data: { ack: true } } });
  db.prepare('UPDATE submissions SET data = ? WHERE id = ?').run(JSON.stringify({ ack: false }), sub.body.id);
  const v = await nurse(`/submissions/${sub.body.id}`);
  assert.equal(v.body.integrity.valid, false);
});

test('template editing bumps version and keeps snapshots of old submissions', async () => {
  const hr = await login('3001');
  const id = tplId('hr-overtime');
  const t = (await hr(`/templates/${id}`)).body;
  const upd = await hr(`/templates/${id}`, { method: 'PUT', body: { ...t, title: 'דיווח שעות נוספות (מעודכן)' } });
  assert.equal(upd.status, 200);
  assert.equal((await hr(`/templates/${id}`)).body.version, t.version + 1);
  const nurse = await login('5001');
  assert.equal((await nurse(`/templates/${id}`, { method: 'PUT', body: t })).status, 403);
});
