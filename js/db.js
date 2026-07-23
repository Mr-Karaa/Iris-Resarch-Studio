/**
 * IRIS Research Studio v2.0 - Knowledge Data Layer (db.js)
 * Knowledge-centric data model with backward compatibility.
 */

const STORAGE_KEY_RECORDS     = 'iris_research_records';
const STORAGE_KEY_COLLECTIONS = 'iris_research_collections';
const STORAGE_KEY_SETTINGS    = 'iris_app_settings';

window.IRIS_DB = {

  /* ─── RECORDS ─── */

  getRecords(includeDeleted = false) {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECORDS, '[]');
      return [];
    }
    try {
      const list = JSON.parse(raw);
      return includeDeleted ? list : list.filter(r => !r.isDeleted);
    } catch { return []; }
  },

  saveRecord(record) {
    const records = this.getRecords(true);
    record.dateUpdated = new Date().toISOString();

    if (!record.id) {
      // New record
      record.id         = 'rec-' + Date.now();
      record.dateAdded  = new Date().toISOString().split('T')[0];
      record.versions   = [];
      record.relations  = record.relations || [];
      record.comments   = record.comments  || [];
      record.tasks      = record.tasks     || [];
      record.attachments = record.attachments || [];
      // Auto code
      const prefixMap = { patent:'PAT', article:'ART', standard:'STD', project:'PRJ', note:'NOT', other:'DOC' };
      const prefix = prefixMap[record.type] || 'DOC';
      const count  = records.filter(r => r.type === record.type).length + 1;
      record.code  = `IRIS-${prefix}-${String(count).padStart(3,'0')}`;
      // Canvas position (default)
      if (record.canvas_x === undefined) { record.canvas_x = 80 + Math.random() * 400; record.canvas_y = 80 + Math.random() * 300; }
      records.push(record);
    } else {
      const idx = records.findIndex(r => String(r.id) === String(record.id));
      if (idx !== -1) {
        const prev = records[idx];
        record.versions    = prev.versions    || [];
        record.relations   = record.relations  || prev.relations   || [];
        record.comments    = record.comments   || prev.comments    || [];
        record.tasks       = record.tasks      || prev.tasks       || [];
        record.attachments = record.attachments || prev.attachments || [];
        // Versioning on content change
        if (prev.analysisNotes !== record.analysisNotes && prev.analysisNotes) {
          record.versions.push({
            version: 'v' + (record.versions.length + 1),
            notes:   prev.analysisNotes,
            date:    new Date().toLocaleString('tr-TR')
          });
        }
        records[idx] = { ...records[idx], ...record };
      } else {
        record.versions   = [];
        record.relations  = [];
        record.comments   = [];
        record.tasks      = [];
        record.attachments = [];
        records.push(record);
      }
    }
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    return record;
  },

  deleteRecord(id) {
    const records = this.getRecords(true);
    const idx = records.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      records[idx].isDeleted = true;
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      return { success: true };
    }
    return { success: false, msg: 'Kayıt bulunamadı: ' + id };
  },

  deleteRecordPermanently(id) {
    const records = this.getRecords(true);
    const filtered = records.filter(r => String(r.id) !== String(id));
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(filtered));
    return { success: true };
  },

  restoreRecord(id) {
    const records = this.getRecords(true);
    const idx = records.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      records[idx].isDeleted = false;
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
      return { success: true };
    }
    return { success: false };
  },

  /* ─── COLLECTIONS ─── */

  getCollections() {
    const raw = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
    if (!raw) { localStorage.setItem(STORAGE_KEY_COLLECTIONS, '[]'); return []; }
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveCollection(col) {
    const cols = this.getCollections();
    if (!col.id) {
      col.id = 'col-' + Date.now();
      cols.push(col);
    } else {
      const idx = cols.findIndex(c => String(c.id) === String(col.id));
      if (idx !== -1) cols[idx] = { ...cols[idx], ...col };
      else cols.push(col);
    }
    localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(cols));
    return col;
  },

  deleteCollection(id) {
    const cols = this.getCollections();
    const filtered = cols.filter(c => String(c.id) !== String(id));
    localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(filtered));
    // Orphan records
    const records = this.getRecords(true).map(r =>
      String(r.collectionId) === String(id) ? { ...r, collectionId: '' } : r
    );
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    return { success: true };
  },

  /* ─── RELATIONS ─── */

  addRelation(sourceId, targetId) {
    const records = this.getRecords(true);
    const addTo = (id, otherId) => {
      const idx = records.findIndex(r => String(r.id) === String(id));
      if (idx !== -1) {
        if (!records[idx].relations) records[idx].relations = [];
        if (!records[idx].relations.some(rid => String(rid) === String(otherId))) {
          records[idx].relations.push(String(otherId));
        }
      }
    };
    addTo(sourceId, targetId);
    addTo(targetId, sourceId);
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  },

  removeRelation(sourceId, targetId) {
    const records = this.getRecords(true);
    const removeFrom = (id, otherId) => {
      const idx = records.findIndex(r => String(r.id) === String(id));
      if (idx !== -1 && records[idx].relations) {
        records[idx].relations = records[idx].relations.filter(rid => String(rid) !== String(otherId));
      }
    };
    removeFrom(sourceId, targetId);
    removeFrom(targetId, sourceId);
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  },

  /* ─── SETTINGS ─── */

  getSetting(key, def = null) {
    try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}'); return s[key] !== undefined ? s[key] : def; }
    catch { return def; }
  },

  setSetting(key, value) {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}');
      s[key] = value;
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(s));
    } catch {}
  },

  /* ─── IMPORT / EXPORT / RESET ─── */

  exportDatabase() {
    return JSON.stringify({
      collections: this.getCollections(),
      records:     this.getRecords(true),
      exportedAt:  new Date().toISOString(),
      version:     '2.0'
    }, null, 2);
  },

  importDatabase(json) {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data.collections) && Array.isArray(data.records)) {
        localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(data.collections));
        localStorage.setItem(STORAGE_KEY_RECORDS,     JSON.stringify(data.records));
        return { success: true, msg: `${data.records.length} kayıt ve ${data.collections.length} koleksiyon içe aktarıldı.` };
      }
      return { success: false, msg: 'Geçersiz veri formatı.' };
    } catch (e) {
      return { success: false, msg: e.message };
    }
  },

  resetDatabase() {
    localStorage.setItem(STORAGE_KEY_COLLECTIONS, '[]');
    localStorage.setItem(STORAGE_KEY_RECORDS, '[]');
  },

  /* ─── ANALYTICS ─── */

  getStats() {
    const records = this.getRecords();
    const types   = {};
    let totalWords = 0;
    records.forEach(r => {
      types[r.type] = (types[r.type] || 0) + 1;
      if (r.analysisNotes) totalWords += r.analysisNotes.split(/\s+/).filter(Boolean).length;
    });
    return {
      total:      records.length,
      favorites:  records.filter(r => r.isFavorite).length,
      completed:  records.filter(r => r.status === 'tamamlandi').length,
      totalWords,
      types
    };
  },

  getActivityMap() {
    const records = this.getRecords(true);
    const map = {};
    records.forEach(r => {
      const d = (r.dateAdded || '').split('T')[0];
      if (d) map[d] = (map[d] || 0) + 1;
      if (r.dateUpdated) {
        const u = r.dateUpdated.split('T')[0];
        map[u] = (map[u] || 0) + 1;
      }
    });
    return map;
  }
};
