import React, { useEffect, useRef, useState } from 'react';
import { countText } from './utils/textStats';
import './TokenCounter.css';

function calculateTokens(node) {
    if (!node) return 0;
    const text = node.textContent || '';
    return countText(text).tokens;
}

function isDebugEnabled() {
    return (
        window.__HG_DEBUG_TOKEN_COUNTER__ === true ||
        localStorage.getItem('hg_debug_token_counter') === '1'
    );
}

function debugLog(...args) {
    if (isDebugEnabled()) {
        console.log('[HG TokenCounter]', ...args);
    }
}

function isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return element.getClientRects().length > 0;
}

function getActiveConversationContainer() {
    const containers = Array.from(
        document.querySelectorAll('.conversation-container')
    );
    const visible = containers.find(isVisible);
    debugLog('Container scan', {
        totalContainers: containers.length,
        visibleContainers: containers.filter(isVisible).length,
        usingVisibleContainer: Boolean(visible),
    });
    return visible || containers[0] || null;
}

export function TokenCounter() {
    const [stats, setStats] = useState({ inputTokens: 0, outputTokens: 0 });
    const [conversationId, setConversationId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const currentIdRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                setIsExpanded(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const checkUrl = () => {
            const urlParts = window.location.pathname.split('/');
            const id = urlParts[urlParts.length - 1];

            let newId = null;
            if (id && id !== 'app' && id.length > 5) {
                newId = id;
            }

            if (newId !== currentIdRef.current) {
                currentIdRef.current = newId;
                setConversationId(newId);
                debugLog('Conversation changed', {
                    pathname: window.location.pathname,
                    parsedId: id,
                    conversationId: newId,
                });

                if (newId) {
                    const savedMap = JSON.parse(
                        localStorage.getItem('hg_token_map') || '{}'
                    );
                    setStats(
                        savedMap[newId] || { inputTokens: 0, outputTokens: 0 }
                    );
                } else {
                    setStats({ inputTokens: 0, outputTokens: 0 });
                }
            }
        };

        const onUrlMaybeChanged = () => {
            checkUrl();
        };

        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            onUrlMaybeChanged();
            return result;
        };

        window.history.replaceState = function (...args) {
            const result = originalReplaceState.apply(this, args);
            onUrlMaybeChanged();
            return result;
        };

        window.addEventListener('popstate', onUrlMaybeChanged);
        window.addEventListener('hashchange', onUrlMaybeChanged);

        checkUrl();

        return () => {
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', onUrlMaybeChanged);
            window.removeEventListener('hashchange', onUrlMaybeChanged);
        };
    }, []);

    useEffect(() => {
        if (!conversationId) return;

        let debounceTimeout;
        let observer;
        let interval;
        let containerObserver;

        const updateTokens = () => {
            const conversationContainer = getActiveConversationContainer();
            if (!conversationContainer) return;

            let inTokens = 0;
            let outTokens = 0;

            const userQueries =
                conversationContainer.querySelectorAll('user-query');
            userQueries.forEach((q) => {
                inTokens += calculateTokens(q);
            });

            const modelResponses = conversationContainer.querySelectorAll(
                'model-response, generative-ui-response, response-container'
            );
            modelResponses.forEach((r) => {
                outTokens += calculateTokens(r);
            });

            debugLog('Token scan', {
                containerTag: conversationContainer.tagName,
                containerClasses: conversationContainer.className,
                selectors: {
                    input: 'user-query',
                    output: 'model-response, generative-ui-response, response-container',
                },
                counts: {
                    userQueries: userQueries.length,
                    modelResponses: modelResponses.length,
                },
                tokens: {
                    inputTokens: inTokens,
                    outputTokens: outTokens,
                },
            });

            setStats((prevStats) => {
                if (
                    prevStats.inputTokens === inTokens &&
                    prevStats.outputTokens === outTokens
                ) {
                    return prevStats;
                }
                const newStats = {
                    inputTokens: inTokens,
                    outputTokens: outTokens,
                };

                debugLog('Tokens updated:', newStats);

                // Save to localStorage map
                const savedMap = JSON.parse(
                    localStorage.getItem('hg_token_map') || '{}'
                );
                savedMap[conversationId] = newStats;
                localStorage.setItem('hg_token_map', JSON.stringify(savedMap));

                return newStats;
            });
        };

        const scheduleUpdate = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(updateTokens, 500);
        };

        const attachObserverToConversation = () => {
            const conversationContainer = getActiveConversationContainer();
            if (!conversationContainer) return false;

            updateTokens(); // Initial update
            debugLog('Observer attached', {
                containerTag: conversationContainer.tagName,
                containerClasses: conversationContainer.className,
            });

            if (observer) observer.disconnect();
            observer = new MutationObserver(() => {
                scheduleUpdate();
            });

            observer.observe(conversationContainer, {
                childList: true,
                subtree: true,
                characterData: true,
            });
            return true;
        };

        const attachContainerObserver = () => {
            containerObserver = new MutationObserver(() => {
                attachObserverToConversation();
                scheduleUpdate();
            });

            containerObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });
        };

        // Try to attach immediately
        if (!attachObserverToConversation()) {
            // Conversation container not found yet, poll for it
            interval = setInterval(() => {
                if (attachObserverToConversation()) {
                    clearInterval(interval);
                }
            }, 1000);
        }

        attachContainerObserver();

        return () => {
            if (observer) observer.disconnect();
            if (containerObserver) containerObserver.disconnect();
            if (interval) clearInterval(interval);
            clearTimeout(debounceTimeout);
        };
    }, [conversationId]);

    const MAX_TOKENS = 1000000; // 1M tokens assumption for pie chart
    const totalTokens = stats.inputTokens + stats.outputTokens;
    let fillPercentage =
        totalTokens === 0
            ? 0
            : Math.min(100, Math.max(1, (totalTokens / MAX_TOKENS) * 100));

    // Ensure there's a small visible pie piece if tokens are used but tiny relative to 1M
    if (totalTokens > 0 && fillPercentage < 2) {
        fillPercentage = 2;
    }

    return (
        <div className="hg-token-counter-wrapper" ref={popupRef}>
            <button
                className="hg-token-counter-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Context Size & Token Usage"
                aria-label="Context Size & Token Usage"
            >
                <div
                    className="hg-token-pie"
                    style={{
                        background: `conic-gradient(currentColor ${fillPercentage}%, transparent 0)`,
                    }}
                ></div>
            </button>

            {isExpanded && (
                <div className="hg-token-popup">
                    <div className="hg-token-popup-title">Token Usage</div>

                    <div className="hg-token-popup-row">
                        <div className="hg-token-popup-label">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                            <span>Input</span>
                        </div>
                        <div className="hg-token-popup-value">
                            {stats.inputTokens.toLocaleString()}
                        </div>
                    </div>

                    <div className="hg-token-popup-row">
                        <div className="hg-token-popup-label">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 5v14M19 12l-7 7-7-7" />
                            </svg>
                            <span>Output</span>
                        </div>
                        <div className="hg-token-popup-value">
                            {stats.outputTokens.toLocaleString()}
                        </div>
                    </div>

                    <div className="hg-token-popup-row hg-token-popup-total">
                        <div className="hg-token-popup-label">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z" />
                            </svg>
                            <span>Total</span>
                        </div>
                        <div className="hg-token-popup-value">
                            {totalTokens.toLocaleString()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
