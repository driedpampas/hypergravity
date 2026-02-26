import { chatBoxManager } from '@managers/chatBoxManager';
import { optimizePrompt, cancelOptimization } from '@utils/browserEnv';

const getPromptText = () => chatBoxManager.getInputText();
const setPromptText = (text: string) => chatBoxManager.setInputText(text);

type PromptOptimizerState = 'idle' | 'loading' | 'confirmation';
type ToastType = 'info' | 'success' | 'error';
type OptimizeResponse = {
    success?: boolean;
    optimizedPrompt?: string;
    error?: string;
};
type ShowToast = (message: string, type?: ToastType) => void;

/**
 * Factory function for creating a Prompt Optimizer instance.
 * @param {Object} options - Optimizer options.
 * @param {Function} options.showToast - Callback to display notifications to the user.
 * @returns {Object} Public API for optimization control.
 */
export function createPromptOptimizer({ showToast }: { showToast: ShowToast }) {
    let isOptimizing = false;
    let preOptimizationPrompt = '';
    let onStateChange: ((state: PromptOptimizerState) => void) | null = null;

    /**
     * Registers a callback that is fired whenever the optimizer's internal state reaches a milestone.
     */
    function setStateChangeCallback(cb: (state: PromptOptimizerState) => void) {
        onStateChange = cb;
    }

    /**
     * Notifies the state change callback of a new status.
     */
    function emitState(state: PromptOptimizerState) {
        if (typeof onStateChange === 'function') onStateChange(state);
    }

    /**
     * Finalizes the optimization process by accepting the new prompt text.
     */
    function acceptChanges() {
        preOptimizationPrompt = '';
        emitState('idle');
        showToast('Changes accepted', 'success');
    }

    /**
     * Reverts the prompt input to the state before optimization began.
     */
    function rejectChanges() {
        if (preOptimizationPrompt) {
            setPromptText(preOptimizationPrompt);
            showToast('Changes reverted', 'info');
        }
        preOptimizationPrompt = '';
        emitState('idle');
    }

    /**
     * Triggers the asynchronous optimization flow via the background worker.
     */
    async function handleOptimizeClick() {
        if (isOptimizing) {
            isOptimizing = false;
            emitState('idle');
            showToast('Optimization cancelled', 'info');
            try {
                await cancelOptimization();
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
            const response = (await optimizePrompt(promptText)) as OptimizeResponse;

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
