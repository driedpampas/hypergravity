import { useStorage } from '@hooks/useStorage';
import { CloseIcon, EyeOffIcon } from '@icons';
import { getAccountAwareUrl } from '@shared/chat/chatInfo';
import { DEFAULT_SETTINGS, HIDDEN_CHAT_KEY_PREFIX, SETTINGS_KEY } from '@utils/constants';
import { getAllIdbValues } from '@utils/idbStorage';
import { useEffect, useMemo, useState } from 'preact/hooks';
import './HiddenChatsModal.css';

type HiddenChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type HiddenChatsModalProps = {
    onClose: () => void;
};

function parseRecord(raw: unknown): HiddenChatRecord | null {
    if (!raw || typeof raw !== 'object') return null;

    const candidate = raw as Partial<HiddenChatRecord>;
    const chatId = String(candidate.chatId || '').trim();
    if (!chatId) return null;

    return {
        chatId,
        title: String(candidate.title || '').trim() || 'Untitled Chat',
        enabled: Boolean(candidate.enabled),
        updatedAt: Number(candidate.updatedAt) || 0,
    };
}

export function HiddenChatsModal({ onClose }: HiddenChatsModalProps) {
    const [settings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const [hiddenChats, setHiddenChats] = useState<HiddenChatRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loaded, setLoaded] = useState(false);

    const strictInaccessible =
        settings.hideChatsEnabled === false &&
        Boolean(settings.hideChatsKeepInaccessibleWhenDisabled);

    const loadHiddenChats = async () => {
        const all = await getAllIdbValues();

        const next = Object.entries(all)
            .filter(([key]) => key.startsWith(HIDDEN_CHAT_KEY_PREFIX))
            .map(([, value]) => parseRecord(value))
            .filter((record): record is HiddenChatRecord => Boolean(record?.enabled))
            .sort((a, b) => b.updatedAt - a.updatedAt);

        setHiddenChats(next);
        setLoaded(true);
    };

    useEffect(() => {
        void loadHiddenChats();

        const onHiddenUpdated = () => {
            void loadHiddenChats();
        };

        window.addEventListener('hg-hidden-chat-updated', onHiddenUpdated);

        return () => {
            window.removeEventListener('hg-hidden-chat-updated', onHiddenUpdated);
        };
    }, []);

    const filteredChats = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return hiddenChats;

        return hiddenChats.filter((chat) => {
            return (
                chat.title.toLowerCase().includes(normalizedSearch) ||
                chat.chatId.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [hiddenChats, searchTerm]);

    const openHiddenChat = (chatId: string) => {
        if (strictInaccessible) return;
        window.location.href = getAccountAwareUrl(chatId);
        onClose();
    };

    return (
        // biome-ignore lint/a11y/useSemanticElements: it's a dialog.
        <div
            class="hg-dialog-overlay"
            role="button"
            tabIndex={0}
            aria-label="Close hidden chats dialog"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <div class="hg-hidden-chats-modal" role="dialog" aria-modal="true">
                <div class="hg-hidden-chats-header">
                    <div class="hg-hidden-chats-title-wrap">
                        <EyeOffIcon class="hg-hidden-chats-title-icon" width="18" height="18" />
                        <h2>Hidden Chats</h2>
                    </div>
                    <button
                        class="hg-hidden-chats-close"
                        type="button"
                        aria-label="Close hidden chats"
                        onClick={onClose}
                    >
                        <CloseIcon width="18" height="18" />
                    </button>
                </div>

                <div class="hg-hidden-chats-body">
                    <input
                        class="hg-hidden-chats-search"
                        type="search"
                        placeholder="Search hidden chats"
                        value={searchTerm}
                        onInput={(event) => setSearchTerm(event.currentTarget.value)}
                        disabled={strictInaccessible}
                    />

                    {strictInaccessible ? (
                        <div class="hg-hidden-chats-empty">
                            Hidden chat access is disabled by settings.
                        </div>
                    ) : !loaded ? (
                        <div class="hg-hidden-chats-empty">Loading hidden chats...</div>
                    ) : filteredChats.length === 0 ? (
                        <div class="hg-hidden-chats-empty">No hidden chats found.</div>
                    ) : (
                        <div class="hg-hidden-chats-list">
                            {filteredChats.map((chat) => (
                                <button
                                    key={chat.chatId}
                                    class="hg-hidden-chats-item"
                                    type="button"
                                    onClick={() => openHiddenChat(chat.chatId)}
                                >
                                    <span class="hg-hidden-chats-item-title">{chat.title}</span>
                                    <span class="hg-hidden-chats-item-id">{chat.chatId}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
