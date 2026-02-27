import { CHAT_MEMORY_PREFIX } from '@features/memories/constants';
import type { MemoryEntry } from '@features/memories/types';
import { getAllIdbValues } from '@utils/idbStorage';

function extractChatIdFromPath(pathname: string): string | null {
    const pathParts = pathname.split('/').filter(Boolean);
    const appIndex = pathParts.indexOf('app');
    const id = appIndex >= 0 ? pathParts[appIndex + 1] : null;
    if (!id || id.length < 6) return null;
    return id;
}

function collectSidebarTitles(): Map<string, string> {
    const map = new Map<string, string>();
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/app/"]');

    for (const link of links) {
        const href = link.getAttribute('href') || link.href;
        const match = href.match(/\/app\/([^/?#]+)/i);
        const chatId = match?.[1]?.trim();
        if (!chatId || chatId.length < 6) continue;

        const title =
            link.getAttribute('aria-label')?.trim() ||
            link.textContent?.replace(/\s+/g, ' ').trim() ||
            '';
        if (!title) continue;

        map.set(chatId, title);
    }

    const activeChatId = extractChatIdFromPath(window.location.pathname);
    if (activeChatId) {
        const activeTitle =
            document.querySelector('[data-test-id="conversation-title"]')?.textContent?.trim() ||
            document.title.replace(' - Gemini', '').replace('Google Gemini', '').trim();

        if (activeTitle) {
            map.set(activeChatId, activeTitle);
        }
    }

    return map;
}

export async function fetchMemoryEntries(): Promise<MemoryEntry[]> {
    const allValues = await getAllIdbValues();
    const titlesByChatId = collectSidebarTitles();
    const entries: MemoryEntry[] = [];

    for (const [key, value] of Object.entries(allValues)) {
        if (!key.startsWith(CHAT_MEMORY_PREFIX)) continue;

        const chatId = key.slice(CHAT_MEMORY_PREFIX.length);
        if (!chatId) continue;

        const valueRecord = (value || {}) as Record<string, unknown>;
        const title =
            titlesByChatId.get(chatId) ||
            String(valueRecord.chatTitle || valueRecord.title || '').trim() ||
            `Chat ${chatId.slice(0, 12)}`;

        const updatedAt = Number(valueRecord.updatedAt || 0);
        entries.push({ chatId, title, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0 });
    }

    entries.sort((a, b) => b.updatedAt - a.updatedAt);
    return entries;
}
