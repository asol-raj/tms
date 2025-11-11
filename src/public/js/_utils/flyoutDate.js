// Import the "engine" functions from our core file
import {
    showDatePicker,
    hideMenu,
    getActiveCell,
    setActiveCell,
    hideDatePicker
} from './flyoutCore.js';

/**
 * Attaches the editable date picker controls to a specific table.
 *
 * @param {HTMLTableElement} tableElement - The <table> element.
 * @param {string} dataKeyValue - The *value* of the data-key attribute (e.g., "date").
 * @param {Function} [callback] - (Optional) A function to run after a value is updated.
 */
function attachDateControls(tableElement, dataKeyValue, callback) {
    const tableBody = tableElement.querySelector("tbody");
    if (!tableBody) return;
    tableBody.querySelectorAll(`[data-key="${dataKeyValue}"]`).forEach(el => el.classList.add('role-btn'));
    
    tableBody.addEventListener("click", function(e) {
        const selector = `[data-key="${dataKeyValue}"]`;
        const cell = e.target.closest(selector);
        
        if (!cell) return;
        
        e.stopPropagation();
        
        if (cell === getActiveCell()) {
            hideDatePicker();
            setActiveCell(null);
            return;
        }
        
        // This is a new cell, so set it as active
        setActiveCell(cell); 
        
        // Make sure the *other* menu is hidden
        hideMenu(); 
        
        // Show the date picker
        showDatePicker(cell, callback);
    });
}

// Export this function as the default
export default attachDateControls;