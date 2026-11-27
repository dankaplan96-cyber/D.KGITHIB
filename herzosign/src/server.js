'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const auth = require('./auth');
const wf = require('./workflow');

const FIELD_TYPES = new Set(['text', 'textarea', 'number', 'date', 'time', 'email', 'tel', 'select', 'radio', 'checkbox', 'checklist', 'file', 'heading', 'info']);
const INPUT_FREE_TYPES = new Set(['heading', 'info']);
const ROLES = ['employee', 'manager', 'hr', 'education', 'admin'];
const CATEGORIES = ['hr', 'training', 'procedure'];
const FILE_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_FILE = 5 * 1024 * 1024;
const MAX_SIGNATURE = 300 * 1024;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (msg) => new HttpError(400, msg);
const forbidden = (msg = 'אין הרשאה לפעולה זו') => new HttpError(403, msg);
const notFound = (msg = 'לא נמצא') => new HttpError(404, msg);

const parseJSON = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const clientIp = (req) => req.ip || req.socket?.remoteAddress || null;

function createApp(db) {
  const app = express();
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
  app.disable('x-powered-by');

  // ── כותרות אבטחה ──
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'DENY',
      'Permissions-Policy': 'camera=(self), geolocation=(), microphone=()',
    });
    if (process.env.NODE_ENV === 'production') res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  app.use('/api', express.json({ limit: '12mb' }));

  // ── הגנת CSRF: כל בקשה משנה חייבת לשאת כותרת שדפדפן לא שולח מטופס חיצוני ──
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-Requested-With') !== 'HerzoSign') {
      return next(forbidden('בקשה לא תקינה'));
    }
    res.set('Cache-Control', 'no-store');
    next();
  });

  // ── זיהוי משתמש ──
  app.use('/api', (req, res, next) => { req.user = auth.userFromRequest(db, req); next(); });
  const requireUser = (req, res, next) => (req.user ? next() : next(new HttpError(401, 'יש להתחבר למערכת')));
  const requireRole = (...roles) => (req, res, next) =>
    (req.user && (roles.includes(req.user.role) || req.user.role === 'admin') ? next() : next(forbidden()));

  const audit = (req, submissionId, action, comment = null, targetUserId = null) =>
    db.prepare('INSERT INTO audit_log (submission_id, user_id, action, comment, target_user_id, ip) VALUES (?,?,?,?,?,?)')
      .run(submissionId, req.user?.id ?? null, action, comment, targetUserId, clientIp(req));

  // ═════════════ התחברות ═════════════
  app.post('/api/login', (req, res) => {
    const employeeNo = String(req.body?.employee_no || '').trim();
    const password = String(req.body?.password || '');
    const key = `${clientIp(req)}|${employeeNo}`;
    if (auth.loginThrottled(key)) throw new HttpError(429, 'יותר מדי ניסיונות. נסו שוב בעוד 15 דקות.');
    const u = db.prepare('SELECT id, password_hash, active FROM users WHERE employee_no = ?').get(employeeNo);
    if (!u || !u.active || !auth.verifyPassword(password, u.password_hash)) {
      auth.recordLoginFailure(key);
      audit(req, null, 'login_failed', employeeNo);
      throw new HttpError(401, 'מספר עובד או סיסמה שגויים');
    }
    auth.clearLoginFailures(key);
    const { token, expires } = auth.createSession(db, u.id);
    res.set('Set-Cookie', auth.cookieHeader(token, expires));
    req.user = { id: u.id };
    audit(req, null, 'login');
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    auth.destroySession(db, auth.readCookie(req, auth.COOKIE));
    res.set('Set-Cookie', auth.cookieHeader(null));
    res.json({ ok: true });
  });

  app.get('/api/me', requireUser, (req, res) => {
    res.json({ user: req.user, counts: counts(req.user) });
  });

  app.post('/api/me/password', requireUser, (req, res) => {
    const { current, next: nextPw } = req.body || {};
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!auth.verifyPassword(String(current || ''), row.password_hash)) throw bad('הסיסמה הנוכחית שגויה');
    const problem = auth.passwordProblem(nextPw);
    if (problem) throw bad(problem);
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(auth.hashPassword(nextPw), req.user.id);
    res.json({ ok: true });
  });

  function counts(user) {
    const inbox = db.prepare(`SELECT COUNT(*) c FROM submissions WHERE status = 'pending' AND
      (current_assignee_id = ? OR (current_assignee_id IS NULL AND (current_role = ? OR ? = 'admin')))`).get(user.id, user.role, user.role).c;
    const assignments = db.prepare("SELECT COUNT(*) c FROM assignments WHERE user_id = ? AND status = 'open'").get(user.id).c;
    const returned = db.prepare("SELECT COUNT(*) c FROM submissions WHERE submitter_id = ? AND status = 'returned'").get(user.id).c;
    return { inbox, assignments, returned };
  }

  // ═════════════ מחלקות ומשתמשים ═════════════
  app.get('/api/departments', requireUser, (req, res) => {
    res.json(db.prepare(`SELECT d.id, d.name, d.manager_id, u.full_name AS manager_name,
      (SELECT COUNT(*) FROM users x WHERE x.department_id = d.id AND x.active = 1) AS user_count
      FROM departments d LEFT JOIN users u ON u.id = d.manager_id ORDER BY d.name`).all());
  });

  app.post('/api/departments', requireRole('admin'), (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) throw bad('יש להזין שם מחלקה');
    const r = db.prepare('INSERT INTO departments (name, manager_id) VALUES (?,?)').run(name, req.body.manager_id || null);
    res.json({ id: Number(r.lastInsertRowid) });
  });

  app.put('/api/departments/:id', requireRole('admin'), (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) throw bad('יש להזין שם מחלקה');
    db.prepare('UPDATE departments SET name = ?, manager_id = ? WHERE id = ?').run(name, req.body.manager_id || null, req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/users', requireUser, (req, res) => {
    const full = ['admin', 'hr'].includes(req.user.role);
    const rows = db.prepare(`SELECT u.id, u.employee_no, u.full_name, u.role, u.job_title, u.department_id, d.name AS department_name,
      u.active ${full ? ', u.email, u.phone, u.created_at' : ''}
      FROM users u LEFT JOIN departments d ON d.id = u.department_id
      ${full ? '' : 'WHERE u.active = 1'} ORDER BY u.full_name`).all();
    res.json(rows);
  });

  function validateUserBody(b, isNew) {
    const out = {
      employee_no: String(b.employee_no || '').trim(),
      full_name: String(b.full_name || '').trim(),
      email: b.email ? String(b.email).trim() : null,
      phone: b.phone ? String(b.phone).trim() : null,
      role: b.role || 'employee',
      job_title: b.job_title ? String(b.job_title).trim() : null,
      department_id: b.department_id ? Number(b.department_id) : null,
      active: b.active === undefined ? 1 : (b.active ? 1 : 0),
    };
    if (!/^[0-9A-Za-z-]{2,20}$/.test(out.employee_no)) throw bad('מספר עובד לא תקין');
    if (!out.full_name) throw bad('יש להזין שם מלא');
    if (!ROLES.includes(out.role)) throw bad('תפקיד מערכת לא תקין');
    if (isNew) {
      const problem = auth.passwordProblem(b.password);
      if (problem) throw bad(problem);
    }
    return out;
  }

  app.post('/api/users', requireRole('admin', 'hr'), (req, res) => {
    const u = validateUserBody(req.body || {}, true);
    if (req.user.role !== 'admin' && u.role === 'admin') throw forbidden();
    try {
      const r = db.prepare(`INSERT INTO users (employee_no, full_name, email, phone, password_hash, role, job_title, department_id, active, must_change_password)
        VALUES (?,?,?,?,?,?,?,?,?,1)`).run(u.employee_no, u.full_name, u.email, u.phone, auth.hashPassword(req.body.password), u.role, u.job_title, u.department_id, u.active);
      res.json({ id: Number(r.lastInsertRowid) });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw bad('מספר העובד כבר קיים במערכת');
      throw e;
    }
  });

  app.put('/api/users/:id', requireRole('admin', 'hr'), (req, res) => {
    const u = validateUserBody(req.body || {}, false);
    const existing = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!existing) throw notFound();
    if (req.user.role !== 'admin' && (u.role === 'admin' || existing.role === 'admin')) throw forbidden();
    db.prepare(`UPDATE users SET employee_no=?, full_name=?, email=?, phone=?, role=?, job_title=?, department_id=?, active=? WHERE id=?`)
      .run(u.employee_no, u.full_name, u.email, u.phone, u.role, u.job_title, u.department_id, u.active, req.params.id);
    if (!u.active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/users/:id/reset-password', requireRole('admin', 'hr'), (req, res) => {
    const problem = auth.passwordProblem(req.body?.password);
    if (problem) throw bad(problem);
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (!target) throw notFound();
    if (req.user.role !== 'admin' && target.role === 'admin') throw forbidden();
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(auth.hashPassword(req.body.password), req.params.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ═════════════ תבניות טפסים ═════════════
  const templateOut = (t) => t && ({ ...t, fields: parseJSON(t.fields, []), workflow: parseJSON(t.workflow, []), active: !!t.active });

  app.get('/api/templates', requireUser, (req, res) => {
    const all = req.query.all === '1' && ['admin', 'hr', 'education'].includes(req.user.role);
    const rows = db.prepare(`SELECT * FROM templates ${all ? '' : 'WHERE active = 1'} ORDER BY category, title`).all();
    res.json(rows.map(templateOut));
  });

  app.get('/api/templates/:id', requireUser, (req, res) => {
    const t = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!t) throw notFound('הטופס לא נמצא');
    res.json(templateOut(t));
  });

  function validateTemplate(b) {
    const title = String(b.title || '').trim();
    if (!title) throw bad('יש להזין כותרת לטופס');
    if (!CATEGORIES.includes(b.category)) throw bad('קטגוריה לא תקינה');
    if (!Array.isArray(b.fields)) throw bad('רשימת שדות לא תקינה');
    const keys = new Set();
    const fields = b.fields.map((f, i) => {
      const key = String(f.key || `f${i + 1}`).trim();
      if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key)) throw bad(`מזהה שדה לא תקין: ${key}`);
      if (keys.has(key)) throw bad(`מזהה שדה כפול: ${key}`);
      keys.add(key);
      if (!FIELD_TYPES.has(f.type)) throw bad(`סוג שדה לא תקין: ${f.type}`);
      const label = String(f.label || '').trim();
      if (!label) throw bad('לכל שדה חייבת להיות תווית');
      const out = { key, label, type: f.type };
      if (f.required) out.required = true;
      if (f.help) out.help = String(f.help);
      if (['select', 'radio', 'checklist'].includes(f.type)) {
        const options = (Array.isArray(f.options) ? f.options : []).map((o) => String(o).trim()).filter(Boolean);
        if (!options.length) throw bad(`לשדה "${label}" חייבות להיות אפשרויות`);
        out.options = options;
      }
      return out;
    });
    if (!Array.isArray(b.workflow)) throw bad('מסלול אישור לא תקין');
    const workflow = b.workflow.map((s) => {
      if (s.type === 'direct_manager') return { type: 'direct_manager', label: s.label || 'אישור מנהל/ת ישיר/ה' };
      if (s.type === 'role' && ['hr', 'education', 'admin'].includes(s.role)) return { type: 'role', role: s.role, label: s.label || wf.ROLE_LABELS[s.role] };
      if (s.type === 'user' && Number(s.user_id)) return { type: 'user', user_id: Number(s.user_id), label: s.label || 'גורם מאשר' };
      throw bad('שלב לא תקין במסלול האישור');
    });
    return {
      title, category: b.category, workflow, fields,
      description: b.description ? String(b.description) : null,
      document_text: b.document_text ? String(b.document_text) : null,
      audience: b.audience ? String(b.audience) : null,
      active: b.active === false ? 0 : 1,
    };
  }

  app.post('/api/templates', requireRole('hr', 'education'), (req, res) => {
    const t = validateTemplate(req.body || {});
    const code = `t-${crypto.randomBytes(4).toString('hex')}`;
    const r = db.prepare(`INSERT INTO templates (code, title, category, description, document_text, fields, workflow, audience, active)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(code, t.title, t.category, t.description, t.document_text, JSON.stringify(t.fields), JSON.stringify(t.workflow), t.audience, t.active);
    res.json({ id: Number(r.lastInsertRowid) });
  });

  app.put('/api/templates/:id', requireRole('hr', 'education'), (req, res) => {
    const existing = db.prepare('SELECT id FROM templates WHERE id = ?').get(req.params.id);
    if (!existing) throw notFound();
    const t = validateTemplate(req.body || {});
    db.prepare(`UPDATE templates SET title=?, category=?, description=?, document_text=?, fields=?, workflow=?, audience=?, active=?,
      version = version + 1, updated_at = datetime('now') WHERE id = ?`)
      .run(t.title, t.category, t.description, t.document_text, JSON.stringify(t.fields), JSON.stringify(t.workflow), t.audience, t.active, req.params.id);
    res.json({ ok: true });
  });

  // ═════════════ הגשת טפסים ═════════════
  function validateSignature(sig) {
    if (!sig || !['drawn', 'typed'].includes(sig.method)) throw bad('יש לחתום על הטופס');
    const img = String(sig.image || '');
    if (!img.startsWith('data:image/png;base64,') || img.length > MAX_SIGNATURE * 1.4) throw bad('חתימה לא תקינה');
    return { method: sig.method, image: img };
  }

  function validateData(snapshot, data, files, existingData = {}) {
    const clean = {};
    const pendingFiles = [];
    for (const f of snapshot.fields) {
      if (INPUT_FREE_TYPES.has(f.type)) continue;
      let v = data?.[f.key];
      switch (f.type) {
        case 'checkbox':
          v = v === true;
          if (f.required && !v) throw bad(`יש לסמן: ${f.label}`);
          break;
        case 'checklist':
          v = Array.isArray(v) ? v.filter((o) => f.options.includes(o)) : [];
          if (f.required && v.length !== f.options.length) throw bad(`יש להשלים את כל הסעיפים: ${f.label}`);
          break;
        case 'select': case 'radio':
          v = v ? String(v) : '';
          if (v && !f.options.includes(v)) throw bad(`ערך לא תקין: ${f.label}`);
          if (f.required && !v) throw bad(`שדה חובה: ${f.label}`);
          break;
        case 'number':
          v = v === '' || v === undefined || v === null ? null : Number(v);
          if (v !== null && !Number.isFinite(v)) throw bad(`מספר לא תקין: ${f.label}`);
          if (f.required && v === null) throw bad(`שדה חובה: ${f.label}`);
          break;
        case 'date':
          v = v ? String(v) : '';
          if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad(`תאריך לא תקין: ${f.label}`);
          if (f.required && !v) throw bad(`שדה חובה: ${f.label}`);
          break;
        case 'file': {
          const up = files?.[f.key];
          if (up) {
            const mime = String(up.mime || '');
            if (!FILE_MIME.has(mime)) throw bad(`סוג קובץ לא נתמך (${f.label}). ניתן לצרף PDF או תמונה.`);
            const buf = Buffer.from(String(up.data || ''), 'base64');
            if (!buf.length || buf.length > MAX_FILE) throw bad(`הקובץ גדול מדי (עד 5MB): ${f.label}`);
            const name = String(up.name || 'file').replace(/[\\/\r\n"]/g, '_').slice(0, 120);
            const hash = auth.sha256(buf);
            pendingFiles.push({ key: f.key, name, mime, buf, hash });
            v = { filename: name, size: buf.length, sha256: hash };
          } else {
            v = existingData[f.key] || null;
          }
          if (f.required && !v) throw bad(`יש לצרף קובץ: ${f.label}`);
          break;
        }
        default:
          v = v === undefined || v === null ? '' : String(v).slice(0, 5000);
          if (f.required && !v.trim()) throw bad(`שדה חובה: ${f.label}`);
      }
      clean[f.key] = v;
    }
    // בדיקת טווח תאריכים
    if (clean.from && clean.to && clean.to < clean.from) throw bad('תאריך הסיום מוקדם מתאריך ההתחלה');
    return { clean, pendingFiles };
  }

  function fileHashesOf(snapshot, data) {
    return snapshot.fields.filter((f) => f.type === 'file' && data[f.key]?.sha256).map((f) => data[f.key].sha256);
  }

  function addSignature(req, subId, signerRole, step, sig, hash) {
    db.prepare(`INSERT INTO signatures (submission_id, user_id, signer_role, step, method, image, content_hash, ip, user_agent)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(subId, req.user.id, signerRole, step, sig.method, sig.image, hash, clientIp(req), String(req.get('user-agent') || '').slice(0, 300));
  }

  function routeTo(subId, route) {
    if (!route) {
      db.prepare(`UPDATE submissions SET status='approved', current_assignee_id=NULL, current_role=NULL, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(subId);
      const s = db.prepare('SELECT assignment_id FROM submissions WHERE id = ?').get(subId);
      if (s.assignment_id) db.prepare("UPDATE assignments SET status='done', completed_at=datetime('now') WHERE id=?").run(s.assignment_id);
      return 'approved';
    }
    db.prepare(`UPDATE submissions SET status='pending', current_step=?, current_assignee_id=?, current_role=?, updated_at=datetime('now') WHERE id=?`)
      .run(route.step, route.assignee_id, route.role, subId);
    return 'pending';
  }

  app.post('/api/submissions', requireUser, (req, res) => {
    const b = req.body || {};
    const tRow = db.prepare('SELECT * FROM templates WHERE id = ? AND active = 1').get(b.template_id);
    if (!tRow) throw notFound('הטופס לא נמצא או אינו פעיל');
    const snapshot = templateOut(tRow);
    let assignmentId = null;
    if (b.assignment_id) {
      const a = db.prepare("SELECT id FROM assignments WHERE id = ? AND user_id = ? AND template_id = ? AND status = 'open'").get(b.assignment_id, req.user.id, tRow.id);
      if (a) assignmentId = a.id;
    }
    const sig = validateSignature(b.signature);
    const { clean, pendingFiles } = validateData(snapshot, b.data || {}, b.files);
    const hash = wf.contentHash({ snapshot, data: clean, submitterId: req.user.id, fileHashes: fileHashesOf(snapshot, clean) });

    db.exec('BEGIN');
    try {
      const r = db.prepare(`INSERT INTO submissions (template_id, template_snapshot, submitter_id, department_id, data, status, content_hash, assignment_id)
        VALUES (?,?,?,?,?,'pending',?,?)`).run(tRow.id, JSON.stringify(snapshot), req.user.id, req.user.department_id, JSON.stringify(clean), hash, assignmentId);
      const subId = Number(r.lastInsertRowid);
      storeFiles(subId, pendingFiles, clean);
      addSignature(req, subId, 'submitter', null, sig, hash);
      audit(req, subId, 'submitted');
      const route = wf.resolveStep(db, snapshot.workflow, 0, req.user);
      const status = routeTo(subId, route);
      if (status === 'approved') audit(req, subId, 'completed', 'הטופס הושלם (אין שלבי אישור נוספים)');
      db.exec('COMMIT');
      res.json({ id: subId, status });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  });

  function storeFiles(subId, pendingFiles, clean) {
    const ins = db.prepare('INSERT INTO attachments (submission_id, field_key, filename, mime, size, data) VALUES (?,?,?,?,?,?)');
    for (const f of pendingFiles) {
      const r = ins.run(subId, f.key, f.name, f.mime, f.buf.length, f.buf);
      clean[f.key].attachment_id = Number(r.lastInsertRowid);
    }
    if (pendingFiles.length) db.prepare('UPDATE submissions SET data = ? WHERE id = ?').run(JSON.stringify(clean), subId);
  }

  function loadSubmission(id) {
    const s = db.prepare(`SELECT s.*, t.category, t.title AS template_title, u.full_name AS submitter_name, u.employee_no AS submitter_no,
      u.job_title AS submitter_job, d.name AS department_name, a.full_name AS assignee_name
      FROM submissions s JOIN templates t ON t.id = s.template_id JOIN users u ON u.id = s.submitter_id
      LEFT JOIN departments d ON d.id = s.department_id LEFT JOIN users a ON a.id = s.current_assignee_id
      WHERE s.id = ?`).get(id);
    if (!s) throw notFound('הטופס לא נמצא');
    return s;
  }

  const LIST_SELECT = `SELECT s.id, s.status, s.created_at, s.updated_at, s.completed_at, s.current_step, s.current_role, s.current_assignee_id,
    t.title, t.category, u.full_name AS submitter_name, u.job_title AS submitter_job, d.name AS department_name, a.full_name AS assignee_name
    FROM submissions s JOIN templates t ON t.id = s.template_id JOIN users u ON u.id = s.submitter_id
    LEFT JOIN departments d ON d.id = s.department_id LEFT JOIN users a ON a.id = s.current_assignee_id`;

  app.get('/api/submissions', requireUser, (req, res) => {
    const u = req.user;
    const where = [];
    const params = [];
    const scope = req.query.scope || 'mine';
    if (scope === 'mine') { where.push('s.submitter_id = ?'); params.push(u.id); }
    else if (scope === 'inbox') {
      where.push("s.status = 'pending' AND (s.current_assignee_id = ? OR (s.current_assignee_id IS NULL AND (s.current_role = ? OR ? = 'admin')))");
      params.push(u.id, u.role, u.role);
    } else if (scope === 'handled') {
      where.push("s.id IN (SELECT submission_id FROM audit_log WHERE user_id = ? AND action IN ('approved','rejected','returned','forwarded'))");
      params.push(u.id);
    } else if (scope === 'all') {
      if (u.role === 'admin' || u.role === 'hr') { /* הכל */ }
      else if (u.role === 'education') where.push("t.category IN ('training','procedure')");
      else if (u.role === 'manager') {
        const ids = wf.managedDepartmentIds(db, u.id);
        where.push(`s.department_id IN (${ids.map(() => '?').join(',') || 'NULL'})`);
        params.push(...ids);
      } else throw forbidden();
    } else throw bad('scope לא תקין');

    if (req.query.status) { where.push('s.status = ?'); params.push(String(req.query.status)); }
    if (req.query.category) { where.push('t.category = ?'); params.push(String(req.query.category)); }
    if (req.query.department_id) { where.push('s.department_id = ?'); params.push(Number(req.query.department_id)); }
    if (req.query.q) {
      where.push('(t.title LIKE ? OR u.full_name LIKE ? OR u.employee_no = ?)');
      const q = `%${String(req.query.q).trim()}%`;
      params.push(q, q, String(req.query.q).trim());
    }
    const sql = `${LIST_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY s.updated_at DESC, s.id DESC LIMIT 500`;
    res.json(db.prepare(sql).all(...params));
  });

  app.get('/api/submissions/:id', requireUser, (req, res) => {
    const s = loadSubmission(req.params.id);
    if (!wf.canView(db, req.user, s, s.category)) throw forbidden('אין לך הרשאה לצפות בטופס זה');
    const last = db.prepare("SELECT at FROM audit_log WHERE submission_id = ? AND user_id = ? AND action = 'viewed' ORDER BY id DESC LIMIT 1").get(s.id, req.user.id);
    if (!last || Date.now() - Date.parse(`${last.at}Z`) > 3600e3) audit(req, s.id, 'viewed');

    const snapshot = parseJSON(s.template_snapshot, {});
    const data = parseJSON(s.data, {});
    const signatures = db.prepare(`SELECT g.id, g.signer_role, g.step, g.method, g.image, g.content_hash, g.signed_at, g.ip,
      u.full_name, u.job_title FROM signatures g JOIN users u ON u.id = g.user_id WHERE g.submission_id = ? ORDER BY g.id`).all(s.id);
    const history = db.prepare(`SELECT l.action, l.comment, l.at, l.ip, u.full_name AS user_name, t.full_name AS target_name
      FROM audit_log l LEFT JOIN users u ON u.id = l.user_id LEFT JOIN users t ON t.id = l.target_user_id
      WHERE l.submission_id = ? ORDER BY l.id`).all(s.id);
    const currentHash = wf.contentHash({ snapshot, data, submitterId: s.submitter_id, fileHashes: fileHashesOf(snapshot, data) });
    const isSubmitter = s.submitter_id === req.user.id;
    const approvals = signatures.filter((g) => g.signer_role !== 'submitter').length;

    res.json({
      id: s.id, status: s.status, created_at: s.created_at, updated_at: s.updated_at, completed_at: s.completed_at,
      category: s.category, title: snapshot.title || s.template_title, template_id: s.template_id,
      submitter: { id: s.submitter_id, name: s.submitter_name, employee_no: s.submitter_no, job_title: s.submitter_job },
      department_name: s.department_name,
      current: { step: s.current_step, role: s.current_role, role_label: s.current_role ? wf.ROLE_LABELS[s.current_role] : null, assignee_id: s.current_assignee_id, assignee_name: s.assignee_name },
      template: snapshot, data, signatures, history,
      integrity: { stored_hash: s.content_hash, current_hash: currentHash, valid: currentHash === s.content_hash },
      permissions: {
        act: wf.canAct(req.user, s),
        resubmit: isSubmitter && s.status === 'returned',
        cancel: isSubmitter && s.status === 'pending' && approvals === 0,
      },
    });
  });

  app.get('/api/attachments/:id', requireUser, (req, res) => {
    const a = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
    if (!a) throw notFound();
    const s = loadSubmission(a.submission_id);
    if (!wf.canView(db, req.user, s, s.category)) throw forbidden();
    audit(req, s.id, 'attachment_viewed', a.filename);
    res.set({
      'Content-Type': a.mime,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(a.filename)}`,
      'Cache-Control': 'private, no-store',
    });
    res.send(Buffer.from(a.data));
  });

  // ── פעולות גורם מאשר: אישור / דחייה / החזרה לתיקון / העברה ──
  app.post('/api/submissions/:id/action', requireUser, (req, res) => {
    const s = loadSubmission(req.params.id);
    if (!wf.canAct(req.user, s)) throw forbidden('הטופס אינו ממתין לטיפולך');
    const { action, comment } = req.body || {};
    const text = comment ? String(comment).trim().slice(0, 2000) : null;
    const snapshot = parseJSON(s.template_snapshot, {});
    const submitter = db.prepare('SELECT id, department_id FROM users WHERE id = ?').get(s.submitter_id);

    db.exec('BEGIN');
    try {
      let result;
      if (action === 'approve') {
        const sig = validateSignature(req.body.signature);
        addSignature(req, s.id, 'approver', s.current_step, sig, s.content_hash);
        audit(req, s.id, 'approved', text);
        // "אשר והעבר ל..." – הוספת שלב אישור נוסף אצל גורם ספציפי
        const forwardTo = Number(req.body.forward_to) || null;
        if (forwardTo) {
          const target = db.prepare('SELECT id, full_name FROM users WHERE id = ? AND active = 1').get(forwardTo);
          if (!target) throw bad('הנמען לא נמצא');
          snapshot.workflow.splice(s.current_step + 1, 0, { type: 'user', user_id: target.id, label: `הועבר ע״י ${req.user.full_name}` });
          db.prepare('UPDATE submissions SET template_snapshot = ? WHERE id = ?').run(JSON.stringify(snapshot), s.id);
          audit(req, s.id, 'forwarded', null, target.id);
        }
        result = routeTo(s.id, wf.resolveStep(db, snapshot.workflow, s.current_step + 1, submitter));
        if (result === 'approved') audit(req, s.id, 'completed');
      } else if (action === 'reject') {
        if (!text) throw bad('יש לפרט את סיבת הדחייה');
        db.prepare(`UPDATE submissions SET status='rejected', current_assignee_id=NULL, current_role=NULL, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(s.id);
        audit(req, s.id, 'rejected', text);
        result = 'rejected';
      } else if (action === 'return') {
        if (!text) throw bad('יש לפרט מה נדרש לתקן');
        db.prepare(`UPDATE submissions SET status='returned', current_assignee_id=NULL, current_role=NULL, updated_at=datetime('now') WHERE id=?`).run(s.id);
        audit(req, s.id, 'returned', text, s.submitter_id);
        result = 'returned';
      } else if (action === 'forward') {
        const target = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(Number(req.body.to_user_id));
        if (!target) throw bad('יש לבחור למי להעביר');
        if (target.id === req.user.id) throw bad('לא ניתן להעביר לעצמך');
        db.prepare(`UPDATE submissions SET current_assignee_id=?, current_role=NULL, updated_at=datetime('now') WHERE id=?`).run(target.id, s.id);
        audit(req, s.id, 'forwarded', text, target.id);
        result = 'pending';
      } else {
        throw bad('פעולה לא מוכרת');
      }
      db.exec('COMMIT');
      res.json({ ok: true, status: result });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  });

  // ── הגשה מחדש לאחר החזרה לתיקון ──
  app.post('/api/submissions/:id/resubmit', requireUser, (req, res) => {
    const s = loadSubmission(req.params.id);
    if (s.submitter_id !== req.user.id || s.status !== 'returned') throw forbidden();
    const snapshot = parseJSON(s.template_snapshot, {});
    const sig = validateSignature(req.body?.signature);
    const { clean, pendingFiles } = validateData(snapshot, req.body?.data || {}, req.body?.files, parseJSON(s.data, {}));
    db.exec('BEGIN');
    try {
      storeFiles(s.id, pendingFiles, clean);
      const hash = wf.contentHash({ snapshot, data: clean, submitterId: s.submitter_id, fileHashes: fileHashesOf(snapshot, clean) });
      db.prepare('UPDATE submissions SET data = ?, content_hash = ? WHERE id = ?').run(JSON.stringify(clean), hash, s.id);
      addSignature(req, s.id, 'submitter', null, sig, hash);
      audit(req, s.id, 'resubmitted');
      const status = routeTo(s.id, wf.resolveStep(db, snapshot.workflow, 0, req.user));
      db.exec('COMMIT');
      res.json({ ok: true, status });
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  });

  app.post('/api/submissions/:id/cancel', requireUser, (req, res) => {
    const s = loadSubmission(req.params.id);
    const approvals = db.prepare("SELECT COUNT(*) c FROM signatures WHERE submission_id = ? AND signer_role <> 'submitter'").get(s.id).c;
    if (s.submitter_id !== req.user.id || !['pending', 'returned'].includes(s.status) || approvals > 0) throw forbidden('לא ניתן לבטל טופס זה');
    db.prepare(`UPDATE submissions SET status='cancelled', current_assignee_id=NULL, current_role=NULL, completed_at=datetime('now'), updated_at=datetime('now') WHERE id=?`).run(s.id);
    audit(req, s.id, 'cancelled', req.body?.comment || null);
    res.json({ ok: true });
  });

  // ═════════════ שיוך טפסים לעובדים (נהלים / חוברות הדרכה) ═════════════
  app.get('/api/assignments', requireUser, (req, res) => {
    const scope = req.query.scope || 'mine';
    const base = `SELECT a.id, a.template_id, a.due_date, a.note, a.status, a.created_at, a.completed_at,
      t.title, t.category, u.full_name AS user_name, u.job_title, d.name AS department_name, b.full_name AS assigned_by_name
      FROM assignments a JOIN templates t ON t.id = a.template_id JOIN users u ON u.id = a.user_id
      LEFT JOIN departments d ON d.id = u.department_id LEFT JOIN users b ON b.id = a.assigned_by`;
    if (scope === 'mine') {
      return res.json(db.prepare(`${base} WHERE a.user_id = ? AND a.status = 'open' ORDER BY a.due_date IS NULL, a.due_date`).all(req.user.id));
    }
    if (!['manager', 'hr', 'education', 'admin'].includes(req.user.role)) throw forbidden();
    let where = "a.status <> 'cancelled'";
    const params = [];
    if (req.user.role === 'manager') {
      const ids = wf.managedDepartmentIds(db, req.user.id);
      where += ` AND (a.assigned_by = ? OR u.department_id IN (${ids.map(() => '?').join(',') || 'NULL'}))`;
      params.push(req.user.id, ...ids);
    }
    if (req.query.template_id) { where += ' AND a.template_id = ?'; params.push(Number(req.query.template_id)); }
    res.json(db.prepare(`${base} WHERE ${where} ORDER BY a.created_at DESC LIMIT 1000`).all(...params));
  });

  app.post('/api/assignments', requireRole('manager', 'hr', 'education'), (req, res) => {
    const b = req.body || {};
    const t = db.prepare('SELECT id FROM templates WHERE id = ? AND active = 1').get(b.template_id);
    if (!t) throw bad('יש לבחור טופס');
    let userIds = [];
    if (Array.isArray(b.user_ids) && b.user_ids.length) userIds = b.user_ids.map(Number);
    else {
      const conds = ['active = 1'];
      const p = [];
      if (b.department_id) { conds.push('department_id = ?'); p.push(Number(b.department_id)); }
      if (b.job_title) { conds.push('job_title = ?'); p.push(String(b.job_title)); }
      if (p.length === 0) throw bad('יש לבחור עובדים, מחלקה או תפקיד');
      userIds = db.prepare(`SELECT id FROM users WHERE ${conds.join(' AND ')}`).all(...p).map((r) => r.id);
    }
    if (req.user.role === 'manager') {
      const ids = new Set(wf.managedDepartmentIds(db, req.user.id));
      const allowed = db.prepare('SELECT id, department_id FROM users WHERE active = 1').all().filter((u) => ids.has(u.department_id)).map((u) => u.id);
      userIds = userIds.filter((id) => allowed.includes(id));
    }
    if (!userIds.length) throw bad('לא נמצאו עובדים מתאימים');
    if (b.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) throw bad('תאריך יעד לא תקין');
    const exists = db.prepare("SELECT 1 FROM assignments WHERE template_id = ? AND user_id = ? AND status = 'open'");
    const ins = db.prepare('INSERT INTO assignments (template_id, user_id, assigned_by, due_date, note) VALUES (?,?,?,?,?)');
    let created = 0;
    for (const uid of new Set(userIds)) {
      if (exists.get(t.id, uid)) continue;
      ins.run(t.id, uid, req.user.id, b.due_date || null, b.note ? String(b.note).slice(0, 500) : null);
      created++;
    }
    res.json({ created, skipped: userIds.length - created });
  });

  app.delete('/api/assignments/:id', requireRole('manager', 'hr', 'education'), (req, res) => {
    const a = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
    if (!a) throw notFound();
    if (req.user.role === 'manager' && a.assigned_by !== req.user.id) throw forbidden();
    db.prepare("UPDATE assignments SET status = 'cancelled' WHERE id = ?").run(a.id);
    res.json({ ok: true });
  });

  // ═════════════ דשבורד ═════════════
  app.get('/api/dashboard', requireUser, (req, res) => {
    const u = req.user;
    const c = counts(u);
    const out = { counts: c, role: u.role };
    out.my = db.prepare(`SELECT status, COUNT(*) n FROM submissions WHERE submitter_id = ? GROUP BY status`).all(u.id);
    if (u.role !== 'employee') {
      let scopeWhere = '1=1';
      const p = [];
      if (u.role === 'manager') {
        const ids = wf.managedDepartmentIds(db, u.id);
        scopeWhere = `s.department_id IN (${ids.map(() => '?').join(',') || 'NULL'})`;
        p.push(...ids);
      } else if (u.role === 'education') scopeWhere = "t.category IN ('training','procedure')";
      out.byStatus = db.prepare(`SELECT s.status, COUNT(*) n FROM submissions s JOIN templates t ON t.id = s.template_id WHERE ${scopeWhere} GROUP BY s.status`).all(...p);
      out.byCategory = db.prepare(`SELECT t.category, COUNT(*) n FROM submissions s JOIN templates t ON t.id = s.template_id WHERE ${scopeWhere} AND s.created_at >= datetime('now','-30 days') GROUP BY t.category`).all(...p);
      out.avgHours = db.prepare(`SELECT ROUND(AVG((julianday(s.completed_at) - julianday(s.created_at)) * 24), 1) h FROM submissions s JOIN templates t ON t.id = s.template_id
        WHERE ${scopeWhere} AND s.status = 'approved' AND s.completed_at >= datetime('now','-30 days')`).get(...p).h;
      let aWhere = "a.status = 'open' AND a.due_date IS NOT NULL AND a.due_date < date('now')";
      const ap = [];
      if (u.role === 'manager') {
        const ids = wf.managedDepartmentIds(db, u.id);
        aWhere += ` AND us.department_id IN (${ids.map(() => '?').join(',') || 'NULL'})`;
        ap.push(...ids);
      }
      out.overdue = db.prepare(`SELECT a.id, a.due_date, t.title, us.full_name AS user_name FROM assignments a
        JOIN templates t ON t.id = a.template_id JOIN users us ON us.id = a.user_id WHERE ${aWhere} ORDER BY a.due_date LIMIT 50`).all(...ap);
      out.compliance = db.prepare(`SELECT t.id AS template_id, t.title, SUM(a.status = 'done') AS done, COUNT(*) AS total
        FROM assignments a JOIN templates t ON t.id = a.template_id JOIN users us ON us.id = a.user_id
        WHERE a.status <> 'cancelled' ${u.role === 'manager' ? `AND us.department_id IN (${wf.managedDepartmentIds(db, u.id).map(() => '?').join(',') || 'NULL'})` : ''}
        GROUP BY t.id ORDER BY t.title`).all(...(u.role === 'manager' ? wf.managedDepartmentIds(db, u.id) : []));
    }
    res.json(out);
  });

  app.get('/api/health', (req, res) => res.json({ ok: true, demo: process.env.SEED_DEMO !== '0' }));

  // ═════════════ קבצים סטטיים (SPA) ═════════════
  const pub = path.join(__dirname, '..', 'public');
  app.use(express.static(pub, { index: 'index.html', maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
  app.use('/api', (req, res, next) => next(notFound('נתיב API לא קיים')));
  app.get(/.*/, (req, res) => res.sendFile(path.join(pub, 'index.html')));

  // ── טיפול בשגיאות ──
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'הבקשה גדולה מדי (קבצים עד 5MB)' });
    if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'בקשה לא תקינה' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'שגיאת שרת. נסו שוב מאוחר יותר.' : err.message });
  });

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const { open } = require('./db');
  const { seed } = require('./seed');
  const db = open();
  seed(db);
  const port = Number(process.env.PORT || 3000);
  createApp(db).listen(port, () => console.log(`HerzoSign פועל בכתובת http://localhost:${port}`));
}
