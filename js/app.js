(function () {
'use strict';

/* =====================================================================
 * 상수와 스키마
 * ===================================================================== */
// 스키마 버전은 1을 유지한다. v1.1에서 추가한 rev·updatedBy·tombstones는 모두 선택 항목이라
// v1.0과 v1.1이 서로의 백업을 그대로 읽을 수 있다. 구조가 호환되지 않게 바뀔 때만 올린다.
const SCHEMA_VERSION = 1;
const APP_ID = 'creative-warehouse';
const APP_VERSION = '1.1.1';
const DB_NAME = 'creative_warehouse';
const LS_KEY = 'creative_warehouse_v1';
const BC_NAME = 'creative_warehouse_tabs';
const MOBILE_MQ = window.matchMedia('(max-width: 860px)');
function isMobile() { return MOBILE_MQ.matches; }

const TYPES = {
  inbox:    { label: '임시 메모',     desc: '떠오른 생각을 제목 없이 빠르게 적어 두는 곳', icon: 'inbox' },
  fragment: { label: '아이디어 파편', desc: '아직 하나의 작품이 되지 않은 아이디어 조각', icon: 'spark' },
  idea:     { label: '정식 소재',     desc: '주제·설정·줄거리까지 구체화한 창작 소재', icon: 'bulb' },
  project:  { label: '작품 프로젝트', desc: '본격적으로 창작하는 작품과 그 자료', icon: 'book' },
};
const TYPE_ORDER = ['inbox', 'fragment', 'idea', 'project'];
const STATUSES = [['drafting', '구상 중'], ['active', '진행 중'], ['hold', '보류'], ['done', '완료'], ['archived', '보관']];
const STATUS_LABEL = Object.fromEntries(STATUSES);

const FIELD_DEFS = {
  concept:         { label: '핵심 개념',        ph: '이 아이디어의 중심이 되는 개념을 한두 문장으로 적어 보세요.' },
  theme:           { label: '주제',             ph: '이 이야기를 통해 말하고 싶은 것' },
  setting:         { label: '주요 설정',        ph: '배경, 규칙, 인물 관계 등 핵심 설정' },
  synopsis:        { label: '예상 줄거리',      ph: '시작 – 전개 – 결말의 흐름' },
  differentiation: { label: '차별화 요소',      ph: '비슷한 작품과 무엇이 다른가' },
  overview:        { label: '작품 개요',        ph: '로그라인, 형식, 예상 분량, 대상 독자 등' },
  world:           { label: '세계관',           ph: '시대, 장소, 사회 구조, 고유한 규칙' },
  characters:      { label: '등장인물',         ph: '이름 / 역할 / 성격 / 목표 / 관계' },
  plot:            { label: '줄거리 및 플롯',   ph: '전체 줄거리와 주요 전환점' },
  episodes:        { label: '에피소드 구상',    ph: '1화: …\n2화: …' },
  scenes:          { label: '장면 및 대사 메모', ph: '떠오른 장면, 인상적인 대사 한 줄' },
  projectMemo:     { label: '기타 설정 및 메모', ph: '자료 조사, 일정, 그 밖의 메모' },
};
const TYPE_FIELDS = {
  inbox: [],
  fragment: ['concept'],
  idea: ['concept', 'theme', 'setting', 'synopsis', 'differentiation'],
  project: ['overview', 'world', 'characters', 'plot', 'episodes', 'scenes', 'projectMemo'],
};
const SUMMARY_LABEL = { inbox: '요약', fragment: '요약', idea: '한 줄 소개', project: '작품 소개' };
const TITLE_PH = { inbox: '제목 (비워 두어도 됩니다)', fragment: '아이디어 제목', idea: '소재 제목', project: '작품 제목' };
const BODY_LABEL = { inbox: '본문', fragment: '자유 메모', idea: '자유 메모', project: '자유 메모' };

const DEFAULT_SETTINGS = { viewMode: 'card', pinnedFirst: true, backupReminderDays: 7, theme: 'dark' };
const SORTS = [['updated_desc', '최근 수정순'], ['updated_asc', '오래된 수정순'], ['created_desc', '최근 생성순'], ['title_asc', '제목순']];

/* =====================================================================
 * 아이콘 (고정 문자열만 사용)
 * ===================================================================== */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  gear: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 7 4 3v2H6v-2l4-3z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  restore: '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
};
function icon(name) {
  const span = document.createElement('span');
  span.style.display = 'contents';
  span.innerHTML = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  return span.firstChild;
}

/* =====================================================================
 * DOM 도우미 — 사용자 입력은 항상 textContent / value 로만 넣는다
 * ===================================================================== */
function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  appendKids(el, children);
  return el;
}
function appendKids(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function btn(label, opts = {}) {
  const b = h('button', { type: 'button', class: 'btn ' + (opts.cls || ''), title: opts.title || label, 'aria-label': opts.iconOnly ? label : null, onClick: opts.onClick, disabled: opts.disabled });
  if (opts.icon) b.appendChild(icon(opts.icon));
  if (!opts.iconOnly) b.appendChild(h('span', { class: opts.hideLabelSm ? 'btn-label' : '' }, label));
  return b;
}
function typeBadge(type) {
  return h('span', { class: 'badge type-' + type }, h('span', { class: 'tdot' }), TYPES[type].label);
}
function statusBadge(status) {
  return h('span', { class: 'badge status st-' + status }, STATUS_LABEL[status]);
}
function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = (el.scrollHeight + 2) + 'px';
}
function isTypingTarget(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}
function isComposing(e) { return e.isComposing || e.keyCode === 229; }

/* =====================================================================
 * 날짜·문자열
 * ===================================================================== */
const fmtFull = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
const fmtDate = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
const fmtMD = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });
function nowISO() { return new Date().toISOString(); }
function fullDate(iso) { return iso ? fmtFull.format(new Date(iso)) : '—'; }
function relDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso), now = new Date();
  const diff = now - d;
  if (diff >= 0 && diff < 60e3) return '방금 전';
  if (diff >= 0 && diff < 3600e3) return Math.floor(diff / 60e3) + '분 전';
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return '오늘 ' + fmtTime.format(d);
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return '어제 ' + fmtTime.format(d);
  if (d.getFullYear() === now.getFullYear()) return fmtMD.format(d);
  return fmtDate.format(d);
}
function josa(word, withFinal, withoutFinal) {
  const ch = String(word || '').trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const jong = (code - 0xAC00) % 28;
    if (withFinal === '으로') return (jong === 0 || jong === 8) ? withoutFinal : withFinal;
    return jong ? withFinal : withoutFinal;
  }
  return withFinal === '으로' ? '(으)로' : withFinal + '(' + withoutFinal + ')';
}
function newId() {
  const a = new Uint8Array(8);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return 'r_' + Date.now().toString(36) + '_' + Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function cut(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; }

/* =====================================================================
 * 기록 모델
 * ===================================================================== */
function blankRecord(type) {
  const t = nowISO();
  return {
    id: newId(), type, title: '', summary: '', body: '', genres: [], tags: [],
    status: 'drafting', favorite: false, pinned: false, createdAt: t, updatedAt: t,
    links: [], projectId: null, fields: {}, deleted: false, deletedAt: null,
    rev: 0, updatedBy: meta.deviceId || null,
  };
}
function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!id || id.length > 200) return null;
  if (!TYPES[raw.type]) return null;
  const str = v => typeof v === 'string' ? v : '';
  const arr = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean))] : [];
  const date = v => (typeof v === 'string' && !isNaN(Date.parse(v))) ? new Date(v).toISOString() : null;
  const fields = {};
  if (raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)) {
    for (const [k, v] of Object.entries(raw.fields)) if (typeof v === 'string') fields[k] = v;
  }
  const now = nowISO();
  const created = date(raw.createdAt) || date(raw.updatedAt) || now;
  return {
    id, type: raw.type,
    title: str(raw.title), summary: str(raw.summary), body: str(raw.body),
    genres: arr(raw.genres), tags: arr(raw.tags),
    status: STATUS_LABEL[raw.status] ? raw.status : 'drafting',
    favorite: !!raw.favorite, pinned: !!raw.pinned,
    createdAt: created, updatedAt: date(raw.updatedAt) || created,
    links: arr(raw.links).filter(x => x !== id),
    projectId: (typeof raw.projectId === 'string' && raw.projectId && raw.projectId !== id) ? raw.projectId : null,
    fields,
    deleted: !!raw.deleted, deletedAt: raw.deleted ? (date(raw.deletedAt) || now) : null,
    // v1.1 선택 항목: 저장 횟수(충돌 감지용)와 마지막으로 저장한 기기
    rev: (Number.isInteger(raw.rev) && raw.rev >= 0) ? raw.rev : 1,
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy.slice(0, 80) : null,
  };
}
function isEmptyRecord(r) {
  return !r.title.trim() && !r.summary.trim() && !r.body.trim() && !r.genres.length && !r.tags.length &&
    !Object.values(r.fields).some(v => v && v.trim()) && !r.links.length && !r.projectId;
}
function derivedTitle(r) {
  const src = (r.body || r.summary || '').trim();
  if (!src) return '';
  const line = src.split('\n').find(l => l.trim()) || '';
  return cut(line, 40);
}
function displayTitle(r) {
  return r.title.trim() || derivedTitle(r) || (r.type === 'inbox' ? '제목 없는 메모' : '제목 없음');
}
function summaryText(r) {
  if (r.summary.trim()) return r.summary.trim();
  let body = r.body.trim();
  if (!r.title.trim() && body) {  // 첫 줄을 제목으로 쓰고 있으면 나머지를 요약으로
    const lines = body.split('\n');
    const i = lines.findIndex(l => l.trim());
    body = lines.slice(i + 1).join('\n').trim();
  }
  if (body) return cut(body, 160);
  for (const k of (TYPE_FIELDS[r.type] || [])) if (r.fields[k] && r.fields[k].trim()) return cut(r.fields[k], 160);
  return '';
}
function searchHaystack(r) {
  return [r.title, r.summary, r.body, ...Object.values(r.fields), r.genres.join(' '), r.tags.join(' ')].join('\n').toLowerCase();
}
function tokenize(q) {
  return q.toLowerCase().split(/\s+/).map(t => t.replace(/^#/, '')).filter(Boolean);
}
function matchesTokens(r, tokens) {
  if (!tokens.length) return true;
  const hay = searchHaystack(r);
  return tokens.every(t => hay.includes(t));
}
function searchSnippet(r, tokens) {
  const parts = [r.body, ...Object.values(r.fields)];
  for (const p of parts) {
    if (!p) continue;
    const low = p.toLowerCase();
    for (const t of tokens) {
      const i = low.indexOf(t);
      if (i >= 0) {
        const s = Math.max(0, i - 30);
        return (s > 0 ? '…' : '') + cut(p.slice(s), 150);
      }
    }
  }
  return null;
}

/* =====================================================================
 * 저장소 어댑터: IndexedDB → localStorage → 메모리(저장 불가)
 * ===================================================================== */
function reqP(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}
function txDone(tx) {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error || new Error('트랜잭션 오류'));
    tx.onabort = () => rej(tx.error || new Error('트랜잭션이 중단되었습니다'));
  });
}
function openIdb() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      if (!window.indexedDB) return reject(new Error('IndexedDB를 지원하지 않는 환경입니다'));
      req = indexedDB.open(DB_NAME, 1);
    } catch (e) { return reject(e); }
    const timer = setTimeout(() => reject(new Error('IndexedDB 응답 시간 초과')), 5000);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    req.onerror = () => { clearTimeout(timer); reject(req.error || new Error('IndexedDB 열기 실패')); };
    req.onblocked = () => { clearTimeout(timer); reject(new Error('다른 탭이 데이터베이스를 사용 중입니다')); };
    req.onsuccess = () => {
      clearTimeout(timer);
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve({
        kind: 'indexeddb', label: 'IndexedDB', persistent: true,
        async loadAll() {
          const tx = db.transaction(['records', 'meta'], 'readonly');
          const [records, metaRow] = await Promise.all([reqP(tx.objectStore('records').getAll()), reqP(tx.objectStore('meta').get('app'))]);
          return { records, meta: metaRow ? metaRow.value : null };
        },
        async getRecords(ids) {
          const tx = db.transaction('records', 'readonly');
          const s = tx.objectStore('records');
          return Promise.all(ids.map(id => reqP(s.get(id))));
        },
        // bases: id → 이 탭이 마지막으로 알고 있던 rev. 저장소의 rev가 그보다 크면
        // 다른 탭이 먼저 저장한 것이므로 덮어쓰지 않고 충돌로 돌려준다.
        async putRecords(list, bases) {
          const tx = db.transaction('records', 'readwrite');
          const done = txDone(tx);
          done.catch(() => {});   // 실패는 아래 Promise.all 또는 await done에서 처리
          const s = tx.objectStore('records');
          const conflicts = [];
          await Promise.all(list.map(r => new Promise((res, rej) => {
            const g = s.get(r.id);
            g.onerror = () => rej(g.error);
            g.onsuccess = () => {
              const cur = g.result;
              const base = bases ? bases.get(r.id) : undefined;
              if (cur && base != null && (cur.rev || 1) > base) conflicts.push({ local: r, stored: cur });
              else s.put(r);
              res();
            };
          })));
          await done;
          return conflicts;
        },
        async deleteRecords(ids) {
          const tx = db.transaction('records', 'readwrite');
          const s = tx.objectStore('records');
          ids.forEach(id => s.delete(id));
          await txDone(tx);
        },
        async putMeta(m) {
          const tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').put({ key: 'app', value: m });
          await txDone(tx);
        },
        async replaceAll(records, m) {   // 하나의 트랜잭션: 실패하면 전부 취소되어 기존 데이터 유지
          const tx = db.transaction(['records', 'meta'], 'readwrite');
          const s = tx.objectStore('records');
          s.clear();
          records.forEach(r => s.put(r));
          tx.objectStore('meta').put({ key: 'app', value: m });
          await txDone(tx);
        },
      });
    };
  });
}
function readLocalStorageData() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || typeof data.records !== 'object') throw new Error('localStorage 데이터 형식 오류');
  return data;
}
function makeLocalStorageAdapter() {
  const probe = '__cw_probe__';
  localStorage.setItem(probe, '1');
  localStorage.removeItem(probe);
  let cache = { records: {}, meta: null };
  try {
    const d = readLocalStorageData();
    if (d) cache = { records: d.records || {}, meta: d.meta || null };
  } catch (e) {
    // 손상된 데이터를 덮어쓰지 않도록 별도 키로 옮겨 둔다
    try { localStorage.setItem(LS_KEY + '_corrupt_' + Date.now(), localStorage.getItem(LS_KEY)); } catch (_) {}
    storageNotes.push({ kind: 'warn', text: 'localStorage에 저장된 데이터를 읽을 수 없어 별도 키로 보관했습니다.' });
  }
  function write(next) {
    localStorage.setItem(LS_KEY, JSON.stringify(next));   // 실패 시 예외 → cache 유지
    cache = next;
  }
  function fresh() {   // 다른 탭이 바꿨을 수 있으므로 쓰기 전에 다시 읽는다
    try { const d = readLocalStorageData(); if (d) cache = { records: d.records || {}, meta: d.meta || null }; } catch (_) {}
  }
  return {
    kind: 'localstorage', label: 'localStorage', persistent: true,
    async loadAll() { return { records: Object.values(cache.records), meta: cache.meta }; },
    async getRecords(ids) { fresh(); return ids.map(id => cache.records[id]); },
    async putRecords(list, bases) {
      fresh();
      const next = { records: { ...cache.records }, meta: cache.meta };
      const conflicts = [];
      list.forEach(r => {
        const cur = cache.records[r.id];
        const base = bases ? bases.get(r.id) : undefined;
        if (cur && base != null && (cur.rev || 1) > base) conflicts.push({ local: r, stored: cur });
        else next.records[r.id] = r;
      });
      write(next);
      return conflicts;
    },
    async deleteRecords(ids) { const next = { records: { ...cache.records }, meta: cache.meta }; ids.forEach(id => delete next.records[id]); write(next); },
    async putMeta(m) { write({ records: cache.records, meta: m }); },
    async replaceAll(records, m) { const map = {}; records.forEach(r => { map[r.id] = r; }); write({ records: map, meta: m }); },
  };
}
function makeMemoryAdapter() {
  return {
    kind: 'memory', label: '저장소 없음(메모리)', persistent: false,
    async loadAll() { return { records: [], meta: null }; },
    async getRecords(ids) { return ids.map(() => undefined); },
    async putRecords() { return []; }, async deleteRecords() {}, async putMeta() {}, async replaceAll() {},
  };
}

/* =====================================================================
 * 앱 상태
 * ===================================================================== */
const storageNotes = [];
let adapter = null;
const store = new Map();          // id → 기록
const draftIds = new Set();       // 아직 내용이 없어 저장하지 않은 새 기록
// deviceId·tombstones는 향후 기기 간 동기화를 위한 준비 항목이다(현재는 기기 밖으로 보내지 않는다).
let meta = { schemaVersion: SCHEMA_VERSION, settings: { ...DEFAULT_SETTINGS }, lastBackupAt: null, createdAt: nowISO(), deviceId: null, tombstones: [], recentIds: [] };
const baseRev = new Map();        // id → 이 탭이 마지막으로 저장/불러온 rev
const TAB_ID = Math.random().toString(36).slice(2);
const ui = {
  view: 'dashboard', editId: null, prevView: 'dashboard', query: '',
  filters: { type: 'all', status: 'all', genre: 'all', favOnly: false }, sort: 'updated_desc',
};

/* ---------- 저장 큐 ---------- */
const dirty = new Set();
const pendingDeletes = new Set();
let metaDirty = false;
let saveTimer = null;
let saveChain = Promise.resolve(true);
let saveState = 'saved';
let saveError = null;
let lastSavedAt = null;
const saveListeners = new Set();

function markDirty(id, delay) {
  if (id) dirty.add(id);
  setSaveState('pending');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, delay == null ? 700 : delay);
}
function touch(r) { r.updatedAt = nowISO(); markDirty(r.id); }
function saveMeta() { metaDirty = true; return flush(); }
function flush() {
  clearTimeout(saveTimer);
  saveChain = saveChain.then(doFlush, doFlush);
  return saveChain;
}
async function doFlush() {
  if (staleTab) {   // 다른 탭의 전체 교체 이후에는 낡은 데이터로 덮어쓰지 않는다
    if (dirty.size || pendingDeletes.size || metaDirty) {
      saveError = new Error('다른 탭에서 데이터가 교체되어 이 탭의 저장을 멈췄습니다');
      setSaveState('error');
      return false;
    }
    return true;
  }
  const toSave = [], ids = [];
  for (const id of [...dirty]) {
    const r = store.get(id);
    dirty.delete(id);
    if (!r) continue;
    if (draftIds.has(id)) {
      if (isEmptyRecord(r)) continue;   // 빈 새 기록은 저장하지 않음
      draftIds.delete(id);
    }
    const base = baseRev.has(id) ? baseRev.get(id) : null;
    const c = clone(r);
    c.rev = (base == null ? (r.rev || 0) : base) + 1;
    c.updatedBy = meta.deviceId;
    toSave.push(c); ids.push(id);
  }
  const dels = [...pendingDeletes]; pendingDeletes.clear();
  const doMeta = metaDirty; metaDirty = false;
  if (!toSave.length && !dels.length && !doMeta) { setSaveState('saved'); return true; }
  setSaveState('saving');
  try {
    let conflicts = [];
    if (toSave.length) conflicts = (await adapter.putRecords(toSave, baseRev)) || [];
    if (dels.length) await adapter.deleteRecords(dels);
    if (doMeta) await adapter.putMeta(clone(meta));
    const conflictIds = new Set(conflicts.map(c => c.local.id));
    toSave.forEach(c => {
      if (conflictIds.has(c.id)) return;
      baseRev.set(c.id, c.rev);
      const live = store.get(c.id);
      if (live) { live.rev = c.rev; live.updatedBy = c.updatedBy; }
    });
    tabs.announce(toSave.filter(c => !conflictIds.has(c.id)).map(c => c.id), dels);
    if (conflicts.length) await resolveConflicts(conflicts);
    lastSavedAt = new Date();
    saveError = null;
    if (dirty.size || pendingDeletes.size || metaDirty) { setSaveState('pending'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 500); }
    else setSaveState('saved');
    return true;
  } catch (e) {
    console.error('저장 실패', e);
    ids.forEach(id => dirty.add(id));
    dels.forEach(id => pendingDeletes.add(id));
    if (doMeta) metaDirty = true;
    saveError = e;
    setSaveState('error');
    return false;
  }
}
function hasUnsaved() { return dirty.size > 0 || pendingDeletes.size > 0 || metaDirty || saveState === 'saving'; }
function errorText(e) {
  if (!e) return '알 수 없는 오류';
  const name = e.name || '';
  if (name === 'QuotaExceededError' || /quota/i.test(e.message || '')) return '브라우저 저장 공간이 부족합니다';
  return e.message || name || String(e);
}
function setSaveState(s) {
  saveState = s;
  const ind = $('#save-ind');
  if (ind) {
    let cls = s, txt;
    if (adapter && adapter.kind === 'memory') { cls = 'memory'; txt = '저장소 없음 — 임시 보관 중'; }
    else txt = { saved: '저장됨', pending: '변경 사항 있음', saving: '저장 중…', error: '저장 실패' }[s];
    ind.className = 'save-ind ' + cls;
    ind.querySelector('.txt').textContent = txt;
    ind.title = s === 'error' ? '저장 실패: ' + errorText(saveError) : (lastSavedAt ? '마지막 저장: ' + fmtTime.format(lastSavedAt) : '');
  }
  renderBanners();
  saveListeners.forEach(fn => { try { fn(s); } catch (_) {} });
}

/* =====================================================================
 * 여러 탭 보호: 변경 알림 · 충돌 사본
 * ===================================================================== */
let staleTab = false;            // 다른 탭이 전체 교체를 해서 이 탭의 데이터가 낡은 상태
let tabBannerDismissed = false;
const tabs = (() => {
  let bc = null;
  const others = new Set();
  try { if ('BroadcastChannel' in window) bc = new BroadcastChannel(BC_NAME); } catch (_) {}
  const post = msg => { if (bc) { try { bc.postMessage(Object.assign({ tab: TAB_ID }, msg)); } catch (_) {} } };
  return {
    others,
    supported: !!bc,
    start() { if (!bc) return; bc.onmessage = e => { onTabMessage(e.data).catch(err => console.warn('탭 메시지 처리 실패', err)); }; post({ type: 'hello' }); },
    announce(ids, dels) { if ((ids && ids.length) || (dels && dels.length)) post({ type: 'changed', ids: ids || [], dels: dels || [] }); },
    post,
  };
})();
async function onTabMessage(m) {
  if (!m || m.tab === TAB_ID) return;
  if (m.type === 'bye') { tabs.others.delete(m.tab); renderBanners(); return; }
  const isNew = !tabs.others.has(m.tab);
  tabs.others.add(m.tab);
  if (m.type === 'hello') tabs.post({ type: 'here' });
  if (isNew) renderBanners();
  if (m.type === 'replaced') { markStale(); return; }
  if (m.type !== 'changed' || staleTab) return;
  let editorTouched = false, leftEditor = false;
  const ids = (m.ids || []).filter(id => !dirty.has(id));
  if (ids.length) {
    const recs = await adapter.getRecords(ids);
    recs.forEach(raw => {
      const r = raw && normalizeRecord(raw);
      if (!r || dirty.has(r.id)) return;
      if (baseRev.has(r.id) && baseRev.get(r.id) >= r.rev) return;
      store.set(r.id, r); baseRev.set(r.id, r.rev); draftIds.delete(r.id);
      if (r.id === ui.editId) editorTouched = true;
    });
  }
  (m.dels || []).forEach(id => {
    if (dirty.has(id) || !store.has(id)) return;
    store.delete(id); baseRev.delete(id);
    if (id === ui.editId) leftEditor = true;
  });
  if (leftEditor) { ui.editId = null; toast('다른 탭에서 이 기록을 영구 삭제했습니다.', { kind: 'warn' }); navigate('dashboard', { replace: true }); }
  else if (editorTouched) { rerenderEditor(); toast('다른 탭에서 저장한 최신 내용으로 이 기록을 다시 불러왔습니다.'); }
  else refresh();
}
function markStale() {
  if (staleTab) return;
  staleTab = true;
  clearTimeout(saveTimer);
  openModal({
    title: '다른 탭에서 데이터가 교체되었습니다',
    content: h('div', null,
      h('p', null, '다른 탭(또는 창)에서 백업 파일로 전체 데이터를 바꿨습니다. 이 탭에 보이는 내용은 이제 오래된 상태이므로, 덮어쓰지 않도록 이 탭의 저장을 멈췄습니다.'),
      hasUnsaved() ? h('p', null, '이 탭에 아직 저장하지 않은 변경 사항이 있습니다. 필요하면 먼저 JSON으로 내보내 두세요.') : null),
    actions: [
      { label: '이 탭 내용 JSON 내보내기', onClick: () => exportBackup({ prefix: '소재창고_이전탭내용' }) },
      { label: '새로고침', cls: 'primary', onClick: () => { allowUnload = true; location.reload(); } },
    ],
  });
  renderBanners();
}
function sameContent(a, b) {
  const pick = r => JSON.stringify([r.type, r.title, r.summary, r.body, r.genres, r.tags, r.status, r.fields, r.links, r.projectId, r.deleted]);
  return pick(a) === pick(b);
}
async function resolveConflicts(conflicts) {
  const copies = [];
  for (const { local, stored } of conflicts) {
    const s = normalizeRecord(stored);
    if (!s) continue;
    store.set(s.id, s); baseRev.set(s.id, s.rev);        // 저장소(먼저 저장된 쪽) 내용을 이 탭에 반영
    if (sameContent(s, local)) continue;
    const copy = clone(local);                            // 이 탭의 내용은 사본으로 보존
    copy.id = newId();
    copy.title = displayTitle(local) + ' (충돌 사본)';
    copy.createdAt = copy.updatedAt = nowISO();
    copy.rev = 1; copy.updatedBy = meta.deviceId;
    store.set(copy.id, copy);
    copies.push(copy);
  }
  if (copies.length) {
    await adapter.putRecords(copies.map(clone));
    copies.forEach(c => baseRev.set(c.id, 1));
    tabs.announce(copies.map(c => c.id), []);
  }
  if (ui.view === 'editor' && conflicts.some(c => c.local.id === ui.editId)) rerenderEditor(); else refresh();
  if (copies.length) {
    openModal({
      title: '동시에 수정된 기록이 있습니다',
      content: h('div', null,
        h('p', null, `다른 탭(또는 창)에서 같은 기록을 먼저 저장했습니다. 그쪽 내용을 원래 기록에 두고, 이 탭에서 쓴 내용은 '충돌 사본' ${copies.length}개로 따로 저장했습니다. 어느 쪽도 지워지지 않았습니다.`),
        h('div', { class: 'link-list' }, copies.map(c => linkRow(c, {})))),
      actions: [{ label: '확인', cls: 'primary', onClick: mm => mm.close() }],
    });
  }
}

/* =====================================================================
 * 조회 도우미
 * ===================================================================== */
const $ = sel => document.querySelector(sel);
function allRecords() { return [...store.values()].filter(r => !draftIds.has(r.id)); }
function activeRecords() { return allRecords().filter(r => !r.deleted); }
function membersOf(pid) { return activeRecords().filter(r => r.projectId === pid && r.id !== pid); }
function projects() { return activeRecords().filter(r => r.type === 'project'); }
function reverseLinks(id) { return allRecords().filter(r => r.id !== id && r.links.includes(id)); }
function allGenres() { const s = new Set(); activeRecords().forEach(r => r.genres.forEach(g => s.add(g))); return [...s].sort((a, b) => a.localeCompare(b, 'ko')); }
function allTags() { const s = new Set(); activeRecords().forEach(r => r.tags.forEach(g => s.add(g))); return [...s].sort((a, b) => a.localeCompare(b, 'ko')); }
function sortRecords(list, sort, pinnedFirst) {
  const cmp = {
    updated_desc: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    updated_asc: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
    created_desc: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title_asc: (a, b) => displayTitle(a).localeCompare(displayTitle(b), 'ko'),
  }[sort] || ((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return list.sort((a, b) => (pinnedFirst && a.pinned !== b.pinned) ? (a.pinned ? -1 : 1) : cmp(a, b));
}

/* =====================================================================
 * 토스트·모달
 * ===================================================================== */
function toast(msg, opts = {}) {
  const t = h('div', { class: 'toast ' + (opts.kind || ''), role: opts.kind === 'error' ? 'alert' : 'status' }, h('span', null, msg));
  let timer;
  const close = () => { clearTimeout(timer); t.remove(); };
  if (opts.action) t.appendChild(h('button', { type: 'button', onClick: () => { close(); opts.action.fn(); } }, opts.action.label));
  t.appendChild(h('button', { type: 'button', title: '알림 닫기', 'aria-label': '알림 닫기', onClick: close }, '✕'));
  $('#toasts').appendChild(t);
  timer = setTimeout(close, opts.duration || (opts.kind === 'error' ? 8000 : 3600));
}

const modalStack = [];
function openModal({ title, content, actions = [], wide = false, sheet = false, onEsc, onClose }) {
  const prevFocus = document.activeElement;
  const backdrop = h('div', { class: 'modal-backdrop' + (sheet ? ' is-sheet' : '') });
  const box = h('div', { class: 'modal' + (wide ? ' wide' : '') + (sheet ? ' sheet' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  let closed = false;
  const m = {
    box,
    close(result) {
      if (closed) return; closed = true;
      backdrop.remove();
      const i = modalStack.indexOf(m); if (i >= 0) modalStack.splice(i, 1);
      if (m.histPushed) { m.histPushed = false; histQueue(() => (history.state && history.state.modal) ? histBack() : null); }
      if (!modalStack.length) document.body.classList.remove('modal-open');
      if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
      if (onClose) onClose(result);
    },
    esc() { if (onEsc) onEsc(m); else m.close(false); },
    buttons: {},
  };
  const head = h('div', { class: 'modal-head' }, h('h2', null, title),
    btn('닫기', { icon: 'x', iconOnly: true, cls: 'ghost sm icon', onClick: () => m.esc() }));
  const body = h('div', { class: 'modal-body' }, content);
  box.append(head, body);
  if (actions.length) {
    const foot = h('div', { class: 'modal-foot' });
    actions.forEach(a => {
      const b = btn(a.label, { cls: a.cls || '', disabled: a.disabled, onClick: () => a.onClick(m) });
      if (a.id) m.buttons[a.id] = b;
      foot.appendChild(b);
    });
    box.appendChild(foot);
  }
  backdrop.appendChild(box);
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) m.esc(); });
  syncViewport();
  document.body.appendChild(backdrop);
  modalStack.push(m);
  document.body.classList.add('modal-open');
  // Android 뒤로 가기로 창을 닫을 수 있도록 기록 한 칸을 넣는다(주소는 그대로)
  histQueue(() => { if (!closed) { try { history.pushState({ cw: 1, modal: true, idx: hist.idx }, ''); m.histPushed = true; } catch (_) {} } });
  setTimeout(() => {
    const f = box.querySelector('[autofocus]') || box.querySelector('textarea, input:not([type=radio]):not([type=checkbox])') || box.querySelector('.modal-foot .primary');
    if (f) f.focus();
  }, 20);
  return m;
}
function confirmDialog({ title = '확인', message, confirmLabel = '확인', cancelLabel = '취소', danger = false, extra }) {
  return new Promise(resolve => {
    const content = h('div', null, Array.isArray(message) ? message.map(p => h('p', null, p)) : h('p', null, message), extra || null);
    openModal({
      title, content,
      onClose: r => resolve(!!r),
      actions: [
        { label: cancelLabel, cls: 'ghost', onClick: m => m.close(false) },
        { label: confirmLabel, cls: danger ? 'danger solid' : 'primary', onClick: m => m.close(true) },
      ],
    });
  });
}

/* =====================================================================
 * 기록 조작
 * ===================================================================== */
function createRecord(type, init = {}) {
  const r = Object.assign(blankRecord(type), init);
  store.set(r.id, r);
  return r;
}
async function createQuickMemo(title, body) {
  title = (title || '').trim();
  body = (body || '').replace(/\s+$/, '');
  if (!title && !body.trim()) return { ok: false, empty: true };
  const r = createRecord('inbox', { title, body });
  markDirty(r.id, 0);
  const ok = await flush();
  updateCounts();
  if (ui.view !== 'editor') refresh();
  if (!ok) toast('메모를 임시 메모 목록에 추가했지만 저장소에 기록하지 못했습니다: ' + errorText(saveError) + '. 상단 안내에서 다시 시도하거나 JSON으로 내보내 주세요.', { kind: 'error' });
  else if (adapter.kind === 'memory') toast('메모를 추가했습니다. 단, 저장소를 쓸 수 없어 새로고침하면 사라집니다.', { kind: 'warn' });
  else toast('임시 메모에 저장했습니다.', { kind: 'ok', action: { label: '열기', fn: () => navigate('editor', { id: r.id }) } });
  return { ok, record: r };
}
function setFavorite(r, on) { r.favorite = on; markDirty(r.id); updateCounts(); }
function setPinned(r, on) { r.pinned = on; markDirty(r.id); }

async function trashRecord(r) {
  let alsoMembers = false;
  const members = r.type === 'project' ? membersOf(r.id) : [];
  const extra = members.length ? h('div', { class: 'note-box' },
    h('p', { style: { margin: '0 0 6px' } }, `이 프로젝트에는 소속 기록 ${members.length}개가 있습니다. 소속 기록은 기본적으로 삭제되지 않고 그대로 남습니다.`),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'also-members', onChange: e => { alsoMembers = e.target.checked; } }), '소속 기록도 함께 휴지통으로 이동')) : null;
  const ok = await confirmDialog({
    title: '휴지통으로 이동',
    message: `'${displayTitle(r)}'${josa(displayTitle(r), '을', '를')} 휴지통으로 이동할까요? 휴지통에서 언제든 복원할 수 있습니다.`,
    confirmLabel: '휴지통으로 이동', danger: true, extra,
  });
  if (!ok) return false;
  const moved = [r, ...(alsoMembers ? members : [])];
  const t = nowISO();
  moved.forEach(x => { x.deleted = true; x.deletedAt = t; x.updatedAt = t; markDirty(x.id); });
  if (ui.view === 'editor' && moved.some(x => x.id === ui.editId)) {
    ui.editId = null;
    await navigate(ui.prevView && ui.prevView !== 'editor' ? ui.prevView : 'dashboard');
  } else refresh();
  updateCounts();
  toast(moved.length > 1 ? `${moved.length}개 기록을 휴지통으로 옮겼습니다.` : '휴지통으로 옮겼습니다.', {
    action: { label: '실행 취소', fn: () => { moved.forEach(x => restoreRecord(x, true)); refresh(); updateCounts(); } },
  });
  return true;
}
function restoreRecord(r, silent) {
  r.deleted = false; r.deletedAt = null; touch(r);
  if (!silent) toast(`'${cut(displayTitle(r), 30)}'${josa(displayTitle(r), '을', '를')} 복원했습니다.`, { kind: 'ok' });
}
async function purgeRecords(ids) {
  const set = new Set(ids);
  ids.forEach(id => { store.delete(id); draftIds.delete(id); dirty.delete(id); baseRev.delete(id); pendingDeletes.add(id); });
  // 동기화 준비: 영구 삭제된 ID와 시각만 남긴다(내용은 남기지 않음)
  const at = nowISO();
  meta.tombstones = (meta.tombstones || []).filter(t => !set.has(t.id)).concat(ids.map(id => ({ id, at }))).slice(-2000);
  metaDirty = true;
  // 영구 삭제된 기록을 가리키던 연결·소속 정보 정리
  for (const r of store.values()) {
    let changed = false;
    if (r.links.some(l => set.has(l))) { r.links = r.links.filter(l => !set.has(l)); changed = true; }
    if (r.projectId && set.has(r.projectId)) { r.projectId = null; changed = true; }
    if (changed) dirty.add(r.id);
  }
  const ok = await flush();
  updateCounts();
  return ok;
}
function linkRecords(a, b) {
  if (a.id === b.id) return '자기 자신과는 연결할 수 없습니다.';
  if (a.links.includes(b.id)) return '이미 연결된 기록입니다.';
  if (b.links.includes(a.id)) return '상대 기록에서 이미 이 기록을 연결해 두었습니다(역방향 연결).';
  a.links.push(b.id); touch(a);
  return null;
}
function unlinkRecords(from, toId) {
  from.links = from.links.filter(x => x !== toId); touch(from);
}
async function changeType(r, newType) {
  if (newType === r.type || !TYPES[newType]) return false;
  if (r.type === 'project') {
    const n = membersOf(r.id).length;
    if (n) {
      const ok = await confirmDialog({
        title: '종류 변경',
        message: `이 프로젝트에는 소속 기록 ${n}개가 있습니다. 종류를 바꿔도 소속 정보는 삭제되지 않으며, 다시 작품 프로젝트로 바꾸면 소속 목록이 그대로 나타납니다. 계속할까요?`,
        confirmLabel: '종류 변경',
      });
      if (!ok) return false;
    }
  }
  r.type = newType; touch(r);
  const label = TYPES[newType].label;
  toast(`'${label}'${josa(label, '으로', '로')} 변경했습니다. 기존 내용과 연결 정보는 모두 보존됩니다.`, { kind: 'ok' });
  return true;
}

/* =====================================================================
 * 내비게이션
 * ===================================================================== */
async function leaveEditor() {
  const id = ui.editId;
  const r = id && store.get(id);
  if (r && draftIds.has(id) && isEmptyRecord(r)) {   // 아무것도 쓰지 않은 새 기록은 버린다
    store.delete(id); draftIds.delete(id); dirty.delete(id);
  }
  if (!hasUnsaved()) return true;
  let ok = await flush();
  if (ok) return true;
  return new Promise(resolve => {
    openModal({
      title: '저장에 실패했습니다',
      content: h('div', null,
        h('p', null, '편집한 내용을 브라우저 저장소에 기록하지 못했습니다: ' + errorText(saveError)),
        h('p', null, '변경 내용은 이 창이 열려 있는 동안 메모리에 그대로 남아 있으며, 다른 화면으로 이동해도 사라지지 않습니다. 하지만 창을 닫거나 새로고침하면 잃을 수 있으니 JSON으로 내보내 두는 것을 권장합니다.')),
      onClose: r2 => resolve(!!r2),
      actions: [
        { label: '머무르기', cls: 'ghost', onClick: m => m.close(false) },
        { label: 'JSON 내보내기', onClick: () => exportBackup() },
        { label: '다시 시도', onClick: async m => { if (await flush()) { toast('저장했습니다.', { kind: 'ok' }); m.close(true); } else toast('다시 실패했습니다: ' + errorText(saveError), { kind: 'error' }); } },
        { label: '그래도 이동', cls: 'primary', onClick: m => m.close(true) },
      ],
    });
  });
}
async function navigate(view, opts = {}) {
  if (ui.view === 'editor' && !(view === 'editor' && opts.id === ui.editId)) {
    const ok = await leaveEditor();
    if (!ok) return false;
  }
  if (view === 'editor') {
    if (ui.view !== 'editor') ui.prevView = ui.view;
    ui.editId = opts.id;
  } else {
    ui.editId = null;
    if (view !== 'all') { ui.query = ''; $('#search').value = ''; $('#search-wrap').classList.remove('has-value'); }
    // 편집 화면에서 원래 목록으로 돌아갈 때는 필터를 유지한다
    const returning = ui.view === 'editor' && ui.prevView === view;
    if (ui.view !== view && !returning) ui.filters = { type: 'all', status: 'all', genre: 'all', favOnly: false };
  }
  scrollMemo.set(currentHash(), window.scrollY);
  ui.view = view;
  closeDrawer();
  if (view !== 'all') closeMobileSearch();
  if (view === 'editor') rememberRecent(opts.id);
  render();
  // 주소(#/…)와 브라우저 기록을 맞춘다 — Android 뒤로 가기가 앱 안에서 동작하도록
  const target = currentHash();
  if (!opts.fromHistory) {
    await hist.chain;
    if (location.hash !== target) {
      if (opts.replace) history.replaceState({ cw: 1, idx: hist.idx }, '', target);
      else history.pushState({ cw: 1, idx: ++hist.idx }, '', target);
    }
  } else if (history.state && typeof history.state.idx === 'number') hist.idx = history.state.idx;
  if (opts.fromHistory && scrollMemo.has(target)) window.scrollTo(0, scrollMemo.get(target));
  else if (!opts.keepScroll) window.scrollTo(0, 0);
  return true;
}

/* ---------- 해시 라우팅 (정적 호스팅에서 경로 문제 없음) ---------- */
const hist = { idx: 0, ignore: 0, waiter: null, chain: Promise.resolve() };
function histQueue(fn) {   // 기록 조작은 순서대로 하나씩(앞의 back이 끝난 뒤 다음 push)
  hist.chain = hist.chain.then(fn).catch(() => {});
  return hist.chain;
}
const scrollMemo = new Map();
const HASH_VIEWS = ['dashboard', 'inbox', 'fragment', 'idea', 'project', 'favorites', 'trash', 'settings', 'all'];
function currentHash() {
  if (ui.view === 'editor' && ui.editId) return '#/edit/' + encodeURIComponent(ui.editId);
  return ui.view === 'dashboard' ? '#/' : '#/' + ui.view;
}
function parseHash(hash) {
  const m = /^#\/edit\/(.+)$/.exec(hash || '');
  if (m) {
    let id; try { id = decodeURIComponent(m[1]); } catch (_) { id = null; }
    const r = id && store.get(id);
    if (r && !r.deleted) return { view: 'editor', id };
    return { view: 'dashboard' };
  }
  const v = (hash || '').replace(/^#\/?/, '');
  return { view: HASH_VIEWS.includes(v) ? v : 'dashboard' };
}
function histBack() {   // 모달용으로 넣어 둔 기록 한 칸을 조용히 되돌린다
  let finish;
  const p = new Promise(res => { finish = res; });
  const waiter = () => finish();
  hist.ignore++;
  hist.waiter = waiter;
  history.back();
  setTimeout(() => {   // popstate가 오지 않는 예외 상황 대비
    if (hist.waiter === waiter) { hist.ignore = Math.max(0, hist.ignore - 1); hist.waiter = null; waiter(); }
  }, 700);
  return p;
}
async function onPopState() {
  if (hist.ignore > 0) {
    hist.ignore--;
    const w = hist.waiter; hist.waiter = null;
    if (w) w();
    return;
  }
  if (modalStack.length) {           // 뒤로 가기 = 맨 위 창 닫기
    const m = modalStack[modalStack.length - 1];
    history.pushState({ cw: 1, modal: true, idx: hist.idx }, '');
    m.histPushed = true;
    m.esc();
    return;
  }
  if (document.body.classList.contains('side-open')) { closeDrawer(true); return; }
  if (document.body.classList.contains('search-open') && !ui.query) { closeMobileSearch(); }
  const { view, id } = parseHash(location.hash);
  if (view === ui.view && id === ui.editId) return;
  const ok = await navigate(view, { id, fromHistory: true });
  if (!ok) history.pushState({ cw: 1, idx: ++hist.idx }, '', currentHash());   // 이동을 취소했으면 주소를 되돌림
}
let drawerPushed = false;
function openDrawer() {
  document.body.classList.add('side-open');
  histQueue(() => {
    if (!document.body.classList.contains('side-open')) return;
    history.pushState({ cw: 1, drawer: true, idx: hist.idx }, ''); drawerPushed = true;
  });
  const first = document.querySelector('#sidebar .nav-item.active') || document.querySelector('#sidebar .nav-item');
  if (first) setTimeout(() => first.focus(), 50);
}
function closeDrawer(fromPop) {
  if (!document.body.classList.contains('side-open')) return;
  document.body.classList.remove('side-open');
  if (fromPop) { drawerPushed = false; return; }
  if (drawerPushed) { drawerPushed = false; histQueue(() => (history.state && history.state.drawer) ? histBack() : null); }
}
function openMobileSearch() {
  document.body.classList.add('search-open');
  const s = $('#search');
  s.focus();
}
function closeMobileSearch() {
  if (!document.body.classList.contains('search-open')) return;
  document.body.classList.remove('search-open');
  if (document.activeElement === $('#search')) $('#search').blur();
}
function rememberRecent(id) {
  if (!id) return;
  const list = (meta.recentIds || []).filter(x => x !== id);
  list.unshift(id);
  meta.recentIds = list.slice(0, 30);
  metaDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 1500);
}
function refresh() {
  if (ui.view === 'editor') { updateCounts(); return; }
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

/* =====================================================================
 * 사이드바·배너
 * ===================================================================== */
const NAV = [
  ['dashboard', '대시보드', 'home'],
  null,
  ['inbox', '임시 메모', 'inbox'],
  ['fragment', '아이디어 파편', 'spark'],
  ['idea', '정식 소재', 'bulb'],
  ['project', '작품 프로젝트', 'book'],
  null,
  ['favorites', '즐겨찾기', 'star'],
  ['trash', '휴지통', 'trash'],
  ['settings', '설정', 'gear'],
];
function buildNav() {
  const nav = $('#nav');
  nav.replaceChildren();
  NAV.forEach(item => {
    if (!item) { nav.appendChild(h('div', { class: 'nav-sep' })); return; }
    const [key, label, ic] = item;
    const b = h('button', { type: 'button', class: 'nav-item', 'data-view': key, title: label, onClick: () => navigate(key) },
      icon(ic), h('span', null, label), h('span', { class: 'count', 'data-count': key }));
    nav.appendChild(b);
  });
}
function updateNav() {
  const cur = ui.view === 'editor' ? (store.get(ui.editId) || {}).type : ui.view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', !!b.dataset.view && b.dataset.view === cur));
  document.querySelectorAll('.bn-item').forEach(b => {
    const on = b.dataset.view === cur;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.body.classList.toggle('m-editing', ui.view === 'editor');
}
function updateCounts() {
  const act = activeRecords();
  const c = { inbox: 0, fragment: 0, idea: 0, project: 0, favorites: 0, trash: 0 };
  act.forEach(r => { c[r.type]++; if (r.favorite) c.favorites++; });
  c.trash = allRecords().length - act.length;
  document.querySelectorAll('[data-count]').forEach(el => {
    const k = el.dataset.count;
    el.textContent = c[k] != null && c[k] > 0 ? c[k] : '';
  });
}
function backupInfo() {
  const days = meta.settings.backupReminderDays;
  const count = allRecords().length;
  const last = meta.lastBackupAt;
  const changedSince = last ? allRecords().filter(r => r.updatedAt > last).length : count;
  if (!count) return { need: false, changedSince: 0 };
  if (!last) return { need: true, msg: '아직 한 번도 백업하지 않았습니다.', changedSince };
  const diff = Math.floor((Date.now() - Date.parse(last)) / 86400000);
  if (days > 0 && diff >= days && changedSince > 0) return { need: true, msg: `마지막 백업 후 ${diff}일이 지났고, 그 뒤로 ${changedSince}개 기록이 바뀌었습니다.`, changedSince };
  return { need: false, changedSince };
}
function renderBanners() {
  const wrap = $('#banners');
  if (!wrap) return;
  wrap.replaceChildren();
  if (adapter && adapter.kind === 'memory') {
    wrap.appendChild(h('div', { class: 'banner error', role: 'alert' },
      h('div', { class: 'grow' }, h('b', null, '브라우저 저장소를 사용할 수 없습니다. '), '이 환경에서는 IndexedDB와 localStorage가 모두 막혀 있어, 작성한 내용이 창을 닫거나 새로고침하면 사라집니다. 작업 후 반드시 JSON으로 내보내 주세요.'),
      btn('JSON 내보내기', { cls: 'sm', icon: 'download', onClick: () => exportBackup() })));
  }
  if (saveState === 'error') {
    wrap.appendChild(h('div', { class: 'banner error', role: 'alert' },
      h('div', { class: 'grow' }, h('b', null, '저장 실패: '), errorText(saveError) + '. 변경 내용은 화면(메모리)에 남아 있지만 아직 저장되지 않았습니다. 창을 닫지 마세요.'),
      btn('다시 시도', { cls: 'sm', onClick: async () => { if (await flush()) toast('저장했습니다.', { kind: 'ok' }); else toast('저장에 다시 실패했습니다.', { kind: 'error' }); } }),
      btn('JSON 내보내기', { cls: 'sm', icon: 'download', onClick: () => exportBackup() })));
  }
  storageNotes.forEach((n, i) => {
    wrap.appendChild(h('div', { class: 'banner ' + n.kind }, h('div', { class: 'grow' }, n.text),
      btn('닫기', { cls: 'sm ghost', onClick: () => { storageNotes.splice(i, 1); renderBanners(); } })));
  });
  if (BROWSER.inApp && !inAppBannerDismissed && !isStandalone()) {
    wrap.appendChild(h('div', { class: 'banner warn' },
      h('div', { class: 'grow' }, h('b', null, `${BROWSER.inApp} 안에서 열려 있습니다. `),
        '이 화면에서는 앱 설치가 안 되고 백업 파일 저장이 막힐 수 있습니다. 또 여기서 쓴 기록은 Chrome과 따로 저장됩니다. Chrome에서 열어 사용하는 것을 권장합니다.'),
      openInRealBrowserButtons(),
      btn('닫기', { cls: 'sm ghost', onClick: () => { inAppBannerDismissed = true; renderBanners(); } })));
  }
  if (tabs.others.size && !tabBannerDismissed && !staleTab) {
    wrap.appendChild(h('div', { class: 'banner warn' },
      h('div', { class: 'grow' }, h('b', null, '다른 탭에서도 열려 있습니다. '), '저장한 내용은 탭 사이에 자동으로 반영됩니다. 같은 기록을 두 곳에서 동시에 고치면 나중에 저장한 쪽이 ‘충돌 사본’으로 따로 저장됩니다.'),
      btn('닫기', { cls: 'sm ghost', onClick: () => { tabBannerDismissed = true; renderBanners(); } })));
  }
  if (updateReady) {
    wrap.appendChild(h('div', { class: 'banner info' },
      h('div', { class: 'grow' }, h('b', null, '새 버전이 준비되었습니다. '), '업데이트해도 기기에 저장된 기록은 그대로 유지됩니다.'),
      btn('지금 업데이트', { cls: 'sm primary', onClick: applyUpdate })));
  }
}

/* =====================================================================
 * 렌더링: 공통
 * ===================================================================== */
function render() {
  updateNav(); updateCounts();
  const c = $('#content');
  c.replaceChildren();
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
  const v = ui.view;
  if (v === 'dashboard') renderDashboard(c);
  else if (v === 'editor') renderEditor(c);
  else if (v === 'settings') renderSettings(c);
  else if (v === 'trash') renderTrash(c);
  else renderList(c);
}
function emptyBox(title, text, actions) {
  return h('div', { class: 'empty' }, h('h2', null, title), h('p', null, text), h('div', { class: 'actions' }, actions || []));
}

/* ---------- 카드 / 행 ---------- */
function starButton(r) {
  const b = h('button', { type: 'button', class: 'star-btn' + (r.favorite ? ' on' : ''), title: r.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가', 'aria-label': r.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가', 'aria-pressed': String(r.favorite) }, icon('star'));
  b.addEventListener('click', e => {
    e.stopPropagation();
    setFavorite(r, !r.favorite);
    if (ui.view === 'favorites' && !r.favorite) { refresh(); return; }
    b.classList.toggle('on', r.favorite);
    b.title = r.favorite ? '즐겨찾기 해제' : '즐겨찾기에 추가';
    b.setAttribute('aria-label', b.title);
    b.setAttribute('aria-pressed', String(r.favorite));
  });
  return b;
}
function openRecord(r) {
  if (r.deleted) openPreview(r);
  else navigate('editor', { id: r.id });
}
function recordCard(r, tokens) {
  const hasTitle = !!r.title.trim();
  let sum = summaryText(r);
  if (tokens && tokens.length) {
    const lowTop = (r.title + ' ' + r.summary).toLowerCase();
    if (!tokens.every(t => lowTop.includes(t))) sum = searchSnippet(r, tokens) || sum;
  }
  const proj = r.projectId && store.get(r.projectId);
  const card = h('article', { class: 'card type-' + r.type, tabindex: '0', role: 'link', 'aria-label': displayTitle(r) + ' 열기' },
    h('div', { class: 'card-top' }, typeBadge(r.type), statusBadge(r.status),
      h('div', { class: 'right' }, r.pinned ? h('span', { class: 'pin-mark', title: '고정된 기록' }, icon('pin')) : null, starButton(r))),
    h('h3', { class: hasTitle ? '' : 'derived' }, displayTitle(r)),
    sum ? h('p', { class: 'sum' }, sum) : null,
    (r.genres.length || r.tags.length) ? h('div', { class: 'chips-row' },
      r.genres.slice(0, 4).map(g => h('span', { class: 'chip genre', title: '장르: ' + g }, g)),
      r.tags.slice(0, 5).map(t => h('span', { class: 'chip', title: '태그: ' + t }, '#' + t)),
      (r.genres.length > 4 || r.tags.length > 5) ? h('span', { class: 'chip' }, '…') : null) : null,
    h('div', { class: 'meta' },
      h('span', { title: '최근 수정: ' + fullDate(r.updatedAt) }, '수정 ' + relDate(r.updatedAt)),
      proj ? h('span', { title: '소속 프로젝트' }, '소속: ' + cut(displayTitle(proj), 24)) : null,
      r.links.length ? h('span', null, '연결 ' + r.links.length) : null));
  card.addEventListener('click', () => openRecord(r));
  card.addEventListener('keydown', e => { if (e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openRecord(r); } });
  return card;
}
function recordRow(r) {
  const row = h('div', { class: 'row', tabindex: '0', role: 'link', 'aria-label': displayTitle(r) + ' 열기' },
    h('div', { class: 'ty' }, typeBadge(r.type)),
    h('div', { style: { minWidth: 0 } },
      h('div', { class: 't' + (r.title.trim() ? '' : ' derived') }, (r.pinned ? '📌 ' : '') + displayTitle(r)),
      h('div', { class: 's' }, STATUS_LABEL[r.status] + (summaryText(r) ? ' · ' + summaryText(r) : ''))),
    h('div', { class: 'tg' }, r.genres.slice(0, 2).map(g => h('span', { class: 'chip genre' }, g)), r.tags.slice(0, 2).map(t => h('span', { class: 'chip' }, '#' + t))),
    h('div', { class: 'd', title: '최근 수정: ' + fullDate(r.updatedAt) }, relDate(r.updatedAt)),
    starButton(r));
  row.addEventListener('click', () => openRecord(r));
  row.addEventListener('keydown', e => { if (e.target === row && e.key === 'Enter') openRecord(r); });
  return row;
}

/* =====================================================================
 * 대시보드
 * ===================================================================== */
function quickInline() {
  const ta = h('textarea', { class: 'field', placeholder: '지금 떠오른 생각을 적어 보세요. 제목 없이 본문만 써도 됩니다.', 'aria-label': '빠른 메모 본문' });
  const msg = h('span', { class: 'hint' }, h('kbd', null, 'Ctrl'), ' + ', h('kbd', null, 'Enter'), '로 저장');
  const save = async () => {
    if (!ta.value.trim()) { msg.textContent = '내용을 입력해야 저장할 수 있습니다.'; msg.style.color = 'var(--danger)'; ta.focus(); return; }
    const text = ta.value;
    saveB.disabled = true;
    const res = await createQuickMemo('', text);
    saveB.disabled = false;
    if (res.record) ta.value = '';
  };
  const saveB = btn('임시 메모로 저장', { cls: 'primary sm', onClick: save });
  ta.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); } });
  return h('div', { class: 'panel quick-inline' }, h('h2', null, '빠른 메모'), ta, h('div', { class: 'row-actions' }, saveB, msg));
}
function miniList(list, dateKey, emptyText) {
  if (!list.length) return h('div', { class: 'mini-empty' }, emptyText);
  return h('div', { class: 'mini-list' }, list.map(r => {
    const b = h('button', { type: 'button', class: 'mini', title: displayTitle(r) },
      h('span', { class: 'tdot ' + r.type, style: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' }, title: TYPES[r.type].label }),
      h('span', { class: 't' + (r.title.trim() ? '' : ' derived') }, displayTitle(r)),
      h('span', { class: 'd' }, relDate(r[dateKey])));
    b.addEventListener('click', () => openRecord(r));
    return b;
  }));
}
function renderDashboard(c) {
  const act = activeRecords();
  const today = fmtFull.format(new Date()).replace(/\s*(오전|오후).*$/, '');
  c.appendChild(h('div', { class: 'page-head' },
    h('div', null, h('h1', null, isMobile() ? '홈' : '대시보드'), h('p', null, today))));
  if (!act.length) {
    const trashN = allRecords().length;
    c.appendChild(emptyBox('아직 기록이 없습니다',
      '떠오른 생각을 빠른 메모로 적어 두거나, 종류를 골라 새 기록을 만들어 보세요. 모든 기록은 이 기기의 이 브라우저 안에만 저장됩니다.' + (trashN ? ` (휴지통에 ${trashN}개 있음)` : ''),
      [btn('새 기록 작성', { cls: 'primary', icon: 'plus', onClick: openNewDialog }),
       btn('빠른 메모', { icon: 'pen', onClick: openQuickMemo }),
       btn('JSON 백업 불러오기', { icon: 'upload', onClick: openImportPicker }),
       btn('예시 데이터 추가', { cls: 'ghost', onClick: addSampleData })]));
    c.appendChild(h('div', { class: 'note-box', style: { marginTop: '14px' } },
      h('b', null, 'v1.0이나 다른 기기에서 쓰던 기록이 있나요? '),
      '기록은 브라우저와 주소마다 따로 저장되므로 자동으로 옮겨지지 않습니다. 기존 소재창고의 설정 화면에서 ‘JSON으로 내보내기’를 한 뒤, 여기서 ‘JSON 백업 불러오기’로 가져오세요.'));
    c.appendChild(h('div', { style: { marginTop: '16px' } }, quickInline()));
    return;
  }
  const cnt = { inbox: 0, fragment: 0, idea: 0, project: 0 };
  act.forEach(r => cnt[r.type]++);
  const stat = (n, label, view, type) => {
    const b = h('button', { type: 'button', class: 'stat', title: label + ' 목록 보기' },
      h('div', { class: 'n' }, String(n)), h('div', { class: 'l' }, type ? h('span', { class: 'tdot ' + type, style: { width: '8px', height: '8px', borderRadius: '50%' } }) : null, label));
    b.addEventListener('click', () => navigate(view));
    return b;
  };
  c.appendChild(h('div', { class: 'stats' },
    stat(act.length, '전체 기록', 'all'),
    TYPE_ORDER.map(t => stat(cnt[t], TYPES[t].label, t, t))));
  const bi = backupInfo();
  if (bi.need) {
    c.insertBefore(h('div', { class: 'banner warn d-backup', style: { margin: '0 0 16px' } },
      h('div', { class: 'grow' }, h('b', null, '백업 권장: '), bi.msg + ' 브라우저 저장소는 영구 보관이 보장되지 않으니 JSON 백업을 만들어 두세요.'),
      btn('지금 백업', { cls: 'sm', icon: 'download', onClick: () => exportBackup() })), c.querySelector('.stats'));
  }
  const recentCreated = [...act].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const recentUpdated = [...act].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const pinned = sortRecords(act.filter(r => r.pinned), 'updated_desc', false).slice(0, 8);
  // 최근 사용한 작품: 최근에 연 순서 → 최근 수정 순
  const recentIdx = new Map((meta.recentIds || []).map((id, i) => [id, i]));
  const recentProjects = act.filter(r => r.type === 'project').sort((a, b) => {
    const ia = recentIdx.has(a.id) ? recentIdx.get(a.id) : 1e9, ib = recentIdx.has(b.id) ? recentIdx.get(b.id) : 1e9;
    return ia !== ib ? ia - ib : b.updatedAt.localeCompare(a.updatedAt);
  }).slice(0, 5);
  c.appendChild(h('div', { class: 'dash-grid' },
    h('div', { class: 'd-quick' }, quickInline()),
    h('div', { class: 'panel d-projects' }, h('h2', null, '최근 사용한 작품 프로젝트'), recentProjects.length
      ? h('div', { class: 'mini-list' }, recentProjects.map(p => {
          const b = h('button', { type: 'button', class: 'mini', title: displayTitle(p) },
            h('span', { class: 'tdot project', style: { width: '8px', height: '8px', borderRadius: '50%', flex: 'none' } }),
            h('span', { class: 't' + (p.title.trim() ? '' : ' derived') }, displayTitle(p)),
            h('span', { class: 'd' }, `소속 ${membersOf(p.id).length} · ${STATUS_LABEL[p.status]}`));
          b.addEventListener('click', () => openRecord(p));
          return b;
        }))
      : h('div', { class: 'mini-empty' }, '작품 프로젝트가 없습니다. 정식 소재를 승격하거나 새로 만들어 보세요.')),
    h('div', { class: 'panel d-fav' }, h('h2', null, '즐겨찾기'), miniList(sortRecords(act.filter(r => r.favorite), 'updated_desc', false).slice(0, 6), 'updatedAt', '즐겨찾기한 기록이 없습니다.')),
    h('div', { class: 'panel d-updated' }, h('h2', null, '최근 수정한 기록'), miniList(recentUpdated, 'updatedAt', '최근 수정한 기록이 없습니다.')),
    h('div', { class: 'panel d-created' }, h('h2', null, '최근 작성한 기록'), miniList(recentCreated, 'createdAt', '최근 작성한 기록이 없습니다.')),
    h('div', { class: 'panel d-pinned' }, h('h2', null, '고정한 기록'), miniList(pinned, 'updatedAt', '고정한 기록이 없습니다. 편집 화면의 고정 버튼으로 상단에 고정할 수 있습니다.')),
    h('div', { class: 'panel d-status' }, h('h2', null, '진행 상태'),
      h('div', { class: 'mini-list' }, STATUSES.map(([k, l]) => h('div', { class: 'mini', style: { cursor: 'default' } },
        h('span', { class: 't' }, l), h('span', { class: 'd' }, act.filter(r => r.status === k).length + '개')))))));
}

/* =====================================================================
 * 목록 화면 (종류별 / 즐겨찾기 / 전체·검색)
 * ===================================================================== */
const VIEW_INFO = {
  inbox: ['임시 메모', '갑자기 떠오른 생각을 빠르게 적어 두는 곳입니다. 나중에 파편·소재·프로젝트로 전환할 수 있습니다.'],
  fragment: ['아이디어 파편', '아직 하나의 작품이 되지 않은 아이디어 조각입니다.'],
  idea: ['정식 소재', '주제·설정·줄거리까지 어느 정도 구체화된 창작 소재입니다.'],
  project: ['작품 프로젝트', '본격적으로 창작하는 작품입니다. 다른 기록을 소속시킬 수 있습니다.'],
  favorites: ['즐겨찾기', '별표를 누른 중요한 기록입니다.'],
  all: ['전체 기록', '휴지통을 제외한 모든 기록입니다.'],
};
function renderList(c) {
  const v = ui.view;
  const tokens = tokenize(ui.query);
  const isType = !!TYPES[v];
  let [title, desc] = VIEW_INFO[v] || VIEW_INFO.all;
  if (v === 'all' && tokens.length) { title = '검색 결과'; desc = `‘${ui.query.trim()}’ 검색 — 제목, 요약, 본문, 상세 항목, 장르, 태그에서 찾습니다. 모든 단어가 포함된 기록만 표시합니다.`; }

  let base = activeRecords();
  if (isType) base = base.filter(r => r.type === v);
  if (v === 'favorites') base = base.filter(r => r.favorite);
  const f = ui.filters;
  let list = base.filter(r =>
    (isType || f.type === 'all' || r.type === f.type) &&
    (f.status === 'all' || r.status === f.status) &&
    (f.genre === 'all' || r.genres.includes(f.genre)) &&
    (!f.favOnly || r.favorite) &&
    matchesTokens(r, tokens));
  sortRecords(list, ui.sort, meta.settings.pinnedFirst);

  const actions = [];
  if (isType) actions.push(btn('새 ' + TYPES[v].label, { cls: 'primary', icon: 'plus', onClick: () => newRecordOfType(v) }));
  c.appendChild(h('div', { class: 'page-head' }, h('div', { style: { minWidth: 0 } }, h('h1', null, title), h('p', null, desc)), h('div', { class: 'actions' }, actions)));

  // 도구 모음
  const sel = (label, value, options, onChange) => {
    const s = h('select', { class: 'field', 'aria-label': label, title: label },
      options.map(([val, lab]) => h('option', { value: val, selected: val === value }, lab)));
    s.addEventListener('change', () => { onChange(s.value); refresh(); });
    return s;
  };
  const genres = allGenres();
  const tb = h('div', { class: 'toolbar' });
  if (!isType) tb.appendChild(sel('기록 종류', f.type, [['all', '모든 종류'], ...TYPE_ORDER.map(t => [t, TYPES[t].label])], val => { f.type = val; }));
  tb.appendChild(sel('진행 상태', f.status, [['all', '모든 상태'], ...STATUSES], val => { f.status = val; }));
  if (f.genre !== 'all' && !genres.includes(f.genre)) f.genre = 'all';
  tb.appendChild(sel('장르', f.genre, [['all', '모든 장르'], ...genres.map(g => [g, g])], val => { f.genre = val; }));
  if (v !== 'favorites') {
    const cb = h('input', { type: 'checkbox', checked: f.favOnly });
    cb.addEventListener('change', () => { f.favOnly = cb.checked; refresh(); });
    tb.appendChild(h('label', { class: 'check', title: '즐겨찾기한 기록만 표시' }, cb, '즐겨찾기만'));
  }
  tb.appendChild(sel('정렬', ui.sort, SORTS, val => { ui.sort = val; }));
  const filtered = f.type !== 'all' || f.status !== 'all' || f.genre !== 'all' || f.favOnly;
  if (filtered) tb.appendChild(btn('필터 초기화', { cls: 'sm ghost', onClick: () => { ui.filters = { type: 'all', status: 'all', genre: 'all', favOnly: false }; refresh(); } }));
  tb.appendChild(h('div', { class: 'sep' }));
  tb.appendChild(h('span', { class: 'result' }, `${list.length}개`));
  const mode = meta.settings.viewMode;
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': '보기 방식' });
  [['card', '카드 보기', 'grid'], ['list', '목록 보기', 'list']].forEach(([m, l, ic]) => {
    const b = h('button', { type: 'button', class: mode === m ? 'active' : '', title: l, 'aria-label': l, 'aria-pressed': String(mode === m) }, icon(ic));
    b.addEventListener('click', () => { meta.settings.viewMode = m; saveMeta(); refresh(); });
    seg.appendChild(b);
  });
  tb.appendChild(seg);
  c.appendChild(tb);

  if (!list.length) {
    if (!base.length && !tokens.length) {
      if (isType) c.appendChild(emptyBox(TYPES[v].label + ' 기록이 없습니다', TYPES[v].desc + '입니다. 새로 만들거나, 다른 기록의 종류를 바꿔 이곳으로 옮길 수 있습니다.',
        [btn('새 ' + TYPES[v].label, { cls: 'primary', icon: 'plus', onClick: () => newRecordOfType(v) }), v === 'inbox' ? btn('빠른 메모', { icon: 'pen', onClick: openQuickMemo }) : null]));
      else if (v === 'favorites') c.appendChild(emptyBox('즐겨찾기한 기록이 없습니다', '카드나 편집 화면의 별 버튼을 누르면 이곳에 모입니다.'));
      else c.appendChild(emptyBox('기록이 없습니다', '새 기록을 작성해 보세요.', [btn('새 기록 작성', { cls: 'primary', icon: 'plus', onClick: openNewDialog })]));
    } else {
      c.appendChild(emptyBox('조건에 맞는 기록이 없습니다', tokens.length ? '검색어를 바꾸거나 필터를 해제해 보세요.' : '필터를 바꾸거나 초기화해 보세요.',
        [filtered ? btn('필터 초기화', { onClick: () => { ui.filters = { type: 'all', status: 'all', genre: 'all', favOnly: false }; refresh(); } }) : null,
         tokens.length ? btn('검색어 지우기', { onClick: clearSearch }) : null]));
    }
    return;
  }
  if (mode === 'list') c.appendChild(h('div', { class: 'rows' }, list.map(recordRow)));
  else c.appendChild(h('div', { class: 'cards' }, list.map(r => recordCard(r, tokens))));
}

/* =====================================================================
 * 휴지통
 * ===================================================================== */
function renderTrash(c) {
  const list = allRecords().filter(r => r.deleted).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  c.appendChild(h('div', { class: 'page-head' },
    h('div', null, h('h1', null, '휴지통'), h('p', null, '삭제한 기록은 이곳에 보관됩니다. 복원하거나 영구 삭제할 수 있습니다. 영구 삭제하면 다른 기록의 연결·소속 정보에서도 정리됩니다.')),
    h('div', { class: 'actions' }, list.length ? btn('휴지통 비우기', { cls: 'danger', icon: 'trash', onClick: async () => {
      const ok = await confirmDialog({ title: '휴지통 비우기', message: [`휴지통의 기록 ${list.length}개를 영구 삭제할까요?`, '이 작업은 되돌릴 수 없습니다. 필요하다면 먼저 JSON 백업을 만들어 두세요.'], confirmLabel: '영구 삭제', danger: true });
      if (!ok) return;
      const done = await purgeRecords(list.map(r => r.id));
      toast(done ? '휴지통을 비웠습니다.' : '삭제 내용을 저장하지 못했습니다: ' + errorText(saveError), { kind: done ? 'ok' : 'error' });
      refresh();
    } }) : null)));
  if (!list.length) { c.appendChild(emptyBox('휴지통이 비어 있습니다', '삭제한 기록이 여기에 표시됩니다.')); return; }
  c.appendChild(h('div', { class: 'cards' }, list.map(r => {
    const card = recordCard(r);
    card.querySelector('.meta').appendChild(h('span', { title: fullDate(r.deletedAt) }, '삭제 ' + relDate(r.deletedAt)));
    const restoreB = btn('복원', { cls: 'sm', icon: 'restore', onClick: e => { e.stopPropagation(); restoreRecord(r); refresh(); } });
    const delB = btn('영구 삭제', { cls: 'sm danger', icon: 'trash', onClick: async e => {
      e.stopPropagation();
      const refs = allRecords().filter(x => x.id !== r.id && (x.links.includes(r.id) || x.projectId === r.id)).length;
      const ok = await confirmDialog({ title: '영구 삭제', message: [`'${displayTitle(r)}'${josa(displayTitle(r), '을', '를')} 영구 삭제할까요? 되돌릴 수 없습니다.`, refs ? `이 기록을 연결하거나 소속으로 지정한 기록 ${refs}개에서 해당 정보가 정리됩니다(그 기록들은 삭제되지 않습니다).` : ''].filter(Boolean), confirmLabel: '영구 삭제', danger: true });
      if (!ok) return;
      const done = await purgeRecords([r.id]);
      toast(done ? '영구 삭제했습니다.' : '삭제 내용을 저장하지 못했습니다: ' + errorText(saveError), { kind: done ? 'ok' : 'error' });
      refresh();
    } });
    card.appendChild(h('div', { class: 'card-actions' }, btn('미리보기', { cls: 'sm ghost', onClick: e => { e.stopPropagation(); openPreview(r); } }), restoreB, delB));
    return card;
  })));
}
function openPreview(r) {
  openModal({
    title: (r.deleted ? '휴지통 · ' : '') + cut(displayTitle(r), 40), wide: true,
    content: h('div', null, r.deleted ? h('p', { class: 'hint' }, '휴지통에 있는 기록입니다. 편집하려면 먼저 복원하세요.') : null, h('pre', { class: 'preview' }, recordMarkdown(r))),
    actions: [
      { label: '닫기', cls: 'ghost', onClick: m => m.close() },
      r.deleted ? { label: '복원 후 열기', cls: 'primary', onClick: m => { m.close(); restoreRecord(r); navigate('editor', { id: r.id }); } }
        : { label: '열기', cls: 'primary', onClick: m => { m.close(); navigate('editor', { id: r.id }); } },
    ],
  });
}

/* =====================================================================
 * 편집 화면
 * ===================================================================== */
function chipInput({ values, onChange, placeholder, suggestions, kind, label }) {
  const wrap = h('div', { class: 'chips-input' });
  const listId = 'dl_' + Math.random().toString(36).slice(2);
  const input = h('input', { type: 'text', placeholder, list: listId, 'aria-label': label + ' 추가 (Enter 또는 쉼표)', enterkeyhint: 'done', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' });
  // 터치 기기에서는 키보드의 Enter가 IME 조합 중일 수 있어 명시적인 추가 버튼을 함께 둔다
  const addB = h('button', { type: 'button', class: 'chip-add', title: label + ' 추가', 'aria-label': label + ' 추가' }, '추가');
  addB.addEventListener('mousedown', e => e.preventDefault());
  addB.addEventListener('click', e => { e.stopPropagation(); add(true); });
  const dl = h('datalist', { id: listId }, suggestions.map(s => h('option', { value: s })));
  wrap.append(input, addB, dl);
  const draw = () => {
    wrap.querySelectorAll('.chip').forEach(c => c.remove());
    values.forEach((v, i) => {
      const rm = h('button', { type: 'button', title: `'${v}' 삭제`, 'aria-label': `${label} '${v}' 삭제` }, icon('x'));
      rm.addEventListener('click', e => { e.stopPropagation(); values.splice(i, 1); onChange(); draw(); input.focus(); });
      wrap.insertBefore(h('span', { class: 'chip' + (kind === 'genre' ? ' genre' : '') }, kind === 'tag' ? '#' + v : v, rm), input);
    });
  };
  const add = (refocus, keepLast) => {
    let raw = input.value.split(',');
    const rest = keepLast ? raw.pop() : '';
    const parts = raw.map(s => s.trim().replace(kind === 'tag' ? /^#+/ : /^$/, '').trim()).filter(Boolean);
    input.value = rest;
    let added = false;
    parts.forEach(p => { if (p.length <= 60 && !values.includes(p)) { values.push(p); added = true; } });
    if (added) { onChange(); draw(); if (refocus) input.focus(); }
  };
  input.addEventListener('keydown', e => {
    if (isComposing(e)) return;
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(true); }
    else if (e.key === 'Backspace' && !input.value && values.length) { values.pop(); onChange(); draw(); input.focus(); }
  });
  // 붙여넣기 등으로 쉼표가 들어온 경우 쉼표 앞부분을 확정
  input.addEventListener('input', e => { if (!e.isComposing && input.value.includes(',')) add(true, true); });
  input.addEventListener('blur', () => { if (input.value.trim()) add(false); });
  wrap.addEventListener('click', e => { if (e.target === wrap) input.focus(); });
  draw();
  return wrap;
}
function recordPicker({ placeholder, exclude, onPick, label }) {
  const input = h('input', { type: 'search', class: 'field', placeholder, 'aria-label': label, autocomplete: 'off' });
  const results = h('div', { class: 'picker-results', hidden: true });
  const wrap = h('div', { class: 'picker' }, input, results);
  let items = [], hl = 0;
  const draw = () => {
    const tokens = tokenize(input.value);
    const cand = activeRecords().filter(r => !exclude(r));
    items = (tokens.length ? cand.filter(r => matchesTokens(r, tokens)) : sortRecords(cand, 'updated_desc', false)).slice(0, 10);
    results.replaceChildren();
    if (!items.length) results.appendChild(h('div', { class: 'none' }, tokens.length ? '일치하는 기록이 없습니다.' : '연결할 수 있는 기록이 없습니다.'));
    items.forEach((r, i) => {
      const b = h('button', { type: 'button', class: i === hl ? 'hl' : '' }, typeBadge(r.type), h('span', { class: 't' }, displayTitle(r)));
      b.addEventListener('mousedown', e => e.preventDefault());
      b.addEventListener('click', () => pick(r));
      results.appendChild(b);
    });
    results.hidden = false;
  };
  const pick = r => { onPick(r); input.value = ''; results.hidden = true; };
  input.addEventListener('focus', () => { hl = 0; draw(); });
  input.addEventListener('input', () => { hl = 0; draw(); });
  input.addEventListener('blur', () => setTimeout(() => { results.hidden = true; }, 120));
  input.addEventListener('keydown', e => {
    if (isComposing(e)) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); hl = Math.min(hl + 1, items.length - 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hl = Math.max(hl - 1, 0); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[hl]) pick(items[hl]); }
    else if (e.key === 'Escape') { e.stopPropagation(); results.hidden = true; }
  });
  return wrap;
}
function linkRow(target, { note, removeLabel, onRemove }) {
  const open = h('button', { type: 'button', class: 'open', title: displayTitle(target) + ' 열기' }, displayTitle(target));
  open.addEventListener('click', () => openRecord(target));
  return h('div', { class: 'link-row' }, typeBadge(target.type),
    target.deleted ? h('span', { class: 'badge', title: '휴지통에 있는 기록' }, '휴지통') : null,
    open, note ? h('span', { class: 'note' }, note) : null,
    onRemove ? btn(removeLabel, { cls: 'sm ghost', icon: 'x', onClick: onRemove }) : null);
}

function renderEditor(c) {
  const r = store.get(ui.editId);
  if (!r) { toast('기록을 찾을 수 없습니다.', { kind: 'error' }); ui.view = 'dashboard'; render(); return; }
  if (r.deleted) { ui.view = ui.prevView || 'trash'; render(); openPreview(r); return; }

  const change = () => {
    touch(r);
    updateCounts();
  };
  const bindText = (el, get, set) => {
    el.value = get();
    el.addEventListener('input', () => { set(el.value); change(); if (el.tagName === 'TEXTAREA') autoGrow(el); });
  };

  /* ---- 상단 바 ---- */
  const status = h('span', { class: 'ed-status', role: 'status' });
  const paintStatus = () => {
    if (!document.contains(status)) { saveListeners.delete(paintStatus); return; }
    status.classList.toggle('error', saveState === 'error');
    if (adapter.kind === 'memory') status.textContent = '저장소 없음 · 메모리에만 보관 중';
    else if (draftIds.has(r.id) && isEmptyRecord(r)) status.textContent = '새 기록 · 내용을 입력하면 자동 저장됩니다';
    else if (saveState === 'error') status.textContent = '저장 실패 — 내용은 화면에 남아 있습니다';
    else if (saveState === 'saving') status.textContent = '저장 중…';
    else if (saveState === 'pending' && (dirty.has(r.id))) status.textContent = '입력 중… 잠시 후 자동 저장';
    else status.textContent = '저장됨 · 수정 ' + relDate(r.updatedAt);
    status.title = '최종 수정: ' + fullDate(r.updatedAt);
  };
  saveListeners.add(paintStatus);

  const favB = btn(r.favorite ? '즐겨찾기 해제' : '즐겨찾기', { cls: 'sm' + (r.favorite ? ' on' : ''), icon: 'star', hideLabelSm: true });
  favB.addEventListener('click', () => {
    setFavorite(r, !r.favorite);
    favB.classList.toggle('on', r.favorite);
    favB.lastChild.textContent = r.favorite ? '즐겨찾기 해제' : '즐겨찾기';
    favB.title = favB.lastChild.textContent;
    toast(r.favorite ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 해제했습니다.');
  });
  const pinB = btn(r.pinned ? '고정 해제' : '상단 고정', { cls: 'sm' + (r.pinned ? ' pin-on' : ''), icon: 'pin', hideLabelSm: true });
  pinB.addEventListener('click', () => {
    setPinned(r, !r.pinned);
    pinB.classList.toggle('pin-on', r.pinned);
    pinB.lastChild.textContent = r.pinned ? '고정 해제' : '상단 고정';
    pinB.title = pinB.lastChild.textContent;
  });
  const backTarget = ui.prevView && ui.prevView !== 'editor' ? ui.prevView : r.type;
  const backLabel = backTarget === 'dashboard' ? '대시보드' : backTarget === 'settings' ? '설정' : backTarget === 'trash' ? '휴지통'
    : (VIEW_INFO[backTarget] ? VIEW_INFO[backTarget][0] : '목록');
  const backText = backLabel + josa(backLabel, '으로', '로');
  const goBack = () => {
    // 모바일: 브라우저 기록을 따라 이전 화면으로(Android 뒤로 가기와 같은 동작)
    if (isMobile() && history.state && history.state.idx > 0) history.back();
    else navigate(backTarget);
  };
  pinB.classList.add('d-only');
  const moreB = btn('더보기', { cls: 'sm m-only', icon: 'more', iconOnly: true, title: '고정 · AI 복사 · 삭제', onClick: () => {
    const sheet = openModal({
      title: '기록 메뉴', sheet: true,
      content: h('div', { class: 'action-list' },
        btn(r.pinned ? '상단 고정 해제' : '상단에 고정', { icon: 'pin', onClick: () => { sheet.close(); pinB.click(); toast(r.pinned ? '상단에 고정했습니다.' : '고정을 해제했습니다.'); } }),
        btn('AI 분석용 복사', { icon: 'copy', onClick: () => { sheet.close(); openCopyDialog(r); } }),
        btn('휴지통으로 이동', { icon: 'trash', cls: 'danger', onClick: () => { sheet.close(); trashRecord(r); } })),
    });
  } });
  c.appendChild(h('div', { class: 'editor-head' },
    btn(backText, { cls: 'sm ghost', icon: 'back', title: backText + ' 돌아가기', hideLabelSm: true, onClick: goBack }),
    h('span', { class: 'd-only-inline' }, typeBadge(r.type)), status, h('div', { class: 'grow' }),
    favB, pinB,
    btn('AI 분석용 복사', { cls: 'sm d-only', icon: 'copy', hideLabelSm: true, title: 'AI 분석용 Markdown으로 복사', onClick: () => openCopyDialog(r) }),
    btn('삭제', { cls: 'sm danger d-only', icon: 'trash', hideLabelSm: true, title: '휴지통으로 이동', onClick: () => trashRecord(r) }),
    moreB));

  const ed = h('div', { class: 'editor' });
  c.appendChild(ed);

  /* ---- 제목·요약 ---- */
  const titleEl = h('textarea', { class: 'title-input', rows: 1, placeholder: TITLE_PH[r.type], 'aria-label': '제목', maxlength: 300 });
  bindText(titleEl, () => r.title, v => { r.title = v.replace(/\n/g, ' '); });
  titleEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !isComposing(e)) { e.preventDefault(); summaryEl.focus(); } });
  const summaryEl = h('textarea', { class: 'summary-input', rows: 1, placeholder: SUMMARY_LABEL[r.type] + ' — 한 줄로 적어 보세요', 'aria-label': SUMMARY_LABEL[r.type] });
  bindText(summaryEl, () => r.summary, v => { r.summary = v; });
  ed.append(titleEl, summaryEl);

  /* ---- 메타 ---- */
  const typeSel = h('select', { class: 'field', 'aria-label': '기록 종류' }, TYPE_ORDER.map(t => h('option', { value: t, selected: t === r.type }, TYPES[t].label)));
  typeSel.addEventListener('change', async () => {
    const ok = await changeType(r, typeSel.value);
    if (ok) rerenderEditor(); else typeSel.value = r.type;
  });
  const nextType = TYPE_ORDER[TYPE_ORDER.indexOf(r.type) + 1];
  const promoteB = nextType ? btn(TYPES[nextType].label + josa(TYPES[nextType].label, '으로', '로') + ' 승격', { icon: 'up', title: `이 기록을 '${TYPES[nextType].label}'${josa(TYPES[nextType].label, '으로', '로')} 승격 (내용 보존)`, onClick: async () => {
    if (await changeType(r, nextType)) rerenderEditor();
  } }) : null;
  const statusSel = h('select', { class: 'field', 'aria-label': '진행 상태' }, STATUSES.map(([k, l]) => h('option', { value: k, selected: k === r.status }, l)));
  statusSel.addEventListener('change', () => { r.status = statusSel.value; change(); });
  ed.appendChild(h('div', { class: 'meta-grid' },
    h('div', null, h('label', { class: 'lbl' }, '종류'), h('div', { class: 'type-line' }, typeSel, promoteB)),
    h('div', null, h('label', { class: 'lbl' }, '진행 상태'), statusSel),
    h('div', null, h('label', { class: 'lbl' }, '장르'), chipInput({ values: r.genres, onChange: change, placeholder: '장르 입력 후 Enter', suggestions: allGenres(), kind: 'genre', label: '장르' })),
    h('div', null, h('label', { class: 'lbl' }, '태그'), chipInput({ values: r.tags, onChange: change, placeholder: '태그 입력 후 Enter', suggestions: allTags(), kind: 'tag', label: '태그' }))));

  /* ---- 본문 ---- */
  const bodyEl = h('textarea', { class: 'field body-area', placeholder: r.type === 'inbox' ? '생각나는 대로 자유롭게 적어 보세요.' : '자유롭게 적는 공간입니다.', 'aria-label': BODY_LABEL[r.type] });
  bindText(bodyEl, () => r.body, v => { r.body = v; });
  ed.appendChild(h('section', { class: 'sec' }, h('div', { class: 'sec-head' }, h('h2', null, BODY_LABEL[r.type]), h('span', { class: 'hint' }, '입력하면 자동 저장됩니다', h('span', { class: 'kbd-part' }, ' · ', h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'S'), ' 즉시 저장'))), bodyEl));

  /* ---- 상세 항목 ---- */
  const fieldBlock = key => {
    const def = FIELD_DEFS[key] || { label: key, ph: '' };
    const ta = h('textarea', { class: 'field', placeholder: def.ph, 'aria-label': def.label });
    bindText(ta, () => r.fields[key] || '', v => { r.fields[key] = v; });
    return h('div', null, h('label', { class: 'lbl' }, def.label), ta);
  };
  const ownFields = TYPE_FIELDS[r.type];
  if (ownFields.length) {
    ed.appendChild(h('section', { class: 'sec' },
      h('div', { class: 'sec-head' }, h('h2', null, r.type === 'project' ? '작품 설계' : '상세 항목'), h('span', { class: 'hint' }, '각 항목은 따로 자동 저장됩니다')),
      h('div', { class: 'fields' }, ownFields.map(fieldBlock))));
  }
  const preservedKeys = Object.keys(r.fields).filter(k => !ownFields.includes(k) && r.fields[k] && r.fields[k].trim());
  if (preservedKeys.length) {
    ed.appendChild(h('details', { class: 'preserved' },
      h('summary', null, `다른 종류에서 작성한 항목 ${preservedKeys.length}개 (보존됨)`),
      h('p', { class: 'hint', style: { margin: '8px 0 0' } }, '현재 종류에서는 쓰지 않는 항목이지만 데이터는 그대로 남아 있습니다. 여기서 계속 편집할 수 있고, 원래 종류로 되돌리면 다시 기본 항목으로 표시됩니다.'),
      h('div', { class: 'fields' }, preservedKeys.map(fieldBlock))));
  }

  /* ---- 연결 ---- */
  const connSec = h('section', { class: 'sec' });
  ed.appendChild(connSec);
  const drawConnections = () => {
    connSec.replaceChildren();
    connSec.appendChild(h('div', { class: 'sec-head' }, h('h2', null, '연결'), h('span', { class: 'hint' }, '연결을 해제해도 기록 자체는 삭제되지 않습니다')));

    // 소속 프로젝트
    const projSel = h('select', { class: 'field', 'aria-label': '소속 작품 프로젝트' }, h('option', { value: '' }, '(소속 없음)'));
    projects().filter(p => p.id !== r.id).sort((a, b) => displayTitle(a).localeCompare(displayTitle(b), 'ko'))
      .forEach(p => projSel.appendChild(h('option', { value: p.id, selected: p.id === r.projectId }, displayTitle(p))));
    const curP = r.projectId && store.get(r.projectId);
    if (r.projectId && (!curP || curP.deleted || curP.type !== 'project')) {
      const lab = !curP ? '(찾을 수 없는 프로젝트)' : curP.deleted ? displayTitle(curP) + ' (휴지통)' : displayTitle(curP) + ' (현재 작품 프로젝트 아님)';
      projSel.appendChild(h('option', { value: r.projectId, selected: true }, lab));
    }
    projSel.addEventListener('change', () => { r.projectId = projSel.value || null; change(); drawConnections(); });
    const goP = curP ? btn('열기', { cls: 'sm', title: '소속 프로젝트 열기', onClick: () => openRecord(curP) }) : null;

    const fwd = r.links.map(id => store.get(id)).filter(x => x && !draftIds.has(x.id));
    const rev = reverseLinks(r.id).filter(x => !r.links.includes(x.id));
    const linkedIds = new Set([r.id, ...r.links, ...rev.map(x => x.id)]);

    const linkPicker = recordPicker({
      label: '연결할 기록 검색', placeholder: '연결할 기록 검색 (제목·본문·태그)…',
      exclude: x => linkedIds.has(x.id) || x.links.includes(r.id),
      onPick: x => { const err = linkRecords(r, x); if (err) toast(err, { kind: 'warn' }); else { toast(`'${cut(displayTitle(x), 24)}'${josa(displayTitle(x), '과', '와')} 연결했습니다.`, { kind: 'ok' }); drawConnections(); } },
    });

    const grid = h('div', { class: 'subgrid' },
      h('div', null,
        h('label', { class: 'lbl' }, '소속 작품 프로젝트'),
        h('div', { class: 'type-line' }, projSel, goP),
        h('p', { class: 'hint', style: { margin: '6px 0 0' } }, '하나의 기록은 하나의 주 소속 프로젝트를 가질 수 있습니다. 다른 기록과는 아래 관련 연결로 묶으세요.')),
      h('div', null,
        h('label', { class: 'lbl' }, `관련 기록 (${fwd.length})`),
        fwd.length ? h('div', { class: 'link-list' }, fwd.map(x => linkRow(x, { removeLabel: '연결 해제', onRemove: () => { unlinkRecords(r, x.id); toast('연결을 해제했습니다.'); drawConnections(); } }))) : h('div', { class: 'link-empty' }, '연결된 기록이 없습니다.'),
        linkPicker));
    connSec.appendChild(grid);

    connSec.appendChild(h('div', { style: { marginTop: '18px' } },
      h('label', { class: 'lbl' }, `이 기록을 연결한 기록 · 역방향 (${rev.length})`),
      rev.length ? h('div', { class: 'link-list' }, rev.map(x => linkRow(x, { note: '상대 기록에서 연결함', removeLabel: '연결 해제', onRemove: () => { unlinkRecords(x, r.id); toast('연결을 해제했습니다.'); drawConnections(); } })))
        : h('div', { class: 'link-empty' }, '다른 기록에서 이 기록을 연결한 경우 여기에 표시됩니다.')));

    if (r.type === 'project') {
      const members = allRecords().filter(x => x.projectId === r.id && x.id !== r.id);
      const memberPicker = recordPicker({
        label: '이 프로젝트에 소속시킬 기록 검색', placeholder: '소속시킬 기록 검색…',
        exclude: x => x.id === r.id || x.projectId === r.id,
        onPick: async x => {
          if (x.projectId && x.projectId !== r.id) {
            const other = store.get(x.projectId);
            const ok = await confirmDialog({ title: '소속 변경', message: `'${displayTitle(x)}'${josa(displayTitle(x), '은', '는')} 이미 '${other ? displayTitle(other) : '다른 프로젝트'}'에 소속되어 있습니다. 이 프로젝트로 옮길까요?`, confirmLabel: '옮기기' });
            if (!ok) return;
          }
          x.projectId = r.id; touch(x);
          toast('소속 기록으로 추가했습니다.', { kind: 'ok' });
          drawConnections();
        },
      });
      connSec.appendChild(h('div', { style: { marginTop: '18px' } },
        h('label', { class: 'lbl' }, `소속 기록 (${members.length})`),
        members.length ? h('div', { class: 'link-list' }, sortRecords(members, 'updated_desc', false).map(x => linkRow(x, { note: STATUS_LABEL[x.status], removeLabel: '소속 해제', onRemove: () => { x.projectId = null; touch(x); toast('소속을 해제했습니다. 기록은 그대로 남아 있습니다.'); drawConnections(); } })))
          : h('div', { class: 'link-empty' }, '아직 소속된 기록이 없습니다. 메모·파편·소재를 이 작품에 소속시켜 자료를 모아 보세요.'),
        memberPicker));
    }
  };
  drawConnections();

  /* ---- 하단 정보 ---- */
  ed.appendChild(h('div', { class: 'ed-foot' },
    h('span', null, '생성 ' + fullDate(r.createdAt)),
    h('span', { class: 'upd' }, '최종 수정 ' + fullDate(r.updatedAt)),
    h('span', null, 'ID ', h('code', null, r.id))));
  const upd = ed.querySelector('.ed-foot .upd');
  saveListeners.add(function paintFoot() { if (!document.contains(upd)) { saveListeners.delete(paintFoot); return; } upd.textContent = '최종 수정 ' + fullDate(r.updatedAt); });

  paintStatus();
  requestAnimationFrame(() => {
    ed.querySelectorAll('textarea').forEach(autoGrow);
    if (draftIds.has(r.id)) (r.type === 'inbox' ? bodyEl : titleEl).focus();
  });
}
function rerenderEditor() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

/* =====================================================================
 * 새 기록·빠른 메모·랜덤
 * ===================================================================== */
function newRecordOfType(type) {
  const r = createRecord(type);
  draftIds.add(r.id);
  navigate('editor', { id: r.id });
}
function openNewDialog() {
  const content = h('div', null,
    h('p', { class: 'hint' }, '어떤 종류로 시작할까요? 종류는 나중에 언제든 바꿀 수 있고, 바꿔도 내용은 보존됩니다.'),
    h('div', { class: 'type-choices' }, TYPE_ORDER.map(t => {
      const b = h('button', { type: 'button', class: 'type-choice type-' + t }, h('strong', null, h('span', { class: 'tdot', style: { width: '9px', height: '9px', borderRadius: '50%' } }), TYPES[t].label), h('span', null, TYPES[t].desc));
      b.addEventListener('click', () => { m.close(); newRecordOfType(t); });
      return b;
    })));
  const m = openModal({ title: '새 기록 작성', content, actions: [{ label: '취소', cls: 'ghost', onClick: mm => mm.close() }] });
  setTimeout(() => { const f = m.box.querySelector('.type-choice'); if (f) f.focus(); }, 30);
}
function openQuickMemo() {
  if (modalStack.some(m => m.quick)) return;
  const titleIn = h('input', { type: 'text', class: 'field', placeholder: '제목 (선택)', 'aria-label': '빠른 메모 제목 (선택)', maxlength: 300 });
  const bodyIn = h('textarea', { class: 'field', placeholder: '떠오른 생각을 적어 보세요. 본문만 써도 저장됩니다.', 'aria-label': '빠른 메모 본문', rows: 7, autofocus: true });
  const msg = h('div', { class: 'hint', style: { marginTop: '8px' } }, h('kbd', null, 'Ctrl'), ' + ', h('kbd', null, 'Enter'), ' 저장 · ', h('kbd', null, 'Esc'), ' 닫기 · 저장된 메모는 ‘임시 메모’에 들어갑니다.');
  let busy = false;
  const save = async mm => {
    if (busy) return;
    if (!bodyIn.value.trim() && !titleIn.value.trim()) {
      msg.textContent = '내용이 비어 있어 저장하지 않았습니다. 한 글자 이상 입력해 주세요.';
      msg.style.color = 'var(--danger)';
      bodyIn.focus();
      return;
    }
    busy = true;
    const res = await createQuickMemo(titleIn.value, bodyIn.value);
    busy = false;
    if (res.record) mm.close();   // 저장 실패여도 기록은 메모리·목록에 있으므로 중복 생성을 막기 위해 닫는다
  };
  const content = h('div', null, h('div', { style: { marginBottom: '8px' } }, titleIn), bodyIn, msg);
  const m = openModal({
    title: '빠른 메모', content,
    onEsc: async mm => {
      if (bodyIn.value.trim() || titleIn.value.trim()) {
        if (!(await confirmDialog({ title: '메모 닫기', message: '작성 중인 내용이 저장되지 않았습니다. 버리고 닫을까요?', confirmLabel: '버리고 닫기', danger: true }))) return;
      }
      mm.close();
    },
    actions: [
      { label: '취소', cls: 'ghost', onClick: mm => mm.esc() },
      { label: '저장', cls: 'primary', onClick: save },
    ],
  });
  m.quick = true;
  content.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(m); } });
}
function openRandom() {
  const pool = activeRecords().filter(r => r.type === 'fragment' || r.type === 'idea');
  if (!pool.length) {
    toast('아직 아이디어 파편이나 정식 소재가 없습니다. 기록을 만든 뒤 다시 눌러 보세요.', { kind: 'warn' });
    return;
  }
  let pick = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && pick.id === ui.editId) pick = pool.filter(r => r.id !== ui.editId)[Math.floor(Math.random() * (pool.length - 1))];
  navigate('editor', { id: pick.id }).then(ok => { if (ok) toast(`랜덤 소재: ${cut(displayTitle(pick), 30)}`); });
}

/* =====================================================================
 * AI 분석용 복사
 * ===================================================================== */
function recordMarkdown(r) {
  const L = [];
  L.push('# ' + displayTitle(r));
  L.push('');
  L.push('- 종류: ' + TYPES[r.type].label);
  L.push('- 진행 상태: ' + STATUS_LABEL[r.status]);
  if (r.genres.length) L.push('- 장르: ' + r.genres.join(', '));
  if (r.tags.length) L.push('- 태그: ' + r.tags.map(t => '#' + t).join(' '));
  const p = r.projectId && store.get(r.projectId);
  if (p) L.push('- 소속 프로젝트: ' + displayTitle(p));
  L.push('- 작성일: ' + fullDate(r.createdAt) + ' / 최종 수정: ' + fullDate(r.updatedAt));
  const sec = (head, text) => { if (text && text.trim()) { L.push('', '## ' + head, '', text.trim()); } };
  sec(SUMMARY_LABEL[r.type], r.summary);
  sec(BODY_LABEL[r.type], r.body);
  const own = TYPE_FIELDS[r.type];
  own.forEach(k => sec(FIELD_DEFS[k].label, r.fields[k]));
  Object.keys(r.fields).filter(k => !own.includes(k)).forEach(k => sec((FIELD_DEFS[k] ? FIELD_DEFS[k].label : k) + ' (이전 단계 항목)', r.fields[k]));
  const rel = [...r.links.map(id => store.get(id)), ...reverseLinks(r.id).filter(x => !r.links.includes(x.id))].filter(x => x && !x.deleted);
  if (rel.length) { L.push('', '## 관련 기록', ''); rel.forEach(x => L.push(`- ${displayTitle(x)} (${TYPES[x.type].label})${summaryText(x) ? ': ' + cut(summaryText(x), 80) : ''}`)); }
  if (r.type === 'project') {
    const mem = membersOf(r.id);
    if (mem.length) { L.push('', '## 소속 기록', ''); mem.forEach(x => L.push(`- ${displayTitle(x)} (${TYPES[x.type].label})${summaryText(x) ? ': ' + cut(summaryText(x), 80) : ''}`)); }
  }
  return L.join('\n') + '\n';
}
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch (_) {}
  try {
    const ta = h('textarea', { style: { position: 'fixed', left: '-9999px', top: '0' } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) { return false; }
}
function openCopyDialog(r) {
  const md = recordMarkdown(r);
  const PROMPT = '아래는 제가 구상 중인 창작 소재입니다. 강점과 약점, 보완할 점, 발전시킬 수 있는 방향을 구체적으로 분석해 주세요.\n\n---\n\n';
  let withPrompt = false;
  const ta = h('textarea', { class: 'field', rows: 14, style: { fontFamily: 'ui-monospace,Consolas,"Malgun Gothic",monospace', fontSize: '13px' }, 'aria-label': '복사할 내용 (수정 가능)' });
  ta.value = md;
  const cb = h('input', { type: 'checkbox' });
  cb.addEventListener('change', () => { withPrompt = cb.checked; ta.value = (withPrompt ? PROMPT : '') + md; });
  openModal({
    title: 'AI 분석용 복사', wide: true,
    content: h('div', null,
      h('p', { class: 'hint' }, '제목·장르·개요·본문·상세 항목을 Markdown으로 정리했습니다. 복사한 뒤 Claude나 ChatGPT 대화창에 붙여 넣으세요. 이 프로그램은 외부로 아무것도 전송하지 않습니다.'),
      h('label', { class: 'check', style: { margin: '4px 0 10px' } }, cb, '분석 요청 문구를 앞에 붙이기'),
      ta),
    actions: [
      { label: '닫기', cls: 'ghost', onClick: m => m.close() },
      { label: '클립보드에 복사', cls: 'primary', onClick: async m => {
        if (await copyText(ta.value)) { toast('클립보드에 복사했습니다. AI 대화창에 붙여 넣으세요.', { kind: 'ok' }); m.close(); }
        else { ta.focus(); ta.select(); toast('자동 복사에 실패했습니다. 선택된 내용을 Ctrl+C로 직접 복사해 주세요.', { kind: 'warn', duration: 7000 }); }
      } },
    ],
  });
}

/* =====================================================================
 * JSON 백업 / 복원
 * ===================================================================== */
function pad(n) { return String(n).padStart(2, '0'); }
function downloadFile(text, filename, type) {
  const blob = new Blob([text], { type: type || 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename, style: { display: 'none' } });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function buildBackup() {
  const records = allRecords().map(clone);
  return {
    app: APP_ID,
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowISO(),
    counts: {
      total: records.length,
      active: records.filter(r => !r.deleted).length,
      trash: records.filter(r => r.deleted).length,
      byType: Object.fromEntries(TYPE_ORDER.map(t => [t, records.filter(r => r.type === t).length])),
    },
    tagIndex: { genres: allGenres(), tags: allTags() },
    settings: clone(meta.settings),
    tombstones: clone(meta.tombstones || []),   // v1.1: 영구 삭제된 ID 목록(내용 없음, 향후 동기화용)
    records,
  };
}
async function exportBackup(opts = {}) {
  try {
    const data = buildBackup();
    const d = new Date();
    const name = `${opts.prefix || '소재창고_백업'}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
    const text = JSON.stringify(data, null, 2);
    // 앱 안의 브라우저는 파일 다운로드를 조용히 무시하는 경우가 많다 → 저장 대신 다른 방법을 먼저 안내
    if (BROWSER.inApp && !opts.share && !opts.silent && !opts.forceDownload) {
      openModal({
        title: '백업 파일 저장',
        content: h('div', null,
          h('p', null, `${BROWSER.inApp} 안의 브라우저에서는 파일 저장이 동작하지 않을 수 있습니다. 가장 확실한 방법은 Chrome에서 열어 내보내는 것입니다.`),
          h('div', { class: 'btn-row' }, openInRealBrowserButtons()),
          h('p', { class: 'hint', style: { marginTop: '10px' } }, '‘백업 내용 복사’는 백업 전체를 글자로 복사합니다. 메모장 등에 붙여 넣어 보관했다가, 설정의 ‘붙여 넣어 불러오기’로 되살릴 수 있습니다.')),
        actions: [
          { label: '그래도 파일 저장 시도', onClick: m => { m.close(); exportBackup(Object.assign({}, opts, { forceDownload: true })); } },
          { label: '백업 내용 복사', cls: 'primary', onClick: async m => {
            if (await copyText(text)) {
              meta.lastBackupAt = data.exportedAt; await saveMeta();
              m.close(); toast(`백업 내용(${data.records.length}개 기록)을 복사했습니다. 메모장 등에 붙여 넣어 보관하세요.`, { kind: 'ok', duration: 6000 });
              if (ui.view === 'settings' || ui.view === 'dashboard') refresh();
            } else toast('복사하지 못했습니다. Chrome에서 열어 내보내 주세요.', { kind: 'error' });
          } },
        ],
      });
      return false;
    }
    if (opts.share) {
      const file = new File([text], name, { type: 'application/json' });
      try {
        await navigator.share({ files: [file], title: '소재창고 백업' });
      } catch (e) {
        if (e && e.name === 'AbortError') { toast('공유를 취소했습니다.'); return false; }
        toast('공유하지 못해 파일 다운로드로 대신합니다: ' + errorText(e), { kind: 'warn' });
        downloadFile(text, name);
      }
    } else downloadFile(text, name);
    meta.lastBackupAt = data.exportedAt;
    await saveMeta();
    if (!opts.silent) toast(`백업 파일을 만들었습니다 (${data.records.length}개 기록). 브라우저의 다운로드 폴더를 확인하세요.`, { kind: 'ok', duration: 5000 });
    if (ui.view === 'settings' || ui.view === 'dashboard') refresh();
    return true;
  } catch (e) {
    toast('백업 파일을 만들지 못했습니다: ' + errorText(e), { kind: 'error' });
    return false;
  }
}
function validateBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return { error: 'JSON 형식이 아닙니다. 파일이 손상되었거나 다른 종류의 파일일 수 있습니다.' }; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: '소재창고 백업 파일 형식이 아닙니다.' };
  if (data.app && data.app !== APP_ID) return { error: '다른 프로그램에서 만든 파일입니다 (app: ' + String(data.app).slice(0, 40) + ').' };
  if (!Array.isArray(data.records)) return { error: '필수 데이터(records 목록)가 없습니다. 소재창고 백업 파일인지 확인해 주세요.' };
  const sv = data.schemaVersion;
  if (typeof sv !== 'number' || !isFinite(sv) || sv < 1) return { error: '스키마 버전 정보가 없거나 올바르지 않습니다.' };
  if (sv > SCHEMA_VERSION) return { error: `이 백업은 더 새로운 버전(스키마 ${sv})에서 만들어졌습니다. 현재 프로그램(스키마 ${SCHEMA_VERSION})으로는 안전하게 불러올 수 없습니다.` };
  const map = new Map();
  let invalid = 0, dupInFile = 0;
  for (const raw of data.records) {
    const r = migrateRecord(normalizeRecord(raw), sv);
    if (!r) { invalid++; continue; }
    if (map.has(r.id)) { dupInFile++; if (r.updatedAt > map.get(r.id).updatedAt) map.set(r.id, r); continue; }
    map.set(r.id, r);
  }
  if (!map.size) return { error: invalid ? `기록 ${invalid}개가 모두 형식이 올바르지 않아 불러올 수 없습니다.` : '불러올 기록이 없습니다 (빈 백업 파일).' };
  const settings = (data.settings && typeof data.settings === 'object') ? data.settings : null;
  return { records: [...map.values()], invalid, dupInFile, schemaVersion: sv, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null, settings };
}
function migrateRecord(r, fromVersion) {
  // 스키마 1이 첫 버전 — 이후 버전이 생기면 여기에서 단계별로 변환한다
  return r;
}
function cleanRefs(map) {
  for (const r of map.values()) {
    r.links = [...new Set(r.links)].filter(id => id !== r.id && map.has(id));
    if (r.projectId && (!map.has(r.projectId) || r.projectId === r.id)) r.projectId = null;
  }
}
function planMerge(incoming) {
  const result = new Map();
  for (const r of allRecords()) result.set(r.id, clone(r));
  let added = 0, updated = 0, kept = 0;
  for (const inc of incoming) {
    const cur = result.get(inc.id);
    if (!cur) { result.set(inc.id, clone(inc)); added++; continue; }
    // 같은 ID = 같은 기록. 최종 수정일이 더 최근인 쪽을 유지하고, 연결 목록은 합친다
    const incNewer = inc.updatedAt > cur.updatedAt;
    const winner = clone(incNewer ? inc : cur);
    winner.links = [...new Set([...cur.links, ...inc.links])];
    if (!winner.projectId) winner.projectId = (incNewer ? cur.projectId : inc.projectId) || null;
    result.set(inc.id, winner);
    if (incNewer) updated++; else kept++;
  }
  cleanRefs(result);
  return { map: result, added, updated, kept };
}
function canShareFiles() {
  try {
    return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File(['{}'], 't.json', { type: 'application/json' })] }));
  } catch (_) { return false; }
}
function openImportPicker() {
  const inp = $('#import-file');
  // 일부 Android 파일 선택기는 .json 확장자 필터 때문에 백업 파일을 회색으로 막는다 → 터치 기기에서는 필터를 풀고 내용으로 검사
  if (window.matchMedia('(pointer: coarse)').matches) inp.removeAttribute('accept');
  else inp.setAttribute('accept', '.json,application/json');
  inp.click();
}
function openPasteImport() {
  const ta = h('textarea', { class: 'field', rows: 8, placeholder: '‘백업 내용 복사’로 복사해 둔 글자 전체를 여기에 붙여 넣으세요. ({ 로 시작합니다)', 'aria-label': '백업 내용 붙여넣기', spellcheck: 'false', autocapitalize: 'off', style: { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: '13px' } });
  openModal({
    title: '붙여 넣어 불러오기',
    content: h('div', null, h('p', { class: 'hint' }, '불러오기 전에 기록 개수를 먼저 보여 드리며, 확인하기 전에는 아무것도 바뀌지 않습니다.'), ta),
    actions: [
      { label: '취소', cls: 'ghost', onClick: m => m.close() },
      { label: '다음', cls: 'primary', onClick: m => {
        if (!ta.value.trim()) { toast('붙여 넣은 내용이 없습니다.', { kind: 'warn' }); return; }
        const v = validateBackup(ta.value.trim());
        if (v.error) { toast(v.error + ' 기존 기록은 바뀌지 않았습니다.', { kind: 'error', duration: 7000 }); return; }
        m.close();
        openImportPreview('붙여 넣은 백업 내용', v);
      } },
    ],
  });
}
function handleImportFile(file) {
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) { toast('파일이 너무 큽니다 (100MB 초과).', { kind: 'error' }); return; }
  const reader = new FileReader();
  reader.onerror = () => toast('파일을 읽지 못했습니다.', { kind: 'error' });
  reader.onload = () => {
    const v = validateBackup(String(reader.result));
    if (v.error) {
      openModal({ title: '불러올 수 없는 파일', content: h('div', null, h('p', null, v.error), h('p', { class: 'hint' }, '기존 기록은 변경되지 않았습니다.')), actions: [{ label: '확인', cls: 'primary', onClick: m => m.close() }] });
      return;
    }
    openImportPreview(file.name, v);
  };
  reader.readAsText(file);
}
function openImportPreview(fileName, v) {
  const inc = v.records;
  const byType = TYPE_ORDER.map(t => `${TYPES[t].label} ${inc.filter(r => r.type === t).length}`).join(' · ');
  const trashN = inc.filter(r => r.deleted).length;
  const plan = planMerge(inc);
  const curCount = allRecords().length;
  let mode = 'merge';
  let safety = true;

  const confirmIn = h('input', { type: 'text', class: 'field', placeholder: '전체 교체', 'aria-label': '확인 문구 입력' });
  const safetyCb = h('input', { type: 'checkbox', checked: true });
  safetyCb.addEventListener('change', () => { safety = safetyCb.checked; });
  const replaceBox = h('div', { class: 'note-box danger', hidden: true },
    h('b', null, '주의: 현재 기록 ' + curCount + '개가 모두 지워지고 백업 파일의 내용으로 바뀝니다.'),
    h('p', { style: { margin: '6px 0' } }, '계속하려면 아래 칸에 ‘전체 교체’라고 입력하세요.'),
    confirmIn,
    h('label', { class: 'check', style: { marginTop: '8px' } }, safetyCb, '교체 직전에 현재 데이터를 안전 백업 파일로 먼저 내려받기 (권장)'),
    BROWSER.inApp ? h('p', { style: { margin: '6px 0 0' } }, `${BROWSER.inApp} 안의 브라우저에서는 안전 백업 파일이 실제로 저장되지 않을 수 있습니다. 전체 교체는 Chrome에서 진행하세요.`) : null);
  const radio = (val, title, desc) => {
    const inp = h('input', { type: 'radio', name: 'imode', value: val, checked: val === mode });
    inp.addEventListener('change', () => { mode = val; replaceBox.hidden = mode !== 'replace'; updateBtn(); });
    return h('label', { class: 'opt' }, inp, h('div', null, h('b', null, title), h('span', null, desc)));
  };
  const content = h('div', null,
    h('dl', { class: 'kv' },
      h('dt', null, '파일'), h('dd', null, fileName),
      h('dt', null, '내보낸 날짜'), h('dd', null, v.exportedAt ? fullDate(v.exportedAt) : '알 수 없음'),
      h('dt', null, '스키마 버전'), h('dd', null, String(v.schemaVersion)),
      h('dt', null, '불러올 기록'), h('dd', null, `${inc.length}개 (휴지통 ${trashN}개 포함)`),
      h('dt', null, '종류별'), h('dd', null, byType),
      h('dt', null, '현재 기록'), h('dd', null, curCount + '개')),
    (v.invalid || v.dupInFile) ? h('div', { class: 'note-box warn' },
      v.invalid ? h('div', null, `형식이 올바르지 않은 항목 ${v.invalid}개는 제외됩니다.`) : null,
      v.dupInFile ? h('div', null, `파일 안에서 ID가 중복된 항목 ${v.dupInFile}개는 최종 수정일이 최근인 것 하나만 사용합니다.`) : null) : null,
    radio('merge', '기존 데이터와 병합 (권장)', `새 기록 ${plan.added}개 추가 · 같은 ID ${plan.updated + plan.kept}개 중 ${plan.updated}개는 백업 쪽이 더 최근이라 갱신, ${plan.kept}개는 현재 쪽 유지`),
    radio('replace', '전체 교체', '현재 데이터를 모두 지우고 백업 파일의 내용으로 바꿉니다. 백업 파일의 화면 설정도 함께 적용됩니다.'),
    replaceBox,
    h('div', { class: 'note-box' },
      h('b', null, 'ID 충돌 처리 방식'),
      h('ul', null,
        h('li', null, 'ID가 같으면 같은 기록으로 봅니다. 사본을 만들지 않으므로 중복이 생기지 않습니다.'),
        h('li', null, '두 쪽 중 ‘최종 수정일’이 더 최근인 버전의 내용을 남깁니다. 같으면 현재 데이터를 유지합니다.'),
        h('li', null, '관련 기록 연결은 양쪽 것을 합칩니다. 소속 프로젝트는 남긴 버전을 따르되, 비어 있으면 다른 쪽 값을 씁니다.'),
        h('li', null, '어느 쪽에도 없는 기록을 가리키는 연결·소속 정보만 정리합니다.'),
        h('li', null, '현재 데이터에만 있는 기록은 그대로 둡니다. 병합은 기존 기록을 지우지 않습니다.'))));
  let m;
  const updateBtn = () => {
    const b = m && m.buttons.go;
    if (!b) return;
    b.disabled = mode === 'replace' && confirmIn.value.trim() !== '전체 교체';
    b.lastChild.textContent = mode === 'replace' ? '전체 교체 실행' : '병합 실행';
    b.className = 'btn ' + (mode === 'replace' ? 'danger solid' : 'primary');
  };
  confirmIn.addEventListener('input', updateBtn);
  m = openModal({
    title: 'JSON 백업 불러오기', content, wide: true,
    actions: [
      { label: '취소', cls: 'ghost', onClick: mm => mm.close() },
      { id: 'go', label: '병합 실행', cls: 'primary', onClick: async mm => {
        mm.buttons.go.disabled = true;
        const ok = await applyImport(mode, v, safety);
        if (ok) mm.close(); else mm.buttons.go.disabled = false;
      } },
    ],
  });
  updateBtn();
}
async function applyImport(mode, v, safety) {
  // 대기 중인 편집을 먼저 저장 — 실패하면 복원을 진행하지 않는다
  if (ui.view === 'editor') { const ok = await leaveEditor(); if (!ok) return false; }
  if (hasUnsaved() && !(await flush())) { toast('현재 변경 사항을 저장하지 못해 복원을 중단했습니다.', { kind: 'error' }); return false; }
  let map, summary, newMeta;
  if (mode === 'replace') {
    if (safety && !(await exportBackup({ prefix: '소재창고_교체전_안전백업', silent: true }))) {
      toast('안전 백업을 만들지 못해 교체를 중단했습니다.', { kind: 'error' }); return false;
    }
    newMeta = clone(meta);
    map = new Map(v.records.map(r => [r.id, clone(r)]));
    cleanRefs(map);
    if (v.settings) newMeta.settings = sanitizeSettings(v.settings);
    summary = `전체 교체 완료: ${map.size}개 기록을 불러왔습니다.`;
  } else {
    newMeta = clone(meta);
    const plan = planMerge(v.records);
    map = plan.map;
    summary = `병합 완료: ${plan.added}개 추가, ${plan.updated}개 갱신, ${plan.kept}개는 현재 버전 유지.`;
  }
  const list = [...map.values()];
  try {
    await adapter.replaceAll(list, newMeta);    // 하나의 트랜잭션 — 실패하면 기존 저장 데이터 그대로
  } catch (e) {
    openModal({ title: '복원 실패', content: h('div', null, h('p', null, '저장소에 기록하지 못했습니다: ' + errorText(e)), h('p', null, '기존 기록은 변경되지 않았습니다.')), actions: [{ label: '확인', cls: 'primary', onClick: mm => mm.close() }] });
    return false;
  }
  store.clear(); draftIds.clear(); dirty.clear(); pendingDeletes.clear(); baseRev.clear();
  list.forEach(r => { store.set(r.id, r); baseRev.set(r.id, r.rev); });
  meta = newMeta;
  applyTheme();
  setSaveState('saved');
  tabs.post({ type: 'replaced' });   // 다른 탭은 낡은 데이터로 덮어쓰지 않도록 저장을 멈춘다
  ui.view = 'dashboard'; ui.editId = null;
  render();
  try { history.replaceState({ cw: 1, idx: hist.idx }, '', '#/'); } catch (_) {}
  toast(summary, { kind: 'ok', duration: 6000 });
  return true;
}
function sanitizeSettings(s) {
  const out = { ...DEFAULT_SETTINGS };
  if (s && typeof s === 'object') {
    if (s.viewMode === 'card' || s.viewMode === 'list') out.viewMode = s.viewMode;
    if (typeof s.pinnedFirst === 'boolean') out.pinnedFirst = s.pinnedFirst;
    if ([0, 3, 7, 14, 30].includes(s.backupReminderDays)) out.backupReminderDays = s.backupReminderDays;
    if (s.theme === 'dark' || s.theme === 'light') out.theme = s.theme;
  }
  return out;
}

/* =====================================================================
 * 설정 화면
 * ===================================================================== */
function renderSettings(c) {
  c.appendChild(h('div', { class: 'page-head' }, h('div', null, h('h1', null, '설정'), h('p', null, '저장소 상태, 백업과 복원, 화면 설정을 관리합니다.'))));
  const grid = h('div', { class: 'settings' });
  c.appendChild(grid);
  const all = allRecords();
  const bi = backupInfo();

  // 백업
  grid.appendChild(h('div', { class: 'panel' },
    h('h2', null, '백업과 복원'),
    h('dl', { class: 'kv' },
      h('dt', null, '마지막 백업'), h('dd', null, meta.lastBackupAt ? fullDate(meta.lastBackupAt) + ` (${relDate(meta.lastBackupAt)})` : '아직 없음'),
      h('dt', null, '백업 후 변경'), h('dd', null, meta.lastBackupAt ? bi.changedSince + '개 기록' : '—'),
      h('dt', null, '전체 기록'), h('dd', null, `${all.length}개 (휴지통 ${all.filter(r => r.deleted).length}개 포함)`)),
    bi.need ? h('div', { class: 'note-box warn' }, h('b', null, '백업을 권장합니다. '), bi.msg) : null,
    h('p', null, '백업 파일(JSON)에는 스키마 버전, 내보낸 날짜, 모든 기록(휴지통 포함)과 연결 정보, 장르·태그 목록, 화면 설정이 들어 있습니다. 브라우저 저장소가 지워질 수 있으니 정기적으로 백업해 두세요.'),
    h('div', { class: 'btn-row' },
      btn('JSON으로 내보내기', { cls: 'primary', icon: 'download', onClick: () => exportBackup() }),
      canShareFiles() ? btn('공유로 내보내기', { icon: 'share', title: '드라이브·메신저 등 다른 앱으로 백업 파일 보내기', onClick: () => exportBackup({ share: true }) }) : null,
      btn('JSON 파일 불러오기', { icon: 'upload', onClick: openImportPicker }),
      btn('붙여 넣어 불러오기', { cls: 'ghost', title: '복사해 둔 백업 내용(글자)을 붙여 넣어 불러오기', onClick: openPasteImport })),
    h('p', { class: 'hint', style: { marginTop: '8px' } }, '휴대폰에서는 내보낸 파일이 ‘다운로드’ 폴더에 저장됩니다. ‘공유로 내보내기’는 사용자가 고른 앱(예: 드라이브)으로만 파일을 보내며, 소재창고가 자동으로 어디에 올리지는 않습니다.'),
    h('h3', null, 'ID 충돌 처리 방식 (병합 시)'),
    h('div', { class: 'note-box' }, h('ul', { style: { margin: 0 } },
      h('li', null, '기록 ID는 제목과 무관한 고유 값입니다. ID가 같으면 같은 기록으로 보고 사본을 만들지 않습니다.'),
      h('li', null, '최종 수정일이 더 최근인 쪽의 내용을 남기고, 같으면 현재 데이터를 유지합니다.'),
      h('li', null, '관련 기록 연결은 양쪽 것을 합쳐 잃지 않도록 합니다.'),
      h('li', null, '병합은 현재 데이터에만 있는 기록을 지우지 않습니다.'))),
    h('div', { class: 'set-row' },
      h('div', { class: 'lab' }, '백업 알림 주기', h('small', null, '이 기간 동안 백업하지 않고 기록을 바꾸면 안내합니다')),
      settingSelect('backupReminderDays', [[0, '알리지 않음'], [3, '3일'], [7, '7일'], [14, '14일'], [30, '30일']], Number))));

  // 저장소
  const estEl = h('dd', null, '확인 중…');
  const persistEl = h('dd', null, '확인 중…');
  const persistBtnSlot = h('div', { class: 'btn-row' });
  const storageLabel = { indexeddb: 'IndexedDB (브라우저 내장 데이터베이스)', localstorage: 'localStorage (IndexedDB를 쓸 수 없어 대체 사용 중)', memory: '사용 불가 — 메모리에만 보관 중' }[adapter.kind];
  grid.appendChild(h('div', { class: 'panel' },
    h('h2', null, '저장소 상태'),
    h('dl', { class: 'kv' },
      h('dt', null, '저장 방식'), h('dd', null, storageLabel),
      h('dt', null, '실행 위치'), h('dd', null, location.protocol === 'file:' ? '로컬 파일 (file://)' : location.protocol.replace(':', '') + ' 페이지'),
      h('dt', null, '사용량'), estEl,
      h('dt', null, '영구 저장'), persistEl,
      h('dt', null, '스키마 버전'), h('dd', null, String(SCHEMA_VERSION))),
    persistBtnSlot,
    h('div', { class: 'note-box warn' },
      h('b', null, '알아 두세요'),
      h('ul', null,
        h('li', null, '기록은 이 기기의 이 브라우저 안에만 저장되며, 외부 서버로 전송되지 않습니다. 같은 사이트에 접속한 다른 사람은 내 기록을 볼 수 없습니다.'),
        h('li', null, 'PC와 휴대폰 사이에 자동 동기화는 없습니다. 다른 기기로 옮기려면 JSON으로 내보낸 뒤 그 기기에서 불러오세요.'),
        h('li', null, '다른 브라우저, 시크릿 창, 다른 주소(예: 파일로 연 v1.0)에서는 같은 기록이 보이지 않습니다.'),
        h('li', null, '파일로 직접 연(file://) 경우 브라우저 정책에 따라 저장소가 유지되지 않거나 파일 위치를 옮기면 다르게 동작할 수 있습니다.'),
        h('li', null, '브라우저의 ‘인터넷 사용 기록/사이트 데이터 삭제’를 하면 기록이 함께 지워질 수 있습니다.'),
        h('li', null, '따라서 자동 저장만으로 영구 보관이 보장되지는 않습니다. JSON 백업을 함께 사용하세요.')))));
  (async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        const mb = n => (n / 1024 / 1024).toFixed(n > 1024 * 1024 * 10 ? 0 : 2) + 'MB';
        estEl.textContent = e.usage != null ? `${mb(e.usage)} 사용 / 약 ${mb(e.quota || 0)} 가능` : '확인 불가';
      } else estEl.textContent = '이 브라우저에서는 확인할 수 없습니다';
    } catch (_) { estEl.textContent = '확인할 수 없습니다'; }
    try {
      if (navigator.storage && navigator.storage.persisted) {
        const p = await navigator.storage.persisted();
        persistEl.textContent = p ? '허용됨 (브라우저가 임의로 지우지 않도록 요청됨)' : '요청되지 않음';
        if (!p && navigator.storage.persist && adapter.kind !== 'memory') {
          persistBtnSlot.appendChild(btn('브라우저에 영구 저장 요청', { cls: 'sm', title: '저장 공간이 부족할 때 브라우저가 데이터를 자동으로 지우지 않도록 요청합니다', onClick: async () => {
            let ok = false;
            try { ok = await navigator.storage.persist(); } catch (_) {}
            toast(ok ? '영구 저장이 허용되었습니다.' : '브라우저가 요청을 허용하지 않았습니다. 파일로 연 경우나 브라우저 정책에 따라 거절될 수 있습니다.', { kind: ok ? 'ok' : 'warn', duration: 6000 });
            refresh();
          } }));
        }
      } else persistEl.textContent = '이 브라우저에서는 지원하지 않습니다';
    } catch (_) { persistEl.textContent = '확인할 수 없습니다'; }
  })();

  // 앱 설치 · 오프라인
  const standalone = isStandalone();
  const swText = !('serviceWorker' in navigator) ? '이 브라우저는 지원하지 않습니다'
    : location.protocol === 'file:' ? '파일로 연 경우(file://)에는 사용할 수 없습니다'
    : !window.isSecureContext ? 'HTTPS 주소에서만 사용할 수 있습니다'
    : swState.active ? `사용 중 (앱 파일 ${swState.cacheVersion || '캐시'} 저장됨)` : '준비 중…';
  grid.appendChild(h('div', { class: 'panel' },
    h('h2', null, '앱 설치 · 오프라인'),
    h('dl', { class: 'kv' },
      h('dt', null, '실행 방식'), h('dd', null, standalone ? '설치된 앱으로 실행 중' : '브라우저에서 실행 중'),
      h('dt', null, '오프라인 실행'), h('dd', null, swText),
      h('dt', null, '네트워크'), h('dd', null, navigator.onLine ? '온라인' : '오프라인 (기록 작성·편집·검색은 그대로 가능)'),
      h('dt', null, '앱 버전'), h('dd', null, 'v' + APP_VERSION)),
    h('div', { class: 'btn-row' },
      installPrompt ? btn('홈 화면에 설치', { cls: 'primary', icon: 'phone', onClick: promptInstall }) : null,
      swState.reg ? btn('업데이트 확인', { icon: 'refresh', onClick: checkForUpdate }) : null,
      updateReady ? btn('새 버전으로 업데이트', { cls: 'primary', onClick: applyUpdate }) : null),
    !standalone ? h('div', { style: { marginTop: '10px' } }, h('b', { style: { fontSize: '14px' } }, '홈 화면에 추가하는 방법'), h('div', { style: { marginTop: '6px' } }, installGuideContent())) : null,
    h('p', { class: 'hint', style: { marginTop: '8px' } }, '오프라인 기능은 앱 화면 파일만 기기에 보관하는 것이며, 기록은 아래 저장소(IndexedDB)에 따로 저장됩니다. 앱을 업데이트해도 기록은 지워지지 않습니다. 단, 앱을 삭제하거나 브라우저의 사이트 데이터를 지우면 기록도 함께 지워질 수 있습니다.')));

  // 화면
  grid.appendChild(h('div', { class: 'panel' },
    h('h2', null, '화면 설정'),
    h('div', { class: 'set-row' }, h('div', { class: 'lab' }, '테마'), settingSelect('theme', [['dark', '다크 (기본)'], ['light', '라이트']])),
    h('div', { class: 'set-row' }, h('div', { class: 'lab' }, '목록 보기 방식'), settingSelect('viewMode', [['card', '카드'], ['list', '목록']])),
    h('div', { class: 'set-row' }, h('div', { class: 'lab' }, '고정한 기록을 목록 상단에 표시'), settingSelect('pinnedFirst', [['true', '표시'], ['false', '표시하지 않음']], v => v === 'true'))));

  // 예시·정보
  grid.appendChild(h('div', { class: 'panel' },
    h('h2', null, '예시 데이터'),
    h('p', null, '사용법을 익히기 위한 예시 기록 4개(메모·파편·소재·프로젝트, 서로 연결됨)를 추가합니다. 모든 예시에는 ‘[예시]’ 표시와 ‘예시’ 태그가 붙으며, 휴지통으로 지울 수 있습니다.'),
    h('div', { class: 'btn-row' }, btn('예시 데이터 추가', { onClick: addSampleData })),
    h('h3', null, '단축키'),
    h('dl', { class: 'kv' },
      h('dt', null, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Enter')), h('dd', null, '빠른 메모 저장'),
      h('dt', null, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'S')), h('dd', null, '변경 사항 즉시 저장'),
      h('dt', null, h('kbd', null, 'Alt'), '+', h('kbd', null, 'N')), h('dd', null, '빠른 메모 열기'),
      h('dt', null, h('kbd', null, '/')), h('dd', null, '검색창으로 이동'),
      h('dt', null, h('kbd', null, 'Esc')), h('dd', null, '창 닫기 · 검색어 지우기')),
    h('p', { class: 'hint', style: { marginTop: '10px' } }, `소재창고 v${APP_VERSION} · 데이터 스키마 ${SCHEMA_VERSION}`)));
}
function settingSelect(key, options, parse) {
  const cur = String(meta.settings[key]);
  const s = h('select', { class: 'field', 'aria-label': key }, options.map(([v, l]) => h('option', { value: String(v), selected: String(v) === cur }, l)));
  s.addEventListener('change', async () => {
    meta.settings[key] = parse ? parse(s.value) : s.value;
    if (key === 'theme') applyTheme();
    const ok = await saveMeta();
    toast(ok ? '설정을 저장했습니다.' : '설정을 저장하지 못했습니다.', { kind: ok ? 'ok' : 'error' });
    refresh();
  });
  return s;
}
function applyTheme() { document.documentElement.dataset.theme = meta.settings.theme === 'light' ? 'light' : 'dark'; }

/* ---------- 예시 데이터 (사용자가 직접 추가할 때만) ---------- */
async function addSampleData() {
  const ok = await confirmDialog({ title: '예시 데이터 추가', message: '‘[예시]’가 붙은 기록 4개를 추가합니다. 기존 기록에는 영향을 주지 않습니다. 추가할까요?', confirmLabel: '추가' });
  if (!ok) return;
  const proj = createRecord('project', {
    title: '[예시] 순환선', summary: '매일 같은 시각, 같은 칸에 타는 낯선 승객을 쫓는 일상 미스터리 연작',
    genres: ['미스터리', '일상'], tags: ['예시', '연작'], status: 'active',
    body: '예시 프로젝트입니다. 소속 기록과 관련 기록이 어떻게 보이는지 확인해 보세요.',
    fields: { overview: '지하철 2호선을 무대로 한 6화 분량의 단편 연작.', world: '현재의 서울. 순환선이라는 ‘끝나지 않는 노선’이 반복되는 일상을 상징한다.', characters: '서윤 — 출근길마다 같은 승객을 보는 회사원\n낯선 승객 — 7시 42분에만 나타나는 사람', plot: '서윤이 승객의 정체를 추적하며 자신의 반복된 일상을 돌아본다.', episodes: '1화: 7시 42분\n2화: 내리지 않는 역', scenes: '“이 열차는 어디서 끝나요?” “순환선은 끝나지 않아요.”' },
  });
  const idea = createRecord('idea', {
    title: '[예시] 7시 42분의 승객', summary: '매일 같은 열차에 타는 사람이 사실은 하루를 반복하고 있다면?',
    genres: ['미스터리'], tags: ['예시', '반복'], projectId: proj.id,
    fields: { concept: '타인의 반복이 주인공의 반복을 비추는 거울이 된다.', theme: '반복되는 일상 속에서 스스로 선택하는 일', synopsis: '관찰 → 접촉 → 승객의 비밀 → 주인공의 선택', differentiation: '시간 반복을 주인공이 아닌 ‘관찰 대상’에게 둔다.' },
  });
  const frag = createRecord('fragment', {
    title: '[예시] 매일 같은 역에서 내리는 사람', genres: ['미스터리'], tags: ['예시', '일상'],
    body: '출근길에 매번 같은 역에서 내리는 사람이 있다. 어느 날 그 사람이 내리지 않았다.',
    fields: { concept: '익숙한 타인의 작은 변화가 이야기의 시작이 된다.' },
  });
  const memo = createRecord('inbox', { body: '지하철에서 들은 말: “그 사람, 매일 7시 42분 열차에 타.”\n(예시 메모)', tags: ['예시'] });
  frag.links.push(idea.id);
  memo.links.push(frag.id);
  [proj, idea, frag, memo].forEach(r => markDirty(r.id, 0));
  const saved = await flush();
  toast(saved ? '예시 기록 4개를 추가했습니다.' : '예시를 추가했지만 저장하지 못했습니다.', { kind: saved ? 'ok' : 'error' });
  navigate('dashboard');
}

/* =====================================================================
 * 모바일 레이아웃 · PWA
 * ===================================================================== */
let kbTimer = null;
let allowUnload = false;
let installPrompt = null;
let updateReady = false;
let updateRequested = false;
const swState = { reg: null, active: false, cacheVersion: null };

function isTextInput(el) {
  return !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|file|range|color)$/i.test(el.type)));
}
function keepInView(el) {
  if (!document.contains(el) || document.activeElement !== el) return;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const r = el.getBoundingClientRect();
  if (r.height > vh * 0.6) return;   // 긴 입력창은 브라우저가 커서 위치에 맞춰 스크롤한다
  if (r.top < 64 || r.bottom > vh - 8) el.scrollIntoView({ block: 'center' });
}
function syncViewport() {
  const vv = window.visualViewport;
  const s = document.documentElement.style;
  // 백그라운드에서 열리면 높이가 0으로 보고될 수 있다 → 그럴 땐 값을 지워 CSS 기본값(100%)을 쓴다
  const hgt = (vv && vv.height > 120) ? vv.height : window.innerHeight;
  if (hgt > 120) {
    s.setProperty('--vvh', Math.round(hgt) + 'px');
    s.setProperty('--vvt', Math.round(vv && vv.height > 120 ? vv.offsetTop : 0) + 'px');
  } else {
    s.removeProperty('--vvh');
    s.removeProperty('--vvt');
  }
}
function onLayoutChange() {
  closeDrawer();
  if (!isMobile()) closeMobileSearch();
  if (ui.view === 'editor') rerenderEditor(); else refresh();
}
const BOTTOM_NAV = [['dashboard', '홈', 'home'], ['inbox', '메모', 'inbox'], ['__new', '새 기록', 'plus'], ['project', '작품', 'book'], ['__menu', '전체', 'menu']];
function buildBottomNav() {
  const nav = $('#bottom-nav');
  nav.replaceChildren();
  BOTTOM_NAV.forEach(([key, label, ic]) => {
    const b = h('button', { type: 'button', class: 'bn-item' + (key === '__new' ? ' bn-new' : ''), 'data-view': key, title: key === '__menu' ? '전체 메뉴' : label },
      h('span', { class: 'bn-ic' }, icon(ic)), h('span', { class: 'bn-label' }, label));
    b.addEventListener('click', () => {
      if (key === '__new') openNewDialog();
      else if (key === '__menu') openDrawer();
      else navigate(key);
    });
    nav.appendChild(b);
  });
}
function buildSideExtra() {
  const box = $('#side-extra');
  if (!box) return;
  box.replaceChildren();
  appendKids(box, [
    h('div', { class: 'nav-sep' }),
    (() => { const b = h('button', { type: 'button', class: 'nav-item', title: '랜덤 소재 열기' }, icon('shuffle'), h('span', null, '랜덤 소재')); b.addEventListener('click', () => { closeDrawer(); openRandom(); }); return b; })(),
    (() => { const b = h('button', { type: 'button', class: 'nav-item', title: '빠른 메모 작성' }, icon('pen'), h('span', null, '빠른 메모')); b.addEventListener('click', () => { closeDrawer(); openQuickMemo(); }); return b; })(),
    // 설치되지 않았으면 항상 표시: 브라우저가 설치를 허용하면 바로 설치, 아니면 방법 안내
    !isStandalone() ? (() => {
      const label = installPrompt ? '앱으로 설치' : '앱 설치 방법';
      const b = h('button', { type: 'button', class: 'nav-item', title: label }, icon('phone'), h('span', null, label));
      b.addEventListener('click', () => { closeDrawer(); if (installPrompt) promptInstall(); else openInstallGuide(); });
      return b;
    })() : null]);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
// 어떤 브라우저에서 열렸는지 — 앱 안의 브라우저(구글 앱, 카카오톡 등)는 설치와 파일 저장이 막혀 있다
const BROWSER = (() => {
  const ua = navigator.userAgent || '';
  const IN_APP = [[/GSA\//, '구글 앱'], [/KAKAOTALK/i, '카카오톡'], [/NAVER\(inapp/i, '네이버 앱'], [/DaumApps/i, '다음 앱'],
    [/Instagram/i, '인스타그램'], [/FBAN|FBAV|FB_IAB/i, '페이스북'], [/\bLine\//i, '라인'], [/BAND\//i, '밴드'], [/Twitter/i, 'X(트위터)']];
  let inApp = null;
  for (const [re, name] of IN_APP) if (re.test(ua)) { inApp = name; break; }
  const android = /Android/i.test(ua);
  if (!inApp && android && /; wv\)/.test(ua)) inApp = '앱 내부 브라우저';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const samsung = /SamsungBrowser/i.test(ua);
  const chrome = /Chrome\/|CriOS/.test(ua) && !samsung && !/EdgA?\/|OPR\/|Whale\//.test(ua) && !inApp;
  return { inApp, android, ios, samsung, chrome, mobile: android || ios };
})();
let inAppBannerDismissed = false;
function chromeIntentUrl() {
  // 앱 화면 주소(#/…)를 붙이면 Android의 intent 주소 해석이 깨질 수 있어 시작 페이지만 연다
  const u = new URL(location.href);
  const base = u.origin + u.pathname;
  return `intent://${u.host}${u.pathname}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(base)};end`;
}
async function copyAddress() {
  const url = location.href.split('#')[0];
  if (await copyText(url)) toast('주소를 복사했습니다. Chrome(또는 삼성 인터넷) 주소창에 붙여 넣어 여세요.', { kind: 'ok', duration: 6000 });
  else openModal({ title: '주소 복사', content: h('div', null, h('p', null, '아래 주소를 길게 눌러 복사하세요.'), h('pre', { class: 'preview' }, url)), actions: [{ label: '닫기', cls: 'primary', onClick: m => m.close() }] });
}
function openInRealBrowserButtons() {
  return [
    BROWSER.android ? btn('Chrome에서 열기', { cls: 'primary', icon: 'phone', onClick: () => { location.href = chromeIntentUrl(); } }) : null,
    btn('주소 복사', { icon: 'copy', onClick: copyAddress }),
  ];
}
function installGuideContent() {
  if (isStandalone()) return h('p', null, '지금 설치된 앱으로 실행 중입니다. 따로 설치할 필요가 없습니다.');
  if (BROWSER.inApp) {
    return h('div', null,
      h('div', { class: 'note-box warn' }, h('b', null, `지금은 ${BROWSER.inApp} 안의 브라우저로 열려 있습니다. `),
        '이런 화면에서는 ‘앱 설치’ 메뉴가 나타나지 않고, 백업 파일 저장도 막힐 수 있습니다. Chrome이나 삼성 인터넷 같은 일반 브라우저에서 열어 주세요.'),
      h('div', { class: 'btn-row' }, openInRealBrowserButtons()),
      h('p', { class: 'hint', style: { marginTop: '8px' } }, BROWSER.ios ? '아이폰은 Safari에서 열어야 홈 화면에 추가할 수 있습니다. 화면의 공유·메뉴 버튼에서 ‘Safari로 열기’를 찾거나 주소를 복사해 Safari에 붙여 넣으세요.'
        : '‘Chrome에서 열기’가 동작하지 않으면 주소를 복사해 Chrome 주소창에 붙여 넣으세요.'));
  }
  const steps = [];
  if (BROWSER.android && BROWSER.samsung) steps.push('삼성 인터넷: 아래쪽 ≡ 메뉴 → ‘현재 페이지 추가’ → ‘홈 화면’ (주소창 오른쪽에 설치 아이콘이 보이면 그것을 눌러도 됩니다)');
  else if (BROWSER.android) steps.push('Chrome: 오른쪽 위 ⋮ 메뉴 → ‘앱 설치’ 또는 ‘홈 화면에 추가’');
  else if (BROWSER.ios) steps.push('Safari: 아래쪽 공유 버튼 → ‘홈 화면에 추가’ (다른 브라우저에서는 추가할 수 없을 수 있습니다)');
  else steps.push('PC Chrome·Edge: 주소창 오른쪽의 설치 아이콘(모니터에 화살표 모양) 또는 메뉴 → ‘앱 설치’');
  return h('div', null,
    h('ul', { style: { margin: '0 0 8px', paddingLeft: '18px' } }, steps.map(s => h('li', null, s))),
    h('div', { class: 'note-box' },
      h('b', null, '메뉴에 ‘앱 설치’가 보이지 않나요?'),
      h('ul', null,
        h('li', null, '이미 설치했다면 브라우저는 ‘앱 설치’ 대신 ‘앱 열기’를 보여 줍니다. 홈 화면이나 앱 서랍에서 ‘소재창고’ 아이콘을 찾아보세요.'),
        h('li', null, '구글 앱, 카카오톡 등에서 링크를 누르면 그 앱 안의 브라우저로 열려 설치가 안 됩니다. Chrome에서 주소를 직접 여세요.'),
        h('li', null, '처음 접속한 직후에는 설치 메뉴가 늦게 나타날 수 있습니다. 잠시 둘러본 뒤 다시 메뉴를 열어 보세요.'))));
}
function openInstallGuide() {
  openModal({ title: installPrompt ? '앱으로 설치' : '앱 설치 방법', content: h('div', null,
      installPrompt ? h('div', { class: 'btn-row', style: { marginBottom: '10px' } }, btn('지금 설치', { cls: 'primary', icon: 'phone', onClick: () => { modalStack.length && modalStack[modalStack.length - 1].close(); promptInstall(); } })) : null,
      installGuideContent()),
    actions: [{ label: '닫기', cls: 'ghost', onClick: m => m.close() }] });
}
function setupPwa() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();          // 브라우저 기본 배너 대신 메뉴·설정의 설치 버튼으로 안내
    installPrompt = e;
    buildSideExtra();
    if (ui.view === 'settings') refresh();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null; buildSideExtra();
    toast('홈 화면에 설치했습니다. 설치한 앱과 이 사이트는 같은 기록을 사용합니다.', { kind: 'ok' });
  });
  if (!('serviceWorker' in navigator) || location.protocol === 'file:' || !window.isSecureContext) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateRequested) { allowUnload = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    swState.reg = reg;
    const track = w => {
      if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) markUpdateReady(); });
    };
    if (reg.waiting && navigator.serviceWorker.controller) markUpdateReady();
    track(reg.installing);
    reg.addEventListener('updatefound', () => track(reg.installing));
    setInterval(() => { if (navigator.onLine) reg.update().catch(() => {}); }, 60 * 60 * 1000);
  }).catch(e => console.warn('서비스 워커 등록 실패', e));
  navigator.serviceWorker.ready.then(reg => {
    swState.active = true;
    if (reg.active) {
      const ch = new MessageChannel();
      ch.port1.onmessage = e => { swState.cacheVersion = e.data && e.data.version; if (ui.view === 'settings') refresh(); };
      reg.active.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
    }
    if (ui.view === 'settings') refresh();
  });
}
function markUpdateReady() {
  if (updateReady) return;
  updateReady = true;
  renderBanners();
  if (ui.view === 'settings') refresh();
}
function typingInProgress() {   // 저장 전 단계의 입력(빠른 메모 창·대시보드 메모 칸)이 남아 있는지
  return [...document.querySelectorAll('.quick-inline textarea, .modal textarea, .modal input[type=text]')].some(el => el.value.trim());
}
async function applyUpdate() {
  const reg = swState.reg;
  if (!reg || !reg.waiting) { updateReady = false; renderBanners(); toast('적용할 업데이트가 없습니다.'); return; }
  if (typingInProgress()) { toast('작성 중인 빠른 메모가 있습니다. 먼저 저장하거나 닫은 뒤 업데이트해 주세요.', { kind: 'warn' }); return; }
  const ok = await flush();    // 기록을 먼저 저장 — 실패하면 업데이트하지 않는다
  if (!ok) { toast('저장하지 못한 변경 사항이 있어 업데이트를 미뤘습니다: ' + errorText(saveError), { kind: 'error' }); return; }
  updateRequested = true;
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}
async function checkForUpdate() {
  if (!swState.reg) return;
  try {
    await swState.reg.update();
    if (swState.reg.waiting) markUpdateReady();
    toast(swState.reg.waiting || swState.reg.installing ? '새 버전을 찾았습니다. 준비되면 상단에 업데이트 안내가 나타납니다.' : '최신 버전을 사용 중입니다.');
  } catch (_) { toast('업데이트를 확인하지 못했습니다. 인터넷 연결을 확인해 주세요.', { kind: 'warn' }); }
}
async function promptInstall() {
  if (!installPrompt) return;
  const p = installPrompt;
  installPrompt = null;
  try { p.prompt(); await p.userChoice; } catch (_) {}
  buildSideExtra();
  if (ui.view === 'settings') refresh();
}

/* =====================================================================
 * 검색창·전역 이벤트
 * ===================================================================== */
let searchTimer = null;
function clearSearch() {
  const s = $('#search');
  s.value = ''; ui.query = '';
  $('#search-wrap').classList.remove('has-value');
  if (ui.view === 'all') refresh();
}
function setupGlobal() {
  $('#menu-btn').appendChild(icon('menu'));
  $('#search-wrap').insertBefore(icon('search'), $('#search'));
  $('#search-clear').appendChild(icon('x'));
  $('#quick-btn .ic-slot').replaceWith(icon('pen'));
  $('#random-btn .ic-slot').replaceWith(icon('shuffle'));
  $('#search-toggle').appendChild(icon('search'));
  buildNav();
  buildBottomNav();
  buildSideExtra();

  $('#new-btn').addEventListener('click', () => { closeDrawer(); openNewDialog(); });
  $('#quick-btn').addEventListener('click', openQuickMemo);
  $('#random-btn').addEventListener('click', openRandom);
  $('#menu-btn').addEventListener('click', () => { if (document.body.classList.contains('side-open')) closeDrawer(); else openDrawer(); });
  $('#overlay').addEventListener('click', () => closeDrawer());
  $('#search-clear').addEventListener('click', () => { clearSearch(); $('#search').focus(); });
  $('#search-toggle').addEventListener('click', openMobileSearch);
  $('#search').addEventListener('blur', () => { if (isMobile() && !$('#search').value) setTimeout(closeMobileSearch, 150); });

  window.addEventListener('popstate', () => { onPopState().catch(e => console.warn(e)); });
  MOBILE_MQ.addEventListener ? MOBILE_MQ.addEventListener('change', onLayoutChange) : MOBILE_MQ.addListener(onLayoutChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncViewport);
    window.visualViewport.addEventListener('scroll', syncViewport);
  }
  window.addEventListener('resize', syncViewport);
  syncViewport();
  // 모바일: 입력 중에는 하단 메뉴를 숨겨 키보드 위 편집 공간을 넓힌다
  document.addEventListener('focusin', e => {
    if (!isTextInput(e.target)) return;
    clearTimeout(kbTimer);
    document.body.classList.add('kb-open');
    if (isMobile()) setTimeout(() => keepInView(e.target), 320);
  });
  document.addEventListener('focusout', () => {
    clearTimeout(kbTimer);
    kbTimer = setTimeout(() => { if (!isTextInput(document.activeElement)) document.body.classList.remove('kb-open'); }, 120);
  });
  const net = () => { $('#net-badge').hidden = navigator.onLine; };
  window.addEventListener('online', () => { net(); toast('인터넷에 다시 연결되었습니다. 기록은 계속 이 기기에 저장되어 있습니다.', { kind: 'ok' }); if (ui.view === 'settings') refresh(); });
  window.addEventListener('offline', () => { net(); toast('오프라인 상태입니다. 기록 작성·편집·검색은 그대로 할 수 있습니다.', { kind: 'warn' }); if (ui.view === 'settings') refresh(); });
  net();
  window.addEventListener('pagehide', () => { tabs.post({ type: 'bye' }); if (hasUnsaved()) flush(); });

  const s = $('#search');
  s.addEventListener('input', () => {
    $('#search-wrap').classList.toggle('has-value', !!s.value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      ui.query = s.value;
      if (ui.view !== 'all') {
        if (!s.value.trim()) return;
        await navigate('all', { keepQuery: true });
        s.focus();
      } else refresh();
    }, 180);
  });
  s.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); clearSearch(); } });

  $('#import-file').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    handleImportFile(f);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalStack.length) { e.preventDefault(); modalStack[modalStack.length - 1].esc(); return; }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      flush().then(ok => toast(ok ? '저장했습니다.' : '저장 실패: ' + errorText(saveError), { kind: ok ? 'ok' : 'error', duration: 1800 }));
      return;
    }
    if (e.altKey && !e.ctrlKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) { e.preventDefault(); openQuickMemo(); return; }
    if (e.key === '/' && !isTypingTarget(e.target) && !modalStack.length) { e.preventDefault(); s.focus(); }
  });

  window.addEventListener('beforeunload', e => {
    if (allowUnload) return;
    if (hasUnsaved() || saveState === 'error' || (adapter && adapter.kind === 'memory' && store.size)) {
      flush();
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (hasUnsaved()) flush(); }
    else syncViewport();
  });
}

/* =====================================================================
 * 시작
 * ===================================================================== */
async function init() {
  setupGlobal();
  let loaded = null;
  try {
    adapter = await openIdb();
    loaded = await adapter.loadAll();
    // 이전에 localStorage로 대체 저장된 데이터가 있으면 IndexedDB로 합친다 (같은 ID는 최근 수정본 우선)
    let ls = null;
    try { ls = window.localStorage ? readLocalStorageData() : null; } catch (_) {}
    if (ls && Object.keys(ls.records || {}).length) {
      const merged = new Map(loaded.records.map(r => [r.id, r]));
      let moved = 0;
      Object.values(ls.records).map(normalizeRecord).filter(Boolean).forEach(r => {
        const cur = merged.get(r.id);
        if (!cur || r.updatedAt > cur.updatedAt) { merged.set(r.id, r); moved++; }
      });
      const m = loaded.meta || ls.meta || meta;
      const recs = [...merged.values()];
      await adapter.replaceAll(recs, m);
      try {
        localStorage.setItem(LS_KEY + '_migrated_' + Date.now(), localStorage.getItem(LS_KEY));
        localStorage.removeItem(LS_KEY);
      } catch (_) {}
      loaded = { records: recs, meta: m };
      if (moved) storageNotes.push({ kind: 'warn', text: `localStorage에 대체 저장되어 있던 기록 ${moved}개를 IndexedDB로 옮겼습니다.` });
    }
    await adapter.putMeta(Object.assign(clone(meta), loaded.meta || {}, { schemaVersion: SCHEMA_VERSION }));  // 쓰기 가능 여부 확인
  } catch (e) {
    console.warn('IndexedDB 사용 불가', e);
    try {
      adapter = makeLocalStorageAdapter();
      loaded = await adapter.loadAll();
      storageNotes.push({ kind: 'warn', text: 'IndexedDB를 사용할 수 없어 localStorage에 저장합니다 (' + errorText(e) + '). localStorage는 용량이 작으므로(보통 5MB 내외) JSON 백업을 자주 만들어 주세요.' });
    } catch (e2) {
      console.warn('localStorage 사용 불가', e2);
      adapter = makeMemoryAdapter();
      loaded = { records: [], meta: null };
    }
  }
  if (loaded.meta && typeof loaded.meta === 'object') {
    meta = {
      schemaVersion: SCHEMA_VERSION,
      settings: sanitizeSettings(Object.assign({}, DEFAULT_SETTINGS, loaded.meta.settings || {})),
      lastBackupAt: typeof loaded.meta.lastBackupAt === 'string' ? loaded.meta.lastBackupAt : null,
      createdAt: loaded.meta.createdAt || nowISO(),
      deviceId: typeof loaded.meta.deviceId === 'string' ? loaded.meta.deviceId : null,
      tombstones: Array.isArray(loaded.meta.tombstones) ? loaded.meta.tombstones.filter(t => t && typeof t.id === 'string') : [],
      recentIds: Array.isArray(loaded.meta.recentIds) ? loaded.meta.recentIds.filter(x => typeof x === 'string').slice(0, 30) : [],
    };
  }
  if (!meta.deviceId) { meta.deviceId = 'd_' + newId().slice(2); metaDirty = true; }   // v1.0 데이터에는 없던 항목
  let bad = 0;
  (loaded.records || []).forEach(raw => {
    const r = migrateRecord(normalizeRecord(raw), (loaded.meta && loaded.meta.schemaVersion) || 1);
    if (r) { store.set(r.id, r); baseRev.set(r.id, r.rev); } else bad++;
  });
  if (bad) storageNotes.push({ kind: 'warn', text: `형식이 올바르지 않은 저장 항목 ${bad}개를 건너뛰었습니다(저장소에서 지우지는 않았습니다).` });
  applyTheme();
  $('#side-foot').textContent = `v${APP_VERSION} · ${adapter.label}`;
  setSaveState('saved');
  if (metaDirty) flush();
  // 주소의 #/… 에 맞는 화면으로 시작(새로고침해도 같은 화면 유지)
  const start = parseHash(location.hash);
  ui.view = start.view; ui.editId = start.id || null;
  if (start.view === 'editor') ui.prevView = 'dashboard';
  history.replaceState({ cw: 1, idx: 0 }, '', currentHash());
  render();
  tabs.start();
  setupPwa();
  // 설치된 앱으로 실행 중이면 브라우저가 기록을 임의로 지우지 않도록 요청(Chrome은 설치 앱에 대해 묻지 않고 처리)
  if (isStandalone() && navigator.storage && navigator.storage.persist && adapter.kind !== 'memory') {
    navigator.storage.persisted().then(p => { if (!p) navigator.storage.persist(); }).catch(() => {});
  }
}
init().catch(e => {
  console.error(e);
  $('#content').replaceChildren(h('div', { class: 'empty' }, h('h2', null, '프로그램을 시작하지 못했습니다'), h('p', null, String(e && e.message || e))));
});

// 테스트·점검용 읽기 전용 노출
window.__cw = { store, ui, flush, get adapter() { return adapter; }, get saveState() { return saveState; }, planMerge, validateBackup, buildBackup };
})();
