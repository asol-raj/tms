import {
    addColumnBorders,
    advanceMysqlQuery,
    createFlyoutMenu,
    createFormSmart,
    createTable,
    fd2obj,
    fetchData,
    hideTableColumns,
    initAdvancedTable,
    inlineEditBox,
    jq,
    log,
    postData,
    setTableColumnWidths,
    titleCaseTableHeaders,
    toTitleCase,
    unHideTableColumns
} from './help.js';

import showModal from './_utils/modal.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';
import createAdvanceForm from './_utils/advanceCreateFrom.js';

const $inputDate = jq('#inputDate');
const $userSelect = jq('#selectUser');
const $prevButton = jq('.last');
const $nextButton = jq('.next');

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isToday(dateString) {
    const today = new Date();
    const dateToCheck = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    dateToCheck.setHours(0, 0, 0, 0);
    return today.getTime() === dateToCheck.getTime();
}

function updateButtonState(dateString) {
    if (isToday(dateString)) {
        $nextButton.prop('disabled', true).addClass('disabled');
    } else {
        $nextButton.prop('disabled', false).removeClass('disabled');
    }
}

function updateDate(days) {
    let currentDateString = $inputDate.val();
    if (!currentDateString) {
        currentDateString = formatDate(new Date());
    }

    const newDate = new Date(currentDateString);
    newDate.setDate(newDate.getDate() + days);

    const newDateString = formatDate(newDate);
    $inputDate.val(newDateString);
    updateButtonState(newDateString);
}

async function loadUsers() {
    try {
        const sql = `
            SELECT id, fullname AS value
            FROM users
            WHERE user_role = 'user' AND is_active = TRUE
        `;
        const res = await advanceMysqlQuery({ key: 'na', qry: sql });
        const arr = res?.data || [];
        if (!arr.length) return;

        $userSelect.html('');
        $userSelect.append(new Option('--Select User--', ''));

        arr.forEach(u => {
            $userSelect.append(new Option(u.value, u.id));
        });
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
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function handleUpdate() {
    const currentDate = $inputDate.val() || null;
    const selectedUser = $userSelect.val();
    const urlToFetch = buildApiUrl(currentDate, selectedUser);
    loadData(urlToFetch);
}

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    $inputDate.on('change', handleUpdate);
    $userSelect.on('change', handleUpdate);

    if (!$inputDate.val()) {
        const todayString = formatDate(new Date());
        $inputDate.val(todayString);
    }
    updateButtonState($inputDate.val());

    $prevButton.on('click', () => {
        updateDate(-1);
        handleUpdate();
    });

    $nextButton.on('click', () => {
        if (!$nextButton.is(':disabled')) {
            updateDate(1);
            handleUpdate();
        }
    });    

    handleUpdate();
    loadYears();
    initMonthLateReportHandler();
});

export const getTasksUrl = (date, userId) => {
    const baseUrl = '/api/tasks';
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (userId) params.append('userId', userId);
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

async function loadData(url = '/auth/daily/tasks/data') {
    try {
        const role = await fetchData('/auth/userrole');
        const res = await fetchData(url);
        const tasks = res?.tasks ?? []; 

        if (!tasks.length) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return;
        }

        const tbl = createTable({ data: tasks });
        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);
        const table = $table;

        if (role === 'admin' && typeof handelFlyout === 'function') {
            handelFlyout(tbl, tasks);
        }

        initAdvancedTable($table, {
            filterableKeys: [
                { key: "priority", value: 'Priority' },
                { key: "is_active", value: 'Is Active' },
                { key: "assigned_by", value: 'Assigned By' }
            ]
        });

        const priorityOptions = {
            high: { text: "High", class: 'text-bg-danger' },
            medium: { text: "Medium" },
            low: { text: "Low" }
        };

        attachEditableControls(
            $table[0],
            'priority',
            priorityOptions,
            async (cell, value) => {
                if (role === 'user') return;

                const id = jq(cell).closest('tr').find('[data-key="id"]').data('value');
                const payload = { table: 'users_daily_tasks', field: 'priority', value, id };

                await fetch('/auth/inline/edit', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                await loadData(url);
            },
            () => role !== 'user'
        );

        const activeOptions = {
            "0": { text: "No" },
            "1": { text: "Yes" }
        };

        attachEditableControls(
            $table[0],
            'is_active',
            activeOptions,
            async (cell, value) => {
                const id = jq(cell).closest('tr').find('[data-key="id"]').data('value');
                const payload = { table: 'users_daily_tasks', field: 'is_active', value, id };

                await fetch('/auth/inline/edit', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                await loadData(url);
            },
            () => role !== 'user'
        );

        if (role !== 'user') {
            $tbody.find('[data-key="description"]').each(function (i, el) {
                const $el = jq(el);
                $el.on('dblclick', () => {
                    const taskId = tasks[i]?.id;
                    if (taskId) addEditDescription(taskId);
                });
                el.title = 'Double Click to Edit Description!';
            });

            inlineEditAdvance($tbody, {
                dataKeys: ['title'],
                dbtable: 'users_daily_tasks',
                checkNullKeys: ['title']
            });
        }

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

        $tbody.find('[data-key="recurrence_weekdays"]').addClass('text-uppercase').each(function () {
            const raw = this.dataset.value;
            if (!raw) return;

            const days = raw.split(',').map(d => d.trim());
            const todayShort = new Date()
                .toLocaleDateString('en-US', { weekday: 'short' })
                .toLowerCase()
                .slice(0, 3);

            const html = days.map(d => {
                if (d === todayShort) {
                    return `<span style="background: yellow; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${d}</span>`;
                }
                return d;
            }).join(', ');

            this.innerHTML = html;
        });

        jq('#dataTable').empty().append(table);

        if (typeof initDoneColumn === 'function') {
            initDoneColumn($table, role);
        }

        titleCaseTableHeaders($thead, [], ['id']);

        hideTableColumns($table, [
            'task_list_id',
            'assignment_id',
            'assignment_start_date',
            'assignment_end_date',
            'completion_id',
            'assignment_active',
            'created_at',
            'updated_at',
            'task_active',
            'assigned_on',
            'remarks',
            'comments',
            'comment_by_id'
        ]);

        if (role === 'user') {
            hideTableColumns($table, [
                'id',
                'is_completed',
                'is_active',
                'logged_at',
                'for_date'
            ]);
        } else if (role === 'admin') {
            hideTableColumns($table, ['done']);
        }

        $tbody.find('[data-key="is_delayed"]').each((i, e) => {
            const val = (e.dataset.value || "").toLowerCase();
            if (val.includes("yes")) {
                e.classList.add('text-bg-danger');
            }
        });

        addColumnBorders($table);

        setTableColumnWidths($table, [
            { key: 'description', width: 350 },
            { key: 'assigned_users', width: 200 },
            { key: 'remarks', width: 200 }
        ]);

        // ---- inline remarks/comments editor (DRY) ----
        function attachRemarksEditor(columnName, buildExtraPayload) {
            const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/remarks`;

            inlineEditBox($tbody, columnName, (value, cell, $row) => {
                const taskId = $row.find('[data-key="id"]').data('value');
                const forDate = $inputDate.val() || new Date().toISOString().slice(0, 10);

                const basePayload = { for_date: forDate };
                const extraPayload = buildExtraPayload(value, $row);
                const payload = { ...basePayload, ...extraPayload };

                const url = COMPLETE_URL(taskId);

                axios.post(url, payload, { withCredentials: true })
                    .then(response => {
                        const resp = response?.data ?? {};
                        if (typeof handleUpdate === 'function') {
                            handleUpdate();
                        }
                    })
                    .catch(err => {
                        const msg =
                            err?.response?.data?.error ||
                            err?.response?.data?.message ||
                            err?.message ||
                            'Failed to update completion';
                        alert(msg);
                    });
            });
        }

        if (role === 'user') {
            attachRemarksEditor('remarks', value => ({ remarks: value }));
        } else {
            attachRemarksEditor('comments', value => ({
                comments: value,
                user_id: $userSelect.val()
            }));
        }

        if (role === 'user') {
            unHideTableColumns($table, ['remarks', 'comments']);
        } else {
            const selectedUser = $userSelect.val();
            if (selectedUser) {
                unHideTableColumns($table, ['remarks', 'comments']);
            } else {
                hideTableColumns($table, ['remarks', 'comments']);
            }
        }

        $tbody.find('[data-key="assigned_users"]').each(function () {
            const fullNames = this.dataset.value;
            if (!fullNames) return;

            const firstNames = fullNames
                .split(',')
                .map(fullName => fullName.trim().split(' ')[0]);

            jq(this).html(firstNames.join(', '));
        });

    } catch (error) {
        log(error);
    }
}

// ---------- Month Late Report Modal ----------
async function initMonthLateReportHandler() {
    jq('button.viewReport').on('click', async () => {
        try {
            const userId = Number($userSelect.val()) || null;
            let monthVal = ($inputDate.val() || '').trim();

            if (!monthVal) {
                const now = new Date();
                monthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            const mMatch = monthVal.match(/^(\d{4})-(\d{2})/);
            if (!mMatch) return alert('Invalid month format. Use YYYY-MM or pick a month.');

            const startOfMonth = `${mMatch[1]}-${mMatch[2]}-01`;

            let uri = '/auth/daily/tasks/month/report';
            const Year = jq('#sYears').val();
            const Month = jq('#sMonth').val();
            if (Year && Month) {
                uri += `?year=${Year}&month=${Month}`;
            }

            const res = await postData(uri, { startOfMonth, userId });
            const rows = res?.data || [];
            if (!rows.length) {
                alert('No Records Found!');
                return;
            }

            const $modal = showModal(`Month (Late Report) — ${mMatch[1]}-${mMatch[2]}`, 'fullscreen');
            const $body = $modal.find('div.modal-body');
            $body.html('<div class="text-center py-4">Loading report…</div>');
            $modal.data('bs.modal').show();

            const start = new Date(startOfMonth + 'T00:00:00');
            const last = new Date(start.getFullYear(), start.getMonth() + 1, 0);
            const forDates = [];
            for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                forDates.push(`${yyyy}-${mm}-${dd}`);
            }

            function normalizeIsoDate(v) {
                if (!v) return null;
                if (v instanceof Date) return v.toISOString().slice(0, 10);
                return String(v).slice(0, 10);
            }

            const tasksMap = new Map();
            for (const r of rows) {
                const isoDate = normalizeIsoDate(r.for_date);
                if (!tasksMap.has(r.task_id)) {
                    tasksMap.set(r.task_id, {
                        task_id: r.task_id,
                        task_list_id: r.task_list_id,
                        title: r.title,
                        cells: {}
                    });
                }
                tasksMap.get(r.task_id).cells[isoDate] = {
                    status: r.status,
                    hours_late: r.hours_late != null ? Number(r.hours_late) : null,
                    completed_at: r.completed_at || null,
                    remarks: r.remarks ?? null
                };
            }

            const matrixRows = Array.from(tasksMap.values()).map(t => {
                const cells = forDates.map(dt => {
                    const c = t.cells[dt];
                    if (!c) {
                        return { status: 'N/A', hours_late: null, completed_at: null, remarks: null };
                    }
                    return c;
                });
                return {
                    task_id: t.task_id,
                    task_list_id: t.task_list_id,
                    title: t.title,
                    cells
                };
            });

            const tableId = `report_table_${Date.now()}`;
            const $table = jq(`<div class="table-responsive"></div>`);

            const $tbl = jq(`
                <table id="${tableId}" class="table table-bordered table-sm text-center">
                    <thead class="table-light">
                        <tr>
                            <th style="min-width:240px">Task</th>
                            ${forDates.map(dt => `<th data-date="${dt}">${dt.slice(8, 10)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixRows.map(row => `
                            <tr>
                                <td class="text-start">${escapeHtml(String(row.title || '—'))}</td>
                                ${row.cells.map(cell => {
                                    const v = escapeHtml(String(cell.status || 'N/A'));
                                    return `<td data-key="is_delayed" data-value="${v}">${formatCellHtml(v)}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `);

            const $controls = jq(`
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <button class="btn btn-sm btn-outline-primary" id="exportCsvBtn">Export CSV</button>
                        <button class="btn btn-sm btn-outline-secondary ms-2" id="copyCsvBtn">Copy CSV</button>
                    </div>
                    <div class="small text-muted">
                        <span class="me-3"><span class="badge bg-danger">&nbsp;</span> Late</span>
                        <span class="me-3"><span class="text-muted fst-italic">--</span> Not scheduled</span>
                    </div>
                </div>
            `);

            $table.append($controls).append($tbl);
            $body.html($table);

            jq('#exportCsvBtn').on('click', () => {
                const csv = matrixToCsv(matrixRows, forDates);
                downloadTextFile(csv, `report_${userId}_${mMatch[1]}-${mMatch[2]}.csv`);
            });

            jq('#copyCsvBtn').on('click', async () => {
                const csv = matrixToCsv(matrixRows, forDates);
                try {
                    await navigator.clipboard.writeText(csv);
                    alert('CSV copied to clipboard');
                } catch (e) {
                    alert('Copy failed — your browser may block clipboard. Try Export.');
                }
            });

            $modal.data('report', { month: `${mMatch[1]}-${mMatch[2]}`, days: forDates, matrixRows });

            $body.find('[data-key="is_delayed"]').each((i, e) => {
                const val = (e.dataset.value || '').toLowerCase();
                if (val.includes('yes')) e.classList.add('text-danger');
            });

            function escapeHtml(s) {
                return s.replace(/[&<>"']/g, c => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[c]));
            }

            function formatCellHtml(v) {
                const lower = (v || '').toLowerCase();
                if (lower === 'n/a') return `<span class="text-secondary">--</span>`;
                if (lower === 'no') return `<span class="text-success">${v}</span>`;
                if (lower.startsWith('yes')) return `<span class="text-danger">${v}</span>`;
                return `<span>${v}</span>`;
            }

            function matrixToCsv(matrixRows, days) {
                const header = ['Task', ...days];
                const lines = [header.join(',')];
                for (const r of matrixRows) {
                    const cells = r.cells.map(c => `"${String(c.status || '').replace(/"/g, '""')}"`);
                    lines.push(`"${String(r.title || '').replace(/"/g, '""')}",${cells.join(',')}`);
                }
                return lines.join('\r\n');
            }

            function downloadTextFile(text, filename) {
                const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.setAttribute('download', filename);
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }

        } catch (err) {
            console.error('report error', err);
            alert('Failed to load report: ' + (err?.response?.data?.error || err));
        }
    });
}

// ---------- helpers for modal & editing ----------

function handelCreateTaskModal($modal, formData) {
    try { $modal.data('bs.modal').show(); } catch (e) { }

    const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const WEEKENDS = ['sat', 'sun'];

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

    const normalizeArr = (v) => {
        if (v == null) return [];
        if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
        if (typeof v === 'string') return v === '' ? [] : v.split(',').map(s => s.trim()).filter(Boolean);
        return [String(v)];
    };

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
        if ($el.hasClass('select2-hidden-accessible')) {
            try { $el.trigger('change.select2'); } catch (e) { }
        }
        if ($el.data && $el.data('chosen')) {
            try { $el.trigger('chosen:updated'); } catch (e) { }
        }
    };

    const robustSetSingle = ($el, val) => {
        if (!$el || $el.length === 0) return;
        if (val == null) val = '';
        try { $el.val(val); } catch (e) { }
        try { $el.trigger('change'); } catch (e) { }
        if ($el.hasClass('select2-hidden-accessible')) {
            try { $el.trigger('change.select2'); } catch (e) { }
        }
        if ($el.data && $el.data('chosen')) {
            try { $el.trigger('chosen:updated'); } catch (e) { }
        }
    };

    (async () => {
        const $recurrenceType = await waitFor('[name="recurrence_type"]') || await waitFor('#recurrence_type');
        const $recurrenceDays = await waitFor('[name="recurrence_weekdays"]') || await waitFor('#recurrence_weekdays');
        const $onceDate = await waitFor('[name="once_date"]') || await waitFor('#once_date');

        if ((!$recurrenceDays || !$recurrenceDays.length) &&
            (!$recurrenceType || !$recurrenceType.length)) return;

        try {
            if (formData) {
                if ($recurrenceType && $recurrenceType.length) {
                    robustSetSingle($recurrenceType, formData.recurrence_type);
                }

                if ($onceDate && $onceDate.length && formData.once_date) {
                    let dstr = formData.once_date;
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
        } catch (e) {
            console.warn('populate basic fields err', e);
        }

        let desired = [];
        if (formData && formData.recurrence_weekdays) {
            desired = normalizeArr(formData.recurrence_weekdays);
        } else {
            try {
                const cur = $recurrenceDays?.val();
                desired = normalizeArr(cur);
            } catch {
                desired = [];
            }
        }

        const typeVal =
            (formData && formData.recurrence_type) ||
            ($recurrenceType && $recurrenceType.val()) ||
            'daily';

        if ((!desired || !desired.length) && typeVal) {
            const t = String(typeVal).toLowerCase();
            if (t === 'weekdays') desired = WEEKDAYS;
            if (t === 'weekends') desired = WEEKENDS;
        }

        const applyRecurrenceRules = (type) => {
            type = String(type || '').toLowerCase();
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

        if ($recurrenceType && $recurrenceType.length) {
            $recurrenceType.off('change.modalRec').on('change.modalRec', () => {
                applyRecurrenceRules($recurrenceType.val());
            });
        }

        robustSetMulti($recurrenceDays, desired);
        [50, 150, 350].forEach(delay => {
            setTimeout(() => robustSetMulti($recurrenceDays, desired), delay);
        });

        applyRecurrenceRules(
            (formData && formData.recurrence_type) ||
            ($recurrenceType && $recurrenceType.val()) ||
            'daily'
        );
    })();
}

async function handelFlyout(tbl, arr) {
    const $tbody = jq(tbl.tbody);

    $tbody.find('[data-key="id"]').addClass('text-primary role-btn').each((i, e) => {
        jq(e).on('click', () => {
            const formData = arr[i];

            createFlyoutMenu(e, [
                { key: 'Edit', id: 'editTask' },
                { key: 'Cancel' }
            ]);

            jq('#editTask').on('click', () => {
                const $modal = createAdvanceForm({
                    title: 'newTasklist',
                    modal: true,
                    formData,
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
        });
    });
}

async function addEditDescription(rowid) {
    try {
        const res = await advanceMysqlQuery({
            key: 'na',
            qry: 'SELECT * FROM users_daily_tasks WHERE id = ?',
            values: [rowid]
        });

        const data = res?.data?.[0] || {};
        const form = createFormSmart({
            title: 'edit_UDT_description',
            formData: data,
            submitBtnText: 'Update',
            floatingLabels: false
        });

        const $modal = showModal('Edit Description', 'md', true);
        const $body = $modal.find('.modal-body');
        $body.html(form);

        const $form = $body.find('form');
        $form.on('submit', async (e) => {
            e.preventDefault();
            try {
                const fd = fd2obj(e.target);
                const { description, id } = fd;
                await advanceMysqlQuery({
                    key: 'updateDailyTaskDescription',
                    values: [description, id]
                });
                loadData();
                $modal.data('bs.modal').hide();
            } catch (error) {
                log(error);
            }
        });

        $modal.data('bs.modal').show();
    } catch (error) {
        log(error);
    }
}

function initDoneColumn(tableArg, role) {
    const $table = (tableArg instanceof jQuery) ? tableArg : jq(tableArg);
    if (!$table || !$table.length) return;

    const COMPLETE_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/complete`;
    const UNDO_URL = id => `/auth/daily/tasks/${encodeURIComponent(id)}/undo_complete`;

    const $theadRow = $table.find('thead tr').first();
    if ($theadRow.length && !$theadRow.find('th[data-key="done"]').length) {
        $theadRow.append('<th data-key="done" style="border-right:none">Done</th>');
    }

    $table.find('tbody tr').each(function () {
        const $row = jq(this);

        let $doneCell = $row.find('td[data-key="done"]').first();
        if (!$doneCell.length) {
            $doneCell = jq('<td data-key="done" style="border-right:none"></td>');
            $row.append($doneCell);
        } else {
            $doneCell.empty();
        }

        const $idCell = $row.find('td[data-key="id"]').first();
        const taskId = $idCell.data('value') ?? $idCell.text().trim();

        const $isCompCell = $row.find('td[data-key="is_completed"]').first();
        const rawVal = $isCompCell.data('value') ?? $isCompCell.text().trim() ?? '0';
        const isCompleted = String(rawVal) === '1' || String(rawVal).toLowerCase() === 'true';

        if (!$doneCell.find('.done-checkbox').length) {
            const $chk = jq('<input type="checkbox" class="done-checkbox form-check-input" style="margin-right:6px;">')
                .attr('data-task-id', taskId);

            $chk.prop('checked', !!isCompleted);

            if (role !== 'user') {
                $chk.prop('disabled', true);
            }

            $doneCell.append($chk);
        }
    });

    $table.off('change', '.done-checkbox');

    $table.on('change', '.done-checkbox', function () {
        const $chk = jq(this);
        const taskId = $chk.data('task-id');
        const checked = $chk.is(':checked');
        const $cell = $chk.closest('td[data-key="done"]');

        const $remarkCell = $chk.closest('tr').find('[data-key="remarks"]');
        const remarks = $remarkCell.data('value');

        $chk.prop('disabled', true);

        const url = checked ? COMPLETE_URL(taskId) : UNDO_URL(taskId);
        const payload = {
            for_date: $inputDate.val() || new Date().toISOString().slice(0, 10),
            remarks
        };

        axios.post(url, payload, { withCredentials: true })
            .then(response => {
                const resp = response?.data ?? {};
                if (checked) $cell.addClass('completed-row');
                else $cell.removeClass('completed-row');

                if (resp?.completion?.id) $cell.data('completion_id', resp.completion.id);
                if (resp?.completion?.is_completed != null) {
                    $cell.data('value', String(resp.completion.is_completed));
                }

                if (typeof handleUpdate === 'function') {
                    handleUpdate();
                }
            })
            .catch(err => {
                $chk.prop('checked', !checked);
                const msg =
                    err?.response?.data?.error ||
                    err?.response?.data?.message ||
                    err?.message ||
                    'Failed to update completion';
                alert(msg);
            })
            .finally(() => {
                if (role === 'user') $chk.prop('disabled', false);
            });
    });
}

async function loadYears() {
    try {
        const $selectYears = jq('#sYears');
        $selectYears.append(new Option('Select Year', ''));

        const res = await advanceMysqlQuery({
            key: 'na',
            qry: 'SELECT DISTINCT YEAR(created_at) years FROM tasks_list ORDER BY years;'
        });

        const arr = res?.data || [];
        arr.forEach(y => {
            $selectYears.append(new Option(y.years, y.years));
        });

        loadMonths();
    } catch (error) {
        log(error);
    }
}

async function loadMonths() {
    const $month = jq('#sMonth');
    const months = [
        { month: 0, name: 'January' },
        { month: 1, name: 'February' },
        { month: 2, name: 'March' },
        { month: 3, name: 'April' },
        { month: 4, name: 'May' },
        { month: 5, name: 'June' },
        { month: 6, name: 'July' },
        { month: 7, name: 'August' },
        { month: 8, name: 'September' },
        { month: 9, name: 'October' },
        { month: 10, name: 'November' },
        { month: 11, name: 'December' }
    ];

    $month.empty();
    $month.append('<option value="">Select month</option>');

    months.forEach(m => {
        $month.append(`<option value="${m.month}">${m.name}</option>`);
    });
}
