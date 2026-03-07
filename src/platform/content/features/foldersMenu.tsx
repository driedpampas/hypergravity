import {
    BlurOffIcon,
    BlurOnIcon,
    CheckIcon,
    CloseIcon,
    EyeIcon,
    EyeOffIcon,
    FolderAddIcon,
} from '@icons';
import { inferChatInfoFromConversationRow } from '@shared/chat/chatInfo';
import { getStorageValue, setStorageValue } from '@utils/browserEnv';
import {
    DEFAULT_SETTINGS,
    FOLDERS_KEY,
    HIDDEN_CHAT_KEY_PREFIX,
    PRIVACY_CHAT_KEY_PREFIX,
    SETTINGS_KEY,
} from '@utils/constants';
import {
    normalizeFoldersData,
    type StoredChat,
    type StoredFolder,
    withUpdatedFolders,
} from '@utils/foldersData';
import { getIdbValue, setIdbValue } from '@utils/idbStorage';
import { render } from 'preact';
import { useState } from 'preact/hooks';

type PrivacyChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type HiddenChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type ChatInfo = {
    id: string;
    title: string;
    url: string;
};

type FolderView = StoredFolder & { __depth: number };

type FolderSelectModalProps = {
    chatInfo: ChatInfo;
    folders: StoredFolder[];
    initiallySelected: Set<string>;
    onClose: () => void;
    onSave: (selected: Set<string>) => void | Promise<void>;
};

type FoldersMenuManagerOptions = {
    showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
    findActiveChatInfo: () => ChatInfo | null;
    getAccountAwareUrl: (chatId?: string) => string;
};

function FolderSelectModal({
    chatInfo,
    folders,
    initiallySelected,
    onClose,
    onSave,
}: FolderSelectModalProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(initiallySelected));

    const flattenFolders = (parentId: string | null = null, depth = 0): FolderView[] => {
        const children = folders.filter(
            (folder) => (folder.parentId || null) === (parentId || null)
        );

        return children.flatMap((folder) => [
            { ...folder, __depth: depth },
            ...flattenFolders(folder.id, depth + 1),
        ]);
    };

    const orderedFolders = flattenFolders(null, 0);

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    return (
        <div class="hg-folder-select-modal">
            <div class="hg-folder-select-header">
                <h3>Add to Folder</h3>
                <button
                    class="hg-folder-select-close"
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                >
                    <CloseIcon />
                </button>
            </div>
            <div class="hg-folder-select-subtitle">
                Manage folders for: <strong>{chatInfo.title}</strong>
            </div>
            <div class="hg-folder-select-list">
                {orderedFolders.map((folder) => (
                    <button
                        key={folder.id}
                        class="hg-folder-select-item"
                        onClick={() => toggle(folder.id)}
                        type="button"
                    >
                        <span class="hg-folder-select-check">
                            {selected.has(folder.id) && <CheckIcon width="16" height="16" />}
                        </span>
                        <span
                            class="hg-folder-select-name"
                            style={{ paddingLeft: `${folder.__depth * 14}px` }}
                        >
                            {folder.__depth > 0 ? '↳ ' : ''}
                            {folder.name}
                        </span>
                        <span class="hg-folder-select-count">{(folder.chats || []).length}</span>
                    </button>
                ))}
            </div>
            <div class="hg-folder-select-footer">
                <button
                    class="hg-folder-select-save"
                    type="button"
                    onClick={() => onSave(selected)}
                >
                    Done
                </button>
            </div>
        </div>
    );
}

export function createFoldersMenuManager({
    showToast,
    findActiveChatInfo,
    getAccountAwareUrl,
}: FoldersMenuManagerOptions) {
    let lastClickedChatInfo: ChatInfo | null = null;

    const getPrivacyChatKey = (chatId: string) => `${PRIVACY_CHAT_KEY_PREFIX}${chatId}`;
    const getHiddenChatKey = (chatId: string) => `${HIDDEN_CHAT_KEY_PREFIX}${chatId}`;

    async function getPrivacyChatRecord(chatId: string): Promise<PrivacyChatRecord | null> {
        const raw = (await getIdbValue(
            getPrivacyChatKey(chatId),
            null
        )) as Partial<PrivacyChatRecord> | null;

        if (!raw || typeof raw !== 'object') return null;
        const id = String(raw.chatId || '').trim();
        if (!id) return null;

        return {
            chatId: id,
            title: String(raw.title || '').trim(),
            enabled: Boolean(raw.enabled),
            updatedAt: Number(raw.updatedAt) || Date.now(),
        };
    }

    async function getHiddenChatRecord(chatId: string): Promise<HiddenChatRecord | null> {
        const raw = (await getIdbValue(
            getHiddenChatKey(chatId),
            null
        )) as Partial<HiddenChatRecord> | null;

        if (!raw || typeof raw !== 'object') return null;
        const id = String(raw.chatId || '').trim();
        if (!id) return null;

        return {
            chatId: id,
            title: String(raw.title || '').trim(),
            enabled: Boolean(raw.enabled),
            updatedAt: Number(raw.updatedAt) || Date.now(),
        };
    }

    async function getHideChatFeatureState(): Promise<{
        hideChatsEnabled: boolean;
        keepInaccessibleWhenDisabled: boolean;
    }> {
        const settings = await getStorageValue<Partial<typeof DEFAULT_SETTINGS>>(
            SETTINGS_KEY,
            DEFAULT_SETTINGS
        );
        const storedSettings: Partial<typeof DEFAULT_SETTINGS> =
            settings && typeof settings === 'object' ? settings : {};
        const merged = {
            ...DEFAULT_SETTINGS,
            ...storedSettings,
        };

        return {
            hideChatsEnabled: merged.hideChatsEnabled !== false,
            keepInaccessibleWhenDisabled: Boolean(merged.hideChatsKeepInaccessibleWhenDisabled),
        };
    }

    async function showAddToFolderMenu(chatInfo: ChatInfo): Promise<void> {
        const storedFolders = await getStorageValue(FOLDERS_KEY);
        const foldersData = normalizeFoldersData(storedFolders);
        const folders = foldersData.folders;

        if (!Array.isArray(folders) || folders.length === 0) {
            showToast('Create a folder first', 'info');
            return;
        }

        document.querySelector('#hg-folder-select-overlay')?.remove();

        const initiallySelected = new Set<string>();
        folders.forEach((folder) => {
            if ((folder.chats || []).some((chat) => chat.id === chatInfo.id)) {
                initiallySelected.add(folder.id);
            }
        });

        const overlay = document.createElement('div');
        overlay.id = 'hg-folder-select-overlay';
        overlay.className = 'hg-folder-select-overlay hg-dialog-overlay';

        const close = () => overlay.remove();

        const save = async (selected: Set<string>) => {
            const updatedFolders = folders.map((folder) => {
                const chats: StoredChat[] = Array.isArray(folder.chats) ? [...folder.chats] : [];
                const existingIndex = chats.findIndex((chat) => chat.id === chatInfo.id);
                const shouldContain = selected.has(folder.id);

                if (shouldContain && existingIndex === -1) {
                    chats.push({
                        id: chatInfo.id,
                        title: chatInfo.title,
                        url: chatInfo.url || getAccountAwareUrl(chatInfo.id),
                        pinned: false,
                    });
                }

                if (!shouldContain && existingIndex >= 0) {
                    chats.splice(existingIndex, 1);
                }

                return { ...folder, chats };
            });

            await setStorageValue(FOLDERS_KEY, withUpdatedFolders(storedFolders, updatedFolders));
            showToast('Folder changes saved', 'success');
            close();
        };

        overlay.addEventListener('click', (event: MouseEvent) => {
            if (event.target === overlay) close();
        });

        document.body.appendChild(overlay);

        render(
            <FolderSelectModal
                chatInfo={chatInfo}
                folders={folders}
                initiallySelected={initiallySelected}
                onClose={close}
                onSave={save}
            />,
            overlay
        );
    }

    function handleGlobalMenuButtonTracking(event: Event): void {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const button = target.closest('.mat-mdc-menu-trigger');
        if (!button) return;

        const sidebarRow = button.closest(
            '.conversation-items-container, .conversation, .conversation-list-item, [class*="conversation-item"]'
        );
        const sidebarInfo = inferChatInfoFromConversationRow(sidebarRow);
        if (sidebarInfo) {
            lastClickedChatInfo = sidebarInfo;
            return;
        }

        const topBarRoot = button.closest('top-bar-actions');
        if (!topBarRoot) return;

        const activeInfo = findActiveChatInfo();
        if (!activeInfo) return;

        const topBarTitle = topBarRoot
            .querySelector('[data-test-id="conversation-title"]')
            ?.textContent?.trim();

        lastClickedChatInfo = {
            ...activeInfo,
            title: topBarTitle || activeInfo.title,
        };
    }

    function injectAddToFolderOption(menuRoot: Element | null): void {
        if (!menuRoot) return;
        const nativeItems = menuRoot.querySelectorAll('button, [role="menuitem"]');
        if (!nativeItems.length) return;

        const chatInfo = lastClickedChatInfo || findActiveChatInfo();

        if (!menuRoot.querySelector('.hg-add-to-folder-btn')) {
            const addToFolderButton = document.createElement('button');
            addToFolderButton.className = 'hg-add-to-folder-btn';
            addToFolderButton.setAttribute('role', 'menuitem');
            addToFolderButton.type = 'button';

            render(
                <>
                    <FolderAddIcon width="24" height="24" />
                    <span>Add chat to folder</span>
                </>,
                addToFolderButton
            );

            addToFolderButton.addEventListener('click', async (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();

                const currentChatInfo = lastClickedChatInfo || findActiveChatInfo();
                if (!currentChatInfo) {
                    showToast('Could not identify chat to add', 'error');
                    return;
                }

                await showAddToFolderMenu(currentChatInfo);
            });

            const last = nativeItems[nativeItems.length - 1];
            last.parentNode?.insertBefore(addToFolderButton, last.nextSibling);
        }

        if (menuRoot.querySelector('.hg-toggle-private-chat-btn')) return;
        if (!chatInfo?.id) return;

        const togglePrivateButton = document.createElement('button');
        togglePrivateButton.className = 'hg-toggle-private-chat-btn';
        togglePrivateButton.setAttribute('role', 'menuitem');
        togglePrivateButton.type = 'button';

        const label = document.createElement('span');
        label.textContent = 'Blur chat';

        const iconHost = document.createElement('span');
        iconHost.className = 'hg-toggle-private-chat-icon';

        togglePrivateButton.appendChild(iconHost);
        togglePrivateButton.appendChild(label);

        const updateToggleUi = (enabled: boolean) => {
            label.textContent = enabled ? 'Unblur chat' : 'Blur chat';
            render(
                enabled ? (
                    <BlurOnIcon width="24" height="24" />
                ) : (
                    <BlurOffIcon width="24" height="24" />
                ),
                iconHost
            );
        };

        void getPrivacyChatRecord(chatInfo.id).then((record) => {
            updateToggleUi(Boolean(record?.enabled));
        });

        togglePrivateButton.addEventListener('click', async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const currentChatInfo = lastClickedChatInfo || findActiveChatInfo();
            if (!currentChatInfo?.id) {
                showToast('Could not identify chat blur target', 'error');
                return;
            }

            const existing = await getPrivacyChatRecord(currentChatInfo.id);
            const nextEnabled = !existing?.enabled;

            await setIdbValue(getPrivacyChatKey(currentChatInfo.id), {
                chatId: currentChatInfo.id,
                title: currentChatInfo.title,
                enabled: nextEnabled,
                updatedAt: Date.now(),
            } as PrivacyChatRecord);

            window.dispatchEvent(
                new CustomEvent('hg-privacy-chat-updated', {
                    detail: {
                        chatId: currentChatInfo.id,
                        title: currentChatInfo.title,
                        enabled: nextEnabled,
                    },
                })
            );

            updateToggleUi(nextEnabled);
            showToast(
                nextEnabled ? 'Chat added to Blur Chats' : 'Chat removed from Blur Chats',
                'success'
            );
        });

        const last = nativeItems[nativeItems.length - 1];
        last.parentNode?.insertBefore(togglePrivateButton, last.nextSibling);

        if (menuRoot.querySelector('.hg-toggle-hidden-chat-btn')) return;

        const toggleHiddenButton = document.createElement('button');
        toggleHiddenButton.className = 'hg-toggle-hidden-chat-btn';
        toggleHiddenButton.setAttribute('role', 'menuitem');
        toggleHiddenButton.type = 'button';

        const hiddenLabel = document.createElement('span');
        hiddenLabel.textContent = 'Hide chat';

        const hiddenIconHost = document.createElement('span');
        hiddenIconHost.className = 'hg-toggle-hidden-chat-icon';

        toggleHiddenButton.appendChild(hiddenIconHost);
        toggleHiddenButton.appendChild(hiddenLabel);

        const updateHiddenUi = (enabled: boolean) => {
            hiddenLabel.textContent = enabled ? 'Show chat' : 'Hide chat';
            render(
                enabled ? (
                    <EyeIcon width="24" height="24" />
                ) : (
                    <EyeOffIcon width="24" height="24" />
                ),
                hiddenIconHost
            );
        };

        void getHiddenChatRecord(chatInfo.id).then((record) => {
            updateHiddenUi(Boolean(record?.enabled));
        });

        toggleHiddenButton.addEventListener('click', async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const currentChatInfo = lastClickedChatInfo || findActiveChatInfo();
            if (!currentChatInfo?.id) {
                showToast('Could not identify chat visibility target', 'error');
                return;
            }

            const hideFeatureState = await getHideChatFeatureState();
            if (!hideFeatureState.hideChatsEnabled) {
                showToast(
                    hideFeatureState.keepInaccessibleWhenDisabled
                        ? 'Hide Chat is disabled and hidden chats are locked'
                        : 'Enable Hide Chat in Settings to manage hidden chats',
                    'info'
                );
                return;
            }

            const existing = await getHiddenChatRecord(currentChatInfo.id);
            const nextEnabled = !existing?.enabled;

            await setIdbValue(getHiddenChatKey(currentChatInfo.id), {
                chatId: currentChatInfo.id,
                title: currentChatInfo.title,
                enabled: nextEnabled,
                updatedAt: Date.now(),
            } as HiddenChatRecord);

            window.dispatchEvent(
                new CustomEvent('hg-hidden-chat-updated', {
                    detail: {
                        chatId: currentChatInfo.id,
                        title: currentChatInfo.title,
                        enabled: nextEnabled,
                    },
                })
            );

            updateHiddenUi(nextEnabled);
            showToast(
                nextEnabled ? 'Chat hidden from main chat list' : 'Chat restored to main chat list',
                'success'
            );
        });

        const hiddenLast = nativeItems[nativeItems.length - 1];
        hiddenLast.parentNode?.insertBefore(toggleHiddenButton, hiddenLast.nextSibling);
    }

    return {
        handleGlobalMenuButtonTracking,
        injectAddToFolderOption,
    };
}
