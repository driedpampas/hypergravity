import React, { useEffect, useRef, useState } from 'react';
import { countText } from './utils/textStats';
import { useChromeStorage } from './hooks/useChromeStorage';
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

function getChatHistoryRoot() {
    return (
        document.querySelector('[data-test-id="chat-history-container"]') ||
        document.querySelector('infinite-scroller.chat-history') ||
        document.querySelector('.chat-history') ||
        null
    );
}

function getConversationContainers() {
    const root = getChatHistoryRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('.conversation-container'));
}

const USER_SELECTOR_GROUPS = [
    'user-query',
    '[data-message-author="user"]',
    '.user-message',
    '.query-content',
];

const MODEL_SELECTOR_GROUPS = [
    'model-response, generative-ui-response',
    '[data-message-author="model"], .model-response',
    'response-container',
    'message-content .markdown-main-panel',
];

function uniqueTopLevelNodes(nodes) {
    return nodes.filter(
        (node, index, arr) =>
            !arr.some(
                (other, otherIndex) =>
                    index !== otherIndex && other.contains(node)
            )
    );
}

function resolveNodesByPriority(conversationContainer, selectorGroups) {
    for (const selectors of selectorGroups) {
        const nodes = uniqueTopLevelNodes(
            Array.from(conversationContainer.querySelectorAll(selectors))
        ).filter((node) => getNodeText(node).length > 0);

        if (nodes.length > 0) {
            return { nodes, selectors };
        }
    }

    return { nodes: [], selectors: selectorGroups.join(' | ') };
}

function collectMessageNodes(conversationContainer) {
    const userResolved = resolveNodesByPriority(
        conversationContainer,
        USER_SELECTOR_GROUPS
    );
    const modelResolved = resolveNodesByPriority(
        conversationContainer,
        MODEL_SELECTOR_GROUPS
    );

    const userNodes = userResolved.nodes;
    const modelNodes = modelResolved.nodes.filter(
        (modelNode) =>
            !userNodes.some((userNode) => userNode.contains(modelNode))
    );

    return {
        userNodes,
        modelNodes,
        userSelectorsUsed: userResolved.selectors,
        modelSelectorsUsed: modelResolved.selectors,
    };
}

function getNodeText(node) {
    return (node?.innerText || node?.textContent || '').trim();
}

function getTextSignature(text) {
    const normalized = (text || '').replace(/\s+/g, ' ').trim();
    return `${normalized.length}:${normalized}`;
}

function getApiKeyMarker(apiKey) {
    return (apiKey || '').slice(-8);
}

function readCachedExactToken(node, role, signature, apiKeyMarker) {
    if (!node) return null;
    const storedRole = node.getAttribute('data-hg-token-role');
    const storedSignature = node.getAttribute('data-hg-token-signature');
    const storedApiKey = node.getAttribute('data-hg-token-key');
    const storedValue = node.getAttribute('data-hg-token-value');
    const tokenValue = Number(storedValue);

    if (
        storedRole === role &&
        storedSignature === signature &&
        storedApiKey === apiKeyMarker &&
        Number.isFinite(tokenValue)
    ) {
        return tokenValue;
    }

    return null;
}

function writeCachedExactToken(
    node,
    role,
    signature,
    apiKeyMarker,
    tokenValue
) {
    if (!node) return;
    node.setAttribute('data-hg-token-processed', '1');
    node.setAttribute('data-hg-token-role', role);
    node.setAttribute('data-hg-token-signature', signature);
    node.setAttribute('data-hg-token-key', apiKeyMarker);
    node.setAttribute('data-hg-token-value', String(tokenValue));
}

function saveStatsForConversation(conversationId, stats) {
    if (!conversationId) return;
    const savedMap = JSON.parse(localStorage.getItem('hg_token_map') || '{}');
    savedMap[conversationId] = stats;
    localStorage.setItem('hg_token_map', JSON.stringify(savedMap));
}

async function countTokensWithGemini(text, apiKey, signal) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:countTokens?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: text || '' }],
                },
            ],
        }),
        signal,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `countTokens failed (${response.status}): ${errorBody}`
        );
    }

    const data = await response.json();
    return Number(data?.totalTokens || 0);
}

export function TokenCounter() {
    const [stats, setStats] = useState({ inputTokens: 0, outputTokens: 0 });
    const [debugCycleStats, setDebugCycleStats] = useState({
        inputCached: 0,
        inputFetched: 0,
        outputCached: 0,
        outputFetched: 0,
    });
    const [geminiSettings] = useChromeStorage('hypergravityGeminiSettings', {
        geminiApiKey: '',
        tokenLimit: 1000000,
    });
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

        let exactDebounceTimeout;
        let exactRequestSeq = 0;
        let exactController = null;

        const updateTokens = async () => {
            const conversationContainers = getConversationContainers();
            if (conversationContainers.length === 0) return;

            let inTokens = 0;
            let outTokens = 0;

            const selectorUsage = {
                input: new Set(),
                output: new Set(),
            };

            const inputMessages = [];
            const outputMessages = [];

            conversationContainers.forEach((conversationContainer) => {
                const {
                    userNodes,
                    modelNodes,
                    userSelectorsUsed,
                    modelSelectorsUsed,
                } = collectMessageNodes(conversationContainer);

                selectorUsage.input.add(userSelectorsUsed);
                selectorUsage.output.add(modelSelectorsUsed);

                userNodes.forEach((node) => {
                    const text = getNodeText(node);
                    const estimatedTokens = countText(text).tokens;
                    inTokens += estimatedTokens;
                    inputMessages.push({ node, text, estimatedTokens });
                });

                modelNodes.forEach((node) => {
                    const text = getNodeText(node);
                    const estimatedTokens = countText(text).tokens;
                    outTokens += estimatedTokens;
                    outputMessages.push({ node, text, estimatedTokens });
                });
            });

            debugLog('Token scan', {
                containers: {
                    total: conversationContainers.length,
                },
                selectors: {
                    input: Array.from(selectorUsage.input).join(' || '),
                    output: Array.from(selectorUsage.output).join(' || '),
                },
                counts: {
                    userQueries: inputMessages.length,
                    modelResponses: outputMessages.length,
                },
                tokens: {
                    inputTokens: inTokens,
                    outputTokens: outTokens,
                },
            });

            const apiKey = (geminiSettings?.geminiApiKey || '').trim();
            if (!apiKey) {
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

                    debugLog('Tokens updated (estimate only):', newStats);
                    saveStatsForConversation(conversationId, newStats);
                    return newStats;
                });
                return;
            }

            const apiKeyMarker = getApiKeyMarker(apiKey);

            const resolvedInputMessages = inputMessages.map((message) => {
                const signature = getTextSignature(message.text);
                const cachedTokens = readCachedExactToken(
                    message.node,
                    'input',
                    signature,
                    apiKeyMarker
                );
                return {
                    ...message,
                    role: 'input',
                    signature,
                    cachedTokens,
                };
            });

            const resolvedOutputMessages = outputMessages.map((message) => {
                const signature = getTextSignature(message.text);
                const cachedTokens = readCachedExactToken(
                    message.node,
                    'output',
                    signature,
                    apiKeyMarker
                );
                return {
                    ...message,
                    role: 'output',
                    signature,
                    cachedTokens,
                };
            });

            const hybridStats = {
                inputTokens: resolvedInputMessages.reduce(
                    (sum, message) =>
                        sum +
                        (message.cachedTokens === null
                            ? message.estimatedTokens
                            : message.cachedTokens),
                    0
                ),
                outputTokens: resolvedOutputMessages.reduce(
                    (sum, message) =>
                        sum +
                        (message.cachedTokens === null
                            ? message.estimatedTokens
                            : message.cachedTokens),
                    0
                ),
            };

            setStats((prevStats) => {
                if (
                    prevStats.inputTokens === hybridStats.inputTokens &&
                    prevStats.outputTokens === hybridStats.outputTokens
                ) {
                    return prevStats;
                }

                debugLog(
                    'Tokens updated (cached exact + estimate):',
                    hybridStats
                );
                saveStatsForConversation(conversationId, hybridStats);
                return hybridStats;
            });

            clearTimeout(exactDebounceTimeout);
            exactDebounceTimeout = setTimeout(async () => {
                try {
                    exactRequestSeq += 1;
                    const requestId = exactRequestSeq;

                    const pendingRequests = [
                        ...resolvedInputMessages,
                        ...resolvedOutputMessages,
                    ].filter((message) => message.cachedTokens === null);

                    const inputFetchedCount = pendingRequests.filter(
                        (message) => message.role === 'input'
                    ).length;
                    const outputFetchedCount = pendingRequests.filter(
                        (message) => message.role === 'output'
                    ).length;

                    setDebugCycleStats({
                        inputCached: Math.max(
                            0,
                            resolvedInputMessages.length - inputFetchedCount
                        ),
                        inputFetched: inputFetchedCount,
                        outputCached: Math.max(
                            0,
                            resolvedOutputMessages.length - outputFetchedCount
                        ),
                        outputFetched: outputFetchedCount,
                    });

                    if (pendingRequests.length === 0) {
                        return;
                    }

                    if (exactController) {
                        exactController.abort();
                    }
                    exactController = new AbortController();

                    await Promise.all(
                        pendingRequests.map(async (message) => {
                            const exactTokens = await countTokensWithGemini(
                                message.text,
                                apiKey,
                                exactController.signal
                            );
                            writeCachedExactToken(
                                message.node,
                                message.role,
                                message.signature,
                                apiKeyMarker,
                                exactTokens
                            );
                        })
                    );

                    if (requestId !== exactRequestSeq) return;

                    let exactInputTokens = 0;
                    let exactOutputTokens = 0;

                    resolvedInputMessages.forEach((message) => {
                        const cached = readCachedExactToken(
                            message.node,
                            'input',
                            message.signature,
                            apiKeyMarker
                        );
                        exactInputTokens +=
                            cached === null ? message.estimatedTokens : cached;
                    });

                    resolvedOutputMessages.forEach((message) => {
                        const cached = readCachedExactToken(
                            message.node,
                            'output',
                            message.signature,
                            apiKeyMarker
                        );
                        exactOutputTokens +=
                            cached === null ? message.estimatedTokens : cached;
                    });

                    const exactStats = {
                        inputTokens: exactInputTokens,
                        outputTokens: exactOutputTokens,
                    };

                    setStats((prevStats) => {
                        if (
                            prevStats.inputTokens === exactStats.inputTokens &&
                            prevStats.outputTokens === exactStats.outputTokens
                        ) {
                            return prevStats;
                        }

                        debugLog('Exact tokens updated from Gemini API:', {
                            ...exactStats,
                            pendingRequests: pendingRequests.length,
                        });
                        saveStatsForConversation(conversationId, exactStats);
                        return exactStats;
                    });
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                    debugLog('Gemini countTokens error:', error);
                }
            }, 700);
        };

        const scheduleUpdate = () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(updateTokens, 500);
        };

        const attachObserverToConversation = () => {
            const chatHistoryRoot = getChatHistoryRoot();
            if (!chatHistoryRoot) return false;

            updateTokens(); // Initial update
            debugLog('Observer attached', {
                rootTag: chatHistoryRoot.tagName,
                rootClasses: chatHistoryRoot.className,
                containerCount: getConversationContainers().length,
            });

            if (observer) observer.disconnect();
            observer = new MutationObserver(() => {
                scheduleUpdate();
            });

            observer.observe(chatHistoryRoot, {
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
            clearTimeout(exactDebounceTimeout);
            if (exactController) exactController.abort();
        };
    }, [conversationId, geminiSettings?.geminiApiKey]);

    const MAX_TOKENS = geminiSettings?.tokenLimit || 1000000;
    const totalTokens = stats.inputTokens + stats.outputTokens;
    let fillPercentage =
        totalTokens === 0
            ? 0
            : Math.min(100, Math.max(1, (totalTokens / MAX_TOKENS) * 100));

    if (totalTokens > 0 && fillPercentage < 3) {
        fillPercentage = 3;
    }

    const formatTokenCount = (count) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
        return String(count);
    };

    return (
        <div className="hg-token-counter-wrapper" ref={popupRef}>
            <button
                className="hg-token-counter-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Context Size & Token Usage"
                aria-label="Context Size & Token Usage"
            >
                <svg className="hg-token-ring" viewBox="0 0 20 20">
                    <circle
                        className="hg-token-ring-bg"
                        cx="10"
                        cy="10"
                        r="9"
                    />
                    <circle
                        className="hg-token-ring-fill"
                        cx="10"
                        cy="10"
                        r="9"
                        style={{
                            clipPath: `inset(${100 - fillPercentage}% 0 0 0)`,
                        }}
                    />
                </svg>
                <span className="hg-token-label">
                    {formatTokenCount(totalTokens)}/
                    {formatTokenCount(MAX_TOKENS)}
                </span>
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

                    {isDebugEnabled() && (
                        <div className="hg-token-popup-row">
                            <div className="hg-token-popup-label">
                                <span>API Cache</span>
                            </div>
                            <div className="hg-token-popup-value">
                                In C:{debugCycleStats.inputCached} F:
                                {debugCycleStats.inputFetched} / Out C:
                                {debugCycleStats.outputCached} F:
                                {debugCycleStats.outputFetched}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
