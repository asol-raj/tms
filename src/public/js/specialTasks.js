// specialTasks.js (updated big time)

import createAdvanceForm from './_utils/advanceCreateFrom.js';
import { addColumnBorders, createFlyoutMenu, createTable, fetchData, hideTableColumns, jq, log, titleCaseTableHeaders } from './help.js';
import showModal from './_utils/modal.js';
import showCanvas from './_utils/canvas.js';
import attachEditableControls from './_utils/flyoutmenu.js';

const BASE_URI = "/auth/special/tasks";

const API = {
    list: `${BASE_URI}/list`,                                   // GET /auth/special/tasks/list
    getTask: (id) => `${BASE_URI}/list/${id}`,                  // GET /auth/special/tasks/list/:id
    deleteTask: (id) => `${BASE_URI}/delete/${id}`,             // DELETE
    deleteAttachment: (id) => `${BASE_URI}/delete/attachments/${id}`, // DELETE
    deleteCorrespondence: (id) => `${BASE_URI}/delete/correspondence/${id}`, // (not implemented on server yet)
    downloadAttachment: (id) => `${BASE_URI}/attachments/${id}/download`,
    thumbnailAttachment: (id) => `${BASE_URI}/attachments/${id}/thumbnail`,
    addCorrespondence: (id) => `${BASE_URI}/create/${id}/correspondence`, // POST (multipart)
    deleteCorrespondence: (id) => `${BASE_URI}/delete/correspondence/${id}`, // (not implemented on server yet)
    deleteCorrespondence: (id) => `${BASE_URI}/delete/correspondence/${id}`, // DELETE correspondence
    createTask: `${BASE_URI}/create`,
};

const CURRENT_USER_ID = Number(document.getElementById("currentUserId")?.value || 0);


// --- helpers -------------------------------------------------------

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(val) {
    if (!val) return '';
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        return d.toLocaleString();
    } catch {
        return String(val);
    }
}

function priorityBadgeClass(priority) {
    switch ((priority || '').toLowerCase()) {
        case 'low': return 'bg-success';
        case 'medium': return 'bg-primary';
        case 'high': return 'bg-warning text-dark';
        case 'critical': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function ensureDetailStyles() {
    if (document.getElementById('specialTasksDetailStyles')) return;
    const style = document.createElement('style');
    style.id = 'specialTasksDetailStyles';
    style.textContent = `
      .attachments-grid .attachment-card {
        cursor: pointer;
        background-color: var(--bs-body-bg);
      }
      .attachment-card .attachment-overlay {
        opacity: 0;
        transition: opacity .18s ease-in-out;
        background: rgba(0,0,0,.55);
        color: #fff;
      }
      .attachment-card:hover .attachment-overlay {
        opacity: 1;
      }
      .attachment-card img {
        object-fit: cover;
        max-height: 150px;
      }
      .corr-item {
        background-color: var(--bs-body-bg);
      }
      .corr-attachments img {
        max-height: 80px;
        object-fit: cover;
      }
    `;
    document.head.appendChild(style);
}

function buildAttachmentsHtml(attachments = []) {
    if (!attachments.length) {
        return `
          <div class="text-muted small">
            No attachments for this task.
          </div>
        `;
    }

    return `
      <div class="row g-3 attachments-grid">
        ${attachments.map(att => `
          <div class="col-6 col-md-4 col-lg-3">
            <div class="attachment-card position-relative border rounded overflow-hidden" data-attachment-id="${att.id}">
              <a href="${API.downloadAttachment(att.id)}" target="_blank" class="d-block attachment-thumb-link">
                <img src="${API.thumbnailAttachment(att.id)}" class="img-fluid w-100" alt="${escapeHtml(att.file_name)}">
              </a>
              <div class="attachment-overlay position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-between p-2">
                <div class="d-flex justify-content-end gap-1">
                  <button type="button" class="btn btn-sm btn-light rounded-circle attachment-download" data-attachment-id="${att.id}" title="Download">
                    <i class="bi bi-download"></i>
                  </button>
                  <button type="button" class="btn btn-sm btn-light rounded-circle text-danger attachment-delete" data-attachment-id="${att.id}" title="Delete">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div class="small text-truncate fw-semibold mt-auto">
                  ${escapeHtml(att.file_name)}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
}

function buildCorrAttachmentsHtml(atts = []) {
    if (!atts.length) return '';
    return `
      <div class="corr-attachments mt-2 d-flex flex-wrap gap-2">
        ${atts.map(att => `
          <a href="${API.downloadAttachment(att.id)}" target="_blank" class="border rounded overflow-hidden d-inline-block" title="${escapeHtml(att.file_name)}">
            <img src="${API.thumbnailAttachment(att.id)}" class="img-fluid" alt="${escapeHtml(att.file_name)}">
          </a>
        `).join('')}
      </div>
    `;
}

function buildCorrespondenceHtml(correspondence = []) {
    if (!correspondence.length) {
        return `
            <div class="text-muted small">
                No correspondence yet. Use the form below to add one.
            </div>
        `;
    }

    return `
        <div class="list-group mb-3">
            ${correspondence
            .map(c => {
                const isOwner = c.sender_id === CURRENT_USER_ID;

                return `
                        <div class="list-group-item border-0 border-start border-4 mb-2 ps-3 corr-item" 
                             data-corr-id="${c.id}">
                            
                            <div class="d-flex justify-content-between align-items-start gap-2">

                                <!-- LEFT SIDE: Message + Details -->
                                <div>
                                    <div class="small text-muted mb-1">
                                        <strong>#${c.id}</strong> 
                                        • by ${escapeHtml(c.sender_name)} 
                                        • ${formatDate(c.created_at)}
                                        ${Number(c.is_internal)
                        ? '<span class="badge bg-warning-subtle text-warning-emphasis ms-2">Internal</span>'
                        : ''
                    }
                                    </div>

                                    <div class="corr-message" data-corr-id="${c.id}">
                                        ${c.message
                        ? `<div>${escapeHtml(c.message)}</div>`
                        : `<div class="text-muted fst-italic">No message</div>`
                    }
                                    </div>

                                    ${buildCorrAttachmentsHtml(c.attachments || [])}
                                </div>

                                <!-- RIGHT SIDE: EDIT + DELETE BUTTONS (visible only for creator) -->
                                ${isOwner
                        ? `
                                        <div class="btn-group btn-group-sm flex-column flex-md-row mt-1 mt-md-0">
                                            <button 
                                                type="button" 
                                                class="btn btn-outline-secondary corr-edit-btn"
                                                data-corr-id="${c.id}"
                                                title="Edit message"
                                            >
                                                <i class="bi bi-pencil-square"></i>
                                            </button>

                                            <button 
                                                type="button" 
                                                class="btn btn-outline-danger corr-delete-btn"
                                                data-corr-id="${c.id}"
                                                title="Delete message"
                                            >
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </div>
                                        `
                        : ""
                    }

                            </div>
                        </div>
                    `;
            })
            .join("")}
        </div>
    `;
}

function buildTaskDetailsHtml(task, attachments = [], correspondence = []) {
    ensureDetailStyles();

    const priorityClass = priorityBadgeClass(task?.priority);
    const safeName = escapeHtml(task?.task_name || '');
    const safeDesc = escapeHtml(task?.description || 'No description provided');

    return `
      <div class="special-task-detail">
        <!-- Header -->
        <div class="task-header border-bottom pb-3 mb-3">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <h5 class="mb-1">${safeName}</h5>
              <p class="text-muted small mb-2">${safeDesc}</p>
              <div class="d-flex flex-wrap gap-2 small">
                <span class="badge ${priorityClass}">Priority: ${escapeHtml(task?.priority || 'N/A')}</span>
                <span class="badge bg-secondary">Status: ${escapeHtml(task?.status || 'N/A')}</span>
                <span class="badge bg-info text-dark">Category: ${escapeHtml(task?.category || 'N/A')}</span>
              </div>
            </div>
            <div class="text-end small">
              <div><strong>Created by:</strong> ${escapeHtml(task?.createdby_name || '-')}</div>
              <div><strong>Assigned to:</strong> ${escapeHtml(task?.assignedto_name || '-')}</div>
              ${task?.created_at ? `<div class="text-muted">${formatDate(task.created_at)}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Attachments -->
        <div class="task-attachments mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Attachments</h6>
            <span class="badge bg-light text-muted border">
              ${attachments.length} file${attachments.length === 1 ? '' : 's'}
            </span>
          </div>
          ${buildAttachmentsHtml(attachments)}
        </div>

        <!-- Correspondence -->
        <div class="task-correspondence mb-4">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="mb-0">Correspondence</h6>
          </div>
          ${buildCorrespondenceHtml(correspondence)}
        </div>

        <!-- New correspondence form -->
        <div class="mt-4 border-top pt-3">
        <h6 class="mb-3">Add correspondence</h6>

        <form id="addCorrespondenceForm" class="d-flex gap-3 align-items-stretch">
            <!-- Left: textarea -->
            <div class="flex-grow-1">
            <textarea
                name="message"
                class="form-control h-100"
                style="min-height: 90px;"
                placeholder="Type your message..."
            ></textarea>
            </div>

            <!-- Right: file + button in column -->
            <div class="d-flex flex-column gap-2" style="width: 190px;">
                <input
                    type="file"
                    name="files"
                    id="corrFiles"
                    class="form-control form-control-sm"
                    multiple
                >

                <button type="submit" class="btn btn-primary btn-sm mt-auto">
                    <i class="bi bi-send"></i> Submit
                </button>
            </div>
        </form>
        </div>

      </div>
    `;
}

async function reloadTaskDetails(taskId, $body) {
    try {
        const resp = await axios.get(API.getTask(taskId));
        const data = resp.data || {};
        const task = data.task || {};
        const attachments = data.attachments || [];
        const correspondence = data.correspondence || [];

        $body.html(buildTaskDetailsHtml(task, attachments, correspondence));
        attachTaskDetailHandlers($body, taskId);
    } catch (err) {
        console.error('reloadTaskDetails error', err);
        $body.html('<div class="text-danger">Failed to load task details.</div>');
    }
}

function attachTaskDetailHandlers($container, taskId) {
    // delete attachment
    $container.off('click', '.attachment-delete').on('click', '.attachment-delete', async function (e) {
        e.preventDefault();
        const id = jq(this).data('attachment-id');
        if (!id) return;
        if (!confirm('Delete this attachment?')) return;

        try {
            await axios.delete(API.deleteAttachment(id));
            const $col = jq(this).closest('.col-6, .col-md-4, .col-lg-3, .attachment-card');
            $col.fadeOut(150, function () {
                jq(this).remove();
            });
        } catch (err) {
            console.error('delete attachment error', err);
            alert('Failed to delete attachment.');
        }
    });

    // download attachment (icon)
    $container.off('click', '.attachment-download').on('click', '.attachment-download', function (e) {
        e.preventDefault();
        const id = jq(this).data('attachment-id');
        if (!id) return;
        window.open(API.downloadAttachment(id), '_blank');
    });

    // add correspondence
    // const $form = $container.find('form#correspondenceForm');
    const $form = $container.find('form#addCorrespondenceForm');
    $form.off('submit').on('submit', async function (e) {
        e.preventDefault();
        const formEl = this;
        const fd = new FormData();
        const message = formEl.message.value.trim();

        if (!message) {
            formEl.message.focus();
            return;
        }

        fd.append('message', message);
        fd.append('is_internal', '0');

        const filesInput = formEl.querySelector('input[name="files"]');
        if (filesInput && filesInput.files && filesInput.files.length) {
            Array.from(filesInput.files).forEach(f => fd.append('files', f, f.name));
        }

        const btn = formEl.querySelector('button[type="submit"]');
        try {
            if (btn) btn.disabled = true;
            await axios.post(API.addCorrespondence(taskId), fd);
            formEl.reset();
            await reloadTaskDetails(taskId, $container);
        } catch (err) {
            console.error('add correspondence error', err);
            alert('Failed to add correspondence.');
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    // edit correspondence (front-end only, no backend yet)
    $container.off('click', '.corr-edit-btn').on('click', '.corr-edit-btn', function (e) {
        e.preventDefault();
        const corrId = jq(this).data('corr-id');
        const $item = $container.find(`.corr-item[data-corr-id="${corrId}"]`);
        if (!$item.length || $item.data('editing')) return;

        const $msg = $item.find('.corr-message');
        const current = $msg.text().trim();
        $msg.data('original', current);
        $item.data('editing', true);

        const textareaHtml = `
          <div class="mt-2 corr-edit-wrapper">
            <textarea class="form-control corr-edit-textarea" rows="3">${escapeHtml(current)}</textarea>
            <div class="mt-2 d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary corr-edit-cancel">Cancel</button>
              <button type="button" class="btn btn-sm btn-primary corr-edit-save" data-corr-id="${corrId}">Save</button>
            </div>
          </div>
        `;

        $msg.hide();
        $msg.after(textareaHtml);
    });

    // cancel edit
    $container.off('click', '.corr-edit-cancel').on('click', '.corr-edit-cancel', function () {
        const $item = jq(this).closest('.corr-item');
        const $msg = $item.find('.corr-message');
        $item.find('.corr-edit-wrapper').remove();
        $msg.show();
        $item.data('editing', false);
    });

    // save edit – currently only updates UI + shows TODO
    // save edit
    $container.off('click', '.corr-edit-save').on('click', '.corr-edit-save', async function () {
        const corrId = jq(this).data('corr-id');
        const $item = jq(this).closest('.corr-item');
        const $msg = $item.find('.corr-message');
        const $ta = $item.find('.corr-edit-textarea');
        const newText = $ta.val().trim();

        if (!newText) {
            $ta.trigger('focus');
            return;
        }

        try {
            // PATCH update
            await axios.patch(`${BASE_URI}/correspondence/${corrId}`, {
                message: newText
            });

            // reload entire task details
            await reloadTaskDetails(taskId, $container);

        } catch (err) {
            console.error('update correspondence error', err);
            alert('Failed to update correspondence.');
        }
    });

    // delete correspondence
    $container.off('click', '.corr-delete-btn').on('click', '.corr-delete-btn', async function (e) {
        e.preventDefault();
        const corrId = jq(this).data('corr-id');
        if (!corrId) return;

        if (!confirm('Delete this correspondence?')) return;

        try {
            await axios.delete(API.deleteCorrespondence(corrId));
            await reloadTaskDetails(taskId, $container);
        } catch (err) {
            console.error('delete correspondence error', err);
            alert('Failed to delete correspondence.');
        }
    });

}

// -----------------------------------------------------
// main: table + view / edit
// -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    jq('button.create-task').on('click', () => {
        const mb = createAdvanceForm({
            formObj: {
                task_name: { label: 'Task Name', type: 'text', requird: true },
                description: { label: 'Description', type: 'textarea' },
                category: { label: 'Category', type: 'select', options: ['Techinical', 'Inventory', 'MIS', 'Others'] },
                files: { label: 'Attachment', type: 'file', multiple: true },
            },
            floatingLabels: false,
            modal: true,
            modalTitle: 'Create Task',
            hideFooter: true,
            onSubmit: async (api) => {
                try {
                    const formData = new FormData();
                    formData.append('task_name', api.values.task_name || '');
                    formData.append('description', api.values.description || '');
                    formData.append('category', api.values.category || '');

                    const files = api.values.files || [];
                    for (let i = 0; i < files.length; i++) {
                        const f = files[i];
                        if (f instanceof File || f instanceof Blob) {
                            formData.append('files', f, f.name || `file-${i}`);
                        } else {
                            console.warn('Skipping non-file entry at index', i, f);
                        }
                    }

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
    });

    loadData();
});

async function loadData() {
    try {
        let res = await fetchData(API.list);
        let arr = res?.tasks || [];

        let tbl = createTable({ data: arr });
        let $div = jq('#specialTasks');
        let table = tbl.table;
        let $table = jq(tbl.table);
        let $tbody = jq(tbl.tbody);
        let $thead = jq(tbl.thead);

        let role = await fetchData('/auth/userrole');

        titleCaseTableHeaders($thead, [], ['id']);
        hideTableColumns($table, ['updated_at']);

        $tbody.find(`[data-key="task_name"]`).addClass('role-btn').each(function () {
            jq(this).off('click').on('click', (e) => {
                const taskId = jq(e.target).closest('tr').find(`[data-key="id"]`).data('value');
                viewTaskDetails(taskId);
            })
        }).prop('title', 'Click to view task details')

        $tbody.find(`[data-key="id"]`).addClass('role-btn text-primary').each(function (i, e) {
            jq(e).on('click', () => {
                let data = arr[i];

                createFlyoutMenu(e, [
                    { key: 'Edit', id: 'editDetails' },
                    { key: 'View', id: 'viewDetails' },
                    { key: 'Cancel' }
                ]);

                if (role === 'user') jq('#editDetails').addClass('disabled');

                if (role === 'admin') {
                    jq('#editDetails').off('click').on('click', () => {
                        let $modal = showModal('Edit Task').data('bs.modal').show();
                        let $mb = $modal.find('div.modal-body');
                        $mb.html('Edit UI not implemented yet.');
                    });
                }

                jq('#viewDetails').off('click').on('click', () => {
                    const taskId = data.id;
                    viewTaskDetails(taskId);
                });
            });
        });

        const $desc = $thead.find(`[data-key="description"]`);
        $desc[0].style.setProperty('width', '400px', 'important');

        const priorityOptions = {
            "high": { text: "high", bgColor: '#ff4863', textColor: 'white' },
            "medium": { text: "medium", bgColor: '#ffe675', textColor: 'black' }, //#ffe675 , #b9ff75
            "low": { text: "low", bgColor: '#b9ff75', textColor: 'black' } //#00bfff
        };

        attachEditableControls($table[0], 'priority', priorityOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'special_tasks', field: 'priority', value, id };
            if (role == 'user') return;

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        }, () => role !== 'user');

        const statusOptions = {
            "open": { text: "open", bgColor: '#ff4863', textColor: 'white', class: 'fw-bold' },
            "pending": { text: "pending", bgColor: '#ffe675', textColor: 'black' }, //#ffe675 , #b9ff75
            "closed": { text: "closed", bgColor: '', textColor: 'black' }, //#00bfff
            "completed": { text: "completed", bgColor: '#4197ff', textColor: 'white' }, //#00bfff
            "archived": { text: "archived", bgColor: '#969696', textColor: 'white' }, //#00bfff
        };

        attachEditableControls($table[0], 'status', statusOptions, async (cell, value) => {
            const id = jq(cell).closest('tr').find(`[data-key="id"]`).data('value');
            const payload = { table: 'special_tasks', field: 'status', value, id };
            if (role == 'user') return;

            await fetch('/auth/inline/edit', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 🔁 Reload current active filter view
            await loadData();
        }, () => role !== 'user');

        $div.html(table);
        addColumnBorders($table)
    } catch (error) {
        log(error);
    }
}


async function viewTaskDetails(taskId) {
    const $canvas = showCanvas('Special Task Details', { side: 'end', width: '900px' });
    const $body = $canvas.find('div.offcanvas-body');

    $body.html('<div class="text-muted">Loading task details...</div>');
    $canvas.data("bs.offcanvas").show();

    await reloadTaskDetails(taskId, $body);
}