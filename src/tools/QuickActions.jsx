import React from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { chatBoxManager } from '../managers/chatBoxManager';

export function QuickActions() {
    const [quickActions] = useChromeStorage('quickActions', []);

    if (!quickActions.length) return null;

    return (
        <div
            id="hg-quick-action-buttons"
            style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
            }}
        >
            {quickActions.map((action, idx) => (
                <button
                    key={idx}
                    className="hg-optimize-btn"
                    style={{
                        backgroundColor:
                            action.color ||
                            'var(--gem-sys-color--surface-container)',
                    }}
                    title={action.prompt || action.name}
                    onClick={() => {
                        chatBoxManager.setInputText(action.prompt);
                    }}
                >
                    {action.icon && (
                        <span className="hg-quick-action-icon">{action.icon}</span>
                    )}
                    <span className="hg-optimize-label">{action.name}</span>
                </button>
            ))}
        </div>
    );
}
