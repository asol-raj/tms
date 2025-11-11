import formfields from './formfields.js';
import { log, jq, advanceMysqlQuery, createFormSmart, fd2obj, postData, createTable, addColumnBorders, titleCaseTableHeaders, fetchData, toTitleCase } from './help.js';
import createForm from './_utils/createForm.esm.js';
import showModal from './_utils/modal.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';

import attachEditableControls from './_utils/flyoutmenu.js';


document.addEventListener('DOMContentLoaded', async () => {
    loadData()

    // Common handler for all filter buttons
    // jq('.filter-buttons .filter-btn').on('click', async function () {
    //     const $btn = jq(this);

    //     // Remove active state from all buttons
    //     jq('.filter-buttons .filter-btn')
    //         .removeClass('active btn-success btn-info btn-primary btn-danger btn-outline-info btn-outline-primary btn-outline-success btn-outline-danger')
    //         .each((i, e) => {
    //             // Reset each to its original outline color
    //             if (jq(e).hasClass('pending')) jq(e).addClass('btn-outline-info');
    //             else if (jq(e).hasClass('in_progress')) jq(e).addClass('btn-outline-primary');
    //             else if (jq(e).hasClass('completed')) jq(e).addClass('btn-outline-success');
    //             else if (jq(e).hasClass('archived')) jq(e).addClass('btn-outline-danger');
    //             else jq(e).addClass('btn-outline-success'); // for "All"
    //         });

    //     // Highlight the clicked one
    //     $btn.addClass('active');

    //     // Apply solid color when active
    //     if ($btn.hasClass('pending')) $btn.addClass('btn-info');
    //     else if ($btn.hasClass('in_progress')) $btn.addClass('btn-primary');
    //     else if ($btn.hasClass('completed')) $btn.addClass('btn-success');
    //     else if ($btn.hasClass('archived')) $btn.addClass('btn-danger');
    //     else $btn.addClass('btn-success');

    //     // Determine which filter to apply
    //     let filter = null;
    //     if ($btn.hasClass('all')) filter = 'all';
    //     else if ($btn.hasClass('pending')) filter = 'pending';
    //     else if ($btn.hasClass('in_progress')) filter = 'in_progress';
    //     else if ($btn.hasClass('completed')) filter = 'completed';
    //     else if ($btn.hasClass('archived')) filter = 'archived';

    //     // Fetch data
    //     if (filter === 'all') {
    //         await loadData(); // no filter
    //     } else {
    //         await loadData(filter);
    //     }
    // });


    jq('.filter-buttons .filter-btn').on('click', async function () {
        const $btn = jq(this);
        let filter = null;

        if ($btn.hasClass('all')) filter = 'all';
        else if ($btn.hasClass('pending')) filter = 'pending';
        else if ($btn.hasClass('in_progress')) filter = 'in_progress';
        else if ($btn.hasClass('completed')) filter = 'completed';
        else if ($btn.hasClass('archived')) filter = 'archived';

        setActiveButton(filter);
        await loadData(filter);
    });

    jq('button.create-task').on('click', () => {
        const $modal = showModal('Create Task', 'md', true);

        const form = createFormSmart({ title: 'tasks' });
        const $body = $modal.find('div.modal-body');

        $body.html(form);

        const $form = $body.find('form');
        $modal.data('bs.modal').show();

        $form.on('submit', async (e) => {
            e.preventDefault();
            let fd = fd2obj(e.target); log(fd);
            let res = await postData('/auth/create/task', fd); log(res);
            if (res.status) {
                $modal.data('bs.modal').hide();
                loadData();
            }
        });



        // const form = createForm(formfields.tasks, {
        //     formid: 'userForm',
        //     modal: true,                 // <<— render inside a Bootstrap modal
        //     modalTitle: 'User Registration',
        //     resetOnSuccess: true,
        //     autofocus: true,
        //     trapTab: true,
        //     colbreak: 10,
        //     loadOptions: async (field) => {
        //         if (field === 'assigned_to') {
        //             let rows = await advanceMysqlQuery({ key: 'na', qry: `select id, fullname as value from users where user_role = 'user' and is_active=true;`});
        //             return rows?.data || [];
        //         };
        //         return [];
        //     },
        //     onSubmit: async (api) => {
        //         // Example: validate then “submit”
        //         const vals = api.values();
        //         if (!vals.username || vals.username.length < 3) {
        //             api.setFieldError('username', 'Please enter at least 3 characters.');
        //             throw new Error('Please correct the highlighted errors.');
        //         }
        //         // simulate server
        //         await new Promise(r => setTimeout(r, 400));
        //         return true; // shows success and hides the form
        //     }
        // }); log(form);
    })
})

async function loadData_() {
    try {
        let res = await fetchData('/auth/tasks/view'); //return;
        let tbl = createTable({ data: res.data });

        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);

        $tbody.find(`[data-key="status"]`).each((i, e) => {
            log(jq(e).text());
            jq(e).text(toTitleCase(e.textContent));
        })

        addColumnBorders(jq(tbl.table));
        titleCaseTableHeaders(jq(tbl.thead));
        let role = await fetchData('/auth/userrole');

        inlineEditAdvance(jq(tbl.tbody), {
            dataKeys: [role === 'user' ? 'remarks' : '', role === 'admin' ? 'comments' : ''],
            dataSelect: role === 'admin' ? ([
                { datakey: 'assigned_to', colnaname: 'assigned_to', options: [], qry: "select id, fullname from users where user_role='user' and is_active=true" }
            ]) : [],
            dbtable: 'tasks'
        })

        const statusOptions = {
            // "": {
            //     text: "--- CLEAR ---",
            //     bgColor: "#f5f5f5", // Optional: style for the button
            //     textColor: "#555"
            // },
            "pending": { text: "Pending", bgColor: 'deepskyblue', textColor: 'white' }, // No color
            "in_progress": { text: "In Progress", bgColor: 'blue', textColor: 'white' }, // No color
            "completed": { text: "Completed", bgColor: 'green', textColor: 'white' }, // No color
            "archived": { text: "Archived", bgColor: 'red', textColor: 'white' }, // No color

        };


        attachEditableControls($table[0], 'status', statusOptions, async (cell, value) => {
            let id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks', field: 'status', value, id }; //log(payload);
            // let rs = await advanceMysqlQuery({ key: `update_gender_${table}`, values: [value, id] });
            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            loadData();
        });

        jq('div.dataTable').html(tbl.table);



    } catch (error) {
        log(error);
    }
}

let currentFilter = 'all'; // global tracker

async function loadData(statusFilter = null) {
    try {
        // If no filter is passed, use the current active one
        currentFilter = statusFilter || currentFilter;

        // Build URL with optional query
        let url = '/auth/tasks/view';
        if (currentFilter && currentFilter !== 'all') {
            url += `?status=${currentFilter}`;
        }

        let res = await fetchData(url);
        // ✅ If no records found, show message and stop
        if (!res.data || res.data.length === 0) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // 🔁 exit the function
        }
        let tbl = createTable({ data: res.data });

        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);

        // Format status text
        $tbody.find(`[data-key="status"], [data-key="priority"]`).each((i, e) => {
            jq(e).text(toTitleCase(e.textContent));
        });

        addColumnBorders($table);
        titleCaseTableHeaders($thead);

        let role = await fetchData('/auth/userrole');

        inlineEditAdvance($tbody, {
            dataKeys: [
                role === 'user' ? 'remarks' : '',
                role === 'admin' ? 'comments' : ''
            ],
            dataSelect: role === 'admin'
                ? [{
                    datakey: 'assigned_to',
                    colnaname: 'assigned_to',
                    options: [],
                    qry: "select id, fullname from users where user_role='user' and is_active=true"
                }]
                : [],
            dbtable: 'tasks'
        });

        const statusOptions = {
            "pending": { text: "Pending", bgColor: 'deepskyblue', textColor: 'white' },
            "in_progress": { text: "In Progress", bgColor: 'blue', textColor: 'white' },
            "completed": { text: "Completed", bgColor: 'green', textColor: 'white' },
            "archived": { text: "Archived", bgColor: 'red', textColor: 'white' }
        };

        attachEditableControls($table[0], 'status', statusOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks', field: 'status', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        });

        const priorityOptions = {
            "high": { text: "High", bgColor: 'orange', textColor: 'white' },
            "medium": { text: "Medium", bgColor: 'green', textColor: 'white' },
            "low": { text: "Low", bgColor: 'deepskyblue', textColor: 'white' }
        };

        attachEditableControls($table[0], 'priority', priorityOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks', field: 'priority', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        });

        jq('div.dataTable').html(tbl.table);

    } catch (error) {
        log(error);
    }
}


function setActiveButton(filter) {
    const $buttons = jq('.filter-buttons .filter-btn');

    // Reset all
    $buttons.removeClass('active btn-success btn-info btn-primary btn-danger btn-outline-info btn-outline-primary btn-outline-success btn-outline-danger')
        .each((i, e) => {
            const $e = jq(e);
            if ($e.hasClass('pending')) $e.addClass('btn-outline-info');
            else if ($e.hasClass('in_progress')) $e.addClass('btn-outline-primary');
            else if ($e.hasClass('completed')) $e.addClass('btn-outline-success');
            else if ($e.hasClass('archived')) $e.addClass('btn-outline-danger');
            else $e.addClass('btn-outline-success'); // for "All"
        });

    // Highlight current
    const $active = jq(`.filter-buttons .${filter}`);
    $active.addClass('active');

    if ($active.hasClass('pending')) $active.addClass('btn-info');
    else if ($active.hasClass('in_progress')) $active.addClass('btn-primary');
    else if ($active.hasClass('completed')) $active.addClass('btn-success');
    else if ($active.hasClass('archived')) $active.addClass('btn-danger');
    else $active.addClass('btn-success');
}