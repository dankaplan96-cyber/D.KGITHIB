'use strict';
// ════════════════════════════════════════════════════════════════
// Storage & synchronisation through a shared network folder.
//
// <shared folder>/
//   מערכת_ניהול_סיעוד.html      ← the application (this file)
//   data/nursing-db.json         ← the single database (all users)
//   data/nursing-db.lock         ← short write lock
//   data/presence/*.json         ← who is connected now
//   backups/                     ← automatic daily + manual backups
//   documents/<employee>/        ← scanned documents per employee
//   reports/<date>/              ← copies of produced reports
//
// Each computer also keeps a working copy in IndexedDB, so the system
// keeps working if the network drops, and syncs when it comes back.
// ════════════════════════════════════════════════════════════════

const IDB_NAME = (typeof window !== 'undefined' && window.__NM_DEMO__) ? 'NursingManagementDemo' : 'NursingManagementSharedFolder'; // same as the previous version → folder permission is kept
const IDB_STORE = 'kv';
const HANDLE_KEY = 'sharedNetworkFolder';
const DB_FILE = 'nursing-db.json';
const LOCK_FILE = 'nursing-db.lock';
const LEGACY_FILE = 'application-data.json';
const POLL_MS = 4000;
const SAVE_DELAY_MS = 700;
const LOCK_STALE_MS = 20000;
const DOC_FORMAT = 'nursing-management-db';

const IDB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const rq = indexedDB.open(IDB_NAME, 1);
      rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(IDB_STORE)) rq.result.createObjectStore(IDB_STORE); };
      rq.onsuccess = () => { this._db = rq.result; res(this._db); };
      rq.onerror = () => rej(rq.error);
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise((res, rej) => { const rq = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(k); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  },
  async set(k, v) {
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  },
  async del(k) {
    const db = await this.open();
    return new Promise((res) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(k); tx.oncomplete = () => res(); tx.onerror = () => res(); });
  },
};

const FS = {
  supported: () => typeof window !== 'undefined' && 'showDirectoryPicker' in window,
  async dir(parent, name, create = true) { return parent.getDirectoryHandle(name, { create }); },
  async path(root, parts, create = true) { let d = root; for (const p of parts) d = await d.getDirectoryHandle(p, { create }); return d; },
  async exists(dir, name) { try { await dir.getFileHandle(name); return true; } catch (e) { return false; } },
  async readText(dir, name) {
    try { const fh = await dir.getFileHandle(name); const f = await fh.getFile(); return { text: await f.text(), lastModified: f.lastModified, size: f.size }; } catch (e) { if (e.name === 'NotFoundError') return null; throw e; }
  },
  async stat(dir, name) {
    try { const f = await (await dir.getFileHandle(name)).getFile(); return { lastModified: f.lastModified, size: f.size }; } catch (e) { if (e.name === 'NotFoundError') return null; throw e; }
  },
  async write(dir, name, data) {
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(data);
    await w.close(); // the browser swaps the file in atomically on close
  },
  async remove(dir, name) { try { await dir.removeEntry(name); } catch (e) { /* already gone */ } },
  async list(dir) { const out = []; for await (const [name, h] of dir.entries()) out.push({ name, kind: h.kind, handle: h }); return out; },
};

const Store = {
  db: null, base: null, baseRev: 0, dirty: false, seq: 0,
  root: null, dataDir: null, connected: false, permission: 'none', folderName: '',
  status: 'local', statusText: '', lastSyncAt: '', lastRemote: null, remoteStat: null,
  station: '', user: null, saving: false, saveAgain: false, pollTimer: null, presenceTimer: null,
  listeners: new Set(), conflicts: [], online: [],

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(type, payload) { for (const fn of this.listeners) { try { fn(type, payload); } catch (e) { console.error(e); } } },
  setStatus(s, text = '') { this.status = s; this.statusText = text; this.emit('status'); },

  async init() {
    this.station = (await IDB.get('nm3.station')) || U.uid('st');
    await IDB.set('nm3.station', this.station);
    const local = await IDB.get('nm3.local');
    this.db = normalizeDB(local && local.db ? local.db : emptyDB());
    this.dirty = !!(local && local.dirty);
    this.baseRev = (local && local.baseRev) || 0;
    this.base = (await IDB.get('nm3.base')) || null;
    this.root = (await IDB.get(HANDLE_KEY)) || null;
    if (this.root && typeof this.root.queryPermission !== 'function') this.root = null;
    if (this.root) {
      this.folderName = this.root.name;
      try { this.permission = await this.root.queryPermission({ mode: 'readwrite' }); } catch (e) { this.permission = 'prompt'; }
      if (this.permission === 'granted') { try { await this.attach(); } catch (e) { console.warn(e); this.setStatus('error', 'לא ניתן לגשת לתיקייה המשותפת'); } }
      else this.setStatus('needs-permission', 'נדרש אישור גישה לתיקייה המשותפת');
    } else this.setStatus('local', 'לא מחובר לתיקייה משותפת');
    window.addEventListener('beforeunload', (ev) => { if (this.dirty && this.connected) { this.saveNow(); ev.preventDefault(); ev.returnValue = ''; } });
  },

  // user gesture required
  async pickFolder() {
    if (!FS.supported()) throw new Error('הדפדפן אינו תומך בעבודה מול תיקייה. יש לפתוח את הקובץ ב-Google Chrome או Microsoft Edge.');
    const h = await window.showDirectoryPicker({ id: 'nursing-shared', mode: 'readwrite' });
    const names = (await FS.list(h)).map((x) => x.name);
    if ((names.includes(DB_FILE) || names.includes(LEGACY_FILE)) && !names.includes('data')) {
      throw new Error('נבחרה תיקיית data. יש לבחור את התיקייה הראשית — זו שבה נמצא קובץ המערכת.');
    }
    this.root = h;
    this.folderName = h.name;
    await IDB.set(HANDLE_KEY, h);
    this.permission = 'granted';
    return this.attach({ fresh: true });
  },
  async grantPermission() {
    if (!this.root) return this.pickFolder();
    this.permission = await this.root.requestPermission({ mode: 'readwrite' });
    if (this.permission !== 'granted') throw new Error('לא ניתנה הרשאה לתיקייה');
    return this.attach();
  },
  async disconnect() {
    this.stopTimers();
    this.root = null; this.connected = false; this.folderName = '';
    await IDB.del(HANDLE_KEY);
    this.setStatus('local', 'לא מחובר לתיקייה משותפת');
  },

  async attach({ fresh = false } = {}) {
    this.dataDir = await FS.dir(this.root, 'data');
    for (const d of ['backups', 'documents', 'reports']) await FS.dir(this.root, d);
    this.connected = true;
    const remote = await this.readRemote();
    if (remote) {
      if (fresh && this.baseRev === 0 && !isEmptyDB(this.db)) {
        // this computer has data that was never synced to this folder → merge it in
        const { merged } = mergeDB({}, this.db, remote.data);
        this.adoptRemote(remote);
        this.db = normalizeDB(merged);
        this.markDirty();
      } else await this.integrateRemote(remote);
    } else {
      const legacy = await FS.readText(this.dataDir, LEGACY_FILE);
      if (legacy && isEmptyDB(this.db)) {
        try {
          const doc = JSON.parse(legacy.text);
          this.db = normalizeDB(migrateLegacyState(doc.state || doc));
          addAudit(this.db, null, 'מעבר גרסה', 'הנתונים הועברו אוטומטית מהגרסה הקודמת (application-data.json נשמר ללא שינוי)');
          this.emit('migrated');
        } catch (e) { console.error('legacy migration failed', e); }
      }
      this.markDirty();
    }
    this.startTimers();
    await this.saveNow();
    this.setStatus('connected', '');
    this.emit('data', { source: 'attach' });
  },

  async readRemote() {
    const r = await FS.readText(this.dataDir, DB_FILE);
    if (!r) return null;
    this.remoteStat = { lastModified: r.lastModified, size: r.size };
    const doc = JSON.parse(r.text);
    if (doc.format !== DOC_FORMAT || !doc.data) throw new Error('קובץ הנתונים בתיקייה אינו תקין');
    if ((doc.schema || 0) > SCHEMA_VERSION) throw new Error('קובץ הנתונים נשמר בגרסה חדשה יותר של המערכת. יש לעדכן את קובץ המערכת במחשב זה.');
    return doc;
  },
  adoptRemote(remote) {
    this.base = U.clone(remote.data);
    this.baseRev = remote.revision;
    this.lastRemote = { revision: remote.revision, savedAt: remote.savedAt, savedByName: remote.savedByName };
    IDB.set('nm3.base', this.base);
  },
  async integrateRemote(remote) {
    if (remote.revision === this.baseRev && this.base) return false;
    if (!this.dirty) {
      this.db = normalizeDB(U.clone(remote.data));
      this.adoptRemote(remote);
      this.persistLocal();
    } else {
      const { merged, conflicts } = mergeDB(this.base || {}, this.db, remote.data);
      this.db = normalizeDB(merged);
      this.adoptRemote(remote);
      this.reportConflicts(conflicts);
      this.persistLocal();
    }
    this.lastSyncAt = U.nowISO();
    this.emit('data', { source: 'remote', by: remote.savedByName });
    return true;
  },
  reportConflicts(conflicts) {
    if (!conflicts.length) return;
    this.conflicts = conflicts.map((c) => ({ ...c, label: describeConflict(this.db, c), at: U.nowISO() }));
    addAudit(this.db, this.user, 'התנגשות עריכה', `${conflicts.length} שדות נערכו במקביל בשני מחשבים — נשמר הערך מהמחשב הנוכחי: ${this.conflicts.slice(0, 5).map((c) => c.label).join('; ')}`);
    this.emit('conflicts', this.conflicts);
  },

  // ── changes ──
  update(fn, audit) {
    fn(this.db);
    if (audit) addAudit(this.db, this.user, audit[0], audit[1] || '', audit[2] || '');
    this.markDirty();
    this.emit('data', { source: 'local' });
  },
  markDirty() { this.dirty = true; this.seq++; this.persistLocal(); this.scheduleSave(); this.emit('status'); },
  persistLocal: U.debounce(function () { IDB.set('nm3.local', { db: Store.db, dirty: Store.dirty, baseRev: Store.baseRev, savedAt: U.nowISO() }).catch(console.error); }, 250),
  scheduleSave: U.debounce(function () { Store.saveNow(); }, SAVE_DELAY_MS),

  async saveNow() {
    if (!this.connected) { this.persistLocal.flush(); return false; }
    if (this.saving) { this.saveAgain = true; return false; }
    if (!this.dirty) return true;
    this.saving = true;
    this.setStatus('saving', 'שומר…');
    let locked = false;
    try {
      locked = await this.acquireLock();
      if (!locked) { this.setStatus('waiting', 'ממתין למחשב אחר שמסיים לשמור…'); setTimeout(() => this.saveNow(), 1500); return false; }
      const seq0 = this.seq;
      const snapshot = U.clone(this.db);
      const remote = await this.readRemote();
      let toWrite = snapshot;
      if (remote && remote.revision !== this.baseRev) {
        const { merged, conflicts } = mergeDB(this.base || {}, snapshot, remote.data);
        toWrite = normalizeDB(merged);
        this.reportConflicts(conflicts);
      }
      await this.autoBackup(remote);
      const doc = {
        format: DOC_FORMAT, schema: SCHEMA_VERSION, appVersion: APP_VERSION,
        revision: (remote ? remote.revision : 0) + 1, savedAt: U.nowISO(), station: this.station,
        savedBy: this.user ? this.user.username : '', savedByName: this.user ? this.user.displayName : '', data: toWrite,
      };
      await FS.write(this.dataDir, DB_FILE, JSON.stringify(doc));
      this.remoteStat = await FS.stat(this.dataDir, DB_FILE);
      const remoteChanged = remote && remote.revision !== this.baseRev;
      this.adoptRemote(doc);
      if (this.seq === seq0) {
        this.db = remoteChanged ? normalizeDB(U.clone(toWrite)) : this.db;
        this.dirty = false;
      } else {
        // edits arrived while saving — rebase them on top of what was written
        this.db = normalizeDB(mergeDB(snapshot, this.db, toWrite).merged);
        this.saveAgain = true;
      }
      this.persistLocal();
      this.lastSyncAt = U.nowISO();
      this.setStatus('connected', '');
      if (remoteChanged) this.emit('data', { source: 'merge' });
      return true;
    } catch (e) {
      console.error(e);
      this.setStatus('error', e.name === 'NotAllowedError' ? 'אין הרשאת כתיבה לתיקייה' : e.name === 'NotFoundError' ? 'התיקייה המשותפת אינה זמינה (רשת?)' : `שגיאת שמירה: ${e.message}`);
      setTimeout(() => this.saveNow(), 8000);
      return false;
    } finally {
      if (locked) await FS.remove(this.dataDir, LOCK_FILE);
      this.saving = false;
      if (this.saveAgain) { this.saveAgain = false; setTimeout(() => this.saveNow(), 50); }
    }
  },

  async acquireLock() {
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      const cur = await FS.readText(this.dataDir, LOCK_FILE);
      let lock = null;
      try { lock = cur ? JSON.parse(cur.text) : null; } catch (e) { lock = null; }
      const stale = !lock || lock.station === this.station || Date.now() - (lock.at || 0) > LOCK_STALE_MS;
      if (stale) {
        const token = U.uid('lk');
        await FS.write(this.dataDir, LOCK_FILE, JSON.stringify({ station: this.station, user: this.user ? this.user.displayName : '', at: Date.now(), token }));
        await new Promise((r) => setTimeout(r, 120));
        const check = await FS.readText(this.dataDir, LOCK_FILE);
        try { if (check && JSON.parse(check.text).token === token) return true; } catch (e) { /* retry */ }
      }
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 300));
    }
    return false;
  },

  startTimers() {
    this.stopTimers();
    this.pollTimer = setInterval(() => this.poll(), POLL_MS);
    this.presenceTimer = setInterval(() => this.presence(), 30000);
    this.presence();
  },
  stopTimers() { clearInterval(this.pollTimer); clearInterval(this.presenceTimer); },
  async poll() {
    if (!this.connected || this.saving) return;
    try {
      const st = await FS.stat(this.dataDir, DB_FILE);
      if (this.status === 'error') this.setStatus('connected', '');
      if (!st || (this.remoteStat && st.lastModified === this.remoteStat.lastModified && st.size === this.remoteStat.size)) return;
      const remote = await this.readRemote();
      if (remote && remote.revision !== this.baseRev) {
        await this.integrateRemote(remote);
        if (this.dirty) this.scheduleSave();
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') { this.connected = false; this.setStatus('needs-permission', 'נדרש אישור גישה לתיקייה המשותפת'); this.stopTimers(); }
      else this.setStatus('error', 'התיקייה המשותפת אינה זמינה כרגע — השינויים נשמרים במחשב ויסונכרנו בהמשך');
    }
  },
  async presence(view = '') {
    if (!this.connected || !this.user) return;
    try {
      const dir = await FS.path(this.dataDir, ['presence']);
      await FS.write(dir, `${this.station}.json`, JSON.stringify({ user: this.user.username, name: this.user.displayName, at: Date.now(), view }));
      const now = Date.now(), online = [];
      for (const e of await FS.list(dir)) {
        if (e.kind !== 'file') continue;
        try {
          const p = JSON.parse(await (await e.handle.getFile()).text());
          if (now - p.at < 90000 && !e.name.startsWith(this.station)) online.push(p);
          else if (now - p.at > 86400000) await FS.remove(dir, e.name);
        } catch (err) { /* ignore */ }
      }
      this.online = online;
      this.emit('presence');
    } catch (e) { /* presence is best effort */ }
  },

  // ── backups ──
  async autoBackup(remote) {
    if (!remote) return;
    const day = U.todayISO();
    const name = `nursing-db_${day}_auto.json`;
    const dir = await FS.dir(this.root, 'backups');
    if (await FS.exists(dir, name)) return;
    await FS.write(dir, name, JSON.stringify(remote));
    // keep 60 automatic backups
    const autos = (await FS.list(dir)).filter((e) => /_auto\.json$/.test(e.name)).map((e) => e.name).sort();
    for (const old of autos.slice(0, Math.max(0, autos.length - 60))) await FS.remove(dir, old);
  },
  async backupNow(label = 'manual') {
    if (!this.connected) throw new Error('יש להתחבר לתיקייה המשותפת');
    await this.saveNow();
    const remote = await this.readRemote();
    const t = new Date();
    const name = `nursing-db_${U.isoOf(t)}_${U.pad2(t.getHours())}${U.pad2(t.getMinutes())}_${U.safeFileName(label)}.json`;
    await FS.write(await FS.dir(this.root, 'backups'), name, JSON.stringify(remote));
    return name;
  },
  async listBackups() {
    if (!this.connected) return [];
    const dir = await FS.dir(this.root, 'backups');
    const out = [];
    for (const e of await FS.list(dir)) {
      if (e.kind !== 'file' || !/\.json$/.test(e.name)) continue;
      const f = await e.handle.getFile();
      out.push({ name: e.name, size: f.size, modified: f.lastModified });
    }
    return out.sort((a, b) => b.modified - a.modified);
  },
  async readBackup(name) {
    const r = await FS.readText(await FS.dir(this.root, 'backups'), name);
    const doc = JSON.parse(r.text);
    if (doc.format === DOC_FORMAT) return normalizeDB(doc.data);
    if (doc.state || doc.employees) return normalizeDB(migrateLegacyState(doc.state || doc));
    throw new Error('קובץ גיבוי לא מוכר');
  },
  async restore(data, label) {
    await this.backupNow('לפני-שחזור');
    const remote = await this.readRemote();
    if (remote) this.adoptRemote(remote);
    this.db = normalizeDB(U.clone(data));
    addAudit(this.db, this.user, 'שחזור מגיבוי', label || '');
    this.markDirty();
    await this.saveNow();
    this.emit('data', { source: 'restore' });
  },

  // ── documents & reports ──
  async saveDocument(empId, file) {
    const dir = await FS.path(this.root, ['documents', empId]);
    const stored = `${Date.now().toString(36)}_${U.safeFileName(file.name)}`;
    await FS.write(dir, stored, file);
    return stored;
  },
  async openDocument(empId, stored) {
    const dir = await FS.path(this.root, ['documents', empId], false);
    return (await dir.getFileHandle(stored)).getFile();
  },
  async deleteDocument(empId, stored) {
    const dir = await FS.path(this.root, ['documents', empId], false);
    await FS.remove(dir, stored);
  },
  async saveReport(blob, fileName) {
    if (!this.connected) return null;
    const dir = await FS.path(this.root, ['reports', U.todayISO()]);
    await FS.write(dir, U.safeFileName(fileName), blob);
    return `reports/${U.todayISO()}/${U.safeFileName(fileName)}`;
  },
};

function isEmptyDB(db) {
  return !db || (!Object.keys(db.employees || {}).length && !Object.keys(db.users || {}).length && !Object.keys(db.depts || {}).length);
}
