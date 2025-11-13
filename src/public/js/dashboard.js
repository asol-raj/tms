import formfields from './formfields.js';
import { log, jq, advanceMysqlQuery, createFormSmart, fd2obj, postData, createTable, addColumnBorders, titleCaseTableHeaders, fetchData, toTitleCase, initAdvancedTable } from './help.js';
import createForm from './_utils/createForm.esm.js';
import showModal from './_utils/modal.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';

import attachEditableControls from './_utils/flyoutmenu.js';


document.addEventListener('DOMContentLoaded', async () => {
    loadData();
    loadPosts();

    // --- Selectors ---
    const $formContainer = jq('#createPostContainer');
    const $form = jq('#createPost');
    const $showBtn = jq('#showPostFormBtn');
    const $cancelBtn = jq('#cancelPostBtn');
    const $postMsg = jq('#postMsg');

    // --- Helper Functions ---
    function showForm() {
        $showBtn.hide(); // Hide the '+' button
        $formContainer.removeClass('d-none'); // Show the form
        $postMsg.focus(); // Good UX: auto-focus the textarea
    }

    function hideForm() {
        $formContainer.addClass('d-none'); // Hide the form
        $showBtn.show(); // Show the '+' button
        $postMsg.val(''); // Clear the textarea
    }

    // --- Event Handlers ---

    // 1. Click the floating '+' button
    $showBtn.on('click', showForm);

    // 2. Click the 'Cancel' button
    $cancelBtn.on('click', hideForm);

    $form.on('submit', async (e) => {
        e.preventDefault();
        try {
            let fd = fd2obj(e.target); log(fd);
            let res = await postData('/auth/create/post', fd);
            loadPosts();
            $cancelBtn.trigger('click');
        } catch (error) {
            log(error);
        }
    })


    jq('#updateProfile').on('click', async () => {
        const res = await fetchData('/auth/user/profile'); //log(res.profile); return;
        const $modal = showModal('Update Profile', 'md', true);
        const form = createFormSmart({ title: 'user_profile', formData: res.profile, floatingLabels: false })
        const $body = $modal.find('div.modal-body');
        $body.html(form);
        const $form = $body.find('form');
        $form.on('submit', async (e) => {
            e.preventDefault();
            try {
                let fd = fd2obj(e.target); log(fd);
                let rsp = await postData('/auth/update/profile', fd); log(rsp);
                if (rsp.affectedRows) $modal.data('bs.modal').hide();
            } catch (error) {
                log(error);
            }
        })
        $modal.data('bs.modal').show();

    })

    jq('#changePwd').on('click', () => {
        try {
            const form = createFormSmart({ title: 'changePwd' });
            const $modal = showModal('Change Password', 'md', true);
            const $body = $modal.find('.modal-body');
            $body.html(form);
            const $form = $body.find('form');
            $form.on('submit', async (e) => {
                e.preventDefault();
                try {
                    let fd = fd2obj(e.target); log(fd);
                    const { newPassword, confirmPwd } = fd;
                    if (fd.newPassword.length < 6) throw new Error('Pasword Must be 6 characters long');
                    if (newPassword !== confirmPwd) throw new Error('Password do not matach!');
                    let res = await postData('/auth/password/change', fd); log(res);
                    jq('#formMsg')
                        .removeClass('text-bg-danger')
                        .addClass('text-bg-success rounded px-5').text(res.message)
                    $form.find('button').addClass('disabled').prop('disabled', true);
                } catch (error) {
                    // log(error);
                    if (error.response) {
                        // THIS IS THE ACTUAL ERROR MESSAGE FROM THE SERVER
                        console.error('Server Response:', error.response.data);
                        jq('#formMsg').addClass('text-bg-danger px-5').text(error.response.data.error)
                        console.error('Status Code:', error.response.status);
                    } else {
                        // Something else went wrong (e.g., network error)
                        console.error('Axios Error:', error.message);
                        jq('#formMsg')
                            .removeClass('text-bg-success')
                            .addClass('text-bg-danger rounded px-5').text(error.message)
                    }
                }
            })
            $modal.data('bs.modal').show();
        } catch (error) {
            // log(error);

        }
    })

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
            let fd = fd2obj(e.target);
            let res = await postData('/auth/create/task', fd);
            if (res.status) {
                $modal.data('bs.modal').hide();
                loadData('all');
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

});

async function loadPosts() {
    try {
        // Your new query is now much longer, so I'll format it for readability
        let qry = `
            SELECT 
                p.id, p.post, p.publish, 
                u.fullname AS created_by, 
                p.created_at, p.updated_at 
            FROM posts p 
            JOIN users u ON u.id = p.created_by 
            WHERE p.publish=true
            ORDER BY p.id DESC 
            LIMIT 100;
        `;

        let res = await advanceMysqlQuery({ key: 'na', qry }); // log(res);
        let posts = res?.data || [];

        if (!posts.length) {
            jq('div.view-posts').html('<p>No posts found.</p>');
            return;
        }

        let $div = jq('<div>', { class: 'd-flex flex-column gap-4' });

        posts.forEach(post => {
            // Main container for this single post
            let $postItem = jq('<div>', {
                class: 'border-bottom rounded shadow-sm p-2'
            });

            // 1. Add the post content
            let $postContent = jq('<div>', { class: 'h6' });
            $postContent.text(post.post);

            // 2. Create the footer container
            //    'mt-2' adds a little space above the footer
            let $postFooter = jq('<div>', {
                class: 'd-flex justify-content-between mt-4'
            });

            // 3. Create "created by" element (bottom-left)
            //    'post.created_by' now holds the user's fullname from your query
            let $postAuthor = jq('<span>', { class: 'text-secondary small' });
            $postAuthor.text(`By: ${post.created_by}`);

            // 4. Create "created at" date element (bottom-right)
            let date = new Date(post.created_at);
            let formattedDate = date.toLocaleString();
            let $postDate = jq('<span>', { class: 'text-secondary small' });
            $postDate.text(formattedDate);

            // 5. Add author and date to the footer
            $postFooter.append($postAuthor);
            $postFooter.append($postDate);

            // 6. Add the content and the footer to the main post item
            $postItem.append($postContent);
            $postItem.append($postFooter);

            // 7. Add this post item to the list
            $div.append($postItem);
        });

        jq('div.view-posts').html($div);

    } catch (error) {
        log(error);
        jq('div.view-posts').html('<p>Error loading posts.</p>');
    }
}


let currentFilter = 'all'; // global tracker

async function loadData(statusFilter = null) {
    try {
        let role = await fetchData('/auth/userrole');
        if (role !== 'user') jq('button.archived, #creaetPost').removeClass('d-none');
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

        initAdvancedTable($table, {
            filterableKeys: [
                { key: "priority", value: 'Priority', width: '', title: '' },
                { key: "created_by", value: 'Created By', width: '', title: '' },
                { key: "assigned_to", value: 'Assigned To', width: '', title: '' },
            ]
        })

        addColumnBorders($table);
        titleCaseTableHeaders($thead);
        inlineEditAdvance($tbody, {
            dataKeys: [
                role === 'user' ? 'remarks' : '',
                role === 'admin' ? 'comments' : ''
            ],
            dataSelect: role !== 'user'
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
            "in_progress": { text: "In Progress", bgColor: '#0d6efd', textColor: 'white' },
            "completed": { text: "Completed", bgColor: 'green', textColor: 'white' },
            "archived": { text: "Archived", bgColor: 'red', textColor: 'white' }
        };

        const { archived, ...otherOptions } = statusOptions; //log(otherOptions);
        const finalOptions = role === 'user' ? otherOptions : statusOptions;

        attachEditableControls($table[0], 'status', finalOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks', field: 'status', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        }, (cell, row) => {
            const idCell = row.querySelector('[data-key="assigned_to"]');
            const id = idCell ? idCell.dataset.value : null;
            return id !== 'null';
        }
        );

        const priorityOptions = {
            "high": { text: "High", bgColor: '#ff5f00', textColor: 'white' },
            "medium": { text: "Medium", bgColor: '#ffe675', textColor: 'black' }, //#ffe675 , #b9ff75
            "low": { text: "Low", bgColor: '#b9ff75', textColor: 'black' } //#00bfff
        };

        attachEditableControls($table[0], 'priority', priorityOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'tasks', field: 'priority', value, id };
            if (role == 'user') return;

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        }, () => role !== 'user');


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