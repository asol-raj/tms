import { addColumnBorders, advanceMysqlQuery, createFlyoutMenu, createFormAdvance, createFormSmart, createTable, fd2obj, fetchData, initAdvancedTable, jq, log, postData, titleCaseTableHeaders, toTitleCase } from './help.js';
import createForm from './_utils/createForm.esm.js';
import formfields from './formfields.js';
import showModal from './_utils/modal.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';
import createAdvanceForm from './_utils/advanceCreateFrom.js';
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

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    // loadData();

    const $dateInput = jq('#inputDate');
    const $userSelect = jq('#selectUser');

    function buildApiUrl(date, user) {
        const baseUrl = '/auth/get/daily/tasks';
        const params = new URLSearchParams();

        if (date) params.append('date', date);
        if (user) params.append('user_id', user);

        const queryString = params.toString();

        // This ternary operator is a shorter way to write the if/else
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    const handleUpdate = () => {
        // 1. Get current values
        const currentDate = $dateInput.val() || null;
        const selectedUser = $userSelect.val();

        // 2. Call the helper function to get the URL
        const urlToFetch = buildApiUrl(currentDate, selectedUser);

        // 3. Log and display the result
        console.log('URL to fetch:', urlToFetch);

        loadData(urlToFetch);
    };

    $dateInput.on('change', handleUpdate);
    $userSelect.on('change', handleUpdate);

    handleUpdate();

    jq('#createDailyTask').on('click', () => {
        try {
            let user_id = jq('#selectUser').val();
            const $modal = createAdvanceForm({
                title: 'dailyTasksForm',
                modal: true,
                floatingLabels: false,
                modalTitle: 'Create Daily Task',
                formData: { user_id }, // initial values
                hideFooter: true,
                onSubmit: async (api) => {
                    try {
                        if (!api.isValid) {
                            return; // show errors under fields
                        }
                        // normalize recurrence_weekdays array -> csv if needed could be done server-side too
                        let payload = { ...api.values };
                        // if (Array.isArray(payload.recurrence_weekdays)) payload.recurrence_weekdays = payload.recurrence_weekdays.join(',');
    
                        let res = await postData('/auth/daily/tasks', payload);
                        api.onSuccess('Daily Task Created Successfully!'); log(res); //return;
                        log(res);
    
                        setTimeout(() => {
                            api.close();
                            loadData();
                        }, 900);
                        
                    } catch (error) {
                        log(error);
                        api.setSubmitting('Error!');
                        api.onError(error);
                    }
                }
            });

            // form element (the modal content) - depends on createFormAdvance structure
            // assume modal contains textarea/select inputs with name attributes matching form keys
            const form = $modal[0];
            handelCreateTaskModal($modal);

            // ---------- end wiring ----------
        } catch (error) {
            log(error);
        }
    });

    jq('#createDailyTask2').on('click', () => {
        const $modal = createAdvanceForm({
            title: 'dailyTasksForm',
            formObj: {},
            modal: true,
            modalSize: 'md',
            hideFooter: true,
            onSubmit: (api)=>{
                log(api.values);
                api.onSuccess('Record saved successfully'); // hides form (default)
            }
        });

        $modal.data('bs.modal').show();
    })
});

/**
 * Generates the API URL for fetching tasks based on date and user filters.
 *
 * @param {string} date - The date filter (e.g., '2025-11-20').
 * @param {string} userId - The user ID filter (from your 'select' input).
 * @returns {string} The formatted URL path.
 */
export const getTasksUrl = (date, userId) => {
    const baseUrl = '/api/tasks';
    const params = new URLSearchParams();

    // URLSearchParams automatically ignores empty, null, or undefined values,
    // so we can just append them directly.
    params.append('date', date);
    params.append('userId', userId);

    const queryString = params.toString();

    // If the queryString is empty, it returns the base URL.
    // Otherwise, it returns the base URL with the query string.
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// ---------- robust modal handler (drop-in replacement) ----------
// Drop-in replacement for handelCreateTaskModal
// Drop-in replacement: call as handelCreateTaskModal($modal, formData)
function handelCreateTaskModal($modal, formData) {
    try { $modal.data('bs.modal').show(); } catch (e) { }

    const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const WEEKENDS = ['sat', 'sun'];

    // wait for selector inside modal (with retries)
    const waitFor = (selector, attempts = 12, delay = 40) => {
        return new Promise(resolve => {
            let tries = 0;
            const iv = setInterval(() => {
                tries++;
                const $el = $modal.find(selector);
                if ($el.length || tries >= attempts) {
                    clearInterval(iv);
                    resolve($el);
                }
            }, delay);
        });
    };

    // normalize various incoming forms to array of strings
    const normalizeArr = (v) => {
        if (v == null) return [];
        if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
        if (typeof v === 'string') return v === '' ? [] : v.split(',').map(s => s.trim()).filter(Boolean);
        return [String(v)];
    };

    // robustly set multi-select: val + option.selected + trigger events
    const robustSetMulti = ($el, values) => {
        if (!$el || $el.length === 0) return;
        values = normalizeArr(values);

        try { $el.val(values); } catch (e) { }
        try {
            $el.find('option').each((i, opt) => {
                const v = opt.value != null ? String(opt.value) : '';
                opt.selected = values.indexOf(v) !== -1;
            });
        } catch (e) { }
        try { $el.trigger('change'); } catch (e) { }
        if ($el.hasClass('select2-hidden-accessible')) { try { $el.trigger('change.select2'); } catch (e) { } }
        if ($el.data && $el.data('chosen')) { try { $el.trigger('chosen:updated'); } catch (e) { } }
    };

    // robust single set (for recurrence_type, once_date)
    const robustSetSingle = ($el, val) => {
        if (!$el || $el.length === 0) return;
        if (val == null) val = '';
        try { $el.val(val); } catch (e) { }
        try { $el.trigger('change'); } catch (e) { }
        if ($el.hasClass('select2-hidden-accessible')) { try { $el.trigger('change.select2'); } catch (e) { } }
        if ($el.data && $el.data('chosen')) { try { $el.trigger('chosen:updated'); } catch (e) { } }
    };

    (async () => {
        const $recurrenceType = await waitFor('[name="recurrence_type"]') || await waitFor('#recurrence_type');
        const $recurrenceDays = await waitFor('[name="recurrence_weekdays"]') || await waitFor('#recurrence_weekdays');
        const $onceDate = await waitFor('[name="once_date"]') || await waitFor('#once_date');

        // If nothing exists, nothing to do
        if ((!$recurrenceDays || $recurrenceDays.length === 0) && (!$recurrenceType || $recurrenceType.length === 0)) return;

        // Populate basic fields from formData if available (don't override user edited values)
        try {
            if (formData) {
                if ($recurrenceType && $recurrenceType.length) robustSetSingle($recurrenceType, formData.recurrence_type);
                // once_date: normalize to yyyy-mm-dd if possible
                if ($onceDate && $onceDate.length && formData.once_date) {
                    let dstr = formData.once_date;
                    // try Date parsing for common formats
                    const d = new Date(dstr);
                    if (!isNaN(d.getTime())) {
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        dstr = `${yyyy}-${mm}-${dd}`;
                    }
                    robustSetSingle($onceDate, dstr);
                }
            }
        } catch (e) { console.warn('populate basic fields err', e); }

        // Decide what array to set for recurrence weekdays:
        let desired = [];
        if (formData && formData.recurrence_weekdays) {
            desired = normalizeArr(formData.recurrence_weekdays);
        } else {
            // fallback: try reading any existing value on the select itself
            try {
                const cur = $recurrenceDays.val();
                desired = normalizeArr(cur);
            } catch (e) {
                desired = [];
            }
        }

        // If recurrence type is 'weekdays' or 'weekends' and no explicit weekdays in formData,
        // set pre-defined sets.
        const typeVal = (formData && formData.recurrence_type) || ($recurrenceType && $recurrenceType.val()) || 'daily';
        if ((!desired || desired.length === 0) && typeVal) {
            if (String(typeVal).toLowerCase() === 'weekdays') desired = WEEKDAYS;
            if (String(typeVal).toLowerCase() === 'weekends') desired = WEEKENDS;
        }

        // apply initial rules: enable/disable fields and set selection
        const applyRecurrenceRules = (type) => {
            type = String(type || '').toLowerCase(); log(type)
            if (type === 'weekends') {
                $recurrenceDays.prop('disabled', false);
                robustSetMulti($recurrenceDays, desired.length ? desired : WEEKENDS);
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            } else if (type === 'weekdays') {
                $recurrenceDays.prop('disabled', false);
                robustSetMulti($recurrenceDays, desired.length ? desired : WEEKDAYS);
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            } else if (type === 'weekly') {
                $recurrenceDays.prop('disabled', false);
                robustSetMulti($recurrenceDays, desired);
                $onceDate.prop('disabled', true);
            } else if (type === 'once') {
                $recurrenceDays.prop('disabled', true);
                robustSetMulti($recurrenceDays, []);
                $onceDate.prop('disabled', false);
            } else {
                $recurrenceDays.prop('disabled', true);
                robustSetMulti($recurrenceDays, []);
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            }
        };

        // wire change in recurrence type for future user actions
        if ($recurrenceType && $recurrenceType.length) {
            $recurrenceType.off('change.modalRec').on('change.modalRec', () => {
                applyRecurrenceRules($recurrenceType.val());
            });
        }

        // Force-set selection immediately + retry a few times (covers late plugin inits)
        robustSetMulti($recurrenceDays, desired);
        [50, 150, 350].forEach(delay => setTimeout(() => robustSetMulti($recurrenceDays, desired), delay));

        // apply rules based on current or provided type
        applyRecurrenceRules((formData && formData.recurrence_type) || ($recurrenceType && $recurrenceType.val()) || 'daily');
    })();
}

// ---------- improved edit flow inside handelFlyout (replace only the edit click handler part) ----------
async function handelFlyout(tbl, arr) {
    const $table = jq(tbl.table);
    const $tbody = jq(tbl.tbody);
    const $thead = jq(tbl.thead);
    const table = jq(tbl.table);

    $tbody.find(`[data-key="id"]`).addClass('text-primary role-btn').each((i, e) => {
        jq(e).on('click', () => {
            let data = arr[i]; log(data);
            createFlyoutMenu(e, [
                { key: 'Edit', id: 'editTask' },
                { key: 'Delete', id: 'delTask' },
                { key: 'Cancel' }
            ]);

            jq('#editTask').off('click.editTask').on('click.editTask', async () => {
                try {
                    let res = await advanceMysqlQuery({ key: 'na', qry: 'Select * from users_daily_tasks where id =?', values: [data.id] });
                    let formData = res?.data && res.data[0] ? res.data[0] : null;
                    if (!formData) return;

                    // NORMALIZE recurrence_weekdays: accept array or comma string -> ensure array
                    if (Array.isArray(formData.recurrence_weekdays)) {
                        // ok
                    } else if (formData.recurrence_weekdays && typeof formData.recurrence_weekdays === 'string') {
                        formData.recurrence_weekdays = formData.recurrence_weekdays.split(',').map(s => s.trim()).filter(Boolean);
                    } else {
                        formData.recurrence_weekdays = [];
                    }

                    // Format once_date to yyyy-mm-dd for input[type=date] if needed
                    if (formData.once_date && typeof formData.once_date === 'string') {
                        const d = new Date(formData.once_date);
                        if (!isNaN(d.getTime())) {
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            formData.once_date = `${yyyy}-${mm}-${dd}`;
                        }
                    }

                    // If assigned_by / user_id are numbers but your form expects strings, ensure consistent types
                    if (formData.assigned_by != null) formData.assigned_by = String(formData.assigned_by);
                    if (formData.user_id != null) formData.user_id = String(formData.user_id);
                    if (formData.priority != null) formData.priority = String(formData.priority);
                    if (formData.is_active != null) formData.is_active = String(formData.is_active);
                    log(formData);
                    let $modal = createAdvanceForm({
                        title: 'dailyTasksForm',
                        formData,
                        modal: true,
                        modalTitle: 'Edit Users Daily Tasks',
                        hideFooter: true,
                        floatingLabels: false,
                        onSubmit: async (api) => {
                            try {
                                // If backend requires comma string for recurrence_weekdays convert here.
                                // If your backend accepts arrays, remove or comment out the next two lines.
                                if (Array.isArray(api.values.recurrence_weekdays)) {
                                    api.values.recurrence_weekdays = api.values.recurrence_weekdays.join(',');
                                }

                                let rsp = await axios.put(`/auth/daily/tasks/${data.id}`, api.values);
                                setTimeout(() => {
                                    api.close();
                                    loadData();
                                }, 500);
                            } catch (error) {
                                log(error);
                            }
                        }
                    });

                    // ensure modal controls get initialized and populated
                    handelCreateTaskModal($modal, formData);

                } catch (err) {
                    log('fetch task for edit err', err);
                }
            })
        })
    })
}

async function loadData(url = '/auth/get/daily/tasks') {
    try {
        let role = await fetchData('/auth/userrole');
        // if (role == 'user') user_id = jq('#userId').val();
        let res = await fetchData(url); //log(res);
        // let res = await fetchData(`/auth/daily/tasks/user/${user_id}`);
        // let res = await fetchData(`/auth/daily/tasks/date/2025-11-15?user_id=${user_id}`);

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

        handelFlyout(tbl, arr);

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

        $table.find(`[data-key="is_completed"], [data-key="completion_id"], [data-key="completion_user_id"], [data-key="user_id"]`).addClass('d-none');


        jq('#dataTable').html(table);

        // Init the complete column & handlers
        titleCaseTableHeaders($thead);
        if (role === 'user') {
            $table.find(`[data-key="created_at"],[data-key="is_active"]`).addClass('d-none');
            initCompleteColumn($table);
        }

        addColumnBorders($table);

        // Restore checked state (server-provided)
        restoreCompletedState($table);

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
        let rawForDate = formatDate(new Date());
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
        <div class="small remark-display" style="margin-top:.25rem;color:#444;font-size:.85rem;"></div>
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
            const forDate = cell?.dataset?.forDate || formatDate(new Date()); //log(cell?.dataset?.forDate); return;
            // const rmRemarks = cell.querySelector('.remark-display')?.textContent?.replace(/^Remark:\s*/i, '').trim() || '';
            const rmRemarks = jq(cell).closest('tr').find(`[data-key="remarks"]`).data('value');

            const $modal = createAdvanceForm({
                title: 'task_completion_remark',
                formData: { for_date: forDate, remarks: rmRemarks },
                hideFooter: true,
                modal: true,
                modalTitle: 'Task Remarks',
                modalSize: 'md',
                onSubmit: async (api) => {
                    try {

                        // Step 1: Immediately show "Saving..." and disable button
                        api.setSubmitting('Saving...');   // this = setButtonText + disableSubmit

                        // Get values
                        const { for_date, remarks } = api.values; //log(api.values); return;
                        const forDate = normalizeToIsoDate(for_date) || formatDate(new Date());

                        // Perform API call
                        // const payload = await apiPost(COMPLETE_URL(taskId), { for_date, remarks });
                        const payload = await apiPost(COMPLETE_URL(taskId), { for_date: forDate, remarks }); //log(payload);

                        // Update table cell
                        const cell = table.querySelector(`td[data-key="complete"][data-task-id="${taskId}"]`);
                        if (cell) {
                            paintCompleted(cell, payload?.completion || { remarks });
                        }

                        // Step 2: After successful save → button should say "Saved"
                        api.setButtonText('Saved');

                        // Step 3: Keep button disabled  
                        api.disableSubmit();   // ensure it stays disabled even if something re-enables it

                        // Reload table
                        loadData();
                        setTimeout(() => {
                            api.close();
                        }, 500);

                    } catch (err) {
                        console.error('save remark error', err);
                        alert(err?.error || 'Failed to save remark');

                        // OPTIONAL: if save fails, re-enable button
                        api.enableSubmit();
                        api.setButtonText('Try Again');
                    }
                    // ❌ do NOT use api.resetSubmit();
                }
            });

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
        const remarksCell = row.querySelector('td[data-key="remarks"]');

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
