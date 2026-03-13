import { findChatBranchDisabledReason } from '@features/chatBranchManager';
import {
    BlurOffIcon,
    BlurOnIcon,
    BranchChatIcon,
    CollapseIcon,
    ExpandIcon,
    ExportIcon,
} from '@icons';
import { topBarManager } from '@managers/topBarManager';
import { findActiveChatInfo } from '@shared/chat/chatInfo';
import { PRIVACY_CHAT_KEY_PREFIX } from '@utils/constants';
import { debugSelectorMatch } from '@utils/debug';
import { getIdbValue, setIdbValue } from '@utils/idbStorage';
import { h } from 'preact';

type SettingsShape = {
    wideModeEnabled?: boolean;
    showExportButton?: boolean;
    removeUpsellButton?: boolean;
    chatBranchTarget?: string;
};

type PrivacyChatRecord = {
    chatId: string;
    title: string;
    enabled: boolean;
    updatedAt: number;
};

type TopBarToolsManagerOptions = {
    getSettings: () => Promise<SettingsShape>;
    updateSettings: (patch: Partial<SettingsShape>) => Promise<SettingsShape>;
    onExportClick: () => void;
    onBranchClick: () => void | Promise<void>;
    onWideToggleDebug?: (enabled: boolean) => void;
};

/**
 * Factory for the Wide Layout engine which allows Gemini chat content to span the full width of the screen.
 * @returns {Object} Engine control interface.
 */
function createWideLayoutEngine() {
    let enabled = false;
    const markedTargets = new Set<HTMLElement>();
    const styleId = 'hg-wide-dynamic-style';

    /**
     * Injects custom CSS for wide mode if not already present.
     */
    function ensureDynamicStyle() {
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            body.hg-wide-chat [data-hg-wide-target="1"] {
                max-width: 100% !important;
                width: 100% !important;
                margin-left: 0 !important;
                margin-right: 0 !important;
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Cleans up custom width attributes from previously marked elements.
     */
    function clearMarkedTargets() {
        markedTargets.forEach((element) => {
            if (!element?.isConnected) return;
            element.removeAttribute('data-hg-wide-target');
        });
        markedTargets.clear();
    }

    /**
     * Locates the primary scrollable containers for chat content.
     */
    function getChatRoots() {
        return [
            document.querySelector('infinite-scroller.chat-history'),
            document.querySelector('.chat-history'),
        ].filter((node) => node instanceof HTMLElement);
    }

    /**
     * Returns a list of selectors for common Gemini UI components that need resizing in wide mode.
     */
    function getMessageSelectors() {
        return [
            '.conversation-container',
            '.user-message',
            '[data-message-author="user"]',
            '.query-content',
            'user-query',
            '.model-response',
            '[data-message-author="model"]',
            'model-response',
            '.response-container',
            'response-container',
            'message-content',
            '.markdown-main-panel',
        ];
    }

    function collectMessagesFromRoot(root: HTMLElement, context: string): HTMLElement[] {
        const nodes = new Set<HTMLElement>();

        for (const selector of getMessageSelectors()) {
            const matched = Array.from(root.querySelectorAll(selector)).filter(
                (node): node is HTMLElement => node instanceof HTMLElement
            );

            debugSelectorMatch(context, selector, matched.length > 0, {
                matchedCount: matched.length,
            });

            matched.forEach((node) => {
                nodes.add(node);
            });
        }

        return Array.from(nodes);
    }

    function collectKnownTargets(): HTMLElement[] {
        const roots = getChatRoots();
        const candidates = new Set<HTMLElement>();

        roots.forEach((root) => {
            candidates.add(root);

            collectMessagesFromRoot(root, 'TopBar.collectKnownTargets').forEach((node) => {
                candidates.add(node);
            });
        });

        return Array.from(candidates);
    }

    function collectInputTargets(): HTMLElement[] {
        return Array.from(
            document.querySelectorAll(
                [
                    'input-container',
                    'input-container .input-area-container:not(.is-zero-state)',
                    'input-container.input-gradient',
                    '.input-area-container:not(.is-zero-state)',
                    '.input-area-container:not(.is-zero-state) .text-input-field',
                ].join(', ')
            )
        ).filter(
            (node): node is HTMLElement =>
                node instanceof HTMLElement && !node.closest('.input-area-container.is-zero-state')
        );
    }

    function collectNarrowAncestorsFromMessages(): HTMLElement[] {
        const roots = getChatRoots();
        if (!roots.length) return [];

        const messages = roots.flatMap((root) =>
            collectMessagesFromRoot(root, 'TopBar.collectNarrowAncestorsFromMessages')
        );

        const candidates = new Set<HTMLElement>();

        messages.forEach((messageNode) => {
            let current: HTMLElement | null = messageNode;
            let depth = 0;

            while (
                current &&
                current instanceof HTMLElement &&
                current !== document.body &&
                depth < 18
            ) {
                const rect = current.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isNarrow =
                    rect.width > 320 &&
                    rect.width < window.innerWidth - 32 &&
                    window.getComputedStyle(current).display !== 'inline';

                if (isVisible && isNarrow) {
                    candidates.add(current);
                }

                if (roots.some((root) => current === root)) {
                    break;
                }

                current = current.parentElement;
                depth += 1;
            }
        });

        return Array.from(candidates);
    }

    function collectInlineMaxWidthTargets(): HTMLElement[] {
        const roots = getChatRoots();

        if (!roots.length) return [];

        const candidates = new Set<HTMLElement>();

        roots.forEach((root) => {
            root.querySelectorAll('[style*="max-width"]').forEach((node) => {
                if (!(node instanceof HTMLElement)) return;

                const rect = node.getBoundingClientRect();
                if (rect.width <= 320 || rect.height <= 0) return;

                const maxWidth = window.getComputedStyle(node).maxWidth;
                if (!maxWidth || maxWidth === 'none' || maxWidth === '100%') {
                    return;
                }

                candidates.add(node);
            });
        });

        return Array.from(candidates);
    }

    function markTarget(element: Element): void {
        if (!(element instanceof HTMLElement)) return;

        element.setAttribute('data-hg-wide-target', '1');

        markedTargets.add(element);
    }

    function refreshTargets() {
        clearMarkedTargets();

        const knownTargets = collectKnownTargets();
        const inputTargets = collectInputTargets();
        const detectedTargets = collectNarrowAncestorsFromMessages();
        const inlineMaxWidthTargets = collectInlineMaxWidthTargets();

        [...knownTargets, ...inputTargets, ...detectedTargets, ...inlineMaxWidthTargets].forEach(
            (target) => {
                markTarget(target);
            }
        );
    }

    function setEnabled(nextEnabled: boolean): void {
        enabled = Boolean(nextEnabled);

        if (!enabled) {
            document.body.classList.remove('hg-wide-chat');
            clearMarkedTargets();
            return;
        }

        document.body.classList.add('hg-wide-chat');
        refreshTargets();
    }

    function refresh() {
        if (!enabled) return;
        refreshTargets();
    }

    ensureDynamicStyle();

    return {
        setEnabled,
        refresh,
    };
}

export function createTopBarToolsManager({
    getSettings,
    updateSettings,
    onExportClick,
    onBranchClick,
    onWideToggleDebug,
}: TopBarToolsManagerOptions) {
    const wideLayoutEngine = createWideLayoutEngine();
    let refreshInFlight: Promise<void> | null = null;
    let refreshQueued = false;

    function getPrivacyChatKey(chatId: string): string {
        return `${PRIVACY_CHAT_KEY_PREFIX}${chatId}`;
    }

    async function getActiveChatPrivacy(): Promise<PrivacyChatRecord | null> {
        const active = findActiveChatInfo();
        if (!active?.id) return null;

        const raw = (await getIdbValue(
            getPrivacyChatKey(active.id),
            null
        )) as Partial<PrivacyChatRecord> | null;

        if (!raw || typeof raw !== 'object') return null;
        return {
            chatId: String(raw.chatId || active.id),
            title: String(raw.title || active.title),
            enabled: Boolean(raw.enabled),
            updatedAt: Number(raw.updatedAt) || Date.now(),
        };
    }

    async function handleWideToggle() {
        const settings = await getSettings();
        const nextWideModeEnabled = !settings.wideModeEnabled;

        await updateSettings({
            wideModeEnabled: nextWideModeEnabled,
        });

        if (typeof onWideToggleDebug === 'function') {
            onWideToggleDebug(nextWideModeEnabled);
        }

        await refresh();
    }

    async function runRefresh() {
        const settings = await getSettings();
        const shouldApplyWide =
            Boolean(settings.wideModeEnabled) && !window.location.pathname.includes('/gems/');
        const privateModeEnabled = Boolean((await getActiveChatPrivacy())?.enabled);

        wideLayoutEngine.setEnabled(shouldApplyWide);

        if (!topBarManager.getTopBar()) {
            wideLayoutEngine.refresh();
            return;
        }

        const wideButton = topBarManager.ensureButton({
            id: 'hg-header-wide-btn',
            title: shouldApplyWide ? 'Collapse Chat' : 'Expand Chat',
            iconVNode: h(shouldApplyWide ? CollapseIcon : ExpandIcon, {}),
            onClick: () => handleWideToggle(),
        });

        wideButton?.classList.toggle('hg-wide-active', shouldApplyWide);

        const privacyButton = topBarManager.ensureButton({
            id: 'hg-header-privacy-btn',
            title: privateModeEnabled ? 'Unblur Chat' : 'Blur Chat',
            iconVNode: h(privateModeEnabled ? BlurOffIcon : BlurOnIcon, {}),
            onClick: async () => {
                const active = findActiveChatInfo();
                if (!active?.id) return;

                const existing = await getActiveChatPrivacy();
                const nextEnabled = !existing?.enabled;

                await setIdbValue(getPrivacyChatKey(active.id), {
                    chatId: active.id,
                    title: active.title,
                    enabled: nextEnabled,
                    updatedAt: Date.now(),
                } as PrivacyChatRecord);

                window.dispatchEvent(
                    new CustomEvent('hg-privacy-chat-updated', {
                        detail: {
                            chatId: active.id,
                            title: active.title,
                            enabled: nextEnabled,
                        },
                    })
                );
                await refresh();
            },
        });

        privacyButton?.classList.toggle('hg-privacy-active', privateModeEnabled);

        const branchDisabledReason = findChatBranchDisabledReason();
        const branchButton = topBarManager.ensureButton({
            id: 'hg-header-branch-btn',
            title: branchDisabledReason || 'Branch Chat',
            iconVNode: h(BranchChatIcon, {}),
            onClick: () => {
                if (findChatBranchDisabledReason()) return;
                void onBranchClick();
            },
        }) as HTMLButtonElement | null;

        if (branchButton) {
            branchButton.disabled = Boolean(branchDisabledReason);
            branchButton.setAttribute('aria-disabled', branchButton.disabled ? 'true' : 'false');
            branchButton.classList.toggle('hg-header-btn-disabled', branchButton.disabled);
        }

        topBarManager.setUpsellRemovalEnabled(Boolean(settings.removeUpsellButton));

        const shouldShowExport = settings.showExportButton !== false;
        const existingExport = document.getElementById('hg-header-export-btn');

        if (!shouldShowExport) {
            existingExport?.remove();
        } else {
            topBarManager.ensureButton({
                id: 'hg-header-export-btn',
                title: 'Export Chat',
                iconVNode: h(ExportIcon, {}),
                onClick: () => onExportClick(),
            });
        }

        wideLayoutEngine.refresh();
    }

    async function refresh() {
        if (refreshInFlight) {
            refreshQueued = true;
            await refreshInFlight;
            return;
        }

        refreshInFlight = (async () => {
            do {
                refreshQueued = false;
                await runRefresh();
            } while (refreshQueued);
        })().finally(() => {
            refreshInFlight = null;
        });

        await refreshInFlight;
    }

    function destroy() {
        wideLayoutEngine.setEnabled(false);
    }

    return {
        refresh,
        destroy,
    };
}
