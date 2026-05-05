/* ============================================================
   Dashboard Page
   ============================================================ */
var PageDashboard = (function() {
  'use strict';

  var _charts = {};
  var _year = '2567';
  var MONTH_NAMES = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                     'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  function render(container, params) {
    _year = (params && params.year) || App.getYear();
    container.innerHTML = getTemplate();
    setTimeout(loadData, 50);
  }

  function getTemplate() {
    return `
      <div class="stat-grid" id="dashStats">
        ${[0,0,0,0,0,0].map(function(){ return '<div class="stat-card"><div class="spinner" style="margin:10px auto;"></div></div>'; }).join('')}
      </div>

      <div class="grid-21" style="margin-bottom:20px;">
        <div class="chart-container">
          <div class="card-title"><span class="icon">📅</span>ภาระงานรายเดือน ปี ${_year}</div>
          <canvas id="chartMonth"></canvas>
        </div>
        <div class="chart-container">
          <div class="card-title"><span class="icon">🏷️</span>สัดส่วนตามหมวด</div>
          <canvas id="chartCat"></canvas>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title"><span class="icon">🕐</span>ภาระงานล่าสุด</div>
          <div id="recentList"><div class="loading-state" style="padding:20px;"><div class="spinner"></div></div></div>
        </div>
        <div class="card">
          <div class="card-title"><span class="icon">📊</span>สรุปตามหมวดงาน</div>
          <div id="catSummary"><div class="loading-state" style="padding:20px;"><div class="spinner"></div></div></div>
        </div>
      </div>
    `;
  }

  function loadData() {
    var useApi = !!API.getBaseUrl();
    var p = useApi ? API.getDashboard(_year) : Promise.resolve({ success: true, data: DEMO_DATA.dashboard });
    var catP = useApi ? API.getCategories() : Promise.resolve({ success: true, data: DEMO_DATA.categories });

    Promise.all([p, catP]).then(function(results) {
      var stats = results[0].data;
      var cats  = results[1].data || [];
      renderStats(stats);
      renderCharts(stats, cats);
      renderRecent(stats.recent || [], cats);
      renderCatSummary(stats.byCat || {}, cats);
      document.getElementById('navBadgeTotal').textContent = stats.totalWorkloads || 0;
    }).catch(function(err) {
      showError(err.message);
    });
  }

  function renderStats(s) {
    var el = document.getElementById('dashStats');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card cyan">
        <span class="stat-icon">📋</span>
        <div class="stat-label">ภาระงานทั้งหมด</div>
        <div class="stat-value cyan">${s.totalWorkloads || 0}</div>
        <div class="stat-sub">รายการ ปี ${_year}</div>
      </div>
      <div class="stat-card green">
        <span class="stat-icon">⏱️</span>
        <div class="stat-label">ชั่วโมงรวม</div>
        <div class="stat-value green">${(s.totalHours || 0).toFixed(0)}</div>
        <div class="stat-sub">ชั่วโมงการทำงาน</div>
      </div>
      <div class="stat-card yellow">
        <span class="stat-icon">✅</span>
        <div class="stat-label">เสร็จสิ้น</div>
        <div class="stat-value yellow">${s.completed || 0}</div>
        <div class="stat-sub">จาก ${s.totalWorkloads || 0} รายการ</div>
      </div>
      <div class="stat-card purple">
        <span class="stat-icon">🗂️</span>
        <div class="stat-label">หลักฐาน</div>
        <div class="stat-value purple">${s.totalEvidence || 0}</div>
        <div class="stat-sub">ไฟล์ที่อัปโหลด</div>
      </div>
      <div class="stat-card blue">
        <span class="stat-icon">🏃</span>
        <div class="stat-label">กำลังดำเนิน</div>
        <div class="stat-value" style="color:var(--info)">${s.inProgress || 0}</div>
        <div class="stat-sub">รายการ</div>
      </div>
      <div class="stat-card red">
        <span class="stat-icon">⏳</span>
        <div class="stat-label">รอดำเนินการ</div>
        <div class="stat-value" style="color:var(--danger)">${s.pending || 0}</div>
        <div class="stat-sub">รายการ</div>
      </div>
    `;
  }

  function renderCharts(stats, cats) {
    var byMonth = stats.byMonth || {};
    var months = [];
    var counts = [];
    for (var m = 1; m <= 12; m++) {
      months.push(MONTH_NAMES[m]);
      counts.push(byMonth[m] || 0);
    }

    // Monthly Bar Chart
    var ctxM = document.getElementById('chartMonth');
    if (ctxM) {
      if (_charts.month) _charts.month.destroy();
      _charts.month = new Chart(ctxM, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [{
            label: 'ภาระงาน',
            data: counts,
            backgroundColor: 'rgba(34,211,238,0.25)',
            borderColor: '#22D3EE',
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          plugins: { legend: { display: false }, tooltip: { callbacks: {
            label: function(ctx) { return ctx.parsed.y + ' รายการ'; }
          }}},
          scales: {
            x: { grid: { color: '#2A3549' }, ticks: { color: '#94A3B8', font: { family: 'Prompt' } } },
            y: { grid: { color: '#2A3549' }, ticks: { color: '#94A3B8', font: { family: 'Prompt' }, stepSize: 1 },
                 beginAtZero: true }
          }
        }
      });
    }

    // Category Doughnut Chart
    var byCat = stats.byCat || {};
    var catEntries = cats.filter(function(c) { return byCat[c.id] > 0; });
    var ctxC = document.getElementById('chartCat');
    if (ctxC && catEntries.length) {
      if (_charts.cat) _charts.cat.destroy();
      _charts.cat = new Chart(ctxC, {
        type: 'doughnut',
        data: {
          labels: catEntries.map(function(c) { return c.name; }),
          datasets: [{
            data: catEntries.map(function(c) { return byCat[c.id] || 0; }),
            backgroundColor: catEntries.map(function(c) { return c.color + '99'; }),
            borderColor: catEntries.map(function(c) { return c.color; }),
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: true,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94A3B8', font: { family: 'Prompt', size: 11 }, padding: 10, boxWidth: 12 }
            }
          }
        }
      });
    }
  }

  function renderRecent(recent, cats) {
    var el = document.getElementById('recentList');
    if (!el) return;
    if (!recent || recent.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }
    var catMap = {};
    (cats || []).forEach(function(c) { catMap[c.id] = c; });

    el.innerHTML = recent.slice(0, 5).map(function(w) {
      var cat = catMap[w.category] || {};
      var dateStr = App.formatThaiDate(w.workDate);
      return `
        <div class="recent-item" onclick="App.openWorkload('${w.id}')" style="cursor:pointer;">
          <div class="recent-dot" style="background:${cat.color || 'var(--accent)'}"></div>
          <div style="flex:1;overflow:hidden;">
            <div class="recent-item-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.title}</div>
            <div class="recent-item-meta">${cat.icon || '📌'} ${cat.name || w.category} · ${dateStr} · ${w.hours}h</div>
          </div>
          <span class="badge badge-green" style="flex-shrink:0;">${w.status}</span>
        </div>`;
    }).join('');
  }

  function renderCatSummary(byCat, cats) {
    var el = document.getElementById('catSummary');
    if (!el) return;
    var total = Object.values(byCat).reduce(function(s, v) { return s + (v || 0); }, 0) || 1;
    var items = (cats || []).filter(function(c) { return byCat[c.id] > 0; })
      .sort(function(a, b) { return (byCat[b.id] || 0) - (byCat[a.id] || 0); });

    if (!items.length) {
      el.innerHTML = '<div class="empty-state" style="padding:20px;"><p>ยังไม่มีข้อมูล</p></div>';
      return;
    }

    el.innerHTML = items.map(function(c) {
      var cnt = byCat[c.id] || 0;
      var pct = Math.round(cnt / total * 100);
      return `
        <div class="cat-summary-item">
          <div class="cat-summary-icon">${c.icon}</div>
          <div class="cat-summary-info">
            <div class="cat-summary-name">${c.name}</div>
            <div class="cat-summary-count">${cnt} รายการ · ${pct}%</div>
            <div class="progress-bar" style="margin-top:5px;width:100%;">
              <div class="progress-fill" style="width:${pct}%;background:${c.color};"></div>
            </div>
          </div>
          <div class="cat-summary-num" style="color:${c.color};">${cnt}</div>
        </div>`;
    }).join('');
  }

  function showError(msg) {
    var el = document.getElementById('dashStats');
    if (el) el.innerHTML = `<div class="alert alert-warning" style="grid-column:1/-1;">⚠️ ${msg}</div>`;
  }

  return { render: render, reload: loadData };
})();
