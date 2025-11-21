export function applySearch(inputId, data, columns = [], callback, options = {}) {
  const input = document.querySelector(inputId);
  if (!input) {
    console.warn('Search input not found:', inputId);
    return;
  }

  const wait = options.wait || 200; // debounce ms
  const tableSelector = options.tableSelector || '#dataTable';

  // --- debounce ---------------------------------------------------------
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // --- highlight --------------------------------------------------------
  function highlightMatches(query) {
    const root = document.querySelector(tableSelector);
    if (!root) return;

    // restore originals from data-value
    root.querySelectorAll('td[data-value]').forEach(td => {
      // td.innerText = td.getAttribute('data-value') || '';
      const raw = td.getAttribute('data-value');
      if (raw !== null && raw !== undefined && raw !== "null") {
        td.innerText = raw;
      } else {
        // fallback to visible text (ignoring icons, hidden elements)
        td.innerText = td.textContent.trim();
      }
    });

    if (!query || !query.trim()) return;

    // build safe regex
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(esc, 'gi');

    // highlight inside all matching cells
    root.querySelectorAll('td[data-value]').forEach(td => {
      const raw = td.getAttribute('data-value') || '';
      if (!regex.test(raw)) return;

      const safe = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // const safe = escapeHtml(text);
      td.innerHTML = safe.replace(regex, m => `<mark class="highlight-mark">${m}</mark>`);
    });
  }

  // --- filtering --------------------------------------------------------
  function filterData(query) {
    if (!query || !query.trim()) return data;

    const q = query.trim().toLowerCase();

    return data.filter(row => {
      return columns.some(col => {
        const value = (row[col] || '').toString().toLowerCase();
        return value.includes(q);
      });
    });
  }

  // --- main search handler ----------------------------------------------
  const run = debounce(() => {
    const q = input.value;
    const filtered = filterData(q);

    callback(filtered);

    // highlight after table is rendered
    setTimeout(() => highlightMatches(q), 0);
  }, wait);

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // attach live search
  input.removeEventListener('input', run); // prevent duplicates
  input.addEventListener('input', run);

  // initial render
  callback(data);
}
