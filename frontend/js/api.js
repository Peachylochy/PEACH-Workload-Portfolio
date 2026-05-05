/* ============================================================
   PEACH Workload Portfolio — API Client
   ============================================================ */

var API = (function() {
  'use strict';

  var _baseUrl = '';

  function getBaseUrl() {
    if (_baseUrl) return _baseUrl;
    _baseUrl = localStorage.getItem('peach_api_url') || '';
    return _baseUrl;
  }

  function setBaseUrl(url) {
    _baseUrl = url;
    localStorage.setItem('peach_api_url', url);
  }

  // ─── GET Request ────────────────────────────────────────
  function get(resource, params) {
    var url = getBaseUrl();
    if (!url) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API URL'));

    var qs = 'resource=' + encodeURIComponent(resource);
    if (params) {
      Object.keys(params).forEach(function(k) {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }
      });
    }
    var fullUrl = url + '?' + qs;

    return fetch(fullUrl)
      .then(function(res) { return res.json(); })
      .catch(function(err) { throw new Error('GET error: ' + err.message); });
  }

  // ─── POST Request ────────────────────────────────────────
  function post(resource, action, data) {
    var url = getBaseUrl();
    if (!url) return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API URL'));

    var body = Object.assign({ resource: resource, action: action }, data || {});

    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'text/plain' } // GAS workaround
    })
    .then(function(res) { return res.json(); })
    .catch(function(err) { throw new Error('POST error: ' + err.message); });
  }

  // ─── WORKLOADS ────────────────────────────────────────────
  function listWorkloads(filters) {
    return get('workloads', filters);
  }
  function getWorkload(id) {
    return get('workloads', { action: 'get', id: id });
  }
  function createWorkload(data) {
    return post('workloads', 'create', data);
  }
  function updateWorkload(data) {
    return post('workloads', 'update', data);
  }
  function deleteWorkload(id) {
    return post('workloads', 'delete', { id: id });
  }

  // ─── EVIDENCE ─────────────────────────────────────────────
  function listEvidence(params) {
    return get('evidence', params);
  }
  function createEvidence(data) {
    return post('evidence', 'create', data);
  }
  function deleteEvidence(id) {
    return post('evidence', 'delete', { id: id });
  }

  // ─── CATEGORIES ───────────────────────────────────────────
  var _catCache = null;
  function getCategories() {
    if (_catCache) return Promise.resolve(_catCache);
    return get('categories').then(function(res) {
      _catCache = res;
      return res;
    });
  }

  // ─── DASHBOARD ────────────────────────────────────────────
  function getDashboard(year) {
    return get('dashboard', { year: year });
  }

  // ─── ANNUAL SUMMARY ───────────────────────────────────────
  function getAnnualSummary(year) {
    return get('annual-summary', { year: year });
  }

  // ─── SETTINGS ─────────────────────────────────────────────
  function getSettings() {
    return get('settings');
  }

  // ─── SEED DATA ────────────────────────────────────────────
  function seed() {
    return post('seed', 'seed', {});
  }

  // ─── INIT SHEETS ──────────────────────────────────────────
  function init() {
    return post('init', 'init', {});
  }

  return {
    getBaseUrl: getBaseUrl,
    setBaseUrl: setBaseUrl,
    listWorkloads: listWorkloads,
    getWorkload: getWorkload,
    createWorkload: createWorkload,
    updateWorkload: updateWorkload,
    deleteWorkload: deleteWorkload,
    listEvidence: listEvidence,
    createEvidence: createEvidence,
    deleteEvidence: deleteEvidence,
    getCategories: getCategories,
    getDashboard: getDashboard,
    getAnnualSummary: getAnnualSummary,
    getSettings: getSettings,
    seed: seed,
    init: init,
  };
})();

/* ─── DEMO MODE (ไม่มี API URL) ────────────────────────────── */
var DEMO_DATA = (function() {
  var categories = [
    { id:'CAT01', name:'การต้อนรับแขกต่างชาติ', icon:'🤝', color:'#06b6d4' },
    { id:'CAT02', name:'การจัดทำ MOU/MOA',       icon:'📝', color:'#8b5cf6' },
    { id:'CAT03', name:'การประสานงานทุน',         icon:'🎓', color:'#f59e0b' },
    { id:'CAT04', name:'การแปลเอกสาร',           icon:'🌐', color:'#10b981' },
    { id:'CAT05', name:'การจัดอบรม/สัมมนา',      icon:'📚', color:'#f97316' },
    { id:'CAT06', name:'การประชุมวิเทศสัมพันธ์', icon:'🏛️', color:'#ec4899' },
    { id:'CAT07', name:'งานโครงการแลกเปลี่ยน',   icon:'✈️', color:'#14b8a6' },
    { id:'CAT08', name:'ดูแลนักศึกษาต่างชาติ',   icon:'🌏', color:'#a78bfa' },
    { id:'CAT09', name:'จัดทำเอกสาร/รายงาน',     icon:'📄', color:'#34d399' },
    { id:'CAT10', name:'การพัฒนาตนเอง',          icon:'⭐', color:'#fb7185' },
    { id:'CAT11', name:'งานธุรการวิเทศ',          icon:'🗂️', color:'#60a5fa' },
    { id:'CAT12', name:'อื่นๆ',                  icon:'📌', color:'#94a3b8' },
  ];

  var workloads = [
    { id:'w01', title:'ต้อนรับคณะจาก Xiamen University', category:'CAT01',
      detail:'ต้อนรับและบรรยายสรุปโครงการความร่วมมือ', workDate:'2024-01-10', hours:8, year:'2567', month:1, status:'เสร็จสิ้น', evidenceCount:2 },
    { id:'w02', title:'จัดทำร่าง MOU กับ Zhejiang Normal University', category:'CAT02',
      detail:'ร่าง MOU ฉบับภาษาอังกฤษ ประสานงานกับฝ่ายกฎหมาย', workDate:'2024-01-15', hours:12, year:'2567', month:1, status:'เสร็จสิ้น', evidenceCount:1 },
    { id:'w03', title:'จัดอบรม Academic English Writing', category:'CAT05',
      detail:'จัดอบรมภาษาอังกฤษเชิงวิชาการ 2 วัน', workDate:'2024-02-12', hours:16, year:'2567', month:2, status:'เสร็จสิ้น', evidenceCount:3 },
    { id:'w04', title:'จัดทำรายงานประจำปี 2566', category:'CAT09',
      detail:'รวบรวมและวิเคราะห์ข้อมูลผลการดำเนินงาน', workDate:'2024-02-20', hours:20, year:'2567', month:2, status:'เสร็จสิ้น', evidenceCount:1 },
    { id:'w05', title:'ลงนาม MOU กับ Zhejiang Normal University', category:'CAT02',
      detail:'เตรียมพิธีลงนาม MOU จัดทำเอกสาร', workDate:'2024-03-12', hours:12, year:'2567', month:3, status:'เสร็จสิ้น', evidenceCount:4 },
    { id:'w06', title:'จัดโครงการ English Camp', category:'CAT05',
      detail:'จัดค่ายภาษาอังกฤษ 3 วัน 2 คืน นักศึกษา 60 คน', workDate:'2024-05-06', hours:24, year:'2567', month:5, status:'เสร็จสิ้น', evidenceCount:5 },
    { id:'w07', title:'ต้อนรับ Visiting Professor จาก Seoul National University', category:'CAT01',
      detail:'ต้อนรับ Prof. Kim และคณะ จัดเตรียมห้องพัก', workDate:'2024-05-13', hours:6, year:'2567', month:5, status:'เสร็จสิ้น', evidenceCount:2 },
    { id:'w08', title:'จัดอบรม IELTS Preparation Workshop', category:'CAT05',
      detail:'จัดอบรมเตรียมความพร้อม IELTS สำหรับนักศึกษา 40 คน', workDate:'2024-10-14', hours:16, year:'2567', month:10, status:'เสร็จสิ้น', evidenceCount:2 },
    { id:'w09', title:'จัดงาน International Day 2024', category:'CAT05',
      detail:'จัดงาน International Day 2024 ผู้เข้าร่วม 500+ คน', workDate:'2024-12-02', hours:24, year:'2567', month:12, status:'เสร็จสิ้น', evidenceCount:6 },
    { id:'w10', title:'จัดทำรายงานประจำปี 2567 ฉบับสมบูรณ์', category:'CAT09',
      detail:'จัดทำรายงานฉบับสมบูรณ์พร้อมภาพถ่ายกิจกรรม', workDate:'2024-12-16', hours:24, year:'2567', month:12, status:'เสร็จสิ้น', evidenceCount:1 },
  ];

  function buildByMonth() {
    var bm = {};
    for (var m = 1; m <= 12; m++) bm[m] = 0;
    workloads.forEach(function(w) { bm[w.month] = (bm[w.month] || 0) + 1; });
    return bm;
  }

  function buildByCat() {
    var bc = {};
    workloads.forEach(function(w) { bc[w.category] = (bc[w.category] || 0) + 1; });
    return bc;
  }

  return {
    categories: categories,
    workloads: workloads,
    dashboard: {
      year: '2567', totalWorkloads: workloads.length,
      totalHours: workloads.reduce(function(s,w){ return s + w.hours; }, 0),
      completed: workloads.length, inProgress: 0, pending: 0,
      totalEvidence: workloads.reduce(function(s,w){ return s + w.evidenceCount; }, 0),
      byMonth: buildByMonth(), byCat: buildByCat(),
      recent: workloads.slice(0,5)
    }
  };
})();
