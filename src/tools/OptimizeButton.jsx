import { useState, useEffect } from 'preact/hooks';
import { createPromptOptimizer } from '../features/promptOptimizer';

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

export function OptimizeButton() {
    const [optimizeState, setOptimizeState] = useState('idle');

    useEffect(() => {
        optimizer.setStateChangeCallback(setOptimizeState);
    }, []);

    if (optimizeState === 'confirmation') {
        return (
            <div class="hg-optimize-confirmation">
                <button
                    class="hg-confirm-btn hg-confirm-reject"
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
                    class="hg-confirm-btn hg-confirm-accept"
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
            class={`hg-optimize-btn ${optimizeState === 'loading' ? 'loading' : ''}`}
            title="Optimize prompt with AI"
            aria-label="Optimize prompt with AI"
            onClick={optimizer.handleOptimizeClick}
        >
            {optimizeState === 'loading' ? (
                <span class="hg-optimize-label">Stop</span>
            ) : (
                <>
                    <svg
                        class="hg-optimize-icon"
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
                    <span class="hg-optimize-label">Optimize</span>
                </>
            )}
        </button>
    );
}
