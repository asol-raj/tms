import { addColumnBorders, advanceMysqlQuery, createFormAdvance, createFormSmart, createTable, fd2obj, fetchData, initAdvancedTable, jq, log, postData, titleCaseTableHeaders, toTitleCase } from './help.js';
import createForm from './_utils/createForm.esm.js';
import formfields from './formfields.js';
import showModal from './_utils/modal.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';

//
// Helper: normalize many common date string formats to YYYY-MM-DD
// (placed early so all functions can use it)
function normalizeToIsoDate(s) {
    if (!s) return null;
    s = String(s).trim();

    // if already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // if common US format MM-DD-YYYY or M-D-YYYY or MM/DD/YYYY
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
        const mm = m[1].padStart(2, '0');
        const dd = m[2].padStart(2, '0');
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
    }

    // try Date parse fallback (may be locale-dependent)
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    return null; // unknown format
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadData();

    jq('#selectUser').on('change', async (e) => {
        try {
            let user_id = e.target.value || 'all';
            loadData(user_id);
        } catch (error) {
            log(error);
        }
    })

    jq('#createDailyTask1').on('click', () => {
        try {
            let user_id = jq('#selectUser').val();
            const $modal = createFormAdvance({
                title: 'dailyTasksForm',
                modal: true,
                floatingLabels: false,
                modalTitle: 'Create Daily Task',
                formData: { user_id },
                hideFooter: true,
                onSubmit: async (api) => {
                    if (!api.isValid) {
                        return; // show errors under fields
                    }
                    let sql = ``
                    // log(api.values); return;
                    let payload = { ...api.values }; //log(payload); return;
                    let res = await postData('/auth/daily/tasks', payload); log(res);

                    setTimeout(() => {
                        api.close();
                        loadData();
                    }, 500);
                }
            }); //log($modal);
            const form = $modal[0]; //log(form);

            // jq('div.test').html($modal);
            $modal.data('bs.modal').show();
        } catch (error) {
            log(error);
        }
    })

    jq('#createDailyTask').on('click', () => {
        try {
            let user_id = jq('#selectUser').val();
            const $modal = createFormAdvance({
                title: 'dailyTasksForm',
                modal: true,
                floatingLabels: false,
                modalTitle: 'Create Daily Task',
                formData: { user_id }, // initial values
                hideFooter: true,
                onSubmit: async (api) => {
                    if (!api.isValid) {
                        return; // show errors under fields
                    }
                    // normalize recurrence_weekdays array -> csv if needed could be done server-side too
                    let payload = { ...api.values }; log(payload); //return;
                    // if (Array.isArray(payload.recurrence_weekdays)) payload.recurrence_weekdays = payload.recurrence_weekdays.join(',');

                    let res = await postData('/auth/daily/tasks', payload);
                    log(res);

                    setTimeout(() => {
                        api.close();
                        loadData();
                    }, 500);
                }
            });

            // form element (the modal content) - depends on createFormAdvance structure
            // assume modal contains textarea/select inputs with name attributes matching form keys
            const form = $modal[0];
            $modal.data('bs.modal').show();

            // ---------- wiring for recurrence logic ----------
            // helper maps
            const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
            const WEEKENDS = ['sat', 'sun'];

            // find the inputs inside the modal (adjust selectors if your createFormAdvance wraps names differently)
            // use attribute selector for name; many form generators do: <select name="recurrence_type">, <select name="recurrence_weekdays" multiple>
            let $recurrenceType = $modal.find('[name="recurrence_type"]');
            let $recurrenceDays = $modal.find('[name="recurrence_weekdays"]');
            let $onceDate = $modal.find('[name="once_date"]');

            // safety: if not found, try alternative selectors (some render with id prefixed)
            if ($recurrenceType.length === 0) {
                // try id based fallback
                $recurrenceType = $modal.find('#recurrence_type');
            }
            if ($recurrenceDays.length === 0) {
                $recurrenceDays = $modal.find('#recurrence_weekdays');
            }
            if ($onceDate.length === 0) {
                $onceDate = $modal.find('#once_date');
            }

            // function to apply UI rules based on selected recurrence_type
            const applyRecurrenceRules = (type) => {
                type = String(type || '').toLowerCase();

                if (type === 'weekends') {
                    // enable multiselect and set sat,sun
                    $recurrenceDays.prop('disabled', false);
                    // if using a plugin like Select2 you might need: $recurrenceDays.trigger('change.select2')
                    $recurrenceDays.val(WEEKENDS);
                    // enable/disable date
                    $onceDate.prop('disabled', true).val('');
                } else if (type === 'weekdays') {
                    $recurrenceDays.prop('disabled', false);
                    $recurrenceDays.val(WEEKDAYS);
                    $onceDate.prop('disabled', true).val('');
                } else if (type === 'weekly') {
                    // enable multiselect but don't force values (user chooses)
                    $recurrenceDays.prop('disabled', false);
                    // leave current selection as-is (do not overwrite)
                    $onceDate.prop('disabled', true).val('');
                } else if (type === 'once') {
                    // disable weekdays and enable date
                    $recurrenceDays.prop('disabled', true);
                    $recurrenceDays.val([]); // clear selections
                    $onceDate.prop('disabled', false);
                } else { // daily or unknown
                    $recurrenceDays.prop('disabled', true);
                    $recurrenceDays.val([]); // clear selections
                    $onceDate.prop('disabled', true).val('');
                }
            };

            // when recurrence_type changes by user
            $recurrenceType.on('change', (e) => {
                const newType = $recurrenceType.val();
                applyRecurrenceRules(newType);
            });

            // apply initial state based on provided formData or default select value
            const initialType = $recurrenceType.val() || 'daily';
            const initialWeekdays = (function () {
                try {
                    const v = ($recurrenceDays.val());
                    return v;
                } catch (e) {
                    return null;
                }
            })();

            if (Array.isArray(initialWeekdays) && initialWeekdays.length) {
                $recurrenceDays.val(initialWeekdays);
            }

            applyRecurrenceRules(initialType);
            // ---------- end wiring ----------
        } catch (error) {
            log(error);
        }
    });

});


async function loadData(user_id = 'all') {
    try {
        let role = await fetchData('/auth/userrole');
        if (role == 'user') user_id = jq('#userId').val();
        let res = await fetchData(`/auth/daily/tasks/user/${user_id}`);
        let arr = res?.tasks || []
        if (!res.tasks || res.tasks.length === 0) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // 🔁 exit the function
        }
        let tbl = createTable({ data: res.tasks });
        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);
        const table = jq(tbl.table);

        initAdvancedTable($table, {
            filterableKeys: [
                { key: "priority", value: 'Priority', width: '', title: '' },
                { key: "is_active", value: 'Is Active', width: '', title: '' },
                { key: "assigned_by", value: 'Assigned By', width: '', title: '' },
            ]
        })

        const priorityOptions = {
            "high": { text: "High", bgColor: '#ff4863', textColor: 'white', class: 'text-bg-danger' },
            // "high": { text: "High", bgColor: '#', textColor: '', class: 'text-bg-danger' },
            "medium": { text: "Medium", bgColor: '#ffe675', textColor: 'black', class: '' },
            "low": { text: "Low", bgColor: '#b9ff75', textColor: 'black', class: '' } //#00bfff
        };

        attachEditableControls($table[0], 'priority', priorityOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'users_daily_tasks', field: 'priority', value, id };
            if (role == 'user') return;

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        }, () => role !== 'user');


        if (role !== 'user') {
            $tbody.find(`[data-key="description"]`).each(function (i, e) {
                // if (!arr[i].assigned_to) return;
                jq(e).on('dblclick', () => {
                    let id = arr[i].id;
                    addEditDescription(id);
                })
                e.title = 'Double Click to Edit Description!'
            })

            inlineEditAdvance($tbody, {
                dataKeys: ['title'],
                dbtable: 'users_daily_tasks',
                checkNullKeys: ['title']
            });

        }

        $tbody.find(`[data-key="is_active"]`).each(function () {
            const $cell = jq(this);
            let val = $cell.data('value');
            val == 1 ? $cell.text('Yes') : $cell.text('No');
        });

        $tbody.find(`[data-key="priority"], [data-key="recurrence_type"]`).each(function () {
            const $cell = jq(this);
            let val = $cell.data('value');
            $cell.text(toTitleCase(val));
        })

        const activeOptions = {
            "0": { text: "No", bgColor: '#ff5f00', textColor: 'white' },
            "1": { text: "Yes" } //#00bfff
        };

        attachEditableControls($table[0], 'is_active', activeOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'users_daily_tasks', field: 'is_active', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        }, () => role !== 'user');

        $tbody.find(`[data-key="recurrence_weekdays"]`).addClass('text-uppercase').each(function () {
            const value = this.dataset.value; // e.g. "sat,sun"
            if (!value) return;

            const days = value.split(',').map(d => d.trim()); // ["sat","sun"]

            // Get today's day (short form)
            const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); //log(today);
            // JS gives: Mon, Tue, Wed... but your DB uses: mon,tue,wed,sat,sun
            const todayShort = today.slice(0, 3); // to match: "sat"

            // Build new HTML with highlight
            const newHtml = days.map(day => {
                if (day === todayShort) {
                    return `<span style="
                            background: yellow;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-weight: bold;
                        ">${day}</span>`;
                }
                return day;
            }).join(', '); // Adds space after comma

            this.innerHTML = newHtml;
        })

        document.querySelectorAll('td[data-key="recurrence_weekdays"]').forEach(td => {
            const value = td.dataset.value; // e.g. "sat,sun"
            if (!value) return;
        });

        $table.find(`[data-key="is_completed"], [data-key="completion_id"], [data-key="completion_user_id"]`).addClass('d-none');
        

        jq('#dataTable').html(table);

        // Init the complete column & handlers
        titleCaseTableHeaders($thead);
        if (role === 'user') {
            $table.find(`[data-key="created_at"]`).addClass('d-none');
            initCompleteColumn($table);
        }

        addColumnBorders($table);

        // Restore checked state (server-provided)
        restoreCompletedState($table);


    } catch (error) {
        log(error);
    }
}

async function loadUsers() {
    try {
        let sql = "select id, fullname as value from users where user_role = 'user' and is_active=true;";
        let res = await advanceMysqlQuery({ key: 'na', qry: sql });
        let arr = res?.data || [];
        if (!arr.length) return;
        jq('#selectUser').html('');
        let blankOption = new Option('--Select User--', '');
        jq('#selectUser').append(blankOption);
        arr.forEach(u => {
            let option = new Option(u.value, u.id);
            jq('#selectUser').append(option);
        })
    } catch (error) {
        log(error);
    }
}

async function addEditDescription(rowid) {
    try {
        let res = await advanceMysqlQuery({ key: 'na', qry: 'Select * from users_daily_tasks where id =?', values: [rowid] }); //log(res.data); return;
        let data = res?.data[0] || [];
        let form = createFormSmart({ title: 'edit_UDT_description', formData: data, submitBtnText: 'Update', floatingLabels: false });
        let $modal = showModal('Edit Description', 'md', true);
        let $body = $modal.find('.modal-body');
        $body.html(form);
        let $form = $body.find('form');
        $form.on('submit', async (e) => {
            e.preventDefault();
            try {
                let fd = fd2obj(e.target);
                let { description, id } = fd;
                await advanceMysqlQuery({ key: 'updateDailyTaskDescription', values: [description, id] });
                loadData();
                $modal.data('bs.modal').hide();
            } catch (error) {
                log(error);
            }
        })
        $modal.data('bs.modal').show();
    } catch (error) {
        log(error);
    }
}

// Call this AFTER the table has been injected into #dataTable
function initCompleteColumn(tableEl) {
    if (!tableEl) return;
    const table = tableEl instanceof jQuery ? tableEl[0] : tableEl;

    // Helpers
    const formatDate = d => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10);
    const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/complete`;
    const UNDO_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/undo_complete`;

    async function apiPost(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw payload;
        return payload;
    }

    // 1) Add header column 'Done' if not present
    const theadRow = table.querySelector('thead tr');
    if (!theadRow) return;
    if (!theadRow.querySelector('th[data-key="complete"]')) {
        const th = document.createElement('th');
        th.textContent = 'Done';
        th.setAttribute('data-key', 'complete');
        th.style.borderRight = '1px solid rgb(204,204,204)';
        theadRow.appendChild(th);
    }

    // 2) Ensure each body row has a cell at the end (idempotent)
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
        if (row.querySelector('td[data-key="complete"]')) return; // already added

        const idCell = row.querySelector('td[data-key="id"]');
        const createdCell = row.querySelector('td[data-key="created_at"]');
        const taskId = idCell?.dataset?.value || idCell?.textContent?.trim();
        let rawForDate = createdCell?.dataset?.value || formatDate(new Date());
        const forDate = normalizeToIsoDate(rawForDate) || formatDate(new Date());

        const td = document.createElement('td');
        td.setAttribute('data-key', 'complete');
        td.dataset.taskId = taskId;
        td.dataset.forDate = forDate;
        td.style.borderRight = '1px solid rgb(204,204,204)';
        td.innerHTML = `
        <div class="form-check" style="display:flex;align-items:center;gap:.5rem;">
            <input type="checkbox" class="task-complete-checkbox form-check-input" id="chk_${taskId}" data-task-id="${taskId}">
            <label for="chk_${taskId}" class="form-check-label" style="margin:0;font-size:.9rem">Done</label>
            <button class="btn btn-sm btn-link btn-add-remark" title="Add remark" data-task-id="${taskId}" style="margin-left:auto;">✎</button>
        </div>
        <div class="small remark-display d-none" style="margin-top:.25rem;color:#444;font-size:.85rem;"></div>
    `;
        row.appendChild(td);
    });

    // 3) Single delegated listener on tbody for clicks (checkbox + remark button)
    tbody.addEventListener('click', async (ev) => {
        // 3a. remark button click
        const remarkBtn = ev.target.closest('.btn-add-remark');
        if (remarkBtn) {
            ev.preventDefault();
            const taskId = remarkBtn.dataset.taskId; //log(taskId); return; 
            const cell = remarkBtn.closest('td[data-key="complete"]');
            const forDate = cell?.dataset?.forDate || formatDate(new Date());
            const rmRemarks = cell.querySelector('.remark-display')?.textContent?.replace(/^Remark:\s*/i, '').trim() || '';
            const $modal = createFormAdvance({
                title: 'task_completion_remark',
                formData: { rm_task_id: taskId, rm_for_date: forDate, rm_remark: rmRemarks },
                hideFooter: true,
                modal: true,
                modalTitle: 'Task Remarks',
                modalSize: 'md',
                onSubmit: async (api) => { //log(api.values); return;
                    const saveBtn = document.getElementById('rm_save');
                    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
                    try {
                        const { for_date, rm_remarks: remarks } = api.values;
                        const payload = await apiPost(COMPLETE_URL(taskId), { for_date, remarks });
                        // find the cell for this task and update
                        const cell = table.querySelector(`td[data-key="complete"][data-task-id="${taskId}"]`);
                        if (cell) paintCompleted(cell, payload.completion || { remarks: api.rm_remark });
                        // close modal
                        loadData();
                        api.close();
                    } catch (err) {
                        console.error('save remark error', err);
                        alert(err?.error || 'Failed to save remark');
                    } finally {
                        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
                    }
                }
            });
            // const $modal = showModal('Task Remark', 'md', )

            $modal.data('bs.modal').show();

            // populate modal fields
            // const rmTaskId = document.getElementById('rm_task_id');
            // const rmForDate = document.getElementById('rm_for_date');
            // const rmRemarks = document.getElementById('rm_remarks');
            // if (!rmTaskId || !rmForDate || !rmRemarks) {
            //     console.warn('Remark modal fields not found; please include the remark modal markup.');
            //     return;
            // }
            // rmTaskId.value = taskId;
            // rmForDate.value = forDate;
            // rmRemarks.value = cell.querySelector('.remark-display')?.textContent?.replace(/^Remark:\s*/i, '').trim() || '';
            // document.getElementById('remarkModal').style.display = 'block';
            // document.getElementById('remarkModal').setAttribute('aria-hidden', 'false');
            // rmRemarks.focus();
            return;
        }

        // 3b. checkbox click handler
        const chk = ev.target.closest('.task-complete-checkbox');
        if (!chk) return;

        // Wait a tick to ensure checkbox.checked reflects new state
        setTimeout(async () => {
            const taskId = chk.dataset.taskId;
            const cell = chk.closest('td[data-key="complete"]');
            const forDateRaw = cell?.dataset?.forDate || new Date();
            const forDate = normalizeToIsoDate(forDateRaw) || formatDate(new Date());

            chk.disabled = true;

            if (chk.checked) {
                // mark complete
                try {
                    const payload = await apiPost(COMPLETE_URL(taskId), { for_date: forDate, remarks: null });
                    paintCompleted(cell, payload.completion || {});
                } catch (err) {
                    console.error('complete error', err);
                    alert(err?.error || err?.message || 'Failed to mark complete');
                    chk.checked = false; // rollback
                } finally {
                    chk.disabled = false;
                }
            } else {
                // undo completion
                try {
                    await apiPost(UNDO_URL(taskId), { for_date: forDate });
                    paintUncompleted(cell);
                } catch (err) {
                    console.error('undo error', err);
                    alert(err?.error || err?.message || 'Failed to undo completion');
                    chk.checked = true; // rollback
                } finally {
                    chk.disabled = false;
                }
            }
            loadData();
        }, 0);
    });

    // 4) Hook remark modal save - update or create completion with remarks
    const rmForm = document.getElementById('remarkForm');
    if (rmForm) {
        rmForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const taskId = document.getElementById('rm_task_id').value;
            const forDate = document.getElementById('rm_for_date').value || formatDate(new Date());
            const remarks = (document.getElementById('rm_remarks').value || '').trim() || null;
            const saveBtn = document.getElementById('rm_save');
            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }
            try {
                const payload = await apiPost(COMPLETE_URL(taskId), { for_date: forDate, remarks });
                // find the cell for this task and update
                const cell = table.querySelector(`td[data-key="complete"][data-task-id="${taskId}"]`);
                if (cell) paintCompleted(cell, payload.completion || { remarks });
                // close modal
                document.getElementById('remarkModal').style.display = 'none';
                document.getElementById('remarkModal').setAttribute('aria-hidden', 'true');
            } catch (err) {
                console.error('save remark error', err);
                alert(err?.error || 'Failed to save remark');
            } finally {
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
            }
        });
    } else {
        console.warn('remarkForm not found; please include the remark modal markup.');
    }

    // 5) small UI helpers
    function paintCompleted(cell, completion = {}) {
        const chk = cell.querySelector('.task-complete-checkbox');
        const remarkDiv = cell.querySelector('.remark-display');
        if (chk) { chk.checked = true; chk.disabled = false; }
        cell.classList.add('completed-row');
        if (completion.remarks) {
            remarkDiv.innerHTML = `<strong>Remark:</strong> ${escapeHtml(completion.remarks)}`;
        } else {
            remarkDiv.innerHTML = '';
        }
    }

    function paintUncompleted(cell) {
        const chk = cell.querySelector('.task-complete-checkbox');
        const remarkDiv = cell.querySelector('.remark-display');
        if (chk) { chk.checked = false; chk.disabled = false; }
        cell.classList.remove('completed-row');
        if (remarkDiv) remarkDiv.innerHTML = '';
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // 6) If server rendered some completion metadata in attributes, respect them
    Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
        const completeCell = row.querySelector('td[data-key="complete"]');
        if (!completeCell) return;
        // prefer dedicated completion columns if your createTable set data-value attributes
        const isCompletedCell = row.querySelector('td[data-key="is_completed"]');
        const remarksCell = row.querySelector('td[data-key="completion_remarks"]');

        const isCompletedVal = isCompletedCell?.dataset?.value ?? isCompletedCell?.textContent?.trim() ?? '0';
        const remarksValRaw = remarksCell?.dataset?.value ?? remarksCell?.textContent?.trim() ?? null;
        const remarksVal = (remarksValRaw && remarksValRaw !== 'null') ? remarksValRaw : null;

        const chk = completeCell.querySelector('.task-complete-checkbox');
        const remarkDiv = completeCell.querySelector('.remark-display');

        if (String(isCompletedVal) === '1') {
            if (chk) chk.checked = true;
            completeCell.classList.add('completed-row');
            if (remarksVal) remarkDiv.innerHTML = `<strong>Remark:</strong> ${escapeHtml(remarksVal)}`;
            else remarkDiv.innerHTML = '';
        } else {
            if (chk) chk.checked = false;
            completeCell.classList.remove('completed-row');
            remarkDiv.innerHTML = '';
        }
    });
}


// call this after the table is rendered and after initCompleteColumn()
function restoreCompletedState(tableEl) {
    // kept for compatibility / explicit call - it's covered by initCompleteColumn's final loop,
    // but exposed if you prefer to call separately
    const table = tableEl instanceof jQuery ? tableEl[0] : tableEl;
    if (!table) return;

    Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
        const completeCell = row.querySelector('td[data-key="complete"]');
        if (!completeCell) return;
        const isCompletedCell = row.querySelector('td[data-key="is_completed"]');
        const remarksCell = row.querySelector('td[data-key="completion_remarks"]');

        const isCompletedVal = isCompletedCell?.dataset?.value ?? isCompletedCell?.textContent?.trim() ?? '0';
        const remarksValRaw = remarksCell?.dataset?.value ?? remarksCell?.textContent?.trim() ?? null;
        const remarksVal = (remarksValRaw && remarksValRaw !== 'null') ? remarksValRaw : null;

        const chk = completeCell.querySelector('.task-complete-checkbox');
        const remarkDiv = completeCell.querySelector('.remark-display');

        if (String(isCompletedVal) === '1') {
            if (chk) chk.checked = true;
            completeCell.classList.add('completed-row');
            if (remarksVal) remarkDiv.innerHTML = `<strong>Remark:</strong> ${escapeHtml(remarksVal)}`;
            else remarkDiv.innerHTML = '';
        } else {
            if (chk) chk.checked = false;
            completeCell.classList.remove('completed-row');
            remarkDiv.innerHTML = '';
        }
    });

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
}
