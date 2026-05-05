/* ============================================================
   Evidence Library Page
   ============================================================ */
var PageEvidence = (function() {
  'use strict';

  var _evidence   = [];
  var _workloads  = [];
  var _search     = '';
  var _wlFilter   = '';

  var FILE_ICONS = {
    'pdf': '📄', 'doc': '📝', 'docx': '📝',
    'xls': '📊', 'xlsx': '📊',
    'ppt': '📊', 'pptx': '📊',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'zip': '📦', 'rar': '📦',
    'mp4': '🎬', 'mov': '🎬',
    'default': '📎'
  };

  function render(container) {
    container.innerHTML = getTemplate();
    loadData();
    bindDragDrop();
  }

  function getTemplate() {
    return `
      <div class="grid-12" style="align-items:start;">
        <!-- Left: Upload Panel -->
        <div>
          <div class="card" style="margin-bottom:20px;">
            <div class="card-title"><span class="icon">📤</span>อัปโหลดหลักฐาน</div>

            <div class="form-group">
              <label class="form-label">เชื่อมกับภาระงาน</label>
              <select class="form-control" id="evWorkloadSel">
                <option value="">— เลือกภาระงาน —</option>
              </select>
            </div>

            <div class="upload-zone" id="uploadZone" onclick="document.getElementById('fileInput').click()">
              <div class="upload-icon">☁️</div>
              <p>คลิกหรือลากไฟล์มาวางที่นี่</p>
              <div class="sub">PDF, Word, Excel, รูปภาพ ขนาดไม่เกิน 10MB</div>
              <input type="file" id="fileInput" style="display:none;" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif">
            </div>

            <div id="uploadPreview" style="margin-top:12px;"></div>

            <div class="form-group" style="margin-top:12px;">
              <label class="form-label">คำอธิบายหลักฐาน</label>
              <input type="text" class="form-control" id="evDescription"
                     placeholder="เช่น ภาพถ่ายกิจกรรม, เอกสารรายงาน...">
            </div>

            <div class="alert alert-info" style="font-size:12px;">
              💡 ไฟล์จะถูกอัปโหลดไปยัง Google Drive และบันทึก URL ใน Google Sheets
            </div>

            <button class="btn btn-primary" style="width:100%;" onclick="PageEvidence.uploadFiles()">
              📤 อัปโหลดหลักฐาน
            </button>
          </div>

          <!-- Drive Link Manual -->
          <div class="card">
            <div class="card-title"><span class="icon">🔗</span>เพิ่ม Drive Link</div>
            <div class="form-group">
              <label class="form-label">Google Drive URL</label>
              <input type="url" class="form-control" id="evDriveUrl"
                     placeholder="https://drive.google.com/file/d/...">
            </div>
            <div class="form-group">
              <label class="form-label">ชื่อไฟล์</label>
              <input type="text" class="form-control" id="evFileName"
                     placeholder="ชื่อไฟล์หรือเอกสาร">
            </div>
            <button class="btn btn-secondary" style="width:100%;" onclick="PageEvidence.addDriveLink()">
              🔗 เพิ่ม Link
            </button>
          </div>
        </div>

        <!-- Right: Evidence List -->
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
            <div class="search-box" style="flex:1;">
              <span class="search-icon">🔍</span>
              <input type="text" id="evSearch" placeholder="ค้นหาหลักฐาน..."
                     oninput="PageEvidence.onSearch(this.value)">
            </div>
            <select class="filter-select" id="evWlFilter" onchange="PageEvidence.onWlFilter(this.value)">
              <option value="">ภาระงานทั้งหมด</option>
            </select>
          </div>

          <div id="statsBarEv" style="margin-bottom:16px;">
            <span class="badge badge-cyan" id="evCount">— ไฟล์</span>
          </div>

          <div id="evidenceGrid" style="display:grid;grid-template-columns:1fr;gap:10px;">
            <div class="loading-state"><div class="spinner"></div><p>กำลังโหลด...</p></div>
          </div>
        </div>
      </div>
    `;
  }

  function loadData() {
    var useApi = !!API.getBaseUrl();
    var eP = useApi ? API.listEvidence({}) : Promise.resolve({ success: true, data: _buildDemoEvidence() });
    var wP = useApi ? API.listWorkloads({ year: App.getYear() }) : Promise.resolve({ success: true, data: DEMO_DATA.workloads });

    Promise.all([eP, wP]).then(function(res) {
      _evidence  = res[0].data || [];
      _workloads = res[1].data || [];

      // Populate workload selects
      ['evWorkloadSel','evWlFilter'].forEach(function(selId) {
        var sel = document.getElementById(selId);
        if (!sel) return;
        _workloads.slice(0, 50).forEach(function(w) {
          var opt = document.createElement('option');
          opt.value = w.id;
          opt.textContent = w.title.substring(0, 50) + (w.title.length > 50 ? '...' : '');
          sel.appendChild(opt);
        });
      });

      renderGrid();
    });
  }

  function _buildDemoEvidence() {
    var ev = [];
    DEMO_DATA.workloads.forEach(function(w) {
      for (var i = 0; i < w.evidenceCount; i++) {
        var types = ['pdf','jpg','docx','xlsx'];
        var ftype = types[i % types.length];
        ev.push({
          id: 'ev' + w.id + i,
          workloadId: w.id,
          fileName: 'หลักฐาน_' + w.title.substring(0,15) + '_' + (i+1) + '.' + ftype,
          fileType: ftype,
          driveFileId: 'demo',
          driveUrl: '#',
          description: 'หลักฐานประกอบ: ' + w.title,
          uploadedAt: w.workDate
        });
      }
    });
    return ev;
  }

  function getFiltered() {
    return _evidence.filter(function(e) {
      var matchS = !_search || (e.fileName + e.description).toLowerCase().includes(_search.toLowerCase());
      var matchW = !_wlFilter || e.workloadId === _wlFilter;
      return matchS && matchW;
    });
  }

  function renderGrid() {
    var items = getFiltered();
    var el = document.getElementById('evidenceGrid');
    var cnt = document.getElementById('evCount');
    if (cnt) cnt.textContent = items.length + ' ไฟล์';
    if (!el) return;

    if (!items.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🗂️</div><p>ยังไม่มีหลักฐาน</p><div class="sub">อัปโหลดไฟล์หลักฐานทางด้านซ้าย</div></div>';
      return;
    }

    var wlMap = {};
    _workloads.forEach(function(w) { wlMap[w.id] = w; });

    el.innerHTML = items.map(function(e) {
      var ext = (e.fileName || '').split('.').pop().toLowerCase();
      var icon = FILE_ICONS[ext] || FILE_ICONS.default;
      var wl = wlMap[e.workloadId] || {};
      var dateStr = App.formatThaiDate(e.uploadedAt);

      return `
        <div class="evidence-card">
          <div class="evidence-icon">${icon}</div>
          <div style="flex:1;overflow:hidden;">
            <div class="evidence-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${e.fileName}
            </div>
            <div class="evidence-meta">${e.description || '—'}</div>
            <div class="evidence-meta" style="margin-top:2px;">
              📋 ${(wl.title||'').substring(0,40)} · ${dateStr}
            </div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
            ${e.driveUrl && e.driveUrl !== '#' ? '<a href="' + e.driveUrl + '" target="_blank" class="btn btn-ghost btn-icon btn-sm" title="ดูไฟล์">🔗</a>' : ''}
            <button class="btn btn-ghost btn-icon btn-sm" title="ลบ" onclick="PageEvidence.deleteEv('${e.id}','${e.fileName.replace(/'/g,"\\'")}')">🗑️</button>
          </div>
        </div>`;
    }).join('');
  }

  function bindDragDrop() {
    var zone = document.getElementById('uploadZone');
    var input = document.getElementById('fileInput');
    if (!zone || !input) return;

    zone.addEventListener('dragover', function(ev) {
      ev.preventDefault(); zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function(ev) {
      ev.preventDefault(); zone.classList.remove('dragover');
      showPreview(Array.from(ev.dataTransfer.files));
    });
    input.addEventListener('change', function() {
      showPreview(Array.from(input.files));
    });
  }

  var _selectedFiles = [];
  function showPreview(files) {
    _selectedFiles = files;
    var el = document.getElementById('uploadPreview');
    if (!el) return;
    el.innerHTML = files.map(function(f) {
      var ext = f.name.split('.').pop().toLowerCase();
      var icon = FILE_ICONS[ext] || FILE_ICONS.default;
      var size = (f.size / 1024).toFixed(0) + ' KB';
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--bg-primary);border-radius:6px;margin-bottom:6px;font-size:12px;">' +
             icon + ' <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + f.name + '</span>' +
             '<span style="color:var(--text-muted);">' + size + '</span></div>';
    }).join('');
  }

  function uploadFiles() {
    var workloadId = document.getElementById('evWorkloadSel').value;
    var description = document.getElementById('evDescription').value.trim();

    if (!workloadId) { App.toast('กรุณาเลือกภาระงานที่ต้องการแนบหลักฐาน', 'error'); return; }
    if (!_selectedFiles.length) { App.toast('กรุณาเลือกไฟล์ก่อน', 'error'); return; }

    App.toast('ในระบบจริง ไฟล์จะถูกอัปโหลดไปยัง Google Drive อัตโนมัติ', 'info');

    // Demo mode: add to local list
    _selectedFiles.forEach(function(f) {
      _evidence.unshift({
        id: 'ev' + Date.now() + Math.random(),
        workloadId: workloadId,
        fileName: f.name,
        fileType: f.name.split('.').pop().toLowerCase(),
        driveFileId: 'demo',
        driveUrl: '#',
        description: description || f.name,
        uploadedAt: new Date().toISOString().split('T')[0]
      });
    });

    _selectedFiles = [];
    document.getElementById('uploadPreview').innerHTML = '';
    document.getElementById('fileInput').value = '';
    renderGrid();
  }

  function addDriveLink() {
    var url = document.getElementById('evDriveUrl').value.trim();
    var name = document.getElementById('evFileName').value.trim();
    var wlId = document.getElementById('evWorkloadSel').value;
    if (!url) { App.toast('กรุณากรอก URL', 'error'); return; }
    if (!name) { App.toast('กรุณากรอกชื่อไฟล์', 'error'); return; }

    var payload = {
      workloadId: wlId, fileName: name,
      fileType: name.split('.').pop().toLowerCase(),
      driveFileId: '', driveUrl: url,
      description: document.getElementById('evDescription').value.trim()
    };

    var p = API.getBaseUrl() ? API.createEvidence(payload) : Promise.resolve({ success: true });
    p.then(function() {
      _evidence.unshift(Object.assign({ id: 'ev' + Date.now(), uploadedAt: new Date().toISOString().split('T')[0] }, payload));
      document.getElementById('evDriveUrl').value = '';
      document.getElementById('evFileName').value = '';
      renderGrid();
      App.toast('เพิ่มหลักฐานเรียบร้อย ✅', 'success');
    });
  }

  function deleteEv(id, name) {
    if (!confirm('ลบหลักฐาน "' + name + '" ใช่หรือไม่?')) return;
    var p = API.getBaseUrl() ? API.deleteEvidence(id) : Promise.resolve({ success: true });
    p.then(function() {
      _evidence = _evidence.filter(function(e) { return e.id !== id; });
      renderGrid();
      App.toast('ลบหลักฐานเรียบร้อย', 'success');
    });
  }

  return {
    render: render,
    uploadFiles: uploadFiles,
    addDriveLink: addDriveLink,
    deleteEv: deleteEv,
    onSearch: function(v) { _search = v; renderGrid(); },
    onWlFilter: function(v) { _wlFilter = v; renderGrid(); },
  };
})();
