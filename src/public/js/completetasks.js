(() => {
  // --- Config / Utilities ---
  const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/complete`;
  const UNDO_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/undo_complete`;
  const formatDate = d => (d instanceof Date ? d : new Date(d)).toISOString().slice(0,10);

  const escapeHtml = s => (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // API wrapper (adjust Authorization header if you use JWT)
  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      credentials: 'include', // ensure cookie auth works
      // If you use JWT, uncomment next line and remove credentials if needed:
      // headers: { 'Content-Type':'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(()=>({}));
    if (!res.ok) throw payload;
    return payload;
  }

  // --- DOM elements: modal & context menu ---
  const remarkModal = document.getElementById('remarkModal');
  const rmForm = document.getElementById('remarkForm');
  const rmTaskId = document.getElementById('rm_task_id');
  const rmForDate = document.getElementById('rm_for_date');
  const rmRemarks = document.getElementById('rm_remarks');
  const rmCancel = document.getElementById('rm_cancel');
  const ctxMenu = document.getElementById('taskContextMenu');

  // Close modal
  function closeModal() {
    remarkModal.setAttribute('aria-hidden','true');
    remarkModal.style.display = 'none';
    // return focus if needed
  }
  function openModal() {
    remarkModal.setAttribute('aria-hidden','false');
    remarkModal.style.display = 'block';
    rmRemarks.focus();
  }

  rmCancel.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });

  // --- Table initialization: add checkbox col if not present ---
  function ensureCheckboxColumn() {
    const table = document.querySelector('#dataTable table'); console.log(table)
    if (!table) return;
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');

    // If column already exists (by data-key 'complete') skip
    if (thead.querySelector('th[data-key="complete"]')) return;

    // Insert header at end (or choose the index you want)
    const th = document.createElement('th');
    th.textContent = 'Done';
    th.setAttribute('data-key','complete');
    th.style.borderRight = '1px solid rgb(204,204,204)';
    thead.appendChild(th);

    // Insert a td for each row
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const taskIdCell = row.querySelector('td[data-key="id"]');
      const taskId = taskIdCell?.dataset?.value || taskIdCell?.textContent?.trim();
      // Determine for_date context: try row cell data-for-date or default to today
      const forDate = row.querySelector('td[data-key="created_at"]')?.dataset?.value || formatDate(new Date());
      const td = document.createElement('td');
      td.className = 'complete-cell';
      td.style.borderRight = '1px solid rgb(204,204,204)';
      td.style.minWidth = '120px';
      // checkbox + label, store meta attributes
      td.innerHTML = `
        <div style="display:flex;align-items:center;gap:.5rem;">
          <input type="checkbox" class="task-complete-checkbox" id="chk_${taskId}" data-task-id="${taskId}">
          <label for="chk_${taskId}" style="margin:0;font-size:.9rem">Done</label>
          <button class="btn btn-sm btn-link btn-add-remark" title="Add remark" data-task-id="${taskId}" style="margin-left:auto;">✎</button>
        </div>
        <div class="small remark-display" style="margin-top:.25rem;color:#444;font-size:.85rem;"></div>
      `;
      // attach meta so right click handler can use them
      td.dataset.taskId = taskId;
      td.dataset.forDate = forDate;
      row.appendChild(td);
    });
  }

  // Call once to build column (if not present)
  ensureCheckboxColumn();

  // --- Helpers to update UI after complete/uncomplete ---
  function setCompletedUI(taskId, completion) {
    // completion: { id, task_id, user_id, for_date, remarks, completed_at }
    const cell = document.querySelector(`.complete-cell[data-task-id="${taskId}"]`);
    if (!cell) return;
    const chk = cell.querySelector('.task-complete-checkbox');
    const remarkDiv = cell.querySelector('.remark-display');

    chk.checked = true;
    chk.disabled = false;
    cell.classList.add('completed-row');

    if (completion && completion.remarks) {
      remarkDiv.innerHTML = `<strong>Remark:</strong> ${escapeHtml(completion.remarks)}`;
    } else {
      remarkDiv.innerHTML = '';
    }
  }

  function setUncompletedUI(taskId) {
    const cell = document.querySelector(`.complete-cell[data-task-id="${taskId}"]`);
    if (!cell) return;
    const chk = cell.querySelector('.task-complete-checkbox');
    const remarkDiv = cell.querySelector('.remark-display');

    chk.checked = false;
    chk.disabled = false;
    cell.classList.remove('completed-row');
    remarkDiv.innerHTML = '';
  }

  // --- Event: checkbox change (complete / undo) ---
  document.addEventListener('change', async (e) => {
    const chk = e.target.closest('.task-complete-checkbox');
    if (!chk) return;
    const taskId = chk.dataset.taskId;
    const cell = chk.closest('.complete-cell');
    const forDate = cell.dataset.forDate || formatDate();
    // disable while pending
    chk.disabled = true;

    if (chk.checked) {
      // Mark complete. We open a small prompt for quick remark or just send empty remark.
      // For better UX we could open modal, but here we do a quick save and allow edit via remark button/context menu.
      try {
        const payload = await apiPost(COMPLETE_URL(taskId), { for_date: forDate, remarks: null });
        // Expect payload.completion
        setCompletedUI(taskId, payload.completion || {});
      } catch (err) {
        console.error('complete error', err);
        alert(err?.error || err?.message || 'Failed to mark complete');
        chk.checked = false;
      } finally {
        chk.disabled = false;
      }
    } else {
      // Undo
      try {
        await apiPost(UNDO_URL(taskId), { for_date: forDate });
        setUncompletedUI(taskId);
      } catch (err) {
        console.error('undo error', err);
        alert(err?.error || err?.message || 'Failed to undo completion');
        chk.checked = true; // rollback
      } finally {
        chk.disabled = false;
      }
    }
  });

  // --- Right-click (context menu) on complete-cell to show custom menu ---
  let contextTargetCell = null;
  document.addEventListener('contextmenu', (e) => {
    const cell = e.target.closest('.complete-cell');
    if (!cell) {
      ctxMenu.style.display = 'none';
      return; // allow normal context elsewhere
    }
    e.preventDefault();
    contextTargetCell = cell;
    // position menu
    const x = e.pageX;
    const y = e.pageY;
    ctxMenu.style.left = `${x}px`;
    ctxMenu.style.top = `${y}px`;
    ctxMenu.style.display = 'block';
  });

  // Hide context menu on click elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#taskContextMenu')) ctxMenu.style.display = 'none';
  });

  // Context menu actions
  ctxMenu.addEventListener('click', (e) => {
    const action = e.target.closest('.ctx-item')?.dataset?.action;
    if (!action || !contextTargetCell) return;
    const taskId = contextTargetCell.dataset.taskId;
    ctxMenu.style.display = 'none';

    if (action === 'add-remark') {
      // open modal pre-filled
      rmTaskId.value = taskId;
      rmForDate.value = contextTargetCell.dataset.forDate || formatDate();
      rmRemarks.value = contextTargetCell.querySelector('.remark-display')?.textContent?.replace(/^Remark:\s*/i,'')?.trim() || '';
      openModal();
    } else if (action === 'view-remark') {
      const text = contextTargetCell.querySelector('.remark-display')?.textContent || 'No remark';
      alert(text);
    }
  });

  // Also handle click on small remark button in cell (for usability)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add-remark');
    if (!btn) return;
    e.preventDefault();
    const cell = btn.closest('.complete-cell');
    rmTaskId.value = btn.dataset.taskId;
    rmForDate.value = cell.dataset.forDate || formatDate();
    rmRemarks.value = cell.querySelector('.remark-display')?.textContent?.replace(/^Remark:\s*/i,'')?.trim() || '';
    openModal();
  });

  // --- Submit remark modal: will upsert completion/remarks ---
  rmForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const taskId = rmTaskId.value;
    const forDate = rmForDate.value || formatDate();
    const remarks = rmRemarks.value.trim() || null;

    const saveBtn = document.getElementById('rm_save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // If already checked, just update by calling complete again (ON DUPLICATE will update remarks)
    // If not checked, calling complete will create the completion.
    try {
      const payload = await apiPost(COMPLETE_URL(taskId), { for_date: forDate, remarks });
      setCompletedUI(taskId, payload.completion || { remarks });
      closeModal();
    } catch (err) {
      console.error('remark save error', err);
      alert(err?.error || err?.message || 'Failed to save remark');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  // Close remark modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && remarkModal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // --- Optionally: load initial completed states for today's date ---
  // If you want to mark which tasks are already completed on page load, you need server data.
  // If server-side rendering already includes that, you can instead set initial UI accordingly.
  // Example: if your row contains completion info in data attributes, paint them:
  document.querySelectorAll('.complete-cell').forEach(cell => {
    // if somewhere server printed completion status in data attributes:
    if (cell.dataset.isCompleted === '1') {
      setCompletedUI(cell.dataset.taskId, { remarks: cell.dataset.remarks || '' });
      const chk = cell.querySelector('.task-complete-checkbox');
      if (chk) chk.checked = true;
    }
  });

})();
