// specialTasks.js (updated)
// Path you uploaded earlier: /mnt/data/specialTasks.js. See filecite. :contentReference[oaicite:1]{index=1}

import createAdvanceForm from './_utils/advanceCreateFrom.js';
import { createFlyoutMenu, createTable, fetchData, hideTableColumns, jq, log, titleCaseTableHeaders } from './help.js';
import showModal from './_utils/modal.js';
import showCanvas from './_utils/canvas.js';
const BASE_URI = "/auth/special/tasks"

const API = {
    list: `${BASE_URI}/list`,               // GET with params ?limit=&offset=&status=&assigned_to=&created_by=
    getTask: (id) => `${BASE_URI}/${id}`,    // GET -> returns task with attachments + correspondence
    deleteTask: (id) => `${BASE_URI}/delete/${id}`, // DELETE
    deleteAttachment: (id) => `${BASE_URI}/delete/attachments/${id}`, // DELETE
    deleteCorrespondence: (id) => `${BASE_URI}/delete/correspondence/${id}`, // DELETE
    downloadAttachment: (id) => `${BASE_URI}/attachments/${id}/download`,
    thumbnailAttachment: (id) => `${BASE_URI}/attachments/${id}/thumbnail`,
    addCorrespondence: `${BASE_URI}/correspondence`, // POST { task_id, message, files (FormData) }
    createTask: `${BASE_URI}/create`
};


document.addEventListener('DOMContentLoaded', () => {
    jq('button.create-task').on('click', () => {
        const mb = createAdvanceForm({
            // title: 'specialTask',
            formObj: {
                task_name: { label: 'Task Name', type: 'text', requird: true },
                description: { label: 'Description', type: 'textarea' },
                category: { label: 'Category', type: 'text' },
                files: { label: 'Attachment', type: 'file', multiple: true },
            },
            floatingLabels: false,
            modal: true,
            modalTitle: 'Create Task',
            hideFooter: true,
            // --- inside createAdvanceForm onSubmit ---
            onSubmit: async (api) => {
                try {
                    // build FormData
                    const formData = new FormData();
                    formData.append('task_name', api.values.task_name || '');
                    formData.append('description', api.values.description || '');
                    formData.append('category', api.values.category || '');

                    // append files (api.values.files is an Array-like with File objects)
                    const files = api.values.files || [];
                    for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        if (f instanceof File || f instanceof Blob) {
                            formData.append('files', f, f.name || `file-${i}`);
                        } else {
                            console.warn('Skipping non-file entry at index', i, f);
                        }
                    }

                    // Do NOT set Content-Type header. Let axios/browser include the boundary.
                    const res = await axios.post(API.createTask, formData);
                    api.onSuccess('Task Created Successfully');
                    setTimeout(() => {
                        api.close();
                        loadData();
                    }, 800);
                    console.log('Task create response:', res.data);
                } catch (error) {
                    console.error('create task error', error);
                }
            }
        });

        mb.data('bs.modal').show();
    })

    loadData();
})


async function loadData() {
    try {
        let res = await fetchData(API.list); log(res);
        let arr = res?.tasks || []; 
        let tbl = createTable({ data: arr });
        let $div = jq('#specialTasks');
        let table = tbl.table;
        let $table = jq(tbl.table);
        let $tbody = jq(tbl.tbody);
        let $thead = jq(tbl.thead);
        titleCaseTableHeaders($thead, [], ['id']);
        hideTableColumns($table, ['created_by', 'assigned_to', 'updated_at']);
        $tbody.find(`[data-key="id"]`).addClass('role-btn text-primary').each(function (i, e) {
            jq(e).on('click', () => {
                let data = arr[i]; log(data);
                createFlyoutMenu(e, [
                    { key: 'View', id: 'viewDetails' },
                    { key: 'Edit', id: 'editDetails' },
                    { key: 'Cancel' }
                ]);

                jq('#editDetails').on('click', ()=>{
                    let $modal = showModal('Edit Task').data('bs.modal').show();
                    let $mb = $modal.find('div.modal-body');
                    $mb.html('ok');

                })

                jq('#viewDetails').on('click', ()=>{

                    let $canvas = showCanvas('Special Task Details', { side: 'end', width: '700px'}); log($canvas);
                    let $body = $canvas.find('div.offcanvas-body');
                    $canvas.data("bs.offcanvas").show();
                    
                    $body.html('hi');
                })
            })
        })
        $div.html(table);
    } catch (error) {
        log(error);
    }
}


