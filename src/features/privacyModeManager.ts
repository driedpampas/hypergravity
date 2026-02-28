import { findActiveChatInfo, inferChatInfoFromConversationRow } from '@shared/chat/chatInfo';
import { PRIVACY_CHAT_KEY_PREFIX } from '@utils/constants';
import { getAllIdbValues, setIdbValue } from '@utils/idbStorage';

type SettingsShape = {
    privacyModeEnabled?: boolean;
    privacyBlurEverything?: boolean;
};

type PrivacyChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type PrivacyModeManagerOptions = {
    getSettings: () => Promise<SettingsShape>;
};

type PrivacyChatUpdate = {
    chatId: string;
    title?: string;
    enabled: boolean;
};

function normalizeTitle(value: string): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPrivacyChatKey(chatId: string): string {
    return `${PRIVACY_CHAT_KEY_PREFIX}${chatId}`;
}

function parseRecord(raw: unknown): PrivacyChatRecord | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<PrivacyChatRecord>;
    const chatId = String(candidate.chatId || '').trim();
    if (!chatId) return null;

    return {
        chatId,
        title: normalizeTitle(String(candidate.title || '')),
        enabled: Boolean(candidate.enabled),
        updatedAt: Number(candidate.updatedAt) || Date.now(),
    };
}

export function createPrivacyModeManager({ getSettings }: PrivacyModeManagerOptions) {
    let loaded = false;
    let loadingPromise: Promise<void> | null = null;
    const recordsByChatId = new Map<string, PrivacyChatRecord>();

    async function ensureLoaded() {
        if (loaded) return;
        if (loadingPromise) {
            await loadingPromise;
            return;
        }

        loadingPromise = (async () => {
            const all = await getAllIdbValues();

            Object.entries(all).forEach(([key, value]) => {
                if (!key.startsWith(PRIVACY_CHAT_KEY_PREFIX)) return;
                const parsed = parseRecord(value);
                if (!parsed) return;
                recordsByChatId.set(parsed.chatId, parsed);
            });

            loaded = true;
        })();

        await loadingPromise;
        loadingPromise = null;
    }

    async function syncActiveChatRecord() {
        const active = findActiveChatInfo();
        if (!active?.id) return;

        const title = normalizeTitle(active.title);
        const existing = recordsByChatId.get(active.id);
        const enabled = Boolean(existing?.enabled);

        if (existing && existing.enabled === enabled && existing.title === title) {
            return;
        }

        const nextRecord: PrivacyChatRecord = {
            chatId: active.id,
            title,
            enabled,
            updatedAt: Date.now(),
        };

        recordsByChatId.set(active.id, nextRecord);
        await setIdbValue(getPrivacyChatKey(active.id), nextRecord);
    }

    function applyActiveChatPrivacyClass(enabled: boolean) {
        document.body.classList.toggle('hg-privacy-mode-enabled', enabled);
    }

    function applyExternalUpdate(update: PrivacyChatUpdate) {
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

    function refreshSidebarPrivacyMarkers(blurEverything: boolean) {
        const rows = Array.from(
            document.querySelectorAll(
                '.conversation, .conversation-list-item, [class*="conversation-item"], [data-test-id*="conversation"]'
            )
        );

        rows.forEach((row) => {
            row.removeAttribute('data-hg-private-chat');
            row.querySelectorAll('[data-hg-private-title="1"]').forEach((el) => {
                el.removeAttribute('data-hg-private-title');
            });

            const info = inferChatInfoFromConversationRow(row);
            if (!info?.id) return;

            if (!blurEverything) {
                const record = recordsByChatId.get(info.id);
                if (!record?.enabled) return;
            }

            row.setAttribute('data-hg-private-chat', '1');
            const titleEl = row.querySelector(
                '.conversation-title, [class*="conversation-title"], [class*="title"]'
            );

            if (titleEl instanceof HTMLElement) {
                titleEl.setAttribute('data-hg-private-title', '1');
            }
        });
    }

    function refreshActiveTitleMarkers(shouldBlur: boolean) {
        const titleElements = Array.from(
            document.querySelectorAll(
                [
                    '[data-test-id="conversation-title"]',
                    '.conversation-title-container .conversation-title-column',
                ].join(', ')
            )
        ).filter((node): node is HTMLElement => node instanceof HTMLElement);

        titleElements.forEach((element) => {
            if (shouldBlur) {
                element.setAttribute('data-hg-private-title', '1');
            } else {
                element.removeAttribute('data-hg-private-title');
            }
        });
    }

    async function refresh() {
        await ensureLoaded();
        const settings = await getSettings();
        await syncActiveChatRecord();

        const active = findActiveChatInfo();
        const activePrivacyEnabled = Boolean(active?.id && recordsByChatId.get(active.id)?.enabled);

        applyActiveChatPrivacyClass(activePrivacyEnabled);
        refreshSidebarPrivacyMarkers(Boolean(settings.privacyBlurEverything));
        refreshActiveTitleMarkers(activePrivacyEnabled);
    }

    function destroy() {
        document.querySelectorAll('[data-hg-private-chat]').forEach((row) => {
            row.removeAttribute('data-hg-private-chat');
        });

        document.querySelectorAll('[data-hg-private-title="1"]').forEach((el) => {
            el.removeAttribute('data-hg-private-title');
        });
    }

    return {
        refresh,
        destroy,
        applyExternalUpdate,
    };
}
