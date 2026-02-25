import { render } from 'preact';
import { useState } from 'preact/hooks';

import { Sidebar } from './Sidebar';
import { ChatTools } from './ChatTools';
import './content.css';
import { ChatExportController } from './features/chatExport';
import { createChatMemoryManager } from './features/chatMemoryManager';
import { createTopBarToolsManager } from './features/topBarToolsManager';
import { CloseIcon, FolderAddIcon } from './icons';
import {
    getStorageValue,
    setStorageValue,
    removeStorageValue,
    addStorageListener,
    isUserscript,
} from './utils/browserEnv';
import { SETTINGS_KEY, FOLDERS_KEY, DEFAULT_SETTINGS } from './utils/constants';
import {
    getCacheStats,
    getAllCacheData,
    importCacheData,
    clearCacheData,
} from './utils/tokenHashCache';

let lastClickedChatInfo = null;
let lastWideChatUrl = window.location.href;
let chatExportController = null;
let topBarToolsManager = null;
let chatMemoryManager = null;
let hgEnabled = true; // mirror of settings.enabled to gate UI injection

/**
 * Applies CSS classes to the document body based on chatbox style settings.
 * @param {Object} settings - The user settings.
 * @param {boolean} [settings.chatboxStyleEnabled] - Whether custom chatbox styling is enabled.
 * @param {boolean} [settings.chatboxCompactEnabled] - Whether compact chatbox styling is enabled.
 */
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

/**
 * Retrieves the current settings from storage, merging with default values.
 * @returns {Promise<Object>} The combined settings object.
 */
async function getSettings() {
    const settings = await getStorageValue(SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

/**
 * Updates settings by patching current values and persisting back to storage.
 * @param {Object} patch - The settings properties to update.
 * @returns {Promise<Object>} The updated settings object.
 */
async function updateSettings(patch) {
    const current = await getSettings();
    const next = { ...current, ...patch };
    await setStorageValue(SETTINGS_KEY, next);
    return next;
}

/**
 * Generates an absolute Gemini URL for a given chat ID, preserving account context (e.g. /u/1/).
 * @param {string} [chatId=''] - The ID of the chat.
 * @returns {string} The full Gemin URL.
 */
function getAccountAwareUrl(chatId = '') {
    const match = window.location.pathname.match(/^\/u\/(\d+)\//);
    const accountPath = match ? `/u/${match[1]}/app` : '/app';
    return `https://gemini.google.com${chatId ? `${accountPath}/${chatId}` : accountPath}`;
}

/**
 * Inspects DOIM and URL to find metadata for the currently active chat.
 * @returns {Object|null} Chat info object containing id, title, and url, or null if not found.
 */
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

/**
 * Displays a non-intrusive toast notification to the user.
 * @param {string} message - The message text to display.
 * @param {'info'|'success'|'error'} [type='info'] - The toast type for styling.
 */
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

/**
 * Attempts to extract chat metadata from a conversation sidebar entry row.
 * @param {HTMLElement} row - The DOM element representing the conversation row.
 * @returns {Object|null} Chat info object or null.
 */
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

/**
 * Captures which chat button was clicked to prepopulate folder operations.
 * @param {MouseEvent} event
 */
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

/**
 * Preact component for selecting folders to assign a chat to.
 */
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

/**
 * Initializes and displays the "Add to Folder" modal.
 * @param {Object} chatInfo - Metadata for the chat to be added.
 */
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

/**
 * Injects a custom menu item into the Gemini chat menu for folder management.
 * @param {HTMLElement} menuRoot - The menu container element.
 */
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
            <FolderAddIcon width="24" height="24"/>
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

/**
 * Bootstraps feature modules that depend on DOM or storage.
 */
function initializeFeatureModules() {
    if (!hgEnabled) return; // skip when master toggle off

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

    if (!chatMemoryManager) {
        chatMemoryManager = createChatMemoryManager();
    }
}

/**
 * Identifies the sidebar injection point and inserts the Hypergravity sidebar root.
 */
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

/**
 * Identifies the message input area and injects the ChatTools component.
 */
function insertChatTools() {
    // Find the chat box container.
    const chatContainer =
        document.querySelector('.text-input-field') ||
        document.querySelector('.leading-actions-wrapper');
    if (!chatContainer) return;

    if (window.getComputedStyle(chatContainer).position === 'static') {
        chatContainer.style.position = 'relative';
    }

    let toolsRoot = document.querySelector('#hypergravity-chat-tools-root');
    if (!toolsRoot) {
        toolsRoot = document.createElement('div');
        toolsRoot.id = 'hypergravity-chat-tools-root';
        toolsRoot.className = 'hg-chat-tools-container';
        render(<ChatTools />, toolsRoot);
    }

    // Keep tools anchored directly above Gemini's native bottom controls
    // so attachment previews above do not collide with the tools row.
    const controlsRow = chatContainer.querySelector(
        '.input-buttons-wrapper-bottom, .leading-actions-wrapper'
    );

    const targetParent = controlsRow?.parentElement || chatContainer;
    const beforeNode = controlsRow || null;

    const isAlreadyPlaced =
        toolsRoot.parentElement === targetParent &&
        (beforeNode
            ? toolsRoot.nextElementSibling === beforeNode
            : targetParent.firstElementChild === toolsRoot);

    if (!isAlreadyPlaced) {
        if (beforeNode) {
            targetParent.insertBefore(toolsRoot, beforeNode);
        } else {
            targetParent.prepend(toolsRoot);
        }
    }
}

let mutationDebounceTimer = null;
const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
        if (!hgEnabled) return; // do nothing when disabled

        if (!document.querySelector('#hypergravity-root')) {
            insertHypergravitySidebar();
        }
        insertChatTools();
        topBarToolsManager?.refresh();
        chatMemoryManager?.refresh();

        const menuRoots = document.querySelectorAll(
            '.conversation-actions-menu'
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

// Initial setup
getSettings().then((settings) => {
    hgEnabled = Boolean(settings.enabled);
    applyChatboxHeaderStyleSetting(settings);
    if (hgEnabled) {
        initializeFeatureModules();
        insertHypergravitySidebar();
        insertChatTools();
        topBarToolsManager?.refresh();
        chatMemoryManager?.refresh();
    }
});

document.addEventListener('click', handleGlobalMenuButtonTracking, true);

addStorageListener(SETTINGS_KEY, (newValue) => {
    const settings = {
        ...DEFAULT_SETTINGS,
        ...(newValue || {}),
    };
    hgEnabled = Boolean(settings.enabled);

    topBarToolsManager?.refresh();
    applyChatboxHeaderStyleSetting(settings);

    if (!hgEnabled) {
        // remove injected UI when toggle is off
        const sidebarRoot = document.querySelector('#hypergravity-root');
        if (sidebarRoot) sidebarRoot.remove();
        const chatToolsRoot = document.querySelector(
            '#hypergravity-chat-tools-root'
        );
        if (chatToolsRoot) chatToolsRoot.remove();
    } else {
        // if it was turned back on without reloading, re-insert
        insertHypergravitySidebar();
        insertChatTools();
        topBarToolsManager?.refresh();
        chatMemoryManager?.refresh();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'HG_TOKEN_CACHE_GET_STATS') {
        getCacheStats()
            .then((stats) => sendResponse({ success: true, ...stats }))
            .catch((error) =>
                sendResponse({
                    success: false,
                    error: error?.message || 'Unknown error',
                })
            );
        return true;
    }

    if (message?.type === 'HG_TOKEN_CACHE_GET_ALL') {
        getAllCacheData()
            .then((data) => sendResponse({ success: true, data }))
            .catch((error) =>
                sendResponse({
                    success: false,
                    error: error?.message || 'Unknown error',
                })
            );
        return true;
    }

    if (message?.type === 'HG_TOKEN_CACHE_IMPORT') {
        importCacheData(message?.data)
            .then((imported) => sendResponse({ success: true, imported }))
            .catch((error) =>
                sendResponse({
                    success: false,
                    error: error?.message || 'Unknown error',
                })
            );
        return true;
    }

    if (message?.type === 'HG_TOKEN_CACHE_CLEAR') {
        clearCacheData()
            .then((cleared) => sendResponse({ success: true, cleared }))
            .catch((error) =>
                sendResponse({
                    success: false,
                    error: error?.message || 'Unknown error',
                })
            );
        return true;
    }
});
