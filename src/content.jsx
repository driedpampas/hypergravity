import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Sidebar } from './Sidebar';
import { ChatTools } from './ChatTools';
import { TokenCounter } from './TokenCounter';
import './content.css';

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

function hasChromeStorage() {
    return (
        typeof chrome !== 'undefined' &&
        chrome.storage &&
        chrome.storage.local &&
        typeof chrome.storage.local.get === 'function'
    );
}

function getStorageValue(key, fallback) {
    return new Promise((resolve) => {
        if (!hasChromeStorage()) {
            resolve(fallback);
            return;
        }

        chrome.storage.local.get([key], (result) => {
            if (chrome.runtime?.lastError) {
                resolve(fallback);
                return;
            }
            resolve(result[key] !== undefined ? result[key] : fallback);
        });
    });
}

function setStorageValue(key, value) {
    if (!hasChromeStorage()) return Promise.resolve();
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => resolve());
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

function sanitizeFilename(value) {
    return (value || 'Gemini_Chat')
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .slice(0, 60);
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

function getChatHistory() {
    const userSelectors = [
        'user-query',
        '.user-message',
        '[data-message-author="user"]',
        '.query-content',
    ];
    const allSelectors = [
        ...userSelectors,
        'model-response',
        '.model-response',
        '[data-message-author="model"]',
        'message-content .markdown-main-panel',
        'generative-ui-response',
        'response-container',
    ].join(', ');

    let nodes = Array.from(document.querySelectorAll(allSelectors));
    nodes = nodes.filter(
        (node, index, arr) =>
            !arr.some(
                (other, otherIndex) =>
                    index !== otherIndex && other.contains(node)
            )
    );

    return nodes
        .map((node) => {
            const isUser = userSelectors.some(
                (selector) => node.matches(selector) || node.closest(selector)
            );
            const text = (node.innerText || '').trim();
            if (!text) return null;

            return {
                role: isUser ? 'User' : 'Gemini',
                text,
                timestamp: '',
            };
        })
        .filter(Boolean);
}

function formatTextExport(messages, title) {
    let output = `${title}\nExported using hypergravity on: ${new Date().toLocaleString()}\n\n`;
    messages.forEach((msg) => {
        output += `${msg.role}\n\n${msg.text}\n\n`;
    });
    return output;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
}

function exportChatAsText() {
    const messages = getChatHistory();
    if (!messages.length) {
        showToast('Cannot export empty chat', 'error');
        return;
    }

    const chat = findActiveChatInfo();
    const title = chat?.title || 'Gemini Chat';
    const text = formatTextExport(messages, title);
    const fileBase = sanitizeFilename(title);
    downloadBlob(
        new Blob([text], { type: 'text/plain' }),
        `${fileBase}_${new Date().toISOString().slice(0, 10)}.txt`
    );
    showToast('Text downloaded', 'success');
}

async function exportChatAsPdf() {
    const messages = getChatHistory();
    if (!messages.length) {
        showToast('Cannot export empty chat', 'error');
        return;
    }

    try {
        const { jsPDF } = await import('jspdf');
        const chat = findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';
        const fileBase = sanitizeFilename(title);

        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 48;
        const maxWidth = pageWidth - margin * 2;

        let y = margin;
        pdf.setFontSize(16);
        pdf.text(title, margin, y);
        y += 24;
        pdf.setFontSize(10);
        pdf.text(
            `Exported using hypergravity on: ${new Date().toLocaleString()}`,
            margin,
            y
        );
        y += 22;

        const ensureSpace = (needed = 18) => {
            const pageHeight = pdf.internal.pageSize.getHeight();
            if (y + needed > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
        };

        messages.forEach((msg) => {
            ensureSpace(24);
            pdf.setFontSize(11);
            pdf.setFont(undefined, 'bold');
            pdf.text(msg.role, margin, y);
            y += 16;

            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(10);
            const lines = pdf.splitTextToSize(msg.text, maxWidth);
            lines.forEach((line) => {
                ensureSpace(14);
                pdf.text(line, margin, y);
                y += 14;
            });
            y += 10;
        });

        pdf.save(`${fileBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast('PDF downloaded', 'success');
    } catch (error) {
        console.error('[hypergravity] PDF export error:', error);
        showToast('PDF export requires jspdf dependency', 'error');
    }
}

async function exportChatAsDocx() {
    const messages = getChatHistory();
    if (!messages.length) {
        showToast('Cannot export empty chat', 'error');
        return;
    }

    try {
        const docx = await import('docx');
        const { Document, Packer, Paragraph, TextRun } = docx;
        const chat = findActiveChatInfo();
        const title = chat?.title || 'Gemini Chat';
        const fileBase = sanitizeFilename(title);

        const children = [
            new Paragraph({
                children: [new TextRun({ text: title, bold: true, size: 32 })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: `Exported using hypergravity on: ${new Date().toLocaleString()}`,
                        size: 20,
                    }),
                ],
            }),
            new Paragraph({ text: '' }),
        ];

        messages.forEach((msg) => {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: msg.role, bold: true, size: 24 }),
                    ],
                })
            );

            msg.text.split('\n').forEach((line) => {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: line, size: 22 })],
                    })
                );
            });
            children.push(new Paragraph({ text: '' }));
        });

        const documentFile = new Document({
            sections: [{ children }],
        });

        const blob = await Packer.toBlob(documentFile);
        downloadBlob(
            blob,
            `${fileBase}_${new Date().toISOString().slice(0, 10)}.docx`
        );
        showToast('DOCX downloaded', 'success');
    } catch (error) {
        console.error('[hypergravity] DOCX export error:', error);
        showToast('DOCX export requires docx dependency', 'error');
    }
}

function printChat() {
    const messages = getChatHistory();
    if (!messages.length) {
        showToast('Cannot print empty chat', 'error');
        return;
    }

    const chat = findActiveChatInfo();
    const title = chat?.title || 'Gemini Chat';
    const html = `
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Google Sans Text', Roboto, Arial, sans-serif; padding: 24px; max-width: 900px; margin: 0 auto; }
                    .msg { margin-bottom: 22px; }
                    .role { font-weight: 700; margin-bottom: 8px; }
                    .text { white-space: pre-wrap; line-height: 1.5; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p>Exported using hypergravity on: ${new Date().toLocaleString()}</p>
                ${messages
                    .map(
                        (msg) =>
                            `<div class="msg"><div class="role">${msg.role}</div><div class="text">${msg.text
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;')
                                .replace(/>/g, '&gt;')}</div></div>`
                    )
                    .join('')}
            </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Please allow popups to print', 'error');
        return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 300);
}

function copyChatToClipboard() {
    const messages = getChatHistory();
    if (!messages.length) {
        showToast('Cannot copy empty chat', 'error');
        return;
    }

    const chat = findActiveChatInfo();
    const title = chat?.title || 'Gemini Chat';
    const text = formatTextExport(messages, title);

    navigator.clipboard
        .writeText(text)
        .then(() => showToast('Chat copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy chat', 'error'));
}

function closeExportPopup() {
    document.querySelector('#hg-export-popup-overlay')?.remove();
}

function showExportPopup() {
    closeExportPopup();

    const overlay = document.createElement('div');
    overlay.id = 'hg-export-popup-overlay';
    overlay.className = 'hg-export-overlay';

    const popup = document.createElement('div');
    popup.className = 'hg-export-popup';
    popup.innerHTML = `
        <div class="hg-export-header">
            <h3>Export Chat</h3>
            <button class="hg-export-close" type="button" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
        </div>
        <div class="hg-export-actions">
            <button data-format="copy" class="hg-export-action">Copy to Clipboard</button>
            <button data-format="txt" class="hg-export-action">Export as .txt</button>
            <button data-format="pdf" class="hg-export-action">Export as .pdf</button>
            <button data-format="docx" class="hg-export-action">Export as .docx</button>
            <button data-format="print" class="hg-export-action">Print Chat</button>
        </div>
    `;

    popup
        .querySelector('.hg-export-close')
        ?.addEventListener('click', closeExportPopup);
    popup.querySelectorAll('.hg-export-action').forEach((button) => {
        button.addEventListener('click', async () => {
            const format = button.getAttribute('data-format');
            if (format === 'copy') copyChatToClipboard();
            if (format === 'txt') exportChatAsText();
            if (format === 'pdf') await exportChatAsPdf();
            if (format === 'docx') await exportChatAsDocx();
            if (format === 'print') printChat();
            closeExportPopup();
        });
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeExportPopup();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
}

async function updateWideChatClass() {
    const settings = await getSettings();
    const shouldApply =
        Boolean(settings.wideModeEnabled) &&
        !window.location.pathname.includes('/gems/');

    const wideTargets = document.querySelectorAll(
        [
            '.conversation-container',
            'conversation-container',
            'user-query',
            'model-response',
            '.response-container',
            'response-container',
            'message-content',
            '.markdown-main-panel',
            'input-container',
            '.input-area-container',
            '.text-input-field',
            'infinite-scroller.chat-history',
        ].join(', ')
    );

    wideTargets.forEach((node) => {
        if (shouldApply) {
            node.style.setProperty('max-width', '100%', 'important');
            node.style.setProperty('width', '100%', 'important');
            node.style.setProperty('margin-left', '0', 'important');
            node.style.setProperty('margin-right', '0', 'important');
        } else {
            node.style.removeProperty('max-width');
            node.style.removeProperty('width');
            node.style.removeProperty('margin-left');
            node.style.removeProperty('margin-right');
        }
    });

    document.body.classList.toggle('hg-wide-chat', shouldApply);

    const wideButton = document.querySelector('#hg-header-wide-btn');
    if (wideButton) {
        wideButton.classList.toggle('hg-wide-active', shouldApply);
    }
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

function injectHeaderButtons() {
    const topBar = document.querySelector('top-bar-actions');
    if (!topBar) return;

    let wideButton = document.querySelector('#hg-header-wide-btn');
    if (!wideButton) {
        wideButton = document.createElement('button');
        wideButton.id = 'hg-header-wide-btn';
        wideButton.className = 'hg-header-btn';
        wideButton.title = 'Toggle Wide Chat';
        wideButton.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path class="hg-arrow-left" d="M9 5l-7 7 7 7V5z"/>
                <path class="hg-arrow-right" d="M15 5v14l7-7-7-7z"/>
            </svg>
        `;
        wideButton.addEventListener('click', async () => {
            const settings = await getSettings();
            await updateSettings({
                wideModeEnabled: !settings.wideModeEnabled,
            });
            updateWideChatClass();
        });
        topBar.appendChild(wideButton);
    }

    updateWideChatClass();

    getSettings().then((settings) => {
        const shouldShowExport = settings.showExportButton !== false;
        const existingExport = document.querySelector('#hg-header-export-btn');

        if (!shouldShowExport) {
            existingExport?.remove();
            return;
        }

        if (!existingExport) {
            const exportButton = document.createElement('button');
            exportButton.id = 'hg-header-export-btn';
            exportButton.className = 'hg-header-btn';
            exportButton.title = 'Export Chat';
            exportButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            `;
            exportButton.addEventListener('click', showExportPopup);
            topBar.appendChild(exportButton);
        }
    });
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
    injectHeaderButtons();

    const menuRoots = document.querySelectorAll(
        '.cdk-overlay-pane, mat-menu-panel, .mat-mdc-menu-panel'
    );
    menuRoots.forEach((menuRoot) => injectAddToFolderOption(menuRoot));

    const currentUrl = window.location.href;
    if (currentUrl !== lastWideChatUrl) {
        lastWideChatUrl = currentUrl;
        updateWideChatClass();
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// Try to insert on initial load
insertHypergravitySidebar();
insertChatTools();
injectHeaderButtons();
updateWideChatClass();

document.addEventListener('click', handleGlobalMenuButtonTracking, true);

if (hasChromeStorage()) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (changes[SETTINGS_KEY]) {
            injectHeaderButtons();
            updateWideChatClass();
        }
    });
}
