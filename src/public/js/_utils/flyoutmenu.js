// // Import the "engine" functions from our core file
// import {
//     showMenu,
//     hideDatePicker,
//     getActiveCell,
//     setActiveCell,
//     hideMenu,
//     updateCell // (updateCell isn't called here, but good to be aware of)
// } from './flyoutCore.js';

// const log = console.log;

// /**
//  * Attaches the editable flyout controls to a specific table.
//  *
//  * @param {HTMLTableElement} tableElement - The <table> element.
//  * @param {string} dataKeyValue - The *value* of the data-key attribute (e.g., "status").
//  * @param {Object} optionsObject - The key-value pairs for the options.
//  * @param {Function} [callback] - (Optional) A function to run after a value is updated.
//  */
// function attachEditableControls(tableElement, dataKeyValue, optionsObject, callback, flyout=true) {
//     const tableBody = tableElement.querySelector("tbody");
//     if (!tableBody) return;

//     const selector = `[data-key="${dataKeyValue}"]`; //console.log(selector);

//     // --- NEW: Helper function to style a cell based on its value ---
//     const styleCell = (cell) => {
//         const value = cell.getAttribute('data-value'); //log(cell);
//         // const value = cell.textContent; //log(value);
//         if(!value){
//             cell.className = 'text-end'
//             cell.title = 'Select Option'
//             cell.innerHTML = `
//                 <span class="d-block w-100 text-end small text-secondary rounded bg-light ps-5 pe-1">
//                     <i class="bi bi-chevron-down"></i>
//                 </span>`;
//         }

//         // Reset styles first
//         cell.style.backgroundColor = "";
//         cell.style.color = "";
//         cell.classList.add('role-btn', 'align-middle');
//         // cell.innerHTML = '<i class="bi bi-chevron-down"></i>'

//         if (!value || !optionsObject[value]) return; // No value or no matching option

//         const optionData = optionsObject[value]; //log(optionData);

//         if (typeof optionData === 'object' && optionData !== null) {
//             // Apply styles
//             if (optionData.bgColor) cell.style.backgroundColor = optionData.bgColor;
//             if (optionData.textColor) cell.style.color = optionData.textColor;
//         }
//     };

//     // --- 1. Run initial styling on all target cells ---
//     tableBody.querySelectorAll(selector).forEach(styleCell);

//     // --- 2. Attach the click listener (no change to this part) ---
//     tableBody.addEventListener("click", function(e) {
//         // will not show the flyout menu if false
//         if(!flyout) return;

//         const cell = e.target.closest(selector);

//         if (!cell) return;

//         e.stopPropagation(); 

//         if (cell === getActiveCell()) {
//             hideMenu();
//             setActiveCell(null);
//             return;
//         }

//         setActiveCell(cell); 
//         hideDatePicker(); 

//         // This call now leads to the updated showMenu/updateCell
//         showMenu(cell, optionsObject, callback);
//     });

//     // --- 3. (BONUS) Add a listener to re-style the table ---
//     // If you reload your table data (e.g., in your 'loadData()' function),
//     // you can trigger this event to re-apply all the colors.
//     // Just call: tableElement.dispatchEvent(new Event('refresh-styles'));
//     tableElement.addEventListener('refresh-styles', () => {
//          tableBody.querySelectorAll(selector).forEach(styleCell);
//     });
// }

// // Export this function as the default
// export default attachEditableControls;


// flyoutmenu.js — updated attachEditableControls with per-row/cell predicate
import {
    showMenu,
    hideDatePicker,
    getActiveCell,
    setActiveCell,
    hideMenu,
    updateCell
} from './flyoutCore.js';

const log = console.log;

/**
 * Attach editable flyout controls to a table.
 *
 * @param {HTMLTableElement} tableElement
 * @param {string} dataKeyValue - value of data-key attribute (e.g. "status")
 * @param {Object} optionsObject - options map
 * @param {Function} [callback] - called after value update: callback(cell, newValue, oldValue, newText, oldText)
 * @param {Function} [shouldShow] - optional predicate (cell, row) => boolean; return true to allow showing the flyout for this cell/row
 * @param {Boolean} [flyout=true] - global enable/disable
 */
function attachEditableControls(
    tableElement,
    dataKeyValue,
    optionsObject,
    callback,
    shouldShow = () => true,
    flyout = true
) {
    const tableBody = tableElement.querySelector("tbody");
    if (!tableBody) return;

    const selector = `[data-key="${dataKeyValue}"]`;

    // style a cell (and optionally mark non-editable)
    const styleCell = (cell) => {
        const value = cell.getAttribute('data-value');

        // reset
        cell.style.backgroundColor = "";
        cell.style.color = "";
        cell.classList.remove('no-flyout');
        cell.classList.add('role-btn', 'align-middle');

        if (!value) {
            cell.className = cell.className + ' text-end';
            cell.title = 'Select Option';
            cell.innerHTML = `
                <span class="d-block w-100 text-end small text-secondary rounded bg-light ps-5 pe-1">
                    <i class="bi bi-chevron-down"></i>
                </span>`;
        }

        if (!value || !optionsObject[value]) {
            // nothing else to style
        } else {
            const optionData = optionsObject[value];
            if (typeof optionData === 'object' && optionData !== null) {
                if (optionData.bgColor) cell.style.backgroundColor = optionData.bgColor;
                if (optionData.textColor) cell.style.color = optionData.textColor;
            }
        }

        // mark non-editable visually if predicate disallows it
        const row = cell.closest('tr');
        try {
            if (!shouldShow(cell, row)) {
                // add a CSS hook class so the cell looks disabled (you can style .no-flyout)
                cell.classList.add('no-flyout');
                // optionally make pointer events none so it feels unclickable
                cell.style.cursor = 'not-allowed';
            } else {
                cell.style.cursor = '';
                cell.classList.remove('no-flyout');
            }
        } catch (err) {
            // if predicate throws, default to allowed
            cell.classList.remove('no-flyout');
            cell.style.cursor = '';
            console.warn('shouldShow predicate threw:', err);
        }
    };

    // initial style pass
    tableBody.querySelectorAll(selector).forEach(styleCell);

    // click handler
    tableBody.addEventListener("click", function (e) {
        if (!flyout) return;

        const cell = e.target.closest(selector);
        if (!cell) return;

        // check predicate before doing anything
        const row = cell.closest('tr');
        try {
            if (!shouldShow(cell, row)) {
                // If you want to give subtle feedback, briefly flash or return silently
                // e.g. return; to silently ignore clicks on disallowed rows
                return;
            }
        } catch (err) {
            // If predicate throws, don't block the menu; log and continue
            console.warn('shouldShow predicate error:', err);
        }

        e.stopPropagation();

        if (cell === getActiveCell()) {
            hideMenu();
            setActiveCell(null);
            return;
        }

        setActiveCell(cell);
        hideDatePicker();

        showMenu(cell, optionsObject, callback);
    });

    // refresh-styles event to re-run the styling after you reload table data
    tableElement.addEventListener('refresh-styles', () => {
        tableBody.querySelectorAll(selector).forEach(styleCell);
    });
}

export default attachEditableControls;
