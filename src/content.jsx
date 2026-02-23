import { createRoot } from 'react-dom/client';
import { Sidebar } from './Sidebar';
import { ChatTools } from './ChatTools';
import './content.css';
import { ChatExportController } from './features/chatExport';
import { TopBarToolsManager } from './features/topBarToolsManager';

const SETTINGS_KEY = 'hypergravityGeminiSettings';
const FOLDERS_KEY = 'hypergravityGeminiFolders';
const DEFAULT_SETTINGS = {
    enabled: true,
    foldersEnabled: true,
    autoScrollEnabled: false,
    wideModeEnabled: false,
    hideSidebarEnabled: false,
    showExportButton: true,
};

let lastClickedChatInfo = null;
let lastWideChatUrl = window.location.href;
let chatExportController = null;
let topBarToolsManager = null;

function hasChromeStorage() {
    return (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local &&
        typeof chrome.storage.local.get === 'function' &&
        typeof chrome.storage.local.set === 'function'
    );
}

function readLocalStorageValue(key) {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return undefined;
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

function writeLocalStorageValue(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore localStorage write failures
        console.error('Failed to write to localStorage');
    }
}

function getStorageValue(key, fallback) {
    return new Promise((resolve) => {
        if (!hasChromeStorage()) {
            const localValue = readLocalStorageValue(key);
            resolve(localValue !== undefined ? localValue : fallback);
            return;
        }

        chrome.storage.local.get([key], (result) => {
            if (chrome.runtime?.lastError) {
                const localValue = readLocalStorageValue(key);
                resolve(localValue !== undefined ? localValue : fallback);
                return;
            }

            if (result[key] !== undefined) {
                writeLocalStorageValue(key, result[key]);
                resolve(result[key]);
                return;
            }

            const localValue = readLocalStorageValue(key);
            if (localValue !== undefined) {
                chrome.storage.local.set({ [key]: localValue }, () => {
                    resolve(localValue);
                });
                return;
            }

            resolve(fallback);
        });
    });
}

function setStorageValue(key, value) {
    writeLocalStorageValue(key, value);

    if (!hasChromeStorage()) return Promise.resolve();

    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime?.lastError) {
                resolve();
                return;
            }
            resolve();
        });
    });
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
    const selected = new Set(initiallySelected);

    const overlay = document.createElement('div');
    overlay.id = 'hg-folder-select-overlay';
    overlay.className = 'hg-folder-select-overlay';

    const modal = document.createElement('div');
    modal.className = 'hg-folder-select-modal';

    const renderRows = () =>
        folders
            .map((folder) => {
                const inFolder = selected.has(folder.id);
                return `
                    <button class="hg-folder-select-item" data-folder-id="${folder.id}" type="button">
                        <span class="hg-folder-select-check">${inFolder ? '✓' : ''}</span>
                        <span class="hg-folder-select-name">${folder.name}</span>
                        <span class="hg-folder-select-count">${(folder.chats || []).length}</span>
                    </button>
                `;
            })
            .join('');

    modal.innerHTML = `
        <div class="hg-folder-select-header">
            <h3>Add to Folder</h3>
            <button class="hg-folder-select-close" type="button" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="hg-folder-select-subtitle">Manage folders for: <strong>${chatInfo.title}</strong></div>
        <div class="hg-folder-select-list">${renderRows()}</div>
        <div class="hg-folder-select-footer">
            <button class="hg-folder-select-save" type="button">Done</button>
        </div>
    `;

    const close = () => overlay.remove();

    const attachRowHandlers = () => {
        modal
            .querySelectorAll('.hg-folder-select-item')
            .forEach((rowButton) => {
                rowButton.addEventListener('click', () => {
                    const folderId = rowButton.getAttribute('data-folder-id');
                    if (!folderId) return;

                    if (selected.has(folderId)) selected.delete(folderId);
                    else selected.add(folderId);

                    modal.querySelector('.hg-folder-select-list').innerHTML =
                        renderRows();
                    attachRowHandlers();
                });
            });
    };

    attachRowHandlers();

    modal
        .querySelector('.hg-folder-select-close')
        ?.addEventListener('click', close);
    modal
        .querySelector('.hg-folder-select-save')
        ?.addEventListener('click', async () => {
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
        });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function injectAddToFolderOption(menuRoot) {
    if (!menuRoot || menuRoot.querySelector('.hg-add-to-folder-btn')) return;
    const nativeItems = menuRoot.querySelectorAll('button, [role="menuitem"]');
    if (!nativeItems.length) return;

    const button = document.createElement('button');
    button.className = 'hg-add-to-folder-btn';
    button.setAttribute('role', 'menuitem');
    button.type = 'button';
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <span>Add chat to folder</span>
    `;

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
        topBarToolsManager = new TopBarToolsManager({
            getSettings,
            updateSettings,
            onExportClick: () => chatExportController?.showPopup(),
        });
    }
}
function insertHypergravitySidebar() {
    // Attempt to find the target injection point like the original extension
    let target = document.querySelector('conversations-list');
    let needsAfterEnd = false;

    if (!target) {
        const gemsList = document.querySelector('.gems-list-container');
        if (gemsList) {
            target = gemsList.parentElement;
            needsAfterEnd = true;
        } else {
            const sideNav =
                document.querySelector('bard-sidenav infinite-scroller') ||
                document.querySelector(
                    'infinite-scroller[scrollable="true"]'
                ) ||
                document.querySelector('.conversations-container');
            if (sideNav) {
                target = sideNav;
                needsAfterEnd = false;
            }
        }
    }

    if (
        !target ||
        target === document.body ||
        document.querySelector('#hypergravity-root')
    ) {
        return;
    }

    const rootElement = document.createElement('div');
    rootElement.id = 'hypergravity-root';
    rootElement.style.cssText =
        'overflow: visible; transition: margin-top 0.2s ease;';

    if (needsAfterEnd) {
        const gemsList = document.querySelector('.gems-list-container');
        if (gemsList) {
            gemsList.insertAdjacentElement('afterend', rootElement);
        } else {
            target.prepend(rootElement);
        }
    } else {
        target.prepend(rootElement);
    }

    createRoot(rootElement).render(<Sidebar />);

    // Chat Tools injection is now handled separately
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
        // Style it to blend naturally at the top of the input field row
        toolsRoot.style.cssText =
            'display: flex; justify-content: space-between; align-items: center; margin-top: -30px; width: 100%; box-sizing: border-box;';
        createRoot(toolsRoot).render(<ChatTools />);
    }

    // Attach or move it if needed
    if (toolsRoot.parentElement !== chatContainer) {
        chatContainer.prepend(toolsRoot);
    }
}

// Since gemini.google.com is likely a Single Page App, we use a MutationObserver
const observer = new MutationObserver((mutations) => {
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

document.addEventListener('click', handleGlobalMenuButtonTracking, true);

if (hasChromeStorage()) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[SETTINGS_KEY]) {
            topBarToolsManager?.refresh();
        }
    });
}
