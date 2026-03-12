import './content.css';
import '@app/content/host-overrides.css';

import { createChatBranchManager } from '@features/chatBranchManager';
import { ChatExportController } from '@features/chatExport';
import { createChatMemoryManager } from '@features/chatMemoryManager';
import { createHiddenChatsManager } from '@features/hiddenChatsManager';
import { createAtMentionsMemoriesManager } from '@features/memories';
import { createPrivacyModeManager } from '@features/privacyModeManager';
import { createTopBarToolsManager } from '@features/topBarToolsManager';
import { insertChatTools, insertHypergravitySidebar } from '@platform/content/domInjection';
import { createFoldersMenuManager } from '@platform/content/features/foldersMenu';
import { registerTokenCacheMessageHandler } from '@platform/content/features/tokenCacheMessageHandler';
import {
    applyChatboxHeaderStyleSetting,
    applyPrivacyModeSetting,
    getSettings,
    updateSettings,
} from '@platform/content/helpers/settings';
import { findActiveChatInfo, getAccountAwareUrl } from '@shared/chat/chatInfo';
import { showToast } from '@shared/ui/toast';
import { addStorageListener } from '@utils/browserEnv';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';

let lastWideChatUrl = window.location.href;
let chatExportController: ChatExportController | null = null;
let topBarToolsManager: ReturnType<typeof createTopBarToolsManager> | null = null;
let chatMemoryManager: ReturnType<typeof createChatMemoryManager> | null = null;
let chatBranchManager: ReturnType<typeof createChatBranchManager> | null = null;
let atMentionsMemoriesManager: ReturnType<typeof createAtMentionsMemoriesManager> | null = null;
let privacyModeManager: ReturnType<typeof createPrivacyModeManager> | null = null;
let hiddenChatsManager: ReturnType<typeof createHiddenChatsManager> | null = null;
let hgEnabled = true;
let uiRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const foldersMenuManager = createFoldersMenuManager({
    showToast,
    findActiveChatInfo,
    getAccountAwareUrl,
});

window.addEventListener('hg-privacy-chat-updated', (event: Event) => {
    const custom = event as CustomEvent<{
        chatId?: string;
        title?: string;
        enabled?: boolean;
    }>;

    if (custom?.detail?.chatId && typeof custom?.detail?.enabled === 'boolean') {
        privacyModeManager?.applyExternalUpdate({
            chatId: custom.detail.chatId,
            title: custom.detail.title,
            enabled: custom.detail.enabled,
        });
    }

    scheduleUiRefresh(0, false);
});

window.addEventListener('hg-hidden-chat-updated', (event: Event) => {
    const custom = event as CustomEvent<{
        chatId?: string;
        title?: string;
        enabled?: boolean;
    }>;

    if (custom?.detail?.chatId && typeof custom?.detail?.enabled === 'boolean') {
        hiddenChatsManager?.applyExternalUpdate({
            chatId: custom.detail.chatId,
            title: custom.detail.title,
            enabled: custom.detail.enabled,
        });
    }

    scheduleUiRefresh(0, false);
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
            onBranchClick: () => chatBranchManager?.startBranch(),
        });
    }

    if (!chatMemoryManager) {
        chatMemoryManager = createChatMemoryManager();
    }

    if (!chatBranchManager) {
        chatBranchManager = createChatBranchManager({
            getSettings,
            getBranchMarkdown: () => chatExportController?.getMarkdownExport() || null,
            showToast,
        });
    }

    if (!atMentionsMemoriesManager) {
        atMentionsMemoriesManager = createAtMentionsMemoriesManager();
    }

    if (!privacyModeManager) {
        privacyModeManager = createPrivacyModeManager({
            getSettings,
        });
    }

    if (!hiddenChatsManager) {
        hiddenChatsManager = createHiddenChatsManager({
            getSettings,
        });
    }
}

function refreshInjectedUi() {
    if (!document.querySelector('#hypergravity-root')) {
        insertHypergravitySidebar();
    }
    insertChatTools();
    topBarToolsManager?.refresh();
    chatMemoryManager?.refresh();
    chatBranchManager?.refresh();
    atMentionsMemoriesManager?.refresh();
    privacyModeManager?.refresh();
    hiddenChatsManager?.refresh();

    const menuRoots = document.querySelectorAll('.conversation-actions-menu');

    for (const root of menuRoots) {
        foldersMenuManager.injectAddToFolderOption(root);
    }
}

function scheduleUiRefresh(delay = 120, checkUrl = true) {
    if (!hgEnabled) return;

    if (uiRefreshTimer) {
        clearTimeout(uiRefreshTimer);
    }

    uiRefreshTimer = setTimeout(() => {
        uiRefreshTimer = null;
        if (!hgEnabled) return;

        refreshInjectedUi();

        if (checkUrl) {
            const currentUrl = window.location.href;
            if (currentUrl !== lastWideChatUrl) {
                lastWideChatUrl = currentUrl;
                topBarToolsManager?.refresh();
            }
        }
    }, delay);
}

function removeInjectedUi() {
    if (uiRefreshTimer) {
        clearTimeout(uiRefreshTimer);
        uiRefreshTimer = null;
    }

    document.querySelector('#hypergravity-root')?.remove();
    document.querySelector('#hypergravity-chat-tools-root')?.remove();
    chatBranchManager?.destroy();
    atMentionsMemoriesManager?.cleanup();
    privacyModeManager?.destroy();
    hiddenChatsManager?.destroy();
}

const observer = new MutationObserver(() => {
    scheduleUiRefresh(150, true);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

getSettings().then((settings) => {
    hgEnabled = Boolean(settings.enabled);
    applyChatboxHeaderStyleSetting(settings);
    applyPrivacyModeSetting(settings);

    if (!hgEnabled) return;

    initializeFeatureModules();
    scheduleUiRefresh(0, true);
});

document.addEventListener('click', foldersMenuManager.handleGlobalMenuButtonTracking, true);

addStorageListener(SETTINGS_KEY, (newValue) => {
    const settings: typeof DEFAULT_SETTINGS = {
        ...DEFAULT_SETTINGS,
        ...((newValue as Partial<typeof DEFAULT_SETTINGS>) || {}),
    };
    hgEnabled = Boolean(settings.enabled);

    applyChatboxHeaderStyleSetting(settings);
    applyPrivacyModeSetting(settings);

    if (!hgEnabled) {
        removeInjectedUi();
        return;
    }

    initializeFeatureModules();
    scheduleUiRefresh(0, true);
});

registerTokenCacheMessageHandler();
