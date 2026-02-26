import { useEffect, useRef, useState } from 'preact/hooks';
import { ChevronDownIcon, ChevronUpIcon } from '@icons';
import { useStorage } from '@hooks/useStorage';
import { createScrollManager } from '@managers/scrollManager';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@utils/constants';

export function ScrollButtons() {
    const [settings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const managerRef = useRef(null);
    const [state, setState] = useState({
        isAutoscrollActive: false,
        canShowButtons: false,
    });

    if (!managerRef.current) {
        managerRef.current = createScrollManager();
    }

    useEffect(() => {
        const manager = managerRef.current;
        const unsubscribe = manager.subscribe(setState);
        let rafId = null;
        const scrollListenerOptions = {
            passive: true,
            capture: true,
        };

        const requestRefresh = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                manager.refresh();
            });
        };

        const observer = new MutationObserver(() => {
            requestRefresh();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('resize', requestRefresh);
        window.addEventListener(
            'scroll',
            requestRefresh,
            scrollListenerOptions
        );
        window.addEventListener('popstate', requestRefresh);
        window.addEventListener('hashchange', requestRefresh);

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            observer.disconnect();
            window.removeEventListener('resize', requestRefresh);
            window.removeEventListener(
                'scroll',
                requestRefresh,
                scrollListenerOptions
            );
            window.removeEventListener('popstate', requestRefresh);
            window.removeEventListener('hashchange', requestRefresh);
            unsubscribe();
            manager.destroy();
        };
    }, []);

    useEffect(() => {
        const manager = managerRef.current;
        if (!manager) return;

        if (settings?.showScrollButtons === false) {
            manager.stopAutoscroll();
        }

        manager.refresh();
    }, [settings?.showScrollButtons]);

    if (settings?.showScrollButtons === false) return null;
    if (!state.canShowButtons) return null;

    return (
        <div class="hg-scroll-controls">
            <button
                class="hg-scroll-btn"
                title="Scroll to top"
                aria-label="Scroll to top"
                onClick={managerRef.current.scrollToTop}
            >
                <ChevronUpIcon width="16" height="16" />
            </button>
            <button
                class={`hg-scroll-btn ${state.isAutoscrollActive ? 'active' : ''}`}
                title="Scroll to bottom (double-click to auto-follow)"
                aria-label="Scroll to bottom"
                onClick={managerRef.current.scrollToBottom}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    managerRef.current.toggleAutoscroll();
                }}
            >
                <ChevronDownIcon width="16" height="16" />
            </button>
        </div>
    );
}
