import React, { useState } from 'react';
import SvgComponent from './Icon';
import './Sidebar.css';
import { useChromeStorage } from './hooks/useChromeStorage';
import { FoldersManager } from './FoldersManager';
import { SettingsModal } from './SettingsModal';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useChromeStorage('hypergravitySectionExpanded', true);
  const [activeMenu, setActiveMenu] = useState(null); // 'folders', 'settings'

  const toggleSection = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div id="sg-hypergravity-section" className="hypergravity-sidebar-container">
      {/* Header section (Toggle) */}
      <div 
        className="sg-section-header" 
        onClick={toggleSection}
        role="button"
        tabIndex={0}
      >
        <div className="sg-section-header-left">
          <span className="sg-section-title">hypergravity</span>
        </div>
        <svg 
          className="sg-section-chevron" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          style={{ 
            width: '16px', height: '16px', 
            color: '#727676',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            marginRight: '-5px'
          }} 
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>

      {/* Expanded Content View (Menu) */}
      <div className="sg-section-content" style={{ maxHeight: isExpanded ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.2s ease' }}>
        <div className="sg-dropdown-menu">
            
          <div className="sg-dropdown-item" onClick={() => setActiveMenu('folders')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sg-dropdown-icon">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Folders</span>
          </div>

          <div className="sg-dropdown-item" onClick={() => setActiveMenu('settings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="sg-dropdown-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </div>

        </div>
      </div>

      {activeMenu === 'folders' && <FoldersManager onClose={() => setActiveMenu(null)} />}
      {activeMenu === 'settings' && <SettingsModal onClose={() => setActiveMenu(null)} />}
    </div>
  );
}
