import createForm from './_utils/createForm.esm.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';
import showModal from './_utils/modal.js';
import formfields from './formfields.js';
import { jq, log, advanceMysqlQuery, createTable, addColumnBorders, titleCaseTableHeaders, createFlyoutMenu, createFormSmart, fd2obj, postData } from './help.js';
document.addEventListener('DOMContentLoaded', (e) => {
    loadData();

    jq('#register').on('click', async (e) => {
        try {
            const form = createForm(formfields.create_user, {
                modal: true,
                modalTitle: 'User Registration',
                modalSize: 'md',
                formid: 'createUser',
                colbreak: 10,
                onSubmit: async (api) => {
                    try {
                        const vals = api.values(); //log(vals); //return;
                        let { email, password, fullname, username, userrole } = vals
                        const response = await fetch('/register', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email,
                                password,
                                fullname: fullname || null,
                                username: username || null, // Send null if empty
                                userrole: userrole || 'user'
                            }),
                        });
                        const data = await response.json();
                        if (response.ok) {
                            // Registration successful
                            api.showSuccess('Registration successful! You can now log in.');
                            loadData();
                            return true;
                        } else {
                            throw new Error(data?.message || 'Failed to create User.');
                        }
                    } catch (error) {
                        api.showError(error.message || 'Unexpected error occurred.');
                        console.error(error);
                        throw error; // ensures form stays open
                    }
                }
            }); log(form);


        } catch (error) {
            log(error);
        }
    })
})

async function loadData() {
    try {
        let sql = "SELECT `id`, `username`, `fullname`, `email`, `user_role`, `is_active`, date_format(`created_at`, '%m-%d-%Y, %r') as `created_at` FROM `users` ORDER BY id"
        let res = await advanceMysqlQuery({ key: 'na', qry: sql });
        if (!res.data || res.data.length === 0) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // 🔁 exit the function
        }
        let arr = res?.data || [];
        let tbl = createTable({ data: arr });

        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);

        addColumnBorders($table);
        titleCaseTableHeaders($thead);

        $tbody.find(`[data-key="id"]`).addClass('text-primary role-btn').each((i, e) => {
            jq(e).on('click', () => {
                let { id, is_active, username, email, fullname, user_role } = arr[i];
                createFlyoutMenu(e, [
                    { key: 'Edit', id: 'editUser' },
                    { key: 'Reset Password', id: 'resetPwd' },
                    { key: 'Cancel' }
                ]);

                jq('#editUser').on('click', async () => {
                    let $modal = showModal('Edit User', 'md', true);
                    // Destructure initial data for cleaner access
                    // const { id, is_active, username, fullname, email, user_role } = arr[i];

                    let htmlForm = createFormSmart({ title: 'users', formData: { id, is_active, username, fullname, email, user_role } });
                    let $body = $modal.find('div.modal-body');
                    $body.html(htmlForm);

                    let $form = $body.find('form');
                    // Use .get(0) to get the native DOM element for use with setCustomValidity
                    let usernameInput = $form.find('input[name="username"]').get(0);
                    let emailInput = $form.find('input[name="email"]').get(0);

                    // Attach optimized event listeners
                    jq(usernameInput).on('blur', (e) => {
                        // Pass relevant data to the generalized validation function
                        validateField(e.target, 'username', username, $form, 'Username');
                    });

                    jq(emailInput).on('blur', (e) => {
                        validateField(e.target, 'email', email, $form, 'Email');
                    });

                    $modal.data('bs.modal').show();
                });

                jq('#resetPwd').on('click', async () => {
                    createForm(
                        { password: { label: 'Password', type: 'text', required: true, helptext: 'Must be 6 letters long' }, },
                        {
                            modal: true,
                            modalTitle: 'Reset Password',
                            modalSize: 'md',
                            formid: 'resetPwd',
                            onSubmit: async (api) => { log(api);
                                try {
                                    const vals = api.values();
                                    const { password } = vals;
                                    if(!password || password.length <6) throw new Error('Password must be 6 charaters long');
                                    const res = await fetch('/auth/password/reset', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ userid: id, password }),
                                    }); log(res);
                                    if (res.ok) {
                                        api.showSuccess('Password Changed Successfully');
                                        loadData();
                                        return true;
                                    } else {
                                        throw new Error(data?.message || 'Failed to create User.');
                                    }

                                } catch (error) {
                                    console.error(error);
                                    api.showError(error.message || 'Unexpected error occurred.');
                                    throw error; // ensures form stays open
                                }
                            }
                        }
                    )
                })
            })
        })

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
            const payload = { table: 'users', field: 'is_active', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        });

        const rolesOptions = {
            "user": { text: "user" },
            "manager": { text: "manager" },
            "admin": { text: "admin" }
        };

        attachEditableControls($table[0], 'user_role', rolesOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'users', field: 'user_role', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData(currentFilter);
        });


        inlineEditAdvance($tbody, {
            dataKeys: ['fullname'],
            dbtable: 'users'
        })

        jq('div.dataTable').html(tbl.table);

    } catch (error) {
        log(error);
    }
}


async function validateField(inputElement, queryParam, originalValue, form, fieldName) {
    const value = inputElement.value;
    // Get the corresponding feedback element (assuming Bootstrap structure with a general form message area)
    const $formMsg = jq('#formMsg');
    const $submitButton = form.find('button[type="submit"]');

    if (value === originalValue) {
        // If the value hasn't changed from the original, clear any previous validation messages
        inputElement.setCustomValidity('');
        jq(inputElement).removeClass('is-invalid').addClass('is-valid');
        $submitButton.removeClass("disabled");
        $formMsg.removeClass('text-danger').text('');
        return;
    }

    // Use a parameterized query for validation
    const query = `select id from users where ${queryParam}=?`;
    const rsp = await advanceMysqlQuery({ key: 'na', qry: query, values: [value] });
    log(rsp.data);

    if (rsp.data.length) {
        // Mark as invalid using the native API
        const errorMessage = `${fieldName} Exists!`;
        inputElement.setCustomValidity(errorMessage);
        jq(inputElement).addClass('is-invalid').removeClass('is-valid');
        $submitButton.addClass("disabled");
        $formMsg.addClass('text-danger').text(errorMessage);
    } else {
        // Mark as valid
        inputElement.setCustomValidity('');
        jq(inputElement).removeClass('is-invalid').addClass('is-valid');
        $submitButton.removeClass("disabled");
        $formMsg.removeClass('text-danger').text('');
    }
}

// jquery create/detach/apend

// const rowDiv = jq('<div>', { class: 'row g-2' });
// const col1 = jq('<div>', { class: 'col-6' });
// const col2 = jq('<div>', { class: 'col-6' });

// const formEl = jq(form);
// const userRole = formEl.find('div.user_role');
// const isActive = formEl.find('div.is_active');

// rowDiv.insertBefore(userRole);
// rowDiv.append(col1, col2);
// col1.append(userRole);
// col2.append(isActive); 