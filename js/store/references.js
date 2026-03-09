/* =========================================================
   REFERENCE STORE
   ========================================================= */
const ReferenceStore = (function () {
    let refs = [];
    const KEY = 'ScholarRefs_v3';
    function genId() { return 'ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000); }
    function add(c) { c.id = genId(); refs.push(c); save(); return c.id; }
    function remove(id) { refs = refs.filter(r => r.id !== id); save(); }
    function getAll() { return refs; }
    function clear() { refs = []; save(); }
    function save() { localStorage.setItem(KEY, JSON.stringify(refs)); }
    function load() { try { const d = localStorage.getItem(KEY); if (d) refs = JSON.parse(d); } catch { } }
    load();
    return { add, remove, getAll, clear };
})();

// Saved Reference Library (persistent across sessions)
function getSavedRefList() { try { return JSON.parse(localStorage.getItem(LS_SAVED_REF_LIST) || '[]'); } catch { return []; } }
function saveRefList(list) { localStorage.setItem(LS_SAVED_REF_LIST, JSON.stringify(list)); }
function addToSavedList(data) {
    const list = getSavedRefList();
    if (!list.find(r => r.title === data.title && r.authors === data.authors)) {
        list.unshift({ ...data, savedAt: new Date().toISOString() });
        saveRefList(list);
    }
}
