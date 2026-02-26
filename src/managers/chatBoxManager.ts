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

type ChatInputElement = HTMLElement | HTMLTextAreaElement;

type AddToolOptions = {
    align?: 'left' | 'right';
    weight?: number;
};

/**
 * Finds the Gemini chat input element using a series of fallbacks.
 * @returns {HTMLElement|null}
 */
function getInputElement(): ChatInputElement | null {
    for (const sel of INPUT_SELECTORS) {
        const el = document.querySelector<ChatInputElement>(sel);
        if (el) return el;
    }
    return null;
}

/**
 * Returns the current text content of the Gemini chat input.
 * @returns {string}
 */
function getInputText(): string {
    const el = getInputElement();
    if (!el) return '';
    if (el instanceof HTMLTextAreaElement) {
        return el.value || '';
    }

    return el.innerText || el.textContent || '';
}

/**
 * Checks if the provided element belongs to a Gemini "Gem" instruction field rather than the main chat.
 * @param {HTMLElement} element - The element to check.
 * @returns {boolean}
 */
function isGemInstructionsField(element: HTMLElement | null): boolean {
    if (!element) return false;

    const richTextarea = element.closest('rich-textarea');
    return (
        !!richTextarea?.classList.contains('instruction-rich-input') ||
        !!element.closest('.instructions-input-container') ||
        window.location.pathname.includes('/gems/')
    );
}

/**
 * Finds the wrapping container for the chat input field, useful for UI injection.
 * @returns {HTMLElement|null}
 */
function getInputAnchorElement(): HTMLElement | null {
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

/**
 * Returns the main scrollable container for chat history.
 * @returns {HTMLElement|null}
 */
function getChatHistoryContainer(): HTMLElement | null {
    for (const selector of CHAT_HISTORY_SELECTORS) {
        const el = document.querySelector<HTMLElement>(selector);
        if (el) return el;
    }

    return null;
}

/**
 * Programmatically updates Gemini chat input text, handling both contenteditable and textarea modes.
 * @param {string} text - The text to set.
 */
function setInputText(text: string): void {
    const el = getInputElement();
    if (!el) return;

    if (el.getAttribute('contenteditable') === 'true') {
        while (el.firstChild) {
            el.removeChild(el.firstChild);
        }
        for (const line of text.split('\n')) {
            const p = document.createElement('p');
            if (line) {
                p.textContent = line;
            } else {
                p.appendChild(document.createElement('br'));
            }
            el.appendChild(p);
        }
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
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        if (el instanceof HTMLTextAreaElement) {
            el.value = text;
            el.focus();
            const len = el.value.length;
            el.setSelectionRange(len, len);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

/**
 * Gets the Hypergravity root for chat tools.
 * @returns {HTMLElement|null}
 */
function getToolsContainer() {
    return document.getElementById(TOOLS_ROOT_ID) || null;
}

/**
 * Inserts a tool into the chat tools bar with alignment and weighted ordering.
 * @param {string} id - Unique tool ID.
 * @param {HTMLElement} element - Tool element to insert.
 * @param {Object} options - Tool properties.
 * @param {'left'|'right'} [options.align='left'] - Which side to align to.
 * @param {number} [options.weight=50] - Ordering weight (lower is first).
 * @returns {boolean} True if successfully added.
 */
function addTool(
    id: string,
    element: HTMLElement,
    { align = 'left', weight = 50 }: AddToolOptions = {}
): boolean {
    const root = getToolsContainer();
    if (!root || !element) return false;

    const containerClass = align === 'right' ? 'hg-chat-tools-right' : 'hg-chat-tools-left';
    const container = root.querySelector(`.${containerClass}`) || root;

    const existing = container.querySelector(`[data-hg-tool-id="${id}"]`);
    if (existing) return false;

    element.setAttribute('data-hg-tool-id', id);
    element.setAttribute('data-hg-tool-weight', String(weight));

    const siblings = Array.from(container.querySelectorAll('[data-hg-tool-weight]'));

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

/**
 * Removes a tool by ID from the chat tools bar.
 * @param {string} id - The tool ID.
 * @returns {boolean} True if element was found and removed.
 */
function removeTool(id: string): boolean {
    const container = getToolsContainer();
    if (!container) return false;

    const el = container.querySelector(`[data-hg-tool-id="${id}"]`);
    if (el) {
        el.remove();
        return true;
    }
    return false;
}

/**
 * Checks if a tool is currently present in the chat tools bar.
 * @param {string} id - The tool ID.
 * @returns {boolean}
 */
function hasTool(id: string): boolean {
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
