'use strict';
// מנוע מסלולי האישור: ניתוב הטופס לגורם המטפל הבא, הרשאות צפייה/פעולה וחישוב טביעת אצבע (hash) לתוכן.
const { sha256 } = require('./auth');

const ROLE_LABELS = { employee: 'עובד/ת', manager: 'מנהל/ת מחלקה', hr: 'משאבי אנוש', education: 'הדרכה', admin: 'מנהל/ת מערכת' };

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/** טביעת אצבע של תוכן הטופס – כל שינוי בנתונים/בקבצים/בתבנית ישנה אותה. */
function contentHash({ snapshot, data, submitterId, fileHashes = [] }) {
  return sha256(canonical({
    template: { code: snapshot.code, version: snapshot.version, fields: snapshot.fields, document_text: snapshot.document_text || '' },
    data, submitterId, files: [...fileHashes].sort(),
  }));
}

/**
 * מחזיר את הגורם המטפל בשלב `stepIndex`.
 * @returns {{assignee_id: number|null, role: string|null, step: number} | null} null = אין שלבים נוספים
 */
function resolveStep(db, workflow, stepIndex, submitter) {
  for (let i = stepIndex; i < workflow.length; i++) {
    const step = workflow[i];
    if (step.type === 'user') {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(step.user_id);
      if (u) return { assignee_id: u.id, role: null, step: i };
      continue;
    }
    if (step.type === 'role') return { assignee_id: null, role: step.role, step: i };
    if (step.type === 'direct_manager') {
      const dept = submitter.department_id
        ? db.prepare('SELECT manager_id FROM departments WHERE id = ?').get(submitter.department_id) : null;
      const mgr = dept?.manager_id;
      if (mgr && mgr === submitter.id) continue; // מנהל/ת שמגיש/ה טופס – מדלגים לשלב הבא
      if (mgr) return { assignee_id: mgr, role: null, step: i };
      return { assignee_id: null, role: 'admin', step: i }; // אין מנהל מוגדר – לתור מנהלי המערכת
    }
  }
  return null;
}

function managedDepartmentIds(db, userId) {
  return db.prepare('SELECT id FROM departments WHERE manager_id = ?').all(userId).map((r) => r.id);
}

function participated(db, sub, userId) {
  return !!db.prepare('SELECT 1 FROM audit_log WHERE submission_id = ? AND (user_id = ? OR target_user_id = ?) LIMIT 1')
    .get(sub.id, userId, userId);
}

function canAct(user, sub) {
  if (sub.status !== 'pending') return false;
  if (sub.current_assignee_id === user.id) return true;
  if (!sub.current_assignee_id && sub.current_role && (sub.current_role === user.role || user.role === 'admin')) return true;
  return false;
}

function canView(db, user, sub, category) {
  if (user.role === 'admin') return true;
  if (sub.submitter_id === user.id) return true;
  if (canAct(user, sub)) return true;
  if (user.role === 'hr') return true;
  if (user.role === 'education' && (category === 'training' || category === 'procedure')) return true;
  if (user.role === 'manager' && managedDepartmentIds(db, user.id).includes(sub.department_id)) return true;
  return participated(db, sub, user.id);
}

module.exports = { ROLE_LABELS, canonical, contentHash, resolveStep, canAct, canView, managedDepartmentIds };
