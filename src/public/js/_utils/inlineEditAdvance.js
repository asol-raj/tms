// import { advanceMysqlQuery, jq, log } from './help.js'

import { advanceMysqlQuery, jq, log } from "../help.js";


/**
 * inlineEditAdvance with colname support, Bootstrap form-select class,
 * blank option, and validation dropdown (with colors).
 *
 * - $tbody: jq object / selector
 * - config:
 *    dataKeys: [...],
 *    dataSelect: [...],
 *    validateKey: [...],          // 👈 optional validation dropdowns
 *    dbtable: 'leads',
 *    idKey: 'id',
 *    debug: true
 *    dataSelect: [dataKey: 'the data-key value of the column, colname: 'database table column name']
 */
async function inlineEditAdvance($tbody, { dataKeys = [], dataSelect = [], validateKey = [], dbtable, idKey = "id", debug = false, callback = null, checkNullKeys = [] } = {}) {
    try {
        // normalize $tbody to jq
        if (typeof $tbody === "string" || $tbody instanceof Element) $tbody = jq($tbody);
        else if ($tbody && $tbody.jquery) { /* ok */ }
        else { console.error("inlineEditAdvance: $tbody must be selector, DOM node or jq object"); return; }

        if (debug) console.log("inlineEditAdvance: init", { dataKeys, dataSelect, validateKey, dbtable, idKey });

        if (!dbtable) { console.warn("inlineEditAdvance: missing dbtable"); return; }
        if ((!Array.isArray(dataKeys) || dataKeys.length === 0) &&
            (!Array.isArray(dataSelect) || dataSelect.length === 0) &&
            (!Array.isArray(validateKey) || validateKey.length === 0)) {
            console.warn("inlineEditAdvance: nothing editable (no keys)"); return;
        }

        // merge validateKey into dataSelect for unified handling
        dataSelect = [...(dataSelect || []), ...(validateKey || [])];

        // Build selectMap: datakey -> { colname, options, qry, blank }
        const selectMap = new Map();
        (dataSelect || []).forEach(cfg => {
            if (!cfg || !cfg.datakey) return;
            selectMap.set(cfg.datakey, {
                colname: cfg.colname ?? '',
                options: Array.isArray(cfg.options) ? cfg.options.slice() : [],
                qry: typeof cfg.qry === "string" && cfg.qry.trim() ? cfg.qry.trim() : null,
                blank: !!cfg.blank
            });
        });

        const qryCache = new Map();

        const normalizeOptions = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr.map(o => {
                if (o && typeof o === "object") {
                    return {
                        id: o.id ?? o.value ?? o.name ?? String(o),
                        value: o.value ?? o.name ?? String(o),
                        bgcolor: o.bgcolor || '',
                        color: o.color || ''
                    };
                } else return { id: o, value: String(o), bgcolor: '', color: '' };
            });
        };

        const fetchOptionsForQry = async (qryStr) => {
            if (!qryStr) return [];
            if (qryCache.has(qryStr)) return qryCache.get(qryStr);
            try {
                if (debug) console.log("inlineEditAdvance: fetching options for qry:", qryStr);
                const rsp = await advanceMysqlQuery({ key: `inlineSelect_${Math.random().toString(36).slice(2, 8)}`, qry: qryStr, values: [] });
                const rows = rsp?.data ?? [];
                const norm = (Array.isArray(rows) ? rows.map(r => {
                    if (r && typeof r === "object") {
                        if (r.hasOwnProperty('id') && r.hasOwnProperty('value')) return { id: r.id, value: r.value };
                        const keys = Object.keys(r);
                        const idKeyTry = keys.find(k => /id$/i.test(k)) ?? keys[0];
                        const valKeyTry = keys.find(k => /value|name|title|label/i.test(k)) ?? keys[1] ?? keys[0];
                        return { id: r[idKeyTry], value: r[valKeyTry] };
                    }
                    return { id: r, value: String(r) };
                }) : []);
                qryCache.set(qryStr, norm);
                return norm;
            } catch (err) {
                console.error("inlineEditAdvance: advanceMysqlQuery failed:", err);
                qryCache.set(qryStr, []);
                return [];
            }
        };

        const allKeys = new Set([...(dataKeys || []), ...Array.from(selectMap.keys())]);
        const editableSelector = Array.from(allKeys).map(k => `[data-key="${k}"]`).join(", "); //log(editableSelector);
        const editableSelect = Array.from(Array.from(selectMap.keys())).map(k => `[data-key="${k}"]`).join(", "); //log(editableSelect);

        // ----------------- NEW: normalize checkNullKeys into a Set -----------------
        const checkNullSet = new Set(Array.isArray(checkNullKeys) ? checkNullKeys.map(k => String(k)) : []);
        // -------------------------------------------------------------------------

        $tbody.find(editableSelect).each(function () {
            const $cell = jq(this);
            if (!$cell.text()) {
                // $cell.addClass('text-center1').html(`<span class="small text-light bg-secondary px-2 rounded">Select <i class="bi bi-chevron-down"></i></span>`).prop('title', 'Click to Select Option');
                $cell.html(`
                    <span class="d-block w-100 text-end small text-secondary rounded bg-light ps-5 pe-1">
                        <i class="bi bi-chevron-down"></i>
                    </span>`);
            }
        })

        // ---------- Initial visual styling for validation/colored selects ----------
        $tbody.find(editableSelector).each(function () {
            const $cell = jq(this);
            $cell.addClass('role-btn');

            const datakey = $cell.data().key;
            const cfg = selectMap.get(datakey);
            if (!cfg || !Array.isArray(cfg.options)) return;

            const currentVal = $cell.text().trim();
            const matchOpt = cfg.options.find(o =>
                String(o.value) === currentVal || String(o.id) === currentVal
            );

            if (matchOpt && (matchOpt.bgcolor || matchOpt.color)) {
                $cell.css({
                    backgroundColor: matchOpt.bgcolor || '',
                    color: matchOpt.color || ''
                });
            } else {
                // reset any default background if not matching
                $cell.css({ backgroundColor: '', color: '' });
            }
        });

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

        // Build select (supports colors)
        const buildSelectFromOptions = (optsArr, selectedId, allowBlank = false) => {
            const $sel = jq('<select class="inline-select form-select form-select-sm" />');
            if (allowBlank) {
                const $blankOpt = jq('<option/>').val('').text('');
                if (selectedId === null || selectedId === '' || selectedId === 'null') $blankOpt.prop('selected', true);
                $sel.append($blankOpt);
            }
            optsArr.forEach(o => {
                const $opt = jq('<option/>')
                    .val(o.id)
                    .text(o.value)
                    .css({ backgroundColor: o.bgcolor || '', color: o.color || '' });
                if (String(o.id) === String(selectedId)) $opt.prop("selected", true);
                $sel.append($opt);
            });
            return $sel;
        };

        const closeAndRemoveSelect = ($cell, $select, prevHtml) => {
            $select.off();
            $select.remove();
            if (typeof prevHtml !== "undefined") $cell.html(prevHtml);
            $cell.removeAttr("contenteditable");
        };

        // ---------- Shared patch ----------
        const patchCellValue = async ($cell, datakey, newValue) => {
            // ----------------- NEW: reject blank for keys in checkNullSet -----------------
            if ((newValue === '' || newValue === null) && checkNullSet.has(String(datakey))) {
                flashErrorInline($cell, 'This field cannot be blank');
                return false;
            }
            // ---------------------------------------------------------------------------

            const row = $cell.closest("tr");
            const rowId = row.find(`[data-key="${idKey}"]`).text().trim();
            if (!rowId) { flashErrorInline($cell, `Row id not found (data-key="${idKey}")`); return false; }

            const selCfg = selectMap.get(datakey);
            const columnName = (selCfg && selCfg.colname?.trim().length) ? selCfg.colname : datakey;

            const payload = {
                table: dbtable,
                field: columnName,
                idkey: idKey,
                value: newValue === '' ? null : newValue,
                id: rowId
            };

            if (debug) console.log("inlineEditAdvance: PATCH payload", payload);
            try {
                const fetchRsp = await fetch('/auth/inline/edit', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!fetchRsp.ok) {
                    const msg = (await fetchRsp.json().catch(() => ({}))).error || `Server ${fetchRsp.status}`;
                    flashErrorInline($cell, msg);
                    return false;
                }
                const rsp = await fetchRsp.json();
                if (rsp?.status) {
                    flashSuccess($cell);
                    jq("#updateStatus").html(`<i class="bi bi-check2-all"></i>`);

                    // ✅ Run callback if provided
                    if (typeof callback === "function") {
                        callback(newValue, $cell);
                    }
                    return true;
                }
                flashErrorInline($cell, rsp?.error || "Update failed");
                return false;
            } catch (err) {
                flashErrorInline($cell, "Network error");
                console.error("inlineEditAdvance network error:", err);
                return false;
            }
        };

        // ---------- Click handler ----------
        $tbody.on("click.inlineEditAdvance", editableSelector, async function () {
            const $cell = jq(this);
            const datakey = $cell.data().key;
            if (!datakey || !allKeys.has(datakey)) return;

            let localOptions = null;
            const dataOptionsAttr = $cell.attr('data-options');
            if (dataOptionsAttr) {
                try {
                    localOptions = normalizeOptions(JSON.parse(dataOptionsAttr));
                } catch (e) {
                    localOptions = normalizeOptions(dataOptionsAttr.split(',').map(s => s.trim()).filter(Boolean));
                }
            } else {
                const selCfg = selectMap.get(datakey);
                if (selCfg) {
                    if (Array.isArray(selCfg.options) && selCfg.options.length)
                        localOptions = normalizeOptions(selCfg.options);
                    else if (selCfg.qry)
                        localOptions = await fetchOptionsForQry(selCfg.qry);
                    else localOptions = [];
                } else localOptions = [];
            }

            // TEXT mode
            if (!localOptions.length) {
                if (!$cell.attr("contenteditable")) {
                    $cell.data("original", $cell.text().trim());
                    $cell.data("saved", false);
                    $cell.prop("contenteditable", "true").trigger('focus');
                }
                return;
            }

            // SELECT mode
            if ($cell.find('select.inline-select').length) { $cell.find('select.inline-select').trigger('focus'); return; }

            const prevHtml = $cell.html();
            $cell.data("original", $cell.text().trim());
            $cell.data("saved", false);
            const currentText = $cell.text().trim();

            let selectedId = null;
            const matchByVal = localOptions.find(o => String(o.value) === String(currentText));
            if (matchByVal) selectedId = matchByVal.id;
            const matchById = localOptions.find(o => String(o.id) === String(currentText));
            if (!selectedId && matchById) selectedId = matchById.id;

            // ----------------- UPDATED: disallow blank option for keys in checkNullSet -----------------
            let allowBlank = (selectMap.get(datakey)?.blank) || false;
            if (checkNullSet.has(String(datakey))) allowBlank = false;
            // -------------------------------------------------------------------------------------------

            const $select = buildSelectFromOptions(localOptions, selectedId, allowBlank);
            $cell.empty().append($select);
            $select.trigger('focus');

            const onKey = (e) => {
                if (e.key === "Enter") { e.preventDefault(); $select.trigger("change"); }
                else if (e.key === "Escape") { e.preventDefault(); closeAndRemoveSelect($cell, $select, prevHtml); }
            };

            $select.on("change", async function () {
                const selVal = jq(this).val();

                // ----------------- NEW: prevent selecting blank for protected keys -----------------
                if ((selVal === '' || selVal === null) && checkNullSet.has(String(datakey))) {
                    flashErrorInline($cell, 'This field cannot be blank');
                    // restore previous view and close select
                    $cell.html(prevHtml);
                    closeAndRemoveSelect($cell, $select, prevHtml);
                    return;
                }
                // ------------------------------------------------------------------------------------

                const selOpt = localOptions.find(o => String(o.id) === String(selVal));
                const ok = await patchCellValue($cell, datakey, selVal);
                if (ok) {
                    $cell.html(selOpt ? String(selOpt.value) : '');
                    if (selOpt && (selOpt.bgcolor || selOpt.color)) {
                        $cell.css({
                            backgroundColor: selOpt.bgcolor || '',
                            color: selOpt.color || ''
                        });
                    }
                }
            });

            $select.on("blur", function () {
                const selVal = $select.val();
                const selOpt = localOptions.find(o => String(o.id) === String(selVal));
                if (selOpt) $cell.html(String(selOpt.value)); else $cell.html(prevHtml);
                closeAndRemoveSelect($cell, $select, prevHtml);
            });

            $select.on("keydown", onKey);
        });

        // ---------- Keydown for text ----------
        $tbody.on("keydown.inlineEditAdvance", editableSelector, function (e) {
            const $currentCell = jq(this);
            const $row = $currentCell.closest("tr");
            const cellIndex = $currentCell.index();
            const datakey = $currentCell.data().key;
            if ($currentCell.find('select.inline-select').length) return;

            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                (async () => {
                    const value = $currentCell.text().trim();
                    const original = $currentCell.data("original");
                    if (value !== original) {
                        // ----------------- NEW: block saving blank for protected keys -----------------
                        if ((value === '' || value === null) && checkNullSet.has(String(datakey))) {
                            flashErrorInline($currentCell, 'This field cannot be blank');
                            // restore original so UI remains consistent
                            $currentCell.html(original);
                        } else {
                            const ok = await patchCellValue($currentCell, datakey, value);
                            if (ok) $currentCell.data("original", value);
                        }
                        // --------------------------------------------------------------------------------
                    }

                    let $targetCell;
                    if (e.key === "Tab") {
                        const $cells = $row.find(editableSelector);
                        const currentIndex = $cells.index($currentCell);
                        $targetCell = e.shiftKey ? $cells.eq(currentIndex - 1) : $cells.eq(currentIndex + 1);
                    } else {
                        const $targetRow = e.shiftKey ? $row.prev("tr") : $row.next("tr");
                        $targetCell = $targetRow.find("td").eq(cellIndex);
                    }

                    if ($targetCell?.length) {
                        $currentCell.removeAttr("contenteditable");
                        $targetCell.prop("contenteditable", "true").trigger('focus').trigger('click');
                        $targetCell[0].scrollIntoView({ behavior: "smooth", block: "center" });
                    } else {
                        $currentCell.removeAttr("contenteditable");
                        $currentCell.blur();
                    }
                })();
            } else if (e.key === "Escape") {
                e.preventDefault();
                $currentCell.html($currentCell.data("original"));
                $currentCell.removeAttr("contenteditable");
            }
        });

        // ---------- Blur ----------
        $tbody.on("blur.inlineEditAdvance", editableSelector, function () {
            const $cell = jq(this);
            if ($cell.find('select.inline-select').length) return;
            if (!$cell.attr("contenteditable")) return;
            $cell.html($cell.data("original"));
            $cell.removeAttr("contenteditable");
        });

        return {
            destroy: () => { $tbody.off(".inlineEditAdvance"); },
            refreshQryCache: (qryStr) => { if (qryCache.has(qryStr)) qryCache.delete(qryStr); }
        };
    } catch (err) {
        console.error("inlineEditAdvance error:", err);
        throw err;
    }
}

export default inlineEditAdvance
