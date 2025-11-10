import { jq, log } from './help.js'

/**
 * inlineEditDate — improved inline date editor using Flatpickr
 *
 * Usage:
 *   inlineEditDate($tbody, {
 *     datakey: ['dob', 'joining_date'],
 *     format: 'dd-mm-yyyy',       // display format: 'yyyy-mm-dd' | 'dd-mm-yyyy' | 'mm-dd-yyyy'
 *     dbtable: 'employees',
 *     idkey: 'id',
 *     apiUrl: '/router/api/inline/edit', // optional; defaults to '/api/inline/edit'
 *     flatpickr: { /* merged into flatpickr init * / }   // optional
 *   })
 *
 * Notes:
 *  - Ensure flatpickr is loaded globally (script include) before using this.
 */
async function inlineEditDate($tbody, {
    datakey = [],
    format = 'yyyy-mm-dd',
    dbtable,
    idkey = 'id',
    debug = false,
    apiUrl = '/api/inline/edit',
    flatpickr: userFPOpts = {}
} = {}) {
    if (!dbtable || !datakey.length) return;

    // display formatter: iso (yyyy-mm-dd) -> display string
    const formatDateDisplay = (isoDateStr) => {
        if (!isoDateStr) return '';
        // expect iso yyyy-mm-dd, but accept other parseable strings
        const m = isoDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            const [, yyyy, mm, dd] = m;
            switch (format.toLowerCase()) {
                case 'dd-mm-yyyy': return `${dd}-${mm}-${yyyy}`;
                case 'mm-dd-yyyy': return `${mm}-${dd}-${yyyy}`;
                default: return `${yyyy}-${mm}-${dd}`;
            }
        }
        // fallback: try Date parse (rare)
        const d = new Date(isoDateStr);
        if (isNaN(d)) return isoDateStr;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        if (format.toLowerCase() === 'dd-mm-yyyy') return `${dd}-${mm}-${yyyy}`;
        if (format.toLowerCase() === 'mm-dd-yyyy') return `${mm}-${dd}-${yyyy}`;
        return `${yyyy}-${mm}-${dd}`;
    };

    // parse display (or common) to ISO YYYY-MM-DD
    const parseDisplayToISO = (val) => {
        if (!val) return '';
        val = String(val).trim();
        // dd-mm-yyyy or dd/mm/yyyy
        let m = val.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (m) {
            const [, p1, p2, y] = m;
            if (format.toLowerCase() === 'dd-mm-yyyy') return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
            if (format.toLowerCase() === 'mm-dd-yyyy') return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
            // if configured as yyyy-mm-dd but input looks like dd-mm-yyyy, assume dd-mm-yyyy
            return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        }
        // yyyy-mm-dd
        m = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return val;
        // last resort: Date.parse
        const d = new Date(val);
        if (!isNaN(d)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return '';
    };

    // send patch to server; returns truthy success value
    const patchCellValue = async ($cell, datakeyName, newValue) => {
        // find row id: prefer tr[data-id], else td[data-key=idkey] attr data-value or text
        const $tr = $cell.closest('tr');
        let rowId = $tr.attr('data-id') || '';
        if (!rowId) {
            const $idCell = $tr.find(`[data-key="${idkey}"]`).first();
            if ($idCell && $idCell.length) {
                rowId = $idCell.attr('data-value') || $idCell.text().trim();
            }
        }
        if (!rowId) {
            if (debug) console.warn('inlineEditDate: could not determine row id for cell', $cell[0]);
            return false;
        }

        const payload = {
            table: dbtable,
            field: datakeyName,
            idkey: idkey,
            value: newValue || null,
            id: rowId
        };

        // UI helpers
        const ERROR_DURATION_MS = 3500;
        const flashSuccess = ($cell) => { $cell.addClass("flash-green"); setTimeout(() => $cell.removeClass("flash-green"), 600); };
        const flashErrorInline = ($cell, msg) => {
            $cell.find(".inline-error").remove();
            $cell.addClass("flash-red");
            const $err = jq(`<div class="inline-error" role="alert"></div>`).text(msg);
            $cell.append($err);
            setTimeout(() => { $err.fadeOut(120, function () { jq(this).remove(); }); $cell.removeClass("flash-red"); }, ERROR_DURATION_MS);
        };

        try {
            const res = await fetch(apiUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                if (debug) console.warn('inlineEditDate: server returned', res.status);
                return false;
            }

            flashSuccess($cell);
            const json = await res.json(); //log(json);
            // Accept truthy json.status or json.success
            if (debug) console.log('inlineEditDate: server response', json);
            return json?.status || json?.success || true;
        } catch (err) {
            console.error('inlineEditDate: update failed', err);
            return false;
        }
    };

    const editableSelector = datakey.map(k => `[data-key="${k}"]`).join(', ');

    // guard: require flatpickr available
    const hasFlatpickr = (typeof flatpickr === 'function');
    if (!hasFlatpickr) {
        console.warn('inlineEditDate: flatpickr not found. Include flatpickr JS before calling this helper.');
    }

    $tbody.on('click.inlineEditDate', editableSelector, function (e) {
        const $cell = jq(this);
        const key = $cell.data().key;
        if (!key) return;
        if ($cell.data('editing')) return; // already editing
        $cell.data('editing', true);

        const prevHtml = $cell.html();
        // prefer data-value attribute for original value, else text
        const rawVal = ($cell.attr('data-value') ?? $cell.text()).trim();
        const isoOriginal = parseDisplayToISO(rawVal) || ''; // '' if not parseable

        // Build editor: text input (flatpickr) + clear button
        const $editor = jq(`
            <div class="inline-date-editor d-inline-flex align-items-center" style="gap:8px;">
                <input type="text" class="form-control form-control-sm inline-date-input" placeholder="yyyy-mm-dd" />
                <button type="button" class="btn btn-sm btn-outline-secondary inline-date-cancel" title="Cancel"><i class="bi bi-x-lg"></i></button>
                <button type="button" class="btn btn-sm btn-outline-secondary inline-date-delete" title="Delete Value"><i class="bi bi-trash"></i></button>
                <span class="inline-date-spinner d-none" aria-hidden="true"></span>
            </div>
        `); //log($editor)
        $cell.empty().append($editor);
        const $input = $editor.find('.inline-date-input');
        const $cancel = $editor.find('.inline-date-cancel');
        const $delete = $editor.find('.inline-date-delete');
        const $spinner = $editor.find('.inline-date-spinner');

        // set initial display value if iso present
        if (isoOriginal) $input.val(formatDateDisplay(isoOriginal));

        // init flatpickr if available
        let fpInstance = null;
        if (hasFlatpickr) {
            const fpOpts = Object.assign({
                dateFormat: (format.toLowerCase() === 'dd-mm-yyyy' ? 'd-m-Y' : (format.toLowerCase() === 'mm-dd-yyyy' ? 'm-d-Y' : 'Y-m-d')),
                allowInput: false,
                maxDate: "today",
                // defaultDate accepts iso (yyyy-mm-dd)
                defaultDate: isoOriginal || undefined,
                clickOpens: true,
                onChange(selectedDates) {
                    if (selectedDates && selectedDates.length) {
                        const d = selectedDates[0];
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        const iso = `${yyyy}-${mm}-${dd}`;
                        // submit immediately
                        submitUpdate(iso);
                    }
                },
                onClose(selectedDates, dateStr) {
                    // If user typed a value and pressed enter/blur, handle in keydown
                    // If they cleared via UI, selectedDates may be empty - do nothing here
                }
            }, userFPOpts);

            try {
                fpInstance = flatpickr($input[0], fpOpts);
            } catch (err) {
                if (debug) console.error('inlineEditDate: flatpickr init error', err);
                fpInstance = null;
            }
        }

        // show spinner helpers
        const showSpinner = () => {
            $spinner.removeClass('d-none').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
        };
        const hideSpinner = () => {
            $spinner.addClass('d-none').empty();
        };

        // cleanup & restore helpers
        const restorePrev = (displayVal) => {
            // if displayVal provided, use it; otherwise revert to prevHtml
            if (typeof displayVal === 'string') {
                $cell.html(displayVal || '&nbsp;');
                // update data-value attribute if displayVal derived from iso? We set data-value inside submitUpdate on success.
            } else {
                $cell.html(prevHtml);
            }
            teardown();
        };

        // Cancel without saving
        const cancelEdit = () => restorePrev();

        // submit update and update cell if successful
        let saving = false;
        const submitUpdate = async (isoValue) => {
            if (saving) return;
            saving = true;
            showSpinner();

            const success = await patchCellValue($cell, key, isoValue);
            if (success) {
                // prefer isoValue (server may normalize; we don't require server response here)
                const display = isoValue ? formatDateDisplay(isoValue) : '';
                // set data-value for next round
                if (isoValue) $cell.attr('data-value', isoValue);
                else $cell.removeAttr('data-value'); // cleared
                $cell.html(display || '&nbsp;');
            } else {
                // revert
                if (debug) console.warn('inlineEditDate: server update failed for', key, isoValue);
                $cell.html(prevHtml);
            }
            hideSpinner();
            teardown();
        };

        // parse typed input on Enter
        $input.on('keydown', function (evt) {
            if (evt.key === 'Enter') {
                evt.preventDefault();
                const typed = $input.val().trim();
                if (!typed) {
                    // empty typed -> do nothing (user should click clear to send NULL)
                    cancelEdit();
                    return;
                }
                const iso = parseDisplayToISO(typed);
                if (iso) {
                    submitUpdate(iso);
                } else {
                    // invalid -> mark
                    $input.addClass('is-invalid');
                    setTimeout(() => $input.removeClass('is-invalid'), 1600);
                }
            } else if (evt.key === 'Escape' || evt.key === 'Esc') {
                evt.preventDefault();
                cancelEdit();
            }
        });

        // clear button -> send null to server (clear column)
        $delete.on('click', function () {
            // delete editor UI
            const typed = $input.val().trim();
            if (!typed) {
                cancelEdit();
                return;
            }
            // if(!confirm('Remove Entry?')){
            //     cancelEdit();
            //     return;
            // }
            if (fpInstance) {
                try { fpInstance.clear(); } catch (e) { }
            } else {
                $input.val('');
            }
            submitUpdate(null);
        });

        $cancel.on('click', (e) => {
            cancelEdit();
        })

        const outsideHandler = (ev) => {
            // do not close if click was inside the cell OR inside flatpickr calendar
            if ($.contains($cell[0], ev.target)) return;
            if ($(ev.target).closest('.flatpickr-calendar').length) return;
            cancelEdit();
        };
        // $(document).on('click.inlineEditDate', outsideHandler);


        // teardown function
        function teardown() {
            try {
                if (fpInstance) fpInstance.destroy();
            } catch (e) { /* ignore */ }
            $(document).off('click.inlineEditDate', outsideHandler);
            $cell.removeData('editing');
            saving = false;
        }

        // focus input
        setTimeout(() => {
            try { $input.trigger('focus').trigger('select'); } catch (e) { }
        }, 40);
    });
    // initial formatting: attempt to parse and format any existing date strings
    $tbody.find(editableSelector).each(function () {
        const $cell = jq(this);
        const val = ($cell.attr('data-value') ?? $cell.text()).trim();
        const iso = parseDisplayToISO(val); //log(iso);
        if (iso) {
            $cell.text(formatDateDisplay(iso))
        } else {
            $cell.html(`
            <span class="d-block w-100 text-end small text-secondary rounded bg-light ps-5 pe-1">
                <i class="bi bi-calendar"></i>
            </span>`);
        }
        if (val.length) { }
    });

    return {
        destroy: () => $tbody.off('.inlineEditDate')
    };
}

export default inlineEditDate;
