import { chatBoxManager } from '@core/dom/chatBoxManager';
import { CHAT_MEMORY_PREFIX } from '@features/memories/constants';
import { getSettings } from '@platform/content/helpers/settings';
import type { ChatMemoryRecord } from '@shared/contracts/runtimeMessages';
import { debugLog as _debugLog } from '@utils/debug';
import { getIdbValue } from '@utils/idbStorage';

const MEMORY_TOKEN_RE = /<hg-chat-memories-([a-z0-9_-]{6,})>/gi;
const LEADING_TOKENS_RE = /^\s*(?:<hg-chat-memories-[a-z0-9_-]{6,}>\s*)*/i;

type TokenOccurrence = {
    raw: string;
    chatId: string;
    index: number;
};

type MemoryMentionMode = 'auto' | 'references' | 'inject';

const debugLog = (...args: unknown[]) => _debugLog('MentionExpansion', ...args);

const sendButtonSelectors = [
    'button.send-button',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[data-test-id="send-button"]',
    '.send-button-container button',
];

function collectTokenOccurrences(text: string): TokenOccurrence[] {
    const occurrences: TokenOccurrence[] = [];
    const regex = new RegExp(MEMORY_TOKEN_RE.source, MEMORY_TOKEN_RE.flags);
    let match = regex.exec(text);

    while (match !== null) {
        occurrences.push({
            raw: match[0],
            chatId: String(match[1] || '').trim(),
            index: match.index,
        });
        match = regex.exec(text);
    }

    return occurrences;
}

function getMemoryTitle(chatId: string, record: ChatMemoryRecord | null): string {
    const explicit = String(record?.chatTitle || '').trim();
    const fallback = String(record?.detectedChatTitle || '').trim();
    return explicit || fallback || `Chat ${chatId.slice(0, 12)}`;
}

function formatMemoryBody(chatId: string, record: ChatMemoryRecord | null): string {
    if (!record) return '';
    const title = getMemoryTitle(chatId, record);
    const summary = String(record.summary || '').trim();
    if (!summary) return '';

    return `Title: ${title}\nChat ID: ${chatId}\nSummary:\n${summary}`;
}

function clickSendButton(): boolean {
    for (const sel of sendButtonSelectors) {
        const btn = document.querySelector<HTMLButtonElement>(sel);
        debugLog('Trying send selector', {
            selector: sel,
            exists: Boolean(btn),
            visible: Boolean(btn && btn.offsetParent !== null),
            disabled: Boolean(btn?.disabled),
        });
        if (btn && btn.offsetParent !== null && !btn.disabled) {
            btn.click();
            debugLog('Triggered send click', { selector: sel });
            return true;
        }
    }

    debugLog('No send button matched');
    return false;
}

async function expandMemoryMentions(
    text: string,
    mode: MemoryMentionMode
): Promise<{ changed: boolean; text: string }> {
    const occurrences = collectTokenOccurrences(text);
    debugLog('Expand start', {
        mode,
        inputLength: text.length,
        tokenCount: occurrences.length,
        tokens: occurrences.map((occ) => ({ chatId: occ.chatId, index: occ.index })),
    });
    if (occurrences.length === 0) return { changed: false, text };

    const leadingSpan = text.match(LEADING_TOKENS_RE)?.[0] || '';
    const leadingEnd = leadingSpan.length;

    const chatIds = Array.from(new Set(occurrences.map((occ) => occ.chatId).filter(Boolean)));
    const memoryByChatId = new Map<string, ChatMemoryRecord | null>();
    for (const chatId of chatIds) {
        const record = (await getIdbValue(
            `${CHAT_MEMORY_PREFIX}${chatId}`,
            null
        )) as ChatMemoryRecord | null;
        memoryByChatId.set(chatId, record);
        debugLog('Loaded memory for token', {
            chatId,
            found: Boolean(record),
            hasSummary: Boolean(record?.summary),
        });
    }

    const leadingIds: string[] = [];
    const middleIds: string[] = [];
    for (const occ of occurrences) {
        if (occ.index < leadingEnd) {
            if (!leadingIds.includes(occ.chatId)) leadingIds.push(occ.chatId);
        } else if (!middleIds.includes(occ.chatId)) {
            middleIds.push(occ.chatId);
        }
    }

    const middleRefIndexById = new Map<string, number>();
    let refIndex = 1;
    for (const chatId of middleIds) {
        if (!memoryByChatId.get(chatId)) continue;
        middleRefIndexById.set(chatId, refIndex++);
    }

    let rebuilt = '';
    let cursor = 0;
    for (const occ of occurrences) {
        rebuilt += text.slice(cursor, occ.index);
        const record = memoryByChatId.get(occ.chatId) || null;
        const isLeading =
            mode === 'inject' ? true : mode === 'references' ? false : occ.index < leadingEnd;

        if (!record) {
            rebuilt += occ.raw;
        } else if (isLeading) {
            rebuilt += '';
        } else {
            const ref = middleRefIndexById.get(occ.chatId);
            rebuilt += ref ? `[Memory Ref ${ref}]` : occ.raw;
        }

        cursor = occ.index + occ.raw.length;
    }
    rebuilt += text.slice(cursor);

    const leadingBlocks = leadingIds
        .map((chatId) => {
            const body = formatMemoryBody(chatId, memoryByChatId.get(chatId) || null);
            return body ? `Memory Context:\n${body}` : '';
        })
        .filter(Boolean);

    const middleReferenceBlocks = middleIds
        .map((chatId) => {
            const ref = middleRefIndexById.get(chatId);
            const body = formatMemoryBody(chatId, memoryByChatId.get(chatId) || null);
            if (!ref || !body) return '';
            return `[Memory Ref ${ref}]\n${body}`;
        })
        .filter(Boolean);

    const parts: string[] = [];
    if (leadingBlocks.length > 0) {
        parts.push(leadingBlocks.join('\n\n'));
    }

    const userText = rebuilt.trim();
    if (userText) {
        parts.push(userText);
    }

    if (middleReferenceBlocks.length > 0) {
        parts.push(`Memory References:\n${middleReferenceBlocks.join('\n\n')}`);
    }

    const expandedText = parts.join('\n\n').trim();
    debugLog('Expand result', {
        leadingIds,
        middleIds,
        changed: expandedText !== text,
        outputLength: expandedText.length,
        outputPreview: expandedText.slice(0, 240),
    });
    return {
        changed: expandedText !== text,
        text: expandedText || text,
    };
}

export function createMemoryMentionExpansionManager() {
    let listenersAttached = false;
    let isExpandingAndSending = false;
    let allowSyntheticSend = false;
    let skipNextClickCapture = false;

    const waitForInputSettle = () =>
        new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 0);
            });
        });

    const runExpansionAndSend = async () => {
        if (isExpandingAndSending) return;
        isExpandingAndSending = true;
        debugLog('runExpansionAndSend start');

        try {
            const current = chatBoxManager.getInputText();
            const hasMemoryToken = MEMORY_TOKEN_RE.test(current);
            MEMORY_TOKEN_RE.lastIndex = 0;
            debugLog('Input inspection', {
                inputLength: current.length,
                hasMemoryToken,
                inputPreview: current.slice(0, 240),
            });

            if (!hasMemoryToken) return;

            const settings = await getSettings();
            const modeRaw = String(settings.memoryMentionMode || 'auto')
                .trim()
                .toLowerCase();
            const mode: MemoryMentionMode =
                modeRaw === 'references' || modeRaw === 'inject' ? modeRaw : 'auto';
            debugLog('Resolved mention mode', { modeRaw, mode });

            const result = await expandMemoryMentions(current, mode);
            if (result.changed) {
                chatBoxManager.setInputText(result.text);
                debugLog('Input text replaced with expanded content');

                await waitForInputSettle();
                const settledText = chatBoxManager.getInputText();
                const stillHasToken = MEMORY_TOKEN_RE.test(settledText);
                MEMORY_TOKEN_RE.lastIndex = 0;
                debugLog('Post-settle input check', {
                    settledLength: settledText.length,
                    stillHasToken,
                    settledPreview: settledText.slice(0, 240),
                });

                if (stillHasToken) {
                    chatBoxManager.setInputText(result.text);
                    await waitForInputSettle();
                    debugLog('Re-applied expanded text after token persisted');
                }
            } else {
                debugLog('Expansion produced no changes');
            }

            allowSyntheticSend = true;
            const sendClicked = clickSendButton();
            debugLog('Post-expansion send attempt', { sendClicked });
            queueMicrotask(() => {
                allowSyntheticSend = false;
            });
        } finally {
            isExpandingAndSending = false;
            debugLog('runExpansionAndSend end');
        }
    };

    const onKeyDownCapture = (event: KeyboardEvent) => {
        if (allowSyntheticSend) return;
        if (event.defaultPrevented) return;
        if (event.key !== 'Enter') return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.isComposing) return;

        const inputEl = chatBoxManager.getInputElement();
        if (!inputEl) return;
        const activeEl = document.activeElement as HTMLElement | null;
        if (!activeEl || (activeEl !== inputEl && !inputEl.contains(activeEl))) return;
        if (chatBoxManager.isGemInstructionsField(inputEl as HTMLElement)) return;

        const text = chatBoxManager.getInputText();
        if (!MEMORY_TOKEN_RE.test(text)) return;
        MEMORY_TOKEN_RE.lastIndex = 0;

        debugLog('Intercepted Enter send with memory token', {
            inputLength: text.length,
            inputPreview: text.slice(0, 240),
        });

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runExpansionAndSend();
    };

    const onClickCapture = (event: MouseEvent) => {
        if (skipNextClickCapture) {
            skipNextClickCapture = false;
            return;
        }

        if (allowSyntheticSend) return;
        const target = event.target as Element | null;
        if (!target) return;

        const sendButton = target.closest(
            sendButtonSelectors.join(', ')
        ) as HTMLButtonElement | null;

        if (!sendButton || sendButton.disabled) return;
        const text = chatBoxManager.getInputText();
        if (!MEMORY_TOKEN_RE.test(text)) return;
        MEMORY_TOKEN_RE.lastIndex = 0;

        debugLog('Intercepted button send with memory token', {
            inputLength: text.length,
            inputPreview: text.slice(0, 240),
        });

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runExpansionAndSend();
    };

    const onPointerDownCapture = (event: PointerEvent | MouseEvent) => {
        if (allowSyntheticSend) return;
        const target = event.target as Element | null;
        if (!target) return;

        const sendButton = target.closest(
            sendButtonSelectors.join(', ')
        ) as HTMLButtonElement | null;
        if (!sendButton || sendButton.disabled) return;

        const text = chatBoxManager.getInputText();
        if (!MEMORY_TOKEN_RE.test(text)) return;
        MEMORY_TOKEN_RE.lastIndex = 0;

        debugLog('Intercepted pointer/mouse down on send with memory token', {
            eventType: event.type,
            inputLength: text.length,
            inputPreview: text.slice(0, 240),
        });

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        skipNextClickCapture = true;
        void runExpansionAndSend();
    };

    function refresh() {
        if (listenersAttached) return;
        document.addEventListener('keydown', onKeyDownCapture, true);
        document.addEventListener('pointerdown', onPointerDownCapture, true);
        document.addEventListener('mousedown', onPointerDownCapture, true);
        document.addEventListener('click', onClickCapture, true);
        listenersAttached = true;
        debugLog('Listeners attached');
    }

    function cleanup() {
        if (!listenersAttached) return;
        document.removeEventListener('keydown', onKeyDownCapture, true);
        document.removeEventListener('pointerdown', onPointerDownCapture, true);
        document.removeEventListener('mousedown', onPointerDownCapture, true);
        document.removeEventListener('click', onClickCapture, true);
        listenersAttached = false;
        debugLog('Listeners removed');
    }

    return {
        refresh,
        cleanup,
    };
}
