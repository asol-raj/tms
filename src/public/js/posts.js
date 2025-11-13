import createForm from './_utils/createForm.esm.js';
import attachEditableControls from './_utils/flyoutmenu.js';
import inlineEditAdvance from './_utils/inlineEditAdvance.js';
import formfields from './formfields.js';
import { advanceMysqlQuery, createFlyoutMenu, createTable, jq, log, postData, titleCaseTableHeaders } from './help.js';

document.addEventListener('DOMContentLoaded', () => {
    loadData();

    jq('#createPost').on('click', () => {
        createForm(formfields.posts, {
            modal: true,
            modalTitle: 'Create Post',
            modalSise: 'lg',
            onSubmit: async (api) => {
                let vals = api.values(); log(vals);
                let res = await postData('/auth/create/post', vals); log(res);
                loadData();
            }
        })
    })
});

async function loadData() {
    try {
        let qry = `
            SELECT 
                p.id, p.post, p.publish, 
                u.fullname AS created_by, 
                date_format(p.created_at, '%m-%d-%Y, %r') created_at, 
                date_format(p.updated_at, '%m-%d-%Y, %r') updated_at 
            FROM posts p 
            JOIN users u ON u.id = p.created_by 
            ORDER BY p.id DESC 
            LIMIT 100;
        `;
        let res = await advanceMysqlQuery({ key: 'na', qry });
        let arr = res.data || [];
        if (!res.data || res.data.length === 0) {
            jq('div.dataTable').html(`
                <div class="text-center p-4 text-muted">
                    <i class="bi bi-info-circle me-2"></i>
                    No records found
                </div>
            `);
            return; // 🔁 exit the function
        }
        let tbl = createTable({ data: arr });
        const $table = jq(tbl.table);
        const $tbody = jq(tbl.tbody);
        const $thead = jq(tbl.thead);

        titleCaseTableHeaders($thead);
        $tbody.find(`[data-key="publish"]`).each(function () {
            const $cell = jq(this);
            let val = $cell.data('value');
            val == 1 ? $cell.text('Yes') : $cell.text('No');
        })
        const publishOptions = {
            "0": { text: "No", bgColor: '#ff5f00', textColor: 'white' },
            "1": { text: "Yes" } //#00bfff
        };

        attachEditableControls($table[0], 'publish', publishOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'posts', field: 'publish', value, id };

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        });

        inlineEditAdvance($tbody, {
            dataKeys: ['post'],
            dbtable: 'posts'
        })

        $tbody.find(`[data-key="id"]`).addClass('text-primary role-btn').each((i, e) => {
            jq(e).on('click', () => {
                let id = arr[i].id;
                createFlyoutMenu(e, [
                    { key: 'Delete Post', id: 'delPost' },
                    { key: 'Cancel' }
                ]);
                jq('#delPost').on('click', async () => {
                    try {
                        let cnf = confirm('Are you sure want to delte this post?');
                        if (!cnf) return;
                        await advanceMysqlQuery({ key: 'deletePost', qry: null, values: [id] });
                        loadData();
                    } catch (error) {
                        log(error);
                    }
                })
            })
        })

        jq('div.dataTable').html(tbl.table);
    } catch (error) {
        log(error);
    }
}