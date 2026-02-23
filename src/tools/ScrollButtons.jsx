import React, { useEffect, useRef, useState } from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { createScrollManager } from '../managers/scrollManager';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '../utils/constants';

export function ScrollButtons() {
    const [settings] = useChromeStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
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
        <div className="hg-scroll-controls">
            <button
                className="hg-scroll-btn"
                title="Scroll to top"
                aria-label="Scroll to top"
                onClick={managerRef.current.scrollToTop}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                >
                    <path d="M18 15l-6-6-6 6" />
                </svg>
            </button>
            <button
                className={`hg-scroll-btn ${state.isAutoscrollActive ? 'active' : ''}`}
                title="Scroll to bottom (double-click to auto-follow)"
                aria-label="Scroll to bottom"
                onClick={managerRef.current.scrollToBottom}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    managerRef.current.toggleAutoscroll();
                }}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="16"
                    height="16"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>
        </div>
    );
}
