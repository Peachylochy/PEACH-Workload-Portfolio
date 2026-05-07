/* ============================================================
   Annual Summary Page
   ============================================================ */
var PageAnnualSummary = (function() {
  'use strict';

  var _year = '2567';
  var _data = null;
  var _charts = {};

  var MONTH_TH = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

  function render(container, params) {
    _year = (params && params.year) || App.getYear();
    container.innerHTML = getTemplate();
    loadData();
  }

  function getTemplate() {
    return `
      <!-- Year Selector + Export Dropdown -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div class="year-selector">
          <button class="year-btn" onclick="PageAnnualSummary.changeYear(-1)">‹</button>
          <div class="year-display" id="yearDisplay">${_year}</div>
          <button class="year-btn" onclick="PageAnnualSummary.changeYear(1)">›</button>
          <span style="font-size:13px;color:var(--text-muted);">ปีงบประมาณ พ.ศ.</span>
        </div>

        <!-- Export Dropdown -->
        <div style="position:relative;" id="exportDropdownWrap">
          <button class="btn btn-secondary btn-sm" onclick="PageAnnualSummary.toggleExportMenu(event)">
            📥 Export ▾
          </button>
          <div id="exportMenu" style="display:none;position:absolute;right:0;top:calc(100% + 6px);
               background:var(--bg-card);border:1px solid var(--border);border-radius:10px;
               min-width:180px;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,0.35);overflow:hidden;">
            <div class="export-menu-item" onclick="PageAnnualSummary.exportPDF()">
              📄 <span>PDF (พิมพ์/บันทึก)</span>
            </div>
            <div class="export-menu-item" onclick="PageAnnualSummary.exportExcel()">
              📊 <span>Excel (.xlsx)</span>
            </div>
            <div class="export-menu-item" onclick="PageAnnualSummary.exportWord()">
              📝 <span>Word (.doc)</span>
            </div>
            <div style="border-top:1px solid var(--border);"></div>
            <div class="export-menu-item" onclick="PageAnnualSummary.printReport()">
              🖨️ <span>พิมพ์</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div id="summaryContent">
        <div class="loading-state"><div class="spinner"></div><p>กำลังโหลดข้อมูลปี ${_year}...</p></div>
      </div>
    `;
  }

  function loadData() {
    var useApi = !!API.getBaseUrl();
    var p = useApi ? API.getAnnualSummary(_year) : Promise.resolve({ success: true, data: _buildDemoSummary() });

    p.then(function(res) {
      _data = res.data;
      renderSummary(_data);
    }).catch(function(err) {
      document.getElementById('summaryContent').innerHTML =
        '<div class="alert alert-danger">⚠️ ' + err.message + '</div>';
    });
  }

  function _buildDemoSummary() {
    var wl = DEMO_DATA.workloads;
    var cats = DEMO_DATA.categories;
    var monthly = [];
    for (var m = 1; m <= 12; m++) {
      var mwl = wl.filter(function(w){ return w.month === m; });
      monthly.push({ month:m, monthName:MONTH_TH[m], count:mwl.length,
        hours:mwl.reduce(function(s,w){ return s+(w.hours||0); },0) });
    }
    var summary = cats.map(function(c) {
      var cw = wl.filter(function(w){ return w.category === c.id; });
      return { categoryId:c.id, categoryName:c.name, icon:c.icon, color:c.color,
               count:cw.length, hours:cw.reduce(function(s,w){ return s+(w.hours||0); },0), items:cw };
    }).filter(function(s){ return s.count > 0; });

    return {
      year: _year,
      total: wl.length,
      totalHours: wl.reduce(function(s,w){ return s+(w.hours||0); },0),
      summary: summary,
      monthly: monthly,
      allWorkloads: wl
    };
  }

  function renderSummary(d) {
    var el = document.getElementById('summaryContent');
    if (!el || !d) return;

    el.innerHTML = `
      <!-- Hero Stats -->
      <div class="stat-grid" style="margin-bottom:24px;">
        <div class="stat-card cyan">
          <span class="stat-icon">📋</span>
          <div class="stat-label">ภาระงานทั้งหมด ปี ${d.year}</div>
          <div class="stat-value cyan">${d.total}</div>
          <div class="stat-sub">รายการ</div>
        </div>
        <div class="stat-card green">
          <span class="stat-icon">⏱️</span>
          <div class="stat-label">ชั่วโมงรวม</div>
          <div class="stat-value green">${(d.totalHours||0).toFixed(0)}</div>
          <div class="stat-sub">ชั่วโมงการทำงาน</div>
        </div>
        <div class="stat-card yellow">
          <span class="stat-icon">📊</span>
          <div class="stat-label">เฉลี่ยต่อเดือน</div>
          <div class="stat-value yellow">${(d.total/12).toFixed(1)}</div>
          <div class="stat-sub">รายการ/เดือน</div>
        </div>
        <div class="stat-card purple">
          <span class="stat-icon">🏷️</span>
          <div class="stat-label">หมวดงานที่ทำ</div>
          <div class="stat-value purple">${(d.summary||[]).length}</div>
          <div class="stat-sub">จาก 12 หมวด</div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom:24px;">
        <div class="chart-container">
          <div class="card-title"><span class="icon">📅</span>ภาระงานรายเดือน</div>
          <canvas id="summaryMonthChart"></canvas>
        </div>
        <div class="chart-container">
          <div class="card-title"><span class="icon">⏱️</span>ชั่วโมงรายเดือน</div>
          <canvas id="summaryHoursChart"></canvas>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="grid-12" style="margin-bottom:24px;">
        <div class="card">
          <div class="card-title"><span class="icon">🏷️</span>สรุปตามหมวดงาน</div>
          <div id="catBreakdown"></div>
        </div>
        <div class="chart-container">
          <div class="card-title"><span class="icon">🥧</span>สัดส่วน</div>
          <canvas id="summaryPieChart"></canvas>
        </div>
      </div>

      <!-- Monthly Table -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-title"><span class="icon">📆</span>ตารางสรุปรายเดือน</div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>เดือน</th>
                <th>จำนวนภาระงาน</th>
                <th>ชั่วโมง</th>
                <th>สัดส่วน</th>
              </tr>
            </thead>
            <tbody id="monthlyTableBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Full Workload List -->
      <div class="card">
        <div class="card-title" style="justify-content:space-between;">
          <span><span class="icon">📋</span>ภาระงานทั้งหมด ปี ${d.year}</span>
          <span class="badge badge-cyan">${d.total} รายการ</span>
        </div>
        <div id="fullWorkloadList"></div>
      </div>
    `;

    setTimeout(function() {
      renderCharts(d);
      renderCatBreakdown(d.summary || []);
      renderMonthlyTable(d.monthly || []);
      renderFullList(d.allWorkloads || []);
    }, 50);
  }

  function renderCharts(d) {
    var monthly = d.monthly || [];
    var labels = monthly.map(function(m) { return MONTH_TH[m.month].substring(0,3); });
    var counts = monthly.map(function(m) { return m.count; });
    var hours  = monthly.map(function(m) { return m.hours; });

    var chartOpts = {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid:{ color:'#2A3549' }, ticks:{ color:'#94A3B8', font:{ family:'Prompt', size:11 } } },
        y: { grid:{ color:'#2A3549' }, ticks:{ color:'#94A3B8', font:{ family:'Prompt' } }, beginAtZero:true }
      }
    };

    var ctxM = document.getElementById('summaryMonthChart');
    if (ctxM) {
      if (_charts.month) _charts.month.destroy();
      _charts.month = new Chart(ctxM, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: counts, backgroundColor: 'rgba(34,211,238,0.25)', borderColor:'#22D3EE', borderWidth:2, borderRadius:4 }] },
        options: chartOpts
      });
    }

    var ctxH = document.getElementById('summaryHoursChart');
    if (ctxH) {
      if (_charts.hours) _charts.hours.destroy();
      _charts.hours = new Chart(ctxH, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: hours, borderColor:'#A78BFA', backgroundColor:'rgba(167,139,250,0.1)', tension:0.4, fill:true, pointBackgroundColor:'#A78BFA', pointRadius:4 }] },
        options: chartOpts
      });
    }

    var summary = (d.summary||[]).filter(function(s){ return s.count > 0; });
    var ctxP = document.getElementById('summaryPieChart');
    if (ctxP && summary.length) {
      if (_charts.pie) _charts.pie.destroy();
      _charts.pie = new Chart(ctxP, {
        type: 'doughnut',
        data: {
          labels: summary.map(function(s){ return s.categoryName; }),
          datasets: [{
            data: summary.map(function(s){ return s.count; }),
            backgroundColor: summary.map(function(s){ return (s.color||'#22D3EE')+'99'; }),
            borderColor: summary.map(function(s){ return s.color||'#22D3EE'; }),
            borderWidth: 2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true, cutout:'55%',
          plugins: { legend: { position:'bottom', labels:{ color:'#94A3B8', font:{ family:'Prompt', size:10 }, padding:8, boxWidth:10 } } }
        }
      });
    }
  }

  function renderCatBreakdown(summary) {
    var el = document.getElementById('catBreakdown');
    if (!el) return;
    var maxCount = Math.max.apply(null, summary.map(function(s){ return s.count; })) || 1;

    el.innerHTML = summary.map(function(s) {
      var pct = Math.round(s.count / maxCount * 100);
      return `
        <div class="cat-summary-item" style="cursor:pointer;" onclick="navigate('all-workloads',{cat:'${s.categoryId}'})">
          <div class="cat-summary-icon">${s.icon}</div>
          <div class="cat-summary-info">
            <div class="cat-summary-name">${s.categoryName}</div>
            <div class="cat-summary-count">${s.count} รายการ · ${s.hours}h</div>
            <div class="progress-bar" style="margin-top:5px;">
              <div class="progress-fill" style="width:${pct}%;background:${s.color};"></div>
            </div>
          </div>
          <div class="cat-summary-num" style="color:${s.color};">${s.count}</div>
        </div>`;
    }).join('');
  }

  function renderMonthlyTable(monthly) {
    var el = document.getElementById('monthlyTableBody');
    if (!el) return;
    var maxCount = Math.max.apply(null, monthly.map(function(m){ return m.count; })) || 1;

    el.innerHTML = monthly.map(function(m) {
      var pct = Math.round(m.count / maxCount * 100);
      return `
        <tr ${m.count > 0 ? '' : 'style="opacity:0.4;"'}>
          <td style="font-weight:${m.count>0?'600':'400'}">${m.monthName}</td>
          <td>
            ${m.count > 0 ? '<span class="badge badge-cyan">' + m.count + ' รายการ</span>' : '—'}
          </td>
          <td>${m.hours > 0 ? m.hours.toFixed(0) + ' h' : '—'}</td>
          <td style="min-width:160px;">
            ${m.count > 0 ? '<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;"></div></div>' : ''}
          </td>
        </tr>`;
    }).join('');
  }

  function renderFullList(workloads) {
    var el = document.getElementById('fullWorkloadList');
    if (!el || !workloads.length) { if(el) el.innerHTML='<div class="empty-state" style="padding:20px;"><p>ยังไม่มีข้อมูล</p></div>'; return; }

    var catMap = {};
    DEMO_DATA.categories.forEach(function(c){ catMap[c.id]=c; });

    el.innerHTML = '<div class="table-wrapper"><table class="table"><thead><tr>' +
      '<th>#</th><th>ชื่อภาระงาน</th><th>หมวด</th><th>วันที่</th><th>ชม.</th><th>สถานะ</th>' +
      '</tr></thead><tbody>' +
      workloads.map(function(w, i) {
        var cat = catMap[w.category] || {};
        return '<tr><td class="muted">' + (i+1) + '</td>' +
          '<td><div style="font-weight:500;">' + w.title + '</div></td>' +
          '<td><span class="cat-pill" style="background:' + (cat.color||'#64748b') + '22;border-color:' + (cat.color||'#64748b') + '44;color:' + (cat.color||'#94a3b8') + ';">' + (cat.icon||'') + ' ' + (cat.name||w.category) + '</span></td>' +
          '<td class="muted">' + App.formatThaiDate(w.workDate) + '</td>' +
          '<td style="color:var(--accent);font-weight:600;">' + (w.hours||0) + 'h</td>' +
          '<td><span class="badge badge-green">' + (w.status||'—') + '</span></td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function changeYear(delta) {
    _year = String(parseInt(_year) + delta);
    var el = document.getElementById('yearDisplay');
    if (el) el.textContent = _year;
    document.getElementById('summaryContent').innerHTML =
      '<div class="loading-state"><div class="spinner"></div><p>กำลังโหลดข้อมูลปี ' + _year + '...</p></div>';
    loadData();
  }

  // ─── Export Dropdown Toggle ──────────────────────────────────
  function toggleExportMenu(event) {
    if (event) event.stopPropagation();
    var menu = document.getElementById('exportMenu');
    if (!menu) return;
    var isOpen = menu.style.display !== 'none';
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      setTimeout(function() {
        document.addEventListener('click', function closeMenu() {
          var m = document.getElementById('exportMenu');
          if (m) m.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        });
      }, 10);
    }
  }

  function _closeMenu() {
    var menu = document.getElementById('exportMenu');
    if (menu) menu.style.display = 'none';
  }

  function _getProfile() {
    return (App.getProfile && App.getProfile()) || {};
  }

  function _getCatMap() {
    var catMap = {};
    DEMO_DATA.categories.forEach(function(c){ catMap[c.id] = c; });
    return catMap;
  }

  // ─── PDF Export (print window) ───────────────────────────────
  function exportPDF() {
    _closeMenu();
    if (!_data) { App.toast('ยังไม่มีข้อมูล', 'error'); return; }

    var profile = _getProfile();
    var ownerName = profile.name || 'นางสาวธาราทิพย์ สูงขาว';
    var dept = profile.dept || 'กองวิเทศสัมพันธ์ มหาวิทยาลัยมหาสารคาม';
    var catMap = _getCatMap();

    var summaryRows = (_data.summary || []).map(function(s) {
      return '<tr><td>' + s.icon + ' ' + s.categoryName + '</td>' +
             '<td style="text-align:center;">' + s.count + '</td>' +
             '<td style="text-align:center;">' + (s.hours||0) + '</td></tr>';
    }).join('');

    var workloadRows = (_data.allWorkloads || []).map(function(w, i) {
      var cat = catMap[w.category] || {};
      return '<tr>' +
        '<td>' + (i+1) + '</td>' +
        '<td>' + (w.title||'') + '</td>' +
        '<td>' + (cat.name||w.category||'') + '</td>' +
        '<td>' + App.formatThaiDate(w.workDate) + '</td>' +
        '<td style="text-align:center;">' + (w.hours||0) + '</td>' +
        '<td>' + (w.status||'') + '</td>' +
        '</tr>';
    }).join('');

    var monthlyRows = (_data.monthly || []).map(function(m) {
      return '<tr' + (m.count === 0 ? ' style="color:#999;"' : '') + '>' +
        '<td>' + MONTH_TH[m.month] + '</td>' +
        '<td style="text-align:center;">' + (m.count||'—') + '</td>' +
        '<td style="text-align:center;">' + (m.hours > 0 ? m.hours : '—') + '</td>' +
        '</tr>';
    }).join('');

    var dateStr = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

    var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
      '<title>รายงานสรุปภาระงาน ปี พ.ศ. ' + _data.year + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600&display=swap" rel="stylesheet">' +
      '<style>' +
      '* { margin:0; padding:0; box-sizing:border-box; }' +
      'body { font-family:"Prompt",Tahoma,sans-serif; font-size:11pt; color:#0F172A; background:#fff; }' +
      '.header { background:#0F1117; color:#fff; padding:20px 32px; margin-bottom:0; }' +
      '.header h1 { font-size:16pt; color:#22D3EE; margin-bottom:4px; }' +
      '.header p { font-size:10pt; color:#94A3B8; }' +
      '.content { padding:20px 32px; }' +
      '.stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; margin-top:16px; }' +
      '.stat-box { border:1px solid #CBD5E1; border-radius:8px; padding:12px; text-align:center; }' +
      '.stat-num { font-size:20pt; font-weight:700; color:#0891B2; }' +
      '.stat-label { font-size:9pt; color:#64748B; margin-top:2px; }' +
      'h2 { font-size:12pt; font-weight:600; color:#0F172A; border-left:4px solid #22D3EE; padding-left:10px; margin:18px 0 10px; }' +
      'table { width:100%; border-collapse:collapse; font-size:10pt; page-break-inside:auto; }' +
      'thead { background:#0F1117; color:#fff; }' +
      'thead th { padding:7px 10px; text-align:left; font-weight:500; }' +
      'tbody td { padding:6px 10px; border-bottom:1px solid #E2E8F0; vertical-align:top; }' +
      'tbody tr:nth-child(even) { background:#F8FAFC; }' +
      'tbody tr:hover { background:#EFF6FF; }' +
      '.footer { margin-top:24px; text-align:center; font-size:9pt; color:#94A3B8; border-top:1px solid #E2E8F0; padding-top:10px; }' +
      '@media print {' +
      '  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
      '  thead { -webkit-print-color-adjust:exact; print-color-adjust:exact; }' +
      '  .no-print { display:none !important; }' +
      '  tr { page-break-inside:avoid; }' +
      '}' +
      '</style></head><body>' +
      '<div class="header">' +
      '<h1>รายงานสรุปภาระงาน ปี พ.ศ. ' + _data.year + '</h1>' +
      '<p>' + ownerName + ' · ' + dept + '</p>' +
      '<p style="font-size:9pt;margin-top:2px;">วันที่จัดทำ: ' + dateStr + '</p>' +
      '</div>' +
      '<div class="content">' +
      '<div class="stats-grid">' +
      '<div class="stat-box"><div class="stat-num">' + _data.total + '</div><div class="stat-label">ภาระงานทั้งหมด</div></div>' +
      '<div class="stat-box"><div class="stat-num">' + (_data.totalHours||0).toFixed(0) + '</div><div class="stat-label">ชั่วโมงรวม</div></div>' +
      '<div class="stat-box"><div class="stat-num">' + (_data.total/12).toFixed(1) + '</div><div class="stat-label">เฉลี่ย/เดือน</div></div>' +
      '<div class="stat-box"><div class="stat-num">' + (_data.summary||[]).length + '</div><div class="stat-label">หมวดงาน</div></div>' +
      '</div>' +
      '<h2>สรุปตามหมวดงาน</h2>' +
      '<table><thead><tr><th>หมวดงาน</th><th>จำนวน (รายการ)</th><th>ชั่วโมง</th></tr></thead>' +
      '<tbody>' + summaryRows + '</tbody></table>' +
      '<h2>สรุปรายเดือน</h2>' +
      '<table><thead><tr><th>เดือน</th><th>จำนวน</th><th>ชั่วโมง</th></tr></thead>' +
      '<tbody>' + monthlyRows + '</tbody></table>' +
      '<h2>รายการภาระงานทั้งหมด (' + _data.total + ' รายการ)</h2>' +
      '<table><thead><tr><th>#</th><th>ชื่อภาระงาน</th><th>หมวด</th><th>วันที่</th><th>ชม.</th><th>สถานะ</th></tr></thead>' +
      '<tbody>' + workloadRows + '</tbody></table>' +
      '<div class="footer">สร้างโดย PEACH Workload Portfolio · ' + dateStr + '</div>' +
      '</div>' +
      '<script>window.onload = function(){ window.print(); }<\/script>' +
      '</body></html>';

    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { App.toast('กรุณาอนุญาต Popup เพื่อ Export PDF', 'error'); return; }
    win.document.write(html);
    win.document.close();
    App.toast('เปิดหน้า PDF แล้ว — กด Ctrl+P → บันทึกเป็น PDF', 'info');
  }

  // ─── Excel Export (.xlsx) ────────────────────────────────────
  function exportExcel() {
    _closeMenu();
    if (!_data) { App.toast('ยังไม่มีข้อมูล', 'error'); return; }

    if (typeof XLSX === 'undefined') {
      App.toast('กำลังโหลด Excel library...', 'info');
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = function() { _doExcelExport(); };
      script.onerror = function() { App.toast('โหลด library ไม่สำเร็จ', 'error'); };
      document.head.appendChild(script);
    } else {
      _doExcelExport();
    }
  }

  function _doExcelExport() {
    var catMap = _getCatMap();
    var profile = _getProfile();
    var ownerName = profile.name || 'นางสาวธาราทิพย์ สูงขาว';
    var dateStr = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

    // Sheet 1 — สรุป
    var sheetSummary = [
      ['รายงานสรุปภาระงาน ปี พ.ศ. ' + _data.year],
      [ownerName],
      ['วันที่จัดทำ: ' + dateStr],
      [],
      ['รายการ', 'ค่า', 'หน่วย'],
      ['ภาระงานทั้งหมด', _data.total, 'รายการ'],
      ['ชั่วโมงรวม', (_data.totalHours||0).toFixed(0), 'ชั่วโมง'],
      ['เฉลี่ยต่อเดือน', (_data.total/12).toFixed(1), 'รายการ/เดือน'],
      ['หมวดงานที่ทำ', (_data.summary||[]).length, 'หมวด'],
      [],
      ['สรุปตามหมวดงาน'],
      ['หมวดงาน', 'จำนวน (รายการ)', 'ชั่วโมง'],
    ];
    (_data.summary||[]).forEach(function(s) {
      sheetSummary.push([s.icon + ' ' + s.categoryName, s.count, s.hours || 0]);
    });

    // Sheet 2 — ภาระงานทั้งหมด
    var sheetWorkloads = [
      ['#', 'ชื่อภาระงาน', 'หมวดงาน', 'วันที่', 'ชั่วโมง', 'สถานะ', 'รายละเอียด']
    ];
    (_data.allWorkloads||[]).forEach(function(w, i) {
      var cat = catMap[w.category] || {};
      sheetWorkloads.push([
        i + 1,
        w.title || '',
        (cat.name || w.category || ''),
        App.formatThaiDate(w.workDate),
        w.hours || 0,
        w.status || '',
        w.detail || ''
      ]);
    });

    // Sheet 3 — รายเดือน
    var sheetMonthly = [['เดือน', 'จำนวนภาระงาน', 'ชั่วโมง']];
    (_data.monthly||[]).forEach(function(m) {
      sheetMonthly.push([MONTH_TH[m.month], m.count, m.hours || 0]);
    });

    var wb = XLSX.utils.book_new();
    var ws1 = XLSX.utils.aoa_to_sheet(sheetSummary);
    var ws2 = XLSX.utils.aoa_to_sheet(sheetWorkloads);
    var ws3 = XLSX.utils.aoa_to_sheet(sheetMonthly);

    // Column widths
    ws2['!cols'] = [{ wch:4 }, { wch:40 }, { wch:20 }, { wch:16 }, { wch:8 }, { wch:14 }, { wch:40 }];
    ws3['!cols'] = [{ wch:14 }, { wch:16 }, { wch:10 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'สรุปภาพรวม');
    XLSX.utils.book_append_sheet(wb, ws2, 'ภาระงานทั้งหมด');
    XLSX.utils.book_append_sheet(wb, ws3, 'รายเดือน');

    XLSX.writeFile(wb, 'รายงานภาระงาน_' + _data.year + '.xlsx');
    App.toast('Export Excel เรียบร้อย ✅', 'success');
  }

  // ─── Word Export (.doc) ──────────────────────────────────────
  function exportWord() {
    _closeMenu();
    if (!_data) { App.toast('ยังไม่มีข้อมูล', 'error'); return; }

    var catMap = _getCatMap();
    var profile = _getProfile();
    var ownerName = profile.name || 'นางสาวธาราทิพย์ สูงขาว';
    var dept = profile.dept || 'กองวิเทศสัมพันธ์ มหาวิทยาลัยมหาสารคาม';
    var dateStr = new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' });

    var summaryRows = (_data.summary||[]).map(function(s) {
      return '<tr><td>' + s.icon + ' ' + s.categoryName + '</td>' +
             '<td align="center">' + s.count + ' รายการ</td>' +
             '<td align="center">' + (s.hours||0) + ' ชม.</td></tr>';
    }).join('');

    var monthlyRows = (_data.monthly||[]).map(function(m) {
      return '<tr><td>' + MONTH_TH[m.month] + '</td>' +
             '<td align="center">' + (m.count || '—') + '</td>' +
             '<td align="center">' + (m.hours > 0 ? m.hours : '—') + '</td></tr>';
    }).join('');

    var workloadRows = (_data.allWorkloads||[]).map(function(w, i) {
      var cat = catMap[w.category] || {};
      return '<tr><td align="center">' + (i+1) + '</td>' +
             '<td>' + (w.title||'') + '</td>' +
             '<td>' + (cat.name||'') + '</td>' +
             '<td>' + App.formatThaiDate(w.workDate) + '</td>' +
             '<td align="center">' + (w.hours||0) + '</td>' +
             '<td>' + (w.status||'') + '</td></tr>';
    }).join('');

    var html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>\n" +
      "<head><meta charset='utf-8'>\n" +
      "<style>\n" +
      "body { font-family:'Cordia New',Tahoma,sans-serif; font-size:14pt; margin:2cm; }\n" +
      "h1 { font-size:18pt; color:#0C4A6E; border-bottom:2pt solid #0891B2; padding-bottom:6pt; }\n" +
      "h2 { font-size:13pt; color:#0C4A6E; margin-top:14pt; border-left:4pt solid #0891B2; padding-left:8pt; }\n" +
      ".meta { font-size:11pt; color:#475569; margin-bottom:4pt; }\n" +
      ".stats { width:100%; border-collapse:collapse; margin:10pt 0; }\n" +
      ".stats td { padding:6pt 10pt; border:1pt solid #CBD5E1; }\n" +
      ".stats .label { background:#F1F5F9; font-weight:bold; width:40%; }\n" +
      "table { width:100%; border-collapse:collapse; font-size:11pt; margin:8pt 0; }\n" +
      "th { background:#0F1117; color:white; padding:6pt 8pt; text-align:left; }\n" +
      "td { padding:5pt 8pt; border:1pt solid #CBD5E1; }\n" +
      "tr:nth-child(even) td { background:#F8FAFC; }\n" +
      ".footer { font-size:9pt; color:#94A3B8; text-align:center; margin-top:20pt; border-top:1pt solid #E2E8F0; padding-top:8pt; }\n" +
      "</style></head><body>\n" +
      "<h1>รายงานสรุปภาระงาน ปี พ.ศ. " + _data.year + "</h1>\n" +
      "<p class='meta'>" + ownerName + " · " + dept + "</p>\n" +
      "<p class='meta'>วันที่จัดทำ: " + dateStr + "</p>\n" +

      "<h2>สถิติภาพรวม</h2>\n" +
      "<table class='stats'>\n" +
      "<tr><td class='label'>ภาระงานทั้งหมด</td><td>" + _data.total + " รายการ</td></tr>\n" +
      "<tr><td class='label'>ชั่วโมงรวม</td><td>" + (_data.totalHours||0).toFixed(0) + " ชั่วโมง</td></tr>\n" +
      "<tr><td class='label'>เฉลี่ยต่อเดือน</td><td>" + (_data.total/12).toFixed(1) + " รายการ/เดือน</td></tr>\n" +
      "<tr><td class='label'>หมวดงานที่ทำ</td><td>" + (_data.summary||[]).length + " จาก 12 หมวด</td></tr>\n" +
      "</table>\n" +

      "<h2>สรุปตามหมวดงาน</h2>\n" +
      "<table><thead><tr><th>หมวดงาน</th><th>จำนวน</th><th>ชั่วโมง</th></tr></thead>\n" +
      "<tbody>" + summaryRows + "</tbody></table>\n" +

      "<h2>สรุปรายเดือน</h2>\n" +
      "<table><thead><tr><th>เดือน</th><th>จำนวน</th><th>ชั่วโมง</th></tr></thead>\n" +
      "<tbody>" + monthlyRows + "</tbody></table>\n" +

      "<h2>รายการภาระงานทั้งหมด (" + _data.total + " รายการ)</h2>\n" +
      "<table><thead><tr><th>#</th><th>ชื่อภาระงาน</th><th>หมวด</th><th>วันที่</th><th>ชม.</th><th>สถานะ</th></tr></thead>\n" +
      "<tbody>" + workloadRows + "</tbody></table>\n" +

      "<div class='footer'>สร้างโดย PEACH Workload Portfolio · " + dateStr + "</div>\n" +
      "</body></html>";

    var blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'รายงานภาระงาน_' + _data.year + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    App.toast('Export Word เรียบร้อย ✅', 'success');
  }

  // ─── Print ───────────────────────────────────────────────────
  function printReport() {
    _closeMenu();
    exportPDF(); // เปิดหน้า print แล้วให้ browser จัดการ
  }

  // ─── Legacy (backwards compat) ───────────────────────────────
  function exportReport() {
    toggleExportMenu({ stopPropagation: function(){} });
  }

  return {
    render: render,
    changeYear: changeYear,
    exportReport: exportReport,
    toggleExportMenu: toggleExportMenu,
    exportPDF: exportPDF,
    exportExcel: exportExcel,
    exportWord: exportWord,
    printReport: printReport,
  };
})();
