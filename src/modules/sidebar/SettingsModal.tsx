import { useStorage } from '@hooks/useStorage';
import { BackArrowIcon } from '@icons';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';
import type { JSX } from 'preact';
import './SettingsModal.css';

type Settings = typeof DEFAULT_SETTINGS;
type SettingKey = keyof Settings;
type ToastType = 'info' | 'success' | 'error';
type BooleanSettingKey = {
    [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

type OptionItem = {
    label: string;
    value: string;
};

type ModalProps = {
    onClose: () => void;
};

type SettingRowProps = {
    label: string;
    settingKey: BooleanSettingKey;
    description?: string;
};

type SelectRowProps = {
    label: string;
    settingKey: SettingKey;
    description?: string;
    options: OptionItem[];
};

export function SettingsModal({ onClose }: ModalProps) {
    const [settings, setSettings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);

    // lightweight toast helper copied from content.jsx
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
        // master switch needs a warning/reload because most features are
        // initialized at page load and won't disappear immediately.
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

    return (
        // biome-ignore lint/a11y/useSemanticElements: it's a dialog.
        <div
            class="hg-dialog-overlay"
            role="button"
            tabIndex={0}
            aria-label="Close settings dialog"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClose();
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
                        <button class="hg-back-btn" type="button" onClick={onClose}>
                            <BackArrowIcon width="20" height="20" />
                        </button>
                        <h2 id="hg-settings-title">Settings</h2>
                    </div>
                </div>

                <div class="hg-settings-list">
                    <SettingRow
                        label="Enable Hypergravity"
                        settingKey="enabled"
                        description="Master switch to toggle all features"
                    />
                    <SettingRow
                        label="Enable Folders"
                        settingKey="foldersEnabled"
                        description="Organize your chats into custom folders"
                    />
                    <SettingRow
                        label="Chat Memory Summaries"
                        settingKey="chatMemoryEnabled"
                        description="Use temporary Flash chats to summarize and save memory per conversation"
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
                        label="Auto-scroll"
                        settingKey="autoScrollEnabled"
                        description="Automatically scroll to bottom when generating"
                    />
                    <SettingRow
                        label="Hide Sidebar"
                        settingKey="hideSidebarEnabled"
                        description="Collapse the native Gemini sidebar by default"
                    />
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
                            {
                                label: 'Ring + Text + %',
                                value: 'ring_text_percentage',
                            },
                        ]}
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
                                setSettings({
                                    ...settings,
                                    geminiApiKey: event.currentTarget.value,
                                })
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
                </div>
            </div>
        </div>
    );
}
