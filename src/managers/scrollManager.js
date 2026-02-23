import { chatBoxManager } from './chatBoxManager';

function fastSmoothScroll(element, targetTop) {
    if (!element) return;

    const startTop = element.scrollTop;
    const delta = targetTop - startTop;
    const duration = 220;
    let startTime = null;

    requestAnimationFrame(function animate(timestamp) {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        element.scrollTop = startTop + delta * eased;

        if (progress < 1) requestAnimationFrame(animate);
    });
}

function getScrollableFallback() {
    return document.scrollingElement || document.documentElement;
}

function isValidAnchorRect(rect) {
    return !!rect && rect.width > 0 && rect.height > 0;
}

export function createScrollManager() {
    let isAutoscrollActive = false;
    let autoscrollRafId = null;
    let autoscrollContainer = null;
    const subscribers = new Set();

    function notify() {
        const state = {
            isAutoscrollActive,
            canShowButtons: canShowButtons(),
        };

        subscribers.forEach((callback) => {
            try {
                callback(state);
            } catch (error) {
                // no-op
            }
        });
    }

    function stopAutoscrollOnManual() {
        stopAutoscroll();
    }

    function detachManualStopListeners() {
        if (!autoscrollContainer) return;

        autoscrollContainer.removeEventListener('wheel', stopAutoscrollOnManual);
        autoscrollContainer.removeEventListener(
            'mousedown',
            stopAutoscrollOnManual
        );
        autoscrollContainer.removeEventListener(
            'touchstart',
            stopAutoscrollOnManual
        );
    }

    function attachManualStopListeners(container) {
        if (!container) return;

        container.addEventListener('wheel', stopAutoscrollOnManual, {
            passive: true,
        });
        container.addEventListener('mousedown', stopAutoscrollOnManual);
        container.addEventListener('touchstart', stopAutoscrollOnManual, {
            passive: true,
        });
    }

    function autoFollowFrame() {
        if (!isAutoscrollActive) return;

        const latestContainer = chatBoxManager.getChatHistoryContainer();
        if (!latestContainer) {
            stopAutoscroll();
            return;
        }

        if (latestContainer !== autoscrollContainer) {
            detachManualStopListeners();
            autoscrollContainer = latestContainer;
            attachManualStopListeners(autoscrollContainer);
        }

        const distanceFromBottom =
            latestContainer.scrollHeight -
            latestContainer.scrollTop -
            latestContainer.clientHeight;

        if (distanceFromBottom >= 5) {
            latestContainer.scrollTop = latestContainer.scrollHeight;
        }

        autoscrollRafId = requestAnimationFrame(autoFollowFrame);
    }

    function getContainerWithRetry(onResolve, attempt = 0) {
        const container = chatBoxManager.getChatHistoryContainer();
        if (container) {
            onResolve(container);
            return;
        }

        if (attempt >= 3) {
            onResolve(null);
            return;
        }

        setTimeout(() => {
            getContainerWithRetry(onResolve, attempt + 1);
        }, 150);
    }

    function scrollToTop() {
        stopAutoscroll();
        getContainerWithRetry((container) => {
            if (container) {
                fastSmoothScroll(container, 0);
                return;
            }

            const fallback = getScrollableFallback();
            fastSmoothScroll(fallback, 0);
        });
    }

    function scrollToBottom() {
        getContainerWithRetry((container) => {
            if (container) {
                fastSmoothScroll(container, container.scrollHeight);
                return;
            }

            const fallback = getScrollableFallback();
            fastSmoothScroll(fallback, fallback.scrollHeight);
        });
    }

    function startAutoscroll() {
        if (isAutoscrollActive) return;

        const container = chatBoxManager.getChatHistoryContainer();
        if (!container) return;

        isAutoscrollActive = true;
        autoscrollContainer = container;
        attachManualStopListeners(autoscrollContainer);
        notify();
        autoFollowFrame();
    }

    function stopAutoscroll() {
        if (!isAutoscrollActive) return;

        isAutoscrollActive = false;

        if (autoscrollRafId) {
            cancelAnimationFrame(autoscrollRafId);
            autoscrollRafId = null;
        }

        detachManualStopListeners();
        autoscrollContainer = null;
        notify();
    }

    function toggleAutoscroll() {
        if (isAutoscrollActive) {
            stopAutoscroll();
        } else {
            startAutoscroll();
        }
    }

    function canShowButtons() {
        if (window.location.pathname.includes('/gems/')) return false;

        const input = chatBoxManager.getInputElement();
        if (!input) return false;

        if (chatBoxManager.isGemInstructionsField(input)) return false;

        const anchor = chatBoxManager.getInputAnchorElement() || input;
        const rect = anchor.getBoundingClientRect();

        if (!isValidAnchorRect(rect)) return false;
        if (window.getComputedStyle(input).visibility === 'hidden') return false;

        return true;
    }

    function subscribe(callback) {
        if (typeof callback !== 'function') return () => {};

        subscribers.add(callback);
        callback({
            isAutoscrollActive,
            canShowButtons: canShowButtons(),
        });

        return () => {
            subscribers.delete(callback);
        };
    }

    function refresh() {
        notify();
    }

    function destroy() {
        stopAutoscroll();
        subscribers.clear();
    }

    return {
        scrollToTop,
        scrollToBottom,
        startAutoscroll,
        stopAutoscroll,
        toggleAutoscroll,
        canShowButtons,
        isAutoscrollActive: () => isAutoscrollActive,
        subscribe,
        refresh,
        destroy,
    };
}
