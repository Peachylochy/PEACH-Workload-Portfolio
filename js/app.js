/* ============================================================
   PEACH Workload Portfolio — Main App Controller
   ============================================================ */

var App = (function() {
  'use strict';

  var _currentYear = '2567';
  var _currentPage = '';
  var _theme = 'dark'; // 'dark' | 'light'
  var _profile = {
    name: 'นางสาวธาราทิพย์ สูงขาว',
    position: 'นักวิชาการศึกษา',
    dept: 'กองวิเทศสัมพันธ์ มหาวิทยาลัยมหาสารคาม',
    year: '2567',
    email: '',
    avatar: null, // base64
    apiKey: '',
  };

  // ─── Page Registry ────────────────────────────────────────
  var PAGES = {
    'dashboard':     { title: 'Dashboard', breadcrumb: 'หน้าหลัก', module: function() { return typeof PageDashboard !== 'undefined' ? PageDashboard : null; } },
    'add-workload':  { title: 'เพิ่มภาระงาน', breadcrumb: 'เพิ่มภาระงานใหม่', module: function() { return typeof PageAddWorkload !== 'undefined' ? PageAddWorkload : null; } },
    'all-workloads': { title: 'ภาระงานทั้งหมด', breadcrumb: 'รายการภาระงานทั้งหมด', module: function() { return typeof PageAllWorkloads !== 'undefined' ? PageAllWorkloads : null; } },
    'evidence':      { title: 'คลังหลักฐาน', breadcrumb: 'จัดการไฟล์หลักฐาน', module: function() { return typeof PageEvidence !== 'undefined' ? PageEvidence : null; } },
    'annual-summary':{ title: 'สรุปรายปี', breadcrumb: 'รายงานสรุปประจำปี', module: function() { return typeof PageAnnualSummary !== 'undefined' ? PageAnnualSummary : null; } },
  };

  // ─── INIT ─────────────────────────────────────────────────
  function init() {
    _currentYear = localStorage.getItem('peach_year') || '2567';
    updateYearDisplay();
    initTheme();
    initProfile();

    if (!API.getBaseUrl()) showDemoNotice();

    window.addEventListener('hashchange', onHashChange);
    onHashChange();
  }

  // ─── THEME ────────────────────────────────────────────────
  function initTheme() {
    _theme = localStorage.getItem('peach_theme') || 'dark';
    applyTheme(_theme);
  }

  function applyTheme(theme) {
    _theme = theme;
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    var btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
    localStorage.setItem('peach_theme', theme);
  }

  function toggleTheme() {
    applyTheme(_theme === 'dark' ? 'light' : 'dark');
  }

  // ─── PROFILE ──────────────────────────────────────────────
  function initProfile() {
    var saved = localStorage.getItem('peach_profile');
    if (saved) {
      try { _profile = Object.assign(_profile, JSON.parse(saved)); } catch(e) {}
    }
    renderProfileUI();
  }

  function renderProfileUI() {
    // Sidebar
    var sn = document.getElementById('sidebarOwnerName');
    var sd = document.getElementById('sidebarOwnerDept');
    var sa = document.getElementById('sidebarAvatar');
    if (sn) sn.textContent = _profile.name.replace('นางสาว','').replace('นาย','').replace('นาง','').trim();
    if (sd) sd.textContent = _profile.dept.length > 28 ? _profile.dept.substring(0,28)+'…' : _profile.dept;
    if (sa) {
      if (_profile.avatar) {
        sa.innerHTML = '<img src="'+_profile.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
      } else {
        sa.textContent = _profile.name.charAt(_profile.name.length > 4 ? _profile.name.length - 2 : 0) || 'ท';
      }
    }
    // Header
    var hn = document.getElementById('headerProfileName');
    var ha = document.getElementById('headerAvatarWrap');
    var hi = document.getElementById('headerAvatarInitial');
    if (hn) hn.textContent = _profile.name.replace(/^(นางสาว|นาย|นาง)\s*/,'').split(' ')[0];
    if (_profile.avatar && ha) {
      ha.innerHTML = '<img src="'+_profile.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else if (hi) {
      var initial = _profile.name.replace(/^(นางสาว|นาย|นาง)\s*/,'').charAt(0) || 'ท';
      hi.textContent = initial;
    }
    // Year
    if (_profile.year) {
      _currentYear = _profile.year;
      updateYearDisplay();
    }
  }

  function openProfile() {
    var m = document.getElementById('profileModal');
    if (!m) return;
    document.getElementById('pName').value = _profile.name;
    document.getElementById('pPosition').value = _profile.position;
    document.getElementById('pDept').value = _profile.dept;
    document.getElementById('pYear').value = _profile.year;
    document.getElementById('pEmail').value = _profile.email || '';
    document.getElementById('pApiKey').value = _profile.apiKey || '';
    // Avatar preview
    var zone = document.getElementById('avatarZone');
    var ph = document.getElementById('avatarPlaceholder');
    if (_profile.avatar && zone) {
      zone.innerHTML = '<img src="'+_profile.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else if (ph) { ph.textContent = '👤'; }
    _updateProfilePreview();
    m.style.display = 'flex';
  }

  function _updateProfilePreview() {
    var name = (document.getElementById('pName')||{}).value || _profile.name;
    var pos  = (document.getElementById('pPosition')||{}).value || _profile.position;
    var dept = (document.getElementById('pDept')||{}).value || _profile.dept;
    var pn = document.getElementById('profilePreviewName');
    var pp = document.getElementById('profilePreviewPos');
    var pd = document.getElementById('profilePreviewDept');
    if (pn) pn.textContent = name;
    if (pp) pp.textContent = pos;
    if (pd) pd.textContent = dept.length > 32 ? dept.substring(0,32)+'…' : dept;
  }

  function closeProfile() {
    var m = document.getElementById('profileModal');
    if (m) m.style.display = 'none';
  }

  function saveProfile() {
    _profile.name     = document.getElementById('pName').value.trim() || _profile.name;
    _profile.position = document.getElementById('pPosition').value.trim();
    _profile.dept     = document.getElementById('pDept').value.trim();
    _profile.year     = document.getElementById('pYear').value || '2567';
    _profile.email    = document.getElementById('pEmail').value.trim();
    _profile.apiKey   = document.getElementById('pApiKey').value.trim();

    localStorage.setItem('peach_profile', JSON.stringify(_profile));
    _currentYear = _profile.year;
    localStorage.setItem('peach_year', _currentYear);

    renderProfileUI();
    closeProfile();
    toast('บันทึกโปรไฟล์เรียบร้อย ✅', 'success');

    // Sync to Sheets if API available
    if (API.getBaseUrl()) {
      API.updateProfile(_profile).catch(function(){});
    }
  }

  function onAvatarChange(input) {
    var file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('รูปขนาดเกิน 2MB', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      _profile.avatar = e.target.result;
      var zone = document.getElementById('avatarZone');
      if (zone) zone.innerHTML = '<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    };
    reader.readAsDataURL(file);
  }

  function getProfile() { return _profile; }

  function onHashChange() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    var parts = hash.split('?');
    var page = parts[0];
    var params = {};
    if (parts[1]) {
      parts[1].split('&').forEach(function(pair) {
        var kv = pair.split('=');
        if (kv[0]) params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    navigateTo(page, params);
  }

  // ─── NAVIGATION ───────────────────────────────────────────
  function navigateTo(page, params) {
    if (!PAGES[page]) page = 'dashboard';
    _currentPage = page;

    // Update nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(function(el) {
      el.classList.toggle('active', el.getAttribute('data-page') === page);
    });

    // Update header
    var info = PAGES[page];
    document.getElementById('pageTitle').textContent = info.title;
    document.getElementById('pageBreadcrumb').textContent = info.breadcrumb;

    // Render page
    var container = document.getElementById('pageContent');
    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>กำลังโหลด...</p></div>';

    var mod = info.module();
    if (mod && mod.render) {
      mod.render(container, params || {});
    } else {
      container.innerHTML = '<div class="alert alert-danger">Page not found: ' + page + '</div>';
    }

    // Close mobile sidebar
    closeSidebar();
    window.scrollTo(0, 0);
  }

  // ─── YEAR ─────────────────────────────────────────────────
  function getYear() { return _currentYear; }

  function setYear(y) {
    _currentYear = String(y);
    localStorage.setItem('peach_year', _currentYear);
    updateYearDisplay();
  }

  function updateYearDisplay() {
    var els = ['sidebarYear', 'headerYear'];
    els.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = id === 'headerYear' ? 'ปี พ.ศ. ' + _currentYear : _currentYear;
    });
  }

  // ─── DATE FORMATTING ──────────────────────────────────────
  function formatThaiDate(dateStr) {
    if (!dateStr) return '—';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      var months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      var thaiYear = d.getFullYear() + 543;
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + thaiYear;
    } catch(e) { return dateStr; }
  }

  // ─── TOAST ────────────────────────────────────────────────
  function toast(msg, type) {
    type = type || 'info';
    var icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = '<span>' + (icons[type]||'') + '</span>' +
                  '<span class="toast-message">' + msg + '</span>' +
                  '<span class="toast-close" onclick="this.parentElement.remove()">✕</span>';
    container.appendChild(t);
    setTimeout(function() { if (t.parentElement) t.remove(); }, 4000);
  }

  // ─── WORKLOAD DETAIL MODAL ────────────────────────────────
  function openWorkload(id) {
    var modal = document.getElementById('workloadModal');
    var body  = document.getElementById('workloadModalBody');
    var title = document.getElementById('workloadModalTitle');
    var delBtn = document.getElementById('workloadDeleteBtn');
    var editBtn = document.getElementById('workloadEditBtn');

    body.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    modal.style.display = 'flex';

    // Find in demo data or fetch from API
    var wl = DEMO_DATA.workloads.find(function(w){ return w.id === id; });
    var cats = DEMO_DATA.categories;

    var p;
    if (API.getBaseUrl()) {
      p = Promise.all([API.getWorkload(id), API.getCategories()]).then(function(res) {
        return { w: res[0].data, cats: res[1].data || [] };
      });
    } else {
      p = Promise.resolve({ w: wl, cats: cats });
    }

    p.then(function(data) {
      var w = data.w;
      if (!w) { body.innerHTML = '<div class="alert alert-danger">ไม่พบข้อมูล</div>'; return; }

      var catMap = {};
      (data.cats||[]).forEach(function(c){ catMap[c.id]=c; });
      var cat = catMap[w.category] || {};

      title.textContent = w.title;
      body.innerHTML = `
        <div style="display:grid;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div class="form-label" style="margin-bottom:4px;">หมวดงาน</div>
              <span class="cat-pill" style="background:${cat.color||'#64748b'}22;color:${cat.color||'#94a3b8'};">
                ${cat.icon||'📌'} ${cat.name||w.category}
              </span>
            </div>
            <div>
              <div class="form-label" style="margin-bottom:4px;">สถานะ</div>
              <span class="badge badge-green">${w.status||'—'}</span>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <div class="form-label">วันที่ปฏิบัติงาน</div>
              <div style="font-size:14px;">📅 ${formatThaiDate(w.workDate)}</div>
            </div>
            <div>
              <div class="form-label">ระยะเวลา</div>
              <div style="font-size:14px;font-weight:600;color:var(--accent);">⏱️ ${w.hours||0} ชั่วโมง</div>
            </div>
          </div>
          ${w.detail ? `
          <div>
            <div class="form-label">รายละเอียด</div>
            <div style="font-size:13px;color:var(--text-secondary);padding:12px;background:var(--bg-primary);border-radius:var(--radius-md);line-height:1.7;">${w.detail}</div>
          </div>` : ''}
          <div>
            <div class="form-label">หลักฐานที่แนบ</div>
            <span class="badge badge-purple">📎 ${w.evidenceCount||0} ไฟล์</span>
          </div>
        </div>
      `;

      delBtn.onclick = function() {
        if (!confirm('ลบภาระงานนี้ใช่หรือไม่?')) return;
        var dp = API.getBaseUrl() ? API.deleteWorkload(id) : Promise.resolve({ success:true });
        dp.then(function() {
          closeWorkloadModal();
          toast('ลบเรียบร้อย', 'success');
          if (_currentPage === 'all-workloads' && typeof PageAllWorkloads !== 'undefined') {
            PageAllWorkloads.render(document.getElementById('pageContent'), {});
          }
        });
      };
      editBtn.onclick = function() {
        closeWorkloadModal();
        navigate('add-workload', { edit: id });
      };
    }).catch(function(err) {
      body.innerHTML = '<div class="alert alert-danger">⚠️ ' + err.message + '</div>';
    });
  }

  // ─── SETTINGS ─────────────────────────────────────────────
  function openSettings() {
    var el = document.getElementById('settingsApiUrl');
    if (el) el.value = API.getBaseUrl() || '';
    var ye = document.getElementById('settingsYear');
    if (ye) ye.value = _currentYear;
    document.getElementById('settingsModal').style.display = 'flex';
  }

  function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
  }

  function saveSettings() {
    var url = (document.getElementById('settingsApiUrl').value || '').trim();
    var year = document.getElementById('settingsYear').value || '2567';
    API.setBaseUrl(url);
    setYear(year);
    closeSettings();
    toast('บันทึกการตั้งค่าเรียบร้อย ✅', 'success');
    if (url) {
      setTimeout(function() { navigateTo(_currentPage, {}); }, 500);
    }
  }

  // ─── DEMO NOTICE ──────────────────────────────────────────
  function showDemoNotice() {
    var container = document.getElementById('pageContent');
    // We'll just show a subtle notice when first loading
    setTimeout(function() {
      if (!API.getBaseUrl()) {
        toast('🎭 Demo Mode — ตั้งค่า API URL ใน ⚙️ ตั้งค่าระบบ เพื่อใช้งานจริง', 'info');
      }
    }, 1500);
  }

  // ─── SIDEBAR MOBILE ───────────────────────────────────────
  function toggleSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('mobileOverlay');
    if (sb.classList.contains('open')) {
      sb.classList.remove('open');
      ov.style.display = 'none';
    } else {
      sb.classList.add('open');
      ov.style.display = 'block';
    }
  }

  function closeSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('mobileOverlay');
    sb.classList.remove('open');
    ov.style.display = 'none';
  }

  // Public API
  return {
    init: init,
    getYear: getYear,
    formatThaiDate: formatThaiDate,
    toast: toast,
    openWorkload: openWorkload,
    toggleTheme: toggleTheme,
    openProfile: openProfile,
    closeProfile: closeProfile,
    saveProfile: saveProfile,
    onAvatarChange: onAvatarChange,
    getProfile: getProfile,
  };
})();

// ─── Global helpers (called from HTML) ──────────────────────
function navigate(page, params) {
  var hash = page;
  if (params && Object.keys(params).length) {
    var qs = Object.keys(params).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    hash += '?' + qs;
  }
  if (window.location.hash === '#' + hash) {
    // Same page — force re-render
    App.init && App.init();
  } else {
    window.location.hash = hash;
  }
}

function toggleSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('mobileOverlay');
  if (!sb) return;
  if (sb.classList.contains('open')) { sb.classList.remove('open'); if(ov) ov.style.display='none'; }
  else { sb.classList.add('open'); if(ov) ov.style.display='block'; }
}
function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('mobileOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.style.display = 'none';
}

function openSettings() {
  var el = document.getElementById('settingsApiUrl');
  if (el) el.value = API.getBaseUrl() || '';
  document.getElementById('settingsModal').style.display = 'flex';
}
function closeSettings() {
  document.getElementById('settingsModal').style.display = 'none';
}
function saveSettings() {
  var url = (document.getElementById('settingsApiUrl').value || '').trim();
  var year = (document.getElementById('settingsYear') || {}).value || '2567';
  API.setBaseUrl(url);
  localStorage.setItem('peach_year', year);
  closeSettings();
  App.toast('บันทึกการตั้งค่าเรียบร้อย ✅', 'success');
  if (url) setTimeout(function() { window.location.reload(); }, 800);
}

function closeWorkloadModal() {
  document.getElementById('workloadModal').style.display = 'none';
}

// ─── BOOT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  App.init();
});
