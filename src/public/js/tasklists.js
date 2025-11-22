import createAdvanceForm from './_utils/advanceCreateFrom.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import { applySearch } from './_utils/searchTools.js';
import { addColumnBorders, advanceMysqlQuery, createFlyoutMenu, createTable, fetchData, hideTableColumns, initAdvancedTable, inlineEditBox, jq, log, postData, setTableColumnWidths, titleCaseTableHeaders, toTitleCase } from './help.js';

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    // jq('#searchCustomer').on('input', async (e) => {
    //     let q = e.target.value.trim(); //log(q);
    //     if (!q.length) {
    //         jq('div.dataTable').html('');
    //         return;
    //     }
    //     try {
    //         jq('div.dataTable').html('').text('Searching...');
    //         const rows = await searchCustomers(q);
    //         if (!rows.data.length) {
    //             jq('div.dataTable').html('');
    //             return;
    //         }
    //         let tbl = createTableNew({ data: rows.data });
    //         const $table = jq(tbl.table);
    //         const $tbody = jq(tbl.tbody);
    //         const $thead = jq(tbl.thead);

    //         titleCaseTableHeaders($thead);
    //         addColumnBorders($table);

    //         jq('div.dataTable').html(tbl.table);

    //         $table.find('tbody td').each(function () {
    //             const cellText = jq(this).text();
    //             jq(this).html(highlight(cellText, q));
    //         });
    //     } catch (error) {
    //         log(error);
    //     }
    // }).on('blur', (e) => {
    //     if (!e.target.value) jq('div.dataTable').html('');
    // })

    jq('#createDailyTask').on('click', () => {
        const $modal = createAdvanceForm({
            title: 'newTasklist',
            modal: true,
            modalTitle: 'Create Daily Task',
            floatingLabels: false,
            submitBtnText: 'Create',
            hideFooter: true,
            onSubmit: async (api) => {
                try {
                    await postData('/auth/tasklist', api.values);
                    loadData();
                    api.close();
                } catch (error) {
                    log(error);
                }
            }
        });

        $modal.data('bs.modal').show();
        handelCreateTaskModal($modal);
    })
})

const highlight = (text, query) => {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    return text.replace(regex, match => `<span class="text-primary fw-semibold">${match}</span>`);
};

// $table.find('tbody td').each(function () {
//     const cellText = jq(this).text();
//     jq(this).html(highlight(cellText, q));
// });

async function loadData() {
    try {
        const rows = await fetchData('/auth/tasklist/api/'); //log(rows);
        const data = rows?.data || []; //log(data);
        const $dataTbl = jq('#dataTable');

        if (!data.length) {
            $dataTbl.html(`
                <div class="text-center p-4 text-danger">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // 🔁 exit the function
        }

        applySearch('#searchTask', data, ['title', 'description', 'assigned_to'], setTable, { tableSelector: '#dataTable' })

    } catch (error) {
        log(error);
    }
}

function setTable(data) {
    try {
        const $dataTbl = jq('#dataTable');
        const tbl = createTable({ data });
        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);

        inlineEditBox($tbody, 'description', async (value, cell, $row) => {
            const id = $row.find(`[data-key="id"]`).data('value');
            const payload = {
                table: 'tasks_list',
                field: 'description',
                value,
                id
            }
            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        })

        attachEditableControls($table[0], 'priority', {
            "low": { text: 'Low', bgColor: '', textColor: '' },
            "medium": { text: 'Medium', bgColor: '', textColor: '' },
            "high": { text: 'High', bgColor: '', textColor: '' },
        }, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks_list', field: 'priority', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        })

        attachEditableControls($table[0], 'is_active', {
            "1": { text: 'Yes', bgColor: '', textColor: '' },
            "0": { text: 'No', bgColor: '#ff5f00', textColor: 'white' },
        }, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks_list', field: 'is_active', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        })

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

        // $tbody.find(`[data-key="assigned_to"]`).each(function () {
        //     let val = this.dataset.value; //log(val, val.length);
        //     if (!val.length) return;
        //     jq(this).html(val.split(',').join(',<br>'));
        // })

        $tbody.find(`[data-key="assigned_to"]`).each(function () {
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

        // const desc = $table.find(`[data-key="description"]`)[0];
        // desc.style.setProperty('width', '250px', 'important');

        $dataTbl.html($table[0]);

        setTableColumnWidths($table, [
            { key: 'description', width: 350 },
            { key: 'assigned_to', width: 200 }
        ])

        initAdvancedTable($table, {
            filterableKeys: [
                // { key: 'id', value: 'ID', title: 'ID', width: '', class: '' },
                { key: 'title', value: 'Title', title: 'Task Title', width: '', class: '' },
                { key: 'description', value: 'Description', title: 'Description', width: '', class: '' },
                { key: 'priority', value: 'Priority', title: 'Priority', width: '', class: '' },
                { key: 'created_by', value: 'Created By', title: 'Created By', width: '', class: '' },
                { key: 'updated_by', value: 'Updated By', title: 'Updated By', width: '', class: '' },
            ]
        })

        addColumnBorders($table);
        titleCaseTableHeaders($thead, [], ['id']);
        hideTableColumns($table, ['task_list_id', 'old_udt_id'])

        $tbody.find(`[data-key="id"]`).addClass('text-primary role-btn').each((i, e) => {
            jq(e).on('click', () => {
                const fd = data[i]; //log(FD); return;
                const id = data[i].id;
                createFlyoutMenu(e, [
                    { key: 'Edit Task', id: 'editTask' },
                    { key: 'Assign To All', id: 'assignAll' },
                    { key: 'Assign To Selected', id: 'assignSelected' },
                    { key: 'Un Assign Selected', id: 'unAssignSelected' },
                    { key: 'Un-Assign From All', id: 'unassignAll' },
                    { key: 'Delete Task', id: 'deleteTask' },
                    { key: 'Cancel' }
                ]);

                jq('#editTask').on('click', () => {
                    const $modal = createAdvanceForm({
                        title: 'newTasklist',
                        modal: true,
                        formData: fd,
                        modalTitle: 'Update Daily Task',
                        floatingLabels: false,
                        submitBtnText: 'Update',
                        hideFooter: true,
                        onSubmit: async (api) => {
                            try {
                                await axios.put(`/auth/tasklist/update/${fd.id}`, api.values);
                                loadData();
                                api.close();
                            } catch (error) {
                                log(error);
                            }
                        }
                    });

                    $modal.data('bs.modal').show();
                    handelCreateTaskModal($modal, fd);
                });

                jq('#assignAll').on('click', async () => {
                    let cnf = confirm('Are you sure want to Assign this Task to all Active Users?');
                    if (!cnf) return;
                    let rsp = await axios.post('/auth/assignments/assign-to-all-active', { task_list_id: id, taskListId: id });
                    // displayBootstrapAlert(rsp);
                    loadData();
                });

                jq('#unassignAll').on('click', async () => {
                    let cnf = confirm('Are you sure want to Un Assign this Task From all Active Users?');
                    if (!cnf) return;
                    let rsp = await axios.post('/auth/assignments/remove', { task_list_id: id, taskListId: id });
                    displayBootstrapAlert(rsp);
                    loadData();
                })

                jq('#assignSelected').on('click', async () => {
                    const $modal = createAdvanceForm({
                        title: null,
                        formObj: {
                            assigned_to: { label: 'Assigned To', type: 'select', options: [], multiple: true, requird: true, message: 'You can select Multiple Users!' }
                        },
                        modal: true,
                        modalTitle: 'Assign Task to Users',
                        modalSize: 'md',
                        submitBtnText: 'Assign',
                        hideFooter: true,
                        floatingLabels: false,
                        onLoad: async (api) => {
                            try {
                                let res = await advanceMysqlQuery({
                                    key: 'na',
                                    qry: "SELECT u.`id`, u.`fullname` as `value` FROM `users` u LEFT JOIN `user_task_assignments` ta ON ta.user_id = u.id AND ta.`task_list_id` = ? WHERE ta.`user_id` IS NULL AND u.`is_active` = 1 AND u.`user_role` = 'user';",
                                    values: [id]
                                });
                                api.appendOptions('assigned_to', res.data);
                            } catch (error) {
                                log(error);
                            }
                        },
                        onSubmit: async (api) => {
                            try {
                                const payload = {
                                    taskListId: id,
                                    userFilter: {
                                        id_list: api.values.assigned_to
                                    }
                                };
                                let res = await axios.post('/auth/assignments/assign', payload);
                                api.onSuccess('Users Assigned Successfully!');
                                setTimeout(() => {
                                    api.close();
                                    loadData();
                                }, 800);
                            } catch (error) {
                                log(error);
                            }
                        }
                    });

                    $modal.data('bs.modal').show();
                })

                jq('#unAssignSelected').on('click', async () => {
                    const $modal = createAdvanceForm({
                        title: null,
                        formObj: {
                            assigned_to: { label: 'Assigned To', type: 'select', options: [], multiple: true, requird: true, message: 'You can select Multiple Users!' }
                        },
                        modal: true,
                        modalTitle: 'Un Assign Task from Users',
                        modalSize: 'md',
                        submitBtnText: 'Un Assign',
                        hideFooter: true,
                        floatingLabels: false,
                        onLoad: async (api) => {
                            try {
                                let res = await advanceMysqlQuery({
                                    key: 'na',
                                    qry: "SELECT u.`id`, u.`fullname` AS `value` FROM `users` u LEFT JOIN `user_task_assignments` ta ON ta.user_id = u.id AND ta.`task_list_id` = ? WHERE ta.`user_id` IS NOT NULL AND u.`is_active` = 1 AND u.`user_role` = 'user'",
                                    values: [id]
                                });
                                api.appendOptions('assigned_to', res.data);
                            } catch (error) {
                                log(error);
                            }
                        },
                        onSubmit: async (api) => {
                            try {
                                const payload = {
                                    taskListId: id,
                                    userIdList: api.values.assigned_to,
                                    removeCompletions: true
                                };
                                let res = await axios.post('/auth/assignments/remove', payload); log(res);
                                api.onSuccess('Users Un Assigned Successfully!');
                                setTimeout(() => {
                                    api.close();
                                    loadData();
                                }, 800);
                            } catch (error) {
                                log(error);
                            }
                        }
                    });

                    $modal.data('bs.modal').show();
                })

                jq('#deleteTask').on('click', async () => {
                    const role = await fetchData('/auth/userrole');
                    if(role==='user') {
                        alert('Restricted!');
                        return;
                    }
                    let cnf = confirm('Are you sure you want to delete this task?\n\nIt is recommended not to delete tasks; instead, you can simply mark them as inactive.');
                    if (!cnf) return;
                    await axios.delete('/auth/tasklist/delete/' + id);
                    loadData();
                })
            })
        })

        // $table.find('tbody td').each(function () {
        //     const cellText = jq(this).text();
        //     jq(this).html(highlight(cellText, q));
        // });

    } catch (error) {
        log(error);
    }
}

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

    // compare two arrays as unordered sets of strings
    const sameSet = (a, b) => {
        a = normalizeArr(a).map(x => String(x));
        b = normalizeArr(b).map(x => String(x));
        if (a.length !== b.length) return false;
        const sa = new Set(a);
        return b.every(x => sa.has(x));
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

    // --- ADDED: guard to suspend weekdays change handler while we programmatically update it
    let suspendDaysHandler = false;

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

        // Decide what array to set for recurrence weekdays initially:
        let initialDesired = [];
        if (formData && formData.recurrence_weekdays) {
            initialDesired = normalizeArr(formData.recurrence_weekdays);
        } else {
            // fallback: try reading any existing value on the select itself
            try {
                const cur = $recurrenceDays.val();
                initialDesired = normalizeArr(cur);
            } catch (e) {
                initialDesired = [];
            }
        }

        // If recurrence type is 'weekdays' or 'weekends' and no explicit weekdays in formData,
        // set pre-defined sets for the initial population.
        const initialTypeVal = (formData && formData.recurrence_type) || ($recurrenceType && $recurrenceType.val()) || 'daily';
        if ((!initialDesired || initialDesired.length === 0) && initialTypeVal) {
            if (String(initialTypeVal).toLowerCase() === 'weekdays') initialDesired = WEEKDAYS.slice();
            if (String(initialTypeVal).toLowerCase() === 'weekends') initialDesired = WEEKENDS.slice();
        }

        // NEW: infer recurrence_type from given days (reverse mapping)
        const inferTypeFromDays = (days) => {
            days = normalizeArr(days);
            // if once_date has a value, 'once' takes precedence
            try {
                const onceVal = ($onceDate && $onceDate.length) ? String($onceDate.val() || '').trim() : '';
                if (onceVal) return 'once';
            } catch (e) { /* ignore */ }

            if (!days || days.length === 0) {
                // no days selected -> daily (or once handled above)
                return 'daily';
            }
            if (sameSet(days, WEEKDAYS)) return 'weekdays';
            if (sameSet(days, WEEKENDS)) return 'weekends';
            // any other non-empty set => weekly
            return 'weekly';
        };

        // NEW: compute desired set to apply given type, but prefer current selection for 'weekly'
        const computeDesiredForType = (type) => {
            type = String(type || '').toLowerCase();
            if (type === 'weekdays') return WEEKDAYS.slice();
            if (type === 'weekends') return WEEKENDS.slice();
            if (type === 'once') return [];
            // weekly/daily/default: prefer currently selected values if present
            try {
                const cur = normalizeArr($recurrenceDays.val());
                if (cur && cur.length) return cur;
            } catch (e) { /* ignore */ }
            return initialDesired.slice();
        };

        // apply recurrence rules (no longer depends on outer `desired`)
        const applyRecurrenceRules = (type) => {
            type = String(type || '').toLowerCase(); //log(type);

            if (type === 'weekends') {
                $recurrenceDays.prop('disabled', false);
                suspendDaysHandler = true;                 // <-- suspend handler
                robustSetMulti($recurrenceDays, computeDesiredForType('weekends'));
                setTimeout(() => { suspendDaysHandler = false; }, 0);
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            } else if (type === 'weekdays') {
                $recurrenceDays.prop('disabled', false);
                suspendDaysHandler = true;
                robustSetMulti($recurrenceDays, computeDesiredForType('weekdays'));
                setTimeout(() => { suspendDaysHandler = false; }, 0);
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            } else if (type === 'weekly') {
                $recurrenceDays.prop('disabled', false);
                suspendDaysHandler = true;
                robustSetMulti($recurrenceDays, computeDesiredForType('weekly'));
                setTimeout(() => { suspendDaysHandler = false; }, 0);
                $onceDate.prop('disabled', true);
            } else if (type === 'once') {
                $recurrenceDays.prop('disabled', true);
                suspendDaysHandler = true;                 // <-- suspend handler BEFORE clearing
                robustSetMulti($recurrenceDays, []);
                setTimeout(() => { suspendDaysHandler = false; }, 0);
                $onceDate.prop('disabled', false);
                // do NOT clear once_date here — leave it for user or formData; if you want to clear, use robustSetSingle($onceDate, '')
            } else {
                // daily / default: disable weekdays select and clear it
                $recurrenceDays.prop('disabled', true);
                suspendDaysHandler = true;
                robustSetMulti($recurrenceDays, []);
                setTimeout(() => { suspendDaysHandler = false; }, 0);
                // keep once_date cleared/disabled for daily
                robustSetSingle($onceDate, '');
                $onceDate.prop('disabled', true);
            }
        };

        // wire change in recurrence type for future user actions
        if ($recurrenceType && $recurrenceType.length) {
            $recurrenceType.off('change.modalRec').on('change.modalRec', () => {
                const newType = $recurrenceType.val();
                applyRecurrenceRules(newType);
            });
        }

        // NEW: when user manually edits recurrence_weekdays, update recurrence_type accordingly
        if ($recurrenceDays && $recurrenceDays.length) {
            $recurrenceDays.off('change.modalRecDays').on('change.modalRecDays', () => {
                // respect the suspend guard so programmatic changes don't trigger inference
                if (suspendDaysHandler) return;
                try {
                    const curDays = normalizeArr($recurrenceDays.val());
                    const inferred = inferTypeFromDays(curDays);
                    // only update the recurrence_type select if it differs (avoids spurious triggers)
                    if ($recurrenceType && $recurrenceType.length) {
                        const currentType = String($recurrenceType.val() || '').toLowerCase();
                        if (currentType !== inferred) {
                            robustSetSingle($recurrenceType, inferred);
                            // ensure rules are applied for the inferred type (e.g. enable/disable once_date)
                            applyRecurrenceRules(inferred);
                        }
                    }
                } catch (e) { /* ignore */ }
            });
        }

        // Force-set selection immediately + retry a few times (covers late plugin inits)
        // SUSPEND handler while we do initial programmatic population
        suspendDaysHandler = true;
        robustSetMulti($recurrenceDays, initialDesired);
        [50, 150, 350].forEach(delay =>
            setTimeout(() => robustSetMulti($recurrenceDays, initialDesired), delay)
        );
        setTimeout(() => { suspendDaysHandler = false; }, 400);

        // NEW: on initial population, infer the recurrence_type from the days (if formData gave days)
        // Priority: if formData provided recurrence_type explicitly, prefer it; otherwise infer.
        let initialTypeToApply = (formData && formData.recurrence_type) || ($recurrenceType && $recurrenceType.val()) || null;
        if (!initialTypeToApply && initialDesired) {
            initialTypeToApply = inferTypeFromDays(initialDesired);
        } else if (formData && formData.recurrence_weekdays) {
            // if formData has weekdays and a recurrence_type was not explicitly provided,
            // infer so UI shows weekdays/weekends/weekly appropriately.
            initialTypeToApply = inferTypeFromDays(initialDesired);
        }
        // fallback to daily if still empty
        if (!initialTypeToApply) initialTypeToApply = 'daily';

        // apply rules based on deduced initial type
        applyRecurrenceRules(initialTypeToApply);

        // Also set the recurrence_type select visually to match the inferred type (so UI shows weekdays/weekends)
        if ($recurrenceType && $recurrenceType.length) {
            robustSetSingle($recurrenceType, initialTypeToApply);
        }
    })();
}

/**
 * Creates and displays a Bootstrap alert based on the API response data.
 * @param {object} response - The API response object.
 */
function displayBootstrapAlert(response) {
    const isSuccess = response.data && response.data.success === true;
    const message = response.data ? response.data.message : "An unexpected error occurred.";

    // Determine the Bootstrap alert class and icon
    const alertType = isSuccess ? 'alert-success' : 'alert-danger';
    const iconClass = isSuccess ? '✅ Success' : '❌ Error';

    // The HTML for the alert
    const alertHTML = `
        <div class="alert ${alertType} alert-dismissible fade show" role="alert" style="min-width: 300px;">
            <strong>${iconClass}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    const container = document.getElementById('alert-container');

    // Clear any existing alerts
    container.innerHTML = '';

    // Insert the new alert
    container.insertAdjacentHTML('beforeend', alertHTML);

    // Optional: Auto-dismiss the alert after a few seconds
    setTimeout(() => {
        const alertElement = container.querySelector('.alert');
        if (alertElement) {
            // This is a standard Bootstrap way to hide and remove the alert
            new bootstrap.Alert(alertElement).close();
        }
    }, 5000); // 5 seconds
}



