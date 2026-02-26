type ChatInfo = {
    id: string;
    title: string;
    url: string;
};

/**
 * Generates an absolute Gemini URL for a given chat ID, preserving account context (e.g. /u/1/).
 * @param {string} [chatId=''] - The ID of the chat.
 * @returns {string} The full Gemini URL.
 */
export function getAccountAwareUrl(chatId = ''): string {
    const match = window.location.pathname.match(/^\/u\/(\d+)\//);
    const accountPath = match ? `/u/${match[1]}/app` : '/app';
    return `https://gemini.google.com${chatId ? `${accountPath}/${chatId}` : accountPath}`;
}

/**
 * Inspects DOM and URL to find metadata for the currently active chat.
 * @returns {Object|null} Chat info object containing id, title, and url, or null if not found.
 */
export function findActiveChatInfo(): ChatInfo | null {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const appIndex = pathParts.indexOf('app');
    const id = appIndex >= 0 ? pathParts[appIndex + 1] : null;

    if (!id || id.length < 6) return null;

    const explicitConversationTitle =
        document.querySelector('[data-test-id="conversation-title"]')?.textContent?.trim() ||
        document
            .querySelector('.conversation-title-container .conversation-title-column')
            ?.textContent?.trim();

    const titleFromHeader =
        document.querySelector('h1')?.textContent?.trim() ||
        document
            .querySelector('.conversation-title, .chat-title, [class*="conversation-title"]')
            ?.textContent?.trim();
    const titleFromDocument = document.title
        .replace(' - Gemini', '')
        .replace('Google Gemini', '')
        .trim();

    const titleCandidates = [explicitConversationTitle, titleFromHeader, titleFromDocument]
        .map((value) => value?.replace(/\s+/g, ' ').trim())
        .filter((value): value is string => Boolean(value));

    const title =
        titleCandidates.find((value) => {
            const normalized = value.toLowerCase();
            return (
                normalized !== 'google gemini' &&
                normalized !== 'gemini' &&
                normalized !== 'chats' &&
                normalized !== 'chat'
            );
        }) || `Chat from ${new Date().toLocaleDateString()}`;

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
export function inferChatInfoFromConversationRow(row: Element | null): ChatInfo | null {
    if (!row) return null;
    const link = row.querySelector<HTMLAnchorElement>('a[href*="/app/"]');
    if (!link) return null;

    const href = link.href;
    const id = href.split('/app/').pop()?.split(/[?#]/)[0];
    if (!id || id.length < 6 || !/^[a-z0-9_-]+$/i.test(id)) return null;

    const ariaLabel = (row.getAttribute('aria-label') || '').trim();
    const rowText = row.textContent
        ?.replace(/more_vert/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const hasConversationSemantics =
        row.classList.contains('conversation') ||
        row.classList.contains('conversation-list-item') ||
        row.getAttribute('data-test-id')?.includes('conversation') ||
        link.getAttribute('data-test-id')?.includes('conversation') ||
        Boolean(
            row.closest('.conversation, .conversation-list-item, [data-test-id*="conversation"]')
        );

    if (
        !hasConversationSemantics &&
        !row.querySelector('.conversation-title, [class*="conversation-title"]')
    ) {
        return null;
    }

    const title =
        row.querySelector('.conversation-title, [class*="title"]')?.textContent?.trim() ||
        ariaLabel ||
        rowText ||
        'Untitled Chat';

    const normalizedTitle = title.toLowerCase();
    if (
        normalizedTitle === 'hypergravity' ||
        normalizedTitle === 'settings' ||
        normalizedTitle === 'new chat' ||
        normalizedTitle === 'chats'
    ) {
        return null;
    }

    return { id, title: title.slice(0, 100), url: href };
}
