import type { SummarizeChatMemoryResponse } from '@shared/contracts/runtimeMessages';
import { getStorageValue, isExtension, summarizeChatMemory } from '@utils/browserEnv';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@utils/constants';
import { debugLog as _debugLog } from '@utils/debug';
import { getIdbValue, setIdbValue } from '@utils/idbStorage';
import { hashText, sanitizeMessageText } from '@utils/tokenHashCache';

type ChatMessage = { role: 'user' | 'model'; text: string };
type ChatMemory = {
    sourceHash?: string;
    chatTitle?: string;
    chatTitleUserModified?: boolean;
    detectedChatTitle?: string;
    [key: string]: unknown;
};

const debugLog = (...args: unknown[]) => _debugLog('ChatMemory', ...args);

const USER_MESSAGE_SELECTORS = [
    'user-query',
    '[data-message-author="user"]',
    '.user-message',
    '.query-content',
].join(', ');

const MODEL_MESSAGE_SELECTORS = [
    'model-response',
    'generative-ui-response',
    '[data-message-author="model"]',
    '.model-response',
    'response-container',
    'message-content .markdown-main-panel',
].join(', ');

const MESSAGE_SELECTORS = `${USER_MESSAGE_SELECTORS}, ${MODEL_MESSAGE_SELECTORS}`;
const CHAT_MEMORY_PREFIX = 'hg_chat_memory:';

function getChatMemoryKey(chatId: string): string {
    return `${CHAT_MEMORY_PREFIX}${chatId}`;
}

function getCurrentConversationId() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const appIndex = pathParts.indexOf('app');
    const id = appIndex >= 0 ? pathParts[appIndex + 1] : null;
    if (!id || id.length < 6) return null;
    return id;
}

function isGenerating() {
    const stopBtn = document.querySelector<HTMLElement>(
        'button[aria-label*="Stop"], button[aria-label*="stop"]'
    );
    if (stopBtn && stopBtn.offsetParent !== null) return true;

    return document.querySelectorAll('.loading, .spinner, [aria-busy="true"]').length > 0;
}

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

function getVisibleTextExcludingHidden(node: Element | null): string {
    if (!node) return '';
    const clone = node.cloneNode(true) as Element;
    clone.querySelectorAll('.cdk-visually-hidden').forEach((hiddenNode) => {
        hiddenNode.remove();
    });
    return getNodeText(clone).replace(/\s+/g, ' ').trim();
}

function normalizeChatTitle(title: string): string {
    const normalized = String(title || '')
        .replace(/\s+/g, ' ')
        .trim();
    const lowered = normalized.toLowerCase();
    if (!normalized) return '';
    if (lowered === 'google gemini' || lowered === 'gemini' || lowered === 'chats') return '';
    return normalized;
}

function getCurrentConversationTitle(): string {
    const candidates = [
        getVisibleTextExcludingHidden(
            document.querySelector('[data-test-id="conversation-title"]')
        ),
        getVisibleTextExcludingHidden(
            document.querySelector('.conversation-title-container .conversation-title-column')
        ),
        getVisibleTextExcludingHidden(document.querySelector('h1')),
        normalizeChatTitle(document.title.replace(' - Gemini', '').replace('Google Gemini', '')),
    ];

    for (const candidate of candidates) {
        const title = normalizeChatTitle(candidate);
        if (title) return title;
    }

    return '';
}

function getNodeTextExcludingThoughts(node: Element | null): string {
    if (!node) return '';

    if (node.tagName?.toLowerCase() === 'model-thoughts' || node.matches?.('model-thoughts')) {
        return '';
    }

    const clone = node.cloneNode(true) as Element;
    clone
        .querySelectorAll('model-thoughts, [data-test-id="model-thoughts"], .model-thoughts')
        .forEach((el: Element) => {
            el.remove();
        });

    return getNodeText(clone);
}

function isUserNode(node: Element): boolean {
    return node.matches?.(USER_MESSAGE_SELECTORS);
}

function collectTranscriptMessages(): ChatMessage[] {
    const root =
        document.querySelector('[data-test-id="chat-history-container"]') ||
        document.querySelector('infinite-scroller.chat-history') ||
        document.querySelector('.chat-history') ||
        document;

    const orderedNodes = uniqueTopLevelNodes(
        Array.from(root.querySelectorAll(MESSAGE_SELECTORS))
    ).filter((node) => getNodeText(node).length > 0);

    const messages: ChatMessage[] = [];
    for (const node of orderedNodes) {
        const role = isUserNode(node) ? 'user' : 'model';
        const text = sanitizeMessageText(
            getNodeTextExcludingThoughts(node),
            role === 'user' ? 'input' : 'output'
        );
        if (!text) continue;

        messages.push({ role, text });
    }

    return messages;
}

function serializeTranscript(messages: ChatMessage[]): string {
    return messages.map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n\n');
}

export function createChatMemoryManager() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inFlightChatId: string | null = null;
    const latestSourceHashByChatId = new Map<string, string>();
    const lastMessageCountByChatId = new Map<string, number>();

    async function summarizeCurrentChat() {
        if (!isExtension()) return;
        if (isGenerating()) return;

        const settings = (await getStorageValue(
            SETTINGS_KEY,
            DEFAULT_SETTINGS
        )) as typeof DEFAULT_SETTINGS;
        if (!settings?.chatMemoryEnabled) return;

        const chatId = getCurrentConversationId();
        if (!chatId) return;

        if (inFlightChatId === chatId) return;

        const messages = collectTranscriptMessages();
        if (messages.length < 2) return;

        const currentMessageCount = messages.length;
        const lastMessageCount = lastMessageCountByChatId.get(chatId) || 0;

        // Only summarize if we have more messages than last time (indicating more content was loaded)
        // or if this is the first time for this chat
        if (lastMessageCount > 0 && currentMessageCount <= lastMessageCount) {
            lastMessageCountByChatId.set(chatId, currentMessageCount);
            return;
        }

        lastMessageCountByChatId.set(chatId, currentMessageCount);

        const transcript = serializeTranscript(messages);
        if (!transcript) return;

        const sourceHash = await hashText(transcript);
        const detectedChatTitle = getCurrentConversationTitle();
        const storedMemory = (await getIdbValue(
            getChatMemoryKey(chatId),
            null
        )) as ChatMemory | null;

        const shouldRefreshAutoTitle =
            Boolean(detectedChatTitle) &&
            storedMemory?.chatTitleUserModified !== true &&
            String(storedMemory?.chatTitle || '').trim() !== detectedChatTitle;

        if (storedMemory?.sourceHash === sourceHash) {
            if (storedMemory && shouldRefreshAutoTitle) {
                await setIdbValue(getChatMemoryKey(chatId), {
                    ...storedMemory,
                    chatTitle: detectedChatTitle,
                    detectedChatTitle,
                });
            }
            latestSourceHashByChatId.set(chatId, sourceHash);
            return;
        }
        if (latestSourceHashByChatId.get(chatId) === sourceHash) {
            if (storedMemory && shouldRefreshAutoTitle) {
                await setIdbValue(getChatMemoryKey(chatId), {
                    ...storedMemory,
                    chatTitle: detectedChatTitle,
                    detectedChatTitle,
                });
            }
            return;
        }

        inFlightChatId = chatId;
        try {
            const result = (await summarizeChatMemory({
                chatId,
                messages,
                sourceHash,
            })) as SummarizeChatMemoryResponse;

            if (!result?.success || !result.memory) {
                debugLog('Memory summarization failed', {
                    chatId,
                    error: result?.error,
                });
                return;
            }

            const isUserModified = storedMemory?.chatTitleUserModified === true;
            const persistedTitle = String(storedMemory?.chatTitle || '').trim();
            const mergedMemory = {
                ...result.memory,
                chatTitleUserModified: isUserModified,
                detectedChatTitle: detectedChatTitle || storedMemory?.detectedChatTitle,
                chatTitle: isUserModified
                    ? persistedTitle || result.memory.chatTitle || detectedChatTitle || undefined
                    : detectedChatTitle || result.memory.chatTitle || persistedTitle || undefined,
            };

            latestSourceHashByChatId.set(chatId, result.memory?.sourceHash || sourceHash);
            await setIdbValue(getChatMemoryKey(chatId), mergedMemory);
        } catch (error) {
            debugLog('Memory summarization error', { chatId, error });
        } finally {
            inFlightChatId = null;
        }
    }

    function refresh() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            void summarizeCurrentChat();
        }, 2000); // Increased debounce to 2 seconds to avoid rapid-fire during scrolling
    }

    return {
        refresh,
    };
}
