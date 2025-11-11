// --- 1. One-Time Setup for ALL Global Menus ---

// Create and export the options menu
export const flyoutMenu = document.createElement("div");
flyoutMenu.id = "global-flyout-menu";
flyoutMenu.className = "status-flyout-menu";
document.body.appendChild(flyoutMenu);

// Create and export the date picker and its input
export const datePickerFlyout = document.createElement("div");
datePickerFlyout.id = "global-date-picker-flyout";
datePickerFlyout.className = "date-picker-flyout";

export const globalDateInput = document.createElement("input");
globalDateInput.type = "date";
globalDateInput.id = "global-date-input";
datePickerFlyout.appendChild(globalDateInput);
document.body.appendChild(datePickerFlyout);

// --- 2. Shared State ---

// Keep track of the cell we are currently editing
let activeCell = null;
export const getActiveCell = () => activeCell;
export const setActiveCell = (cell) => { activeCell = cell; };

// --- 3. Shared Helper Functions ---

export function hideMenu() {
    flyoutMenu.style.display = "none";
}

export function hideDatePicker() {
    datePickerFlyout.style.display = "none";
}

export function updateCell_(cell, newValue, newText, callback) {
    if (!cell) return;

    cell.setAttribute("data-value", newValue);
    cell.textContent = newText;

    if (callback && typeof callback === 'function') {
        callback(cell, newValue);
    }

    // Don't hide here; let the caller decide
}

// Add a 'colors = {}' parameter at the end
export function updateCell(cell, newValue, newText, oldValue, oldText, callback, colors = {}) {
    if (!cell) return;

    // Set new data
    cell.setAttribute("data-value", newValue);
    cell.textContent = newText;

    // --- NEW: Apply cell styles ---
    // Reset styles first, in case the new option has no color
    cell.style.backgroundColor = "";
    cell.style.color = "";

    // Apply new styles if they exist
    if (colors.bgColor) {
        cell.style.backgroundColor = colors.bgColor;
    }
    if (colors.textColor) {
        cell.style.color = colors.textColor;
    }
    // --- End new part ---

    if (callback && typeof callback === 'function') {
        callback(cell, newValue, oldValue, newText, oldText);
    }
}

// --- 4. The "Show" Functions (The Core Logic) ---

export function showMenu_(cell, optionsObject, callback) {
    const currentValue = cell.getAttribute("data-value");

    flyoutMenu.innerHTML = ""; // Clear old options
    for (const [value, text] of Object.entries(optionsObject)) {
        const option = document.createElement("div");
        option.className = "status-flyout-option";
        option.textContent = text;
        option.setAttribute("data-value", value);

        if (value === currentValue) {
            option.classList.add("selected");
        }

        option.addEventListener("click", function () {
            updateCell(getActiveCell(), value, text, callback);
            hideMenu();
            setActiveCell(null);
        });
        flyoutMenu.appendChild(option);
    }

    // Positioning Logic
    const rect = cell.getBoundingClientRect();
    const menuHeight = flyoutMenu.offsetHeight; // This is a slight simplification; measuring first is more robust
    const viewportHeight = window.innerHeight;

    let topPosition;
    if ((rect.bottom + menuHeight) > viewportHeight && rect.top > menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight;
    } else {
        topPosition = rect.bottom + window.scrollY;
    }

    flyoutMenu.style.top = `${topPosition}px`;
    flyoutMenu.style.left = `${rect.left + window.scrollX}px`;
    flyoutMenu.style.width = `${rect.width + 50}px`;
    flyoutMenu.style.display = "block";
}

// This function replaces the old 'showMenu' in flyoutCore.js
export function showMenu__(cell, optionsObject, callback) {
    const currentValue = cell.getAttribute("data-value");
    const currentText = cell.textContent;

    flyoutMenu.innerHTML = "";

    for (const [value, optionData] of Object.entries(optionsObject)) {
        const option = document.createElement("div");
        option.className = "status-flyout-option";
        option.setAttribute("data-value", value);

        let displayText;
        let colorStyles = {}; // <-- NEW: Object to hold styles

        // Check if optionData is an object (new way) or string (old way)
        if (typeof optionData === 'object' && optionData !== null) {
            displayText = optionData.text;

            // Store colors for updateCell
            if (optionData.bgColor) colorStyles.bgColor = optionData.bgColor;
            if (optionData.textColor) colorStyles.textColor = optionData.textColor;

            // Apply styles to the flyout option itself
            if (colorStyles.bgColor) option.style.backgroundColor = colorStyles.bgColor;
            if (colorStyles.textColor) option.style.color = colorStyles.textColor;
        } else {
            // It's the old format (just a string)
            displayText = optionData;
        }

        option.textContent = displayText;

        if (value === currentValue) {
            option.classList.add("selected");
        }

        // --- UPDATED: Pass 'colorStyles' to updateCell ---
        option.addEventListener("click", function () {
            updateCell(getActiveCell(), value, displayText, currentValue, currentText, callback, colorStyles);

            hideMenu();
            setActiveCell(null);
        });

        flyoutMenu.appendChild(option);
    }

    // ... (rest of positioning logic is unchanged) ...
    const rect = cell.getBoundingClientRect();
    const menuHeight = flyoutMenu.offsetHeight;
    const viewportHeight = window.innerHeight;

    let topPosition;
    if ((rect.bottom + menuHeight) > viewportHeight && rect.top > menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight;
    } else {
        topPosition = rect.bottom + window.scrollY;
    }

    flyoutMenu.style.top = `${topPosition}px`;
    flyoutMenu.style.left = `${rect.left + window.scrollX}px`;
    flyoutMenu.style.width = `${rect.width}px`;
    flyoutMenu.style.display = "block";
}

export function showMenu(cell, optionsObject, callback) {
    const currentValue = cell.getAttribute("data-value");
    const currentText = cell.textContent;

    flyoutMenu.innerHTML = "";

    for (const [value, optionData] of Object.entries(optionsObject)) {
        const option = document.createElement("div");
        option.className = "status-flyout-option";
        option.setAttribute("data-value", value);

        let displayText;
        let colorStyles = {};

        if (typeof optionData === 'object' && optionData !== null) {
            displayText = optionData.text;

            if (optionData.bgColor) colorStyles.bgColor = optionData.bgColor;
            if (optionData.textColor) colorStyles.textColor = optionData.textColor;

            if (colorStyles.bgColor) option.style.backgroundColor = colorStyles.bgColor;
            if (colorStyles.textColor) option.style.color = colorStyles.textColor;
        } else {
            displayText = optionData;
        }

        option.textContent = displayText;

        if (value === currentValue) {
            option.classList.add("selected");
        }

        // --- THIS IS THE UPDATED PART ---
        option.addEventListener("click", function () {

            // Check if the special "clear" key (empty string) was clicked
            if (value === "") {
                // Call updateCell with empty values for text and colors
                updateCell(
                    getActiveCell(),
                    "",              // newValue (empty string)
                    "",              // newText (empty string)
                    currentValue,
                    currentText,
                    callback,
                    {}               // empty colors
                );
            } else {
                // Standard update logic for all other options
                updateCell(
                    getActiveCell(),
                    value,           // newValue
                    displayText,     // newText
                    currentValue,
                    currentText,
                    callback,
                    colorStyles      // colors
                );
            }

            hideMenu();
            setActiveCell(null);
        });
        // --- END OF UPDATED PART ---

        flyoutMenu.appendChild(option);
    }

    // Positioning Logic (Unchanged)
    const rect = cell.getBoundingClientRect();

    datePickerFlyout.style.visibility = "hidden";
    datePickerFlyout.style.display = "block";
    const menuHeight = flyoutMenu.offsetHeight;
    datePickerFlyout.style.display = "none";
    datePickerFlyout.style.visibility = "visible";

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let topPosition;

    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        topPosition = rect.top + window.scrollY - menuHeight;
    } else {
        topPosition = rect.bottom + window.scrollY;
    }

    flyoutMenu.style.top = `${topPosition}px`;
    flyoutMenu.style.left = `${rect.left + window.scrollX}px`;
    flyoutMenu.style.width = `${rect.width}px`;
    flyoutMenu.style.display = "block";
}

export function showDatePicker_(cell, callback) {
    const currentValue = cell.getAttribute("data-value");
    globalDateInput.value = currentValue;

    globalDateInput.onchange = null; // Remove old listener
    globalDateInput.onchange = () => {
        const newValue = globalDateInput.value;
        const newText = newValue;

        updateCell(getActiveCell(), newValue, newText, callback);

        hideDatePicker();
        setActiveCell(null);
    };

    // Positioning Logic
    const rect = cell.getBoundingClientRect();
    const pickerHeight = datePickerFlyout.offsetHeight;
    const viewportHeight = window.innerHeight;

    let topPosition;
    if ((rect.bottom + pickerHeight) > viewportHeight && rect.top > pickerHeight) {
        topPosition = rect.top + window.scrollY - pickerHeight;
    } else {
        topPosition = rect.bottom + window.scrollY;
    }

    datePickerFlyout.style.top = `${topPosition}px`;
    datePickerFlyout.style.left = `${rect.left + window.scrollX}px`;
    datePickerFlyout.style.display = "block";
    globalDateInput.focus();
}

// This function replaces the old 'showDatePicker' in flyoutCore.js
export function showDatePicker(cell, callback) {
    // 1. Get current values
    const currentValue = cell.getAttribute("data-value");
    const currentText = cell.textContent; // <-- Get old text

    globalDateInput.value = currentValue;
    globalDateInput.onchange = null; // Remove old listener

    // 2. Update the onchange handler
    globalDateInput.onchange = () => {
        const newValue = globalDateInput.value;
        const newText = newValue; // For dates, new value and new text are the same

        // --- 3. Use the updated updateCell call ---
        updateCell(
            getActiveCell(),
            newValue,
            newText,
            currentValue,  // Pass old value
            currentText,   // Pass old text
            callback,
            {}             // Pass empty color object
        );

        hideDatePicker();
        setActiveCell(null);
    };

    // --- Positioning Logic (Unchanged) ---
    const rect = cell.getBoundingClientRect();

    // Measure picker (This is the more robust way from our previous version)
    datePickerFlyout.style.visibility = "hidden";
    datePickerFlyout.style.display = "block";
    const pickerHeight = datePickerFlyout.offsetHeight;
    datePickerFlyout.style.display = "none";
    datePickerFlyout.style.visibility = "visible";

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let topPosition;
    if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
        // Flip: Position above cell
        topPosition = rect.top + window.scrollY - pickerHeight;
    } else {
        // Default: Position below cell
        topPosition = rect.bottom + window.scrollY;
    }

    datePickerFlyout.style.top = `${topPosition}px`;
    datePickerFlyout.style.left = `${rect.left + window.scrollX}px`;
    datePickerFlyout.style.display = "block";
    globalDateInput.focus();
}

// --- 5. Global "Click-Away" Listener ---
document.addEventListener("click", function (e) {
    const currentActiveCell = getActiveCell();
    if (!currentActiveCell) return;

    if (currentActiveCell.contains(e.target)) return;

    const isOutsideMenu = !flyoutMenu.contains(e.target);
    const isOutsideDatePicker = !datePickerFlyout.contains(e.target);

    if (isOutsideMenu && isOutsideDatePicker) {
        hideMenu();
        hideDatePicker();
        setActiveCell(null);
    }
});