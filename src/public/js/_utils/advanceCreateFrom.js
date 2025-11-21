import Fields from "../formfields.js";
const log = console.log;

/**
 * @file advanceCreateFrom.js
 * @description
 * A module that builds dynamic forms and modal forms from a form configuration object,
 * wires client-side behavior (validation, file previews, submit handling), and exposes
 * programmatic helpers via an `api` object or `locatedForm.__createFormSmart`.
 *
 * This file exports the following public API:
 *  - setupClientLogic(formId, onSubmit, $modal) : void
 *      Attach submit behavior and helper methods for a form already in the DOM.
 *
 *  - createAdvanceForm(options) : HTMLElement | string
 *      Build and return either an inline form HTML (string) or a jQuery modal object.
 *
 * The module supports:
 *  - file previewing and validation for input[type="file"]
 *  - legacy style `.values` snapshot plus `getValues()`/`getRaw()` helpers
 *  - button helpers (setSubmitting, resetSubmit, setButtonText)
 *  - api.onSuccess / api.onError helpers for standardized UI alerts
 *  - onLoad callback (for modal flow, invoked after modal+form are in DOM)
 *
 * Usage: See bottom example or call createAdvanceForm(...) with appropriate callbacks.
 */

/**
 * @typedef {Object} FormAPI
 * @property {Object} values   - Snapshot of current form values (gatherValues semantics).
 * @property {HTMLFormElement} form - The form DOM element.
 * @property {Event} event     - The submit event (when in submit context).
 * @property {boolean} isValid - Result of `form.checkValidity()` at submit time.
 * @property {Object|null} modal - Bootstrap modal instance or null.
 * @property {Function} close  - Close the modal (if available).
 *
 * Helper methods:
 * @property {Function} getValues - () => Object  Returns fresh values from the DOM.
 * @property {Function} getRaw    - () => FormData Returns FormData for file uploads.
 *
 * Button & submit helpers:
 * @property {Function} setButtonText    - (text: string) => void
 * @property {Function} disableSubmit    - () => void
 * @property {Function} enableSubmit     - () => void
 * @property {Function} setSubmitting    - (text?: string) => void  (shows spinner)
 * @property {Function} resetSubmit      - () => void
 *
 * UI helpers:
 * @property {Function} setFormMsg       - (msg: string, type?: 'error'|'success') => void
 * @property {Function} setFieldError    - (name: string, message: string) => void
 * @property {Function} clearFieldErrors - () => void
 *
 * Form control:
 * @property {Function} reset       - () => void  (form.reset() + reset UI state)
 * @property {Function} disableForm - () => void  (disable all inputs)
 * @property {Function} enableForm  - () => void
 *
 * Success / Error helpers:
 * @property {Function} onSuccess   - (message?: string, options?: {hide?:boolean,autoClose?:number,dismissible?:boolean}) => HTMLElement
 * @property {Function} onError     - (message?: string|Error, options?: {hide?:boolean,autoClose?:number}) => HTMLElement
 */

/**
 * @typedef {Object} FieldConfig
 * @property {string} [label]      - Label text for the field.
 * @property {string} [type]       - 'text'|'email'|'select'|'textarea'|... (defaults to 'text').
 * @property {boolean} [required]  - If true adds required attribute and indicator.
 * @property {boolean} [multiple]  - For select/file fields to allow multiple values.
 * @property {Array|Function|string} [options] - For select/checkbox/radio: array of options or query.
 * @property {string} [invalidfb]  - Custom invalid feedback text.
 * @property {string} [message]    - Helper text shown below the field.
 * @property {any} [default]       - Default value to populate input with.
 * @property {boolean} [disabled]  - If true sets disabled attribute on field.
 * @property {string} [fileType]   - For file type: 'images'|'pdf'|'any'
 * @property {number|string} [limit] - For file multiple limit.
 * @property {string} [size]       - For file max size representation like '2mb'
 */

/**
 * @callback OnSubmitFn
 * @param {FormAPI} api - The helper API object for the form.
 * @param {Object} ctx - Context containing { values, formData, event } where:
 *                       - values: snapshot object (gatherValues)
 *                       - formData: FormData object (buildFormData)
 *                       - event: submit Event
 * @returns {void|Promise<void>} Optionally a Promise; Option C behavior: returned Promise will NOT auto-reset the submit UI on success.
 */

/**
 * @callback OnLoadFn
 * @param {Object} api - Lightweight API invoked after form is in DOM (modal flow):
 * @param {HTMLFormElement} api.form       - The form DOM element.
 * @param {Object|null} api.modal          - Bootstrap modal instance (if any).
 * @param {Function} api.get               - (name: string) => HTMLElement  get element by field name (id = `${formId}-${name}`)
 * @param {Function} api.setValue          - (name: string, value: any) => void   set value and dispatch input event
 * @param {Function} api.appendOptions     - (name: string, arr: Array<{id:any,value:string}>) => void
 * @param {Function} api.clearOptions      - (name: string) => void
 * @param {Function} api.enable            - (name: string) => void
 * @param {Function} api.disable           - (name: string) => void
 * @returns {void}
 */

/**
 * Attaches submit behavior and exposes programmatic helpers for a form that already exists in the DOM.
 *
 * The function wires:
 *  - input[type="file"] previews & validation
 *  - form submit handling with legacy `values` snapshot and `getValues`/`getRaw`
 *  - button spinner helpers and reset logic (Option C: onSubmit Promise does NOT auto-reset)
 *  - api.onSuccess / api.onError UI helpers
 *
 * IMPORTANT: this function expects the form element to be reachable by `document.getElementById(formId)`
 *            or if used in modal flow, to be present in the modal markup.
 *
 * @param {string} formId - id attribute of the form element to bind (e.g. 'taskForm')
 * @param {OnSubmitFn|null} onSubmit - callback executed when the form is submitted
 * @param {jQuery|null} [$modal] - optional jQuery modal object (if the form lives inside a bootstrap modal)
 * @returns {void}
 */

/**
 * setupClientLogic - Option C (no auto-reset on success)
 *
 * - Preserves legacy api.values snapshot
 * - Adds fresh helpers: api.getValues(), api.getRaw()
 * - Adds button controls: api.setButtonText, api.setSubmitting (spinner), api.disableSubmit, api.enableSubmit, api.resetSubmit
 * - DOES NOT force-reset submit state when onSubmit returns a Promise. Caller fully controls final UI state.
 *
 * Usage: setupClientLogic(formId, onSubmit, $modal)
 * onLoad: (api)=>{
        api.setValue('title', 'Raj');
    },
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

  /* ---------- alert helper (new) ---------- */
  function createAlertEl(type, message, dismissible = true) {
    const div = document.createElement('div');
    div.className = `alert alert-${type} ${dismissible ? 'alert-dismissible fade show' : ''}`;
    div.setAttribute('role', 'alert');
    div.innerHTML = `${escapeHtml(String(message || ''))}`;
    if (dismissible) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-close';
      btn.setAttribute('data-bs-dismiss', 'alert');
      btn.setAttribute('aria-label', 'Close');
      div.appendChild(btn);
    }
    return div;
  }

  function showAlert(type, message, opts = {}) {
    // opts: { autoClose: ms, insertAtTop: bool }
    const { autoClose = 0, dismissible = true } = opts;
    let alertEl = createAlertEl(type === 'error' ? 'danger' : type, message, dismissible);

    if ($modal && $modal.length) {
      // Insert inside modal body, above form
      const $body = $modal.find('.modal-body').first();
      if ($body && $body.length) {
        $body.prepend(alertEl);
      } else {
        // fallback: insert before modal content
        $modal[0].insertBefore(alertEl, $modal[0].firstChild);
      }
    } else {
      // inline form - insert before the form
      const parent = locatedForm.parentNode;
      if (parent) parent.insertBefore(alertEl, locatedForm);
    }

    if (autoClose && Number(autoClose) > 0) {
      setTimeout(() => {
        try {
          // use bootstrap's alert dispose if available
          if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alertEl);
            bsAlert.close();
          } else {
            if (alertEl && alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
          }
        } catch (e) {
          if (alertEl && alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
        }
      }, Number(autoClose));
    }

    return alertEl;
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
      enableForm: () => { locatedForm.querySelectorAll('input,select,textarea,button').forEach(i => i.disabled = false); resetSubmit(); },

      // new: success / error helpers
      /**
       * api.onSuccess(message, options)
       * options: { hide: true|false, autoClose: ms }
       * default: hide = true (hide the form), autoClose = 0 (don't auto close alert)
       */
      onSuccess: (message = 'Saved successfully', options = {}) => {
        const { hide = true, autoClose = 0, dismissible = false } = options || {};
        try {
          // reset any submit/spinner state
          resetSubmit();
        } catch (e) { /* ignore */ }

        // show green alert
        const alertEl = showAlert('success', message, { autoClose, dismissible });

        // hide the form element (but keep modal open so alert is visible)
        try {
          if (hide) {
            // if modal - hide the form inside modal, else hide inline form
            locatedForm.style.display = 'none';
          }
        } catch (e) { /* ignore */ }

        return alertEl;
      },

      /**
       * api.onError(message, options)
       * options: { hide: false|true, autoClose: ms }
       * default: hide = false (do not hide form)
       */
      onError: (message = 'An error occurred', options = {}) => {
        const { hide = false, autoClose = 0 } = options || {};
        try {
          // if there was a spinner, reset submit so UI is responsive
          resetSubmit();
        } catch (e) { /* ignore */ }

        const alertEl = showAlert('error', (message && message.message) ? message.message : message, { autoClose });

        if (hide) {
          try { locatedForm.style.display = 'none'; } catch (e) { /* ignore */ }
        }

        return alertEl;
      }
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

  /* ---------- trigger onLoad callback if provided ---------- */
  try {
    if (typeof locatedForm.dataset.onload === 'string') {
      const fn = window[locatedForm.dataset.onload];
      if (typeof fn === 'function') {
        fn({
          form: locatedForm,
          modal: bsModalInstance,
          get: (name) => document.getElementById(`${formId}-${name}`),
          setValue: (name, v) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (el) el.value = v;
          },
          appendOptions: (name, arr) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (!el) return;
            arr.forEach(opt => {
              const op = document.createElement('option');
              op.value = opt.id;
              op.textContent = opt.value;
              el.appendChild(op);
            });
          },
          clearOptions: (name) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (el) el.innerHTML = '';
          },
          enable: (name) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (el) el.disabled = false;
          },
          disable: (name) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (el) el.disabled = true;
          }
        });
      }
    }
  } catch (e) {
    console.error('onLoad error:', e);
  }

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
    // expose success/error helpers on DOM object too
    locatedForm.__createFormSmart.onSuccess = (msg, opts) => (typeof locatedForm === 'object' && locatedForm ? (function () { /* simulate api.onSuccess */ return null; })() : null);
  } catch (e) { /* ignore */ }
}

/**
 * Create an advanced form (inline or modal) based on a form configuration object.
 *
 * The function builds the HTML for the form (or a modal containing the form), registers
 * client logic (via setupClientLogic) and returns:
 *  - If modal === false: a string of the form HTML (already wired via setupClientLogic)
 *  - If modal === true: a jQuery modal object appended to body (and a bootstrap modal instance attached)
 *
 * Field rendering rules:
 *  - Fields are defined by the `Fields` config (imported at top of this module) or by the `formObj` argument.
 *  - Supported types: text, email, number, date, password, textarea, select, radio, checkbox, file, hidden
 *  - Select fields accept `options` as an array of values OR objects {id, value}. If `query` is set on a field,
 *    an AJAX call will be made to `/auth/advance/query` to populate options asynchronously.
 *
 * Notes on modal flow & onLoad:
 *  - If `modal === true` and an `onLoad` function is passed, this function will be invoked after the modal's
 *    markup is appended to the DOM (with a small delay) and will receive a lightweight `api` allowing quick
 *    manipulation of field values and options before the user interacts with the form.
 *
 * @param {Object} options - Options object (all keys are properties in the call signature)
 * @param {string} options.title - Key to look up form configuration in the imported Fields object. If missing, `formObj` is used.
 * @param {Object} [options.formObj={}] - Alternative form configuration object to use instead of Fields[title].
 * @param {string} [options.formId='myForm'] - The id attribute for the generated form (used to build field ids too).
 * @param {Object} [options.formData={}] - Initial values to populate form fields (keyed by field name).
 * @param {string} [options.submitBtnText='Submit'] - Text for submit button.
 * @param {boolean} [options.showSubmitBtn=true] - If false, do not render the submit button.
 * @param {string} [options.formWidth='100%'] - Inline style width for the form container.
 * @param {number} [options.colsbreak=6] - How many fields before the layout switches to two-column mode.
 * @param {string} [options.formMsg=''] - Initial message shown beside the submit button.
 * @param {boolean} [options.floatingLabels=true] - Use bootstrap floating labels markup when true.
 * @param {boolean} [options.modal=false] - Render the form inside a bootstrap modal when true.
 * @param {string} [options.modalTitle='Form Modal'] - Modal title text.
 * @param {string} [options.modalSize='lg'] - Modal size class (e.g. 'lg', 'sm', 'xl').
 * @param {boolean} [options.hideFooter=false] - Hide modal footer when true.
 * @param {OnSubmitFn|null} [options.onSubmit=null] - Submit callback as described above.
 * @param {OnLoadFn|null} [options.onLoad=null] - Callback executed after modal+form are in DOM (modal flow).
 *
 * @returns {string|jQuery} Returns the inline form HTML string if modal===false, otherwise returns the jQuery-wrapped modal element.
 *
 * @example
 * // Define a named onLoad function (recommended)
 * function myFormOnLoad(api) {
 *   // set single input value
 *   api.setValue('title', 'Hello world');
 *
 *   // populate select options
 *   api.appendOptions('user_id', [
 *     { id: 1, value: 'Amit' },
 *     { id: 2, value: 'Ravi' }
 *   ]);
 * }
 *
 * // Call createAdvanceForm to create a modal form
 * const $modal = createAdvanceForm({
 *   title: 'newTasklist',
 *   formId: 'taskForm',
 *   modal: true,
 *   modalTitle: 'Create Task',
 *   onLoad: myFormOnLoad,
 *   onSubmit: async (api, ctx) => {
 *     const values = ctx.values; // snapshot of field values
 *     try {
 *       await postData('/auth/tasklist', values);
 *       api.onSuccess('Task created', { hide: true });
 *       api.close();
 *     } catch (err) {
 *       api.onError(err);
 *     }
 *   }
 * });
 *
 * // Show modal (returned is jQuery modal element)
 * $modal.data('bs.modal').show();
 */

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
  onSubmit = null,
  onLoad = null
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

  // let formInnerHtml = `<form id="${formId}" class="mb-0 needs-validation" novalidate ${hasFileField ? 'enctype="multipart/form-data"' : ''} style="width: ${formWidth}"><div class="row g-3">`;

  let formInnerHtml = `
    <form 
      id="${formId}" 
      data-onload="${onLoad ? onLoad.name : ''}"
      class="mb-0 needs-validation" 
      novalidate 
      ${hasFileField ? 'enctype="multipart/form-data"' : ''} 
      style="width: ${formWidth}"
    >
    <div class="row g-3">
    `;


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

  // Trigger onLoad AFTER modal + form are in DOM (works for modal flow)
  if (typeof onLoad === 'function') {
    setTimeout(() => {
      try {
        const formEl = document.getElementById(formId);
        if (!formEl) return;
        onLoad({
          form: formEl,
          modal: $modal.data && $modal.data('bs.modal') ? $modal.data('bs.modal') : (typeof bootstrap !== 'undefined' ? bootstrap.Modal.getInstance($modal[0]) : null),
          get: (name) => document.getElementById(`${formId}-${name}`),
          setValue: (name, v) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (!el) return;
            if ('value' in el) el.value = v;
            // trigger input event
            try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* ignore */ }
          },
          appendOptions: (name, arr) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (!el) return;
            arr.forEach(opt => {
              const op = document.createElement('option');
              op.value = opt.id;
              op.textContent = opt.value;
              el.appendChild(op);
            });
          },
          clearOptions: (name) => {
            const el = document.getElementById(`${formId}-${name}`);
            if (el) el.innerHTML = '';
          },
          enable: (name) => { const el = document.getElementById(`${formId}-${name}`); if (el) el.disabled = false; },
          disable: (name) => { const el = document.getElementById(`${formId}-${name}`); if (el) el.disabled = true; }
        });
      } catch (e) { console.error('onLoad callback error:', e); }
    }, 50);
  }

  return $modal;
}

