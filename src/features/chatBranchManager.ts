import { chatBoxManager } from '@managers/chatBoxManager';
import { getAccountAwareUrl } from '@shared/chat/chatInfo';
import {
    getStorageValue,
    openBranchWindow,
    removeStorageValue,
    setStorageValue,
} from '@utils/browserEnv';
import { PENDING_CHAT_BRANCH_KEY } from '@utils/constants';

type ToastType = 'info' | 'success' | 'error';
type BranchTarget = 'same_window' | 'new_window';

type BranchSettings = {
    chatBranchTarget?: string;
};

type PendingChatBranchRecord = {
    id: string;
    sourceChatId: string;
    sourceTitle: string;
    sourceUrl: string;
    markdown: string;
    modelLabel: string;
    target: BranchTarget;
    createdAt: number;
};

type CreateChatBranchManagerOptions = {
    getSettings: () => Promise<BranchSettings>;
    getBranchMarkdown: () => string | null;
    showToast: (message: string, type?: ToastType) => void;
};

const BRANCH_EXPIRY_MS = 30 * 60 * 1000;

const sendButtonSelectors = [
    'button.send-button',
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button[data-test-id="send-button"]',
    '.send-button-container button',
];

function isBranchLandingPath(pathname = window.location.pathname): boolean {
    return /^\/(?:u\/\d+\/)?app\/?$/i.test(pathname);
}

function normalizeText(value: string): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function readCurrentModelLabel(): string {
    const modeButton = document.querySelector<HTMLElement>(
        '[data-test-id="bard-mode-menu-button"]'
    );
    if (!modeButton) return '';

    return String(modeButton.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function modelLabelsMatch(current: string, target: string): boolean {
    const currentNormalized = normalizeText(current);
    const targetNormalized = normalizeText(target);
    if (!currentNormalized || !targetNormalized) return false;

    return (
        currentNormalized === targetNormalized ||
        currentNormalized.includes(targetNormalized) ||
        targetNormalized.includes(currentNormalized)
    );
}

function selectModelLabel(
    targetLabel: string
): 'NOT_FOUND' | 'MENU_OPENED' | 'CLICKED' | 'ALREADY_SELECTED' {
    const modeButton = document.querySelector<HTMLElement>(
        '[data-test-id="bard-mode-menu-button"]'
    );
    if (!modeButton) return 'NOT_FOUND';

    if (modelLabelsMatch(modeButton.textContent || '', targetLabel)) {
        return 'ALREADY_SELECTED';
    }

    const options = Array.from(
        document.querySelectorAll<HTMLElement>('[data-test-id^="bard-mode-option-"]')
    );

    if (options.length === 0) {
        const innerButton =
            modeButton.querySelector<HTMLElement>('button.input-area-switch') ||
            modeButton.querySelector<HTMLElement>('button') ||
            modeButton;
        innerButton.click();
        return 'MENU_OPENED';
    }

    const matchingOption =
        options.find((option) => modelLabelsMatch(option.textContent || '', targetLabel)) || null;
    if (!matchingOption) {
        return 'NOT_FOUND';
    }

    if (matchingOption.getAttribute('aria-checked') === 'true') {
        return 'ALREADY_SELECTED';
    }

    matchingOption.click();
    return 'CLICKED';
}

function clickSendButton(): boolean {
    for (const selector of sendButtonSelectors) {
        const button = document.querySelector<HTMLButtonElement>(selector);
        if (button && button.offsetParent !== null && !button.disabled) {
            button.click();
            return true;
        }
    }

    return false;
}

function buildBranchedPrompt(payload: PendingChatBranchRecord, userText: string): string {
    const trimmedUserText = String(userText || '').trim();

    return [
        'Branched conversation context from a previous Gemini chat:',
        `Title: ${payload.sourceTitle}`,
        `Source Chat ID: ${payload.sourceChatId}`,
        '',
        '```markdown',
        payload.markdown,
        '```',
        '',
        'User follow-up:',
        trimmedUserText,
    ].join('\n');
}

function isValidPendingBranch(value: unknown): value is PendingChatBranchRecord {
    if (!value || typeof value !== 'object') return false;

    const record = value as Partial<PendingChatBranchRecord>;
    return (
        typeof record.id === 'string' &&
        typeof record.sourceChatId === 'string' &&
        typeof record.sourceTitle === 'string' &&
        typeof record.sourceUrl === 'string' &&
        typeof record.markdown === 'string' &&
        typeof record.modelLabel === 'string' &&
        (record.target === 'same_window' || record.target === 'new_window') &&
        typeof record.createdAt === 'number'
    );
}

async function loadPendingBranch(): Promise<PendingChatBranchRecord | null> {
    const raw = await getStorageValue(PENDING_CHAT_BRANCH_KEY, null);
    if (!isValidPendingBranch(raw)) {
        return null;
    }

    if (Date.now() - raw.createdAt > BRANCH_EXPIRY_MS) {
        await removeStorageValue(PENDING_CHAT_BRANCH_KEY);
        return null;
    }

    return raw;
}

async function waitForCondition<T>(
    task: () => T | Promise<T>,
    isComplete: (value: T) => boolean,
    timeoutMs = 6000,
    intervalMs = 160
): Promise<T | null> {
    const endAt = Date.now() + timeoutMs;

    while (Date.now() < endAt) {
        const value = await task();
        if (isComplete(value)) {
            return value;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    return null;
}

export function findChatBranchDisabledReason(): string | null {
    const shareButton = document.querySelector<HTMLButtonElement>(
        'div.buttons-container.share button[data-test-id="share-button"]'
    );

    if (shareButton) {
        const disabledAttr = shareButton.getAttribute('disabled');
        const isDisabled = shareButton.disabled || disabledAttr === 'true' || disabledAttr === '';
        if (isDisabled) {
            return 'Branching is unavailable for chats with attached files';
        }
    }

    const pathMatch = /^\/(?:u\/\d+\/)?app\/([^/?#]+)/i.test(window.location.pathname);
    if (!pathMatch) {
        return 'Open a saved chat before starting a branch';
    }

    return null;
}

export function createChatBranchManager({
    getSettings,
    getBranchMarkdown,
    showToast,
}: CreateChatBranchManagerOptions) {
    let activationPromise: Promise<void> | null = null;
    let currentPayload: PendingChatBranchRecord | null = null;
    let listenersAttached = false;
    let allowSyntheticSend = false;
    let skipNextClickCapture = false;
    let isInjectingAndSending = false;
    let announcedBranchId: string | null = null;
    let modelRestoreAttemptedForBranchId: string | null = null;

    const onKeyDownCapture = (event: KeyboardEvent) => {
        if (allowSyntheticSend || event.defaultPrevented || event.key !== 'Enter') return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) {
            return;
        }
        if (!currentPayload || !isBranchLandingPath()) return;

        const inputElement = chatBoxManager.getInputElement();
        if (!inputElement) return;

        const activeElement = document.activeElement as HTMLElement | null;
        if (
            !activeElement ||
            (activeElement !== inputElement && !inputElement.contains(activeElement))
        ) {
            return;
        }
        if (chatBoxManager.isGemInstructionsField(inputElement as HTMLElement)) return;
        if (!String(chatBoxManager.getInputText() || '').trim()) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runBranchInjectionAndSend();
    };

    const onClickCapture = (event: MouseEvent) => {
        if (skipNextClickCapture) {
            skipNextClickCapture = false;
            return;
        }

        if (allowSyntheticSend || !currentPayload || !isBranchLandingPath()) return;
        const target = event.target as Element | null;
        if (!target) return;

        const sendButton = target.closest(
            sendButtonSelectors.join(', ')
        ) as HTMLButtonElement | null;
        if (
            !sendButton ||
            sendButton.disabled ||
            !String(chatBoxManager.getInputText() || '').trim()
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        void runBranchInjectionAndSend();
    };

    const onPointerDownCapture = (event: PointerEvent | MouseEvent) => {
        if (allowSyntheticSend || !currentPayload || !isBranchLandingPath()) return;
        const target = event.target as Element | null;
        if (!target) return;

        const sendButton = target.closest(
            sendButtonSelectors.join(', ')
        ) as HTMLButtonElement | null;
        if (
            !sendButton ||
            sendButton.disabled ||
            !String(chatBoxManager.getInputText() || '').trim()
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        skipNextClickCapture = true;
        void runBranchInjectionAndSend();
    };

    const detachListeners = () => {
        if (!listenersAttached) return;
        document.removeEventListener('keydown', onKeyDownCapture, true);
        document.removeEventListener('pointerdown', onPointerDownCapture, true);
        document.removeEventListener('mousedown', onPointerDownCapture, true);
        document.removeEventListener('click', onClickCapture, true);
        listenersAttached = false;
    };

    const attachListeners = () => {
        if (listenersAttached) return;
        document.addEventListener('keydown', onKeyDownCapture, true);
        document.addEventListener('pointerdown', onPointerDownCapture, true);
        document.addEventListener('mousedown', onPointerDownCapture, true);
        document.addEventListener('click', onClickCapture, true);
        listenersAttached = true;
    };

    const waitForInputSettle = () =>
        new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                setTimeout(resolve, 0);
            });
        });

    const clearPendingBranch = async () => {
        await removeStorageValue(PENDING_CHAT_BRANCH_KEY);
        currentPayload = null;
        detachListeners();
    };

    const runBranchInjectionAndSend = async () => {
        if (isInjectingAndSending || !currentPayload) return;

        const currentInput = chatBoxManager.getInputText();
        if (!String(currentInput || '').trim()) return;

        isInjectingAndSending = true;

        try {
            const nextPrompt = buildBranchedPrompt(currentPayload, currentInput);
            chatBoxManager.setInputText(nextPrompt);
            await waitForInputSettle();

            allowSyntheticSend = true;
            await clearPendingBranch();
            clickSendButton();

            queueMicrotask(() => {
                allowSyntheticSend = false;
            });
        } finally {
            isInjectingAndSending = false;
        }
    };

    const ensureModelRestored = async (payload: PendingChatBranchRecord) => {
        if (!payload.modelLabel.trim()) return;
        if (modelRestoreAttemptedForBranchId === payload.id) return;

        const result = await waitForCondition(
            () => selectModelLabel(payload.modelLabel),
            (status) =>
                status === 'CLICKED' || status === 'ALREADY_SELECTED' || status === 'NOT_FOUND',
            7000,
            180
        );

        modelRestoreAttemptedForBranchId = payload.id;

        if (result === 'NOT_FOUND') {
            showToast(
                'Branch ready. Model restore did not complete, using the current model.',
                'info'
            );
        }
    };

    const activatePendingBranch = async () => {
        if (!isBranchLandingPath()) {
            currentPayload = null;
            detachListeners();
            return;
        }

        const payload = await loadPendingBranch();
        if (!payload) {
            currentPayload = null;
            detachListeners();
            return;
        }

        currentPayload = payload;
        attachListeners();

        await ensureModelRestored(payload);

        if (announcedBranchId !== payload.id) {
            showToast(
                'Branch ready. Your first message will include the previous chat as markdown context.',
                'success'
            );
            announcedBranchId = payload.id;
        }
    };

    const refresh = () => {
        if (activationPromise) return;

        activationPromise = activatePendingBranch().finally(() => {
            activationPromise = null;
        });
    };

    const startBranch = async () => {
        const disabledReason = findChatBranchDisabledReason();
        if (disabledReason) {
            showToast(disabledReason, 'info');
            return;
        }

        const markdown = getBranchMarkdown();
        if (!markdown) {
            showToast('Cannot branch an empty chat', 'error');
            return;
        }

        const pathMatch = window.location.pathname.match(/^\/(?:u\/\d+\/)?app\/([^/?#]+)/i);
        const sourceChatId = String(pathMatch?.[1] || '').trim();
        if (!sourceChatId) {
            showToast('Open a saved chat before starting a branch', 'error');
            return;
        }

        const settings = await getSettings();
        const target: BranchTarget =
            settings.chatBranchTarget === 'new_window' ? 'new_window' : 'same_window';

        const titleCandidate =
            document.querySelector('[data-test-id="conversation-title"]')?.textContent ||
            document.querySelector('h1')?.textContent ||
            document.title.replace(' - Gemini', '').trim();
        const sourceTitle = String(titleCandidate || 'Gemini Chat')
            .replace(/\s+/g, ' ')
            .trim();

        const payload: PendingChatBranchRecord = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            sourceChatId,
            sourceTitle,
            sourceUrl: window.location.href,
            markdown,
            modelLabel: readCurrentModelLabel(),
            target,
            createdAt: Date.now(),
        };

        await setStorageValue(PENDING_CHAT_BRANCH_KEY, payload);

        const nextUrl = getAccountAwareUrl('', window.location);
        if (target === 'same_window') {
            window.location.assign(nextUrl);
            return;
        }

        const result = await openBranchWindow(nextUrl);
        if (!result.success) {
            await removeStorageValue(PENDING_CHAT_BRANCH_KEY);
            showToast(result.error || 'Failed to open the branched chat window', 'error');
            return;
        }

        showToast(
            'Opened a new window for the branch. Your first message there will include the previous chat context.',
            'success'
        );
    };

    const destroy = () => {
        currentPayload = null;
        detachListeners();
    };

    return {
        refresh,
        startBranch,
        destroy,
    };
}
