// specialTasks.js (updated)
// Path you uploaded earlier: /mnt/data/specialTasks.js. See filecite. :contentReference[oaicite:1]{index=1}

import createAdvanceForm from './_utils/advanceCreateFrom.js';
import { fetchData, jq, log } from './help.js';

const API = {
    list: '/auth/special/tasks/data',               // GET with params ?limit=&offset=&status=&assigned_to=&created_by=
    getTask: (id) => `/auth/special/task/${id}`,    // GET -> returns task with attachments + correspondence
    deleteTask: (id) => `/auth/special/task/delete/${id}`, // DELETE
    deleteAttachment: (id) => `/auth/special/task/delete/attachments/${id}`, // DELETE
    deleteCorrespondence: (id) => `/auth/special/task/delete/correspondence/${id}`, // DELETE
    downloadAttachment: (id) => `/auth/special/task/attachments/${id}/download`,
    thumbnailAttachment: (id) => `/auth/special/task/attachments/${id}/thumbnail`,
    addCorrespondence: '/auth/special/task/correspondence', // POST { task_id, message, files (FormData) }
    createTask : '/auth/special/tasks/create'
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

/* Helper: escape HTML */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* ---------- Image viewer overlay (lightbox) ---------- */
function ensureImageViewer() {
    if (jq('#imgViewer').length) return;
    const html = `
    <div id="imgViewer" style="display:none;position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.75);align-items:center;justify-content:center;cursor:zoom-out;">
      <div style="max-width:95%;max-height:95%;display:flex;align-items:center;justify-content:center;">
        <img id="imgViewerImg" src="" style="max-width:100%;max-height:100%;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,0.5);" />
      </div>
    </div>
  `;
    jq('body').append(html);
    jq('#imgViewer').on('click', function () {
        jq(this).fadeOut(150);
        jq('#imgViewerImg').attr('src', '');
    });
}
ensureImageViewer();

function openImageViewer(url) {
    ensureImageViewer();
    jq('#imgViewerImg').attr('src', url);
    jq('#imgViewer').fadeIn(150);
}

// helpers: mime/extension detection + icon dataURIs
function extFromName(name = '') {
    const m = name.split('.').pop();
    return m ? m.toLowerCase() : '';
}
function isImageMime(mime) {
    return typeof mime === 'string' && mime.startsWith('image/');
}
function isPdfMime(mime) {
    return mime === 'application/pdf';
}

function dataUriForType(type) {
    const icons = {
        pdf: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmOGY4ZjgiIHJ4PSIxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI0NyIgZm9udC1zaXplPSIzMCIgZmlsbD0iI2UwM2UzZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHktPSIwLjM1ZW0iPkRPRjwvdGV4dD4KPC9zdmc+",
        excel: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmNGY5ZjQiIHJ4PSIxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI0NyIgZm9udC1zaXplPSIyOCIgZmlsbD0iIzAwNzkxYSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHktPSIwLjM1ZW0iPlhMU1g8L3RleHQ+Cjwvc3ZnPg==",
        word: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmM2Y3ZmYiIHJ4PSIxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI0NyIgZm9udC1zaXplPSIyOCIgZmlsbD0iIzFiNjBkMSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHktPSIwLjM1ZW0iPkRPQ1g8L3RleHQ+Cjwvc3ZnPg==",
        ppt: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmZmY4ZjAiIHJ4PSIxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI0NyIgZm9udC1zaXplPSIyOCIgZmlsbD0iI2QwNmEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHktPSIwLjM1ZW0iPlBQVHg8L3RleHQ+Cjwvc3ZnPg==",
        file: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiNmNGY0ZjQiIHJ4PSIxMiIvPgogIDx0ZXh0IHg9IjYwIiB5PSI0NyIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzk5OSIgZXRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjM1ZW0iPkZJTEU8L3RleHQ+Cjwvc3ZnPg=="
    };
    return icons[type] || icons.file;
}

// function dataUriForType(type) {
//     const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
//                     <rect width="100%" height="100%" fill="#f4f4f4" rx="6"/>
//                     <text x="50%" y="52%" font-size="16" fill="#666" text-anchor="middle" alignment-baseline="middle">FILE</text>
//                 </svg>`;
//     return 'data:image/svg+xml;base64,' + btoa(svg);
// }




function choosePreview(a) {
    // a: attachment object { id, file_name, mime_type, ... }
    const mime = (a.mime_type || '').toLowerCase();
    const ext = extFromName(a.file_name || '');
    if (isImageMime(mime)) return { mode: 'image', src: `/auth/special/tasks/attachments/${a.id}/download` }; // open real image in new tab
    if (isPdfMime(mime) || ext === 'pdf') return { mode: 'pdf', src: `/auth/special/tasks/attachments/${a.id}/download` }; // open pdf in new tab
    // office types -> icon
    if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet') || ext === 'xls') return { mode: 'icon', src: dataUriForType('excel') };
    if (['doc', 'docx'].includes(ext) || mime.includes('word')) return { mode: 'icon', src: dataUriForType('word') };
    if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return { mode: 'icon', src: dataUriForType('ppt') };
    // fallback: if server provides a thumbnail for the file (for non-images), use it; else generic icon
    if (a.has_thumbnail) return { mode: 'thumb', src: `/auth/special/tasks/attachments/${a.id}/thumbnail` };
    return { mode: 'icon', src: dataUriForType('file') };
}


/* ---------- Load and render tasks (cards with inline details) ---------- */
async function loadData() {
    try {
        const res = await fetchData('/auth/special/tasks/list');
        const tasks = res?.tasks || [];
        const $body = jq('#specialTasks');
        $body.empty();

        if (!tasks.length) {
            $body.append('<div class="text-center text-muted py-4">No tasks yet</div>');
            return;
        }

        tasks.forEach(task => {
            const created = new Date(task.created_at).toLocaleString();

            // card root
            const $card = jq('<div>', { class: 'card mb-3 shadow-sm special-task-card', 'data-task-id': task.id });
            const $cardBody = jq('<div>', { class: 'card-body d-flex align-items-start' });

            // left: thumbnail placeholder
            const $thumbWrap = jq('<div>', { class: 'me-3' });
            const $thumb = jq('<img>', { src: '/static/img/file-placeholder.png', alt: 'thumb', class: 'rounded thumb-img', style: 'width:80px;height:60px;object-fit:cover;' });
            $thumbWrap.append($thumb);

            // main content
            const $main = jq('<div>', { class: 'flex-grow-1' });
            $main.append(`<div class="fw-bold">${escapeHtml(task.task_name)}</div>`);
            $main.append(`<div class="small text-muted mb-2 desc-preview">${escapeHtml(task.description || '')}</div>`);
            $main.append(`<div class="small text-muted">Created: ${escapeHtml(created)} • ID: ${task.id}</div>`);

            // right: badges + actions
            const $right = jq('<div>', { class: 'ms-3 text-end d-flex flex-column align-items-end' });
            const statusClass = task.status === 'open' ? 'info' : (task.status === 'closed' ? 'success' : 'secondary');
            $right.append(`<div><span class="badge bg-${statusClass} me-1">${escapeHtml(task.status)}</span><span class="badge bg-warning">${escapeHtml(task.priority)}</span></div>`);

            const $btnGroup = jq('<div>', { class: 'btn-group mt-2' });
            const $view = jq('<button>', { class: 'btn btn-sm btn-outline-primary' }).text('View');
            const $edit = jq('<button>', { class: 'btn btn-sm btn-outline-secondary' }).text('Edit');
            const $del = jq('<button>', { class: 'btn btn-sm btn-outline-danger' }).text('Delete');
            $btnGroup.append($view, $edit, $del);
            $right.append($btnGroup);

            $cardBody.append($thumbWrap, $main, $right);
            $card.append($cardBody);

            // details container (hidden initially) — appended directly under card body
            const $details = jq('<div>', { class: 'task-details p-3 bg-light', style: 'display:none;border-top:1px solid rgba(0,0,0,0.05);' });
            $card.append($details);

            $body.append($card);

            // wire actions
            $view.on('click', () => toggleDetails(task.id, $card, $details, $thumb));
            $edit.on('click', () => openEditModal(task));
            $del.on('click', () => handleDeleteTask(task.id));

            // fetch first attachment to set thumbnail if available
            (async () => {
                try {
                    const d = await fetchData(`/auth/special/tasks/list/${task.id}`);
                    const attachments = d?.attachments || [];
                    if (attachments.length) {
                        const first = attachments[0];
                        $thumb.attr('src', `/auth/special/tasks/attachments/${first.id}/thumbnail`);
                    } else {
                        $thumb.attr('src', '/static/img/file-placeholder.png');
                    }
                } catch (e) { /* ignore */ }
            })();
        });

    } catch (err) {
        console.error(err);
    }
}

/* ---------- Toggle inline details (slide down/up) ---------- */
async function toggleDetails(taskId, $card, $detailsEl, $thumbEl) {
    // if already visible — hide
    if ($detailsEl.is(':visible')) {
        $detailsEl.slideUp(200);
        return;
    }

    // show loading spinner
    $detailsEl.html('<div class="text-center py-3">Loading...</div>');
    $detailsEl.slideDown(120);

    try {
        const res = await fetchData(`/auth/special/tasks/list/${taskId}`);
        const task = res.task || {};
        const attachments = res.attachments || [];
        const correspondence = res.correspondence || [];

        // Build details HTML: description, attachments, correspondence, action buttons
        const html = [];
        html.push(`<div class="d-flex justify-content-between align-items-start mb-2">`);
        html.push(`<div><h5 class="mb-1">${escapeHtml(task.task_name)}</h5><div class="small text-muted">Created: ${escapeHtml(new Date(task.created_at).toLocaleString())}</div></div>`);
        html.push(`<div class="text-end"><button class="btn btn-sm btn-outline-primary me-1 btn-add-corr">Add</button><button class="btn btn-sm btn-outline-secondary me-1 btn-refresh">Refresh</button></div>`);
        html.push(`</div>`);

        // full description
        html.push(`<div class="mb-3">${escapeHtml(task.description || '')}</div>`);

        // attachments grid
        html.push(`<div class="mb-3"><strong>Attachments</strong>`);
        if (!attachments.length) {
            html.push('<div class="small text-muted">No attachments</div>');
        } else {
            html.push('<div class="d-flex flex-wrap gap-2 mt-2 attachments-grid">');
            attachments.forEach(a => {
                const preview = choosePreview(a); // mode: image/pdf/icon/thumb
                const downloadUrl = `/auth/special/tasks/attachments/${a.id}/download`;

                let previewHtml;
                if (preview.mode === 'image' || preview.mode === 'pdf') {
                    // clickable — open in new tab (browser will render if it can)
                    previewHtml = `
                    <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">
                        <img src="${preview.mode === 'image' ? preview.src : dataUriForType('pdf')}" style="width:120px;height:80px;object-fit:cover;cursor:pointer;" />
                    </a>
                    `;
                } else if (preview.mode === 'thumb') {
                    // server-created thumbnail (non-image) — clicking can open/download
                    previewHtml = `
                        <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">
                            <img src="${preview.src}" style="width:120px;height:80px;object-fit:cover;cursor:pointer;" />
                        </a>
                        `;
                } else {
                    // icon mode (office/doc) — show icon (click triggers download)
                    previewHtml = `
                        <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer">
                            <img src="${preview.src}" style="width:120px;height:80px;object-fit:contain;background:#fff;padding:8px;border-radius:6px;cursor:pointer;" />
                        </a>
                        `;
                }

                html.push(`
                    <div class="card attachment-card" style="width:120px;">
                    <div style="height:80px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
                        ${previewHtml}
                    </div>
                    <div class="card-body p-2 small">
                        <div class="text-truncate">${escapeHtml(a.file_name)}</div>
                        <div class="d-flex justify-content-between mt-1">
                        <button data-attach-id="${a.id}" class="btn btn-sm btn-outline-danger del-attachment">Del</button>
                        <a href="${downloadUrl}" class="btn btn-sm btn-outline-success" target="_blank" rel="noopener noreferrer">DL</a>
                        </div>
                    </div>
                    </div>
                `);
            });

            html.push('</div>');
        }
        html.push('</div>');

        // correspondence list
        html.push(`<div class="mb-2"><strong>Conversation</strong>`);
        if (!correspondence.length) {
            html.push('<div class="small text-muted">No correspondence</div>');
        } else {
            html.push('<div class="list-group mt-2">');
            correspondence.forEach(c => {
                html.push(`<div class="list-group-item"><div class="small text-muted">${escapeHtml(new Date(c.created_at).toLocaleString())} • ${escapeHtml(c.sender_id)}</div><div class="mt-1">${escapeHtml(c.message)}</div>`);
                if (c.attachments && c.attachments.length) {
                    html.push('<div class="d-flex gap-2 mt-2">');
                    c.attachments.forEach(a => {
                        const thumb = `/auth/special/tasks/attachments/${a.id}/thumbnail`;
                        const dl = `/auth/special/tasks/attachments/${a.id}/download`;
                        html.push(`<a class="d-block" href="${dl}" target="_blank"><img class="corr-thumb" src="${thumb}" style="width:80px;height:60px;object-fit:cover" title="${escapeHtml(a.file_name)}" /></a>`);
                    });
                    html.push('</div>');
                }
                html.push('</div>');
            });
            html.push('</div>');
        }
        html.push('</div>');

        $detailsEl.html(html.join(''));

        // wire up add correspondence button to open the existing corr modal
        $detailsEl.find('.btn-add-corr').on('click', () => {
            const corrModalEl = document.getElementById('taskCorrModal');
            const corrModal = new bootstrap.Modal(corrModalEl);
            jq('#taskCorrForm [name="task_id"]').val(taskId);
            jq('#taskCorrForm [name="message"]').val('');
            jq('#taskCorrForm [name="files"]').val('');
            corrModal.show();
        });

        // refresh button
        $detailsEl.find('.btn-refresh').on('click', () => toggleDetails(taskId, $card, $detailsEl, $thumbEl));

        // clicking thumbnail opens image viewer (instead of download)
        $detailsEl.find('.attachment-thumb').on('click', function () {
            const thumbUrl = jq(this).data('thumb-url');
            // open viewer with thumbnail route or download route (thumbnail shows full image)
            openImageViewer(thumbUrl);
        });

        // delete attachment
        $detailsEl.find('.del-attachment').on('click', async function () {
            const attachId = jq(this).data('attach-id');
            if (!confirm('Delete this attachment?')) return;
            try {
                await axios.delete(`/auth/special/tasks/delete/attachments/${attachId}`);
                // refresh the details view
                toggleDetails(taskId, $card, $detailsEl, $thumbEl); // will hide
                // reopen (give a small delay to let hide animation finish)
                setTimeout(() => toggleDetails(taskId, $card, $detailsEl, $thumbEl), 220);
            } catch (err) {
                console.error(err);
                alert('Could not delete attachment');
            }
        });

        // update the card thumbnail if attachments exist
        if (attachments.length) {
            $thumbEl.attr('src', `/auth/special/tasks/attachments/${attachments[0].id}/thumbnail`);
        }

    } catch (err) {
        console.error(err);
        $detailsEl.html('<div class="text-danger">Could not load details</div>');
    }
}

/* ---------- Modals (create once) ---------- */
function ensureModals() {
    if (jq('#taskEditModal').length) return;
    const modalHtml = `
    <div class="modal fade" id="taskEditModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <form id="taskEditForm">
            <div class="modal-header">
              <h5 class="modal-title">Edit Task</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="mb-2"><label class="form-label">Name</label><input name="task_name" class="form-control" /></div>
              <div class="mb-2"><label class="form-label">Description</label><textarea name="description" class="form-control"></textarea></div>
              <div class="mb-2"><label class="form-label">Priority</label>
                <select name="priority" class="form-select">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>
              <div class="mb-2"><label class="form-label">Status</label>
                <select name="status" class="form-select">
                  <option value="open">open</option>
                  <option value="in_progress">in_progress</option>
                  <option value="closed">closed</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="modal fade" id="taskCorrModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="taskCorrForm" enctype="multipart/form-data">
            <div class="modal-header">
              <h5 class="modal-title">Add Correspondence</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" name="task_id" />
              <div class="mb-2"><label class="form-label">Message</label><textarea name="message" class="form-control" required></textarea></div>
              <div class="mb-2"><label class="form-label">Attach files</label><input type="file" name="files" class="form-control" multiple /></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" type="submit">Send</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
    jq('body').append(modalHtml);
}
ensureModals();

/* ---------- Edit modal handlers (unchanged behavior except no image-download on click) ---------- */
function openEditModal(task) {
    ensureModals();
    const el = document.getElementById('taskEditModal');
    const modal = new bootstrap.Modal(el);
    jq('#taskEditForm [name="task_name"]').val(task.task_name);
    jq('#taskEditForm [name="description"]').val(task.description || '');
    jq('#taskEditForm [name="priority"]').val(task.priority || 'medium');
    jq('#taskEditForm [name="status"]').val(task.status || 'open');
    jq('#taskEditForm').data('task-id', task.id);
    modal.show();
}

jq(document).on('submit', '#taskEditForm', async function (ev) {
    ev.preventDefault();
    const id = jq(this).data('task-id');
    const data = {
        task_name: jq(this).find('[name="task_name"]').val(),
        description: jq(this).find('[name="description"]').val(),
        priority: jq(this).find('[name="priority"]').val(),
        status: jq(this).find('[name="status"]').val(),
    };
    try {
        await axios.patch(`/auth/special/tasks/update/${id}`, data);
        bootstrap.Modal.getInstance(document.getElementById('taskEditModal')).hide();
        await loadData();
    } catch (err) { console.error(err); alert('Could not update'); }
});

/* ---------- Delete task ---------- */
async function handleDeleteTask(taskId) {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
        await axios.delete(`/auth/special/tasks/delete/${taskId}`);
        await loadData();
    } catch (err) {
        console.error(err);
        alert('Delete failed');
    }
}

/* ---------- Correspondence submit (with files) ---------- */
jq(document).on('submit', '#taskCorrForm', async function (ev) {
    ev.preventDefault();
    const taskId = jq(this).find('[name="task_id"]').val();
    const message = jq(this).find('[name="message"]').val();
    const input = jq(this).find('[name="files"]')[0];
    const formData = new FormData();
    formData.append('message', message);
    formData.append('is_internal', 0);
    if (input && input.files && input.files.length) {
        for (let i = 0; i < input.files.length; i++) {
            formData.append('files', input.files[i], input.files[i].name);
        }
    }

    try {
        await axios.post(`/auth/special/tasks/create/${taskId}/correspondence`, formData);
        bootstrap.Modal.getInstance(document.getElementById('taskCorrModal')).hide();
        // refresh the specific task details if visible
        jq(`[data-task-id="${taskId}"] .task-details`).each(function () {
            const $card = jq(this).closest('.special-task-card');
            const $details = jq(this);
            toggleDetails(Number(taskId), $card, $details, $card.find('.thumb-img'));
        });
        await loadData();
    } catch (err) {
        console.error(err);
        alert('Could not send correspondence');
    }
});

/* ---------- Initialization ---------- */
jq(function () {
    loadData();

    // allow external code to refresh
    jq(document).on('tasks:reload', () => loadData());
});
