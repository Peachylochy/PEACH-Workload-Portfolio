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
      <!-- Year Selector -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div class="year-selector">
          <button class="year-btn" onclick="PageAnnualSummary.changeYear(-1)">‹</button>
          <div class="year-display" id="yearDisplay">${_year}</div>
          <button class="year-btn" onclick="PageAnnualSummary.changeYear(1)">›</button>
          <span style="font-size:13px;color:var(--text-muted);">ปีงบประมาณ พ.ศ.</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="PageAnnualSummary.exportReport()">
          📥 Export รายงาน
        </button>
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

    // Month count
    var ctxM = document.getElementById('summaryMonthChart');
    if (ctxM) {
      if (_charts.month) _charts.month.destroy();
      _charts.month = new Chart(ctxM, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: counts, backgroundColor: 'rgba(34,211,238,0.25)', borderColor:'#22D3EE', borderWidth:2, borderRadius:4 }] },
        options: chartOpts
      });
    }

    // Hours
    var ctxH = document.getElementById('summaryHoursChart');
    if (ctxH) {
      if (_charts.hours) _charts.hours.destroy();
      _charts.hours = new Chart(ctxH, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: hours, borderColor:'#A78BFA', backgroundColor:'rgba(167,139,250,0.1)', tension:0.4, fill:true, pointBackgroundColor:'#A78BFA', pointRadius:4 }] },
        options: chartOpts
      });
    }

    // Pie
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

  function exportReport() {
    if (!_data) { App.toast('ยังไม่มีข้อมูลสำหรับ Export', 'error'); return; }

    var lines = [
      'รายงานสรุปภาระงาน ปี พ.ศ. ' + _data.year,
      'นางสาวธาราทิพย์ สูงขาว กองวิเทศสัมพันธ์ มหาวิทยาลัยมหาสารคาม',
      '=' .repeat(60),
      'จำนวนภาระงานทั้งหมด: ' + _data.total + ' รายการ',
      'จำนวนชั่วโมงทั้งหมด: ' + (_data.totalHours||0).toFixed(0) + ' ชั่วโมง',
      '',
      'สรุปตามหมวดงาน:',
    ];

    (_data.summary||[]).forEach(function(s) {
      lines.push('  ' + s.icon + ' ' + s.categoryName + ': ' + s.count + ' รายการ (' + s.hours + ' h)');
    });

    lines.push('', 'รายการภาระงานทั้งหมด:', '-'.repeat(60));
    (_data.allWorkloads||[]).forEach(function(w, i) {
      lines.push((i+1) + '. ' + w.title);
      lines.push('   วันที่: ' + App.formatThaiDate(w.workDate) + ' | ชม.: ' + w.hours + ' | สถานะ: ' + (w.status||''));
      if (w.detail) lines.push('   รายละเอียด: ' + w.detail);
      lines.push('');
    });

    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'รายงานภาระงาน_' + _data.year + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    App.toast('Export รายงานเรียบร้อย', 'success');
  }

  return { render: render, changeYear: changeYear, exportReport: exportReport };
})();
