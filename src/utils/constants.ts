export const SETTINGS_KEY = 'hypergravityGeminiSettings';
export const FOLDERS_KEY = 'hypergravityGeminiFolders';
export const WELCOME_SEEN_KEY = 'hypergravityWelcomeSeen';
export const CHAT_MEMORIES_KEY = 'hypergravityChatMemories';
export const PRIVACY_CHAT_KEY_PREFIX = 'hg_private_chat_';
export const HIDDEN_CHAT_KEY_PREFIX = 'hg_hidden_chat_';

export const DEFAULT_SETTINGS = {
    enabled: true,
    foldersEnabled: true,
    chatMemoryEnabled: true,
    themeSidebarIcons: false,
    showCollapsedSidebarButtons: true,
    memoryMentionMode: 'auto',
    autoScrollEnabled: false,
    wideModeEnabled: false,
    hideSidebarEnabled: false,
    showExportButton: true,
    chatboxStyleEnabled: false,
    chatboxCompactEnabled: false,
    privacyModeEnabled: false,
    privacyBlurUserRequests: true,
    privacyBlurAiResponses: true,
    privacyBlurInput: false,
    privacyBlurEverything: false,
    hideChatsEnabled: true,
    hideChatsKeepInaccessibleWhenDisabled: false,
    tokenCounterMode: 'ring_text',
    showScrollButtons: true,
    geminiApiKey: '',
    tokenLimit: 1048576,
};
