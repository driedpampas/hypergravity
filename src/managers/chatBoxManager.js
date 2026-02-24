const INPUT_SELECTORS = [
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea[placeholder*="Enter"]',
    'rich-textarea .ql-editor',
];

const CHAT_HISTORY_SELECTORS = [
    '[data-test-id="chat-history-container"]',
    'infinite-scroller.chat-history',
    '.chat-history',
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

function isGemInstructionsField(element) {
    if (!element) return false;

    const richTextarea = element.closest('rich-textarea');
    return (
        !!richTextarea?.classList.contains('instruction-rich-input') ||
        !!element.closest('.instructions-input-container') ||
        window.location.pathname.includes('/gems/')
    );
}

function getInputAnchorElement() {
    const input = getInputElement();
    if (!input) return null;

    return (
        input.closest('input-area-v2') ||
        input.closest('.input-area') ||
        input.closest('.text-input-field') ||
        input.closest('rich-textarea') ||
        input
    );
}

function getChatHistoryContainer() {
    for (const selector of CHAT_HISTORY_SELECTORS) {
        const el = document.querySelector(selector);
        if (el) return el;
    }

    return null;
}

function setInputText(text) {
    const el = getInputElement();
    if (!el) return;

    if (el.getAttribute('contenteditable') === 'true') {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
        text.split('\n').forEach((line) => {
            const p = document.createElement('p');
            if (line) {
                p.textContent = line;
            } else {
                p.appendChild(document.createElement('br'));
            }
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

function addTool(id, element, { align = 'left', weight = 50 } = {}) {
    const root = getToolsContainer();
    if (!root || !element) return false;

    const containerClass =
        align === 'right' ? 'hg-chat-tools-right' : 'hg-chat-tools-left';
    const container = root.querySelector(`.${containerClass}`) || root;

    const existing = container.querySelector(`[data-hg-tool-id="${id}"]`);
    if (existing) return false;

    element.setAttribute('data-hg-tool-id', id);
    element.setAttribute('data-hg-tool-weight', String(weight));

    const siblings = Array.from(
        container.querySelectorAll('[data-hg-tool-weight]')
    );

    const duplicate = siblings.find(
        (s) => Number(s.getAttribute('data-hg-tool-weight')) === weight
    );
    if (duplicate) {
        console.warn(
            `[hypergravity] Duplicate tool weight ${weight} on "${align}" side — ` +
                `"${id}" collides with "${duplicate.getAttribute('data-hg-tool-id')}". Appending after.`
        );
    }

    const insertBefore = siblings.find(
        (s) => Number(s.getAttribute('data-hg-tool-weight')) > weight
    );

    if (insertBefore) {
        container.insertBefore(element, insertBefore);
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
    getInputAnchorElement,
    getInputText,
    getChatHistoryContainer,
    isGemInstructionsField,
    setInputText,
    getToolsContainer,
    addTool,
    removeTool,
    hasTool,
};
