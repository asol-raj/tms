/**
 * applySearchWithObserver
 * Reliable live search + highlight using MutationObserver to catch re-renders.
 *
 * @param {string} inputId        - selector for input (e.g. '#searchTask')
 * @param {Array}  data           - array of objects
 * @param {Array}  columns        - fields to search (e.g. ['title','description'])
 * @param {Function} callback     - function(filteredData) -> your setTable
 * @param {Object} options        - { wait=200, tableSelector='#dataTable', restoreOnInit=true }
 *
 * Returns controller: { detach(), runNow(query) }
 */
export default function applySearchWithObserver(inputId, data, columns = [], callback, options = {}) {
  const input = document.querySelector(inputId);
  if (!input) {
    console.warn('applySearchWithObserver: input not found', inputId);
    if (options.restoreOnInit !== false) callback(data || []);
    return { detach: () => {}, runNow: (q) => { callback(data || []); return data || []; } };
  }

  data = Array.isArray(data) ? data : [];
  const wait = typeof options.wait === 'number' ? options.wait : 200;
  const tableSelector = options.tableSelector || '#dataTable';
  const restoreOnInit = options.restoreOnInit !== false;

  // Debounce helper
  function debounce(fn, delay) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Escape for HTML
  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Determine the best text for matching/highlighting in a td element.
  // Prefer data-value (unless it's literal "null"), otherwise fall back to trimmed visible text.
  function getCellText(td) {
    if (!td) return '';
    const dv = td.getAttribute && td.getAttribute('data-value');
    if (dv !== null && dv !== undefined && String(dv).toLowerCase() !== 'null') {
      return String(dv);
    }
    // fallback: visible text (trimmed)
    return (td.textContent || '').trim();
  }

  // Highlight logic: use query to mark matches within each td[data-value] or td fallback
  function highlightMatches(containerSelector, query) {
    const root = document.querySelector(containerSelector);
    if (!root) return;

    // Restore original content: prefer data-value; if absent, keep current visible text
    root.querySelectorAll('td[data-value]').forEach(td => {
      const dv = td.getAttribute('data-value');
      if (dv !== null && dv !== undefined && String(dv).toLowerCase() !== 'null') {
        td.innerText = dv;
      } else {
        // If data-value is missing/invalid, leave visible text as-is (do not overwrite icons)
        td.innerText = td.textContent.trim();
      }
    });

    if (!query || !query.trim()) return;

    // Build safe regex for query
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'gi');

    // Candidate cells: prefer title/description data-key, else any td[data-value] or td
    let cells = Array.from(root.querySelectorAll('td[data-key="title"], td[data-key="description"]'));
    if (!cells.length) {
      cells = Array.from(root.querySelectorAll('td[data-value]'));
    }
    if (!cells.length) {
      cells = Array.from(root.querySelectorAll('td'));
    }

    cells.forEach(td => {
      const raw = getCellText(td);
      if (!raw || !regex.test(raw)) return;

      const safe = escapeHtml(raw);
      td.innerHTML = safe.replace(regex, match => `<mark class="highlight-mark">${match}</mark>`);
    });
  }

  // Simple filter (case-insensitive) over specified columns
  function filterData(query) {
    if (!query || !query.trim()) return data.slice();
    const q = String(query).trim().toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        // support nested path 'a.b'
        const val = (col && row[col] !== undefined) ? row[col] : (String(col).includes('.') ? col.split('.').reduce((o,k) => (o && o[k] !== undefined) ? o[k] : '', row) : '');
        const v = (val || '').toString().toLowerCase();
        return v.includes(q);
      });
    });
  }

  // MutationObserver: observes changes inside table container and triggers highlight once DOM updates
  let observer = null;
  function ensureObserver(query) {
    const root = document.querySelector(tableSelector);
    if (!root) return;

    // disconnect previous observer if any
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutationsList) => {
      // Debounce highlights slightly to allow any nested rendering to settle
      setTimeout(() => highlightMatches(tableSelector, query), 20);
    });

    observer.observe(root, { childList: true, subtree: true, characterData: false });
  }

  // Handler to run when input changes
  const handler = debounce(() => {
    const q = input.value || '';
    const filtered = filterData(q);

    // render
    try {
      callback(filtered);
    } catch (e) {
      console.error('applySearchWithObserver: callback failed', e);
    }

    // make observer watch changes and highlight after re-render
    ensureObserver(q);

    // Safety fallback: if table hasn't mutated after a short time, still run highlight
    setTimeout(() => highlightMatches(tableSelector, q), 150);
  }, wait);

  // Attach handler (avoid duplicates)
  if (input._applySearchWithObserverHandler) {
    input.removeEventListener('input', input._applySearchWithObserverHandler);
    input._applySearchWithObserverHandler = null;
  }
  input.addEventListener('input', handler);
  input._applySearchWithObserverHandler = handler;

  // Initial render if requested
  if (restoreOnInit) {
    try { callback(data.slice()); } catch (e) {}
    // set observer watching initial state
    ensureObserver('');
  }

  // Return controller for detach + manual run
  return {
    detach: () => {
      if (input._applySearchWithObserverHandler) {
        input.removeEventListener('input', input._applySearchWithObserverHandler);
        input._applySearchWithObserverHandler = null;
      }
      if (observer) { observer.disconnect(); observer = null; }
    },
    runNow: (query) => {
      const items = filterData(query);
      try { callback(items); } catch (e) {}
      // highlight immediately after run
      setTimeout(() => highlightMatches(tableSelector, query), 0);
      return items;
    }
  };
}
