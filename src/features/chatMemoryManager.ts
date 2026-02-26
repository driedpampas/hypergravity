import {
    getStorageValue,
    summarizeChatMemory,
    isExtension,
} from '@utils/browserEnv';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@utils/constants';
import { getIdbValue, setIdbValue } from '@utils/idbStorage';
import { sanitizeMessageText, hashText } from '@utils/tokenHashCache';
import { debugLog as _debugLog } from '@utils/debug';

type ChatMessage = { role: 'user' | 'model'; text: string };
type ChatMemory = {
    sourceHash?: string;
    [key: string]: unknown;
};
type SummaryResponse = {
    success?: boolean;
    memory?: ChatMemory;
    error?: string;
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

    return (
        document.querySelectorAll('.loading, .spinner, [aria-busy="true"]')
            .length > 0
    );
}

function uniqueTopLevelNodes(nodes: Element[]): Element[] {
    return nodes.filter(
        (node, index, arr) =>
            !arr.some(
                (other, otherIndex) =>
                    index !== otherIndex && other.contains(node)
            )
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

    if (
        node.tagName?.toLowerCase() === 'model-thoughts' ||
        node.matches?.('model-thoughts')
    ) {
        return '';
    }

    const clone = node.cloneNode(true) as Element;
    clone
        .querySelectorAll(
            'model-thoughts, [data-test-id="model-thoughts"], .model-thoughts'
        )
        .forEach((el: Element) => el.remove());

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
    return messages
        .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
        .join('\n\n');
}

export function createChatMemoryManager() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let inFlightChatId: string | null = null;
    const latestSourceHashByChatId = new Map<string, string>();

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

        const transcript = serializeTranscript(messages);
        if (!transcript) return;

        const sourceHash = await hashText(transcript);
        const storedMemory = (await getIdbValue(
            getChatMemoryKey(chatId),
            null
        )) as ChatMemory | null;
        if (storedMemory?.sourceHash === sourceHash) {
            latestSourceHashByChatId.set(chatId, sourceHash);
            return;
        }
        if (latestSourceHashByChatId.get(chatId) === sourceHash) {
            return;
        }

        inFlightChatId = chatId;
        try {
            const result = (await summarizeChatMemory({
                chatId,
                messages,
                sourceHash,
            })) as SummaryResponse;

            if (!result?.success || !result.memory) {
                debugLog('Memory summarization failed', {
                    chatId,
                    error: result?.error,
                });
                return;
            }

            latestSourceHashByChatId.set(
                chatId,
                result.memory?.sourceHash || sourceHash
            );
            await setIdbValue(getChatMemoryKey(chatId), result.memory);
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
        }, 1400);
    }

    return {
        refresh,
    };
}
