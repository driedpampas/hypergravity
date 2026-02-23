import React, { useState, useEffect, useRef } from 'react';
import './ChatTools.css';
import { useChromeStorage } from './hooks/useChromeStorage';
import { TokenCounter } from './TokenCounter';
import { countText } from './utils/textStats';
import { createPromptOptimizer } from './features/promptOptimizer';

function showToast(message, type = 'info') {
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
}

const optimizer = createPromptOptimizer({ showToast });

export function ChatTools() {
    const [textStats, setTextStats] = useState(countText(''));
    const [isExpanded, setIsExpanded] = useState(false);
    const [optimizeState, setOptimizeState] = useState('idle');
    const [quickActions, setQuickActions] = useChromeStorage(
        'quickActions',
        []
    );

    useEffect(() => {
        optimizer.setStateChangeCallback(setOptimizeState);
    }, []);

    useEffect(() => {
        const updateCount = () => {
            const inputEl =
                document.querySelector('.ql-editor[contenteditable="true"]') ||
                document.querySelector('textarea[placeholder*="Enter"]') ||
                document.querySelector(
                    '[contenteditable="true"][role="textbox"]'
                );

            if (!inputEl) return;
            const text = inputEl.innerText || inputEl.value || '';
            setTextStats(countText(text));
        };

        updateCount();
        document.addEventListener('input', updateCount);
        document.addEventListener('keyup', updateCount);
        const interval = setInterval(updateCount, 1000);

        return () => {
            document.removeEventListener('input', updateCount);
            document.removeEventListener('keyup', updateCount);
            clearInterval(interval);
        };
    }, []);

    const renderOptimizeButton = () => {
        if (optimizeState === 'confirmation') {
            return (
                <div className="hg-optimize-confirmation">
                    <button
                        className="hg-confirm-btn hg-confirm-reject"
                        title="Undo changes (Escape)"
                        onClick={optimizer.rejectChanges}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            width="16"
                            height="16"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                    <button
                        className="hg-confirm-btn hg-confirm-accept"
                        title="Accept changes (Enter)"
                        onClick={optimizer.acceptChanges}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            width="16"
                            height="16"
                        >
                            <path d="M20 6L9 17l-5-5" />
                        </svg>
                    </button>
                </div>
            );
        }

        return (
            <button
                id="hg-optimize-prompt-btn"
                className={`hg-optimize-btn ${optimizeState === 'loading' ? 'loading' : ''}`}
                title="Optimize prompt with AI"
                aria-label="Optimize prompt with AI"
                onClick={optimizer.handleOptimizeClick}
            >
                {optimizeState === 'loading' ? (
                    <span className="hg-optimize-label">Stop</span>
                ) : (
                    <>
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
                    </>
                )}
            </button>
        );
    };

    return (
        <>
            <div
                className="hg-chat-tools-left"
                style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexWrap: 'nowrap',
                    minWidth: 0,
                    maxWidth: '100%',
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

                {renderOptimizeButton()}

                <TokenCounter />

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
        </>
    );
}
