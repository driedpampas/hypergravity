import { render } from 'preact';

const TOP_BAR_SELECTOR = 'top-bar-actions';

/**
 * Finds the Gemini top bar container for tool injection.
 * @returns {HTMLElement|null}
 */
function getTopBar() {
    return document.querySelector(TOP_BAR_SELECTOR) || null;
}

/**
 * Ensures a button exists in the top bar, creating it if necessary.
 * @param {Object} options - Button configuration.
 * @param {string} options.id - Button ID.
 * @param {string} options.title - Tooltip title.
 * @param {string} options.svg - SVG markup for the icon.
 * @param {*} options.iconVNode - Preact VNode for the icon.
 * @param {Function} options.onClick - Click handler.
 * @returns {HTMLElement|null} The button element.
 */
function ensureButton({ id, title, svg, iconVNode, onClick }) {
    const topBar = getTopBar();
    if (!topBar) return null;

    let button = document.getElementById(id);
    if (!button) {
        button = document.createElement('button');
        button.id = id;
        button.className = 'hg-header-btn';
        button.title = title;

        if (iconVNode) {
            render(iconVNode, button);
        } else if (svg) {
            const parser = new DOMParser();
            const docHtml = parser.parseFromString(svg, 'text/html');
            Array.from(docHtml.body.childNodes).forEach((node) => {
                button.appendChild(node);
            });
        }

        button.addEventListener('click', onClick);
        topBar.appendChild(button);
    }

    if (button.parentElement !== topBar) {
        topBar.appendChild(button);
    }

    return button;
}

/**
 * Injects a tool into the top bar container at a specified position.
 * @param {string} id - Tool identifier.
 * @param {HTMLElement} element - Tool element.
 * @param {Object} options - Injection options.
 * @param {'start'|'end'} [options.position='end'] - Side of the bar.
 * @returns {boolean}
 */
function addTool(id, element, { position = 'end' } = {}) {
    const topBar = getTopBar();
    if (!topBar || !element) return false;

    const existing = topBar.querySelector(`[data-hg-tool-id="${id}"]`);
    if (existing) return false;

    element.setAttribute('data-hg-tool-id', id);

    if (position === 'start') {
        topBar.prepend(element);
    } else {
        topBar.appendChild(element);
    }
    return true;
}

/**
 * Removes a tool by ID from the top bar.
 * @param {string} id - The tool identifier.
 * @returns {boolean}
 */
function removeTool(id) {
    const topBar = getTopBar();
    if (!topBar) return false;

    const el = topBar.querySelector(`[data-hg-tool-id="${id}"]`);
    if (el) {
        el.remove();
        return true;
    }
    return false;
}

/**
 * Checks if a tool exists in the top bar.
 * @param {string} id
 * @returns {boolean}
 */
function hasTool(id) {
    const topBar = getTopBar();
    if (!topBar) return false;
    return !!topBar.querySelector(`[data-hg-tool-id="${id}"]`);
}

export const topBarManager = {
    getTopBar,
    ensureButton,
    addTool,
    removeTool,
    hasTool,
};
