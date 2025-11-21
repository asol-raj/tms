// createForm.esm.js — Bootstrap 5 form generator (ESM default export)
/**
 * Create a dynamic Bootstrap 5 form from a schema definition.
 *
 * @function createForm
 * @param {Object<string, Object>} schema
 *   An object describing the form fields. Each key becomes a field name.
 *   Field definition properties include:
 *   @param {string} schema[].label - Display label for the field.
 *   @param {string} schema[].type - Field type: text, password, email, select, radio, checkbox, textarea.
 *   @param {boolean} [schema[].required] - Whether the field must be filled.
 *   @param {number} [schema[].min] - Minimum length (text/textarea).
 *   @param {number} [schema[].max] - Maximum length (text/textarea).
 *   @param {string} [schema[].case] - Text transform rule: "lower", "upper", "title", "sentence".
 *   @param {string} [schema[].placeholder] - Placeholder text for input fields.
 *   @param {Array<{id: string|number, value: string}>} [schema[].options]
 *     For select, radio fields: array of id/value pairs.
 *   @param {boolean} [schema[].blank] - For select fields: include a blank/default empty option (ignored if required = true).
 *   @param {any} [schema[].default] - Initial value for the field.
 *   @param {string} [schema[].query]
 *     For select fields: if set, options will be loaded dynamically using the provided loadOptions callback.
 *
 * @param {Object} [opts={}] - Additional configuration options.
 * @param {Object<string, any>} [opts.value] - Prefilled form values keyed by field name.
 * @param {boolean} [opts.submitbtn=true] - Whether to show the submit button.
 * @param {boolean} [opts.resetbtn=false] - Whether to show the reset button.
 * @param {string} [opts.btntxt="Submit"] - Submit button text.
 * @param {string} [opts.formid="myform"] - The id attribute for the generated form.
 * @param {number} [opts.colbreak=6] - Number of fields after which to split the form into two columns.
 * @param {function(string, Object):Promise<Array>} [opts.loadOptions]
 *   Callback used when a select field includes a `query` property.
 * @param {function(formApi: Object, event: SubmitEvent): (Promise|any)} [opts.onSubmit]
 *   Function called when the form is submitted successfully.
 *
 * @param {boolean} [opts.resetOnSuccess=true] - Reset form after success message confirmation.
 * @param {boolean} [opts.autofocus=true] - Focus first focusable field when form appears.
 * @param {boolean} [opts.trapTab=true] - Keep focus movement trapped inside the form (for modal behavior).
 * @param {boolean} [opts.modal=false] - If true, render inside a Bootstrap modal.
 * @param {string} [opts.modalTitle="Form"] - Modal header title if modal mode is used.
 *
 * @returns {HTMLFormElement}
 *   The generated form element. The form also includes a helper API on:
 *   `form.$api = { getValue, setValue, values, focus, showSuccess, showError, ... }`.
 *
 * @description
 * This function builds a validated, Bootstrap-styled form entirely from a declarative `schema`.
 * It supports dynamic selects (via queries and loadOptions), automatic validation UI,
 * modals, success/error alerts, tab-trap behavior, and a small helper API for programmatic usage.
 */

/* 
  //usage of the function 
  const schema = {
      username: { label: 'Username', type: 'text', required: true, min: 3 },
      password: { label: 'Password', type: 'password', required: true, min: 8 },
      email: { label: 'Email', type: 'email', case: 'lower', placeholder: 'you@domain.com' },
      // required: true + blank: true  → blank is ignored
      role: {
          label: 'Role', type: 'select',
          options: [{ id: 1, value: 'Admin' }, { id: 2, value: 'User' }],
          default: 2, required: true
      },
      role2: {
          label: 'Role', type: 'select',
          options: [{ id: 1, value: 'Admin' }, { id: 2, value: 'User' }],
          default: 2, required: false, blank: true
      },
      // query-based selects remain unchanged
      dept: { label: 'Department', type: 'select', query: 'select id, name as value from departments' },
      comments: { label: 'Comments', type: 'textarea', max: 120 }
  };
  const btn = document.getElementById('testid');
  btn.addEventListener('click', () => {
      createForm(schema, {
          formid: 'userForm',
          modal: true,                 // <<— render inside a Bootstrap modal
          modalTitle: 'User Registration',
          resetOnSuccess: true,
          autofocus: true,
          trapTab: true,
          loadOptions: async (field) => {
              if (field === 'dept') return [{ id: 101, value: 'HR' }, { id: 102, value: 'Sales' }];
              return [];
          },
          onSubmit: async (api) => {
              // Example: validate then “submit”
              const vals = api.values();
              if (!vals.username || vals.username.length < 3) {
                  api.setFieldError('username', 'Please enter at least 3 characters.');
                  throw new Error('Please correct the highlighted errors.');
              }
              // simulate server
              await new Promise(r => setTimeout(r, 400));
              return true; // shows success and hides the form
          }
      });
  })
*/

// createForm.esm.js — Bootstrap 5 form generator (ESM default export)

export default function createForm(schema, opts = {}) {
  const {
    value = null,
    submitbtn = true,
    btntxt = 'Submit',
    resetbtn = false,
    formid = 'myform',
    colbreak = 6,
    loadOptions,
    onSubmit,

    // extras
    resetOnSuccess = true,   // reset when success OK is clicked
    autofocus = true,        // focus first field
    trapTab = true,          // keep Tab focus inside the form
    modal = false,           // render into Bootstrap modal if true
    modalTitle = 'Form',
    modalSize ='lg'
  } = opts;

  const form = document.createElement('form');
  form.id = formid;
  form.noValidate = true;
  form.className = 'needs-validation';

  const fields = Object.entries(schema);
  const useTwoCols = fields.length > colbreak;
  const row = el('div', 'row g-3');
  const colLeft = el('div', useTwoCols ? 'col-12 col-md-6' : 'col-12');
  const colRight = useTwoCols ? el('div', 'col-12 col-md-6') : null;

  fields.forEach(([key, def], idx) => {
    const fieldWrap = buildField(key, def, value?.[key]);

    // Hidden fields are returned as just the input node (no layout). Append them straight to the form root
    // so they don't consume grid space.
    if (isHiddenDef(def)) {
      form.appendChild(fieldWrap);
    } else {
      (useTwoCols && idx >= colbreak ? colRight : colLeft).appendChild(fieldWrap);
    }

    // Dynamic select options (unchanged)
    if (def.type === 'select' && !Array.isArray(def.options) && def.query && typeof loadOptions === 'function') {
      Promise.resolve(loadOptions(key, def)).then((arr) => {
        const sel = (isHiddenDef(def) ? form : fieldWrap).querySelector(`select[name="${cssEsc(key)}"]`);
        if (!sel) return;
        fillSelectOptions(sel, def, arr || []);
      });
    }
  });

  row.appendChild(colLeft);
  if (colRight) row.appendChild(colRight);
  form.appendChild(row);

  // Required note
  if (fields.some(([, d]) => d?.required === true || d?.required === 'true')) {
    const note = el('div', 'mt-2 text-muted small');
    note.textContent = 'Fields marked with * are required.';
    form.appendChild(note);
  }

  // Buttons
  if (submitbtn || resetbtn) {
    const btnRow = el('div', 'row mt-3');
    const btnCol = el('div', 'col-12 d-flex gap-2 justify-content-end');
    if (resetbtn) btnCol.appendChild(btn('Reset', { type: 'reset', className: 'btn btn-outline-secondary' }));
    if (submitbtn) btnCol.appendChild(btn(btntxt, { type: 'submit', className: 'btn btn-primary' }));
    btnRow.appendChild(btnCol);
    form.appendChild(btnRow);
  }

  // Success / Error boxes (siblings, not inside the form)
  const successBox = makeAlert('success'); // {wrap,msg,ok}
  const errorBox = makeAlert('danger');

  successBox.ok.addEventListener('click', () => {
    if (resetOnSuccess) hardReset(form);
    successBox.wrap.classList.add('d-none');
    errorBox.wrap.classList.add('d-none');
    form.classList.remove('d-none');
    if (autofocus) focusFirst(form);
  });
  errorBox.ok.addEventListener('click', () => {
    errorBox.wrap.classList.add('d-none');
    successBox.wrap.classList.add('d-none');
    form.classList.remove('d-none');
    if (autofocus) focusFirst(form);
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    if (!form.checkValidity()) {
      e.preventDefault(); e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    if (typeof onSubmit === 'function') {
      e.preventDefault(); e.stopPropagation();
      try {
        const result = await onSubmit(form.$api, e); console.log(result);
        showSuccess(typeof result === 'object' && result?.message ? result.message : 'Form submitted successfully.');
      } catch (err) {
        showError(err?.message || 'Submission failed.');
      }
    }
    form.classList.add('was-validated');
  });

  // Tiny API
  form.$api = {
    getEl: (name) => form.querySelector(`[name="${cssEsc(name)}"]`),
    getValue: (name) => {
      const el = form.querySelector(`[name="${cssEsc(name)}"]`);
      if (!el) return undefined;
      if (el instanceof HTMLSelectElement && el.multiple) return [...el.selectedOptions].map(o => o.value);
      if (el.type === 'checkbox') return el.checked;
      return el.value;
    },
    setValue: (name, val) => {
      const el = form.querySelector(`[name="${cssEsc(name)}"]`); if (!el) return false;
      if (el instanceof HTMLSelectElement && el.multiple && Array.isArray(val)) {
        const s = val.map(String);[...el.options].forEach(o => o.selected = s.includes(String(o.value)));
        el.dispatchEvent(new Event('change', { bubbles: true })); return true;
      }
      if (el.type === 'checkbox') { el.checked = !!val; return true; }
      el.value = val ?? '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    values: () => Object.fromEntries(new FormData(form).entries()),
    focus: (name) => { const el = form.querySelector(`[name="${cssEsc(name)}"]`); if (el) el.focus(); },
    show: () => form.classList.remove('d-none'),
    hide: () => form.classList.add('d-none'),
    showSuccess: (message = 'Saved successfully.') => showSuccess(message),
    hideSuccess: () => successBox.wrap.classList.add('d-none'),
    showError: (message = 'Something went wrong.') => showError(message),
    hideError: () => errorBox.wrap.classList.add('d-none'),
    setFieldError: (name, msg) => {
      const el = form.querySelector(`[name="${cssEsc(name)}"]`); if (!el) return;
      el.classList.add('is-invalid');
      let box = el.closest('.mb-2')?.querySelector('.invalid-feedback');
      if (!box) { box = document.createElement('div'); box.className = 'invalid-feedback'; el.closest('.mb-2')?.appendChild(box); }
      box.textContent = msg || 'Invalid';
    },
    clearFieldError: (name) => {
      const el = form.querySelector(`[name="${cssEsc(name)}"]`); if (!el) return;
      el.classList.remove('is-invalid');
    }
  };

  // autofocus + tab trap
  if (autofocus) queueMicrotask(() => focusFirst(form));
  if (trapTab) {
    form.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Tab') return;
      const F = focusables(form); if (!F.length) return;
      const first = F[0], last = F[F.length - 1];
      if (ev.shiftKey && document.activeElement === first) { last.focus(); ev.preventDefault(); }
      else if (!ev.shiftKey && document.activeElement === last) { first.focus(); ev.preventDefault(); }
    });
  }

  // Modal mode (requires Bootstrap’s JS on the page)
  if (modal && window.bootstrap?.Modal) {
    const modalEl = buildModal(modalTitle);
    const body = modalEl.querySelector('.modal-body');
    body.appendChild(form);
    body.appendChild(successBox.wrap);
    body.appendChild(errorBox.wrap);
    document.body.appendChild(modalEl);
    const bsModal = new window.bootstrap.Modal(modalEl, { backdrop: 'static' });
    bsModal.show();
    successBox.ok.addEventListener('click', () => { try { bsModal.hide(); } catch { } });
    errorBox.ok.addEventListener('click', () => { try { bsModal.show(); } catch { } });
    return form; // caller doesn’t need to mount it
  }

  // Inline mode: caller must mount the form, and we’ll place alerts as siblings when used
  return form;

  // —— helpers ——
  function showSuccess(message) {
    successBox.msg.textContent = message;
    attachAlertsNextToForm();
    successBox.wrap.classList.remove('d-none');
    errorBox.wrap.classList.add('d-none');
    form.classList.add('d-none');
  }
  function showError(message) {
    errorBox.msg.textContent = message;
    attachAlertsNextToForm();
    errorBox.wrap.classList.remove('d-none');
    successBox.wrap.classList.add('d-none');
    form.classList.remove('d-none');
  }
  function attachAlertsNextToForm() {
    if (!successBox.wrap.isConnected) form.insertAdjacentElement('afterend', successBox.wrap);
    if (!errorBox.wrap.isConnected) form.insertAdjacentElement('afterend', errorBox.wrap);
  }
  function hardReset(f) {
    f.reset();
    f.classList.remove('was-validated');
    f.querySelectorAll('.is-invalid').forEach(n => n.classList.remove('is-invalid'));
    f.querySelectorAll('input,textarea,select').forEach(n => { try { n.setCustomValidity(''); } catch { } });
  }
  function el(tag, className, attrs) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    return n;
  }
  function btn(text, { type = 'button', className = 'btn btn-secondary' } = {}) {
    const b = el('button', className); b.type = type; b.textContent = text; return b;
  }
  function ucfirst(s) { return (s || '').replace(/^./, c => c.toUpperCase()).replace(/_/g, ' '); }
  function mapInputType(t) { return ['email', 'password', 'search', 'number', 'date', 'datetime-local', 'text', 'hidden'].includes(t) ? t : 'text'; }
  function applyCasing(input, mode) {
    const toTitle = s => s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase());
    const toSentence = s => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
    const handler = () => {
      const s = input.selectionStart, e = input.selectionEnd;
      if (mode === 'lower') input.value = input.value.toLowerCase();
      else if (mode === 'upper') input.value = input.value.toUpperCase();
      else if (mode === 'title') input.value = toTitle(input.value);
      else if (mode === 'sentence') input.value = toSentence(input.value);
      try { input.setSelectionRange(s, e); } catch { }
    };
    input.addEventListener('input', handler);
    input.addEventListener('blur', handler);
    queueMicrotask(handler);
  }

  function fillSelectOptions(select, def, optsArr) {
    select.innerHTML = '';

    // Determine if the field is effectively required
    const isRequired = requiredTrue(def?.required) === true;
    const isMulti = !!def?.multi;

    // Add a blank option ONLY when not required and not multi
    if (def?.blank && !isRequired && !isMulti) {
      const blankOpt = new Option('', '');
      select.add(blankOpt, 0);
    }

    (optsArr || []).forEach(opt => {
      const val = opt?.id ?? opt?.value ?? String(opt);
      const txt = opt?.value ?? String(opt);
      select.add(new Option(txt, String(val)));
    });

    const initial = def?.default;

    if (isMulti) {
      const initVals = Array.isArray(initial) ? initial.map(String) : [];
      if (initVals.length) {
        [...select.options].forEach(o => { if (initVals.includes(String(o.value))) o.selected = true; });
      }
    } else {
      if (initial != null && initial !== '') {
        const target = String(initial);
        select.value = target;
        if (select.value !== target) {
          const match = [...select.options].find(o => String(o.value) === target);
          if (match) match.selected = true;
        }
      } else {
        if (!(def?.blank && !isRequired && !isMulti) && select.options.length > 0) {
          select.selectedIndex = 0;
        }
      }
    }
  }

  function requiredTrue(v) { return v === true || v === 'true'; }
  function truthy(v) { return v === true || v === 1 || v === '1' || v === 'true'; }
  function cssEsc(str) { return String(str).replace(/"/g, '\\"'); }
  function isHiddenDef(def) { return String(def?.type || '').toLowerCase() === 'hidden'; }

  function buildField(name, def = {}, initial) {
    const type = (def.type || 'text').toLowerCase();
    const id = name;
    const labelText = def.label ?? ucfirst(name);

    // ——— NEW: dedicated hidden-field path ———
    if (type === 'hidden') {
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = id;
      hidden.name = name;

      let val = initial ?? def.default ?? '';
      if (val != null && val !== '') hidden.value = String(val);

      // Allow validation if someone marks a hidden field required
      if (requiredTrue(def.required)) hidden.required = true;

      return hidden; // no wrapper, no label, no grid spacing
    }
    // ——— end hidden ———

    const wrap = el('div', `mb-2 ${name}`);

    const isCheck = type === 'checkbox';
    const isRadio = type === 'radio';
    const isSelect = type === 'select';

    // Label
    if (!isCheck && !isRadio) {
      const label = el('label', 'form-label');
      label.setAttribute('for', id);
      label.textContent = labelText;
      if (requiredTrue(def.required)) {
        const star = el('span', 'text-danger ms-1'); star.textContent = '*'; label.appendChild(star);
      }
      wrap.appendChild(label);
    }

    let control;
    if (type === 'textarea') {
      control = el('textarea', 'form-control'); control.rows = 3;
    } else if (isSelect) {
      control = el('select', 'form-select');
      if (def.multi) control.multiple = true;
      fillSelectOptions(control, def, def.options || []);
    } else if (isRadio) {
      const group = el('div', 'd-flex flex-column gap-2');
      (def.options || []).forEach((opt, i) => {
        const rid = `${id}_${i}`;
        const rc = el('div', 'form-check');
        const r = el('input', 'form-check-input');
        r.type = 'radio'; r.name = id; r.id = rid;
        r.value = opt?.id ?? opt?.value ?? String(opt);
        if (requiredTrue(def.required) && i === 0) r.required = true;
        if (initial != null && String(initial) === String(r.value)) r.checked = true;
        const rl = el('label', 'form-check-label'); rl.setAttribute('for', rid); rl.textContent = opt?.value ?? String(opt);
        rc.appendChild(r); rc.appendChild(rl); group.appendChild(rc);
      });
      control = group;
    } else if (isCheck) {
      const fc = el('div', 'form-check');
      const c = el('input', 'form-check-input');
      c.type = 'checkbox'; c.id = id; c.name = name;
      if (truthy(initial ?? def.default)) c.checked = true;
      if (def.required) c.required = true;
      const cl = el('label', 'form-check-label'); cl.setAttribute('for', id); cl.textContent = labelText;
      fc.appendChild(c); fc.appendChild(cl); control = fc;
    } else {
      const input = el('input', 'form-control');
      input.type = mapInputType(type);
      input.id = id; input.name = name;
      if (def.placeholder) input.placeholder = def.placeholder;
      if (def.readonly) input.readOnly = true;
      if (def.disabled) input.disabled = true;
      if (requiredTrue(def.required)) input.required = true;

      let val = initial ?? def.default ?? '';
      if (input.type === 'date' && val === 'today') {
        const now = new Date();
        val = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      }
      if (val != null && val !== '') input.value = String(val);
      if (def.case) applyCasing(input, def.case);
      if (Number.isInteger(def.min)) input.minLength = def.min;
      if (Number.isInteger(def.max)) input.maxLength = def.max;
      control = input;
    }

    if (!isRadio && !isCheck) {
      if (def.readonly && control.tagName !== 'SELECT') control.readOnly = true;
      if (def.disabled) control.disabled = true;
      if (requiredTrue(def.required)) control.required = true;
    }
    if (control && !isRadio) { if (control.id == null) control.id = id; if (!control.name) control.name = name; }

    const fbInvalid = el('div', 'invalid-feedback');
    fbInvalid.textContent = def.invalid || 'Please provide a valid value.';
    const fbValid = el('div', 'valid-feedback');
    fbValid.textContent = def.msgtext || '';

    if (isRadio) { wrap.appendChild(control); wrap.appendChild(fbInvalid); if (def.msgtext) wrap.appendChild(fbValid); }
    else if (isCheck) { wrap.appendChild(control); wrap.appendChild(fbInvalid); if (def.msgtext) wrap.appendChild(fbValid); }
    else {
      wrap.appendChild(control);
      if (def.helptext) { const help = el('div', 'form-text'); help.textContent = def.helptext; wrap.appendChild(help); }
      wrap.appendChild(fbInvalid); if (def.msgtext) wrap.appendChild(fbValid);
    }

    // live counter
    if ((['text', 'textarea', 'email', 'password', 'search'].includes(type)) && (Number.isInteger(def.min) || Number.isInteger(def.max))) {
      const counter = document.createElement('div');
      counter.className = 'form-text text-end';
      const min = Number.isInteger(def.min) ? def.min : null;
      const max = Number.isInteger(def.max) ? def.max : null;
      wrap.appendChild(counter);
      const target = (type === 'textarea') ? wrap.querySelector('textarea') : wrap.querySelector('input');
      const update = () => {
        const len = target.value?.length || 0;
        counter.textContent = `${len}${max ? `/${max}` : ''} characters`;
        if (max && len > max) { target.setCustomValidity('Too many characters'); fbInvalid.textContent = def.invalid || `Maximum ${max} characters allowed.`; }
        else if (min && len > 0 && len < min) { target.setCustomValidity('Too few characters'); fbInvalid.textContent = def.invalid || `Minimum ${min} characters required.`; }
        else { target.setCustomValidity(''); fbInvalid.textContent = def.invalid || 'Please provide a valid value.'; }
      };
      target.addEventListener('input', update); update();
    }

    return wrap;
  }

  function makeAlert(kind) {
    const wrap = el('div', `alert alert-${kind} d-none mt-3 d-flex justify-content-between align-items-center`);
    wrap.role = 'alert';
    const msg = el('div', 'me-3');
    const ok = btn('OK', { type: 'button', className: `btn btn-${kind === 'success' ? 'success' : 'danger'} btn-sm` });
    wrap.appendChild(msg); wrap.appendChild(ok);
    return { wrap, msg, ok };
  }
  function focusables(root) {
    return [...root.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.offsetParent !== null);
  }
  function focusFirst(root) { const f = focusables(root); if (f[0]) f[0].focus(); }
  function buildModal(title) {
    const m = document.createElement('div');
    m.className = 'modal fade'; m.tabIndex = -1;
    m.innerHTML = `
      <div class="modal-dialog modal-${modalSize}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body"></div>
        </div>
      </div>`;
    m.querySelector('.modal-title').textContent = title;
    return m;
  }
}


