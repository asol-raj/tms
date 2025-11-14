import { addColumnBorders, advanceMysqlQuery, createFormAdvance, createFormSmart, createTable, fd2obj, fetchData, initAdvancedTable, jq, log, postData, titleCaseTableHeaders } from './help.js';
import createForm from './_utils/createForm.esm.js';
import formfields from './formfields.js';
import showModal from './_utils/modal.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';

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
                    let payload = { ...api.values }; log(payload); return;
                    let res = await postData('/auth/daily/tasks', payload); log(res);

                    setTimeout(() => {
                        api.close();
                        loadData();
                    }, 500);
                }
            }); //log($modal);
            const form = $modal[0]; log(form);

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
            const $recurrenceType = $modal.find('[name="recurrence_type"]');
            const $recurrenceDays = $modal.find('[name="recurrence_weekdays"]');
            const $onceDate = $modal.find('[name="once_date"]');

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

                // If your multiselect is replaced by a plugin, refresh it here:
                // e.g. if using Select2: $recurrenceDays.trigger('change.select2');
                // e.g. if using Choices.js: choicesInstance.setChoiceByValue([...]) or choicesInstance.clearStore();
            };

            // when recurrence_type changes by user
            $recurrenceType.on('change', (e) => {
                const newType = $recurrenceType.val();
                applyRecurrenceRules(newType);
            });

            // apply initial state based on provided formData or default select value
            // read currently selected recurrence_type (may be default from createFormAdvance)
            const initialType = $recurrenceType.val() || 'daily';
            // if recurrence_weekdays was provided as array in formData, set it into the select
            const initialWeekdays = (function () {
                try {
                    const v = ($recurrenceDays.val());
                    // .val() returns array for multiple selects when options are selected; if it's a string (initial HTML) leave it
                    return v;
                } catch (e) {
                    return null;
                }
            })();

            // if initialWeekdays is an array, ensure select has them
            if (Array.isArray(initialWeekdays) && initialWeekdays.length) {
                $recurrenceDays.val(initialWeekdays);
                // refresh plugin if needed
            }

            // finally apply the rules so UI matches the current recurrence_type
            applyRecurrenceRules(initialType);

            // Optional: prevent user from typing spaces in recurrence_weekdays values (rare)
            // not necessary if select only
            // $recurrenceDays.on('change', () => {
            //   const vals = $recurrenceDays.val();
            //   if (Array.isArray(vals)) {
            //     // trim spaces if any accidentally there
            //     $recurrenceDays.val(vals.map(v => v.trim()));
            //   }
            // });

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
        titleCaseTableHeaders($thead);
        addColumnBorders($table);
 
        initAdvancedTable($table, {
            filterableKeys: [
                { key: "priority", value: 'Priority', width: '', title: '' },
                { key: "is_active", value: 'Is Active', width: '', title: '' },
                { key: "assigned_by", value: 'Assigned By', width: '', title: '' },
            ]
        })


        const priorityOptions = {
            "high": { text: "High", bgColor: '#ff4863', textColor: 'white' },
            "medium": { text: "Medium", bgColor: '#ffe675', textColor: 'black' }, //#ffe675 , #b9ff75
            "low": { text: "Low", bgColor: '#b9ff75', textColor: 'black' } //#00bfff
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

        jq('#dataTable').html(table);
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

