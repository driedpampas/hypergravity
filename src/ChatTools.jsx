import React, { useState, useEffect } from 'react';
import './ChatTools.css';
import { useChromeStorage } from './hooks/useChromeStorage';
import { TokenCounter } from './TokenCounter';
import { countText } from './utils/textStats';

export function ChatTools() {
    const [textStats, setTextStats] = useState(countText(''));
    const [isExpanded, setIsExpanded] = useState(false);
    const [quickActions, setQuickActions] = useChromeStorage(
        'quickActions',
        []
    );

    // Update text stats when the user types
    useEffect(() => {
        const updateCount = () => {
            const inputEl =
                document.querySelector('.ql-editor[contenteditable="true"]') ||
                document.querySelector('textarea[placeholder*="Enter"]') ||
                document.querySelector(
                    '[contenteditable="true"][role="textbox"]'
                );

            if (!inputEl) {
                return;
            }

            const text = inputEl.innerText || inputEl.value || '';
            setTextStats(countText(text));
        };

        updateCount();
        document.addEventListener('input', updateCount);
        document.addEventListener('keyup', updateCount);

        const interval = setInterval(updateCount, 1000); // Fail-safe polling

        return () => {
            document.removeEventListener('input', updateCount);
            document.removeEventListener('keyup', updateCount);
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            <div
                className="hg-chat-tools-left"
                style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    id="hg-word-counter"
                    className={isExpanded ? 'expanded' : ''}
                    onClick={() => setIsExpanded(!isExpanded)}
                    tabIndex="0"
                >
                    <div className="hg-counter-summary">
                        <strong>{textStats.words}</strong>&nbsp;words /&nbsp;
                        <strong>{textStats.chars}</strong>&nbsp;characters
                    </div>
                    {isExpanded && (
                        <div className="hg-counter-details">
                            <div className="hg-stat-row">
                                <span>Chars (space):</span>{' '}
                                <strong>{textStats.chars}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Chars (no space):</span>{' '}
                                <strong>{textStats.charsNoSpace}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Words:</span>{' '}
                                <strong>{textStats.words}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Sentences:</span>{' '}
                                <strong>{textStats.sentences}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Paragraphs:</span>{' '}
                                <strong>{textStats.paragraphs}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Lines:</span>{' '}
                                <strong>{textStats.lines}</strong>
                            </div>
                            <div className="hg-stat-row">
                                <span>Tokens (~est):</span>{' '}
                                <strong>{textStats.tokens}</strong>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    id="hg-optimize-prompt-btn"
                    className="hg-optimize-btn"
                    title="Optimize prompt with AI"
                    aria-label="Optimize prompt with AI"
                >
                    <svg
                        className="hg-optimize-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width="18"
                        height="18"
                    >
                        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                        <path d="M20 3v4" />
                        <path d="M22 5h-4" />
                        <path d="M4 17v2" />
                        <path d="M5 18H3" />
                    </svg>
                    <span className="hg-optimize-label">Optimize</span>
                </button>

                {/* Render matching Quick Actions */}
                <div
                    id="hg-quick-action-buttons"
                    style={{
                        display: 'flex',
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
                                const inputEl = document.querySelector(
                                    '.ql-editor[contenteditable="true"]'
                                );
                                if (inputEl) {
                                    inputEl.innerText = action.prompt;
                                    inputEl.dispatchEvent(
                                        new Event('input', { bubbles: true })
                                    );
                                }
                            }}
                        >
                            {action.icon && (
                                <span style={{ marginRight: '4px' }}>
                                    {action.icon}
                                </span>
                            )}
                            <span className="hg-optimize-label">
                                {action.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div
                className="hg-chat-tools-right"
                style={{
                    display: 'flex',
                    marginLeft: 'auto',
                    alignItems: 'center',
                }}
            >
                <TokenCounter />
            </div>
        </>
    );
}
