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
    return `
      <div class="form-card">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:18px;color:var(--accent);">
            ${_editId ? '✏️ แก้ไขภาระงาน' : '➕ เพิ่มภาระงานใหม่'}
          </h2>
          <p style="font-size:13px;color:var(--text-muted);margin-top:4px;">
            กรอกข้อมูลภาระงาน นางสาวธาราทิพย์ สูงขาว ประจำปีการศึกษา
          </p>
        </div>

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
        App.toast(_editId ? 'แก้ไขภาระงานเรียบร้อย' : 'บันทึกภาระงานเรียบร้อย ✅', 'success');
        setTimeout(function() { navigate('all-workloads'); }, 800);
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

  return { render: render, selectCat: selectCat, submit: submit };
})();
