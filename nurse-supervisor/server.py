# -*- coding: utf-8 -*-
"""
תוכנת נוכחות ודיווח - אח/ות כללי/ת
=====================================
שרת מקומי ללא תלויות חיצוניות (Python 3.8+ בלבד).
כל הנתונים נשמרים כקבצי JSON בתיקיית data שליד התוכנה (או בתיקייה שהוגדרה),
כך שניתן להציב את כל התיקייה בתיקיית רשת ולשמור היסטוריה מלאה של הדוחות.

הפעלה:
    python server.py                 # פורט 8080, תיקיית data ליד הקובץ
    python server.py --port 9000 --data "\\\\server\\share\\nurse-data"
"""

import argparse
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import socket
import sys
import threading
import time
import uuid
from datetime import date, datetime, timedelta
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(APP_DIR, "static")
DATA_DIR = os.path.join(APP_DIR, "data")  # overridden by --data

SESSION_HOURS = 14
SESSIONS = {}  # token -> {"username": str, "expires": float}
LOCK = threading.RLock()

DEFAULT_CONFIG = {
    "hospital_name": "בית החולים",
    "edit_window_hours": 12,
    "shifts": [
        {"id": "morning", "name": "בוקר", "start": "07:00", "end": "15:00"},
        {"id": "evening", "name": "ערב", "start": "15:00", "end": "23:00"},
        {"id": "night", "name": "לילה", "start": "23:00", "end": "07:00"},
    ],
    "positions": [
        {"id": "p1", "name": "אח כללי 1"},
        {"id": "p2", "name": "אח כללי 2"},
        {"id": "p3", "name": "אח כללי 3"},
    ],
    "departments": [
        {"id": "d1", "name": "פנימית א'", "beds": 36, "active": True,
         "standard": {"morning": 7, "evening": 5, "night": 4}},
        {"id": "d2", "name": "פנימית ב'", "beds": 36, "active": True,
         "standard": {"morning": 7, "evening": 5, "night": 4}},
        {"id": "d3", "name": "כירורגיה", "beds": 30, "active": True,
         "standard": {"morning": 6, "evening": 4, "night": 3}},
        {"id": "d4", "name": "גריאטריה", "beds": 32, "active": True,
         "standard": {"morning": 6, "evening": 4, "night": 3}},
        {"id": "d5", "name": "אורתופדיה", "beds": 28, "active": True,
         "standard": {"morning": 5, "evening": 4, "night": 3}},
        {"id": "d6", "name": "מיון", "beds": 40, "active": True,
         "standard": {"morning": 10, "evening": 9, "night": 7}},
    ],
    # assignments[shift_id][department_id] = position_id
    "assignments": {
        "morning": {"d1": "p1", "d2": "p1", "d3": "p2", "d4": "p2", "d5": "p3", "d6": "p3"},
        "evening": {"d1": "p1", "d2": "p1", "d3": "p1", "d4": "p2", "d5": "p2", "d6": "p2"},
        "night": {"d1": "p1", "d2": "p1", "d3": "p1", "d4": "p1", "d5": "p2", "d6": "p2"},
    },
    "absence_reasons": [
        "מחלה", "מחלת ילד", "חופשה", "מילואים", "אירוע משפחתי",
        "לא הודיע/ה (פאנצ'ר)", "איחור", "השתלמות", "אחר",
    ],
    "staff_roles": ["אח/ות מוסמך/ת", "אח/ות מעשי/ת", "כוח עזר", "מזכיר/ה", "סטודנט/ית", "אחר"],
    "counters": [
        {"id": "c1", "name": "מונשמים"},
        {"id": "c2", "name": "בבידוד"},
        {"id": "c3", "name": "קשים / סיעודיים"},
        {"id": "c4", "name": "קבלות"},
        {"id": "c5", "name": "שחרורים"},
    ],
}


# ---------------------------------------------------------------------------
# File helpers (atomic writes + cross-process lock, safe on network shares)
# ---------------------------------------------------------------------------

class FileLock:
    """Simple cross-process lock using an exclusive lock file.

    Protects against two server instances (e.g. on different PCs) writing to
    the same network folder at the same moment.
    """

    def __init__(self, path, timeout=15, stale=60):
        self.path = path
        self.timeout = timeout
        self.stale = stale

    def __enter__(self):
        deadline = time.time() + self.timeout
        while True:
            try:
                fd = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, f"{socket.gethostname()} {os.getpid()}".encode())
                os.close(fd)
                return self
            except FileExistsError:
                try:
                    if time.time() - os.path.getmtime(self.path) > self.stale:
                        os.remove(self.path)
                        continue
                except OSError:
                    pass
                if time.time() > deadline:
                    raise TimeoutError("המערכת עסוקה, נסו שוב")
                time.sleep(0.1)

    def __exit__(self, *exc):
        try:
            os.remove(self.path)
        except OSError:
            pass


def data_lock():
    return FileLock(os.path.join(DATA_DIR, ".write.lock"))


def read_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError:
        # keep a copy of a corrupted file instead of silently losing it
        bad = path + ".corrupt-" + datetime.now().strftime("%Y%m%d%H%M%S")
        try:
            os.replace(path, bad)
        except OSError:
            pass
        return default


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.{uuid.uuid4().hex}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def config_path():
    return os.path.join(DATA_DIR, "config.json")


def users_path():
    return os.path.join(DATA_DIR, "users.json")


def day_path(day):
    return os.path.join(DATA_DIR, "reports", day[:4], f"{day}.json")


def audit(user, action, details):
    line = json.dumps({
        "time": datetime.now().isoformat(timespec="seconds"),
        "user": user, "action": action, "details": details,
    }, ensure_ascii=False)
    path = os.path.join(DATA_DIR, "audit", datetime.now().strftime("%Y-%m") + ".log")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_config():
    cfg = read_json(config_path())
    if cfg is None:
        cfg = json.loads(json.dumps(DEFAULT_CONFIG))
        write_json(config_path(), cfg)
    for k, v in DEFAULT_CONFIG.items():
        cfg.setdefault(k, json.loads(json.dumps(v)))
    return cfg


def save_config(cfg):
    old = read_json(config_path())
    if old is not None:
        bdir = os.path.join(DATA_DIR, "backups")
        write_json(os.path.join(bdir, "config-" + datetime.now().strftime("%Y%m%d-%H%M%S") + ".json"), old)
        backups = sorted(f for f in os.listdir(bdir) if f.startswith("config-"))
        for f in backups[:-100]:
            try:
                os.remove(os.path.join(bdir, f))
            except OSError:
                pass
    write_json(config_path(), cfg)


# ---------------------------------------------------------------------------
# Users / auth
# ---------------------------------------------------------------------------

def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120_000).hex()
    return salt, h


def load_users():
    users = read_json(users_path())
    if users is None:
        salt, h = hash_password("admin")
        users = [{
            "username": "admin", "name": "מנהל מערכת", "role": "admin",
            "salt": salt, "hash": h, "active": True, "must_change_password": True,
        }]
        write_json(users_path(), users)
    return users


def find_user(username):
    username = (username or "").strip().lower()
    for u in load_users():
        if u["username"].lower() == username:
            return u
    return None


def public_user(u):
    return {k: u.get(k) for k in ("username", "name", "role", "active", "must_change_password")}


# ---------------------------------------------------------------------------
# Shift / time logic
# ---------------------------------------------------------------------------

def parse_hm(s):
    h, m = s.split(":")
    return int(h), int(m)


def shift_bounds(cfg, day, shift_id):
    """Return (start, end) datetimes of a shift that *starts* on `day`."""
    sh = next((s for s in cfg["shifts"] if s["id"] == shift_id), None)
    if not sh:
        return None
    d = date.fromisoformat(day)
    sh_h, sh_m = parse_hm(sh["start"])
    en_h, en_m = parse_hm(sh["end"])
    start = datetime(d.year, d.month, d.day, sh_h, sh_m)
    end = datetime(d.year, d.month, d.day, en_h, en_m)
    if end <= start:
        end += timedelta(days=1)
    return start, end


def current_shift(cfg, now=None):
    """Which (date, shift_id) is running now. A night shift that crossed
    midnight belongs to the date on which it started."""
    now = now or datetime.now()
    for offset in (0, -1):
        day = (now.date() + timedelta(days=offset)).isoformat()
        for s in cfg["shifts"]:
            b = shift_bounds(cfg, day, s["id"])
            if b and b[0] <= now < b[1]:
                return day, s["id"]
    return now.date().isoformat(), cfg["shifts"][0]["id"]


def can_edit(user, cfg, day, shift_id):
    if user["role"] == "admin":
        return True
    b = shift_bounds(cfg, day, shift_id)
    if not b:
        return False
    now = datetime.now()
    window = timedelta(hours=float(cfg.get("edit_window_hours", 12)))
    return b[0] - timedelta(hours=2) <= now <= b[1] + window


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_RE = re.compile(r"^[A-Za-z0-9_\-]{1,40}$")


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def need(cond, message, status=400):
    if not cond:
        raise ApiError(status, message)


def clean_str(v, max_len=2000):
    if v is None:
        return ""
    return str(v).strip()[:max_len]


def clean_int(v, lo=0, hi=9999):
    if v in (None, ""):
        return None
    try:
        n = int(v)
    except (TypeError, ValueError):
        raise ApiError(400, "ערך מספרי לא תקין")
    return max(lo, min(hi, n))


def valid_date(s):
    if not s or not DATE_RE.match(s):
        return False
    try:
        date.fromisoformat(s)
        return True
    except ValueError:
        return False


def daterange(a, b):
    d1, d2 = date.fromisoformat(a), date.fromisoformat(b)
    while d1 <= d2:
        yield d1.isoformat()
        d1 += timedelta(days=1)


# ---------------------------------------------------------------------------
# Domain operations
# ---------------------------------------------------------------------------

def validate_config(cfg):
    need(isinstance(cfg, dict), "הגדרות לא תקינות")
    out = {}
    out["hospital_name"] = clean_str(cfg.get("hospital_name"), 120) or "בית החולים"
    out["edit_window_hours"] = clean_int(cfg.get("edit_window_hours"), 0, 24 * 30) or 0

    def id_list(items, label, extra=None):
        need(isinstance(items, list), f"רשימת {label} לא תקינה")
        res, seen = [], set()
        for it in items:
            iid = clean_str(it.get("id"), 40) or uuid.uuid4().hex[:8]
            need(ID_RE.match(iid), f"מזהה לא תקין ב{label}")
            need(iid not in seen, f"מזהה כפול ב{label}")
            seen.add(iid)
            name = clean_str(it.get("name"), 80)
            need(name, f"חסר שם ב{label}")
            row = {"id": iid, "name": name}
            if extra:
                extra(it, row)
            res.append(row)
        return res

    def shift_extra(it, row):
        for k in ("start", "end"):
            v = clean_str(it.get(k), 5)
            need(re.match(r"^\d{2}:\d{2}$", v), "שעת משמרת לא תקינה (HH:MM)")
            row[k] = v

    out["shifts"] = id_list(cfg.get("shifts"), "משמרות", shift_extra)
    need(out["shifts"], "חייבת להיות לפחות משמרת אחת")
    shift_ids = {s["id"] for s in out["shifts"]}

    out["positions"] = id_list(cfg.get("positions"), "אחים כלליים")

    def dept_extra(it, row):
        row["beds"] = clean_int(it.get("beds"), 0, 999) or 0
        row["active"] = bool(it.get("active", True))
        std = it.get("standard") or {}
        row["standard"] = {sid: clean_int(std.get(sid), 0, 999) or 0 for sid in shift_ids}

    out["departments"] = id_list(cfg.get("departments"), "מחלקות", dept_extra)
    out["counters"] = id_list(cfg.get("counters") or [], "מונים")

    pos_ids = {p["id"] for p in out["positions"]}
    dept_ids = {d["id"] for d in out["departments"]}
    asg = cfg.get("assignments") or {}
    out["assignments"] = {}
    for sid in shift_ids:
        m = asg.get(sid) or {}
        out["assignments"][sid] = {d: p for d, p in m.items() if d in dept_ids and p in pos_ids}

    for key in ("absence_reasons", "staff_roles"):
        vals = [clean_str(x, 80) for x in (cfg.get(key) or [])]
        out[key] = [v for v in dict.fromkeys(vals) if v]
    return out


def validate_entry(body, cfg):
    counters = {}
    for c in cfg["counters"]:
        v = clean_int((body.get("counters") or {}).get(c["id"]), 0, 999)
        if v is not None:
            counters[c["id"]] = v
    absences = []
    for a in (body.get("absences") or [])[:100]:
        emp = clean_str(a.get("employee"), 80)
        reason = clean_str(a.get("reason"), 80)
        if not emp and not reason:
            continue
        need(reason, "יש לבחור סיבת היעדרות לכל עובד")
        absences.append({
            "employee": emp,
            "role": clean_str(a.get("role"), 80),
            "reason": reason,
            "details": clean_str(a.get("details"), 500),
            "replaced": bool(a.get("replaced")),
            "replacement": clean_str(a.get("replacement"), 80),
        })
    return {
        "patients": clean_int(body.get("patients"), 0, 999),
        "staff_present": clean_int(body.get("staff_present"), 0, 999),
        "staff_standard": clean_int(body.get("staff_standard"), 0, 999),
        "counters": counters,
        "absences": absences,
        "patient_notes": clean_str(body.get("patient_notes"), 5000),
        "general_notes": clean_str(body.get("general_notes"), 5000),
    }


def get_day(day):
    return read_json(day_path(day), {"date": day, "shifts": {}})


def shift_overview(cfg, day, shift_id):
    data = get_day(day)
    entries = data.get("shifts", {}).get(shift_id, {}).get("departments", {})
    asg = cfg["assignments"].get(shift_id, {})
    pos_names = {p["id"]: p["name"] for p in cfg["positions"]}
    depts = []
    for d in cfg["departments"]:
        e = entries.get(d["id"])
        if not d.get("active", True) and not e:
            continue
        depts.append({
            "id": d["id"], "name": d["name"], "beds": d.get("beds", 0),
            "standard": d.get("standard", {}).get(shift_id, 0),
            "position_id": asg.get(d["id"]),
            "position_name": pos_names.get(asg.get(d["id"]), ""),
            "entry": e,
        })
    return {"date": day, "shift": shift_id, "departments": depts,
            "positions": data.get("shifts", {}).get(shift_id, {}).get("positions", {})}


def collect_entries(cfg, date_from, date_to, shift_id=None, dept_id=None, position_id=None):
    shift_order = {s["id"]: i for i, s in enumerate(cfg["shifts"])}
    shift_names = {s["id"]: s["name"] for s in cfg["shifts"]}
    rows = []
    for day in daterange(date_from, date_to):
        p = day_path(day)
        if not os.path.exists(p):
            continue
        data = read_json(p, {}) or {}
        for sid, sdata in (data.get("shifts") or {}).items():
            if shift_id and sid != shift_id:
                continue
            for did, e in (sdata.get("departments") or {}).items():
                if dept_id and did != dept_id:
                    continue
                if position_id and e.get("position_id") != position_id:
                    continue
                row = dict(e)
                row.update({"date": day, "shift": sid,
                            "shift_name": shift_names.get(sid, e.get("shift_name", sid)),
                            "department_id": did})
                rows.append(row)
    rows.sort(key=lambda r: (r["date"], shift_order.get(r["shift"], 99), r.get("department_name", "")))
    return rows


def summarize(rows):
    s = {"entries": len(rows), "patients": 0, "staff_present": 0, "staff_standard": 0,
         "absences": 0, "replaced": 0, "by_reason": {}, "by_department": {}, "counters": {}}
    for r in rows:
        s["patients"] += r.get("patients") or 0
        s["staff_present"] += r.get("staff_present") or 0
        s["staff_standard"] += r.get("staff_standard") or 0
        for cid, v in (r.get("counters") or {}).items():
            s["counters"][cid] = s["counters"].get(cid, 0) + (v or 0)
        dn = r.get("department_name") or r["department_id"]
        bd = s["by_department"].setdefault(dn, {"entries": 0, "absences": 0, "shortage": 0})
        bd["entries"] += 1
        std, pres = r.get("staff_standard"), r.get("staff_present")
        if std is not None and pres is not None and pres < std:
            bd["shortage"] += std - pres
        for a in r.get("absences") or []:
            s["absences"] += 1
            bd["absences"] += 1
            if a.get("replaced"):
                s["replaced"] += 1
            s["by_reason"][a["reason"]] = s["by_reason"].get(a["reason"], 0) + 1
    return s


def rows_to_csv(cfg, rows, kind):
    buf = io.StringIO()
    buf.write("﻿")  # BOM so Excel opens Hebrew correctly
    w = csv.writer(buf)
    if kind == "absences":
        w.writerow(["תאריך", "משמרת", "מחלקה", "אח כללי", "שם העובד", "תפקיד", "סיבה",
                    "פירוט", "הוחלף", "מחליף", "דווח ע\"י"])
        for r in rows:
            for a in r.get("absences") or []:
                w.writerow([r["date"], r["shift_name"], r.get("department_name"), r.get("position_name"),
                            a.get("employee"), a.get("role"), a.get("reason"), a.get("details"),
                            "כן" if a.get("replaced") else "לא", a.get("replacement"),
                            r.get("updated_by_name")])
    else:
        counters = cfg["counters"]
        w.writerow(["תאריך", "משמרת", "מחלקה", "אח כללי", "מטופלים", "עובדים בפועל", "תקן",
                    "חוסר", "חסרים (מספר)"] + [c["name"] for c in counters] +
                   ["מצב מטופלים", "הערות", "דווח ע\"י", "עודכן"])
        for r in rows:
            std, pres = r.get("staff_standard"), r.get("staff_present")
            short = (std - pres) if (std is not None and pres is not None and pres < std) else 0
            w.writerow([r["date"], r["shift_name"], r.get("department_name"), r.get("position_name"),
                        r.get("patients"), pres, std, short, len(r.get("absences") or [])] +
                       [(r.get("counters") or {}).get(c["id"], "") for c in counters] +
                       [r.get("patient_notes"), r.get("general_notes"), r.get("updated_by_name"),
                        r.get("updated_at")])
    return buf.getvalue().encode("utf-8")


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
        ".ico": "image/x-icon", ".json": "application/json; charset=utf-8"}


class Handler(BaseHTTPRequestHandler):
    server_version = "NurseSupervisor/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))

    # ---- helpers ----
    def send_json(self, obj, status=200, extra_headers=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        need(n <= 2_000_000, "בקשה גדולה מדי", 413)
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "JSON לא תקין")

    def current_user(self):
        c = cookies.SimpleCookie(self.headers.get("Cookie") or "")
        tok = c.get("ns_session")
        if not tok:
            return None
        s = SESSIONS.get(tok.value)
        if not s or s["expires"] < time.time():
            SESSIONS.pop(tok.value, None)
            return None
        u = find_user(s["username"])
        if not u or not u.get("active", True):
            return None
        return u

    def require_user(self, admin=False):
        u = self.current_user()
        need(u is not None, "יש להתחבר מחדש", 401)
        if admin:
            need(u["role"] == "admin", "אין הרשאה - נדרש מנהל מערכת", 403)
        return u

    # ---- routing ----
    def do_GET(self):
        self.dispatch("GET")

    def do_POST(self):
        self.dispatch("POST")

    def do_PUT(self):
        self.dispatch("PUT")

    def do_DELETE(self):
        self.dispatch("DELETE")

    def dispatch(self, method):
        url = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            if url.path.startswith("/api/"):
                with LOCK:
                    return self.api(method, url.path[5:], q)
            if method != "GET":
                raise ApiError(405, "Method not allowed")
            return self.static(url.path)
        except ApiError as e:
            self.send_json({"error": e.message}, e.status)
        except TimeoutError as e:
            self.send_json({"error": str(e)}, 503)
        except Exception as e:  # noqa
            import traceback
            traceback.print_exc()
            self.send_json({"error": "שגיאת שרת: " + str(e)}, 500)

    def static(self, path):
        if path in ("", "/"):
            path = "/index.html"
        full = os.path.normpath(os.path.join(STATIC_DIR, path.lstrip("/")))
        if not full.startswith(STATIC_DIR + os.sep) or not os.path.isfile(full):
            full = os.path.join(STATIC_DIR, "index.html")
        with open(full, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(os.path.splitext(full)[1], "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def api(self, method, route, q):
        # ---------- auth ----------
        if route == "login" and method == "POST":
            b = self.read_body()
            u = find_user(b.get("username"))
            ok = False
            if u and u.get("active", True):
                _, h = hash_password(str(b.get("password", "")), u["salt"])
                ok = hmac.compare_digest(h, u["hash"])
            if not ok:
                time.sleep(0.5)
                raise ApiError(401, "שם משתמש או סיסמה שגויים")
            tok = secrets.token_urlsafe(32)
            SESSIONS[tok] = {"username": u["username"], "expires": time.time() + SESSION_HOURS * 3600}
            audit(u["username"], "login", {"ip": self.client_address[0]})
            return self.send_json({"user": public_user(u)}, extra_headers={
                "Set-Cookie": f"ns_session={tok}; HttpOnly; Path=/; SameSite=Strict; Max-Age={SESSION_HOURS * 3600}"})

        if route == "logout" and method == "POST":
            c = cookies.SimpleCookie(self.headers.get("Cookie") or "")
            if c.get("ns_session"):
                SESSIONS.pop(c["ns_session"].value, None)
            return self.send_json({"ok": True}, extra_headers={
                "Set-Cookie": "ns_session=; HttpOnly; Path=/; Max-Age=0"})

        user = self.require_user()
        cfg = load_config()

        if route == "me" and method == "GET":
            day, sid = current_shift(cfg)
            return self.send_json({"user": public_user(user), "config": cfg,
                                   "now": {"date": day, "shift": sid,
                                           "time": datetime.now().isoformat(timespec="minutes")},
                                   "data_dir": DATA_DIR if user["role"] == "admin" else None})

        if route == "change-password" and method == "POST":
            b = self.read_body()
            _, h = hash_password(str(b.get("old", "")), user["salt"])
            need(hmac.compare_digest(h, user["hash"]), "הסיסמה הנוכחית שגויה")
            new = str(b.get("new", ""))
            need(len(new) >= 4, "הסיסמה החדשה חייבת להכיל לפחות 4 תווים")
            with data_lock():
                users = load_users()
                for u in users:
                    if u["username"] == user["username"]:
                        u["salt"], u["hash"] = hash_password(new)
                        u["must_change_password"] = False
                write_json(users_path(), users)
            audit(user["username"], "change-password", {})
            return self.send_json({"ok": True})

        # ---------- shift / entries ----------
        if route == "shift" and method == "GET":
            day, sid = q.get("date"), q.get("shift")
            need(valid_date(day), "תאריך לא תקין")
            need(any(s["id"] == sid for s in cfg["shifts"]), "משמרת לא קיימת")
            ov = shift_overview(cfg, day, sid)
            ov["can_edit"] = can_edit(user, cfg, day, sid)
            return self.send_json(ov)

        if route == "shift/position" and method == "POST":
            # register who is acting as which general nurse in this shift
            b = self.read_body()
            day, sid, pid = b.get("date"), b.get("shift"), b.get("position")
            need(valid_date(day), "תאריך לא תקין")
            need(any(s["id"] == sid for s in cfg["shifts"]), "משמרת לא קיימת")
            need(any(p["id"] == pid for p in cfg["positions"]), "עמדה לא קיימת")
            need(can_edit(user, cfg, day, sid), "לא ניתן לעדכן משמרת זו", 403)
            with data_lock():
                data = get_day(day)
                sh = data.setdefault("shifts", {}).setdefault(sid, {"departments": {}})
                sh.setdefault("positions", {})[pid] = {
                    "username": user["username"], "name": user["name"],
                    "since": datetime.now().isoformat(timespec="minutes")}
                write_json(day_path(day), data)
            return self.send_json({"ok": True})

        if route == "entry" and method == "PUT":
            b = self.read_body()
            day, sid, did = b.get("date"), b.get("shift"), b.get("department")
            need(valid_date(day), "תאריך לא תקין")
            shift = next((s for s in cfg["shifts"] if s["id"] == sid), None)
            need(shift, "משמרת לא קיימת")
            dept = next((d for d in cfg["departments"] if d["id"] == did), None)
            need(dept, "מחלקה לא קיימת")
            need(can_edit(user, cfg, day, sid),
                 "חלון העריכה למשמרת זו נסגר. לתיקון יש לפנות למנהל המערכת", 403)
            entry = validate_entry(b, cfg)
            pid = cfg["assignments"].get(sid, {}).get(did)
            pos = next((p for p in cfg["positions"] if p["id"] == pid), None)
            with data_lock():
                data = get_day(day)
                sh = data.setdefault("shifts", {}).setdefault(sid, {"departments": {}})
                deps = sh.setdefault("departments", {})
                prev = deps.get(did)
                if prev and b.get("base_updated_at") and prev.get("updated_at") != b.get("base_updated_at"):
                    raise ApiError(409, f"הדיווח עודכן בינתיים ע\"י {prev.get('updated_by_name')}. "
                                        "רעננו את המסך כדי לראות את הגרסה העדכנית.")
                entry.update({
                    "department_name": dept["name"],
                    "shift_name": shift["name"],
                    "position_id": pid, "position_name": pos["name"] if pos else "",
                    "created_at": (prev or {}).get("created_at") or datetime.now().isoformat(timespec="seconds"),
                    "updated_at": datetime.now().isoformat(timespec="seconds"),
                    "updated_by": user["username"], "updated_by_name": user["name"],
                    "revisions": ((prev or {}).get("revisions") or 0) + 1,
                })
                if entry["staff_standard"] is None:
                    entry["staff_standard"] = dept.get("standard", {}).get(sid)
                deps[did] = entry
                write_json(day_path(day), data)
            audit(user["username"], "save-entry", {"date": day, "shift": sid, "department": did,
                                                   "entry": {k: entry[k] for k in ("patients", "staff_present",
                                                                                   "absences")}})
            return self.send_json({"ok": True, "entry": entry})

        if route == "entry" and method == "DELETE":
            need(user["role"] == "admin", "רק מנהל מערכת יכול למחוק דיווח", 403)
            day, sid, did = q.get("date"), q.get("shift"), q.get("department")
            need(valid_date(day), "תאריך לא תקין")
            with data_lock():
                data = get_day(day)
                removed = (data.get("shifts", {}).get(sid, {}).get("departments", {})).pop(did, None)
                write_json(day_path(day), data)
            audit(user["username"], "delete-entry", {"date": day, "shift": sid, "department": did,
                                                     "removed": removed})
            return self.send_json({"ok": True})

        # ---------- reports ----------
        if route in ("reports", "reports.csv") and method == "GET":
            df, dt = q.get("from"), q.get("to")
            need(valid_date(df) and valid_date(dt), "טווח תאריכים לא תקין")
            need(df <= dt, "תאריך ההתחלה מאוחר מתאריך הסיום")
            need((date.fromisoformat(dt) - date.fromisoformat(df)).days <= 800, "טווח ארוך מדי (מקסימום כשנתיים)")
            rows = collect_entries(cfg, df, dt, q.get("shift") or None, q.get("department") or None,
                                   q.get("position") or None)
            if route == "reports.csv":
                kind = "absences" if q.get("kind") == "absences" else "entries"
                body = rows_to_csv(cfg, rows, kind)
                fname = f"report-{kind}-{df}_{dt}.csv"
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            return self.send_json({"rows": rows, "summary": summarize(rows)})

        # ---------- admin ----------
        if route == "config" and method == "PUT":
            self.require_user(admin=True)
            new_cfg = validate_config(self.read_body())
            with data_lock():
                save_config(new_cfg)
            audit(user["username"], "save-config", {})
            return self.send_json({"ok": True, "config": new_cfg})

        if route == "users" and method == "GET":
            self.require_user(admin=True)
            return self.send_json({"users": [public_user(u) for u in load_users()]})

        if route == "users" and method == "POST":
            self.require_user(admin=True)
            b = self.read_body()
            uname = clean_str(b.get("username"), 40).lower()
            need(re.match(r"^[a-z0-9_.\-]{2,40}$", uname),
                 "שם משתמש: אותיות באנגלית, ספרות, נקודה, מקף (2-40 תווים)")
            name = clean_str(b.get("name"), 80)
            need(name, "יש להזין שם מלא")
            role = "admin" if b.get("role") == "admin" else "nurse"
            pw = str(b.get("password") or "")
            with data_lock():
                users = load_users()
                u = next((x for x in users if x["username"] == uname), None)
                if u is None:
                    need(len(pw) >= 4, "סיסמה חייבת להכיל לפחות 4 תווים")
                    u = {"username": uname}
                    users.append(u)
                    u["must_change_password"] = True
                u["name"], u["role"], u["active"] = name, role, bool(b.get("active", True))
                if pw:
                    need(len(pw) >= 4, "סיסמה חייבת להכיל לפחות 4 תווים")
                    u["salt"], u["hash"] = hash_password(pw)
                    u["must_change_password"] = bool(b.get("must_change_password", True))
                need(any(x["role"] == "admin" and x.get("active", True) for x in users),
                     "חייב להישאר לפחות מנהל מערכת פעיל אחד")
                write_json(users_path(), users)
            audit(user["username"], "save-user", {"username": uname, "role": role})
            return self.send_json({"ok": True})

        if route.startswith("users/") and method == "DELETE":
            self.require_user(admin=True)
            uname = route.split("/", 1)[1].lower()
            need(uname != user["username"], "לא ניתן למחוק את המשתמש המחובר")
            with data_lock():
                users = [u for u in load_users() if u["username"] != uname]
                need(any(x["role"] == "admin" and x.get("active", True) for x in users),
                     "חייב להישאר לפחות מנהל מערכת פעיל אחד")
                write_json(users_path(), users)
            audit(user["username"], "delete-user", {"username": uname})
            return self.send_json({"ok": True})

        raise ApiError(404, "לא נמצא")


def local_ips():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ip for ip in ips if not ip.startswith("127."))


def main():
    global DATA_DIR
    ap = argparse.ArgumentParser(description="תוכנת אח כללי")
    ap.add_argument("--port", type=int, default=int(os.environ.get("NURSE_PORT", 8080)))
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--data", default=os.environ.get("NURSE_DATA_DIR", DATA_DIR),
                    help="תיקיית הנתונים (ברירת מחדל: data ליד התוכנה)")
    args = ap.parse_args()
    DATA_DIR = os.path.abspath(args.data)
    os.makedirs(DATA_DIR, exist_ok=True)
    load_config()
    load_users()
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print("=" * 60)
    print(" תוכנת אח כללי - השרת פועל")
    print(f" תיקיית נתונים: {DATA_DIR}")
    print(f" במחשב זה:   http://localhost:{args.port}")
    for ip in local_ips():
        print(f" בטאבלטים:   http://{ip}:{args.port}")
    print(" לעצירה: Ctrl+C")
    print("=" * 60)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nהשרת נעצר.")


if __name__ == "__main__":
    main()
