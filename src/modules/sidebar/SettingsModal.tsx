import { useStorage } from '@hooks/useStorage';
import { BackArrowIcon, BlurOnIcon, ChevronRightIcon, EyeOffIcon } from '@icons';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';
import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import './SettingsModal.css';

type Settings = typeof DEFAULT_SETTINGS;
type SettingKey = keyof Settings;
type ToastType = 'info' | 'success' | 'error';
type BooleanSettingKey = {
    [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

export type OptionItem = {
    label: string;
    value: string;
};

type ModalProps = {
    onClose: () => void;
};

export type SettingRowProps = {
    label: string;
    settingKey: BooleanSettingKey;
    description?: string;
};

export type SelectRowProps = {
    label: string;
    settingKey: SettingKey;
    description?: string;
    options: OptionItem[];
};

// Settings page system:
// Each page is a plain object. Push into SETTINGS_PAGES to register a new page.

export type SettingsRenderContext = {
    settings: Settings;
    setSettings: (s: Settings) => void;
    SettingRow: (props: SettingRowProps) => JSX.Element;
    SelectRow: (props: SelectRowProps) => JSX.Element;
};

export type SettingsPageDef = {
    /** Unique stable identifier used as the navigation key. */
    id: string;
    /** Short title shown in the nav list and sub-page header. */
    title: string;
    /** One-line subtitle shown in the nav entry. */
    description: string;
    /** Optional icon rendered left of the title in the nav list. */
    icon?: JSX.Element;
    /** Render the page body. Receives helpers so the page needs no own state. */
    render: (ctx: SettingsRenderContext) => JSX.Element;
};

/**
 * Registry of all settings sub-pages.
 * Push a SettingsPageDef here from any module to add a new page.
 */
export const SETTINGS_PAGES: SettingsPageDef[] = [];

// Built-in page registrations

SETTINGS_PAGES.push({
    id: 'navigation',
    title: 'Navigation',
    description: 'Sidebar, wide mode, and top-bar behavior',
    render: ({ SettingRow, SelectRow }) => (
        <>
            <SettingRow
                label="Enable Folders"
                settingKey="foldersEnabled"
                description="Organize your chats into custom folders"
            />
            <SettingRow
                label="Hide Sidebar"
                settingKey="hideSidebarEnabled"
                description="Collapse the native Gemini sidebar by default"
            />
            <SettingRow
                label="Show Collapsed Sidebar Buttons"
                settingKey="showCollapsedSidebarButtons"
                description="Show Hypergravity quick buttons when Gemini sidebar is collapsed"
            />
            <SettingRow
                label="Theme Sidebar Icons"
                settingKey="themeSidebarIcons"
                description="Use Gemini's default sidebar icon color for Hypergravity and Memories icons"
            />
            <SettingRow
                label="Wide Mode"
                settingKey="wideModeEnabled"
                description="Expand chat width to utilize full screen space"
            />
            <SettingRow
                label="Show Export Button"
                settingKey="showExportButton"
                description="Add chat export button in the top action bar"
            />
            <SettingRow
                label="Remove Upsell Button"
                settingKey="removeUpsellButton"
                description="Hide Gemini's dynamic upsell button from the top bar"
            />
            <SelectRow
                label="Branch Chat Opens In"
                settingKey="chatBranchTarget"
                description="Choose whether branched chats reuse this window or open in a separate window"
                options={[
                    { label: 'Same window', value: 'same_window' },
                    { label: 'Separate window', value: 'new_window' },
                ]}
            />
        </>
    ),
});

SETTINGS_PAGES.push({
    id: 'chat-memories',
    title: 'Chat Memories',
    description: 'Memory summaries and mention expansion behavior',
    render: ({ SettingRow, SelectRow }) => (
        <>
            <SettingRow
                label="Chat Memory Summaries"
                settingKey="chatMemoryEnabled"
                description="Use temporary Flash chats to summarize and save memory per conversation"
            />
            <SelectRow
                label="Memory Mention Behavior"
                settingKey="memoryMentionMode"
                description="Choose how <hg-chat-memories-...> tags are expanded before sending"
                options={[
                    {
                        label: 'Auto (leading inject, inline refs)',
                        value: 'auto',
                    },
                    {
                        label: 'Always references',
                        value: 'references',
                    },
                    {
                        label: 'Always inject at top',
                        value: 'inject',
                    },
                ]}
            />
        </>
    ),
});

SETTINGS_PAGES.push({
    id: 'chat-tools',
    title: 'Chat Tools',
    description: 'Input area controls, scroll helpers, and chatbox style',
    render: ({ SettingRow }) => (
        <>
            <SettingRow
                label="Auto-scroll"
                settingKey="autoScrollEnabled"
                description="Automatically scroll to bottom when generating"
            />
            <SettingRow
                label="Show Scroll Buttons"
                settingKey="showScrollButtons"
                description="Add scroll up/down controls in the chat tools"
            />
            <SettingRow
                label="Chatbox Header Strip"
                settingKey="chatboxStyleEnabled"
                description="Show tools in a raised strip above the input area"
            />
            <SettingRow
                label="Compact Chatbox"
                settingKey="chatboxCompactEnabled"
                description="Tighten input-area padding and shrink native action buttons"
            />
        </>
    ),
});

SETTINGS_PAGES.push({
    id: 'privacy',
    title: 'Blur Chats',
    description: 'Blur message and title content for privacy',
    icon: <BlurOnIcon width="18" height="18" />,
    render: ({ SettingRow }) => (
        <>
            <SettingRow
                label="Blur Chats"
                settingKey="privacyModeEnabled"
                description="Enable blur controls across chats and chat titles"
            />
            <SettingRow
                label="Blur All Sidebar Chats"
                settingKey="privacyBlurEverything"
                description="Blur every chat in the sidebar instead of only selected Blur Chats"
            />
            <SettingRow
                label="Blur User Requests"
                settingKey="privacyBlurUserRequests"
                description="Blur your prompts until hovered"
            />
            <SettingRow
                label="Blur AI Responses"
                settingKey="privacyBlurAiResponses"
                description="Blur Gemini responses until hovered"
            />
            <SettingRow
                label="Blur Input While Typing"
                settingKey="privacyBlurInput"
                description="Blur current input content until hovered"
            />
        </>
    ),
});

SETTINGS_PAGES.push({
    id: 'hide-chat',
    title: 'Hide Chat',
    description: 'Control hidden chat visibility and access behavior',
    icon: <EyeOffIcon width="18" height="18" />,
    render: ({ SettingRow }) => (
        <>
            <SettingRow
                label="Enable Hide Chat"
                settingKey="hideChatsEnabled"
                description="Allow hidden chats to be managed and accessed from the hidden chats menu"
            />
            <SettingRow
                label="Keep Hidden Chats Inaccessible When Disabled"
                settingKey="hideChatsKeepInaccessibleWhenDisabled"
                description="When Hide Chat is disabled, keep hidden chats blocked from all UI instead of restoring them"
            />
        </>
    ),
});

SETTINGS_PAGES.push({
    id: 'token-counter',
    title: 'Token Counter',
    description: 'Display mode, API key, and context limit',
    render: ({ settings, setSettings, SelectRow }) => (
        <>
            <SelectRow
                label="Token Counter Display"
                settingKey="tokenCounterMode"
                description="Choose how context usage is shown"
                options={[
                    { label: 'None', value: 'none' },
                    { label: 'Text', value: 'text' },
                    { label: 'Percentage', value: 'percentage' },
                    { label: 'Text + %', value: 'text_percentage' },
                    { label: 'Ring', value: 'ring' },
                    { label: 'Ring + Text', value: 'ring_text' },
                    { label: 'Ring + %', value: 'ring_percentage' },
                    { label: 'Ring + Text + %', value: 'ring_text_percentage' },
                ]}
            />
            <div class="hg-setting-row hg-setting-row-input">
                <div class="hg-setting-info">
                    <span class="hg-setting-label">Gemini API Key</span>
                    <span class="hg-setting-desc">
                        Used for exact token counts via Gemini countTokens API
                    </span>
                </div>
                <input
                    type="text"
                    class="hg-setting-input"
                    value={settings.geminiApiKey || ''}
                    onInput={(event: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                        setSettings({ ...settings, geminiApiKey: event.currentTarget.value })
                    }
                    onClick={(event) => event.stopPropagation()}
                    placeholder="AIza..."
                    spellcheck={false}
                    autoComplete="off"
                />
            </div>
            <div class="hg-setting-row hg-setting-row-input">
                <div class="hg-setting-info">
                    <span class="hg-setting-label">Token Limit</span>
                    <span class="hg-setting-desc">
                        The context size used for the progress ring calculation
                    </span>
                </div>
                <input
                    type="number"
                    class="hg-setting-input hg-setting-input-number"
                    value={settings.tokenLimit || 1000000}
                    onInput={(event: JSX.TargetedEvent<HTMLInputElement, Event>) =>
                        setSettings({
                            ...settings,
                            tokenLimit: parseInt(event.currentTarget.value, 10) || 0,
                        })
                    }
                    onClick={(event) => event.stopPropagation()}
                    step="100000"
                    min="1000"
                />
            </div>
        </>
    ),
});

export function SettingsModal({ onClose }: ModalProps) {
    const [settings, setSettings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const [activePage, setActivePage] = useState<string | null>(null);

    const showToast = (message: string, type: ToastType = 'info') => {
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
    };

    const toggleSetting = (key: BooleanSettingKey): void => {
        if (key === 'enabled') {
            const currentlyOn = Boolean(settings.enabled);
            const newVal = !currentlyOn;
            const promptMsg = newVal
                ? "Hypergravity will be enabled, but features won't appear until you reload the page. Reload now?"
                : 'Hypergravity will be disabled, but existing features remain until you reload. Reload now? The reload may interrupt open chats.';
            const reloadNow = window.confirm(promptMsg);

            setSettings({ ...settings, [key]: newVal });

            if (reloadNow) {
                window.location.reload();
            } else {
                const notice = newVal
                    ? 'Hypergravity enabled. Please refresh the page for features to take effect.'
                    : 'Hypergravity disabled. Please refresh the page for changes to take effect.';
                showToast(notice, 'info');
            }
            return;
        }
        setSettings({ ...settings, [key]: !settings[key] } as Settings);
    };

    // Row helpers shared between home page and all sub-pages via context.
    const SettingRow = ({ label, settingKey, description }: SettingRowProps) => (
        <button class="hg-setting-row" type="button" onClick={() => toggleSetting(settingKey)}>
            <div class="hg-setting-info">
                <span class="hg-setting-label">{label}</span>
                {description && <span class="hg-setting-desc">{description}</span>}
            </div>
            <div class={`hg-toggle ${settings[settingKey] ? 'active' : ''}`}>
                <div class="hg-toggle-knob"></div>
            </div>
        </button>
    );

    const SelectRow = ({ label, settingKey, description, options }: SelectRowProps) => (
        <div class="hg-setting-row hg-setting-row-input">
            <div class="hg-setting-info">
                <span class="hg-setting-label">{label}</span>
                {description && <span class="hg-setting-desc">{description}</span>}
            </div>
            <select
                class="hg-setting-select"
                value={String(settings[settingKey])}
                onChange={(event: JSX.TargetedEvent<HTMLSelectElement, Event>) => {
                    event.stopPropagation();
                    setSettings({
                        ...settings,
                        [settingKey]: event.currentTarget.value,
                    } as Settings);
                }}
                onClick={(event) => event.stopPropagation()}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );

    const ctx: SettingsRenderContext = { settings, setSettings, SettingRow, SelectRow };

    const currentPage = activePage ? SETTINGS_PAGES.find((p) => p.id === activePage) : null;

    const handleBack = () => {
        if (activePage) {
            setActivePage(null);
        } else {
            onClose();
        }
    };

    const headerTitle = currentPage ? currentPage.title : 'Settings';

    return (
        // biome-ignore lint/a11y/useSemanticElements: it's a dialog.
        <div
            class="hg-dialog-overlay"
            role="button"
            tabIndex={0}
            aria-label="Close settings dialog"
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    handleBack();
                }
            }}
        >
            <div
                class="hg-settings-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="hg-settings-title"
            >
                <div class="hg-settings-header">
                    <div class="hg-settings-header-left">
                        <button class="hg-back-btn" type="button" onClick={handleBack}>
                            <BackArrowIcon width="20" height="20" />
                        </button>
                        <h2 id="hg-settings-title">{headerTitle}</h2>
                    </div>
                </div>

                <div class="hg-settings-body">
                    {currentPage ? (
                        // Sub-page
                        <div class={`hg-settings-page hg-settings-page-${currentPage.id}`}>
                            {currentPage.render(ctx)}
                        </div>
                    ) : (
                        // Home page
                        <div class="hg-settings-home">
                            <div class="hg-settings-home-section">
                                <SettingRow
                                    label="Enable Hypergravity"
                                    settingKey="enabled"
                                    description="Master switch to toggle all features"
                                />
                            </div>

                            <nav class="hg-settings-nav" aria-label="Settings pages">
                                {SETTINGS_PAGES.map((page) => (
                                    <button
                                        key={page.id}
                                        class="hg-settings-nav-item"
                                        type="button"
                                        onClick={() => setActivePage(page.id)}
                                    >
                                        {page.icon && (
                                            <span class="hg-settings-nav-icon">{page.icon}</span>
                                        )}
                                        <div class="hg-settings-nav-info">
                                            <span class="hg-settings-nav-title">{page.title}</span>
                                            <span class="hg-settings-nav-desc">
                                                {page.description}
                                            </span>
                                        </div>
                                        <ChevronRightIcon
                                            class="hg-settings-nav-chevron"
                                            width="16"
                                            height="16"
                                        />
                                    </button>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
