/* תוכנת אח כללי - צד לקוח (ללא ספריות חיצוניות) */
"use strict";

const S = {
  user: null,
  config: null,
  now: null,
  sel: null,        // {date, shift, position}
  dirty: false,
  lastHash: "",
  skipHash: false,
};

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else if (k === "checked") el.checked = !!v;
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const $app = () => document.getElementById("app");
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function toast(msg, type) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show " + (type || "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = "toast"), type === "error" ? 5000 : 2600);
}

async function api(method, path, body) {
  const opts = { method, headers: {}, credentials: "same-origin" };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch("/api/" + path, opts);
  } catch (e) {
    throw new Error("אין חיבור לשרת. בדקו את חיבור הרשת ונסו שוב.");
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* ignore */ }
  if (res.status === 401 && path !== "login") {
    S.user = null;
    S.dirty = false;
    go("/login");
    throw new Error(data.error || "יש להתחבר מחדש");
  }
  if (!res.ok) throw new Error(data.error || "שגיאה " + res.status);
  return data;
}

function qs(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query] = raw.split("?");
  const params = {};
  new URLSearchParams(query || "").forEach((v, k) => (params[k] = v));
  return { path, params };
}

function go(path, params) {
  const q = params ? qs(params) : "";
  location.hash = "#" + path + (q ? "?" + q : "");
}

const pad = (n) => String(n).padStart(2, "0");
function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDate(d); }
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return "יום " + DAYS[d.getDay()] + ", " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
}
function fmtShort(iso) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return d + "/" + m + "/" + y.slice(2); }
function fmtTime(ts) {
  if (!ts) return "";
  const [d, t] = ts.split("T");
  return t.slice(0, 5) + " " + fmtShort(d);
}

const cfg = () => S.config;
const shiftById = (id) => cfg().shifts.find((s) => s.id === id);
const shiftName = (id) => (shiftById(id) || {}).name || id;
const posById = (id) => cfg().positions.find((p) => p.id === id);
const deptById = (id) => cfg().departments.find((d) => d.id === id);

function seg(options, current, onPick) {
  return h("div", { class: "seg" }, options.map((o) =>
    h("button", { type: "button", class: o.value === current ? "on" : "", onclick: () => onPick(o.value) }, o.label)));
}

/* ------------------------------------------------------------------ */
/* boot / routing                                                     */
/* ------------------------------------------------------------------ */

async function loadMe() {
  const r = await api("GET", "me");
  S.user = r.user;
  S.config = r.config;
  S.now = r.now;
  S.dataDir = r.data_dir;
  if (!S.sel) {
    S.sel = { date: r.now.date, shift: r.now.shift, position: localStorage.getItem("ns_position") || "" };
  }
  if (S.sel.position && S.sel.position !== "all" && !posById(S.sel.position)) S.sel.position = "";
  document.body.classList.toggle("is-admin", r.user.role === "admin");
  document.getElementById("topbar").classList.remove("hidden");
  document.getElementById("userName").textContent = r.user.name;
  document.getElementById("hospitalName").textContent = r.config.hospital_name;
}

window.addEventListener("hashchange", () => {
  if (S.skipHash) { S.skipHash = false; return; }
  if (S.dirty && !confirm("יש שינויים שלא נשמרו. לצאת בלי לשמור?")) {
    S.skipHash = true;
    location.hash = S.lastHash;
    return;
  }
  S.dirty = false;
  render();
});

window.addEventListener("beforeunload", (e) => {
  if (S.dirty) { e.preventDefault(); e.returnValue = ""; }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (S.dirty && !confirm("יש שינויים שלא נשמרו. לצאת בכל זאת?")) return;
  S.dirty = false;
  try { await api("POST", "logout"); } catch (e) { /* ignore */ }
  S.user = null; S.sel = null;
  document.getElementById("topbar").classList.add("hidden");
  go("/login");
});

async function render() {
  S.lastHash = location.hash;
  const { path, params } = parseHash();
  if (path !== "/login" && !S.user) {
    try { await loadMe(); } catch (e) { return renderLogin(); }
  }
  if (path === "/login") return renderLogin();
  if (S.user.must_change_password && path !== "/password") return go("/password");

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const n = a.getAttribute("data-nav");
    a.classList.toggle("active",
      (n === "home" && (path === "/" || path === "/entry" || path === "/summary")) || "/" + n === path);
  });

  const app = $app();
  app.innerHTML = "";
  app.appendChild(h("div", { class: "muted" }, "טוען..."));
  try {
    if (path === "/" || path === "") await renderHome();
    else if (path === "/entry") await renderEntry(params);
    else if (path === "/summary") await renderSummary(params);
    else if (path === "/reports") await renderReports(params);
    else if (path === "/settings") await renderSettings(params);
    else if (path === "/password") renderPassword();
    else go("/");
  } catch (e) {
    app.innerHTML = "";
    app.appendChild(h("div", { class: "card" }, h("b", null, "שגיאה: "), e.message,
      h("div", { style: "margin-top:12px" }, h("button", { class: "btn", onclick: render }, "נסה שוב"))));
  }
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------ */
/* login / password                                                   */
/* ------------------------------------------------------------------ */

function renderLogin() {
  document.getElementById("topbar").classList.add("hidden");
  const app = $app();
  app.innerHTML = "";
  const user = h("input", { autocomplete: "username", autocapitalize: "off", spellcheck: "false", dir: "ltr" });
  const pass = h("input", { type: "password", autocomplete: "current-password", dir: "ltr" });
  const btn = h("button", { class: "btn btn-lg", type: "submit", style: "width:100%" }, "כניסה");
  const form = h("form", {
    onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true;
      try {
        await api("POST", "login", { username: user.value, password: pass.value });
        S.user = null; S.sel = null;
        await loadMe();
        const before = location.hash;
        go("/");
        if (before === "#/" || before === "") render();
      } catch (err) {
        toast(err.message, "error");
        pass.value = "";
        pass.focus();
      } finally { btn.disabled = false; }
    },
  },
  h("label", { class: "field" }, h("span", null, "שם משתמש"), user),
  h("label", { class: "field" }, h("span", null, "סיסמה"), pass),
  btn);
  app.appendChild(h("div", { class: "login-wrap" },
    h("div", { class: "card login-card" },
      h("img", { src: "icon.svg", class: "logo", alt: "" }),
      h("h1", null, "אח כללי"),
      h("div", { class: "muted" }, "דיווח מצב מחלקות ונוכחות צוות"),
      form)));
  setTimeout(() => user.focus(), 50);
}

function renderPassword() {
  const app = $app();
  app.innerHTML = "";
  const old = h("input", { type: "password", dir: "ltr", autocomplete: "current-password" });
  const n1 = h("input", { type: "password", dir: "ltr", autocomplete: "new-password" });
  const n2 = h("input", { type: "password", dir: "ltr", autocomplete: "new-password" });
  app.appendChild(h("div", { class: "card", style: "max-width:480px;margin:auto" },
    h("h1", null, "החלפת סיסמה"),
    S.user.must_change_password ? h("p", { class: "badge badge-wait" }, "יש להחליף את הסיסמה הראשונית לפני ההמשך") : null,
    h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        if (n1.value !== n2.value) return toast("הסיסמאות החדשות אינן תואמות", "error");
        try {
          await api("POST", "change-password", { old: old.value, new: n1.value });
          S.user.must_change_password = false;
          toast("הסיסמה עודכנה", "ok");
          go("/");
        } catch (err) { toast(err.message, "error"); }
      },
    },
    h("label", { class: "field" }, h("span", null, "סיסמה נוכחית"), old),
    h("label", { class: "field" }, h("span", null, "סיסמה חדשה"), n1),
    h("label", { class: "field" }, h("span", null, "אימות סיסמה חדשה"), n2),
    h("button", { class: "btn", type: "submit" }, "עדכון סיסמה"))));
}

/* ------------------------------------------------------------------ */
/* home – shift dashboard                                             */
/* ------------------------------------------------------------------ */

async function renderHome() {
  const sel = S.sel;
  const ov = await api("GET", "shift?" + qs({ date: sel.date, shift: sel.shift }));
  const app = $app();
  app.innerHTML = "";

  const setSel = (patch) => { Object.assign(S.sel, patch); render(); };
  const isNow = sel.date === S.now.date && sel.shift === S.now.shift;

  // --- date & shift ---
  app.appendChild(h("div", { class: "toolbar" },
    h("button", { class: "btn btn-light btn-sm", onclick: () => setSel({ date: addDays(sel.date, -1) }) }, "→ יום קודם"),
    h("input", { type: "date", value: sel.date, onchange: (e) => e.target.value && setSel({ date: e.target.value }) }),
    h("button", { class: "btn btn-light btn-sm", onclick: () => setSel({ date: addDays(sel.date, 1) }) }, "יום הבא ←"),
    seg(cfg().shifts.map((s) => ({ value: s.id, label: s.name + " " + s.start + "-" + s.end })), sel.shift,
      (v) => setSel({ shift: v })),
    isNow ? h("span", { class: "badge badge-ok" }, "משמרת נוכחית")
      : h("button", { class: "btn btn-sm", onclick: () => api("GET", "me").then((r) => { S.now = r.now; setSel({ date: r.now.date, shift: r.now.shift }); }) }, "חזרה למשמרת הנוכחית"),
  ));

  app.appendChild(h("h1", null, "משמרת " + shiftName(sel.shift) + " · " + fmtDate(sel.date)));

  // --- position selection ---
  const posOptions = cfg().positions.map((p) => ({ value: p.id, label: p.name }))
    .concat([{ value: "all", label: "כל המחלקות" }]);
  app.appendChild(h("div", { class: "card" },
    h("div", { class: "row between" },
      h("div", null,
        h("div", { style: "font-weight:700;margin-bottom:8px" }, "באיזו עמדה את/ה במשמרת זו?"),
        seg(posOptions, sel.position, (v) => { localStorage.setItem("ns_position", v); setSel({ position: v }); })),
      positionWho(ov, sel))));

  if (!ov.can_edit) {
    app.appendChild(h("div", { class: "card badge-wait", style: "font-weight:600" },
      "צפייה בלבד – חלון העריכה למשמרת זו נסגר. לתיקון יש לפנות למנהל המערכת."));
  }

  const depts = ov.departments;
  const mine = sel.position && sel.position !== "all" ? depts.filter((d) => d.position_id === sel.position) : depts;
  const done = mine.filter((d) => d.entry).length;

  app.appendChild(h("div", { class: "row between", style: "margin:6px 0 10px" },
    h("div", { class: "grow" },
      h("div", { class: "small muted", style: "margin-bottom:4px" }, `דווחו ${done} מתוך ${mine.length} מחלקות`),
      h("div", { class: "progress" }, h("div", { style: `width:${mine.length ? (done / mine.length) * 100 : 0}%` }))),
    h("button", { class: "btn btn-light", onclick: () => go("/summary", { date: sel.date, shift: sel.shift, position: sel.position === "all" ? "" : sel.position }) },
      "📋 סיכום משמרת / הדפסה")));

  if (!sel.position) {
    app.appendChild(h("div", { class: "card muted" }, "בחר/י עמדה (אח כללי) כדי לראות את המחלקות שבאחריותך."));
    return;
  }

  if (sel.position === "all") {
    for (const p of cfg().positions.concat([{ id: null, name: "ללא שיבוץ" }])) {
      const list = depts.filter((d) => (d.position_id || null) === p.id);
      if (!list.length) continue;
      app.appendChild(h("h2", null, p.name));
      app.appendChild(h("div", { class: "grid grid-cards" }, list.map((d) => deptCard(d, sel))));
    }
    return;
  }

  if (!mine.length) {
    app.appendChild(h("div", { class: "card" }, "לא שובצו מחלקות לעמדה זו במשמרת " + shiftName(sel.shift) +
      ". ניתן לעדכן במסך ההגדרות › שיבוץ."));
  } else {
    app.appendChild(h("div", { class: "grid grid-cards" }, mine.map((d) => deptCard(d, sel))));
  }

  const others = depts.filter((d) => d.position_id !== sel.position);
  if (others.length) {
    app.appendChild(h("details", { style: "margin-top:22px" },
      h("summary", { style: "cursor:pointer;font-weight:700;padding:8px 0" }, `מחלקות נוספות (${others.length}) – למקרה של החלפה / כיסוי`),
      h("div", { class: "grid grid-cards" }, others.map((d) => deptCard(d, sel, true)))));
  }
}

function positionWho(ov, sel) {
  if (!sel.position || sel.position === "all") return null;
  const who = (ov.positions || {})[sel.position];
  const pos = posById(sel.position);
  const isMe = who && who.username === S.user.username;
  return h("div", { class: "position-who" },
    who ? h("div", null, "רשום/ה כ", pos.name, ": ", h("b", null, who.name), " ",
      h("span", { class: "muted small" }, "(" + who.since.slice(11) + ")")) : h("div", { class: "muted" }, "לא נרשם אח כללי לעמדה זו"),
    ov.can_edit && !isMe ? h("button", {
      class: "btn btn-sm", style: "margin-top:6px",
      onclick: async () => {
        try {
          await api("POST", "shift/position", { date: sel.date, shift: sel.shift, position: sel.position });
          toast("נרשמת כ" + pos.name + " למשמרת", "ok");
          render();
        } catch (e) { toast(e.message, "error"); }
      },
    }, "אני " + pos.name + " במשמרת זו") : null);
}

function deptCard(d, sel, other) {
  const e = d.entry;
  const abs = e ? (e.absences || []).length : 0;
  return h("div", {
    class: "dept-card" + (e ? " done" : "") + (other ? " other" : ""),
    onclick: () => go("/entry", { date: sel.date, shift: sel.shift, dept: d.id }),
  },
  h("div", { class: "row between" },
    h("div", { class: "name" }, d.name),
    e ? h("span", { class: "badge badge-ok" }, "✓ דווח") : h("span", { class: "badge badge-wait" }, "ממתין לדיווח")),
  other && d.position_name ? h("div", { class: "small muted" }, d.position_name) : null,
  e ? h("div", { class: "stats" },
    h("span", null, "מטופלים: ", h("b", null, e.patients ?? "-")),
    h("span", null, "צוות: ", h("b", null, e.staff_present ?? "-")),
    abs ? h("span", { class: "badge badge-danger" }, "היעדרויות: " + abs) : null,
    e.patient_notes ? h("span", { class: "badge badge-danger" }, "⚠ חריג") : null) : null,
  e ? h("div", { class: "meta" }, "עודכן " + fmtTime(e.updated_at) + " ע\"י " + e.updated_by_name) : null);
}

/* ------------------------------------------------------------------ */
/* entry form                                                         */
/* ------------------------------------------------------------------ */

function stepper(label, get, set) {
  const input = h("input", { type: "number", inputmode: "numeric", min: 0, max: 999, value: get() ?? "", placeholder: "-" });
  const setVal = (v) => {
    v = v === "" || v === null || isNaN(v) ? null : Math.max(0, Math.min(999, parseInt(v, 10)));
    set(v);
    input.value = v ?? "";
    S.dirty = true;
  };
  input.addEventListener("input", () => setVal(input.value));
  input.addEventListener("focus", () => input.select());
  return h("div", { class: "stepper big" },
    h("div", { class: "label" }, label),
    h("div", { class: "ctrl" },
      h("button", { type: "button", onclick: () => setVal((get() ?? 0) + 1), "aria-label": "הוסף" }, "+"),
      input,
      h("button", { type: "button", onclick: () => setVal(Math.max(0, (get() ?? 0) - 1)), "aria-label": "הפחת" }, "−")));
}

async function renderEntry(params) {
  const { date, shift, dept } = params;
  const ov = await api("GET", "shift?" + qs({ date, shift }));
  const d = ov.departments.find((x) => x.id === dept) || (deptById(dept) && { ...deptById(dept), entry: null });
  if (!d) throw new Error("המחלקה לא נמצאה");
  const orig = d.entry;
  const E = orig ? clone(orig) : { patients: null, staff_present: null, absences: [], staff_notes: "", patient_notes: "" };
  E.absences = E.absences || [];
  const ro = !ov.can_edit;

  const app = $app();
  app.innerHTML = "";
  app.appendChild(h("div", { class: "row between" },
    h("div", null,
      h("h1", { style: "margin-bottom:2px" }, d.name),
      h("div", { class: "muted" }, "משמרת " + shiftName(shift) + " · " + fmtDate(date) +
        (d.position_name ? " · " + d.position_name : ""))),
    h("button", { class: "btn btn-ghost no-print", onclick: () => go("/") }, "→ חזרה")));

  if (orig) {
    app.appendChild(h("div", { class: "small muted", style: "margin:8px 0" },
      "דיווח קיים – עודכן לאחרונה " + fmtTime(orig.updated_at) + " ע\"י " + orig.updated_by_name +
      (orig.revisions > 1 ? ` (${orig.revisions} עדכונים)` : "")));
  }
  if (ro) app.appendChild(h("div", { class: "card badge-wait", style: "font-weight:600" }, "צפייה בלבד – חלון העריכה נסגר."));

  const ta = (key, ph) => h("textarea", { placeholder: ph, value: E[key] || "", oninput: (e) => { E[key] = e.target.value; S.dirty = true; } });

  // 1 – patients
  app.appendChild(h("div", { class: "card" },
    h("h2", { style: "margin-top:0" }, "1. מטופלים"),
    h("div", { class: "grid grid-steppers" }, stepper("כמה מטופלים יש במחלקה?", () => E.patients, (v) => (E.patients = v)))));

  // 2 – staff
  const absList = h("div");
  const drawAbs = () => {
    absList.innerHTML = "";
    E.absences.forEach((a, i) => absList.appendChild(absenceEditor(a, i, () => {
      E.absences.splice(i, 1); S.dirty = true; drawAbs();
    })));
  };
  drawAbs();
  app.appendChild(h("div", { class: "card" },
    h("h2", { style: "margin-top:0" }, "2. צוות"),
    h("div", { class: "grid grid-steppers" }, stepper("כמה אנשי צוות במשמרת?", () => E.staff_present, (v) => (E.staff_present = v))),
    h("h3", null, "היעדרויות / פאנצ'רים"),
    absList,
    h("button", {
      class: "btn btn-danger-ghost", type: "button",
      onclick: () => {
        E.absences.push({ employee: "", reason: "", details: "", replaced: false, replacement: "" });
        S.dirty = true; drawAbs();
        const last = absList.querySelector(".absence:last-child input");
        if (last) last.focus();
      },
    }, "+ איש צוות לא הגיע"),
    h("h3", null, "דיווח נוסף לגבי הצוות"),
    ta("staff_notes", "למשל: עובד/ת עזב/ה מוקדם, חוסר בכוח עזר, תגבור מפול, בעיות במשמרת...")));

  // 3 – exceptional patient events
  app.appendChild(h("div", { class: "card" },
    h("h2", { style: "margin-top:0" }, "3. חריגים במטופלים"),
    h("div", { class: "small muted", style: "margin-bottom:8px" }, "אם אין חריגים – השאירו ריק."),
    ta("patient_notes", "מטופל קשה / מידרדר, נפילה, אירוע חריג, העברה לטיפול נמרץ, פטירה...")));

  if (ro) {
    app.querySelectorAll("input,textarea,select,button.chip,.stepper button,.absence button").forEach((el) => (el.disabled = true));
    app.querySelectorAll(".btn-danger-ghost").forEach((el) => el.classList.add("hidden"));
    return;
  }

  // --- actions ---
  const saveBtn = h("button", { class: "btn btn-ok btn-lg" }, "💾 שמירת דיווח");
  saveBtn.addEventListener("click", async () => {
    const bad = E.absences.findIndex((a) => !a.reason);
    if (bad >= 0) return toast("יש לבחור סיבה לכל היעדרות (היעדרות מס' " + (bad + 1) + ")", "error");
    if (E.patients == null || E.staff_present == null) {
      if (!confirm("לא הוזן מספר מטופלים או מספר אנשי צוות. לשמור בכל זאת?")) return;
    }
    saveBtn.disabled = true;
    try {
      await api("PUT", "entry", { ...E, date, shift, department: dept, base_updated_at: orig ? orig.updated_at : null });
      S.dirty = false;
      toast("הדיווח נשמר ✓", "ok");
      go("/");
    } catch (e) {
      toast(e.message, "error");
    } finally { saveBtn.disabled = false; }
  });
  app.appendChild(h("div", { class: "sticky-actions" },
    saveBtn,
    h("button", { class: "btn btn-ghost btn-lg", onclick: () => go("/") }, "ביטול"),
    orig && S.user.role === "admin" ? h("button", {
      class: "btn btn-danger btn-lg",
      onclick: async () => {
        if (!confirm("למחוק את הדיווח של " + d.name + "? (הפעולה נרשמת ביומן)")) return;
        try {
          await api("DELETE", "entry?" + qs({ date, shift, department: dept }));
          S.dirty = false; toast("הדיווח נמחק"); go("/");
        } catch (e) { toast(e.message, "error"); }
      },
    }, "מחיקה") : null));
}

function absenceEditor(a, i, onRemove) {
  const mark = () => (S.dirty = true);
  const reasons = h("div", { class: "chips" });
  const drawReasons = () => {
    reasons.innerHTML = "";
    cfg().absence_reasons.forEach((v) => reasons.appendChild(h("button", {
      type: "button", class: "chip" + (a.reason === v ? " on danger" : ""),
      onclick: () => { a.reason = a.reason === v ? "" : v; mark(); drawReasons(); },
    }, v)));
  };
  drawReasons();
  const replWrap = h("div", { class: a.replaced ? "" : "hidden", style: "margin-top:8px" },
    h("input", { placeholder: "שם המחליף/ה", value: a.replacement, oninput: (e) => { a.replacement = e.target.value; mark(); } }));
  return h("div", { class: "absence" },
    h("div", { class: "head" },
      h("b", null, "לא הגיע/ה #" + (i + 1)),
      h("button", { type: "button", class: "btn btn-sm btn-danger-ghost", onclick: () => { if (confirm("להסיר היעדרות זו?")) onRemove(); } }, "הסרה")),
    h("label", { class: "field" }, h("span", null, "שם העובד/ת"),
      h("input", { value: a.employee, placeholder: "שם מלא", oninput: (e) => { a.employee = e.target.value; mark(); } })),
    h("div", { class: "field" }, h("span", { style: "font-weight:600;font-size:15px;display:block;margin-bottom:6px" }, "למה לא הגיע/ה? *"), reasons),
    h("label", { class: "field", style: "margin-top:10px" }, h("span", null, "פירוט (לא חובה)"),
      h("input", { value: a.details, placeholder: "למשל: הודיע/ה בשעה 06:30, לא ענה/תה לטלפון...", oninput: (e) => { a.details = e.target.value; mark(); } })),
    h("label", { style: "display:flex;gap:10px;align-items:center;font-weight:600;cursor:pointer" },
      h("input", { type: "checkbox", checked: a.replaced, onchange: (e) => { a.replaced = e.target.checked; replWrap.classList.toggle("hidden", !a.replaced); mark(); } }),
      "נמצא/ה מחליף/ה"),
    replWrap);
}

/* ------------------------------------------------------------------ */
/* shift summary                                                      */
/* ------------------------------------------------------------------ */

function staffCell(e) {
  const abs = absencesText(e.absences);
  return h("div", null, (e.absences || []).length ? abs : null,
    e.staff_notes ? h("div", { class: "notes", style: "white-space:pre-wrap" }, e.staff_notes) : null,
    !(e.absences || []).length && !e.staff_notes ? "-" : null);
}

async function renderSummary(params) {
  const { date, shift, position } = params;
  const ov = await api("GET", "shift?" + qs({ date, shift }));
  let depts = ov.departments;
  if (position) depts = depts.filter((d) => d.position_id === position);
  const app = $app();
  app.innerHTML = "";

  app.appendChild(h("div", { class: "row between no-print" },
    h("button", { class: "btn btn-ghost", onclick: () => go("/") }, "→ חזרה"),
    h("button", { class: "btn", onclick: () => window.print() }, "🖨️ הדפסה / PDF")));
  app.appendChild(h("div", { class: "print-only muted small" }, cfg().hospital_name + " · הופק " + new Date().toLocaleString("he-IL")));
  app.appendChild(h("h1", null, "סיכום משמרת " + shiftName(shift) + " – " + fmtDate(date) +
    (position && posById(position) ? " – " + posById(position).name : "")));

  const onDuty = Object.entries(ov.positions || {}).map(([pid, w]) => ((posById(pid) || {}).name || pid) + ": " + w.name);
  if (onDuty.length) app.appendChild(h("div", { style: "margin-bottom:10px" }, h("b", null, "אחים כלליים במשמרת: "), onDuty.join(" · ")));

  const filled = depts.filter((d) => d.entry);
  const tot = { patients: 0, staff: 0, abs: 0, exc: 0 };
  filled.forEach((d) => {
    const e = d.entry;
    tot.patients += e.patients || 0; tot.staff += e.staff_present || 0;
    tot.abs += (e.absences || []).length; tot.exc += e.patient_notes ? 1 : 0;
  });
  app.appendChild(h("div", { class: "grid grid-stats", style: "margin-bottom:14px" },
    stat("מחלקות שדווחו", filled.length + "/" + depts.length, filled.length < depts.length),
    stat("מטופלים", tot.patients),
    stat("אנשי צוות", tot.staff),
    stat("היעדרויות", tot.abs, tot.abs > 0),
    stat("מחלקות עם חריגים", tot.exc, tot.exc > 0)));

  app.appendChild(h("div", { class: "card table-wrap" }, h("table", null,
    h("thead", null, h("tr", null,
      h("th", null, "מחלקה"), h("th", null, "אח כללי"), h("th", { class: "num" }, "מטופלים"),
      h("th", { class: "num" }, "צוות"), h("th", null, "דיווח על הצוות"), h("th", null, "חריגים במטופלים"), h("th", null, "דווח"))),
    h("tbody", null, depts.map((d) => {
      const e = d.entry;
      if (!e) return h("tr", null, h("td", null, h("b", null, d.name)), h("td", null, d.position_name),
        h("td", { colspan: 5 }, h("span", { class: "badge badge-wait" }, "לא דווח")));
      return h("tr", null,
        h("td", null, h("b", null, d.name)), h("td", null, e.position_name || d.position_name),
        h("td", { class: "num" }, e.patients ?? "-"),
        h("td", { class: "num" }, e.staff_present ?? "-"),
        h("td", null, staffCell(e)),
        h("td", { class: "notes" }, e.patient_notes || "-"),
        h("td", { class: "small" }, e.updated_by_name, h("br"), fmtTime(e.updated_at)));
    })))));
}

function absencesText(list) {
  if (!list || !list.length) return "-";
  return h("div", null, list.map((a) => h("div", { style: "margin-bottom:4px" },
    h("b", null, a.employee || "(ללא שם)"), " – ",
    h("span", { class: "neg" }, a.reason), a.details ? " · " + a.details : "",
    a.replaced ? h("span", { class: "badge badge-ok", style: "margin-inline-start:6px" }, "הוחלף" + (a.replacement ? ": " + a.replacement : "")) : null)));
}

function stat(label, value, danger) {
  return h("div", { class: "stat" + (danger ? " danger" : "") }, h("div", { class: "v" }, value), h("div", { class: "l" }, label));
}

/* ------------------------------------------------------------------ */
/* reports                                                            */
/* ------------------------------------------------------------------ */

async function renderReports(params) {
  const today = S.now.date;
  const F = {
    from: params.from || addDays(today, -6), to: params.to || today,
    shift: params.shift || "", department: params.department || "", position: params.position || "",
  };
  const app = $app();
  app.innerHTML = "";
  app.appendChild(h("h1", { class: "no-print" }, "דוחות"));

  const inp = (key, attrs) => h("input", { ...attrs, value: F[key], onchange: (e) => (F[key] = e.target.value) });
  const sel = (key, opts) => h("select", { onchange: (e) => (F[key] = e.target.value) },
    opts.map(([v, l]) => h("option", { value: v, ...(F[key] === v ? { selected: true } : {}) }, l)));
  const run = () => go("/reports", { ...F, run: 1 });
  const quick = (label, from, to) => h("button", { class: "chip", type: "button", onclick: () => { F.from = from; F.to = to; run(); } }, label);
  const d0 = new Date(today + "T12:00:00");
  const monthStart = isoDate(new Date(d0.getFullYear(), d0.getMonth(), 1));
  const prevMonthStart = isoDate(new Date(d0.getFullYear(), d0.getMonth() - 1, 1));
  const prevMonthEnd = isoDate(new Date(d0.getFullYear(), d0.getMonth(), 0));

  app.appendChild(h("div", { class: "card no-print" },
    h("div", { class: "chips", style: "margin-bottom:12px" },
      quick("היום", today, today), quick("אתמול", addDays(today, -1), addDays(today, -1)),
      quick("7 ימים אחרונים", addDays(today, -6), today), quick("החודש", monthStart, today),
      quick("חודש קודם", prevMonthStart, prevMonthEnd), quick("30 יום", addDays(today, -29), today)),
    h("div", { class: "grid", style: "grid-template-columns:repeat(auto-fill,minmax(180px,1fr))" },
      h("label", { class: "field" }, h("span", null, "מתאריך"), inp("from", { type: "date" })),
      h("label", { class: "field" }, h("span", null, "עד תאריך"), inp("to", { type: "date" })),
      h("label", { class: "field" }, h("span", null, "משמרת"), sel("shift", [["", "כל המשמרות"], ...cfg().shifts.map((s) => [s.id, s.name])])),
      h("label", { class: "field" }, h("span", null, "מחלקה"), sel("department", [["", "כל המחלקות"], ...cfg().departments.map((d) => [d.id, d.name])])),
      h("label", { class: "field" }, h("span", null, "אח כללי"), sel("position", [["", "כולם"], ...cfg().positions.map((p) => [p.id, p.name])]))),
    h("button", { class: "btn", onclick: run }, "📊 הפקת דוח")));

  if (!params.run) return;

  const r = await api("GET", "reports?" + qs(F));
  const sm = r.summary;
  const csvUrl = (kind) => "/api/reports.csv?" + qs({ ...F, kind });

  const filterDesc = [
    F.from === F.to ? fmtDate(F.from) : fmtShort(F.from) + " – " + fmtShort(F.to),
    F.shift ? "משמרת " + shiftName(F.shift) : "כל המשמרות",
    F.department ? (deptById(F.department) || {}).name : "כל המחלקות",
    F.position ? (posById(F.position) || {}).name : null,
  ].filter(Boolean).join(" · ");

  app.appendChild(h("div", { class: "row between no-print", style: "margin-bottom:12px" },
    h("div", { class: "muted" }, filterDesc),
    h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => window.print() }, "🖨️ הדפסה / PDF"),
      h("a", { class: "btn btn-light", href: csvUrl("entries") }, "⬇️ אקסל – דיווחים"),
      h("a", { class: "btn btn-light", href: csvUrl("absences") }, "⬇️ אקסל – היעדרויות"))));

  app.appendChild(h("div", { class: "print-only" },
    h("div", { class: "muted small" }, cfg().hospital_name + " · הופק " + new Date().toLocaleString("he-IL") + " ע\"י " + S.user.name),
    h("h1", null, "דוח אח כללי – " + filterDesc)));

  if (!r.rows.length) {
    app.appendChild(h("div", { class: "card" }, "לא נמצאו דיווחים בטווח שנבחר."));
    return;
  }

  app.appendChild(h("div", { class: "grid grid-stats", style: "margin-bottom:14px" },
    stat("דיווחי מחלקה", sm.entries),
    stat("ממוצע מטופלים לדיווח", sm.entries ? Math.round(sm.patients / sm.entries) : 0),
    stat("ממוצע צוות לדיווח", sm.entries ? Math.round((sm.staff_present / sm.entries) * 10) / 10 : 0),
    stat("סה\"כ היעדרויות", sm.absences, sm.absences > 0),
    stat("היעדרויות שהוחלפו", sm.replaced),
    stat("דיווחים עם חריגים", sm.exceptional, sm.exceptional > 0)));

  const reasonRows = Object.entries(sm.by_reason).sort((a, b) => b[1] - a[1]);
  const deptRows = Object.entries(sm.by_department).sort((a, b) => b[1].absences - a[1].absences);
  app.appendChild(h("div", { class: "grid", style: "grid-template-columns:repeat(auto-fit,minmax(320px,1fr))" },
    h("div", { class: "card" }, h("h3", { style: "margin-top:0" }, "היעדרויות לפי סיבה"),
      reasonRows.length ? h("table", null, h("tbody", null, reasonRows.map(([k, v]) =>
        h("tr", null, h("td", null, k), h("td", { class: "num" }, v), h("td", { style: "width:45%" },
          h("div", { class: "progress" }, h("div", { style: `width:${(v / sm.absences) * 100}%;background:var(--danger)` }))))))) : h("div", { class: "muted" }, "אין היעדרויות")),
    h("div", { class: "card" }, h("h3", { style: "margin-top:0" }, "לפי מחלקה"),
      h("table", null,
        h("thead", null, h("tr", null, h("th", null, "מחלקה"), h("th", { class: "num" }, "דיווחים"), h("th", { class: "num" }, "היעדרויות"), h("th", { class: "num" }, "חריגים"))),
        h("tbody", null, deptRows.map(([k, v]) => h("tr", null, h("td", null, k), h("td", { class: "num" }, v.entries),
          h("td", { class: "num" + (v.absences ? " neg" : "") }, v.absences), h("td", { class: "num" + (v.exceptional ? " neg" : "") }, v.exceptional))))))));

  // exceptional events
  const exc = r.rows.filter((e) => e.patient_notes);
  if (exc.length) {
    app.appendChild(h("h2", null, "חריגים במטופלים (" + exc.length + ")"));
    app.appendChild(h("div", { class: "card table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, ["תאריך", "משמרת", "מחלקה", "חריג", "דווח ע\"י"].map((t) => h("th", null, t)))),
      h("tbody", null, exc.map((e) => h("tr", null,
        h("td", null, fmtShort(e.date)), h("td", null, e.shift_name), h("td", null, h("b", null, e.department_name)),
        h("td", { class: "notes" }, e.patient_notes), h("td", { class: "small" }, e.updated_by_name)))))));
  }

  // absences detail
  const absRows = [];
  r.rows.forEach((row) => (row.absences || []).forEach((a) => absRows.push([row, a])));
  if (absRows.length) {
    app.appendChild(h("h2", null, "פירוט היעדרויות (" + absRows.length + ")"));
    app.appendChild(h("div", { class: "card table-wrap" }, h("table", null,
      h("thead", null, h("tr", null, ["תאריך", "משמרת", "מחלקה", "שם העובד", "סיבה", "פירוט", "הוחלף", "דווח ע\"י"].map((t) => h("th", null, t)))),
      h("tbody", null, absRows.map(([row, a]) => h("tr", null,
        h("td", null, fmtShort(row.date)), h("td", null, row.shift_name), h("td", null, row.department_name),
        h("td", null, h("b", null, a.employee || "-")), h("td", { class: "neg" }, a.reason),
        h("td", null, a.details || ""), h("td", null, a.replaced ? "כן" + (a.replacement ? " – " + a.replacement : "") : "לא"),
        h("td", { class: "small" }, row.updated_by_name)))))));
  }

  // entries detail
  app.appendChild(h("h2", null, "כל הדיווחים (" + r.rows.length + ")"));
  app.appendChild(h("div", { class: "card table-wrap" }, h("table", null,
    h("thead", null, h("tr", null,
      ["תאריך", "משמרת", "מחלקה", "אח כללי"].map((t) => h("th", null, t)),
      h("th", { class: "num" }, "מטופלים"), h("th", { class: "num" }, "צוות"),
      h("th", null, "דיווח על הצוות"), h("th", null, "חריגים במטופלים"), h("th", null, "דווח ע\"י"))),
    h("tbody", null, r.rows.map((e) => h("tr", { style: "cursor:pointer", title: "פתיחת הדיווח", onclick: () => go("/entry", { date: e.date, shift: e.shift, dept: e.department_id }) },
      h("td", null, fmtShort(e.date)), h("td", null, e.shift_name), h("td", null, h("b", null, e.department_name)),
      h("td", null, e.position_name || "-"),
      h("td", { class: "num" }, e.patients ?? "-"), h("td", { class: "num" }, e.staff_present ?? "-"),
      h("td", null, staffCell(e)),
      h("td", { class: "notes" }, e.patient_notes || "-"),
      h("td", { class: "small" }, e.updated_by_name, h("br"), fmtTime(e.updated_at))))))));
}

/* ------------------------------------------------------------------ */
/* settings (admin)                                                   */
/* ------------------------------------------------------------------ */

const SETTINGS_TABS = [
  ["assign", "שיבוץ מחלקות"], ["departments", "מחלקות"], ["positions", "אחים כלליים"],
  ["shifts", "משמרות"], ["lists", "סיבות היעדרות"], ["general", "כללי"], ["users", "משתמשים"],
];

async function renderSettings(params) {
  if (S.user.role !== "admin") return go("/");
  const tab = params.tab || "assign";
  if (!S.draft || !S.dirty) S.draft = clone(cfg());
  const D = S.draft;
  const app = $app();
  app.innerHTML = "";
  app.appendChild(h("h1", null, "הגדרות"));
  app.appendChild(h("div", { class: "tabs" }, SETTINGS_TABS.map(([id, label]) =>
    h("button", { class: id === tab ? "on" : "", onclick: () => { history.replaceState(null, "", "#/settings?tab=" + id); S.lastHash = location.hash; renderSettingsTab(id); markTab(id); } }, label))));
  const body = h("div", { id: "settingsBody" });
  app.appendChild(body);
  const markTab = (id) => app.querySelectorAll(".tabs button").forEach((b, i) => b.classList.toggle("on", SETTINGS_TABS[i][0] === id));

  const saveBar = h("div", { class: "sticky-actions", id: "settingsSave" },
    h("button", {
      class: "btn btn-ok btn-lg", onclick: async () => {
        try {
          const r = await api("PUT", "config", D);
          S.config = r.config; S.draft = clone(r.config); S.dirty = false;
          document.getElementById("hospitalName").textContent = r.config.hospital_name;
          toast("ההגדרות נשמרו ✓", "ok");
          renderSettingsTab(currentTab());
        } catch (e) { toast(e.message, "error"); }
      },
    }, "💾 שמירת הגדרות"),
    h("button", { class: "btn btn-ghost btn-lg", onclick: () => { if (!S.dirty || confirm("לבטל את כל השינויים שלא נשמרו?")) { S.dirty = false; S.draft = clone(cfg()); renderSettingsTab(currentTab()); } } }, "ביטול שינויים"));
  app.appendChild(saveBar);
  renderSettingsTab(tab);
}

function currentTab() { return parseHash().params.tab || "assign"; }

function renderSettingsTab(tab) {
  const body = document.getElementById("settingsBody");
  body.innerHTML = "";
  document.getElementById("settingsSave").classList.toggle("hidden", tab === "users");
  const D = S.draft;
  const mark = () => (S.dirty = true);
  const redraw = () => renderSettingsTab(tab);

  if (tab === "assign") {
    body.appendChild(h("div", { class: "card" },
      h("p", { class: "muted", style: "margin-top:0" }, "לכל מחלקה ולכל משמרת – בחרו איזה אח כללי אחראי עליה."),
      h("div", { class: "table-wrap" }, h("table", { class: "assign-table" },
        h("thead", null, h("tr", null, h("th", null, "מחלקה"), D.shifts.map((s) => h("th", null, s.name + " (" + s.start + "-" + s.end + ")")))),
        h("tbody", null, D.departments.filter((d) => d.active !== false).map((d) => h("tr", null,
          h("td", null, h("b", null, d.name)),
          D.shifts.map((s) => {
            D.assignments[s.id] = D.assignments[s.id] || {};
            const cur = D.assignments[s.id][d.id] || "";
            return h("td", null, h("select", {
              onchange: (e) => { if (e.target.value) D.assignments[s.id][d.id] = e.target.value; else delete D.assignments[s.id][d.id]; mark(); redraw(); },
            }, h("option", { value: "" }, "— ללא —"), D.positions.map((p) => h("option", { value: p.id, ...(cur === p.id ? { selected: true } : {}) }, p.name))));
          }))))))));
    // overview per shift
    body.appendChild(h("h2", null, "תצוגה לפי אח כללי"));
    body.appendChild(h("div", { class: "grid", style: "grid-template-columns:repeat(auto-fit,minmax(280px,1fr))" },
      D.shifts.map((s) => h("div", { class: "card" }, h("h3", { style: "margin-top:0" }, "משמרת " + s.name),
        D.positions.map((p) => {
          const list = D.departments.filter((d) => d.active !== false && (D.assignments[s.id] || {})[d.id] === p.id).map((d) => d.name);
          return h("div", { style: "margin-bottom:6px" }, h("b", null, p.name + ": "), list.length ? list.join(", ") : h("span", { class: "muted" }, "—"));
        }),
        (() => {
          const un = D.departments.filter((d) => d.active !== false && !(D.assignments[s.id] || {})[d.id]).map((d) => d.name);
          return un.length ? h("div", { class: "badge badge-wait" }, "לא משובצות: " + un.join(", ")) : null;
        })()))));
    return;
  }

  if (tab === "departments") {
    body.appendChild(h("div", { class: "card", style: "max-width:720px" },
      h("p", { class: "muted", style: "margin-top:0" }, "מחלקה לא פעילה לא תוצג לדיווח (הדוחות הקודמים שלה נשמרים)."),
      D.departments.map((d, i) => h("div", { class: "list-row" },
        h("input", { value: d.name, oninput: (e) => { d.name = e.target.value; mark(); } }),
        h("label", { style: "display:flex;gap:6px;align-items:center" },
          h("input", { type: "checkbox", checked: d.active !== false, onchange: (e) => { d.active = e.target.checked; mark(); } }), "פעילה"),
        h("button", { class: "btn btn-sm btn-danger-ghost", onclick: () => {
          if (!confirm("למחוק את המחלקה \"" + d.name + "\"? (דוחות קודמים יישמרו. מומלץ לבטל 'פעילה' במקום)")) return;
          D.departments.splice(i, 1); mark(); redraw();
        } }, "מחיקה"))),
      h("button", { class: "btn btn-light", style: "margin-top:8px", onclick: () => {
        D.departments.push({ id: uid("d"), name: "מחלקה חדשה", active: true }); mark(); redraw();
      } }, "+ הוספת מחלקה")));
    return;
  }

  if (tab === "positions") {
    body.appendChild(h("div", { class: "card" },
      h("p", { class: "muted", style: "margin-top:0" }, "העמדות של האחים הכלליים במשמרת (אח כללי 1, 2, 3...). את המחלקות של כל עמדה מגדירים בלשונית \"שיבוץ מחלקות\"."),
      D.positions.map((p, i) => h("div", { class: "list-row" },
        h("input", { value: p.name, oninput: (e) => { p.name = e.target.value; mark(); } }),
        h("button", { class: "btn btn-sm btn-danger-ghost", onclick: () => {
          if (!confirm("למחוק את \"" + p.name + "\"? השיבוצים שלו יימחקו.")) return;
          D.positions.splice(i, 1);
          Object.values(D.assignments).forEach((m) => Object.keys(m).forEach((k) => { if (m[k] === p.id) delete m[k]; }));
          mark(); redraw();
        } }, "מחיקה"))),
      h("button", { class: "btn btn-light", onclick: () => { D.positions.push({ id: uid("p"), name: "אח כללי " + (D.positions.length + 1) }); mark(); redraw(); } }, "+ הוספת אח כללי")));
    return;
  }

  if (tab === "shifts") {
    body.appendChild(h("div", { class: "card" },
      h("p", { class: "muted", style: "margin-top:0" }, "שעות המשמרות קובעות איזו משמרת מוצגת כ\"נוכחית\". משמרת שחוצה חצות (לילה) משויכת לתאריך שבו התחילה."),
      D.shifts.map((s, i) => h("div", { class: "list-row" },
        h("input", { value: s.name, placeholder: "שם", oninput: (e) => { s.name = e.target.value; mark(); } }),
        h("label", null, "התחלה "), h("input", { type: "time", class: "short", value: s.start, oninput: (e) => { s.start = e.target.value; mark(); } }),
        h("label", null, "סיום "), h("input", { type: "time", class: "short", value: s.end, oninput: (e) => { s.end = e.target.value; mark(); } }),
        h("button", { class: "btn btn-sm btn-danger-ghost", onclick: () => {
          if (D.shifts.length <= 1) return toast("חייבת להישאר לפחות משמרת אחת", "error");
          if (!confirm("למחוק את משמרת \"" + s.name + "\"?")) return;
          D.shifts.splice(i, 1); delete D.assignments[s.id]; mark(); redraw();
        } }, "מחיקה"))),
      h("button", { class: "btn btn-light", onclick: () => { D.shifts.push({ id: uid("s"), name: "משמרת חדשה", start: "08:00", end: "16:00" }); mark(); redraw(); } }, "+ הוספת משמרת")));
    return;
  }

  if (tab === "lists") {
    body.appendChild(h("div", { class: "card", style: "max-width:640px" }, h("h3", { style: "margin-top:0" }, "סיבות היעדרות"),
      h("p", { class: "muted small" }, "הסיבות שמופיעות ככפתורים כשמדווחים על איש צוות שלא הגיע."),
      D.absence_reasons.map((v, i) => h("div", { class: "list-row" },
        h("input", { value: v, oninput: (e) => { D.absence_reasons[i] = e.target.value; mark(); } }),
        h("button", { class: "btn btn-sm btn-danger-ghost", onclick: () => { D.absence_reasons.splice(i, 1); mark(); redraw(); } }, "מחיקה"))),
      h("button", { class: "btn btn-light btn-sm", onclick: () => { D.absence_reasons.push("סיבה חדשה"); mark(); redraw(); } }, "+ הוספה")));
    return;
  }

  if (tab === "general") {
    body.appendChild(h("div", { class: "card", style: "max-width:640px" },
      h("label", { class: "field" }, h("span", null, "שם בית החולים / המוסד"),
        h("input", { value: D.hospital_name, oninput: (e) => { D.hospital_name = e.target.value; mark(); } })),
      h("label", { class: "field" }, h("span", null, "חלון עריכה לאחר סיום משמרת (שעות)"),
        h("input", { type: "number", min: 0, value: D.edit_window_hours, oninput: (e) => { D.edit_window_hours = parseInt(e.target.value || "0", 10); mark(); } }),
        h("div", { class: "small muted", style: "margin-top:4px" }, "אחים כלליים יכולים לעדכן דיווח עד מספר שעות זה אחרי סוף המשמרת. מנהל מערכת יכול לערוך תמיד.")),
      S.dataDir ? h("div", { class: "small muted" }, "תיקיית הנתונים: ", h("code", { dir: "ltr" }, S.dataDir)) : null));
    return;
  }

  if (tab === "users") return renderUsers(body);
}

async function renderUsers(body) {
  const r = await api("GET", "users");
  const form = { username: "", name: "", role: "nurse", active: true, password: "", must_change_password: true, isNew: true };
  const box = h("div");
  const drawForm = () => {
    box.innerHTML = "";
    const f = form;
    box.appendChild(h("div", { class: "card", style: "max-width:640px" },
      h("h3", { style: "margin-top:0" }, f.isNew ? "הוספת משתמש" : "עריכת משתמש: " + f.username),
      h("div", { class: "grid", style: "grid-template-columns:1fr 1fr" },
        h("label", { class: "field" }, h("span", null, "שם משתמש (אנגלית)"),
          h("input", { dir: "ltr", value: f.username, disabled: !f.isNew, autocapitalize: "off", oninput: (e) => (f.username = e.target.value) })),
        h("label", { class: "field" }, h("span", null, "שם מלא"), h("input", { value: f.name, oninput: (e) => (f.name = e.target.value) })),
        h("label", { class: "field" }, h("span", null, "הרשאה"),
          h("select", { onchange: (e) => (f.role = e.target.value) },
            h("option", { value: "nurse", ...(f.role === "nurse" ? { selected: true } : {}) }, "אח/ות כללי/ת"),
            h("option", { value: "admin", ...(f.role === "admin" ? { selected: true } : {}) }, "מנהל מערכת"))),
        h("label", { class: "field" }, h("span", null, f.isNew ? "סיסמה ראשונית" : "סיסמה חדשה (ריק = ללא שינוי)"),
          h("input", { dir: "ltr", type: "text", autocomplete: "off", value: f.password, oninput: (e) => (f.password = e.target.value) }))),
      h("label", { style: "display:flex;gap:8px;align-items:center;margin-bottom:8px" },
        h("input", { type: "checkbox", checked: f.active, onchange: (e) => (f.active = e.target.checked) }), "משתמש פעיל"),
      h("label", { style: "display:flex;gap:8px;align-items:center;margin-bottom:12px" },
        h("input", { type: "checkbox", checked: f.must_change_password, onchange: (e) => (f.must_change_password = e.target.checked) }), "לחייב החלפת סיסמה בכניסה הבאה (כשמוגדרת סיסמה)"),
      h("div", { class: "row" },
        h("button", { class: "btn btn-ok", onclick: async () => {
          try {
            await api("POST", "users", f);
            toast("המשתמש נשמר ✓", "ok");
            renderSettingsTab("users");
          } catch (e) { toast(e.message, "error"); }
        } }, "שמירה"),
        !f.isNew ? h("button", { class: "btn btn-ghost", onclick: () => renderSettingsTab("users") }, "משתמש חדש") : null)));
  };

  body.appendChild(h("div", { class: "card table-wrap" }, h("table", null,
    h("thead", null, h("tr", null, h("th", null, "שם משתמש"), h("th", null, "שם מלא"), h("th", null, "הרשאה"), h("th", null, "סטטוס"), h("th", null, ""))),
    h("tbody", null, r.users.map((u) => h("tr", null,
      h("td", { dir: "ltr", style: "text-align:right" }, u.username), h("td", null, u.name),
      h("td", null, u.role === "admin" ? h("span", { class: "badge badge-info" }, "מנהל מערכת") : "אח/ות כללי/ת"),
      h("td", null, u.active ? h("span", { class: "badge badge-ok" }, "פעיל") : h("span", { class: "badge badge-danger" }, "מושבת"),
        u.must_change_password ? h("span", { class: "badge badge-wait", style: "margin-inline-start:4px" }, "ממתין להחלפת סיסמה") : null),
      h("td", null, h("div", { class: "row" },
        h("button", { class: "btn btn-sm btn-light", onclick: () => {
          Object.assign(form, { username: u.username, name: u.name, role: u.role, active: u.active, password: "", must_change_password: false, isNew: false });
          drawForm(); box.scrollIntoView({ behavior: "smooth" });
        } }, "עריכה"),
        u.username !== S.user.username ? h("button", { class: "btn btn-sm btn-danger-ghost", onclick: async () => {
          if (!confirm("למחוק את המשתמש " + u.name + "? (הדוחות שמילא יישמרו)")) return;
          try { await api("DELETE", "users/" + encodeURIComponent(u.username)); toast("נמחק"); renderSettingsTab("users"); }
          catch (e) { toast(e.message, "error"); }
        } }, "מחיקה") : null))))))));
  drawForm();
  body.appendChild(box);
}

render();
