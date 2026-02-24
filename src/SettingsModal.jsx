import { useStorage } from './hooks/useStorage';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from './utils/constants';
import './SettingsModal.css';

export function SettingsModal({ onClose }) {
    const [settings, setSettings] = useStorage(
        SETTINGS_KEY,
        DEFAULT_SETTINGS
    );

    // lightweight toast helper copied from content.jsx
    const showToast = (message, type = 'info') => {
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

    const toggleSetting = (key) => {
        // master switch needs a warning/reload because most features are
        // initialized at page load and won't disappear immediately.
        if (key === 'enabled') {
            const currentlyOn = Boolean(settings.enabled);
            const newVal = !currentlyOn;
            const promptMsg = newVal
                ? 'Hypergravity will be enabled, but features won\'t appear until you reload the page. Reload now?'
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

    const SelectRow = ({ label, settingKey, description, options }) => (
        <div class="hg-setting-row hg-setting-row-input">
            <div class="hg-setting-info">
                <span class="hg-setting-label">{label}</span>
                {description && (
                    <span class="hg-setting-desc">{description}</span>
                )}
            </div>
            <select
                class="hg-setting-select"
                value={settings[settingKey]}
                onChange={(e) => {
                    e.stopPropagation();
                    setSettings({ ...settings, [settingKey]: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
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
