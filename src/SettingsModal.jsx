import React from 'react';
import { useChromeStorage } from './hooks/useChromeStorage';
import './SettingsModal.css';

export function SettingsModal({ onClose }) {
    const [settings, setSettings] = useChromeStorage(
        'hypergravityGeminiSettings',
        {
            enabled: true,
            foldersEnabled: true,
            autoScrollEnabled: false,
            wideModeEnabled: false,
            hideSidebarEnabled: false,
            showExportButton: true,
            showTokenLabel: true,
            geminiApiKey: '',
            tokenLimit: 1048576,
        }
    );

    const toggleSetting = (key) => {
        setSettings({ ...settings, [key]: !settings[key] });
    };

    const SettingRow = ({ label, settingKey, description }) => (
        <div
            className="hg-setting-row"
            onClick={() => toggleSetting(settingKey)}
        >
            <div className="hg-setting-info">
                <span className="hg-setting-label">{label}</span>
                {description && (
                    <span className="hg-setting-desc">{description}</span>
                )}
            </div>
            <div
                className={`hg-toggle ${settings[settingKey] ? 'active' : ''}`}
            >
                <div className="hg-toggle-knob"></div>
            </div>
        </div>
    );

    return (
        <div className="hg-settings-modal">
            <div className="hg-settings-header">
                <div className="hg-settings-header-left">
                    <button className="hg-back-btn" onClick={onClose}>
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

            <div className="hg-settings-list">
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
                <SettingRow
                    label="Show Token Count Label"
                    settingKey="showTokenLabel"
                    description="Display token usage text next to the progress circle"
                />
                <div className="hg-setting-row hg-setting-row-input">
                    <div className="hg-setting-info">
                        <span className="hg-setting-label">Gemini API Key</span>
                        <span className="hg-setting-desc">
                            Used for exact token counts via Gemini countTokens
                            API
                        </span>
                    </div>
                    <input
                        type="text"
                        className="hg-setting-input"
                        value={settings.geminiApiKey || ''}
                        onChange={(event) =>
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

                <div className="hg-setting-row hg-setting-row-input">
                    <div className="hg-setting-info">
                        <span className="hg-setting-label">Token Limit</span>
                        <span className="hg-setting-desc">
                            The context size used for the progress ring
                            calculation
                        </span>
                    </div>
                    <input
                        type="number"
                        className="hg-setting-input hg-setting-input-number"
                        value={settings.tokenLimit || 1000000}
                        onChange={(event) =>
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
