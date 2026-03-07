import { inferChatInfoFromConversationRow } from '@shared/chat/chatInfo';
import { HIDDEN_CHAT_KEY_PREFIX } from '@utils/constants';
import { getAllIdbValues } from '@utils/idbStorage';

type SettingsShape = {
    hideChatsEnabled?: boolean;
    hideChatsKeepInaccessibleWhenDisabled?: boolean;
};

type HiddenChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type HiddenChatsManagerOptions = {
    getSettings: () => Promise<SettingsShape>;
};

type HiddenChatUpdate = {
    chatId: string;
    title?: string;
    enabled: boolean;
};

function normalizeTitle(value: string): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parseRecord(raw: unknown): HiddenChatRecord | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<HiddenChatRecord>;
    const chatId = String(candidate.chatId || '').trim();
    if (!chatId) return null;

    return {
        chatId,
        title: normalizeTitle(String(candidate.title || '')),
        enabled: Boolean(candidate.enabled),
        updatedAt: Number(candidate.updatedAt) || Date.now(),
    };
}

export function createHiddenChatsManager({ getSettings }: HiddenChatsManagerOptions) {
    let loaded = false;
    let loadingPromise: Promise<void> | null = null;
    const recordsByChatId = new Map<string, HiddenChatRecord>();

    async function ensureLoaded() {
        if (loaded) return;
        if (loadingPromise) {
            await loadingPromise;
            return;
        }

        loadingPromise = (async () => {
            const all = await getAllIdbValues();

            Object.entries(all).forEach(([key, value]) => {
                if (!key.startsWith(HIDDEN_CHAT_KEY_PREFIX)) return;
                const parsed = parseRecord(value);
                if (!parsed) return;
                recordsByChatId.set(parsed.chatId, parsed);
            });

            loaded = true;
        })();

        await loadingPromise;
        loadingPromise = null;
    }

    function applyExternalUpdate(update: HiddenChatUpdate) {
        const chatId = String(update?.chatId || '').trim();
        if (!chatId) return;

        const existing = recordsByChatId.get(chatId);
        const title = normalizeTitle(update.title || existing?.title || '');

        recordsByChatId.set(chatId, {
            chatId,
            title,
            enabled: Boolean(update.enabled),
            updatedAt: Date.now(),
        });
    }

    function clearHiddenRowMarkers() {
        document.querySelectorAll('[data-hg-hidden-chat]').forEach((row) => {
            row.removeAttribute('data-hg-hidden-chat');
        });
    }

    function refreshSidebarHiddenRows(shouldHideRows: boolean) {
        const rows = Array.from(
            document.querySelectorAll(
                '.conversation, .conversation-list-item, [class*="conversation-item"], [data-test-id*="conversation"]'
            )
        );

        rows.forEach((row) => {
            row.removeAttribute('data-hg-hidden-chat');

            if (!shouldHideRows) {
                return;
            }

            const info = inferChatInfoFromConversationRow(row);
            if (!info?.id) return;

            const record = recordsByChatId.get(info.id);
            if (!record?.enabled) return;

            row.setAttribute('data-hg-hidden-chat', '1');
        });
    }

    async function refresh() {
        await ensureLoaded();

        const settings = await getSettings();
        const hideChatsEnabled = settings.hideChatsEnabled !== false;
        const strictInaccessible = Boolean(settings.hideChatsKeepInaccessibleWhenDisabled);
        const shouldHideRows = hideChatsEnabled || strictInaccessible;

        if (!shouldHideRows) {
            clearHiddenRowMarkers();
            return;
        }

        refreshSidebarHiddenRows(true);
    }

    function destroy() {
        clearHiddenRowMarkers();
    }

    return {
        refresh,
        destroy,
        applyExternalUpdate,
    };
}
