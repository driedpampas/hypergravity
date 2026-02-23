const INPUT_SELECTORS = [
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[placeholder*="Enter"]',
    'rich-textarea .ql-editor',
];

const TOOLS_ROOT_ID = 'hypergravity-chat-tools-root';

function getInputElement() {
    for (const sel of INPUT_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}

function getInputText() {
    const el = getInputElement();
    return (el && (el.innerText || el.textContent || el.value)) || '';
}

function setInputText(text) {
    const el = getInputElement();
    if (!el) return;

    if (el.getAttribute('contenteditable') === 'true') {
        el.innerHTML = '';
        text.split('\n').forEach((line) => {
            const p = document.createElement('p');
            p.textContent = line || '';
            if (!line) p.innerHTML = '<br>';
            el.appendChild(p);
        });
        el.classList.remove('ql-blank');
        el.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        if (el.lastChild) {
            range.selectNodeContents(el.lastChild);
            range.collapse(false);
        } else {
            range.selectNodeContents(el);
            range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        el.value = text;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function getToolsContainer() {
    return document.getElementById(TOOLS_ROOT_ID) || null;
}

function addTool(id, element, { position = 'end' } = {}) {
    const container = getToolsContainer();
    if (!container || !element) return false;

    const existing = container.querySelector(`[data-hg-tool-id="${id}"]`);
    if (existing) return false;

    element.setAttribute('data-hg-tool-id', id);

    if (position === 'start') {
        container.prepend(element);
    } else {
        container.appendChild(element);
    }
    return true;
}

function removeTool(id) {
    const container = getToolsContainer();
    if (!container) return false;

    const el = container.querySelector(`[data-hg-tool-id="${id}"]`);
    if (el) {
        el.remove();
        return true;
    }
    return false;
}

function hasTool(id) {
    const container = getToolsContainer();
    if (!container) return false;
    return !!container.querySelector(`[data-hg-tool-id="${id}"]`);
}

export const chatBoxManager = {
    getInputElement,
    getInputText,
    setInputText,
    getToolsContainer,
    addTool,
    removeTool,
    hasTool,
};
