const TOP_BAR_SELECTOR = 'top-bar-actions';

function getTopBar() {
    return document.querySelector(TOP_BAR_SELECTOR) || null;
}

function ensureButton({ id, title, svg, onClick }) {
    const topBar = getTopBar();
    if (!topBar) return null;

    let button = document.getElementById(id);
    if (!button) {
        button = document.createElement('button');
        button.id = id;
        button.className = 'hg-header-btn';
        button.title = title;
        button.innerHTML = svg;
        button.addEventListener('click', onClick);
        topBar.appendChild(button);
    }

    if (button.parentElement !== topBar) {
        topBar.appendChild(button);
    }

    return button;
}

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
