import { render } from 'preact';
import { useState } from 'preact/hooks';

import { FolderAddIcon, CloseIcon } from '../../icons';
import { getStorageValue, setStorageValue } from '../../utils/browserEnv';
import { FOLDERS_KEY } from '../../utils/constants';
import { inferChatInfoFromConversationRow } from '../helpers/chatInfo';

function FolderSelectModal({
    chatInfo,
    folders,
    initiallySelected,
    onClose,
    onSave,
}) {
    const [selected, setSelected] = useState(new Set(initiallySelected));

    const toggle = (id) => {
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
                {folders.map((folder) => (
                    <button
                        key={folder.id}
                        class="hg-folder-select-item"
                        onClick={() => toggle(folder.id)}
                        type="button"
                    >
                        <span class="hg-folder-select-check">
                            {selected.has(folder.id) ? '✓' : ''}
                        </span>
                        <span class="hg-folder-select-name">{folder.name}</span>
                        <span class="hg-folder-select-count">
                            {(folder.chats || []).length}
                        </span>
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
}) {
    let lastClickedChatInfo = null;

    async function showAddToFolderMenu(chatInfo) {
        const folders = await getStorageValue(FOLDERS_KEY, []);

        if (!Array.isArray(folders) || folders.length === 0) {
            showToast('Create a folder first', 'info');
            return;
        }

        document.querySelector('#hg-folder-select-overlay')?.remove();

        const initiallySelected = new Set();
        folders.forEach((folder) => {
            if ((folder.chats || []).some((chat) => chat.id === chatInfo.id)) {
                initiallySelected.add(folder.id);
            }
        });

        const overlay = document.createElement('div');
        overlay.id = 'hg-folder-select-overlay';
        overlay.className = 'hg-folder-select-overlay hg-dialog-overlay';

        const close = () => overlay.remove();

        const save = async (selected) => {
            const updatedFolders = folders.map((folder) => {
                const chats = Array.isArray(folder.chats)
                    ? [...folder.chats]
                    : [];
                const existingIndex = chats.findIndex(
                    (chat) => chat.id === chatInfo.id
                );
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

            await setStorageValue(FOLDERS_KEY, updatedFolders);
            showToast('Folder changes saved', 'success');
            close();
        };

        overlay.addEventListener('click', (event) => {
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

    function handleGlobalMenuButtonTracking(event) {
        const button = event.target.closest(
            'button[data-test-id="side-nav-menu-button"]'
        );
        if (!button) return;

        const row = button.closest(
            '.conversation, .conversation-list-item, [class*="conversation-item"]'
        );
        const info = inferChatInfoFromConversationRow(row);
        if (info) lastClickedChatInfo = info;
    }

    function injectAddToFolderOption(menuRoot) {
        if (!menuRoot || menuRoot.querySelector('.hg-add-to-folder-btn')) return;
        const nativeItems = menuRoot.querySelectorAll('button, [role="menuitem"]');
        if (!nativeItems.length) return;

        const button = document.createElement('button');
        button.className = 'hg-add-to-folder-btn';
        button.setAttribute('role', 'menuitem');
        button.type = 'button';

        render(
            <>
                <FolderAddIcon width="24" height="24" />
                <span>Add chat to folder</span>
            </>,
            button
        );

        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();

            const chatInfo = lastClickedChatInfo || findActiveChatInfo();
            if (!chatInfo) {
                showToast('Could not identify chat to add', 'error');
                return;
            }

            await showAddToFolderMenu(chatInfo);
        });

        const last = nativeItems[nativeItems.length - 1];
        last.parentNode?.insertBefore(button, last.nextSibling);
    }

    return {
        handleGlobalMenuButtonTracking,
        injectAddToFolderOption,
    };
}
