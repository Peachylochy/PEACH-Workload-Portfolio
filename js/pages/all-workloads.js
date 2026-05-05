/* ============================================================
   All Workloads Page
   ============================================================ */
var PageAllWorkloads = (function() {
  'use strict';

  var _workloads = [];
  var _filtered  = [];
  var _categories = [];
  var _page = 1;
  var _perPage = 15;
  var _search = '';
  var _catFilter = '';
  var _statusFilter = '';
  var _monthFilter = '';

  var MONTH_NAMES = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  function render(container, params) {
    _page = 1; _search = ''; _catFilter = ''; _statusFilter = ''; _monthFilter = '';
    container.innerHTML = getTemplate();
    loadData();
  }

  function getTemplate() {
    return `
      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="searchInput" placeholder="ค้นหาภาระงาน..."
                 oninput="PageAllWorkloads.onSearch(this.value)">
        </div>
        <select class="filter-select" id="catFilter" onchange="PageAllWorkloads.onCatFilter(this.value)">
          <option value="">หมวดทั้งหมด</option>
        </select>
        <select class="filter-select" id="monthFilter" onchange="PageAllWorkloads.onMonthFilter(this.value)">
          <option value="">เดือนทั้งหมด</option>
          ${Array.from({length:12},function(_,i){ var m=i+1; return '<option value="'+m+'">'+MONTH_NAMES[m]+'</option>'; }).join('')}
        </select>
        <select class="filter-select" id="statusFilter" onchange="PageAllWorkloads.onStatusFilter(this.value)">
          <option value="">สถานะทั้งหมด</option>
          <option value="เสร็จสิ้น">✅ เสร็จสิ้น</option>
          <option value="กำลังดำเนินการ">🔄 กำลังดำเนิน</option>
          <option value="รอดำเนินการ">⏳ รอดำเนิน</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="navigate('add-workload')">➕ เพิ่ม</button>
      </div>

      <!-- Stats Bar -->
      <div id="statsBar" style="margin-bottom:16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <span style="font-size:13px;color:var(--text-muted);">กำลังโหลด...</span>
      </div>

      <!-- Table -->
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อภาระงาน</th>
                <th>หมวด</th>
                <th>วันที่</th>
                <th>ชม.</th>
                <th>สถานะ</th>
                <th>หลักฐาน</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody id="tableBody">
              <tr><td colspan="8">
                <div class="loading-state" style="padding:40px;">
                  <div class="spinner"></div><p>กำลังโหลดข้อมูล...</p>
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
        <div id="pagination" style="padding:16px 20px;border-top:1px solid var(--border);"></div>
      </div>
    `;
  }

  function loadData() {
    var useApi = !!API.getBaseUrl();
    var wP = useApi ? API.listWorkloads({ year: App.getYear() }) : Promise.resolve({ success: true, data: DEMO_DATA.workloads });
    var cP = useApi ? API.getCategories() : Promise.resolve({ success: true, data: DEMO_DATA.categories });

    Promise.all([wP, cP]).then(function(res) {
      _workloads  = res[0].data || [];
      _categories = res[1].data || [];

      // Populate cat filter
      var catSel = document.getElementById('catFilter');
      if (catSel) {
        _categories.forEach(function(c) {
          var opt = document.createElement('option');
          opt.value = c.id; opt.textContent = c.icon + ' ' + c.name;
          catSel.appendChild(opt);
        });
      }
      applyFilters();
    }).catch(function(err) {
      document.getElementById('tableBody').innerHTML =
        '<tr><td colspan="8"><div class="alert alert-danger" style="margin:20px;">⚠️ ' + err.message + '</div></td></tr>';
    });
  }

  function applyFilters() {
    _filtered = _workloads.filter(function(w) {
      var matchSearch = !_search || (w.title + ' ' + w.detail).toLowerCase().includes(_search.toLowerCase());
      var matchCat    = !_catFilter || w.category === _catFilter;
      var matchStatus = !_statusFilter || w.status === _statusFilter;
      var matchMonth  = !_monthFilter || String(w.month) === String(_monthFilter);
      return matchSearch && matchCat && matchStatus && matchMonth;
    });
    _page = 1;
    renderTable();
    renderStats();
  }

  function renderStats() {
    var el = document.getElementById('statsBar');
    if (!el) return;
    var totalHours = _filtered.reduce(function(s,w){ return s + (parseFloat(w.hours)||0); }, 0);
    el.innerHTML = `
      <span class="badge badge-cyan">📋 ${_filtered.length} รายการ</span>
      <span class="badge badge-green">⏱️ ${totalHours.toFixed(0)} ชั่วโมง</span>
      ${_workloads.length !== _filtered.length ? '<span class="badge badge-yellow">🔍 กรองจาก '+ _workloads.length +' รายการ</span>' : ''}
    `;
  }

  function renderTable() {
    var el = document.getElementById('tableBody');
    if (!el) return;

    var catMap = {};
    _categories.forEach(function(c) { catMap[c.id] = c; });

    var start = (_page - 1) * _perPage;
    var pageData = _filtered.slice(start, start + _perPage);

    if (!pageData.length) {
      el.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🔍</div><p>ไม่พบข้อมูล</p><div class="sub">ลองเปลี่ยนตัวกรองหรือค้นหาใหม่</div></div></td></tr>';
      renderPagination();
      return;
    }

    el.innerHTML = pageData.map(function(w, i) {
      var cat = catMap[w.category] || {};
      var statusBadge = {
        'เสร็จสิ้น': 'badge-green',
        'กำลังดำเนินการ': 'badge-cyan',
        'รอดำเนินการ': 'badge-yellow',
      }[w.status] || 'badge-gray';

      var dateStr = App.formatThaiDate(w.workDate);
      var rowNum = start + i + 1;

      return `<tr>
        <td class="muted" style="font-size:11px;">${rowNum}</td>
        <td>
          <div style="font-weight:500;max-width:320px;">${w.title}</div>
          ${w.detail ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px;">' + w.detail.substring(0,80) + (w.detail.length>80?'...':'') + '</div>' : ''}
        </td>
        <td>
          <span class="cat-pill" style="background:${cat.color||'#64748b'}22;border-color:${cat.color||'#64748b'}44;color:${cat.color||'#94a3b8'};">
            ${cat.icon||'📌'} ${cat.name||w.category}
          </span>
        </td>
        <td class="muted" style="white-space:nowrap;">${dateStr}</td>
        <td style="font-weight:600;color:var(--accent);">${parseFloat(w.hours)||0}h</td>
        <td><span class="badge ${statusBadge}">${w.status||'—'}</span></td>
        <td class="muted">${w.evidenceCount > 0 ? '<span class="badge badge-purple">📎 '+w.evidenceCount+'</span>' : '—'}</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-icon btn-sm" title="ดูรายละเอียด" onclick="App.openWorkload('${w.id}')">👁️</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="แก้ไข" onclick="navigate('add-workload',{edit:'${w.id}'})">✏️</button>
            <button class="btn btn-ghost btn-icon btn-sm" title="ลบ" onclick="PageAllWorkloads.deleteItem('${w.id}','${w.title.replace(/'/g,"\\'")}')">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    renderPagination();
  }

  function renderPagination() {
    var el = document.getElementById('pagination');
    if (!el) return;
    var total = _filtered.length;
    var pages = Math.ceil(total / _perPage);
    if (pages <= 1) { el.innerHTML = ''; return; }

    var start = Math.max(1, _page - 2);
    var end   = Math.min(pages, _page + 2);
    var html  = '<div class="pagination">';

    if (_page > 1) html += '<div class="page-num" onclick="PageAllWorkloads.goPage(' + (_page-1) + ')">‹</div>';
    for (var p = start; p <= end; p++) {
      html += '<div class="page-num' + (p===_page?' active':'') + '" onclick="PageAllWorkloads.goPage(' + p + ')">' + p + '</div>';
    }
    if (_page < pages) html += '<div class="page-num" onclick="PageAllWorkloads.goPage(' + (_page+1) + ')">›</div>';
    html += '<span style="font-size:12px;color:var(--text-muted);margin-left:8px;">' + total + ' รายการ</span>';
    html += '</div>';
    el.innerHTML = html;
  }

  function deleteItem(id, title) {
    if (!confirm('ลบภาระงาน "' + title + '" ใช่หรือไม่?')) return;
    var p = API.getBaseUrl() ? API.deleteWorkload(id) : Promise.resolve({ success: true });
    p.then(function(res) {
      if (res.success !== false) {
        _workloads = _workloads.filter(function(w) { return w.id !== id; });
        applyFilters();
        App.toast('ลบภาระงานเรียบร้อย', 'success');
      } else {
        App.toast('เกิดข้อผิดพลาด', 'error');
      }
    });
  }

  return {
    render: render,
    deleteItem: deleteItem,
    goPage: function(p) { _page = p; renderTable(); window.scrollTo(0,0); },
    onSearch: function(v) { _search = v; applyFilters(); },
    onCatFilter: function(v) { _catFilter = v; applyFilters(); },
    onStatusFilter: function(v) { _statusFilter = v; applyFilters(); },
    onMonthFilter: function(v) { _monthFilter = v; applyFilters(); },
  };
})();
