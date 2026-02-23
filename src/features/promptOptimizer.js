import { chatBoxManager } from '../managers/chatBoxManager';

const getPromptText = () => chatBoxManager.getInputText();
const setPromptText = (text) => chatBoxManager.setInputText(text);

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
