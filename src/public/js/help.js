import '../_libs/jquery/jquery.js';
import '../_libs/axios/axios.js';
import Fields from './formfields.js';

export const log = console.log;
export const jq = jQuery;
export const axios = window.axios;

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

/**
 * Converts a string to title case.
 *
 * This function capitalizes the first letter of each word in the string
 * and makes the rest of the word lowercase. Words are assumed to be
 * separated by single spaces.
 *
 * @param {string | null | undefined} str The input string to convert.
 * @returns {string} The title-cased string.
 */
export function toTitleCase(str) {
  // Handle null, undefined, or empty strings gracefully
  if (!str) {
    return "";
  }

  return str
    .toLowerCase() // Convert the entire string to lowercase first to handle mixed cases
    .split(' ')    // Split the string into an array of words
    .map(word => {
      // For each word, capitalize the first letter and append the rest of the word
      // Handle empty strings that might result from multiple spaces
      return word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : "";
    })
    .join(' ');  // Join the words back together with a space
}

/**
 * Helper to fetch data using GET request.
 * @param {string} url - The endpoint URL.
 * @param {object|null} params - Optional query parameters.
 * @returns {Promise<any>} - Response data or error.
 */
export async function fetchData(url, params = null) {
  if (!url) return;

  try {
    const response = await axios.get(url, {
      params, // axios puts these into the query string
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error.message);
    throw error; // rethrow to let caller handle it
  }
}

/**
 * Helper to send a POST request.
 * @param {string} url - The endpoint URL.
 * @param {object} data - The data to send in the body.
 * @param {object|null} config - Optional Axios config (e.g., headers).
 * @returns {Promise<any>} - Response data or error.
 */
export async function postData(url, data = {}, config = null) {
  if (!url) return;

  try {
    const response = await axios.post(url, data, config || {});
    return response.data;
  } catch (error) {
    // log(error);
    console.log("Error posting data:", error.message);
    throw error;
  }
}

/**
 * Convert a form into a plain JavaScript object.
 *
 * @param {HTMLFormElement|string} form - A form element or its ID.
 * @returns {Object} An object containing form field names and values.
 *
 * @example
 * const data = formToObject('loginForm');
 * // => { email: "user@example.com", remember: "on" }
 */
export function fd2obj(form) {
  const formElement = typeof form === 'string'
    ? document.getElementById(form)
    : form;

  if (!formElement) {
    console.warn('formToObject: Form not found:', form);
    return {};
  }

  const formData = new FormData(formElement);
  const obj = {};

  for (const [key, value] of formData.entries()) {
    // If a key appears more than once (e.g., checkboxes or multi-select), store as array
    if (obj.hasOwnProperty(key)) {
      if (!Array.isArray(obj[key])) {
        obj[key] = [obj[key]];
      }
      obj[key].push(value);
    } else {
      obj[key] = value.trim?.() ?? value;
    }
  }

  return obj;
}

export function hideTableColumns($table, columns = []) {
  if (!columns.length) return;
  columns.forEach(c => $table.find(`[data-key="${c}"]`).addClass('d-none'));
}

export async function loadSQL(filename) {
  const response = await fetch(`/_sql/${filename}`);
  if (!response.ok) throw new Error(`Failed to load SQL file: ${filename}`);
  return await response.text();
}

export async function advanceMysqlQuery({ key, values = [], type = null, srchterm = null, qry = null }) {
  try {
    if (!key) throw "Invalid Query";
    let rsp = await axios.post("/auth/advance/query", { key, values, type, srchterm, qry });
    // if (!rsp.data.data.length) return false;
    return rsp.data;
  } catch (error) {
    log(error);
  }
}

export async function fetchjson(filename, config = null) {
  if (!filename) return;
  try {
    let url = "/api/getjsondata";
    let rsp = await axios.post(url, { filename }, config || {});
    return rsp;
  } catch (error) {
    console.error("Error posting data:", error.message);
    throw error;
  }
}

/**
 * Parses the window's current URL query string into an array of objects.
 * Each object represents a key-value pair.
 * @returns {Array<Object>} An array of objects, e.g., [{key: 'month', value: '9'}, ...]. Returns an empty array if no params are found.
*/
export function getAllQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const queryParamsArray = [];

  // The URLSearchParams object is iterable, allowing us to loop through its entries.
  for (const [key, value] of params.entries()) {
    queryParamsArray.push({ key: key, value: value });
  }

  return queryParamsArray;
}


export function titleCaseTableHeaders($thead, excludes = [], uppercase = [], lowercase = []) {
  $thead.find('th').each(function () {
    const key = jq(this).data('key');
    if (!key) return;

    // Skip excluded headers
    if (excludes.includes(key)) return;

    // Convert underscores to spaces for consistent formatting
    let formatted = key.replace(/_/g, ' ');

    // Check for uppercase or lowercase overrides
    if (uppercase.includes(key)) {
      formatted = formatted.toUpperCase();
    } else if (lowercase.includes(key)) {
      formatted = formatted.toLowerCase();
    } else {
      // Default: Title Case
      formatted = formatted.replace(/\b\w+/g, txt =>
        txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
      );
    }

    // ✅ Update only the label span inside the TH, not entire TH
    const $labelSpan = jq(this).find('span.' + key);
    if ($labelSpan.length) {
      $labelSpan.text(formatted);
    } else {
      // Fallback: if no span found, replace plain text
      jq(this).contents().filter(function () {
        return this.nodeType === Node.TEXT_NODE;
      }).first().replaceWith(formatted);
    }
  });
}

/**
 * Creates an HTML table from an array of data.
 *
 * @param {Array<Object>} data - The array of objects to populate the table. Each object's keys will be used as table headers, and its values as cell data.
 * @param {boolean} [includeSerial=true] - Whether to include a serial number column (#) at the beginning of each row. Defaults to true.
 * @param {boolean} [fixTableHead=true] - Whether to apply a "tbl-fixedhead" class to the table header for potential fixed positioning. Defaults to true.
 * @returns {{table: HTMLTableElement, thead: HTMLTableSectionElement, tbody: HTMLTableSectionElement, data: Array<Object>, tbl: {table: HTMLTableElement, thead: HTMLTableSectionElement, tbody: HTMLTableSectionElement}}|boolean} An object containing references to the created table elements and the original data, or `false` if the input data is invalid.
 */
export function createTable({
  data,
  includeSerial = false,
  fixTableHead = true,
  size = "small",
  colsToTotal = [],
  caption = null,
  parseAs = 'currency'
}) {
  // If no data or empty data is provided, return false.
  if (!data || data.length === 0) {
    console.warn("createTable: No data or empty data provided.");
    return false;
  }

  // Create table elements
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  // --- Create Table Header (thead) ---
  const headerRow = document.createElement("tr");

  // Add serial number column header if requested
  if (includeSerial) {
    const serialHeader = document.createElement("th");
    serialHeader.textContent = "#";
    serialHeader.className = "css-serial";
    headerRow.append(serialHeader);
  }

  // Get header keys from the first data object and build headers
  const headerKeys = [];
  for (const key in data[0]) {
    headerKeys.push(key);
    const th = document.createElement("th");
    th.innerHTML = key;
    th.className = "";
    th.dataset.key = key;
    headerRow.append(th);
  }

  if (caption) {
    let x = document.createElement('caption');
    jq(x).text(caption).addClass('fw-bold tbl-caption');
    table.appendChild(x);
  }

  thead.append(headerRow);
  table.append(thead);

  // --- Create Table Body (tbody) ---
  data.forEach((rowData, index) => {
    const bodyRow = document.createElement("tr");

    // Add serial number cell if requested
    if (includeSerial) {
      const serialCell = document.createElement("td");
      serialCell.textContent = index + 1;
      serialCell.className = "css-serial";
      bodyRow.append(serialCell);
    }

    // Populate cells with data from the current row object
    for (const key in rowData) {
      const td = document.createElement("td");
      td.innerHTML = rowData[key];
      td.dataset.key = key;
      td.dataset.value = rowData[key];
      bodyRow.append(td);
    }
    tbody.append(bodyRow);
  });

  table.append(tbody);

  // --- Apply Classes and Return ---
  if (typeof jq !== "undefined") {
    jq(table).addClass("table css-serial table-hover tbl-custom mb-2 caption-top");
    if (size) jq(table).addClass('table-sm');
    if (!includeSerial) jq(table).removeClass("css-serial");
    if (fixTableHead) jq(thead).addClass("tbl-fixed");
  } else {
    table.classList.add("table", "table-hover", "tbl-custom");
    if (size) table.classList.add("table-sm");
    if (includeSerial) table.classList.add("css-serial");
    if (fixTableHead) thead.classList.add("tbl-fixed");
  }

  let tfoot = null;
  if (colsToTotal.length) {
    tfoot = document.createElement('tfoot');
    const tr = document.createElement('tr');
    // create footer cells for each header key (same order)
    for (const key of headerKeys) {
      let td = document.createElement('td');
      td.dataset.key = key;
      td.dataset.value = '';
      tr.append(td);
    }
    tfoot.append(tr);
    table.append(tfoot);

    // Only process columns that exist in headerKeys (ignore others)
    colsToTotal.forEach(col => {
      if (!headerKeys.includes(col)) {
        console.warn(`createTableNew: col "${col}" not found in table headers — ignoring.`);
        return; // skip this column
      }

      // Compute total defensively
      const total = data.reduce((sum, item) => {
        // parseNumber should exist in your code; fall back to Number()
        let v = typeof parseNumber === 'function' ? parseNumber(item[col]) : Number(item[col]);
        // If parseNumber returned NaN or the value is undefined, treat as 0
        if (isNaN(v) || v === undefined || v === null) v = 0;
        return sum + v;
      }, 0);

      // find footer cell and populate it
      if (typeof jq !== "undefined") {
        const $cell = jq(tfoot).find(`[data-key="${col}"]`);
        if ($cell.length === 0) {
          // highly unlikely because of headerKeys check, but be defensive
          console.warn(`createTableNew: footer cell for "${col}" not found — skipping.`);
          return;
        }
        $cell[0].dataset.value = total;
        $cell.addClass('fw-bold text-end').text(parseAs === 'currency' ? parseCurrency(total) : parseLocals(total));
        jq(table).find(`[data-key="${col}"]`).addClass('text-end');
        jq(tbody).find(`[data-key="${col}"]`).each(function (i, e) {
          jq(this).text(parseLocals(this.textContent));
        });
      } else {
        // plain DOM fallback
        const footerCell = tfoot.querySelector(`[data-key="${col}"]`);
        if (!footerCell) {
          console.warn(`createTableNew: footer cell for "${col}" not found — skipping.`);
          return;
        }
        footerCell.dataset.value = total;
        footerCell.classList.add('fw-bold', 'text-end');
        footerCell.textContent = parseAs === 'currency' ? (typeof parseCurrency === 'function' ? parseCurrency(total) : total) : (typeof parseLocals === 'function' ? parseLocals(total) : total);
        // make body cells text-end and format them if parseLocals exists
        table.querySelectorAll(`[data-key="${col}"]`).forEach(td => td.classList.add('text-end'));
        tbody.querySelectorAll(`[data-key="${col}"]`).forEach(td => {
          if (typeof parseLocals === 'function') td.textContent = parseLocals(td.textContent);
        });
      }
    });
  }

  // Return an object containing references to the created elements
  return { table, tbody, thead, tfoot, data };
}

/**
 * Apply width to multiple table columns using data-key attributes.
 *
 * @param {jQuery} $table - jQuery table element
 * @param {Array} configs - Array of { key: string, width: string|number }
 */
export function setTableColumnWidths($table, configs = []) {
    if (!$table || !$table.length) return;

    configs.forEach(cfg => {
        const { key, width } = cfg;
        if (!key || !width) return;

        const $col = $table.find(`[data-key="${key}"]`);
        if ($col.length === 0) return;

        $col.each(function () {
            // Convert number to px if needed
            const w = typeof width === 'number' ? `${width}px` : width;

            this.style.setProperty('width', w, 'important');
            // this.style.setProperty('min-width', w, 'important'); // needed for table cells
        });
    });
}


export function progress(show = true) {
  const existing = document.querySelector(".processing");

  if (show) {
    // Only add the spinner if it doesn't already exist
    if (!existing) {
      const div = document.createElement("div");
      div.classList.add("processing");
      div.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
      document.body.appendChild(div);
    }
  } else {
    // Remove it if it exists
    if (existing) {
      existing.remove();
    }
  }
}

export const LS = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("LocalStorage set error:", e);
    }
  },

  get(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error("LocalStorage get error:", e);
      return null;
    }
  },

  del(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("LocalStorage delete error:", e);
    }
  },
};


export function initAdvancedTable(selector, options = {}, callBack = null) {
  const ns = ".advTable"; // namespace for events

  const settings = $.extend(
    {
      filterableKeys: [],
      persist: false,
      enableSorting: true,
      enableKeyboard: true
    },
    options
  );

  // Resolve selector to a jQuery table element in the DOM
  let $table;
  if (selector && selector.jquery) {
    $table = selector;
  } else if (selector instanceof Element) {
    $table = jq(selector);
  } else {
    $table = jq(selector);
  }

  if (!$table.length) {
    console.warn("initAdvancedTable: No table found for selector:", selector);
    return;
  }

  // Storage key for persistence
  const storageKey = settings.persist
    ? `tableState_${$table.attr("id") || Math.random().toString(36).substring(2)}`
    : null;

  // Unbind all previous namespaced events
  $table.find("thead th").off(ns);
  jq(document).off(ns);
  jq("#filterDropdown, #filterSearch, #filterItems, #applyFilter, #clearFilter, #cancelFilter, #selectAllFilter").off(ns);

  // State
  let filterState = {};
  let sortState = { key: null, asc: true };

  // Load saved state
  if (settings.persist && storageKey) {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved) {
      filterState = saved.filters || {};
      sortState = saved.sort || { key: null, asc: true };
    }
  }

  // Apply initial filters/sort
  applyFilters();
  if (sortState.key) applySort(sortState.key, sortState.asc, true);

  // Build headers with sort/filter UI
  $table.find("thead th").each(function () {
    const $th = jq(this);
    const key = $th.attr("data-key");

    // Skip if not filterable
    const keyObj = settings.filterableKeys.find(obj => obj.key === key);
    if (!keyObj) return;

    if (keyObj.width) {
      this.style.setProperty("width", keyObj.width, "important");
    }

    const $keyname = jq(
      `<span class="${key}" data-bs-toggle="tooltip" data-bs-title="${keyObj?.title}" title="${keyObj?.title}">${keyObj.value || key}</span>`
    );
    const $icon = jq(
      '<span class="ms-auto sort-icon d-print-none" role="button"><i class="bi bi-arrow-down-up"></i></span>'
    );
    const $filterBtn = jq(
      '<span class="text-secondary filter-toggle d-print-none" role="button"><i class="bi bi-funnel-fill"></i></span>'
    );

    const $div = jq("<div></div>")
      .addClass("d-flex jcb aic gap-2")
      .append($keyname, $icon, $filterBtn);

    $th.html($div);

    // Sorting
    if (settings.enableSorting) {
      $th.on("click" + ns, function (e) {
        if (jq(e.target).closest(".filter-toggle").length) return;
        const asc = sortState.key === key ? !sortState.asc : true;
        sortState = { key, asc };
        applySort(key, asc);
        if (settings.persist && storageKey) saveState();
        if (callBack) callBack();
      });
    }

    // Filter dropdown
    $filterBtn.on("click" + ns, function (e) {
      e.stopPropagation();
      openFilterDropdown($th, key);
    });
  });

  // Open filter dropdown
  function openFilterDropdown($th, key) {
    const $headersNow = $table.find("thead th");
    const columnIndex = $headersNow.index($th);
    const values = new Set();

    $table.find("tbody tr:visible").each(function () {
      const val = jq(this).children("td").eq(columnIndex).text().trim();
      values.add(val);
    });

    const sortedValues = [...values].sort();
    const $items = jq("#filterItems").empty();
    const current = filterState[key] || [];
    const selectAll = current.length === 0 || current.length === sortedValues.length;

    $items.append(`
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="selectAllFilter" ${selectAll ? "checked" : ""}>
                <label class="form-check-label fw-bold small" for="selectAllFilter">Select All</label>
            </div>
        `);

    sortedValues.forEach(val => {
      const id = `chk_${key}_${val.replace(/\s+/g, "_")}`;
      const checked = selectAll || current.includes(val);
      $items.append(`
                <div class="form-check">
                    <input class="form-check-input filter-check" type="checkbox" id="${id}" data-key="${key}" value="${val}" ${checked ? "checked" : ""}>
                    <label class="form-check-label small" for="${id}">${val}</label>
                </div>
            `);
    });

    jq("#filterSearch").val("").focus();
    jq("#filterDropdown").show().data("key", key);
    positionDropdown($th);
  }

  // Position dropdown
  function positionDropdown($th) {
    const offset = $th.offset();
    const tableRight = $table.offset().left + $table.width();
    const dropWidth = 250;
    const left =
      offset.left + dropWidth > tableRight
        ? offset.left - dropWidth + $th.outerWidth()
        : offset.left;
    jq("#filterDropdown").css({ top: offset.top + $th.outerHeight(), left });
  }

  // Apply sort
  function applySort(key, asc, suppressState = false) {
    const $headersNow = $table.find("thead th");
    const idx = $headersNow.filter(`[data-key="${key}"]`).index();
    const rows = $table.find("tbody tr").get();

    rows.sort((a, b) => {
      const A = jq(a).children("td").eq(idx).text().toUpperCase();
      const B = jq(b).children("td").eq(idx).text().toUpperCase();
      return asc ? (A > B ? 1 : A < B ? -1 : 0) : (A < B ? 1 : A > B ? -1 : 0);
    });

    jq.each(rows, (_, row) => $table.children("tbody").append(row));
    if (!suppressState && settings.persist && storageKey) saveState();
  }

  // Apply filters
  function applyFilters() {
    const $headersNow = $table.find("thead th");
    $table.find("tbody tr").each(function () {
      const $row = jq(this);
      let visible = true;
      for (let key in filterState) {
        const idx = $headersNow.filter(`[data-key="${key}"]`).index();
        const cellVal = $row.children("td").eq(idx).text().trim();
        if (filterState[key].length && !filterState[key].includes(cellVal)) {
          visible = false;
          break;
        }
      }
      $row.toggle(visible);
    });
  }

  // Save state
  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify({ filters: filterState, sort: sortState }));
  }

  // Global handlers
  jq(document).on("click" + ns, function () {
    jq("#filterDropdown").hide();
    jq("#filterItems").empty();
  });

  jq("#filterDropdown").on("click" + ns, e => e.stopPropagation());

  jq("#filterSearch").on("input" + ns, function () {
    const term = jq(this).val().toLowerCase();
    jq("#filterItems .form-check").each(function () {
      const label = jq(this).text().toLowerCase();
      if (!jq(this).find("input").attr("id").startsWith("selectAllFilter")) {
        jq(this).toggle(label.includes(term));
      }
    });
  });

  jq(document).on("change" + ns, "#selectAllFilter", function () {
    jq("#filterItems .filter-check:visible").prop("checked", this.checked);
  });

  jq("#clearFilter").on("click" + ns, function () {
    const key = jq("#filterDropdown").data("key");
    delete filterState[key];
    applyFilters();
    if (callBack) callBack();
    if (settings.persist && storageKey) saveState();
    jq("#filterDropdown").hide();
    jq("#filterItems").empty();
  });

  jq("#cancelFilter").on("click" + ns, function () {
    jq("#filterDropdown").hide();
    jq("#filterItems").empty();
  });

  jq("#applyFilter").on("click" + ns, function () {
    const key = jq("#filterDropdown").data("key");
    const $checked = jq(`.filter-check[data-key="${key}"]:checked:visible`);
    filterState[key] = $checked.map(function () {
      return jq(this).val();
    }).get();

    const totalOptions = jq(`.filter-check[data-key="${key}"]`).length;
    if (filterState[key].length === 0 || filterState[key].length === totalOptions) {
      delete filterState[key];
    }

    applyFilters();
    if (callBack) callBack();
    if (settings.persist && storageKey) saveState();
    jq("#filterDropdown").hide();
    jq("#filterItems").empty();
  });

  // Keyboard navigation for filter list
  if (settings.enableKeyboard) {
    jq(document).on("keydown" + ns, ".filter-check", function (e) {
      const $items = jq(".filter-check:visible");
      const index = $items.index(this);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        $items.eq((index + 1) % $items.length).focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        $items.eq((index - 1 + $items.length) % $items.length).focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        jq(this).prop("checked", !jq(this).prop("checked"));
      } else if (e.key === "Escape") {
        jq("#filterDropdown").hide();
        jq("#filterItems").empty();
      }
    });
  }

  return $table;
}

export function addColumnBorders($table, borderColor = '#ccc') {
  if (!$table || !$table.length) return; // Safety check

  // First remove any existing borders so it doesn't double-up
  $table.find('th, td').css('border-right', 'none');

  // Apply right border to all cells except the last in each row
  $table.find('tr').each(function () {
    jq(this).children('th:not(:last-child), td:not(:last-child)').css({
      'border-right': `1px solid ${borderColor}`
    });
  });

  // Ensure no outer table border
  $table.css('border-right', 'none');
}

export function between(num, range, inclusive = true) {
  if (!Array.isArray(range) || range.length !== 2) {
    throw new Error("Range must be an array with two numeric values.");
  }

  const [min, max] = range[0] < range[1] ? range : [range[1], range[0]];

  return inclusive ? (num >= min && num <= max) : (num > min && num < max);
}

export function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/* 
  this function requries npm exceljs 
  npm i exceljs
  then copy the exceljs.min.js and exceljs.min.js.map file in you local _libs folder from node_moules exceljs folder
  then apply it before you main script file
  <script src="/_libs/exceljs.min.js"></script>
*/
export async function table2Excel(tableId, filename = "data") {
  const table = document.querySelector(`#${tableId} table`);
  if (!table) {
    console.error(`Table with ID "${tableId}" not found.`);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  const rows = table.querySelectorAll("tr:not(.d-none)");

  // Determine visible columns from the first header row
  let visibleCols = [];
  for (let row of rows) {
    const headers = row.querySelectorAll("th");
    if (headers.length) {
      headers.forEach((th, index) => {
        if (!th.classList.contains("d-none") && getComputedStyle(th).display !== "none") {
          visibleCols.push(index);
        }
      });
      break;
    }
  }

  // Collect visible data
  let data = [];
  for (let row of rows) {
    let cells = row.querySelectorAll("th, td");
    let rowData = [];
    visibleCols.forEach((colIndex) => {
      const cell = cells[colIndex];
      if (!cell) return;
      let text = cell.innerText
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/ +/g, " ")
        .trim();
      rowData.push(text);
    });
    data.push(rowData);
  }


  // Add rows to worksheet
  data.forEach((row, rowIndex) => {
    const processedRow = row.map((cell) => {
      // Detect number
      if (!isNaN(cell) && cell.trim() !== "") {
        return Number(cell);
      }


      return cell; // Default: text
    });

    const excelRow = worksheet.addRow(processedRow);

    // Bold the first row (header)
    if (rowIndex === 0) {
      excelRow.font = { bold: true };
    }
  });


  // Freeze first row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto width for each column
  worksheet.columns.forEach((col) => {
    let maxLength = 10;
    col.eachCell?.((cell) => {
      const len = cell.value?.toString().length || 0;
      if (len > maxLength) maxLength = len;
    });
    col.width = maxLength + 2;
  });

  // Generate & trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createFormSmart({
  title,
  formId = 'myForm',
  formData = {},
  submitBtnText = 'Submit',
  showSubmitBtn = true,
  formWidth = '100%',
  colsbreak = 6,
  formMsg = '',
  floatingLabels = true,
}) {
  const formConfig = Fields[title];
  if (!formConfig) {
    console.error(`Form config for "${title}" not found.`);
    return '';
  }

  const visibleFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type !== 'hidden');
  const hiddenFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type === 'hidden');

  const hasFileField = visibleFields.some(([_, cfg]) => cfg.type === 'file');

  let formHtml = `<form id="${formId}" class="mb-0 needs-validation" novalidate ${hasFileField ? 'enctype="multipart/form-data"' : ''} style="width: ${formWidth}"><div class="row g-3">`;

  const twoCol = visibleFields.length > colsbreak;
  const colClass = twoCol ? 'col-md-6' : 'col-12';

  const escapeHtml = unsafe => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  for (const [name, configRaw] of visibleFields) {
    const config = { ...configRaw };
    let type = (config.type || 'text').toLowerCase();
    const id = `${formId}-${name}`;
    const requiredAttr = config.required ? 'required' : '';
    const multipleAttr = (config.multiple || (config.limit && config.limit > 1)) ? 'multiple' : '';
    const invalidfb = config?.invalidfb || '';
    const helperText = config?.message || '';
    const value = formData[name] ?? config.default ?? '';
    const titleAttr = config.required ? `title="${escapeHtml(config.label || name)} is required"` : '';
    const labelText = (config.label || name) + (config.required ? ' <span class="text-danger">*</span>' : '');

    // NEW: honor disabled and readonly/readOnly from config
    const disabledAttr = config.disabled ? 'disabled' : '';
    const readOnlyAttr = (config.readonly || config.readOnly) ? 'readonly' : '';

    let fieldHtml = '';

    const invalidHtml = invalidfb ? `<div class="invalid-feedback ${name}">${invalidfb}</div>` : `<div class="invalid-feedback ${name}"></div>`;
    const helperHtml = helperText ? `<div class="form-text">${helperText}</div>` : '';

    // ---------- Standard Inputs ----------
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
    }

    // ---------- TEXTAREA ----------
    else if (type === 'textarea') {
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
    }

    // ---------- SELECT ----------
    else if (type === 'select') {
      const buildOptions = (list = [], val = '') =>
        ['<option value=""></option>',
          ... (Array.isArray(list) ? list : []).map(opt => {
            const isObj = typeof opt === 'object' && opt !== null;
            const v = isObj ? opt.id : opt;
            const text = isObj ? opt.value : opt;
            const selected = (v == val) ? 'selected' : '';
            return `<option value="${escapeHtml(v)}" ${selected}>${escapeHtml(text)}</option>`;
          })
        ].join('');

      let options = buildOptions(config.options, value);

      if (config?.query) {
        setTimeout(() => {
          axios.post('/auth/advance/query', { key: 'na', values: [], qry: config.query })
            .then(res => {
              const arr = res.data?.data || [];
              if (arr.length) {
                const opts = buildOptions(arr, value);
                const sel = document.getElementById(id);
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
              <select class="form-select" id="${id}" name="${name}" ${requiredAttr} ${titleAttr} ${disabledAttr}>
                ${options}
              </select>
              <label for="${id}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${id}" class="form-label">${labelText}</label>
            <select class="form-select" id="${id}" name="${name}" ${requiredAttr} ${titleAttr} ${disabledAttr}>
              ${options}
            </select>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    }

    // ---------- RADIO ----------
    else if (type === 'radio') {
      const radios = (config.options || []).map(opt => {
        const checked = (opt == value) ? 'checked' : '';
        const safeOpt = escapeHtml(String(opt));
        return `
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="${name}" id="${id}-${safeOpt}" value="${safeOpt}" ${checked} ${requiredAttr} ${disabledAttr}>
            <label class="form-check-label" for="${id}-${safeOpt}">${safeOpt}</label>
          </div>`;
      }).join('');
      fieldHtml = `
        <div class="${colClass}">
          <label class="form-label d-block">${labelText}</label>
          ${radios}
          ${invalidHtml ? `<div class="invalid-feedback d-block ${name}">${invalidfb}</div>` : ''}
          ${helperHtml}
        </div>`;
    }

    // ---------- CHECKBOX ----------
    else if (type === 'checkbox') {
      const defaults = Array.isArray(value) ? value : [value];
      const checkboxes = (config.options || []).map(opt => {
        const checked = defaults.includes(opt) ? 'checked' : '';
        const safeOpt = escapeHtml(String(opt));
        return `
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="${name}[]" id="${id}-${safeOpt}" value="${safeOpt}" ${checked} ${requiredAttr} ${disabledAttr}>
            <label class="form-check-label" for="${id}-${safeOpt}">${safeOpt}</label>
          </div>`;
      }).join('');
      fieldHtml = `
        <div class="${colClass}">
          <label class="form-label d-block">${labelText}</label>
          ${checkboxes}
          ${invalidHtml ? `<div class="invalid-feedback d-block ${name}">${invalidfb}</div>` : ''}
          ${helperHtml}
        </div>`;
    }

    // ---------- FILE INPUTS ----------
    else if (type === 'file') {
      const fileSubType = config.fileType || 'any'; // images/pdf/any
      let acceptAttr = '';
      if (fileSubType === 'images') acceptAttr = 'accept="image/*"';
      else if (fileSubType === 'pdf') acceptAttr = 'accept=".pdf"';

      const limitVal = config.limit ? Number(config.limit) : 0;
      const sizeVal = config.size ? String(config.size).toLowerCase() : '';
      const dataLimit = limitVal ? `data-limit="${limitVal}"` : '';
      const dataSize = sizeVal ? `data-size="${escapeHtml(sizeVal)}"` : '';

      const actualMultipleAttr = (config.multiple || limitVal > 1) ? 'multiple' : '';

      let previewHtml = `<div class="mt-2" id="${id}-preview"></div>`;
      if (value) {
        const files = Array.isArray(value) ? value : [value];
        previewHtml = `<div class="mt-2" id="${id}-preview">` +
          files.map(file => {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
            if (isImage) return `<img src="${escapeHtml(file)}" class="img-thumbnail me-2 mb-2" style="max-width:150px;">`;
            else return `<small class="text-muted d-block"><a href="${escapeHtml(file)}" target="_blank">${escapeHtml(String(file).split('/').pop())}</a></small>`;
          }).join('') + `</div>`;
      }

      fieldHtml = `
        <div class="${colClass}">
          <label for="${id}" class="form-label">${labelText}</label>
          <input type="file" class="form-control" id="${id}" name="${name}" ${actualMultipleAttr} ${requiredAttr} ${acceptAttr} ${dataLimit} ${dataSize} ${titleAttr} ${disabledAttr}>
          ${invalidHtml}
          ${helperHtml}
          ${previewHtml}
        </div>`;
    }

    // ---------- FALLBACK ----------
    else {
      if (floatingLabels) {
        fieldHtml = `
          <div class="${colClass}">
            <div class="form-floating">
              <input type="text" class="form-control" id="${id}" name="${name}" value="${escapeHtml(value)}"
                placeholder="${escapeHtml(config.label || '')}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>
              <label for="${id}">${labelText}</label>
              ${invalidHtml}
              ${helperHtml}
            </div>
          </div>`;
      } else {
        fieldHtml = `
          <div class="${colClass}">
            <label for="${id}" class="form-label">${labelText}</label>
            <input type="text" class="form-control" id="${id}" name="${name}"
              value="${escapeHtml(value)}" ${requiredAttr} ${titleAttr} ${disabledAttr} ${readOnlyAttr}>
            ${invalidHtml}
            ${helperHtml}
          </div>`;
      }
    }

    formHtml += fieldHtml;
  }

  formHtml += `</div>`;

  // ---------- HIDDEN FIELDS ----------
  hiddenFields.forEach(([name, cfg]) => {
    const id = `${formId}-${name}`;
    const value = formData[name] ?? cfg.default ?? '';
    formHtml += `<input type="hidden" id="${id}" name="${name}" value="${escapeHtml(value)}">`;
  });

  const submitBtn = showSubmitBtn ? `<div class="mt-4 d-flex jcb aic"> <span class="me-auto" id="formMsg">${formMsg}</span> <button type="submit" class="btn btn-primary">${escapeHtml(submitBtnText)}</button></div>` : '';

  formHtml += `${submitBtn}</form><p class="mb-0 mt-4 small text-secondary">Fields marked with (<span class="text-danger">*</span>) are Required Fields!</p>`;

  // ---------- CLIENT-SIDE JS ----------
  setTimeout(() => {
    function parseSize(sizeStr) {
      if (!sizeStr) return 0;
      const units = { kb: 1024, mb: 1048576, gb: 1073741824 };
      const m = String(sizeStr).trim().toLowerCase().match(/^([\d.]+)\s*(kb|mb|gb)$/i);
      if (!m) return 0;
      return Math.round(parseFloat(m[1]) * (units[m[2]] || 1));
    }

    // File input change + preview + validation
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
          if (msgEl) msgEl.textContent = invalidfb || '';
        }
      });
    });

    // Bootstrap validation on submit
    const form = document.getElementById(formId);
    if (form) {
      form.addEventListener('submit', event => {
        document.querySelectorAll(`#${formId} input[type="file"][required]`).forEach(f => {
          const hasFiles = (f.files && f.files.length > 0);
          if (!hasFiles) {
            f.classList.add('is-invalid');
            const msgEl = f.parentElement.querySelector('.invalid-feedback');
            if (msgEl && !msgEl.textContent) msgEl.textContent = 'This field is required.';
            try { f.setCustomValidity('required'); } catch (e) { }
          } else {
            try { f.setCustomValidity(''); } catch (e) { }
          }
        });

        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add('was-validated');
      }, false);
    }
  }, 0);

  return formHtml;
}

/**
 * createFormSmart - builds a form (or modal containing a form) from Fields[title]
 *
 * If modal === true:
 *   - appends a bootstrap modal to body (backdrop static, keyboard false)
 *   - returns the jQuery modal object (so caller can call .data('bs.modal').show())
 *
 * If modal === false:
 *   - returns the HTML string for direct insertion into DOM
 */
export function createFormAdvance({
  title,
  formId = 'myForm',
  formData = {},
  submitBtnText = 'Submit',
  showSubmitBtn = true,
  formWidth = '100%',
  colsbreak = 6,
  formMsg = '',
  floatingLabels = true,
  modal = false, // default false
  modalTitle = 'Form Modal',
  modalSize = 'lg', // 'sm' | 'md' | 'lg' | 'xl'
  hideFooter = false, // like your showModal helper
  onSubmit = null, // callback(api)
}) {
  const formConfig = Fields[title];
  if (!formConfig) {
    console.error(`Form config for "${title}" not found.`);
    return '';
  }

  const visibleFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type !== 'hidden');
  const hiddenFields = Object.entries(formConfig).filter(([_, cfg]) => cfg.type === 'hidden');

  const hasFileField = visibleFields.some(([_, cfg]) => cfg.type === 'file');

  const twoCol = visibleFields.length > colsbreak;
  const colClass = twoCol ? 'col-md-6' : 'col-12';

  const escapeHtml = unsafe => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Build form inner HTML
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
    const blankOption = config.blank || false; //log(blankOption);
    const multiSelect = config.multiple ? 'multiple' : '';

    let fieldHtml = '';
    const invalidHtml = invalidfb ? `<div class="invalid-feedback ${name}">${invalidfb}</div>` : `<div class="invalid-feedback ${name}"></div>`;
    const helperHtml = helperText ? `<div class="form-text">${helperText}</div>` : '';

    // ---------- Standard Inputs ----------
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
    }

    // ---------- TEXTAREA ----------
    else if (type === 'textarea') {
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
    }

    // ---------- SELECT ----------
    else if (type === 'select') {
      // const buildOptions = (list = [], val = '') =>
      //   ['<option value=""></option>',
      //     ... (Array.isArray(list) ? list : []).map(opt => {
      //       const isObj = typeof opt === 'object' && opt !== null;
      //       const v = isObj ? opt.id : opt;
      //       const text = isObj ? opt.value : opt;
      //       const selected = (v == val) ? 'selected' : '';
      //       return `<option value="${escapeHtml(v)}" ${selected}>${escapeHtml(text)}</option>`;
      //     })
      //   ].join('');

      const buildOptions = (list = [], val = '', blankOption = false) => {
        const items = (Array.isArray(list) ? list : []).map(opt => {
          const isObj = typeof opt === 'object' && opt !== null;
          const v = isObj ? opt.id : opt;
          const text = isObj ? opt.value : opt;
          const selected = (v == val) ? 'selected' : '';
          return `<option value="${escapeHtml(v)}" ${selected}>${escapeHtml(text)}</option>`;
        });
        return (blankOption ? ['<option value=""></option>', ...items] : items).join('');
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
    }

    // ---------- RADIO ----------
    else if (type === 'radio') {
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
    }

    // ---------- CHECKBOX ----------
    else if (type === 'checkbox') {
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
    }

    // ---------- FILE ----------
    else if (type === 'file') {
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
    }

    // ---------- FALLBACK ----------
    else {
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

  const submitBtn = showSubmitBtn ? `<div class="mt-4 d-flex jcb aic"> <span class="me-auto" id="${formId}-formMsg">${formMsg}</span> <button type="submit" class="btn btn-primary">${escapeHtml(submitBtnText)}</button></div>` : '';
  formInnerHtml += `${submitBtn}</form><p class="mb-0 mt-4 small text-secondary">Fields marked with (<span class="text-danger">*</span>) are Required Fields!</p>`;

  // If not modal, return HTML string (same behaviour as before)
  if (!modal) {
    // inject client-side handlers after insertion by caller (the function still sets up timeouts for inputs)
    setTimeout(() => setupClientLogic(formId, onSubmit), 0);
    return formInnerHtml;
  }

  // ---------- Modal path (integrates ideas from your showModal) ----------
  // size class mapping
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
            <button type="button" class="btn btn-primary apply">${escapeHtml(submitBtnText)}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // create jQuery modal, append to body, init bootstrap modal, remove on hide
  const $modal = $(modalHtml);
  $('body').append($modal);

  // init bootstrap modal instance and store on jQuery data
  const bsModalInstance = new bootstrap.Modal($modal[0]);
  $modal.data('bs.modal', bsModalInstance);

  // ensure removal when hidden (same as your helper)
  $modal.on('hidden.bs.modal', function () {
    $modal.remove();
  });

  // wire the modal footer apply button to trigger form submit (and the close button will be default)
  $modal.find('.modal-footer .apply').on('click', function () {
    // trigger submit on the form inside modal
    const frm = $modal.find(`form#${formId}`)[0];
    if (frm) {
      frm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  });

  // prepare client-side logic for the newly appended form
  setTimeout(() => {
    setupClientLogic(formId, onSubmit, $modal);
  }, 0);

  // return the jQuery modal object for caller control (show / hide / manipulate)
  return $modal;
}

/**
 * setupClientLogic(formId, onSubmit, $modal)
 * - shared client-side logic (file preview, validation, gather values, submit handler).
 * - If $modal is provided, api.modal will be the bootstrap modal instance and api.close() will hide it.
 */
function setupClientLogic(formId, onSubmit, $modal = null) {
  // parse size helpers
  function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const units = { kb: 1024, mb: 1048576, gb: 1073741824 };
    const m = String(sizeStr).trim().toLowerCase().match(/^([\d.]+)\s*(kb|mb|gb)$/i);
    if (!m) return 0;
    return Math.round(parseFloat(m[1]) * (units[m[2]] || 1));
  }

  // File input change + preview + validation
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

  // locate form element (works modal or non-modal)
  const locatedForm = document.getElementById(formId) || (document.querySelector(`#${formId}-modal`) && document.querySelector(`#${formId}-modal form`));
  if (!locatedForm) return;

  // build gatherValues helper
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
        const baseName = name;
        if (el.checked) values[baseName] = el.value;
        else if (values[baseName] === undefined) values[baseName] = '';
        return;
      }

      if (el.tagName.toLowerCase() === 'select' && el.multiple) {
        const opts = Array.from(el.selectedOptions || []).map(o => o.value);
        values[name] = opts;
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

  // find bootstrap modal instance if provided
  let bsModalInstance = null;
  if ($modal && $modal.length) {
    try {
      bsModalInstance = $modal.data('bs.modal') || bootstrap.Modal.getOrCreateInstance($modal[0]);
      $modal.data('bs.modal', bsModalInstance);
    } catch (e) {
      bsModalInstance = null;
    }
  }

  // file required checks + submit handling
  locatedForm.addEventListener('submit', event => {
    // file required checks
    document.querySelectorAll(`#${formId} input[type="file"][required]`).forEach(f => {
      const hasFiles = (f.files && f.files.length > 0);
      if (!hasFiles) {
        f.classList.add('is-invalid');
        const msgEl = f.parentElement.querySelector('.invalid-feedback');
        if (msgEl && !msgEl.textContent) msgEl.textContent = 'This field is required.';
        try { f.setCustomValidity('required'); } catch (e) { }
      } else {
        try { f.setCustomValidity(''); } catch (e) { }
      }
    });

    // always prevent default as requested
    event.preventDefault();
    event.stopPropagation();

    // validation UI
    locatedForm.classList.add('was-validated');
    const valid = locatedForm.checkValidity();

    const values = gatherValues(locatedForm);
    const api = {
      values,
      form: locatedForm,
      event,
      isValid: valid,
      close: () => {
        if (bsModalInstance) try { bsModalInstance.hide(); } catch (e) { }
      },
      modal: bsModalInstance,
    };

    try {
      if (typeof onSubmit === 'function') onSubmit(api);
    } catch (err) {
      console.error('createFormSmart onSubmit error:', err);
    }
  }, false);

  // attach small helpers on form element for programmatic use
  try {
    locatedForm.__createFormSmart = locatedForm.__createFormSmart || {};
    locatedForm.__createFormSmart.getValues = () => gatherValues(locatedForm);
    locatedForm.__createFormSmart.modal = bsModalInstance;
    locatedForm.__createFormSmart.close = () => bsModalInstance ? bsModalInstance.hide() : null;
  } catch (e) { /* ignore */ }
}

// small helper used inside setupClientLogic to escape file names in previews
function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


export function createFlyoutMenu(triggerElement, items, handlerMap = {}, rowData = null) {
  // Remove old menu if exists
  const oldMenu = document.querySelector(".flyout-menu");
  if (oldMenu) oldMenu.remove();

  const menu = document.createElement("div");
  menu.className = "flyout-menu z-5";

  items.forEach(item => {
    const menuItem = document.createElement("div");
    menuItem.className = "flyout-menu-item";
    if (item?.class) menuItem.classList.add(item.class);
    if (item.id) menuItem.id = item.id;
    menuItem.textContent = item.key;

    menu.appendChild(menuItem);

    // --- Bind handler from handlerMap if exists ---
    if (item.id && handlerMap[item.id]) {
      jq(menuItem).off('click').on('click', () => {
        handlerMap[item.id](rowData, triggerElement, item); // pass trigger element & item
        menu.remove(); // remove menu after click
      });
    } else {
      // default: remove menu when clicked
      jq(menuItem).off('click').on('click', () => menu.remove());
    }
  });

  document.body.appendChild(menu);

  // --- Position menu intelligently ---
  const rect = triggerElement.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let top = rect.bottom;
  let left = rect.left;

  if (left + menuRect.width > window.innerWidth) {
    left = rect.right - menuRect.width;
  }
  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height;
  }

  menu.style.position = "absolute";
  menu.style.top = `${Math.max(0, top)}px`;
  menu.style.left = `${Math.max(0, left)}px`;

  // --- Close on outside click ---
  const handleClickOutside = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener("click", handleClickOutside);
    }
  };
  setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
}


export function inlineEditBox($tbody, colname, callback) {

  // Create flyout once
  if (!document.getElementById('inlineFlyout')) {
    const fly = document.createElement('div');
    fly.id = 'inlineFlyout';
    fly.className = 'card shadow p-2';
    fly.style.position = 'absolute';
    fly.style.zIndex = 9999;
    fly.style.display = 'none';
    fly.style.width = '350px';
    fly.innerHTML = `
      <textarea id="if_text" class="form-control mb-2" rows="4"></textarea>
      <div class="text-end">
        <button id="if_cancel" class="btn btn-secondary btn-sm me-1">Cancel</button>
        <button id="if_save" class="btn btn-primary btn-sm">Save</button>
      </div>
    `;
    document.body.appendChild(fly);
  }

  const fly = document.getElementById('inlineFlyout');
  const ta = document.getElementById('if_text');
  const btnCancel = document.getElementById('if_cancel');
  const btnSave = document.getElementById('if_save');

  let activeCell = null;
  let closeHandlers = [];

  // reposition flyout
  function position(cell) {
    const r = cell.getBoundingClientRect();
    const fw = fly.offsetWidth;
    const fh = fly.offsetHeight;
    const px = window.pageXOffset;
    const py = window.pageYOffset;

    let left = r.right + 8;
    if (left + fw > window.innerWidth - 10)
      left = r.left - fw - 8;

    let top = r.top + py;
    if (top + fh > window.innerHeight + py - 10)
      top = window.innerHeight + py - fh - 10;

    fly.style.left = left + 'px';
    fly.style.top = top + 'px';
  }

  // close flyout
  function close() {
    fly.style.display = 'none';
    activeCell = null;
    closeHandlers.forEach(fn => fn());
    closeHandlers = [];
  }

  // open flyout for a cell
  function open(cell) {
    activeCell = cell;

    ta.value = cell.dataset.value || cell.textContent.trim();
    fly.style.display = 'block';

    position(cell);
    ta.focus();

    // close when clicking outside
    const docHandler = (ev) => {
      if (!fly.contains(ev.target) && ev.target !== cell) close();
    };
    document.addEventListener('mousedown', docHandler);

    // close on scroll/resize
    const srHandler = () => position(cell);
    window.addEventListener('scroll', srHandler, true);
    window.addEventListener('resize', srHandler);

    closeHandlers.push(() => {
      document.removeEventListener('mousedown', docHandler);
      window.removeEventListener('scroll', srHandler, true);
      window.removeEventListener('resize', srHandler);
    });
  }

  // SAVE
  btnSave.onclick = () => {
    if (!activeCell) return;
    const value = ta.value.trim();

    // update UI
    activeCell.textContent = value;
    activeCell.dataset.value = value;

    // return value to caller
    callback(value, activeCell, jq(activeCell).closest('tr'));

    close();
  };

  // CANCEL
  btnCancel.onclick = close;

  // Attach click handler
  $tbody.on('click', `[data-key="${colname}"]`, function () {
    open(this);
  });
}