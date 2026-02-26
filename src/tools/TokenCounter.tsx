import { useStorage } from '@hooks/useStorage';
import { InputArrowIcon, OutputArrowIcon, TotalPieIcon } from '@icons';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';
import { debugLog as _debugLog, debugSelectorMatch } from '@utils/debug';
import { countText } from '@utils/textStats';
import {
    forceFlush,
    getCachedTokenCount,
    hashText,
    sanitizeMessageText,
    setCachedTokenCount,
} from '@utils/tokenHashCache';
import { useEffect, useRef, useState } from 'preact/hooks';
import './TokenCounter.css';

type TokenCounterMode =
    | 'none'
    | 'text'
    | 'percentage'
    | 'text_percentage'
    | 'ring'
    | 'ring_text'
    | 'ring_percentage'
    | 'ring_text_percentage';

type CountedMessage = {
    text: string;
    role: 'input' | 'output';
    estimatedTokens: number;
};

const debugLog = (...args: unknown[]) => _debugLog('TokenCounter', ...args);

const CHAT_HISTORY_ROOT_SELECTORS = [
    '[data-test-id="chat-history-container"]',
    'infinite-scroller.chat-history',
    '.chat-history',
];

function normalizeTokenCounterMode(mode: unknown): TokenCounterMode {
    const normalized = String(mode || '').trim();

    switch (normalized) {
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

function getTokenCounterDisplayConfig(mode: TokenCounterMode) {
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
    for (const selector of CHAT_HISTORY_ROOT_SELECTORS) {
        const node = document.querySelector(selector);
        debugSelectorMatch('TokenCounter.getChatHistoryRoot', selector, Boolean(node));
        if (node) {
            return node;
        }
    }

    debugSelectorMatch('TokenCounter.getChatHistoryRoot', '(no selector matched)', false, {
        totalSelectors: CHAT_HISTORY_ROOT_SELECTORS.length,
    });

    return null;
}

function getConversationContainers() {
    const root = getChatHistoryRoot();
    if (!root) return [];
    const containers = Array.from(root.querySelectorAll('.conversation-container'));
    return containers.length > 0 ? containers : [root];
}

function getCurrentConversationId() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const appIndex = pathParts.indexOf('app');
    const id = appIndex >= 0 ? pathParts[appIndex + 1] : null;

    if (!id || id.length < 6) return null;
    return id;
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

const USER_SELECTORS = [
    'user-query',
    '[data-message-author="user"]',
    '.user-message',
    '.query-content',
];

const MODEL_SELECTORS = [
    'model-response',
    'generative-ui-response',
    '[data-message-author="model"]',
    '.model-response',
    'response-container',
    'message-content .markdown-main-panel',
];

function uniqueTopLevelNodes(nodes: Element[]): Element[] {
    return nodes.filter(
        (node, index, arr) =>
            !arr.some((other, otherIndex) => index !== otherIndex && other.contains(node))
    );
}

function getNodeText(node: Element | null): string {
    if (!node) return '';
    if (node instanceof HTMLElement) {
        return (node.innerText || node.textContent || '').trim();
    }
    return (node.textContent || '').trim();
}

function getNodeTextExcludingThoughts(node: Element | null): string {
    if (!node) return '';

    if (node.tagName?.toLowerCase() === 'model-thoughts' || node.matches?.('model-thoughts')) {
        return '';
    }

    if (node.classList?.contains('cdk-visually-hidden')) {
        return '';
    }

    const ownMathText = (node.getAttribute?.('data-math') || '').trim();
    if (ownMathText) {
        return ownMathText;
    }

    const clone = node.cloneNode(true) as Element;
    clone
        .querySelectorAll(
            'model-thoughts, [data-test-id="model-thoughts"], .model-thoughts, .cdk-visually-hidden'
        )
        .forEach((el: Element) => {
            el.remove();
        });

    clone.querySelectorAll('[data-math]').forEach((el: Element) => {
        const mathText = (el.getAttribute('data-math') || '').trim();
        const replacement = document.createTextNode(mathText ? ` ${mathText} ` : ' ');
        el.replaceWith(replacement);
    });

    return getNodeText(clone);
}

function resolveNodesByPriority(conversationContainer: Element, selectorGroups: string[]) {
    for (const selectors of selectorGroups) {
        const allNodes = Array.from(conversationContainer.querySelectorAll(selectors));
        const nodes = uniqueTopLevelNodes(allNodes).filter(
            (node) => getNodeTextExcludingThoughts(node).length > 0
        );

        debugSelectorMatch('TokenCounter.resolveNodesByPriority', selectors, nodes.length > 0, {
            matchedCount: nodes.length,
            rawCount: allNodes.length,
        });

        if (nodes.length > 0) {
            return { nodes, selectors };
        }
    }

    return { nodes: [], selectors: selectorGroups.join(' | ') };
}

function collectMessageNodes(conversationContainer: Element) {
    const userResolved = resolveNodesByPriority(conversationContainer, USER_SELECTOR_GROUPS);
    const modelResolved = resolveNodesByPriority(conversationContainer, MODEL_SELECTOR_GROUPS);

    const userNodes = userResolved.nodes;
    const modelNodes = modelResolved.nodes.filter(
        (modelNode) => !userNodes.some((userNode) => userNode.contains(modelNode))
    );

    return {
        userNodes,
        modelNodes,
        userSelectorsUsed: userResolved.selectors,
        modelSelectorsUsed: modelResolved.selectors,
    };
}

async function countTokensWithGemini(text: string, apiKey: string, signal: AbortSignal) {
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
        throw new Error(`countTokens failed (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return Number(data?.totalTokens || 0);
}

export function TokenCounter() {
    const [stats, setStats] = useState({ inputTokens: 0, outputTokens: 0 });
    const [geminiSettings] = useStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const currentIdRef = useRef<string | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target;
            if (popupRef.current && target instanceof Node && !popupRef.current.contains(target)) {
                setIsExpanded(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const checkUrl = () => {
            const newId = getCurrentConversationId();

            if (newId !== currentIdRef.current) {
                currentIdRef.current = newId;
                setConversationId(newId);
                debugLog('Conversation changed', {
                    pathname: window.location.pathname,
                    parsedId: newId,
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
        let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
        let observer: MutationObserver | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;
        let containerObserver: MutationObserver | null = null;
        let exactDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
        let exactRequestSeq = 0;
        let exactController: AbortController | null = null;

        const updateTokens = async () => {
            try {
                const conversationContainers = getConversationContainers();
                const allMessages: CountedMessage[] = [];

                for (const container of conversationContainers) {
                    const { userNodes, modelNodes } = collectMessageNodes(container);

                    for (const node of userNodes) {
                        const rawText = getNodeTextExcludingThoughts(node);
                        const cleanText = sanitizeMessageText(rawText, 'input');
                        if (!cleanText) continue;
                        allMessages.push({
                            text: cleanText,
                            role: 'input',
                            estimatedTokens: countText(cleanText).tokens,
                        });
                    }

                    for (const node of modelNodes) {
                        const rawText = getNodeTextExcludingThoughts(node);
                        const cleanText = sanitizeMessageText(rawText, 'output');
                        if (!cleanText) continue;
                        allMessages.push({
                            text: cleanText,
                            role: 'output',
                            estimatedTokens: countText(cleanText).tokens,
                        });
                    }
                }

                if (allMessages.length === 0) {
                    const root = getChatHistoryRoot() || document;
                    const userSelector = USER_SELECTORS.join(', ');
                    const rawUserNodes = Array.from(root.querySelectorAll(userSelector));
                    const userNodes = uniqueTopLevelNodes(rawUserNodes).filter(
                        (node) => getNodeText(node).length > 0
                    );
                    debugSelectorMatch(
                        'TokenCounter.fallbackUserNodes',
                        userSelector,
                        userNodes.length > 0,
                        {
                            matchedCount: userNodes.length,
                            rawCount: rawUserNodes.length,
                        }
                    );

                    const modelSelector = MODEL_SELECTORS.join(', ');
                    const rawModelNodes = Array.from(root.querySelectorAll(modelSelector));
                    const modelNodes = uniqueTopLevelNodes(rawModelNodes).filter(
                        (node) =>
                            getNodeText(node).length > 0 &&
                            !userNodes.some((userNode) => userNode.contains(node))
                    );
                    debugSelectorMatch(
                        'TokenCounter.fallbackModelNodes',
                        modelSelector,
                        modelNodes.length > 0,
                        {
                            matchedCount: modelNodes.length,
                            rawCount: rawModelNodes.length,
                        }
                    );

                    for (const node of userNodes) {
                        const cleanText = sanitizeMessageText(
                            getNodeTextExcludingThoughts(node),
                            'input'
                        );
                        if (!cleanText) continue;
                        allMessages.push({
                            text: cleanText,
                            role: 'input',
                            estimatedTokens: countText(cleanText).tokens,
                        });
                    }

                    for (const node of modelNodes) {
                        const cleanText = sanitizeMessageText(
                            getNodeTextExcludingThoughts(node),
                            'output'
                        );
                        if (!cleanText) continue;
                        allMessages.push({
                            text: cleanText,
                            role: 'output',
                            estimatedTokens: countText(cleanText).tokens,
                        });
                    }
                }

                if (allMessages.length === 0) {
                    setStats({ inputTokens: 0, outputTokens: 0 });
                    return;
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
                        const tokens = m.cachedTokens !== null ? m.cachedTokens : m.estimatedTokens;
                        if (m.role === 'input') inTok += tokens;
                        else outTok += tokens;
                    }
                    return { inputTokens: inTok, outputTokens: outTok };
                };

                const applyStats = (label: string) => {
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
                if (exactDebounceTimeout) {
                    clearTimeout(exactDebounceTimeout);
                }
                exactDebounceTimeout = setTimeout(async () => {
                    try {
                        exactRequestSeq += 1;
                        const requestId = exactRequestSeq;

                        debugLog(`Fetching exact counts for ${pending.length} messages`);

                        if (exactController) exactController.abort();
                        exactController = new AbortController();
                        const controller = exactController;

                        const BATCH_SIZE = 3;
                        for (let i = 0; i < pending.length; i += BATCH_SIZE) {
                            const batch = pending.slice(i, i + BATCH_SIZE);
                            await Promise.all(
                                batch.map(async (msg) => {
                                    const exactTokens = await countTokensWithGemini(
                                        msg.text,
                                        apiKey,
                                        controller.signal
                                    );
                                    await setCachedTokenCount(msg.hash, exactTokens);
                                    msg.cachedTokens = exactTokens;
                                })
                            );
                        }

                        forceFlush();

                        if (requestId !== exactRequestSeq) return;

                        applyStats('exact');
                    } catch (error: unknown) {
                        if (error instanceof DOMException && error.name === 'AbortError') return;
                        debugLog('Gemini countTokens error:', error);
                    }
                }, 700);
            } catch (error: unknown) {
                debugLog('Token update failed:', error);
                setStats({ inputTokens: 0, outputTokens: 0 });
            }
        };

        const scheduleUpdate = () => {
            if (debounceTimeout) clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(updateTokens, 500);
        };

        const scheduleSendTriggeredUpdates = () => {
            scheduleUpdate();
            setTimeout(scheduleUpdate, 120);
            setTimeout(scheduleUpdate, 450);
            setTimeout(scheduleUpdate, 900);
        };

        const isSendButton = (target: EventTarget | null): boolean => {
            const el = target instanceof Element ? target : null;
            const button = el?.closest?.('button, [role="button"]');
            if (!button) return false;

            if (
                button.matches?.(
                    '.send-button, button.send-button, button[data-test-id="send-button"]'
                )
            ) {
                return true;
            }

            const ariaLabel = (
                button.getAttribute('aria-label') ||
                button.getAttribute('title') ||
                ''
            ).toLowerCase();
            return ariaLabel.includes('send');
        };

        const onClick = (event: MouseEvent) => {
            if (isSendButton(event.target)) {
                scheduleSendTriggeredUpdates();
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
            scheduleSendTriggeredUpdates();
        };

        const onSubmit = () => {
            scheduleSendTriggeredUpdates();
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
                    if (interval) {
                        clearInterval(interval);
                    }
                }
            }, 1000);
        }

        attachContainerObserver();

        document.addEventListener('click', onClick, true);
        document.addEventListener('keydown', onKeyDown, true);
        document.addEventListener('submit', onSubmit, true);

        return () => {
            if (observer) observer.disconnect();
            if (containerObserver) containerObserver.disconnect();
            if (interval) clearInterval(interval);
            if (debounceTimeout) clearTimeout(debounceTimeout);
            if (exactDebounceTimeout) clearTimeout(exactDebounceTimeout);
            if (exactController) exactController.abort();
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('submit', onSubmit, true);
        };
    }, [conversationId, geminiSettings?.geminiApiKey]);

    const MAX_TOKENS = geminiSettings?.tokenLimit || 1000000;
    const mode = normalizeTokenCounterMode(geminiSettings?.tokenCounterMode);
    const { showCircle, showText, showPercentage } = getTokenCounterDisplayConfig(mode);

    if (!showCircle && !showText && !showPercentage) return null;

    const totalTokens = stats.inputTokens + stats.outputTokens;
    let fillPercentage =
        totalTokens === 0 ? 0 : Math.min(100, Math.max(1, (totalTokens / MAX_TOKENS) * 100));

    if (totalTokens > 0 && fillPercentage < 3) {
        fillPercentage = 0;
    }

    const formatTokenCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
        return String(count);
    };

    const hasLabel = showText || showPercentage;
    const percentValue = MAX_TOKENS > 0 ? ((totalTokens / MAX_TOKENS) * 100).toFixed(1) : '0.0';
    const percentageLabel = `${percentValue}%`;

    const fillDeg = (fillPercentage / 100) * 360;
    const ringMask = `conic-gradient(#000 ${fillDeg}deg, transparent ${fillDeg}deg)`;

    return (
        <div class="hg-token-counter-wrapper" ref={popupRef}>
            <button
                class={`hg-token-counter-btn${hasLabel ? ' hg-token-counter-btn--labeled' : ''}`}
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title="Context Size & Token Usage"
                aria-label="Context Size & Token Usage"
            >
                {showCircle && (
                    <svg class="hg-token-ring" viewBox="0 0 20 20" aria-hidden="true">
                        <title>Token usage ring</title>
                        <circle class="hg-token-ring-bg" cx="10" cy="10" r="9" />
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
                                {formatTokenCount(totalTokens)}/{formatTokenCount(MAX_TOKENS)}
                            </span>
                        )}
                        {showPercentage && showText ? (
                            <span class="hg-token-label-percent">({percentageLabel})</span>
                        ) : null}
                        {showPercentage && !showText ? (
                            <span class="hg-token-label-main">{percentageLabel}</span>
                        ) : null}
                    </span>
                )}
            </button>

            {isExpanded && (
                <div class="hg-token-popup">
                    <div class="hg-token-popup-title">Token Usage</div>

                    <div class="hg-token-popup-row">
                        <div class="hg-token-popup-label">
                            <InputArrowIcon />
                            <span>Input</span>
                        </div>
                        <div class="hg-token-popup-value">{stats.inputTokens.toLocaleString()}</div>
                    </div>

                    <div class="hg-token-popup-row">
                        <div class="hg-token-popup-label">
                            <OutputArrowIcon />
                            <span>Output</span>
                        </div>
                        <div class="hg-token-popup-value">
                            {stats.outputTokens.toLocaleString()}
                        </div>
                    </div>

                    <div class="hg-token-popup-row hg-token-popup-total">
                        <div class="hg-token-popup-label">
                            <TotalPieIcon />
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
