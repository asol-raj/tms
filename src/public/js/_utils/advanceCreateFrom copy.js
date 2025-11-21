import Fields from "../formfields.js";
const log = console.log;

/**
 * setupClientLogic - Option C (no auto-reset on success)
 *
 * - Preserves legacy api.values snapshot
 * - Adds fresh helpers: api.getValues(), api.getRaw()
 * - Adds button controls: api.setButtonText, api.setSubmitting (spinner), api.disableSubmit, api.enableSubmit, api.resetSubmit
 * - DOES NOT force-reset submit state when onSubmit returns a Promise. Caller fully controls final UI state.
 *
 * Usage: setupClientLogic(formId, onSubmit, $modal)
 */
function setupClientLogic(formId, onSubmit, $modal = null) {
  if (!formId) return;

  /* ---------- small helpers ---------- */
  function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const units = { kb: 1024, mb: 1048576, gb: 1073741824 };
    const m = String(sizeStr).trim().toLowerCase().match(/^([\d.]+)\s*(kb|mb|gb)$/i);
    if (!m) return 0;
    return Math.round(parseFloat(m[1]) * (units[m[2]] || 1));
  }

  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ---------- file preview + validation (unchanged semantics) ---------- */
  document.querySelectorAll(`#${formId} input[type="file"]`).forEach(input => {
    input.addEventListener('change', function () {
      const preview = document.getElementById(this.id + '-preview');
      if (!preview) return;
      preview.innerHTML = '';

      const acceptAttr = (this.getAttribute('accept') || '').toLowerCase();
      const limit = parseInt(this.dataset.limit || '0', 10) || 0;
      const maxBytes = parseSize(this.dataset.size || '');

      const files = Array.from(this.files || []);

      if (limit && files.length > limit) {
        this.classList.add('is-invalid');
        const msgEl = this.parentElement.querySelector('.invalid-feedback');
        if (msgEl) msgEl.textContent = `You can upload up to ${limit} file(s) only.`;
        preview.innerHTML = `<div class="text-danger small">You can upload up to ${limit} file(s) only.</div>`;
        return;
      }

      let allValid = true;

      files.forEach(file => {
        const fType = (file.type || '').toLowerCase();
        const fName = (file.name || '').toLowerCase();

        let validType = true;
        if (acceptAttr.includes('image') && !fType.startsWith('image/')) validType = false;
        if (acceptAttr.includes('.pdf') && !fName.endsWith('.pdf')) validType = false;

        let validSize = true;
        if (maxBytes && file.size > maxBytes) validSize = false;

        if (!validType || !validSize) {
          allValid = false;
          this.classList.add('is-invalid');
          const msgEl = this.parentElement.querySelector('.invalid-feedback');
          if (msgEl) msgEl.textContent = !validType ? 'Invalid file type selected.' : `File "${file.name}" exceeds ${this.dataset.size.toUpperCase()} limit.`;
          preview.innerHTML += `<div class="text-danger small">${!validType ? 'Invalid file type selected.' : `File "${escapeHtml(file.name)}" exceeds ${escapeHtml(this.dataset.size.toUpperCase())} limit.`}</div>`;
          return;
        }

        // preview valid files
        if (fType.startsWith('image/')) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          img.className = 'img-thumbnail me-2 mb-2';
          img.style.maxWidth = '150px';
          img.onload = () => URL.revokeObjectURL(img.src);
          preview.appendChild(img);
        } else {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(file);
          a.target = '_blank';
          a.textContent = file.name;
          a.className = 'd-block';
          preview.appendChild(a);
        }
      });

      if (allValid) {
        this.classList.remove('is-invalid');
        const msgEl = this.parentElement.querySelector('.invalid-feedback');
        if (msgEl) msgEl.textContent = '';
      }
    });
  });

  /* ---------- locate form (works for modal or inline) ---------- */
  const locatedForm = document.getElementById(formId) ||
    (document.querySelector(`#${formId}-modal`) && document.querySelector(`#${formId}-modal form`));
  if (!locatedForm) return;

  /* ---------- gatherValues (legacy semantics preserved) ---------- */
  function gatherValues(formEl) {
    const values = {};
    const elements = Array.from(formEl.elements).filter(el => el.name && !el.disabled);

    elements.forEach(el => {
      const name = el.name;
      if (el.type === 'checkbox') {
        const baseName = name.endsWith('[]') ? name.slice(0, -2) : name;
        if (!values[baseName]) values[baseName] = [];
        if (el.checked) values[baseName].push(el.value);
        return;
      }
      if (el.type === 'radio') {
        if (el.checked) values[name] = el.value;
        else if (values[name] === undefined) values[name] = '';
        return;
      }
      if (el.tagName.toLowerCase() === 'select' && el.multiple) {
        values[name] = Array.from(el.selectedOptions || []).map(o => o.value);
        return;
      }
      if (el.type === 'file') {
        if (el.multiple) values[name] = el.files ? Array.from(el.files) : [];
        else values[name] = el.files && el.files[0] ? el.files[0] : null;
        return;
      }
      values[name] = el.value;
    });

    return values;
  }

  /* ---------- buildFormData (raw) ---------- */
  function buildFormData(formEl) {
    const fd = new FormData();
    const elements = Array.from(formEl.elements).filter(el => el.name && !el.disabled);

    elements.forEach(el => {
      if (el.type === 'checkbox') {
        const baseName = el.name.endsWith('[]') ? el.name : (el.name + (el.name.endsWith('[]') ? '' : '[]'));
        if (el.checked) fd.append(baseName, el.value);
        return;
      }
      if (el.type === 'radio') {
        if (el.checked) fd.append(el.name, el.value);
        return;
      }
      if (el.tagName.toLowerCase() === 'select' && el.multiple) {
        Array.from(el.selectedOptions || []).forEach(o => fd.append(el.name, o.value));
        return;
      }
      if (el.type === 'file') {
        if (el.multiple) Array.from(el.files || []).forEach(f => fd.append(el.name, f));
        else if (el.files && el.files[0]) fd.append(el.name, el.files[0]);
        return;
      }
      fd.append(el.name, el.value);
    });

    return fd;
  }

  /* ---------- modal instance if provided ---------- */
  let bsModalInstance = null;
  if ($modal && $modal.length) {
    try {
      bsModalInstance = $modal.data('bs.modal') || bootstrap.Modal.getOrCreateInstance($modal[0]);
      $modal.data('bs.modal', bsModalInstance);
    } catch (e) {
      bsModalInstance = null;
    }
  }

  /* ---------- explicit button targets (recommended to be present in createFormAdvance) ---------- */
  const submitBtnEl = document.getElementById(`${formId}-submitBtn`);
  const modalApplyEl = document.getElementById(`${formId}-applyBtn`);

  function getBtn() {
    // prefer visible modal apply if shown
    if (modalApplyEl && modalApplyEl.offsetParent !== null) return modalApplyEl;
    if (submitBtnEl && submitBtnEl.offsetParent !== null) return submitBtnEl;
    // fallback: any submit-like inside form
    return modalApplyEl || submitBtnEl || locatedForm.querySelector('button[type="submit"], input[type="submit"]');
  }

  // store original html/value so resetSubmit can restore
  const originalBtnHtml = (function () {
    const b = getBtn();
    if (!b) return '';
    return (b.tagName.toLowerCase() === 'input' && 'value' in b) ? b.value : (b.innerHTML || b.textContent || '');
  })();

  /* ---------- spinner / button helpers ---------- */
  function setButtonText(text) {
    const b = getBtn(); if (!b) return;
    if (b.tagName.toLowerCase() === 'input' && 'value' in b) b.value = text;
    else b.innerHTML = text;
  }
  function disableSubmit() {
    const b = getBtn(); if (b) b.disabled = true;
  }
  function enableSubmit() {
    const b = getBtn(); if (b) b.disabled = false;
  }

  function setSubmitting(text = 'Saving...') {
    const b = getBtn(); if (!b) return;
    if (b.tagName.toLowerCase() === 'input' && 'value' in b) {
      b.value = text;
      b.disabled = true;
      if (!b.dataset._spinnerAttached) {
        const s = document.createElement('span');
        s.className = 'btn-spinner ms-2 align-middle';
        s.dataset._for = formId;
        s.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
        try { b.parentNode.insertBefore(s, b.nextSibling); } catch (e) { /* ignore */ }
        b.dataset._spinnerAttached = '1';
      }
    } else {
      b.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + escapeHtml(text);
      b.disabled = true;
    }
  }

  function resetSubmit() {
    const b = getBtn(); if (!b) return;
    if (b.tagName.toLowerCase() === 'input' && 'value' in b) {
      b.value = originalBtnHtml;
      const sp = b.parentNode && b.parentNode.querySelector('.btn-spinner');
      if (sp && sp.parentNode) sp.parentNode.removeChild(sp);
      delete b.dataset._spinnerAttached;
    } else {
      b.innerHTML = originalBtnHtml;
    }
    b.disabled = false;
  }

  /* ---------- message & field helpers ---------- */
  const formMsgEl = document.getElementById(`${formId}-formMsg`);
  function setFormMessage(msg = '', type = '') {
    if (formMsgEl) {
      formMsgEl.innerHTML = msg;
      formMsgEl.className = `small me-auto rsp-msg ${type === 'error' ? 'text-danger' : type === 'success' ? 'text-success' : ''}`;
    } else if ($modal && $modal.length) {
      const rsp = $modal.find('.rsp-msg').first();
      if (rsp && rsp.length) rsp.html(msg || '');
    }
  }
  function setFieldError(name, message) {
    const fb = locatedForm.querySelector(`.invalid-feedback.${name}`) || locatedForm.querySelector('.invalid-feedback');
    if (fb) { fb.textContent = message || ''; fb.classList.add('d-block'); }
    const input = locatedForm.querySelector(`#${formId}-${name}`);
    if (input) input.classList.add('is-invalid');
  }
  function clearFieldErrors() {
    locatedForm.querySelectorAll('.invalid-feedback').forEach(el => { el.textContent = ''; el.classList.remove('d-block'); });
    locatedForm.querySelectorAll('.is-invalid').forEach(inp => inp.classList.remove('is-invalid'));
  }

  /* ---------- submit handling: Option C (no auto-reset on success) ---------- */
  locatedForm.addEventListener('submit', event => {
    // file required checks
    document.querySelectorAll(`#${formId} input[type="file"][required]`).forEach(f => {
      const hasFiles = (f.files && f.files.length > 0);
      if (!hasFiles) {
        f.classList.add('is-invalid');
        const msgEl = f.parentElement.querySelector('.invalid-feedback');
        if (msgEl && !msgEl.textContent) msgEl.textContent = 'This field is required.';
        try { f.setCustomValidity('required'); } catch (e) { /* ignore */ }
      } else {
        try { f.setCustomValidity(''); } catch (e) { /* ignore */ }
      }
    });

    event.preventDefault();
    event.stopPropagation();

    locatedForm.classList.add('was-validated');
    const valid = locatedForm.checkValidity();

    const valuesSnapshot = gatherValues(locatedForm);
    const formDataRaw = buildFormData(locatedForm);

    const api = {
      // legacy
      values: valuesSnapshot,
      form: locatedForm,
      event,
      isValid: valid,
      modal: bsModalInstance,
      close: () => { if (bsModalInstance) try { bsModalInstance.hide(); } catch (e) { /* ignore */ } },

      // new helpers
      getValues: () => gatherValues(locatedForm),
      getRaw: () => buildFormData(locatedForm),

      // button control
      setButtonText,
      disableSubmit,
      enableSubmit,
      setSubmitting,
      resetSubmit,

      // UI helpers
      setFormMsg: setFormMessage,
      setFieldError,
      clearFieldErrors,

      // form control
      reset: () => { locatedForm.reset(); clearFieldErrors(); resetSubmit(); },
      disableForm: () => { locatedForm.querySelectorAll('input,select,textarea,button').forEach(i => i.disabled = true); },
      enableForm: () => { locatedForm.querySelectorAll('input,select,textarea,button').forEach(i => i.disabled = false); resetSubmit(); }
    };

    try {
      if (typeof onSubmit === 'function') {
        const maybePromise = onSubmit(api, { values: valuesSnapshot, formData: formDataRaw, event });

        // Option C behavior:
        // - If onSubmit returned a Promise we DO NOT auto-reset on success.
        // - If the caller DID NOT set a submitting state, we apply a fallback "Please wait..." spinner.
        // - We DO auto-reset only on error (so UI isn't left stuck) — caller can also handle errors.
        if (maybePromise && typeof maybePromise.then === 'function') {
          try {
            const btn = getBtn && typeof getBtn === 'function' ? getBtn() : null;
            const spinnerAlready = btn && (btn.dataset && (btn.dataset._spinnerAttached || btn.dataset._origText));
            if (!spinnerAlready) {
              setSubmitting('Please wait...');
            }
          } catch (e) { /* ignore */ }

          // Do NOT forcibly reset submit on success — caller controls final state.
          maybePromise.catch(err => {
            try { resetSubmit(); } catch (e) { /* ignore */ }
            throw err;
          });
        }
      }
    } catch (err) {
      console.error('createFormSmart onSubmit error:', err);
    }
  }, false);

  /* ---------- attach helpers to the form DOM for programmatic use ---------- */
  try {
    locatedForm.__createFormSmart = locatedForm.__createFormSmart || {};
    locatedForm.__createFormSmart.getValues = () => gatherValues(locatedForm);
    locatedForm.__createFormSmart.getRaw = () => buildFormData(locatedForm);
    locatedForm.__createFormSmart.modal = bsModalInstance;
    locatedForm.__createFormSmart.close = () => bsModalInstance ? bsModalInstance.hide() : null;
    locatedForm.__createFormSmart.setButtonText = (t) => setButtonText(t);
    locatedForm.__createFormSmart.setSubmitting = (t) => setSubmitting(t);
    locatedForm.__createFormSmart.resetSubmit = () => resetSubmit();
  } catch (e) { /* ignore */ }
}


/* ========== createAdvanceForm (patched to include submit IDs) ========== */
export default function createAdvanceForm({
  title,
  formObj = {},
  formId = 'myForm',
  formData = {},
  submitBtnText = 'Submit',
  showSubmitBtn = true,
  formWidth = '100%',
  colsbreak = 6,
  formMsg = '',
  floatingLabels = true,
  modal = false,
  modalTitle = 'Form Modal',
  modalSize = 'lg',
  hideFooter = false,
  onSubmit = null
}) {
  const formConfig = Fields[title] || formObj;
  if (!formConfig) {
    console.error(`Form config object / "${title}" not found.`);
    return '';
  }

  const visibleFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type !== 'hidden');
  const hiddenFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type === 'hidden');
  const hasFileField = visibleFields.some(([_, cfg]) => cfg.type === 'file');
  const twoCol = visibleFields.length > colsbreak;
  const colClass = twoCol ? 'col-md-6' : 'col-12';

  const escapeHtml = unsafe => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  };

  let formInnerHtml = `<form id="${formId}" class="mb-0 needs-validation" novalidate ${hasFileField ? 'enctype="multipart/form-data"' : ''} style="width: ${formWidth}"><div class="row g-3">`;

  for (const [name, configRaw] of visibleFields) {
    const config = { ...configRaw };
    let type = (config.type || 'text').toLowerCase();
    const id = `${formId}-${name}`;
    const requiredAttr = config.required ? 'required' : '';
    const invalidfb = config?.invalidfb || '';
    const helperText = config?.message || '';
    const value = formData[name] ?? config.default ?? '';
    const titleAttr = config.required ? `title="${escapeHtml(config.label || name)} is required"` : '';
    const labelText = (config.label || name) + (config.required ? ' <span class="text-danger">*</span>' : '');
    const disabledAttr = config.disabled ? 'disabled' : '';
    const readOnlyAttr = (config.readonly || config.readOnly) ? 'readonly' : '';
    const blankOption = config.blank || false;
    const multiSelect = config.multiple ? 'multiple' : '';

    let fieldHtml = '';
    const invalidHtml = invalidfb ? `<div class="invalid-feedback ${name}">${invalidfb}</div>` : `<div class="invalid-feedback ${name}"></div>`;
    const helperHtml = helperText ? `<div class="form-text">${helperText}</div>` : '';

    if (['text', 'email', 'number', 'date', 'password'].includes(type)) {
      if (floatingLabels) {
        fieldHtml = `
          <div class="${colClass}">
            <div class="form-floating">
              <input type="${type}" class="form-control" id="${id}" name="${name}" value="${escapeHtml(value)}"
                placeholder="${escapeHtml(config.label || '')}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr} />
              <label for="${id}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${id}" class="form-label">${labelText}</label>
            <input type="${type}" class="form-control" id="${id}" name="${name}"
              value="${escapeHtml(value)}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    } else if (type === 'textarea') {
      const height = config.height || 100;
      if (floatingLabels) {
        fieldHtml = `
          <div class="${colClass}">
            <div class="form-floating">
              <textarea class="form-control" id="${id}" name="${name}" placeholder="${escapeHtml(config.label || '')}"
                style="height: ${height}px" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>${escapeHtml(value)}</textarea>
              <label for="${id}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${id}" class="form-label">${labelText}</label>
            <textarea class="form-control" id="${id}" name="${name}" style="height:${height}px"
              ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>${escapeHtml(value)}</textarea>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    } else if (type === 'select') {
      const buildOptions = (list = [], val = '', blank = false) => {
        const items = (Array.isArray(list) ? list : []).map(opt => {
          const isObj = typeof opt === 'object' && opt !== null;
          const v = isObj ? opt.id : opt;
          const text = isObj ? opt.value : opt;
          const selected = (v == val) ? 'selected' : '';
          return `<option value="${escapeHtml(v)}" ${selected}>${escapeHtml(text)}</option>`;
        });
        return (blank ? ['<option value=""></option>', ...items] : items).join('');
      };

      let options = buildOptions(config.options, value, blankOption);

      if (config?.query) {
        setTimeout(() => {
          axios.post('/auth/advance/query', { key: 'na', values: [], qry: config.query })
            .then(res => {
              const arr = res.data?.data || [];
              if (arr.length) {
                const opts = buildOptions(arr, value, blankOption);
                const sel = document.getElementById(`${formId}-${name}`);
                if (sel) sel.innerHTML = opts;
              }
            })
            .catch(console.error);
        }, 0);
      }

      if (floatingLabels) {
        fieldHtml = `
          <div class="${colClass}">
            <div class="form-floating">
              <select class="form-select" id="${formId}-${name}" name="${name}" ${multiSelect} ${requiredAttr} ${titleAttr} ${disabledAttr}>
                ${options}
              </select>
              <label for="${formId}-${name}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${formId}-${name}" class="form-label">${labelText}</label>
            <select class="form-select" id="${formId}-${name}" name="${name}" ${multiSelect} ${requiredAttr} ${titleAttr} ${disabledAttr}>
              ${options}
            </select>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    } else if (type === 'radio') {
      const radios = (config.options || []).map(opt => {
        const checked = (opt == value) ? 'checked' : '';
        const safeOpt = escapeHtml(String(opt));
        return `
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="${name}" id="${formId}-${name}-${safeOpt}" value="${safeOpt}" ${checked} ${requiredAttr} ${disabledAttr}>
            <label class="form-check-label" for="${formId}-${name}-${safeOpt}">${safeOpt}</label>
          </div>`;
      }).join('');
      fieldHtml = `
        <div class="${colClass}">
          <label class="form-label d-block">${labelText}</label>
          ${radios}
          ${invalidHtml ? `<div class="invalid-feedback d-block ${name}">${invalidfb}</div>` : ''}
          ${helperHtml}
        </div>`;
    } else if (type === 'checkbox') {
      const defaults = Array.isArray(value) ? value : [value];
      const checkboxes = (config.options || []).map(opt => {
        const checked = defaults.includes(opt) ? 'checked' : '';
        const safeOpt = escapeHtml(String(opt));
        return `
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="${name}[]" id="${formId}-${name}-${safeOpt}" value="${safeOpt}" ${checked} ${requiredAttr} ${disabledAttr}>
            <label class="form-check-label" for="${formId}-${name}-${safeOpt}">${safeOpt}</label>
          </div>`;
      }).join('');
      fieldHtml = `
        <div class="${colClass}">
          <label class="form-label d-block">${labelText}</label>
          ${checkboxes}
          ${invalidHtml ? `<div class="invalid-feedback d-block ${name}">${invalidfb}</div>` : ''}
          ${helperHtml}
        </div>`;
    } else if (type === 'file') {
      const fileSubType = config.fileType || 'any';
      let acceptAttr = '';
      if (fileSubType === 'images') acceptAttr = 'accept="image/*"';
      else if (fileSubType === 'pdf') acceptAttr = 'accept=".pdf"';

      const limitVal = config.limit ? Number(config.limit) : 0;
      const sizeVal = config.size ? String(config.size).toLowerCase() : '';
      const dataLimit = limitVal ? `data-limit="${limitVal}"` : '';
      const dataSize = sizeVal ? `data-size="${escapeHtml(sizeVal)}"` : '';

      const actualMultipleAttr = (config.multiple || limitVal > 1) ? 'multiple' : '';

      let previewHtml = `<div class="mt-2" id="${formId}-${name}-preview"></div>`;
      if (value) {
        const files = Array.isArray(value) ? value : [value];
        previewHtml = `<div class="mt-2" id="${formId}-${name}-preview">` +
          files.map(file => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            if (isImage) return `<img src="${escapeHtml(file)}" class="img-thumbnail me-2 mb-2" style="max-width:150px;">`;
            else return `<small class="text-muted d-block"><a href="${escapeHtml(file)}" target="_blank">${escapeHtml(String(file).split('/').pop())}</a></small>`;
          }).join('') + `</div>`;
      }

      fieldHtml = `
        <div class="${colClass}">
          <label for="${formId}-${name}" class="form-label">${labelText}</label>
          <input type="file" class="form-control" id="${formId}-${name}" name="${name}" ${actualMultipleAttr} ${requiredAttr} ${acceptAttr} ${dataLimit} ${dataSize} ${titleAttr} ${disabledAttr}>
          ${invalidHtml}
          ${helperHtml}
          ${previewHtml}
        </div>`;
    } else {
      if (floatingLabels) {
        fieldHtml = `
          <div class="${colClass}">
            <div class="form-floating">
              <input type="text" class="form-control" id="${formId}-${name}" name="${name}" value="${escapeHtml(value)}"
                placeholder="${escapeHtml(config.label || '')}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>
              <label for="${formId}-${name}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${formId}-${name}" class="form-label">${labelText}</label>
            <input type="text" class="form-control" id="${formId}-${name}" name="${name}"
              value="${escapeHtml(value)}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    }

    formInnerHtml += fieldHtml;
  }

  formInnerHtml += `</div>`;

  // Hidden fields
  hiddenFields.forEach(([name, cfg]) => {
    const id = `${formId}-${name}`;
    const value = formData[name] ?? cfg.default ?? '';
    formInnerHtml += `<input type="hidden" id="${id}" name="${name}" value="${escapeHtml(value)}">`;
  });

  // Submit button with explicit ID (inline)
  const submitBtn = showSubmitBtn ? `<div class="mt-4 d-flex jcb aic"> <span class="me-auto" id="${formId}-formMsg">${formMsg}</span> <button id="${formId}-submitBtn" type="submit" class="btn btn-primary">${escapeHtml(submitBtnText)}</button></div>` : '';
  formInnerHtml += `${submitBtn}</form><p class="mb-0 mt-4 small text-secondary">Fields marked with (<span class="text-danger">*</span>) are Required Fields!</p>`;

  // Non-modal: attach setupClientLogic and return HTML
  if (!modal) {
    setTimeout(() => setupClientLogic(formId, onSubmit), 0);
    return formInnerHtml;
  }

  // Modal flow
  const sizeClass = modalSize ? `modal-${modalSize}` : '';
  const modalHtml = `
    <div class="modal fade" id="${formId}-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" role="dialog" aria-labelledby="${formId}-modal-title" aria-hidden="true">
      <div class="modal-dialog modal-dialog-scrollable ${sizeClass}" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${formId}-modal-title">${escapeHtml(modalTitle)}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${formInnerHtml}
          </div>
          <div class="modal-footer ${hideFooter ? 'd-none' : ''}">
            <span class="small me-auto rsp-msg"></span>
            <button type="button" class="btn btn-secondary close" data-bs-dismiss="modal">Close</button>
            <button id="${formId}-applyBtn" type="button" class="btn btn-primary apply">${escapeHtml(submitBtnText)}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const $modal = $(modalHtml);
  $('body').append($modal);

  const bsModalInstance = new bootstrap.Modal($modal[0]);
  $modal.data('bs.modal', bsModalInstance);

  $modal.on('hidden.bs.modal', function () { $modal.remove(); });

  // wire apply button to submit form
  $modal.find('.modal-footer .apply').on('click', function () {
    const frm = $modal.find(`form#${formId}`)[0];
    if (frm) frm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  // init client logic with modal jQuery object
  setTimeout(() => setupClientLogic(formId, onSubmit, $modal), 0);

  return $modal;
}
