import './content.css';

import { addStorageListener } from '@utils/browserEnv';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@utils/constants';
import { ChatExportController } from '@features/chatExport';
import { createChatMemoryManager } from '@features/chatMemoryManager';
import { createTopBarToolsManager } from '@features/topBarToolsManager';
import {
    applyChatboxHeaderStyleSetting,
    getSettings,
    updateSettings,
} from '@content/helpers/settings';
import {
    getAccountAwareUrl,
    findActiveChatInfo,
} from '@content/helpers/chatInfo';
import { showToast } from '@content/helpers/toast';
import {
    insertHypergravitySidebar,
    insertChatTools,
} from '@content/domInjection';
import { createFoldersMenuManager } from '@content/features/foldersMenu';
import { registerTokenCacheMessageHandler } from '@content/features/tokenCacheMessageHandler';

let lastWideChatUrl = window.location.href;
let chatExportController = null;
let topBarToolsManager = null;
let chatMemoryManager = null;
let hgEnabled = true;

const foldersMenuManager = createFoldersMenuManager({
    showToast,
    findActiveChatInfo,
    getAccountAwareUrl,
});

function initializeFeatureModules() {
    if (!hgEnabled) return;

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

function refreshInjectedUi() {
    if (!document.querySelector('#hypergravity-root')) {
        insertHypergravitySidebar();
    }
    insertChatTools();
    topBarToolsManager?.refresh();
    chatMemoryManager?.refresh();

    const menuRoots = document.querySelectorAll('.conversation-actions-menu');
    menuRoots.forEach((menuRoot) =>
        foldersMenuManager.injectAddToFolderOption(menuRoot)
    );
}

function removeInjectedUi() {
    document.querySelector('#hypergravity-root')?.remove();
    document.querySelector('#hypergravity-chat-tools-root')?.remove();
}

let mutationDebounceTimer = null;
const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
        if (!hgEnabled) return;

        refreshInjectedUi();

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

getSettings().then((settings) => {
    hgEnabled = Boolean(settings.enabled);
    applyChatboxHeaderStyleSetting(settings);

    if (!hgEnabled) return;

    initializeFeatureModules();
    refreshInjectedUi();
});

document.addEventListener(
    'click',
    foldersMenuManager.handleGlobalMenuButtonTracking,
    true
);

addStorageListener(SETTINGS_KEY, (newValue) => {
    const settings = {
        ...DEFAULT_SETTINGS,
        ...(newValue || {}),
    };
    hgEnabled = Boolean(settings.enabled);

    topBarToolsManager?.refresh();
    applyChatboxHeaderStyleSetting(settings);

    if (!hgEnabled) {
        removeInjectedUi();
        return;
    }

    initializeFeatureModules();
    refreshInjectedUi();
});

registerTokenCacheMessageHandler();
