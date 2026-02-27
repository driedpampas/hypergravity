import './content.css';

import { insertChatTools, insertHypergravitySidebar } from '@content/domInjection';
import { createFoldersMenuManager } from '@content/features/foldersMenu';
import { createAtMentionsMemoriesManager } from '@content/features/memories';
import { registerTokenCacheMessageHandler } from '@content/features/tokenCacheMessageHandler';
import { findActiveChatInfo, getAccountAwareUrl } from '@content/helpers/chatInfo';
import {
    applyChatboxHeaderStyleSetting,
    getSettings,
    updateSettings,
} from '@content/helpers/settings';
import { showToast } from '@content/helpers/toast';
import { ChatExportController } from '@features/chatExport';
import { createChatMemoryManager } from '@features/chatMemoryManager';
import { createTopBarToolsManager } from '@features/topBarToolsManager';
import { addStorageListener } from '@utils/browserEnv';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';

let lastWideChatUrl = window.location.href;
let chatExportController: ChatExportController | null = null;
let topBarToolsManager: ReturnType<typeof createTopBarToolsManager> | null = null;
let chatMemoryManager: ReturnType<typeof createChatMemoryManager> | null = null;
let atMentionsMemoriesManager: ReturnType<typeof createAtMentionsMemoriesManager> | null = null;
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

    if (!atMentionsMemoriesManager) {
        atMentionsMemoriesManager = createAtMentionsMemoriesManager();
    }
}

function refreshInjectedUi() {
    if (!document.querySelector('#hypergravity-root')) {
        insertHypergravitySidebar();
    }
    insertChatTools();
    topBarToolsManager?.refresh();
    chatMemoryManager?.refresh();
    atMentionsMemoriesManager?.refresh();

    const menuRoots = document.querySelectorAll('.conversation-actions-menu');

    for (const root of menuRoots) {
        foldersMenuManager.injectAddToFolderOption(root);
    }
}

function removeInjectedUi() {
    document.querySelector('#hypergravity-root')?.remove();
    document.querySelector('#hypergravity-chat-tools-root')?.remove();
    atMentionsMemoriesManager?.cleanup();
}

let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const observer = new MutationObserver(() => {
    if (mutationDebounceTimer) {
        clearTimeout(mutationDebounceTimer);
    }
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

document.addEventListener('click', foldersMenuManager.handleGlobalMenuButtonTracking, true);

addStorageListener(SETTINGS_KEY, (newValue) => {
    const settings: typeof DEFAULT_SETTINGS = {
        ...DEFAULT_SETTINGS,
        ...((newValue as Partial<typeof DEFAULT_SETTINGS>) || {}),
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
