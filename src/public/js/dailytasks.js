import { addColumnBorders, advanceMysqlQuery, createFlyoutMenu, createFormAdvance, createFormSmart, createTable, fd2obj, fetchData, hideTableColumns, initAdvancedTable, inlineEditBox, jq, log, postData, setTableColumnWidths, titleCaseTableHeaders, toTitleCase } from './help.js';
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

const $dateInput = jq('#inputDate');
const $userSelect = jq('#selectUser');


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

function buildApiUrl(date, user) {
    const baseUrl = '/auth/daily/tasks/data';
    const params = new URLSearchParams();

    if (date) params.append('date', date);
    if (user) params.append('user_id', user);

    const queryString = params.toString();

    // This ternary operator is a shorter way to write the if/else
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function handleUpdate() {
    // 1. Get current values
    const currentDate = $dateInput.val() || null;
    const selectedUser = $userSelect.val();

    // 2. Call the helper function to get the URL
    const urlToFetch = buildApiUrl(currentDate, selectedUser);

    // 3. Log and display the result
    // console.log('URL to fetch:', urlToFetch);

    loadData(urlToFetch);
};

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    // log(new Date().toISOString().slice(0, 10));

    $dateInput.on('change', handleUpdate);
    $userSelect.on('change', handleUpdate);

    handleUpdate();
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

// let res = await fetchData(`/auth/daily/tasks/user/${user_id}`);
// let res = await fetchData(`/auth/daily/tasks/date/2025-11-15?user_id=${user_id}`);


/**
 * loadData
 *
 * Fetches daily tasks from the server, renders an HTML table, wires UI interactions
 * (filters, editable cells, done column for users), and applies final display rules.
 *
 * This function is intentionally explicit and well-commented so future maintainers
 * can quickly understand each step. It is idempotent and safe to call after any
 * table re-render.
 *
 * @param {string} url - The endpoint to fetch task data from. Defaults to '/auth/daily/tasks/data'.
 */
async function loadData(url = '/auth/daily/tasks/data') {
    try {
        // ---------------------------
        // 1) Fetch current user role & tasks
        // ---------------------------
        // role is expected to be a simple string like 'user' or 'admin'
        const role = await fetchData('/auth/userrole');
        const res = await fetchData(url);

        // Normalize tasks array
        const tasks = res?.tasks ?? [];

        // ---------------------------
        // 2) Handle empty result set
        // ---------------------------
        if (!tasks.length) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // nothing more to do
        }

        // ---------------------------
        // 3) Create table DOM using your helper
        //    Expected shape: createTable({ data }) => { table, thead, tbody, ... }
        // ---------------------------
        const tbl = createTable({ data: tasks });
        const $table = jq(tbl.table);   // jQuery-wrapped <table>
        const $tbody = jq(tbl.tbody);   // jQuery-wrapped <tbody>
        const $thead = jq(tbl.thead);   // jQuery-wrapped <thead>
        // keep a jQuery reference named `table` for legacy usage in your code
        const table = $table;

        // ---------------------------
        // 4) Role-based UI: admin-only flyout behavior
        // ---------------------------
        if (role === 'admin' && typeof handelFlyout === 'function') {
            // handelFlyout expects the table meta and original data array
            handelFlyout(tbl, tasks);
        }

        // ---------------------------
        // 5) Initialize advanced table features (sorting/filtering/pagination)
        // ---------------------------
        initAdvancedTable($table, {
            filterableKeys: [
                { key: "priority", value: 'Priority', width: '', title: '' },
                { key: "is_active", value: 'Is Active', width: '', title: '' },
                { key: "assigned_by", value: 'Assigned By', width: '', title: '' }
            ]
        });

        // ---------------------------
        // 6) Attach in-place editable controls
        //    Priority (only editable by non-users)
        // ---------------------------
        const priorityOptions = {
            "high": { text: "High", bgColor: '#ff4863', textColor: 'white', class: 'text-bg-danger' },
            "medium": { text: "Medium", bgColor: '#ffe675', textColor: 'black', class: '' },
            "low": { text: "Low", bgColor: '#b9ff75', textColor: 'black', class: '' }
        };

        attachEditableControls($table[0], 'priority', priorityOptions, async (cell, value) => {
            // cell -> DOM cell element, value -> newly selected value
            const id = jq(cell).closest('tr').find('[data-key="id"]').data('value');
            const payload = { table: 'users_daily_tasks', field: 'priority', value, id };

            // `role == 'user'` is not allowed to patch — guard here for safety
            if (role === 'user') return;

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // reload current view (preserves filters if currentFilter is used elsewhere)
            if (typeof currentFilter !== 'undefined') {
                await loadData(currentFilter);
            } else {
                await loadData();
            }
        }, () => role !== 'user');

        // ---------------------------
        // 7) Attach editable control for is_active (Yes/No)
        // ---------------------------
        const activeOptions = {
            "0": { text: "No", bgColor: '#ff5f00', textColor: 'white' },
            "1": { text: "Yes" }
        };

        attachEditableControls($table[0], 'is_active', activeOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find('[data-key="id"]').data('value');
            const payload = { table: 'users_daily_tasks', field: 'is_active', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // reload table to reflect changes
            await loadData();
        }, () => role !== 'user');

        // ---------------------------
        // 8) Enable inline editing of description & title for non-users (admins/managers)
        // ---------------------------
        if (role !== 'user') {
            // Description: double-click to edit (calls your helper addEditDescription)
            $tbody.find('[data-key="description"]').each(function (i, el) {
                const $el = jq(el);
                $el.on('dblclick', () => {
                    const taskId = tasks[i]?.id;
                    if (taskId) addEditDescription(taskId);
                });
                el.title = 'Double Click to Edit Description!';
            });

            // Title: advanced inline editor
            inlineEditAdvance($tbody, {
                dataKeys: ['title'],
                dbtable: 'users_daily_tasks',
                checkNullKeys: ['title']
            });
        }

        // ---------------------------
        // 9) Format a few cells for better readability
        //    - is_active -> Yes/No
        //    - priority, recurrence_type -> Title Case
        // ---------------------------
        $tbody.find('[data-key="is_active"]').each(function () {
            const $cell = jq(this);
            const val = $cell.data('value');
            $cell.text(val == 1 ? 'Yes' : 'No');
        });

        $tbody.find('[data-key="priority"], [data-key="recurrence_type"]').each(function () {
            const $cell = jq(this);
            const val = $cell.data('value');
            $cell.text(toTitleCase(val));
        });

        // ---------------------------
        // 10) Highlight today's weekday inside recurrence_weekdays
        //     Example: "sat,sun" -> "sat, <yellow>sun</yellow>" when today is sun
        // ---------------------------
        $tbody.find('[data-key="recurrence_weekdays"]').addClass('text-uppercase').each(function () {
            const raw = this.dataset.value;
            if (!raw) return;

            const days = raw.split(',').map(d => d.trim());
            const todayShort = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase().slice(0, 3);

            const html = days.map(d => {
                if (d === todayShort) {
                    return `<span style="background: yellow; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${d}</span>`;
                }
                return d;
            }).join(', ');

            this.innerHTML = html;
        });

        // ---------------------------
        // 11) Insert table into DOM (always append the built table BEFORE attaching
        //     any behaviors that mutate the visible DOM node)
        // ---------------------------
        jq('#dataTable').empty().append(table);

        // ---------------------------
        // 12) Add the user-facing "Done" column at the end (leaves is_completed cell unchanged)
        //     This function uses axios internally and will call loadData() on success.
        // ---------------------------
        if (typeof initDoneColumn === 'function') {
            initDoneColumn($table, role);
        }

        // ---------------------------
        // 13) Title-case headers and hide columns based on preferences/role
        // ---------------------------
        titleCaseTableHeaders($thead, [], ['id']);

        // Always hide a few internal columns for a cleaner UI
        hideTableColumns($table, ['task_list_id', 'assignment_id', 'assignment_start_date', 'assignment_end_date', 'completion_id', 'assignment_active', 'created_at', 'updated_at', 'task_active']);

        // Additional role-based hides
        if (role === 'user') {
            hideTableColumns($table, [, 'id', 'is_completed', 'is_active', 'logged_at']);
        } else if (role === 'admin') {
            // Admins should not see the "done" column (optional). Keep it disabled/hidden for admins.
            hideTableColumns($table, ['done']);
        }

        // ---------------------------
        // 14) Visual polish
        // ---------------------------
        addColumnBorders($table);
        setTableColumnWidths($table, [
            { key: 'description', width: 350 },
            { key: 'assigned_users', width: 200 },
            { key: 'remarks', width: 300 },
        ])

        inlineEditBox($tbody, 'remarks', (value, cell, $row) => {
            const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/complete`;
            const $cell = jq(cell);
            const $done = $row.find(`[data-key="done"]`);
            const $chk = $done.find('.done-checkbox'); //log($chk);
            const checked = $chk.is(':checked'); log(checked);
            const taskId = $chk.data('task-id');
            const payload = { for_date: $dateInput.val() || new Date().toISOString().slice(0, 10), remarks: value };

            const url = COMPLETE_URL(taskId)

            log(payload); //return;

            axios.post(url, payload, { withCredentials: true })
                .then(response => {
                    // success: you may update cell metadata if server returns it
                    const resp = response?.data ?? {}; log(resp);

                    // 🔥 RELOAD the table on success to reflect authoritative server state
                    if (typeof handleUpdate === 'function') {
                        // call without args to reload default or pass currentFilter if needed
                        handleUpdate();
                    }
                })
                .catch(err => {
                    // rollback checkbox on error
                    // $chk.prop('checked', !checked);
                    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to update completion';
                    alert(msg);
                })
                .finally(() => {
                    // re-enable checkbox only if role is 'user' (otherwise keep disabled)
                    if (role === 'user') $chk.prop('disabled', false);
                });
        })

        $tbody.find(`[data-key="assigned_users"]`).each(function () {
            let fullNames = this.dataset.value;

            // Check if the value is empty or not present
            if (!fullNames) {
                return;
            }

            // 1. Split the string by the comma (,) to get an array of full names
            const namesArray = fullNames.split(',');

            // 2. Use map() to extract the first name from each full name
            const firstNamesArray = namesArray.map(fullName => {
                // Trim spaces, then split by space (' ') and take the first element [0]
                return fullName.trim().split(' ')[0];
            });

            // 3. Join the array of first names back into a string, using the 
            //    comma followed by the <br> tag (',<br>') as the separator
            const resultString = firstNamesArray.join(', ');

            // 4. Update the inner HTML of the current element
            jq(this).html(resultString);
        });

    } catch (error) {
        // Centralized error logging — keep simple so UI doesn't crash unexpectedly
        log(error);
    }
}


// ---------- robust modal handler (drop-in replacement) ----------
// Drop-in replacement for handelCreateTaskModal
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

async function handelFlyout(tbl, arr) {
    const $tbody = jq(tbl.tbody);

    $tbody.find(`[data-key="id"]`).addClass('text-primary role-btn').each((i, e) => {
        jq(e).on('click', () => {
            let formData = arr[i];
            createFlyoutMenu(e, [
                { key: 'Edit', id: 'editTask' },
                { key: 'Cancel' }
            ]);

            jq('#editTask').on('click', () => {
                const $modal = createAdvanceForm({
                    title: 'newTasklist',
                    modal: true,
                    formData: formData,
                    modalTitle: 'Update Daily Task',
                    floatingLabels: false,
                    submitBtnText: 'Update',
                    hideFooter: true,
                    onSubmit: async (api) => {
                        try {
                            await axios.put(`/auth/tasklist/update/${formData.id}`, api.values);
                            loadData();
                            api.close();
                        } catch (error) {
                            log(error);
                        }
                    }
                });

                $modal.data('bs.modal').show();
                handelCreateTaskModal($modal, formData);
            });
        })
    })
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

/**
 * initDoneColumn(tableElementOrSelector, role)
 * - tableElementOrSelector: DOM element, jQuery object or selector for the table
 * - role: 'user' | 'admin' (only 'user' will have active checkboxes)
 *
 * Call this AFTER you append the table into the DOM.
 */
function initDoneColumn(tableArg, role) {
    const $table = (tableArg instanceof jQuery) ? tableArg : jq(tableArg);
    if (!$table || !$table.length) return;
    const date = $dateInput.val(); //log(date);

    // endpoints
    const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/complete`;
    const UNDO_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/undo_complete`;

    // 1) Header: add if missing (data-key="done")
    const $theadRow = $table.find('thead tr').first();
    if ($theadRow.length && !$theadRow.find('th[data-key="done"]').length) {
        $theadRow.append('<th data-key="done" style="border-right:none">Done</th>');
    }

    // 2) Body: ensure each row has a td[data-key="done"] at the end, and inject checkbox
    $table.find('tbody tr').each(function () {
        const $row = jq(this);

        let assigned_on = $row.find(`[data-key="assigned_on"]`).data('value'); //log(assigned_on);
        // prefer existing server-provided cell with data-key="done" else append at end
        let $doneCell = $row.find('td[data-key="done"]').first();
        if (!$doneCell.length) {
            $doneCell = jq('<td data-key="done" style="border-right:none"></td>');
            $row.append($doneCell);
        } else {
            // clear content so we inject fresh UI (but keep any data attrs)
            $doneCell.empty();
        }

        // resolve task id
        const $idCell = $row.find('td[data-key="id"]').first();
        const taskId = $idCell.data('value') ?? $idCell.text().trim();

        // determine initial checked state from server-rendered is_completed cell (if present)
        const $isCompCell = $row.find('td[data-key="is_completed"]').first();
        const rawVal = $isCompCell.data('value') ?? $isCompCell.text().trim() ?? '0';
        const isCompleted = String(rawVal) === '1' || String(rawVal).toLowerCase() === 'true';

        // create checkbox (if not already)
        if (!$doneCell.find('.done-checkbox').length) {
            const $chk = jq(`<input type="checkbox" class="done-checkbox form-check-input" data-task-id="${taskId}" style="margin-right:6px;">`);
            $chk.prop('checked', !!isCompleted);

            // if role is not user, make it disabled/read-only
            if (role !== 'user') {
                $chk.prop('disabled', true);
                // optionally visually hide for admins: comment/uncomment next line
                // $doneCell.addClass('d-none');
            }

            $doneCell.append($chk);
            // optional: small label
            // $doneCell.append('<span style="font-size:.9rem">Done</span>');
        }
    });

    // 3) Delegated handler using axios (one-time binding)
    // Remove previous handler to avoid duplicates
    $table.off('change', '.done-checkbox');

    $table.on('change', '.done-checkbox', function () {
        const $chk = jq(this);
        const taskId = $chk.data('task-id');
        const checked = $chk.is(':checked');
        const $cell = $chk.closest('td[data-key="done"]');
        const $remark = $chk.closest(`[data-key="remarks"]`);
        const remarks = $remark.data('value'); log(remarks)

        // optimistic UI: disable while request runs
        $chk.prop('disabled', true);

        const url = checked ? COMPLETE_URL(taskId) : UNDO_URL(taskId);
        const payload = { for_date: $dateInput.val() || new Date().toISOString().slice(0, 10), remarks: remarks };

        // axios POST with credentials
        axios.post(url, payload, { withCredentials: true })
            .then(response => {
                // success: you may update cell metadata if server returns it
                const resp = response?.data ?? {};

                // reflect visual row state quickly
                if (checked) $cell.addClass('completed-row'); else $cell.removeClass('completed-row');

                if (resp?.completion?.id) $cell.data('completion_id', resp.completion.id);
                if (resp?.completion?.is_completed != null) $cell.data('value', String(resp.completion.is_completed));

                // 🔥 RELOAD the table on success to reflect authoritative server state
                if (typeof handleUpdate === 'function') {
                    // call without args to reload default or pass currentFilter if needed
                    handleUpdate();
                }
            })
            .catch(err => {
                // rollback checkbox on error
                $chk.prop('checked', !checked);
                const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to update completion';
                alert(msg);
            })
            .finally(() => {
                // re-enable checkbox only if role is 'user' (otherwise keep disabled)
                if (role === 'user') $chk.prop('disabled', false);
            });
    });
}


