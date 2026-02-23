function findPromptInput() {
    const selectors = [
        '.ql-editor[contenteditable="true"]',
        'div[contenteditable="true"][role="textbox"]',
        'textarea[placeholder*="Enter"]',
        'rich-textarea .ql-editor',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}

function getPromptText() {
    const el = findPromptInput();
    return (el && (el.textContent || el.value)) || '';
}

function setPromptText(text) {
    const el = findPromptInput();
    if (!el) return;

    if (el.getAttribute('contenteditable') === 'true') {
        el.innerHTML = '';
        text.split('\n').forEach((line) => {
            const p = document.createElement('p');
            p.textContent = line || '';
            if (!line) p.innerHTML = '<br>';
            el.appendChild(p);
        });
        el.classList.remove('ql-blank');
        el.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        if (el.lastChild) {
            range.selectNodeContents(el.lastChild);
            range.collapse(false);
        } else {
            range.selectNodeContents(el);
            range.collapse(false);
        }
        sel.removeAllRanges();
        sel.addRange(range);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        el.value = text;
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

export function createPromptOptimizer({ showToast }) {
    let isOptimizing = false;
    let preOptimizationPrompt = '';
    let onStateChange = null;

    function setStateChangeCallback(cb) {
        onStateChange = cb;
    }

    function emitState(state) {
        if (typeof onStateChange === 'function') onStateChange(state);
    }

    function acceptChanges() {
        preOptimizationPrompt = '';
        emitState('idle');
        showToast('Changes accepted', 'success');
    }

    function rejectChanges() {
        if (preOptimizationPrompt) {
            setPromptText(preOptimizationPrompt);
            showToast('Changes reverted', 'info');
        }
        preOptimizationPrompt = '';
        emitState('idle');
    }

    async function handleOptimizeClick() {
        if (isOptimizing) {
            isOptimizing = false;
            emitState('idle');
            showToast('Optimization cancelled', 'info');
            try {
                chrome.runtime.sendMessage({ type: 'CANCEL_OPTIMIZATION' });
            } catch {}
            return;
        }

        const promptText = getPromptText();
        if (!promptText || !promptText.trim()) {
            showToast('Please enter a prompt first', 'info');
            return;
        }

        isOptimizing = true;
        preOptimizationPrompt = promptText;
        emitState('loading');

        try {
            const response = await chrome.runtime.sendMessage({
                type: 'OPTIMIZE_PROMPT',
                prompt: promptText,
            });

            if (!isOptimizing) return;

            if (response && response.success && response.optimizedPrompt) {
                setPromptText(response.optimizedPrompt);
                showToast('Prompt optimized! Review changes.', 'success');
                isOptimizing = false;
                emitState('confirmation');
                return;
            }

            showToast(
                'Optimization failed: ' + (response?.error || 'Unknown error'),
                'error'
            );
        } catch (e) {
            if (isOptimizing) {
                console.error('[hypergravity] Optimization error:', e);
                showToast('Error optimizing prompt', 'error');
            }
        } finally {
            if (isOptimizing) {
                isOptimizing = false;
                emitState('idle');
            }
        }
    }

    return {
        handleOptimizeClick,
        acceptChanges,
        rejectChanges,
        setStateChangeCallback,
    };
}
