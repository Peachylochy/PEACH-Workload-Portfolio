/* ============================================================
   Add / Edit Workload Page
   ============================================================ */
var PageAddWorkload = (function() {
  'use strict';

  var _categories = [];
  var _editId = null;

  function render(container, params) {
    _editId = (params && params.edit) || null;
    container.innerHTML = getTemplate();
    loadCategories();
    if (_editId) loadEditData(_editId);
    bindEvents();
  }

  function getTemplate() {
    var ownerName = (App.getProfile && App.getProfile().name) || 'นางสาวธาราทิพย์ สูงขาว';
    return `
      <div class="form-card">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;color:var(--accent);">
            ${_editId ? '✏️ แก้ไขภาระงาน' : '➕ เพิ่มภาระงานใหม่'}
          </h2>
          <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">
            กรอกข้อมูลภาระงาน ${ownerName} ประจำปีการศึกษา
          </p>
        </div>

        <!-- ─── AI IMPORT BOX ─── -->
        ${_editId ? '' : `
        <div class="ai-import-box" id="aiImportBox">
          <div class="ai-badge">✨ AI Assistant</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;">📎 โยนไฟล์ให้ AI อ่าน</div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
            AI จะอ่านเอกสารราชการและกรอกข้อมูลให้อัตโนมัติ (รองรับ PDF, รูปภาพ, Word)
          </div>

          <!-- API Key row -->
          <div class="ai-key-input" id="aiKeyRow" style="${_getApiKey() ? 'display:none;' : ''}">
            <span style="font-size:12px;color:var(--text-muted);white-space:nowrap;">🔑 API Key:</span>
            <input type="password" id="aiApiKeyInput" placeholder="sk-ant-api03-..." value="${_getApiKey()}">
            <button class="btn btn-secondary btn-sm" onclick="PageAddWorkload.saveApiKey()">บันทึก</button>
          </div>
          ${_getApiKey() ? '<div style="font-size:11px;color:var(--success);margin-bottom:8px;">✅ มี API Key แล้ว · <span style="cursor:pointer;color:var(--text-muted);" onclick="PageAddWorkload.clearApiKey()">เปลี่ยน</span></div>' : ''}

          <!-- Drop Zone -->
          <div class="upload-zone" id="aiDropZone" style="padding:24px;"
               onclick="document.getElementById('aiFileInput').click()"
               ondragover="event.preventDefault();this.classList.add('dragover')"
               ondragleave="this.classList.remove('dragover')"
               ondrop="PageAddWorkload.onAiDrop(event)">
            <div class="upload-icon">🤖</div>
            <p>คลิกหรือลากไฟล์มาวาง</p>
            <div class="sub">PDF · JPG/PNG · DOCX · ขนาดไม่เกิน 20MB</div>
            <input type="file" id="aiFileInput" style="display:none;"
                   accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                   onchange="PageAddWorkload.onAiFileSelect(this)">
          </div>

          <!-- Processing / Result -->
          <div id="aiStatus"></div>
        </div>
        `}

        <form id="workloadForm" onsubmit="return false;">
          <!-- Title -->
          <div class="form-group">
            <label class="form-label">ชื่อภาระงาน <span class="required">*</span></label>
            <input type="text" class="form-control" id="fTitle"
                   placeholder="เช่น ต้อนรับคณะผู้แทนจาก Kyoto University" maxlength="200">
          </div>

          <!-- Category -->
          <div class="form-group">
            <label class="form-label">หมวดงาน <span class="required">*</span></label>
            <div class="category-grid" id="catGrid">
              <div class="loading-state" style="grid-column:1/-1;padding:20px;">
                <div class="spinner"></div>
              </div>
            </div>
            <input type="hidden" id="fCategory">
            <div class="form-error" id="catError" style="display:none;">กรุณาเลือกหมวดงาน</div>
          </div>

          <!-- Date & Hours -->
          <div class="form-row">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">วันที่ปฏิบัติงาน <span class="required">*</span></label>
              <input type="date" class="form-control" id="fDate">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">ระยะเวลา (ชั่วโมง)</label>
              <input type="number" class="form-control" id="fHours"
                     min="0.5" max="100" step="0.5" placeholder="จำนวนชั่วโมง" value="8">
            </div>
          </div>

          <!-- Status -->
          <div class="form-group" style="margin-top:18px;">
            <label class="form-label">สถานะ</label>
            <select class="form-control" id="fStatus">
              <option value="เสร็จสิ้น">✅ เสร็จสิ้น</option>
              <option value="กำลังดำเนินการ">🔄 กำลังดำเนินการ</option>
              <option value="รอดำเนินการ">⏳ รอดำเนินการ</option>
            </select>
          </div>

          <!-- Detail -->
          <div class="form-group">
            <label class="form-label">รายละเอียดภาระงาน</label>
            <textarea class="form-control" id="fDetail" rows="4"
                      placeholder="อธิบายรายละเอียดกิจกรรม ผลที่ได้ ขอบเขตงาน..."></textarea>
          </div>

          <div class="divider"></div>

          <!-- Actions -->
          <div style="display:flex;gap:12px;justify-content:flex-end;">
            <button class="btn btn-secondary" type="button" onclick="navigate('all-workloads')">
              ยกเลิก
            </button>
            <button class="btn btn-primary" type="button" id="submitBtn" onclick="PageAddWorkload.submit()">
              💾 ${_editId ? 'บันทึกการแก้ไข' : 'บันทึกภาระงาน'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  // ─── AI IMPORT HELPERS ───────────────────────────────────
  function _getApiKey() {
    var p = App.getProfile ? App.getProfile() : {};
    return (p.apiKey) || localStorage.getItem('peach_anthropic_key') || '';
  }

  function saveApiKey() {
    var val = (document.getElementById('aiApiKeyInput') || {}).value || '';
    if (!val.startsWith('sk-')) { App.toast('API Key ไม่ถูกต้อง (ต้องขึ้นต้นด้วย sk-)', 'error'); return; }
    localStorage.setItem('peach_anthropic_key', val);
    App.toast('บันทึก API Key เรียบร้อย', 'success');
    // Re-render the AI box
    var box = document.getElementById('aiImportBox');
    if (box) { var row = document.getElementById('aiKeyRow'); if(row) row.style.display='none'; }
  }

  function clearApiKey() {
    localStorage.removeItem('peach_anthropic_key');
    App.toast('ลบ API Key แล้ว', 'info');
    var row = document.getElementById('aiKeyRow');
    if (row) row.style.display = 'flex';
  }

  function onAiDrop(event) {
    event.preventDefault();
    document.getElementById('aiDropZone').classList.remove('dragover');
    var file = event.dataTransfer.files[0];
    if (file) processAiFile(file);
  }

  function onAiFileSelect(input) {
    var file = input.files[0];
    if (file) processAiFile(file);
  }

  function processAiFile(file) {
    var apiKey = _getApiKey();
    if (!apiKey) {
      App.toast('กรุณาใส่ Anthropic API Key ก่อน', 'error');
      var row = document.getElementById('aiKeyRow');
      if (row) row.style.display = 'flex';
      return;
    }

    var maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) { App.toast('ไฟล์ขนาดเกิน 20MB', 'error'); return; }

    var statusEl = document.getElementById('aiStatus');
    statusEl.innerHTML = `<div class="ai-processing"><div class="ai-spinner"></div><p>🤖 AI กำลังอ่านเอกสาร "${file.name}"...</p><p style="font-size:11px;">อาจใช้เวลา 10-30 วินาที</p></div>`;

    var reader = new FileReader();
    reader.onload = function(e) {
      var base64 = e.target.result.split(',')[1];
      var mediaType = _getMediaType(file.name, file.type);

      // Route ผ่าน GAS backend (เพื่อหลีกเลี่ยง CORS)
      var useApi = !!API.getBaseUrl();
      var promise = useApi
        ? API.aiImport(base64, mediaType, file.name, apiKey)
        : _callClaudeDirectly(base64, mediaType, file.name, apiKey);

      promise.then(function(res) {
        if (res && res.success && res.data) {
          showAiResult(res.data, file);
        } else {
          var errMsg = (res && res.error) || 'ไม่สามารถดึงข้อมูลได้';
          statusEl.innerHTML = `<div class="alert alert-danger" style="margin-top:12px;">❌ ${errMsg}</div>`;
        }
      }).catch(function(err) {
        statusEl.innerHTML = `<div class="alert alert-danger" style="margin-top:12px;">❌ ${err.message}</div>`;
      });
    };
    reader.readAsDataURL(file);
    _pendingFile = file;
  }

  var _pendingFile = null;

  function _getMediaType(name, mimeType) {
    var ext = name.split('.').pop().toLowerCase();
    var map = { 'pdf':'application/pdf', 'jpg':'image/jpeg', 'jpeg':'image/jpeg',
                'png':'image/png', 'gif':'image/gif', 'webp':'image/webp' };
    return map[ext] || mimeType || 'application/octet-stream';
  }

  // Direct Claude API call (fallback เมื่อไม่มี GAS)
  function _callClaudeDirectly(base64, mediaType, fileName, apiKey) {
    var isImage = mediaType.startsWith('image/');
    var isPdf   = mediaType === 'application/pdf';

    var contentBlock;
    if (isImage) {
      contentBlock = { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
    } else if (isPdf) {
      contentBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
    } else {
      return Promise.resolve({ success: false, error: 'ไฟล์ประเภทนี้ต้องใช้ผ่าน GAS Backend' });
    }

    var body = {
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: _buildPrompt(fileName) }
        ]
      }]
    };

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.error) return { success: false, error: res.error.message };
        var text = res.content && res.content[0] && res.content[0].text || '';
        return _parseAiResponse(text);
      });
  }

  function _buildPrompt(fileName) {
    return `คุณเป็นผู้ช่วย AI สำหรับระบบบันทึกภาระงานของบุคลากรมหาวิทยาลัย
กรุณาอ่านเอกสารนี้ชื่อ "${fileName}" และดึงข้อมูลต่อไปนี้:

1. ชื่อกิจกรรม/ภาระงาน (title) - สั้นกระชับ ไม่เกิน 100 ตัวอักษร
2. วันที่ปฏิบัติงาน (workDate) - รูปแบบ YYYY-MM-DD (ปี ค.ศ.)
3. หมวดงาน (category) - เลือกหนึ่งจาก: CAT01=ต้อนรับแขกต่างชาติ, CAT02=จัดทำ MOU/MOA, CAT03=ประสานงานทุน, CAT04=แปลเอกสาร, CAT05=จัดอบรม/สัมมนา, CAT06=ประชุมวิเทศสัมพันธ์, CAT07=โครงการแลกเปลี่ยน, CAT08=ดูแลนักศึกษาต่างชาติ, CAT09=จัดทำเอกสาร/รายงาน, CAT10=พัฒนาตนเอง, CAT11=งานธุรการวิเทศ, CAT12=อื่นๆ
4. ระยะเวลา (hours) - จำนวนชั่วโมง (ตัวเลข)
5. รายละเอียด (detail) - สรุปสั้นๆ ไม่เกิน 200 ตัวอักษร

ตอบในรูปแบบ JSON เท่านั้น ไม่ต้องมีคำอธิบาย:
{"title":"...","workDate":"YYYY-MM-DD","category":"CATxx","hours":8,"detail":"...","confidence":"high/medium/low"}`;
  }

  function _parseAiResponse(text) {
    try {
      var jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('ไม่พบ JSON ใน response');
      var data = JSON.parse(jsonMatch[0]);
      return { success: true, data: data };
    } catch(e) {
      return { success: false, error: 'AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง: ' + e.message };
    }
  }

  function showAiResult(data, file) {
    var statusEl = document.getElementById('aiStatus');
    var cats = _categories || DEMO_DATA.categories;
    var catMap = {};
    cats.forEach(function(c) { catMap[c.id] = c; });
    var cat = catMap[data.category] || {};

    var confColor = { high:'var(--success)', medium:'var(--warning)', low:'var(--danger)' }[data.confidence||'medium'] || 'var(--warning)';

    statusEl.innerHTML = `
      <div class="ai-result-preview" style="margin-top:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-weight:600;color:var(--success);">✅ AI อ่านเอกสารสำเร็จ!</span>
          <span style="font-size:11px;color:${confColor};">ความมั่นใจ: ${data.confidence||'medium'}</span>
        </div>
        <div class="ai-field"><span class="ai-field-label">ชื่องาน</span><span class="ai-field-value">${data.title||'—'}</span></div>
        <div class="ai-field"><span class="ai-field-label">หมวด</span><span class="ai-field-value">${cat.icon||''} ${cat.name||data.category||'—'}</span></div>
        <div class="ai-field"><span class="ai-field-label">วันที่</span><span class="ai-field-value">${App.formatThaiDate(data.workDate)}</span></div>
        <div class="ai-field"><span class="ai-field-label">ชั่วโมง</span><span class="ai-field-value">${data.hours||'—'} ชม.</span></div>
        <div class="ai-field"><span class="ai-field-label">รายละเอียด</span><span class="ai-field-value">${data.detail||'—'}</span></div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button class="btn btn-primary" style="flex:1;" onclick="PageAddWorkload.applyAiResult()">✅ ใช้ข้อมูลนี้</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('aiStatus').innerHTML=''">✕ ยกเลิก</button>
        </div>
      </div>`;
    _aiResult = data;
  }

  var _aiResult = null;

  function applyAiResult() {
    if (!_aiResult) return;
    var d = _aiResult;
    if (d.title)   document.getElementById('fTitle').value = d.title;
    if (d.workDate) document.getElementById('fDate').value = d.workDate;
    if (d.hours)   document.getElementById('fHours').value = d.hours;
    if (d.detail)  document.getElementById('fDetail').value = d.detail;
    if (d.category) setTimeout(function() { selectCat(d.category); }, 100);

    // Attach original file as evidence (store for later upload)
    if (_pendingFile) {
      _attachedEvidenceFile = _pendingFile;
      App.toast('📎 จะแนบไฟล์ "' + _pendingFile.name + '" เป็นหลักฐานอัตโนมัติเมื่อบันทึก', 'info');
    }
    document.getElementById('aiStatus').innerHTML = '<div class="alert alert-success" style="margin-top:12px;">✅ กรอกข้อมูลให้แล้ว กรุณาตรวจสอบและกด "บันทึก"</div>';

    // Scroll to form
    document.getElementById('fTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('fTitle').focus();
  }

  var _attachedEvidenceFile = null;

  function loadCategories() {
    var cats = API.getBaseUrl() ? API.getCategories() : Promise.resolve({ success: true, data: DEMO_DATA.categories });
    cats.then(function(res) {
      _categories = res.data || [];
      renderCatGrid();
    }).catch(function() {
      _categories = DEMO_DATA.categories;
      renderCatGrid();
    });
  }

  function renderCatGrid() {
    var el = document.getElementById('catGrid');
    if (!el) return;
    el.innerHTML = _categories.map(function(c) {
      return `
        <div class="cat-option" data-catid="${c.id}" onclick="PageAddWorkload.selectCat('${c.id}')">
          <span class="cat-icon">${c.icon || '📌'}</span>
          <span class="cat-name" style="color:var(--text-primary);">${c.name}</span>
        </div>`;
    }).join('');
  }

  function selectCat(id) {
    document.querySelectorAll('.cat-option').forEach(function(el) {
      el.classList.remove('selected');
    });
    var el = document.querySelector('.cat-option[data-catid="' + id + '"]');
    if (el) el.classList.add('selected');
    var inp = document.getElementById('fCategory');
    if (inp) inp.value = id;
    var err = document.getElementById('catError');
    if (err) err.style.display = 'none';
  }

  function loadEditData(id) {
    var p = API.getBaseUrl() ? API.getWorkload(id) : Promise.resolve({ success: true, data: DEMO_DATA.workloads.find(function(w){ return w.id === id; }) });
    p.then(function(res) {
      var w = res.data;
      if (!w) return;
      document.getElementById('fTitle').value = w.title || '';
      document.getElementById('fDate').value = w.workDate || '';
      document.getElementById('fHours').value = w.hours || '';
      document.getElementById('fStatus').value = w.status || 'เสร็จสิ้น';
      document.getElementById('fDetail').value = w.detail || '';
      if (w.category) setTimeout(function() { selectCat(w.category); }, 100);
    });
  }

  function bindEvents() {
    // Set default date to today in Thai calendar
    var dateEl = document.getElementById('fDate');
    if (dateEl && !_editId) {
      var today = new Date();
      dateEl.value = today.toISOString().split('T')[0];
    }
  }

  function validate() {
    var title = (document.getElementById('fTitle').value || '').trim();
    var cat = document.getElementById('fCategory').value;
    var date = document.getElementById('fDate').value;
    var errors = [];

    if (!title) errors.push('กรุณากรอกชื่อภาระงาน');
    if (!cat) {
      document.getElementById('catError').style.display = 'block';
      errors.push('กรุณาเลือกหมวดงาน');
    }
    if (!date) errors.push('กรุณาเลือกวันที่');
    return errors;
  }

  function submit() {
    var errors = validate();
    if (errors.length) {
      App.toast(errors[0], 'error');
      return;
    }

    var dateStr = document.getElementById('fDate').value;
    var gregorianYear = parseInt(dateStr.split('-')[0]);
    var thaiYear = String(gregorianYear + 543);
    var month = parseInt(dateStr.split('-')[1]);

    var payload = {
      title: document.getElementById('fTitle').value.trim(),
      category: document.getElementById('fCategory').value,
      detail: document.getElementById('fDetail').value.trim(),
      workDate: dateStr,
      hours: parseFloat(document.getElementById('fHours').value) || 0,
      status: document.getElementById('fStatus').value,
      year: thaiYear,
      month: month,
    };

    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = '⏳ กำลังบันทึก...';

    var p;
    if (_editId) {
      payload.id = _editId;
      p = API.getBaseUrl() ? API.updateWorkload(payload) : Promise.resolve({ success: true });
    } else {
      p = API.getBaseUrl() ? API.createWorkload(payload) : Promise.resolve({ success: true, id: 'demo' });
    }

    p.then(function(res) {
      if (res.success || res.success !== false) {
        // Auto-attach evidence file ถ้ามี
        if (_attachedEvidenceFile && res.id) {
          _attachEvidenceAfterSave(res.id, _attachedEvidenceFile);
        }
        App.toast(_editId ? 'แก้ไขภาระงานเรียบร้อย' : 'บันทึกภาระงานเรียบร้อย ✅', 'success');
        setTimeout(function() { navigate('all-workloads'); }, 900);
      } else {
        App.toast('เกิดข้อผิดพลาด: ' + (res.error || 'Unknown'), 'error');
        btn.disabled = false;
        btn.textContent = '💾 บันทึก';
      }
    }).catch(function(err) {
      App.toast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 บันทึก';
    });
  }

  function _attachEvidenceAfterSave(workloadId, file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var evPayload = {
        workloadId: workloadId,
        fileName: file.name,
        fileType: file.name.split('.').pop().toLowerCase(),
        driveFileId: '',
        driveUrl: '',
        description: 'เอกสารต้นฉบับ (AI Import)',
      };
      if (API.getBaseUrl()) {
        API.createEvidence(evPayload).catch(function(){});
      }
    };
    reader.readAsDataURL(file);
    _attachedEvidenceFile = null;
  }

  return {
    render: render,
    selectCat: selectCat,
    submit: submit,
    saveApiKey: saveApiKey,
    clearApiKey: clearApiKey,
    onAiDrop: onAiDrop,
    onAiFileSelect: onAiFileSelect,
    applyAiResult: applyAiResult,
  };
})();
