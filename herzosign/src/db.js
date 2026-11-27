'use strict';
// שכבת מסד הנתונים – SQLite מובנה ב-Node (node:sqlite), ללא תלויות חיצוניות.
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'herzosign.db');

function open(dbPath = DB_PATH) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    employee_no TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee'
      CHECK (role IN ('employee','manager','hr','education','admin')),
    job_title TEXT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- תבנית טופס: שדות + מסלול אישור. כל שינוי מעלה גרסה; טופס שהוגש שומר עותק (snapshot) של התבנית.
  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hr','training','procedure')),
    description TEXT,
    document_text TEXT,
    fields TEXT NOT NULL DEFAULT '[]',
    workflow TEXT NOT NULL DEFAULT '[]',
    audience TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id),
    template_snapshot TEXT NOT NULL,
    submitter_id INTEGER NOT NULL REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    data TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','returned','cancelled')),
    current_step INTEGER NOT NULL DEFAULT 0,
    current_assignee_id INTEGER REFERENCES users(id),
    current_role TEXT,
    content_hash TEXT NOT NULL,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sub_assignee ON submissions(current_assignee_id, status);
  CREATE INDEX IF NOT EXISTS idx_sub_role ON submissions(current_role, status);
  CREATE INDEX IF NOT EXISTS idx_sub_submitter ON submissions(submitter_id);

  CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    signer_role TEXT NOT NULL,
    step INTEGER,
    method TEXT NOT NULL CHECK (method IN ('drawn','typed')),
    image TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    signed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- יומן ביקורת (Audit trail) – רק הוספה, לעולם לא עדכון/מחיקה.
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY,
    submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    comment TEXT,
    target_user_id INTEGER REFERENCES users(id),
    ip TEXT,
    at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_audit_sub ON audit_log(submission_id);

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- שיוך טופס לעובד (למשל: "יש לקרוא ולחתום על נוהל X עד תאריך Y")
  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    due_date TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_assign_user ON assignments(user_id, status);
  `);
}

module.exports = { open, DB_PATH };
