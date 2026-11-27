'use strict';
const crypto = require('node:crypto');

const SESSION_HOURS = Number(process.env.SESSION_HOURS || 12);
const COOKIE = 'hs_session';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [alg, saltB64, hashB64] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

function passwordProblem(pw) {
  if (typeof pw !== 'string' || pw.length < 8) return 'הסיסמה חייבת להכיל לפחות 8 תווים';
  if (!/[A-Za-z֐-׿]/.test(pw) || !/\d/.test(pw)) return 'הסיסמה חייבת להכיל אותיות וספרות';
  return null;
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?,?,?)').run(sha256(token), userId, expires);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
  return { token, expires };
}

function destroySession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function cookieHeader(token, expires) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  if (!token) return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expires).toUTCString()}${secure}`;
}

function userFromRequest(db, req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.employee_no, u.full_name, u.email, u.phone, u.role, u.job_title, u.department_id,
           u.must_change_password, d.name AS department_name, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE s.token_hash = ? AND u.active = 1`).get(sha256(token));
  if (!row || row.expires_at < new Date().toISOString()) return null;
  delete row.expires_at;
  return row;
}

// הגבלת ניסיונות התחברות פשוטה בזיכרון (לפי IP + מספר עובד)
const attempts = new Map();
function loginThrottled(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > 15 * 60e3) return false;
  return rec.count >= 8;
}
function recordLoginFailure(key) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > 15 * 60e3) attempts.set(key, { first: now, count: 1 });
  else rec.count++;
}
function clearLoginFailures(key) { attempts.delete(key); }

module.exports = {
  COOKIE, hashPassword, verifyPassword, passwordProblem, sha256,
  createSession, destroySession, readCookie, cookieHeader, userFromRequest,
  loginThrottled, recordLoginFailure, clearLoginFailures,
};
