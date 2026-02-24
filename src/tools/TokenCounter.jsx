import { useEffect, useRef, useState } from 'preact/hooks';
import { countText } from '../utils/textStats';
import { useStorage } from '../hooks/useStorage';
import {
    sanitizeMessageText,
    hashText,
    getCachedTokenCount,
    setCachedTokenCount,
    forceFlush,
} from '../utils/tokenHashCache';
import { debugLog as _debugLog } from '../utils/debug';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '../utils/constants';
import './TokenCounter.css';

const debugLog = (...args) => _debugLog('TokenCounter', ...args);

function normalizeTokenCounterMode(mode) {
    const normalized = String(mode || '').trim();

    switch (normalized) {
        case 'hidden':
            return 'none';
        case 'circle':
            return 'ring';
        case 'both':
            return 'ring_text';
        case 'text':
        case 'none':
        case 'percentage':
        case 'text_percentage':
        case 'ring':
        case 'ring_text':
        case 'ring_percentage':
        case 'ring_text_percentage':
            return normalized;
        default:
            return 'ring_text';
    }
}

function getTokenCounterDisplayConfig(mode) {
    switch (mode) {
        case 'none':
            return { showCircle: false, showText: false, showPercentage: false };
        case 'text':
            return { showCircle: false, showText: true, showPercentage: false };
        case 'percentage':
            return { showCircle: false, showText: false, showPercentage: true };
        case 'text_percentage':
            return { showCircle: false, showText: true, showPercentage: true };
        case 'ring':
            return { showCircle: true, showText: false, showPercentage: false };
        case 'ring_text':
            return { showCircle: true, showText: true, showPercentage: false };
        case 'ring_percentage':
            return { showCircle: true, showText: false, showPercentage: true };
        case 'ring_text_percentage':
            return { showCircle: true, showText: true, showPercentage: true };
        default:
            return { showCircle: true, showText: true, showPercentage: false };
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

function getNodeText(node) {
    return (node?.innerText || node?.textContent || '').trim();
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

async function countTokensWithGemini(text, apiKey, signal) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:countTokens?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: text || '' }] }],
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
    const [geminiSettings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
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
            document.removeEventListener('mousedown', handleClickOutside);
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

                if (!newId) {
                    setStats({ inputTokens: 0, outputTokens: 0 });
                }
            }
        };

        const onUrlMaybeChanged = () => checkUrl();

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

            const allMessages = [];

            for (const container of conversationContainers) {
                const { userNodes, modelNodes } =
                    collectMessageNodes(container);

                for (const node of userNodes) {
                    const rawText = getNodeText(node);
                    const cleanText = sanitizeMessageText(rawText, 'input');
                    allMessages.push({
                        text: cleanText,
                        role: 'input',
                        estimatedTokens: countText(cleanText).tokens,
                    });
                }

                for (const node of modelNodes) {
                    const rawText = getNodeText(node);
                    const cleanText = sanitizeMessageText(rawText, 'output');
                    allMessages.push({
                        text: cleanText,
                        role: 'output',
                        estimatedTokens: countText(cleanText).tokens,
                    });
                }
            }

            // Hash all messages and look up cache
            const resolved = await Promise.all(
                allMessages.map(async (msg) => {
                    const hash = await hashText(msg.text);
                    const cached = await getCachedTokenCount(hash);
                    return { ...msg, hash, cachedTokens: cached };
                })
            );

            // Priority: cached API count > estimated (initial render)
            const computeStats = () => {
                let inTok = 0;
                let outTok = 0;
                for (const m of resolved) {
                    const tokens =
                        m.cachedTokens !== null
                            ? m.cachedTokens
                            : m.estimatedTokens;
                    if (m.role === 'input') inTok += tokens;
                    else outTok += tokens;
                }
                return { inputTokens: inTok, outputTokens: outTok };
            };

            const applyStats = (label) => {
                const next = computeStats();
                setStats((prev) => {
                    if (
                        prev.inputTokens === next.inputTokens &&
                        prev.outputTokens === next.outputTokens
                    )
                        return prev;
                    debugLog(`Tokens updated (${label}):`, next);
                    return next;
                });
            };

            applyStats('cached+estimated');

            // Only contact the API if a key is configured
            const apiKey = (geminiSettings?.geminiApiKey || '').trim();
            if (!apiKey) return;

            const pending = resolved.filter((m) => m.cachedTokens === null);
            if (pending.length === 0) return;

            // Debounce API calls to avoid spamming during rapid DOM changes
            clearTimeout(exactDebounceTimeout);
            exactDebounceTimeout = setTimeout(async () => {
                try {
                    exactRequestSeq += 1;
                    const requestId = exactRequestSeq;

                    debugLog(
                        `Fetching exact counts for ${pending.length} messages`
                    );

                    if (exactController) exactController.abort();
                    exactController = new AbortController();

                    const BATCH_SIZE = 3;
                    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
                        const batch = pending.slice(i, i + BATCH_SIZE);
                        await Promise.all(
                            batch.map(async (msg) => {
                                const exactTokens = await countTokensWithGemini(
                                    msg.text,
                                    apiKey,
                                    exactController.signal
                                );
                                await setCachedTokenCount(
                                    msg.hash,
                                    exactTokens
                                );
                                msg.cachedTokens = exactTokens;
                            })
                        );
                    }

                    forceFlush();

                    if (requestId !== exactRequestSeq) return;

                    applyStats('exact');
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

            updateTokens();
            debugLog('Observer attached', {
                rootTag: chatHistoryRoot.tagName,
                rootClasses: chatHistoryRoot.className,
                containerCount: getConversationContainers().length,
            });

            if (observer) observer.disconnect();
            observer = new MutationObserver(() => scheduleUpdate());
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

        if (!attachObserverToConversation()) {
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
    const mode = normalizeTokenCounterMode(geminiSettings?.tokenCounterMode);
    const { showCircle, showText, showPercentage } =
        getTokenCounterDisplayConfig(mode);

    if (!showCircle && !showText && !showPercentage) return null;

    const totalTokens = stats.inputTokens + stats.outputTokens;
    let fillPercentage =
        totalTokens === 0
            ? 0
            : Math.min(100, Math.max(1, (totalTokens / MAX_TOKENS) * 100));

    if (totalTokens > 0 && fillPercentage < 3) {
        fillPercentage = 0;
    }

    const formatTokenCount = (count) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
        return String(count);
    };

    const hasLabel = showText || showPercentage;
    const percentValue =
        MAX_TOKENS > 0 ? ((totalTokens / MAX_TOKENS) * 100).toFixed(1) : '0.0';
    const percentageLabel = `${percentValue}%`;

    const fillDeg = (fillPercentage / 100) * 360;
    const ringMask = `conic-gradient(#000 ${fillDeg}deg, transparent ${fillDeg}deg)`;

    return (
        <div class="hg-token-counter-wrapper" ref={popupRef}>
            <button
                class={`hg-token-counter-btn${hasLabel ? ' hg-token-counter-btn--labeled' : ''}`}
                onClick={() => setIsExpanded(!isExpanded)}
                title="Context Size & Token Usage"
                aria-label="Context Size & Token Usage"
            >
                {showCircle && (
                    <svg class="hg-token-ring" viewBox="0 0 20 20">
                        <circle
                            class="hg-token-ring-bg"
                            cx="10"
                            cy="10"
                            r="9"
                        />
                        <circle
                            class="hg-token-ring-fill"
                            cx="10"
                            cy="10"
                            r="9"
                            style={{ mask: ringMask, WebkitMask: ringMask }}
                        />
                    </svg>
                )}
                {hasLabel && (
                    <span class="hg-token-label">
                        {showText && (
                            <span class="hg-token-label-main">
                                {formatTokenCount(totalTokens)}/
                                {formatTokenCount(MAX_TOKENS)}
                            </span>
                        )}
                        {showPercentage && showText ? (
                            <span class="hg-token-label-percent">
                                ({percentageLabel})
                            </span>
                        ) : null}
                        {showPercentage && !showText ? (
                            <span class="hg-token-label-main">
                                {percentageLabel}
                            </span>
                        ) : null}
                    </span>
                )}
            </button>

            {isExpanded && (
                <div class="hg-token-popup">
                    <div class="hg-token-popup-title">Token Usage</div>

                    <div class="hg-token-popup-row">
                        <div class="hg-token-popup-label">
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
                        <div class="hg-token-popup-value">
                            {stats.inputTokens.toLocaleString()}
                        </div>
                    </div>

                    <div class="hg-token-popup-row">
                        <div class="hg-token-popup-label">
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
                        <div class="hg-token-popup-value">
                            {stats.outputTokens.toLocaleString()}
                        </div>
                    </div>

                    <div class="hg-token-popup-row hg-token-popup-total">
                        <div class="hg-token-popup-label">
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
                        <div
                            class="hg-token-popup-value"
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '6px',
                            }}
                        >
                            <span>{totalTokens.toLocaleString()}</span>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: 'var(--gem-sys-color--on-surface-variant, #575a5a)',
                                    fontWeight: 'normal',
                                }}
                            >
                                ({((totalTokens / MAX_TOKENS) * 100).toFixed(1)}
                                %)
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
