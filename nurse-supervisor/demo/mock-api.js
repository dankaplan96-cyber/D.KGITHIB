/* Demo mode: an in-browser imitation of server.py so the app can be tried
   on any phone without a server. Data lives in this browser only. */
"use strict";
(function () {
  window.NS_DEMO = true;
  const KEY = "ns_demo_v1";

  const DEFAULT_CONFIG = {
    hospital_name: "גרסת הדגמה",
    edit_window_hours: 12,
    shifts: [
      { id: "morning", name: "בוקר", start: "07:00", end: "15:00" },
      { id: "evening", name: "ערב", start: "15:00", end: "23:00" },
      { id: "night", name: "לילה", start: "23:00", end: "07:00" },
    ],
    positions: [
      { id: "p1", name: "אח כללי 1" },
      { id: "p2", name: "אח כללי 2" },
      { id: "p3", name: "אח כללי 3" },
    ],
    departments: [
      { id: "d1", name: "פנימית א'", active: true },
      { id: "d2", name: "פנימית ב'", active: true },
      { id: "d3", name: "כירורגיה", active: true },
      { id: "d4", name: "גריאטריה", active: true },
      { id: "d5", name: "אורתופדיה", active: true },
      { id: "d6", name: "מיון", active: true },
    ],
    assignments: {
      morning: { d1: "p1", d2: "p1", d3: "p2", d4: "p2", d5: "p3", d6: "p3" },
      evening: { d1: "p1", d2: "p1", d3: "p1", d4: "p2", d5: "p2", d6: "p2" },
      night: { d1: "p1", d2: "p1", d3: "p1", d4: "p1", d5: "p2", d6: "p2" },
    },
    absence_reasons: ["מחלה", "מחלת ילד", "חופשה", "מילואים", "אירוע משפחתי", "לא הודיע/ה (פאנצ'ר)", "איחור", "השתלמות", "אחר"],
  };

  /* ---------------- storage ---------------- */
  let memory = null;
  function load() {
    if (memory) return memory;
    try { memory = JSON.parse(localStorage.getItem(KEY)); } catch (e) { memory = null; }
    if (!memory) memory = seed();
    return memory;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* memory only */ } }

  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const isoNow = () => { const d = new Date(); return isoDate(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); };
  const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDate(d); };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function seed() {
    const db = {
      config: clone(DEFAULT_CONFIG),
      users: [
        { username: "admin", name: "מנהל מערכת", role: "admin", password: "admin", active: true, must_change_password: false },
        { username: "nurse1", name: "דנה כהן", role: "nurse", password: "1234", active: true, must_change_password: false },
        { username: "nurse2", name: "יוסי לוי", role: "nurse", password: "1234", active: true, must_change_password: false },
      ],
      days: {},
      session: null,
    };
    // a few sample reports from yesterday so the reports screen has content
    const y = addDays(isoDate(new Date()), -1);
    const mk = (dept, pos, pts, staff, abs, staffNotes, pNotes, by) => ({
      patients: pts, staff_present: staff, absences: abs, staff_notes: staffNotes, patient_notes: pNotes,
      department_name: DEFAULT_CONFIG.departments.find((d) => d.id === dept).name,
      shift_name: "", position_id: pos, position_name: DEFAULT_CONFIG.positions.find((p) => p.id === pos).name,
      created_at: y + "T10:00:00", updated_at: y + "T10:00:00", updated_by: by[0], updated_by_name: by[1], revisions: 1,
    });
    const dana = ["nurse1", "דנה כהן"], yossi = ["nurse2", "יוסי לוי"];
    db.days[y] = {
      date: y,
      shifts: {
        morning: {
          positions: { p1: { username: "nurse1", name: "דנה כהן", since: y + "T07:05" }, p2: { username: "nurse2", name: "יוסי לוי", since: y + "T07:10" } },
          departments: {
            d1: { ...mk("d1", "p1", 34, 7, [], "", "", dana), shift_name: "בוקר" },
            d2: { ...mk("d2", "p1", 31, 5, [{ employee: "מיכל אברהם", reason: "מחלה", details: "הודיעה ב-06:00", replaced: true, replacement: "רונית מהפול" }], "", "חדר 8 – מטופל מידרדר, הועבר לטיפול נמרץ", dana), shift_name: "בוקר" },
            d3: { ...mk("d3", "p2", 27, 5, [{ employee: "אבי מזרחי", reason: "לא הודיע/ה (פאנצ'ר)", details: "לא ענה לטלפון", replaced: false, replacement: "" }], "חוסר בכוח עזר", "", yossi), shift_name: "בוקר" },
            d4: { ...mk("d4", "p2", 30, 6, [], "", "נפילה בחדר 3 ללא חבלה, דווח לרופא", yossi), shift_name: "בוקר" },
          },
        },
        evening: {
          positions: { p1: { username: "nurse1", name: "דנה כהן", since: y + "T15:02" } },
          departments: {
            d1: { ...mk("d1", "p1", 33, 5, [{ employee: "שירן דוד", reason: "מחלת ילד", details: "", replaced: false, replacement: "" }], "", "", dana), shift_name: "ערב", updated_at: y + "T16:20:00" },
          },
        },
      },
    };
    return db;
  }

  /* ---------------- shift logic (same as server.py) ---------------- */
  const hm = (s) => s.split(":").map(Number);
  function shiftBounds(cfg, day, sid) {
    const sh = cfg.shifts.find((s) => s.id === sid);
    if (!sh) return null;
    const [y, m, d] = day.split("-").map(Number);
    const [sh_h, sh_m] = hm(sh.start), [en_h, en_m] = hm(sh.end);
    const start = new Date(y, m - 1, d, sh_h, sh_m), end = new Date(y, m - 1, d, en_h, en_m);
    if (end <= start) end.setDate(end.getDate() + 1);
    return [start, end];
  }
  function currentShift(cfg) {
    const now = new Date();
    for (const off of [0, -1]) {
      const day = addDays(isoDate(now), off);
      for (const s of cfg.shifts) {
        const b = shiftBounds(cfg, day, s.id);
        if (b && b[0] <= now && now < b[1]) return [day, s.id];
      }
    }
    return [isoDate(now), cfg.shifts[0].id];
  }
  function canEdit(user, cfg, day, sid) {
    if (user.role === "admin") return true;
    const b = shiftBounds(cfg, day, sid);
    if (!b) return false;
    const now = Date.now();
    return b[0].getTime() - 2 * 3600e3 <= now && now <= b[1].getTime() + (cfg.edit_window_hours || 0) * 3600e3;
  }

  /* ---------------- helpers ---------------- */
  class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  const need = (c, msg, status) => { if (!c) throw new ApiError(status || 400, msg); };
  const str = (v, n) => (v == null ? "" : String(v).trim().slice(0, n || 2000));
  const int = (v) => { if (v === null || v === undefined || v === "") return null; const n = parseInt(v, 10); need(!isNaN(n), "ערך מספרי לא תקין"); return Math.max(0, Math.min(999, n)); };
  const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(new Date(s + "T12:00:00"));
  const pub = (u) => ({ username: u.username, name: u.name, role: u.role, active: u.active, must_change_password: !!u.must_change_password });
  const getDay = (db, day) => db.days[day] || { date: day, shifts: {} };

  function shiftOverview(db, day, sid) {
    const cfg = db.config, data = getDay(db, day);
    const entries = ((data.shifts[sid] || {}).departments) || {};
    const asg = cfg.assignments[sid] || {};
    const posNames = Object.fromEntries(cfg.positions.map((p) => [p.id, p.name]));
    const depts = [];
    for (const d of cfg.departments) {
      const e = entries[d.id] || null;
      if (d.active === false && !e) continue;
      depts.push({ id: d.id, name: d.name, position_id: asg[d.id] || null, position_name: posNames[asg[d.id]] || "", entry: e });
    }
    return { date: day, shift: sid, departments: depts, positions: (data.shifts[sid] || {}).positions || {} };
  }

  function collect(db, from, to, f) {
    const cfg = db.config;
    const order = Object.fromEntries(cfg.shifts.map((s, i) => [s.id, i]));
    const names = Object.fromEntries(cfg.shifts.map((s) => [s.id, s.name]));
    const rows = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const data = db.days[day];
      if (!data) continue;
      for (const [sid, sd] of Object.entries(data.shifts || {})) {
        if (f.shift && sid !== f.shift) continue;
        for (const [did, e] of Object.entries(sd.departments || {})) {
          if (f.department && did !== f.department) continue;
          if (f.position && e.position_id !== f.position) continue;
          rows.push({ ...e, date: day, shift: sid, shift_name: names[sid] || e.shift_name || sid, department_id: did });
        }
      }
    }
    rows.sort((a, b) => (a.date + (order[a.shift] ?? 99) + a.department_name).localeCompare(b.date + (order[b.shift] ?? 99) + b.department_name));
    return rows;
  }

  function summarize(rows) {
    const s = { entries: rows.length, patients: 0, staff_present: 0, absences: 0, replaced: 0, exceptional: 0, by_reason: {}, by_department: {} };
    for (const r of rows) {
      s.patients += r.patients || 0;
      s.staff_present += r.staff_present || 0;
      if (r.patient_notes) s.exceptional++;
      const bd = s.by_department[r.department_name] = s.by_department[r.department_name] || { entries: 0, absences: 0, exceptional: 0 };
      bd.entries++;
      if (r.patient_notes) bd.exceptional++;
      for (const a of r.absences || []) {
        s.absences++; bd.absences++;
        if (a.replaced) s.replaced++;
        s.by_reason[a.reason] = (s.by_reason[a.reason] || 0) + 1;
      }
    }
    return s;
  }

  function validateConfig(c) {
    need(c && typeof c === "object", "הגדרות לא תקינות");
    const list = (items, label, extra) => {
      need(Array.isArray(items), "רשימת " + label + " לא תקינה");
      const seen = new Set();
      return items.map((it) => {
        const id = str(it.id, 40) || Math.random().toString(36).slice(2, 10);
        need(/^[A-Za-z0-9_-]{1,40}$/.test(id), "מזהה לא תקין ב" + label);
        need(!seen.has(id), "מזהה כפול ב" + label); seen.add(id);
        const name = str(it.name, 80);
        need(name, "חסר שם ב" + label);
        const row = { id, name };
        if (extra) extra(it, row);
        return row;
      });
    };
    const out = { hospital_name: str(c.hospital_name, 120) || "בית החולים", edit_window_hours: int(c.edit_window_hours) || 0 };
    out.shifts = list(c.shifts, "משמרות", (it, row) => {
      for (const k of ["start", "end"]) { const v = str(it[k], 5); need(/^\d{2}:\d{2}$/.test(v), "שעת משמרת לא תקינה (HH:MM)"); row[k] = v; }
    });
    need(out.shifts.length, "חייבת להיות לפחות משמרת אחת");
    out.positions = list(c.positions, "אחים כלליים");
    out.departments = list(c.departments, "מחלקות", (it, row) => { row.active = it.active !== false; });
    const pos = new Set(out.positions.map((p) => p.id)), dep = new Set(out.departments.map((d) => d.id));
    out.assignments = {};
    for (const s of out.shifts) {
      out.assignments[s.id] = {};
      for (const [d, p] of Object.entries((c.assignments || {})[s.id] || {})) if (dep.has(d) && pos.has(p)) out.assignments[s.id][d] = p;
    }
    out.absence_reasons = [...new Set((c.absence_reasons || []).map((x) => str(x, 80)).filter(Boolean))];
    return out;
  }

  /* ---------------- router ---------------- */
  function handle(method, route, q, body) {
    const db = load();
    if (route === "login" && method === "POST") {
      const u = db.users.find((x) => x.username === str(body.username).toLowerCase());
      if (!u || !u.active || u.password !== String(body.password || "")) throw new ApiError(401, "שם משתמש או סיסמה שגויים");
      db.session = u.username; save();
      return { user: pub(u) };
    }
    if (route === "logout" && method === "POST") { db.session = null; save(); return { ok: true }; }

    const user = db.users.find((x) => x.username === db.session && x.active);
    need(user, "יש להתחבר מחדש", 401);
    const cfg = db.config;
    const admin = () => need(user.role === "admin", "אין הרשאה - נדרש מנהל מערכת", 403);

    if (route === "me" && method === "GET") {
      const [day, sid] = currentShift(cfg);
      return { user: pub(user), config: cfg, now: { date: day, shift: sid }, data_dir: user.role === "admin" ? "(הדגמה – הנתונים נשמרים בדפדפן במכשיר זה בלבד)" : null };
    }
    if (route === "change-password" && method === "POST") {
      need(String(body.old || "") === user.password, "הסיסמה הנוכחית שגויה");
      need(String(body.new || "").length >= 4, "הסיסמה החדשה חייבת להכיל לפחות 4 תווים");
      user.password = String(body.new); user.must_change_password = false; save();
      return { ok: true };
    }
    if (route === "shift" && method === "GET") {
      need(validDate(q.date), "תאריך לא תקין");
      need(cfg.shifts.some((s) => s.id === q.shift), "משמרת לא קיימת");
      return { ...shiftOverview(db, q.date, q.shift), can_edit: canEdit(user, cfg, q.date, q.shift) };
    }
    if (route === "shift/position" && method === "POST") {
      const { date, shift, position } = body;
      need(validDate(date), "תאריך לא תקין");
      need(cfg.positions.some((p) => p.id === position), "עמדה לא קיימת");
      need(canEdit(user, cfg, date, shift), "לא ניתן לעדכן משמרת זו", 403);
      const data = db.days[date] = getDay(db, date);
      const sh = data.shifts[shift] = data.shifts[shift] || { departments: {} };
      sh.positions = sh.positions || {};
      sh.positions[position] = { username: user.username, name: user.name, since: isoNow().slice(0, 16) };
      save();
      return { ok: true };
    }
    if (route === "entry" && method === "PUT") {
      const { date, shift, department } = body;
      need(validDate(date), "תאריך לא תקין");
      const sh = cfg.shifts.find((s) => s.id === shift); need(sh, "משמרת לא קיימת");
      const dept = cfg.departments.find((d) => d.id === department); need(dept, "מחלקה לא קיימת");
      need(canEdit(user, cfg, date, shift), "חלון העריכה למשמרת זו נסגר. לתיקון יש לפנות למנהל המערכת", 403);
      const absences = [];
      for (const a of (body.absences || []).slice(0, 100)) {
        const emp = str(a.employee, 80), reason = str(a.reason, 80);
        if (!emp && !reason) continue;
        need(reason, "יש לבחור סיבת היעדרות לכל עובד");
        absences.push({ employee: emp, reason, details: str(a.details, 500), replaced: !!a.replaced, replacement: str(a.replacement, 80) });
      }
      const pid = (cfg.assignments[shift] || {})[department];
      const pos = cfg.positions.find((p) => p.id === pid);
      const data = db.days[date] = getDay(db, date);
      const s = data.shifts[shift] = data.shifts[shift] || { departments: {} };
      s.departments = s.departments || {};
      const prev = s.departments[department];
      if (prev && body.base_updated_at && prev.updated_at !== body.base_updated_at) {
        throw new ApiError(409, "הדיווח עודכן בינתיים ע\"י " + prev.updated_by_name + ". רעננו את המסך כדי לראות את הגרסה העדכנית.");
      }
      const entry = {
        patients: int(body.patients), staff_present: int(body.staff_present), absences,
        staff_notes: str(body.staff_notes, 5000), patient_notes: str(body.patient_notes, 5000),
        department_name: dept.name, shift_name: sh.name, position_id: pid || null, position_name: pos ? pos.name : "",
        created_at: (prev && prev.created_at) || isoNow(), updated_at: isoNow(),
        updated_by: user.username, updated_by_name: user.name, revisions: ((prev && prev.revisions) || 0) + 1,
      };
      s.departments[department] = entry;
      save();
      return { ok: true, entry };
    }
    if (route === "entry" && method === "DELETE") {
      need(user.role === "admin", "רק מנהל מערכת יכול למחוק דיווח", 403);
      const sd = (getDay(db, q.date).shifts[q.shift] || {}).departments || {};
      delete sd[q.department]; save();
      return { ok: true };
    }
    if (route === "reports" && method === "GET") {
      need(validDate(q.from) && validDate(q.to), "טווח תאריכים לא תקין");
      need(q.from <= q.to, "תאריך ההתחלה מאוחר מתאריך הסיום");
      const rows = collect(db, q.from, q.to, q);
      return { rows, summary: summarize(rows) };
    }
    if (route === "config" && method === "PUT") {
      admin();
      db.config = validateConfig(body); save();
      return { ok: true, config: db.config };
    }
    if (route === "users" && method === "GET") { admin(); return { users: db.users.map(pub) }; }
    if (route === "users" && method === "POST") {
      admin();
      const uname = str(body.username, 40).toLowerCase();
      need(/^[a-z0-9_.-]{2,40}$/.test(uname), "שם משתמש: אותיות באנגלית, ספרות, נקודה, מקף (2-40 תווים)");
      const name = str(body.name, 80); need(name, "יש להזין שם מלא");
      const pw = String(body.password || "");
      let u = db.users.find((x) => x.username === uname);
      if (!u) { need(pw.length >= 4, "סיסמה חייבת להכיל לפחות 4 תווים"); u = { username: uname, must_change_password: true }; db.users.push(u); }
      u.name = name; u.role = body.role === "admin" ? "admin" : "nurse"; u.active = body.active !== false;
      if (pw) { need(pw.length >= 4, "סיסמה חייבת להכיל לפחות 4 תווים"); u.password = pw; u.must_change_password = !!body.must_change_password; }
      need(db.users.some((x) => x.role === "admin" && x.active), "חייב להישאר לפחות מנהל מערכת פעיל אחד");
      save();
      return { ok: true };
    }
    if (route.startsWith("users/") && method === "DELETE") {
      admin();
      const uname = decodeURIComponent(route.slice(6));
      need(uname !== user.username, "לא ניתן למחוק את המשתמש המחובר");
      const rest = db.users.filter((x) => x.username !== uname);
      need(rest.some((x) => x.role === "admin" && x.active), "חייב להישאר לפחות מנהל מערכת פעיל אחד");
      db.users = rest; save();
      return { ok: true };
    }
    throw new ApiError(404, "לא נמצא");
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async function (url, opts) {
    const u = String(url);
    if (!u.startsWith("/api/")) return realFetch(url, opts);
    opts = opts || {};
    const [path, query] = u.slice(5).split("?");
    const q = {};
    new URLSearchParams(query || "").forEach((v, k) => (q[k] = v));
    let body = {};
    try { body = opts.body ? JSON.parse(opts.body) : {}; } catch (e) { /* ignore */ }
    let status = 200, out;
    try { out = handle(opts.method || "GET", path, q, body); }
    catch (e) { status = e.status || 500; out = { error: e.message }; }
    return new Response(JSON.stringify(out), { status, headers: { "Content-Type": "application/json" } });
  };

  window.nsDemoReset = function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } memory = null; location.hash = "#/login"; location.reload(); };
})();
