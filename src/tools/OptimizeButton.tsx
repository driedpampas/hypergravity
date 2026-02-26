import { useState, useEffect } from 'preact/hooks';
import { CheckIcon, CloseIcon, OptimizeSparkleIcon } from '@icons';
import { createPromptOptimizer } from '@features/promptOptimizer';

function showToast(
    message: string,
    type: 'info' | 'success' | 'error' = 'info'
) {
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
                    type="button"
                    class="hg-confirm-btn hg-confirm-reject"
                    title="Undo changes (Escape)"
                    onClick={optimizer.rejectChanges}
                >
                    <CloseIcon width="16" height="16" strokeWidth="2.5" />
                </button>
                <button
                    type="button"
                    class="hg-confirm-btn hg-confirm-accept"
                    title="Accept changes (Enter)"
                    onClick={optimizer.acceptChanges}
                >
                    <CheckIcon width="16" height="16" />
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
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
                    <OptimizeSparkleIcon
                        class="hg-optimize-icon"
                        width="18"
                        height="18"
                    />
                    <span class="hg-optimize-label">Optimize</span>
                </>
            )}
        </button>
    );
}
