import { render } from 'preact';
import { useState } from 'preact/hooks';
import { Sidebar } from './Sidebar';
import { ChatTools } from './ChatTools';
import './content.css';
import { ChatExportController } from './features/chatExport';
import { createTopBarToolsManager } from './features/topBarToolsManager';
import {
    getStorageValue,
    setStorageValue,
    addStorageListener,
    isUserscript,
} from './utils/browserEnv';
import { SETTINGS_KEY, FOLDERS_KEY, DEFAULT_SETTINGS } from './utils/constants';

let lastClickedChatInfo = null;
let lastWideChatUrl = window.location.href;
let chatExportController = null;
let topBarToolsManager = null;

function applyChatboxHeaderStyleSetting(settings) {
    document.body.classList.toggle(
        'hg-chatbox-header-style-enabled',
        Boolean(settings?.chatboxStyleEnabled)
    );
    document.body.classList.toggle(
        'hg-chatbox-compact-enabled',
        Boolean(settings?.chatboxCompactEnabled)
    );
}

async function getSettings() {
    const settings = await getStorageValue(SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

async function updateSettings(patch) {
    const current = await getSettings();
    const next = { ...current, ...patch };
    await setStorageValue(SETTINGS_KEY, next);
    return next;
}

function getAccountAwareUrl(chatId = '') {
    const match = window.location.pathname.match(/^\/u\/(\d+)\//);
    const accountPath = match ? `/u/${match[1]}/app` : '/app';
    return `https://gemini.google.com${chatId ? `${accountPath}/${chatId}` : accountPath}`;
}

function findActiveChatInfo() {
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

function showToast(message, type = 'info') {
    const existing = document.querySelector('#hg-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'hg-toast';
    toast.className = `hg-toast hg-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 200);
    }, 1900);
}

function inferChatInfoFromConversationRow(row) {
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
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
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
                        <span class="hg-folder-select-name">
                            {folder.name}
                        </span>
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
    overlay.className = 'hg-folder-select-overlay';

    const close = () => overlay.remove();

    const save = async (selected) => {
        const updatedFolders = folders.map((folder) => {
            const chats = Array.isArray(folder.chats) ? [...folder.chats] : [];
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
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
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

function initializeFeatureModules() {
    if (!chatExportController) {
        chatExportController = new ChatExportController({
            showToast,
            findActiveChatInfo,
        });
    }

    if (!topBarToolsManager) {
        topBarToolsManager = createTopBarToolsManager({
            getSettings,
            updateSettings,
            onExportClick: () => chatExportController?.showPopup(),
        });
    }
}
function insertHypergravitySidebar() {
    if (document.querySelector('#hypergravity-root')) return;

    let target = document.querySelector('conversations-list');
    let insertMode = 'prepend'; // 'prepend' | 'afterend' | 'before'

    if (!target) {
        const gemsList = document.querySelector('.gems-list-container');
        if (gemsList) {
            target = gemsList;
            insertMode = 'afterend';
        } else {
            const sideNav =
                document.querySelector('bard-sidenav infinite-scroller') ||
                document.querySelector(
                    'infinite-scroller[scrollable="true"]'
                ) ||
                document.querySelector('.conversations-container');
            if (sideNav) {
                target = sideNav;
                insertMode = 'before';
            }
        }
    }

    if (!target || target === document.body) return;

    const rootElement = document.createElement('div');
    rootElement.id = 'hypergravity-root';
    rootElement.style.cssText =
        'overflow: visible; transition: margin-top 0.2s ease;';

    if (insertMode === 'afterend') {
        target.insertAdjacentElement('afterend', rootElement);
    } else if (insertMode === 'before') {
        target.insertAdjacentElement('beforebegin', rootElement);
    } else {
        target.prepend(rootElement);
    }

    render(<Sidebar />, rootElement);
}

function insertChatTools() {
    // Find the chat box container. We can try to attach it above the leading actions.
    const chatContainer =
        document.querySelector('.text-input-field') ||
        document.querySelector('.leading-actions-wrapper');
    if (!chatContainer) return;

    let toolsRoot = document.querySelector('#hypergravity-chat-tools-root');
    if (!toolsRoot) {
        toolsRoot = document.createElement('div');
        toolsRoot.id = 'hypergravity-chat-tools-root';
        toolsRoot.className = 'hg-chat-tools-container';
        render(<ChatTools />, toolsRoot);
    }

    // Attach or move it if needed
    if (toolsRoot.parentElement !== chatContainer) {
        chatContainer.prepend(toolsRoot);
    }
}

let mutationDebounceTimer = null;
const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
        if (!document.querySelector('#hypergravity-root')) {
            insertHypergravitySidebar();
        }
        insertChatTools();
        topBarToolsManager?.refresh();

        const menuRoots = document.querySelectorAll(
            '.cdk-overlay-pane, mat-menu-panel, .mat-mdc-menu-panel'
        );
        menuRoots.forEach((menuRoot) => injectAddToFolderOption(menuRoot));

        const currentUrl = window.location.href;
        if (currentUrl !== lastWideChatUrl) {
            lastWideChatUrl = currentUrl;
            topBarToolsManager?.refresh();
        }
    }, 150);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Try to insert on initial load
initializeFeatureModules();
insertHypergravitySidebar();
insertChatTools();
topBarToolsManager?.refresh();
getSettings().then(applyChatboxHeaderStyleSetting);

document.addEventListener('click', handleGlobalMenuButtonTracking, true);

addStorageListener(SETTINGS_KEY, (newValue) => {
    topBarToolsManager?.refresh();
    applyChatboxHeaderStyleSetting({
        ...DEFAULT_SETTINGS,
        ...(newValue || {}),
    });
});
