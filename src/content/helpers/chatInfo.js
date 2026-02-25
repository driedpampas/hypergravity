/**
 * Generates an absolute Gemini URL for a given chat ID, preserving account context (e.g. /u/1/).
 * @param {string} [chatId=''] - The ID of the chat.
 * @returns {string} The full Gemini URL.
 */
export function getAccountAwareUrl(chatId = '') {
    const match = window.location.pathname.match(/^\/u\/(\d+)\//);
    const accountPath = match ? `/u/${match[1]}/app` : '/app';
    return `https://gemini.google.com${chatId ? `${accountPath}/${chatId}` : accountPath}`;
}

/**
 * Inspects DOM and URL to find metadata for the currently active chat.
 * @returns {Object|null} Chat info object containing id, title, and url, or null if not found.
 */
export function findActiveChatInfo() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const appIndex = pathParts.indexOf('app');
    const id = appIndex >= 0 ? pathParts[appIndex + 1] : null;

    if (!id || id.length < 6) return null;

    const titleFromHeader =
        document.querySelector('h1')?.textContent?.trim() ||
        document.querySelector('[class*="title"]')?.textContent?.trim();
    const titleFromDocument = document.title
        .replace(' - Gemini', '')
        .replace('Google Gemini', '')
        .trim();

    const title =
        titleFromHeader ||
        (titleFromDocument && titleFromDocument !== 'Google Gemini'
            ? titleFromDocument
            : `Chat from ${new Date().toLocaleDateString()}`);

    return {
        id,
        title,
        url: getAccountAwareUrl(id),
    };
}

/**
 * Attempts to extract chat metadata from a conversation sidebar entry row.
 * @param {HTMLElement} row - The DOM element representing the conversation row.
 * @returns {Object|null} Chat info object or null.
 */
export function inferChatInfoFromConversationRow(row) {
    if (!row) return null;
    const link = row.querySelector('a[href*="/app/"]');
    if (!link) return null;

    const href = link.href;
    const id = href.split('/app/').pop()?.split(/[?#]/)[0];
    if (!id) return null;

    const title =
        row
            .querySelector('.conversation-title, [class*="title"]')
            ?.textContent?.trim() ||
        row.textContent
            ?.replace(/more_vert/gi, '')
            .replace(/\s+/g, ' ')
            .trim() ||
        'Untitled Chat';

    return { id, title: title.slice(0, 100), url: href };
}
