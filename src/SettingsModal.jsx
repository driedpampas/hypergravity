import React from 'react';
import { useChromeStorage } from './hooks/useChromeStorage';
import './SettingsModal.css';

export function SettingsModal({ onClose }) {
  const [settings, setSettings] = useChromeStorage('hypergravityGeminiSettings', {
    enabled: true,
    foldersEnabled: true,
    autoScrollEnabled: false,
    wideModeEnabled: false,
    hideSidebarEnabled: false,
  });

  const toggleSetting = (key) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const SettingRow = ({ label, settingKey, description }) => (
    <div className="sg-setting-row" onClick={() => toggleSetting(settingKey)}>
      <div className="sg-setting-info">
        <span className="sg-setting-label">{label}</span>
        {description && <span className="sg-setting-desc">{description}</span>}
      </div>
      <div className={`sg-toggle ${settings[settingKey] ? 'active' : ''}`}>
        <div className="sg-toggle-knob"></div>
      </div>
    </div>
  );

  return (
    <div className="sg-settings-modal">
      <div className="sg-settings-header">
        <div className="sg-settings-header-left">
          <button className="sg-back-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h2>Settings</h2>
        </div>
      </div>
      
      <div className="sg-settings-list">
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
           label="Auto-scroll" 
           settingKey="autoScrollEnabled" 
           description="Automatically scroll to bottom when generating" 
        />
        <SettingRow 
           label="Hide Sidebar" 
           settingKey="hideSidebarEnabled" 
           description="Collapse the native Gemini sidebar by default" 
        />
      </div>
    </div>
  );
}
