import { useChromeStorage } from './hooks/useChromeStorage';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from './utils/constants';
import './SettingsModal.css';

export function SettingsModal({ onClose }) {
    const [settings, setSettings] = useChromeStorage(
        SETTINGS_KEY,
        DEFAULT_SETTINGS
    );

    const toggleSetting = (key) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    const SettingRow = ({ label, settingKey, description }) => (
        <div
            class="hg-setting-row"
            onClick={() => toggleSetting(settingKey)}
        >
            <div class="hg-setting-info">
                <span class="hg-setting-label">{label}</span>
                {description && (
                    <span class="hg-setting-desc">{description}</span>
                )}
            </div>
            <div
                class={`hg-toggle ${settings[settingKey] ? 'active' : ''}`}
            >
                <div class="hg-toggle-knob"></div>
            </div>
        </div>
    );

    const ButtonGroupRow = ({ label, settingKey, description, options }) => (
        <div class="hg-setting-row hg-setting-row-group">
            <div class="hg-setting-info" style={{ flex: 1 }}>
                <span class="hg-setting-label">{label}</span>
                {description && (
                    <span class="hg-setting-desc">{description}</span>
                )}
            </div>
            <div class="hg-button-group">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        class={`hg-group-btn ${settings[settingKey] === opt.value ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSettings({
                                ...settings,
                                [settingKey]: opt.value,
                            });
                        }}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div class="hg-settings-modal">
            <div class="hg-settings-header">
                <div class="hg-settings-header-left">
                    <button class="hg-back-btn" onClick={onClose}>
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            width="20"
                            height="20"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h2>Settings</h2>
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
                <ButtonGroupRow
                    label="Token Counter Display"
                    settingKey="tokenCounterMode"
                    description="Choose how context usage is shown"
                    options={[
                        { label: 'Hidden', value: 'hidden' },
                        { label: 'Circle', value: 'circle' },
                        { label: 'Text', value: 'text' },
                        { label: 'Both', value: ' উভয়' }, // Note: both will map to just string "both"
                        { label: 'Both', value: 'both' },
                    ]
                        .slice(0, 3)
                        .concat([{ label: 'Both', value: 'both' }])}
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
                            Used for exact token counts via Gemini countTokens
                            API
                        </span>
                    </div>
                    <input
                        type="text"
                        class="hg-setting-input"
                        value={settings.geminiApiKey || ''}
                        onInput={(event) =>
                            setSettings({
                                ...settings,
                                geminiApiKey: event.target.value,
                            })
                        }
                        onClick={(event) => event.stopPropagation()}
                        placeholder="AIza..."
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>

                <div class="hg-setting-row hg-setting-row-input">
                    <div class="hg-setting-info">
                        <span class="hg-setting-label">Token Limit</span>
                        <span class="hg-setting-desc">
                            The context size used for the progress ring
                            calculation
                        </span>
                    </div>
                    <input
                        type="number"
                        class="hg-setting-input hg-setting-input-number"
                        value={settings.tokenLimit || 1000000}
                        onInput={(event) =>
                            setSettings({
                                ...settings,
                                tokenLimit:
                                    parseInt(event.target.value, 10) || 0,
                            })
                        }
                        onClick={(event) => event.stopPropagation()}
                        step="100000"
                        min="1000"
                    />
                </div>
            </div>
        </div>
    );
}
