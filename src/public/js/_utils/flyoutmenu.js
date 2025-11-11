// Import the "engine" functions from our core file
import {
    showMenu,
    hideDatePicker,
    getActiveCell,
    setActiveCell,
    hideMenu,
    updateCell // (updateCell isn't called here, but good to be aware of)
} from './flyoutCore.js';

const log = console.log;

/**
 * Attaches the editable flyout controls to a specific table.
 *
 * @param {HTMLTableElement} tableElement - The <table> element.
 * @param {string} dataKeyValue - The *value* of the data-key attribute (e.g., "status").
 * @param {Object} optionsObject - The key-value pairs for the options.
 * @param {Function} [callback] - (Optional) A function to run after a value is updated.
 */
function attachEditableControls(tableElement, dataKeyValue, optionsObject, callback) {
    const tableBody = tableElement.querySelector("tbody");
    if (!tableBody) return;

    const selector = `[data-key="${dataKeyValue}"]`; //console.log(selector);
    
    // --- NEW: Helper function to style a cell based on its value ---
    const styleCell = (cell) => {
        const value = cell.getAttribute('data-value'); //log(cell);
        // const value = cell.textContent; //log(value);
        if(!value){
            cell.className = 'text-end'
            cell.title = 'Select Option'
            cell.innerHTML = `
                <span class="d-block w-100 text-end small text-secondary rounded bg-light ps-5 pe-1">
                    <i class="bi bi-chevron-down"></i>
                </span>`;
        }
        
        // Reset styles first
        cell.style.backgroundColor = "";
        cell.style.color = "";
        cell.classList.add('role-btn', 'align-middle');
        // cell.innerHTML = '<i class="bi bi-chevron-down"></i>'

        if (!value || !optionsObject[value]) return; // No value or no matching option

        const optionData = optionsObject[value]; //log(optionData);

        if (typeof optionData === 'object' && optionData !== null) {
            // Apply styles
            if (optionData.bgColor) cell.style.backgroundColor = optionData.bgColor;
            if (optionData.textColor) cell.style.color = optionData.textColor;
        }
    };

    // --- 1. Run initial styling on all target cells ---
    tableBody.querySelectorAll(selector).forEach(styleCell);

    // --- 2. Attach the click listener (no change to this part) ---
    tableBody.addEventListener("click", function(e) {
        const cell = e.target.closest(selector);
        
        if (!cell) return;
        
        e.stopPropagation(); 
        
        if (cell === getActiveCell()) {
            hideMenu();
            setActiveCell(null);
            return;
        }
        
        setActiveCell(cell); 
        hideDatePicker(); 
        
        // This call now leads to the updated showMenu/updateCell
        showMenu(cell, optionsObject, callback);
    });

    // --- 3. (BONUS) Add a listener to re-style the table ---
    // If you reload your table data (e.g., in your 'loadData()' function),
    // you can trigger this event to re-apply all the colors.
    // Just call: tableElement.dispatchEvent(new Event('refresh-styles'));
    tableElement.addEventListener('refresh-styles', () => {
         tableBody.querySelectorAll(selector).forEach(styleCell);
    });
}

// Export this function as the default
export default attachEditableControls;